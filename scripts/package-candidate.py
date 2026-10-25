#!/usr/bin/env python3
"""Create a portable checkpoint from committed source and observed build outputs."""
from datetime import datetime, timezone
from pathlib import Path
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('--android-dir', required=True)
parser.add_argument('--web-dir', required=True)
parser.add_argument('--browser-dir', required=True)
parser.add_argument('--checks-run', required=True)
parser.add_argument('--android-run', required=True)
parser.add_argument('--output-dir')
args = parser.parse_args()
repo = Path(__file__).resolve().parents[1]
out = Path(args.output_dir).resolve() if args.output_dir else repo / 'artifacts' / 'deliverables'
out.mkdir(parents=True, exist_ok=True)
repository = os.environ.get('GITHUB_REPOSITORY', 'thaungzan93/belem-lng')
repository_url = 'https://github.com/' + repository
metadata = json.loads(subprocess.check_output(['gh', 'api', f'repos/{repository}'], text=True))
assert metadata['private'] is True, 'Candidate distribution requires a private repository'
android, web, browser = map(Path, (args.android_dir, args.web_dir, args.browser_dir))
def git(*arguments):
    return subprocess.check_output(['git', *arguments], cwd=repo, text=True).strip()
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
assert not git('status', '--porcelain', '--untracked-files=no'), 'Commit tracked changes before packaging'
commit = git('rev-parse', 'HEAD')
version = json.loads((repo / 'app.json').read_text())['expo']['version']
native = json.loads((android / 'verification.json').read_text())
assert native['status'] == 'static_checks_passed'
assert native['trackedSourceModifiedAfterCheckout'] is False, 'Use a clean CI build'
assert native['appVersion'] == version
apk = android / native['apk']
assert digest(apk) == native['sha256'], 'APK differs from its verified report'
assert apk.stat().st_size == native['bytes']
assert (web / 'index.html').is_file()
assert (browser / 'browser-verification.json').is_file()
browser_report = json.loads((browser / 'browser-verification.json').read_text())
assert browser_report['passed'] is True and not browser_report['pageErrors']
assert browser_report['version'] == version
ci = {}
for label, url in (('sourceChecks', args.checks_run), ('androidBuild', args.android_run)):
    run = json.loads(subprocess.check_output([
        'gh', 'run', 'view', url.rstrip('/').split('/')[-1], '--repo', repository,
        '--json', 'status,conclusion,headSha,url'], cwd=repo, text=True))
    assert run['status'] == 'completed' and run['conclusion'] == 'success', (label, run)
    ci[label] = run
assert ci['androidBuild']['headSha'] == native['sourceCommit']
assert ci['sourceChecks']['headSha'] == native['sourceCommit']
subprocess.run(['git', 'diff', '--quiet', native['sourceCommit'], commit, '--',
                'App.tsx', 'app.json', 'index.ts', 'src', 'package.json', 'package-lock.json'], cwd=repo, check=True)
