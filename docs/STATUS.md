# Current checkpoint

Version: 0.4.0 rebuild. This is a new implementation, not recovered version 0.3.1 source.

New collaborators: read [HANDOVER.md](HANDOVER.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DATA.md](DATA.md) and [REFERENCES.md](REFERENCES.md). The full shared handover, QA plan and small durable CI evidence copies are now in Git; source/reference archives remain private release assets. This handover task changes documentation/reference tooling, not the application or distributed APK.

## Working source

- Shared fuel-mass training engine and adjustable assumptions.
- Native View/Text diagram with working equipment, ESD and scalable navigation.
- Separate manual observations, local storage, record details/editing and backup import/export.
- Strict TypeScript and fresh engine/logbook tests.
- Source/web checks workflow and a manual standalone Android candidate workflow.

The diagram does not use react-native-svg. Android builds now pass; device responsiveness still requires a runtime test.

## Verified in this session

- Strict TypeScript check: passed.
- 27 new engine and logbook tests: passed, no failures or skips.
- Static web export: passed.
- 9 Chromium integration workflow groups: passed, no page errors; desktop and 412×915 phone viewports checked. Includes simulator/ESD, manual unknowns, record edits, failed-save recovery, real downloads, backups/reload and fit/zoom/pan.
- Android build script/workflow syntax and verifier-logic checks: passed; these are not APK verification results.
- Local build preflight now rejects a missing Java compiler or a runtime-only `JAVA_HOME` before native generation; negative checks and the full-JDK path passed.

Both [GitHub source checks](https://github.com/thaungzan93/belem-lng/actions/runs/40101777969) and the [GitHub Android build](https://github.com/thaungzan93/belem-lng/actions/runs/40101785824) passed for commit `db31cd070b2a1457802f0b7d6a6caff7c80f60ae`. Browser reports/screenshots and APK verification evidence are included in the downloadable checkpoint. Historical test counts from the lost implementation are not evidence for this rebuild. Android runtime and vessel-reference validation have not run.

## Android candidate and downloads

The GitHub-built four-ABI standalone development-signed APK is 57,725,876 bytes, with SHA-256 `3b73368f52bc183393bd8c6f20fe5cc4bec56882d5dd63f32d4eed292936ec71`. Package `com.belem.lng.rebuild`, version 0.4.0/code 1, minimum API 24 and target API 36 were checked against the APK. Signature, embedded Hermes bundle, ZIP integrity, blocked permissions and 16 KB native alignment checks passed. The build has no Internet permission. Its report identifies commit `db31cd0` and a clean tracked source tree; the downloaded artifact also passed independent local static rechecks.

Use the private [v0.4.0 candidate release](https://github.com/thaungzan93/belem-lng/releases/tag/v0.4.0-candidate.1), signed in to an authorized GitHub account. The all-in-one ZIP includes committed source, available Git history, web preview, APK and reports, with a manifest of checksums. Dependencies, original private reference files and signing keys are excluded. The direct APK is also provided. The release tag identifies the CI-built source; later documentation-only commits describe its delivery and do not change the application.

The earlier local build is retained separately and has a different APK hash. It is not the distributed GitHub APK. Native launch, record editing, persistence, sharing and responsiveness have not been exercised on a device.

## External blockers

- Repository access and delivery are working. The source is private and the owner's initial commit is preserved. The retired SDK-package issue in the first hosted attempt was fixed and the subsequent build passed.
- This workspace has no `/dev/kvm`, so hardware-accelerated emulator testing is unavailable. No physical Android device is connected.
- The owner's 312,884,714-byte Drive bundle was recovered on 2026-10-25. It contains a general GTT training PDF plus nested H1843/FGSS sets with 99 further PDF file entries, including the five separately named structural PDFs. The [reference manifest](reference-manifest.json) and recursive inventory distinguish recovered files from reviewed applicability; no model calibration was performed.
- The separately uploaded `06.zip`, original HMI photo files/digital exports, old app source and old signing key remain unavailable. Candidate.1's Model/status missing-files message predates this recovery.

## Next bounded checkpoint

Install the candidate on a representative Android device and exercise offline launch, controls, saved-record Edit/Cancel/Save, force-stop/reopen, sharing and sustained responsiveness. Record actual results before calling the build runtime-verified. In parallel, review recovered source revisions/applicability, build a page-cited tag/topology register for one panel and calibrate its behavior as separate tasks in TASKS.md. Other AI tools should read AGENTS.md and these checkpoint documents before editing.
