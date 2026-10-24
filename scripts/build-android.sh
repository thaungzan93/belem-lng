#!/usr/bin/env bash
# Builds an offline release bundle with Expo's development signing identity.
# This is an installable candidate, not a production signing/deployment step.
set -euo pipefail

belem_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$belem_root"

for belem_command in node npm java javac python3; do
  command -v "$belem_command" >/dev/null || {
    echo "Missing $belem_command. See docs/ANDROID.md." >&2
    exit 1
  }
done
if [[ -n "${JAVA_HOME:-}" && ! -x "$JAVA_HOME/bin/javac" ]]; then
  echo 'JAVA_HOME must point to a full JDK with bin/javac, not a Java runtime. See docs/ANDROID.md.' >&2
  exit 1
fi
javac -version >/dev/null 2>&1 || {
  echo 'The Java compiler cannot run. Install a full JDK and check PATH/JAVA_HOME. See docs/ANDROID.md.' >&2
  exit 1
}
[[ -f package-lock.json && -d node_modules/expo ]] || {
  echo 'Run npm ci before building.' >&2
  exit 1
}

belem_sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
[[ -n "$belem_sdk" && -d "$belem_sdk" ]] || {
  echo 'Set ANDROID_HOME to an installed Android SDK. See docs/ANDROID.md.' >&2
  exit 1
}
export ANDROID_HOME="$belem_sdk"
belem_build_tools="$belem_sdk/build-tools/36.0.0"
for belem_tool in aapt apksigner zipalign; do
  [[ -x "$belem_build_tools/$belem_tool" ]] || {
    echo "Missing Android build-tools 36.0.0/$belem_tool." >&2
    exit 1
  }
done
[[ -f "$belem_sdk/platforms/android-36/android.jar" ]] || {
  echo 'Missing Android SDK platform 36.' >&2
  exit 1
}

# android/ is generated and ignored. Never erase tracked native customizations.
if command -v git >/dev/null && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if [[ -n "$(git ls-files -- android)" ]]; then
    echo 'Refusing clean prebuild: android/ contains tracked files.' >&2
    exit 1
  fi
fi

echo 'Generating the Android project from app.json (android/ is replaced).'
CI=1 EXPO_NO_TELEMETRY=1 npx --no-install expo prebuild --platform android --clean --no-install

echo 'Assembling a development-signed release APK with embedded Hermes JavaScript.'
(
  cd android
  ./gradlew :app:assembleRelease --no-daemon --console=plain \
    -PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64
)