prefix = f'belem-lng-v{version}'
source = out / f'{prefix}-source.zip'
bundle = out / f'{prefix}.bundle'
web_zip = out / f'{prefix}-web.zip'
subprocess.run(['git', 'archive', '--format=zip', '--prefix=belem-lng/', '-o', str(source), commit], cwd=repo, check=True)
bundle.unlink(missing_ok=True)
subprocess.run(['git', 'bundle', 'create', str(bundle), '--all'], cwd=repo, check=True)
with zipfile.ZipFile(web_zip, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(web.rglob('*')):
        if path.is_file():
            archive.write(path, path.relative_to(web).as_posix())
checkpoint = {
    'schemaVersion': 1, 'version': version,
    'packagedAtUTC': datetime.now(timezone.utc).isoformat(),
    'packagedSourceCommit': commit, 'androidSourceCommit': native['sourceCommit'],
    'repository': repository_url,
    'repositoryVisibility': 'private',
    'sourceChecksRun': args.checks_run, 'androidBuildRun': args.android_run,
    'apk': {'file': native['apk'], 'sha256': native['sha256'], 'bytes': native['bytes']},
    'androidRuntimeVerification': native['runtimeVerification'],
    'scope': f'Version {version} offline manual watch log, source-style line diagrams and connected training simulator; complete vessel calibration remains pending.',
    'excludes': ['node_modules', 'Android SDK', 'private signing keys', 'large mixed GTT/H1843 reference bundle, retained in the private reference release'],
}
checkpoint_path = out / f'{prefix}-checkpoint.json'
checkpoint_path.write_text(json.dumps(checkpoint, indent=2) + '\n')
start = f'''BELEM LNG {version} — portable project checkpoint

Repository (private): {repository_url}
Source snapshot: {commit}
APK build source: {native['sourceCommit']}
Source checks: {args.checks_run}
Android build: {args.android_run}

CONTENTS
- {source.name}: committed application source, lockfile, tests and shared AI instructions.
- {bundle.name}: complete available Git history, including the owner's initial commit.
- {web_zip.name}: static web preview; serve the extracted directory over HTTP.
- android/: standalone development-signed APK, hashes and static verification reports.
- verification/: browser workflow report and screenshots.
- {checkpoint_path.name}: source/build identities and remaining verification scope.
- SHA256SUMS.json: SHA-256 for every other file in this outer archive.

RUN OR CONTINUE CODING
Extract the source ZIP, read AGENTS.md, docs/STATUS.md and docs/TASKS.md,
then use Node22 and run npm ci followed by npm run web.
Alternatively restore history with:
  git clone {bundle.name} belem-lng
  cd belem-lng
  git switch main
The bundle restore is offline. Configure origin to the private GitHub URL when needed.
Node dependencies and Android build tools are installed separately; no credentials
or private signing keys are included.

ANDROID
Extract android/{native['apk']} and install it on Android7 or newer.
Package com.belem.lng.rebuild installs alongside the earlier app and has separate data.
The APK embeds the app for offline use and uses a development signer.
Static checks passed. Native launch, Edit/Cancel/Save, force-stop/reopen, sharing and
device responsiveness still require Android device testing. Back up watch records.

MODEL AND REFERENCES
This is the v{version} rebuild with manual observations and a training simulator.
The source snapshot includes the six original HMI photographs and owner-supplied
06.zip bunkering records. The large mixed GTT/H1843 source bundle is retained in
the separate private reference release linked from docs/REFERENCES.md.
The previous app source and signing key are unavailable. Exact vendor-HMI fidelity,
commissioned settings and model calibration remain pending. Consult docs/MODEL.md
and docs/DIAGRAM_SOURCES.md; training values are not vessel limits.
'''
members = {source.name: source.read_bytes(), bundle.name: bundle.read_bytes(),
           web_zip.name: web_zip.read_bytes(), checkpoint_path.name: checkpoint_path.read_bytes(),
           'START-HERE.txt': start.encode(), 'verification/github-runs.json': (json.dumps(ci, indent=2) + '\n').encode()}
for directory, folder in ((android, 'android'), (browser, 'verification')):
    for path in sorted(directory.rglob('*')):
        if path.is_file():
            members[f'{folder}/{path.relative_to(directory).as_posix()}'] = path.read_bytes()
members['SHA256SUMS.json'] = (json.dumps({name: hashlib.sha256(data).hexdigest() for name, data in sorted(members.items())}, indent=2) + '\n').encode()
target = out / f'{prefix}-all.zip'
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name, data in sorted(members.items()):
        archive.writestr(name, data)
with zipfile.ZipFile(target) as archive:
    assert archive.testzip() is None
    for name, expected in json.loads(archive.read('SHA256SUMS.json')).items():
        assert hashlib.sha256(archive.read(name)).hexdigest() == expected, name
subprocess.run(['git', 'bundle', 'verify', str(bundle)], cwd=repo, check=True)
apk_copy = out / apk.name
if apk_copy.resolve() != apk.resolve():
    shutil.copy2(apk, apk_copy)
(out / 'SHA256SUMS.txt').write_text(f'{digest(target)}  {target.name}\n{digest(apk_copy)}  {apk_copy.name}\n')
print(json.dumps({'file': str(target), 'bytes': target.stat().st_size, 'sha256': digest(target), 'sourceCommit': commit}, indent=2))