belem_apk_source="$belem_root/android/app/build/outputs/apk/release/app-release.apk"
[[ -f "$belem_apk_source" ]] || {
  echo 'Gradle did not produce app-release.apk.' >&2
  exit 1
}
belem_version="$(node -e 'process.stdout.write(require("./app.json").expo.version)')"
[[ "$belem_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.+-][a-zA-Z0-9.+-]+)?$ ]] || {
  echo 'app.json expo.version is not a safe application version.' >&2
  exit 1
}
belem_output="$belem_root/artifacts/android"
mkdir -p "$belem_output"
belem_apk="$belem_output/belem-lng-v${belem_version}-candidate.apk"
cp "$belem_apk_source" "$belem_apk"

"$belem_build_tools/aapt" dump badging "$belem_apk" > "$belem_output/apk-badging.txt"
"$belem_build_tools/aapt" dump permissions "$belem_apk" > "$belem_output/apk-permissions.txt"
"$belem_build_tools/apksigner" verify --verbose --print-certs "$belem_apk" > "$belem_output/apk-signature.txt"
"$belem_build_tools/zipalign" -c -P 16 -v 4 "$belem_apk" > "$belem_output/apk-alignment.txt"

python3 - "$belem_root" "$belem_apk" <<'PY'
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import re
import struct
import subprocess
import sys
import zipfile

root, apk = map(Path, sys.argv[1:])
output = apk.parent
config = json.loads((root / "app.json").read_text())["expo"]
badging = (output / "apk-badging.txt").read_text()
permission_report = (output / "apk-permissions.txt").read_text()
signature = (output / "apk-signature.txt").read_text()

def require(condition, message):
    if not condition:
        raise SystemExit("APK verification failed: " + message)

package = re.search(r"^package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'", badging, re.M)
require(package is not None, "package metadata is missing")
package_id, version_code, version_name = package.groups()
require(package_id == config["android"]["package"], "package differs from app.json")
require(int(version_code) == config["android"]["versionCode"], "versionCode differs from app.json")
require(version_name == config["version"], "version differs from app.json")
minimum = re.search(r"^sdkVersion:'(\d+)'", badging, re.M)
target = re.search(r"^targetSdkVersion:'(\d+)'", badging, re.M)
require(minimum is not None and int(minimum[1]) == 24, "expected Android 7.0 / API 24 minimum")
require(target is not None and int(target[1]) == 36, "expected target SDK 36")
require("launchable-activity:" in badging, "no launcher activity")
require("application-debuggable" not in badging, "release APK is debuggable")
require(re.search(r"Verified using v2 scheme .*: true", signature) is not None, "APK Signature Scheme v2 is absent")
certificate = re.search(r"Signer #1 certificate SHA-256 digest: ([0-9a-fA-F]+)", signature)
require(certificate is not None, "signer certificate fingerprint is missing")

permissions = sorted(set(re.findall(r"uses-permission(?:-sdk-\d+)?: name='([^']+)'", permission_report)))
blocked = {
    "android.permission.INTERNET",
    "android.permission.SYSTEM_ALERT_WINDOW",
    "android.permission.RECORD_AUDIO",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE",
    "android.permission.MANAGE_EXTERNAL_STORAGE",
    "android.permission.READ_MEDIA_IMAGES",
    "android.permission.READ_MEDIA_VIDEO",
    "android.permission.READ_MEDIA_AUDIO",
    "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
}
blocked.update(config["android"].get("blockedPermissions", []))
require(not blocked.intersection(permissions), "blocked permissions: " + ", ".join(sorted(blocked.intersection(permissions))))

expected_abis = {"armeabi-v7a", "arm64-v8a", "x86", "x86_64"}
elf_checks = []
with zipfile.ZipFile(apk) as archive:
    require(archive.testzip() is None, "APK ZIP CRC integrity check failed")
    names = set(archive.namelist())
    require("assets/index.android.bundle" in names, "release JavaScript bundle is missing")
    bundle = archive.read("assets/index.android.bundle")
    require(bundle[:8] == bytes.fromhex("c61fbc03c103191f"), "embedded release bundle is not Hermes bytecode")
    abis = {name.split('/')[1] for name in names if name.startswith("lib/") and name.endswith(".so")}
    require(abis == expected_abis, "expected four supported ABIs, found " + ", ".join(sorted(abis)))
    require(all(f"lib/{abi}/libhermes.so" in names for abi in expected_abis), "Hermes native library is missing")
    for name in sorted(names):
        if not name.startswith(("lib/arm64-v8a/", "lib/x86_64/")) or not name.endswith(".so"):
            continue
        data = archive.read(name)
        require(data[:5] == b'\x7fELF\x02', "invalid 64-bit ELF: " + name)
        endian = '<' if data[5] == 1 else '>'
        offset = struct.unpack_from(endian + 'Q', data, 32)[0]
        size, count = struct.unpack_from(endian + 'HH', data, 54)
        load_segments = 0
        for index in range(count):
            ph = offset + index * size
            if struct.unpack_from(endian + 'I', data, ph)[0] != 1:
                continue
            load_segments += 1
            file_offset, address = struct.unpack_from(endian + 'QQ', data, ph + 8)
            alignment = struct.unpack_from(endian + 'Q', data, ph + 48)[0]
            require(alignment >= 16384 and file_offset % 16384 == address % 16384,
                    "64-bit ELF LOAD segment is not 16 KB aligned: " + name)
        require(load_segments > 0, "no ELF LOAD segments: " + name)
        elf_checks.append(name)

try:
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True, stderr=subprocess.DEVNULL).strip()
    tracked_changes = bool(subprocess.check_output(["git", "status", "--porcelain", "--untracked-files=no"], cwd=root, text=True).strip())
except (OSError, subprocess.CalledProcessError):
    commit, tracked_changes = None, None
digest = hashlib.sha256(apk.read_bytes()).hexdigest()
report = {
    "schemaVersion": 1,
    "status": "static_checks_passed",
    "releaseType": "development_signed_candidate",
    "generatedAtUTC": datetime.now(timezone.utc).isoformat(),
    "apk": apk.name,
    "sha256": digest,
    "bytes": apk.stat().st_size,
    "appVersion": version_name,
    "versionCode": int(version_code),
    "packageId": package_id,
    "minSdk": int(minimum[1]),
    "targetSdk": int(target[1]),
    "sourceCommit": commit,
    "trackedSourceModifiedAfterCheckout": tracked_changes,
    "abis": sorted(abis),
    "permissions": permissions,
    "signing": {
        "type": "Expo template development key; not production signing",
        "certificateSHA256": certificate[1].lower(),
        "previousAppCertificateContinuity": "Not established; previous signing key unavailable. Rebuild uses a separate package ID.",
    },
    "checks": [
        "Package, version and versionCode match app.json",
        "Minimum API 24, target API 36 and launcher activity",
        "APK is not debuggable and passes full ZIP CRC validation",
        "APK signature verified with v2 signature scheme",
        "Network, overlay, microphone, storage and configured blocked permissions absent",
        "Hermes bytecode embedded at assets/index.android.bundle",
        "All four Android ABIs include the Hermes native library",
        "APK ZIP alignment verified for 16 KB pages",
        f"All {len(elf_checks)} 64-bit ELF libraries have 16 KB aligned LOAD segments",
    ],
    "aligned64BitLibraries": elf_checks,
    "runtimeVerification": {
        "status": "not_run",
        "reason": "This build script performs static APK checks only. Install, offline launch, manual readings, Edit/Save/Cancel, persistence and device responsiveness require emulator/device testing.",
    },
}
(output / "verification.json").write_text(json.dumps(report, indent=2) + "\n")
report_digest = hashlib.sha256((output / "verification.json").read_bytes()).hexdigest()
(output / "SHA256SUMS.txt").write_text(f"{digest}  {apk.name}\n{report_digest}  verification.json\n")
print(f"Static checks passed: {apk.name}\nSHA-256: {digest}")
print("Development-signed candidate. Android runtime behavior has not been verified by this script.")
PY
