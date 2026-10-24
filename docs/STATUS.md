# Current checkpoint

Version: 0.4.0 rebuild. This is a new implementation, not recovered version 0.3.1 source.

## Working source

- Shared fuel-mass training engine and adjustable assumptions.
- Native View/Text diagram with working equipment, ESD and scalable navigation.
- Separate manual observations, local storage, record details/editing and backup import/export.
- Strict TypeScript and fresh engine/logbook tests.
- Source/web checks workflow and a manual standalone Android candidate workflow.

The diagram does not use react-native-svg. That removes the old implementation's native SVG text path; Android responsiveness still requires an actual build and runtime test.

## Verified in this session

- Strict TypeScript check: passed.
- 27 new engine and logbook tests: passed, no failures or skips.
- Static web export: passed.
- 9 Chromium integration workflow groups: passed, no page errors; desktop and 412×915 phone viewports checked. Includes simulator/ESD, manual unknowns, record edits, failed-save recovery, real downloads, backups/reload and fit/zoom/pan.
- Android build script/workflow syntax and verifier-logic checks: passed; these are not APK verification results.
- Local build preflight now rejects a missing Java compiler or a runtime-only `JAVA_HOME` before native generation; negative checks and the full-JDK path passed.

The browser script and fresh reports/screenshots are included in the downloadable checkpoint. Historical test counts from the lost implementation are not evidence for this rebuild. Android generation and static APK verification have now passed locally; Android runtime and vessel-reference validation have not run.

## Local Android candidate

The four-ABI standalone development-signed APK built successfully with JDK 17, Gradle 8.14.3 and SDK 36. It is 57,725,876 bytes, with SHA-256 `104dd591d787db45c03527059c5fceaf9bc8e7ebfd52be30e3729a54a2106c3f`. Package `com.belem.lng.rebuild`, version 0.4.0/code 1, minimum API 24 and target API 36 were checked against the APK. Signature, embedded Hermes bundle, ZIP integrity, blocked permissions and 16 KB native alignment checks passed. The build has no Internet permission.

The initial successful build report records checkout `3246373` and a modified tree because Expo generated an `ios` npm script; that exact generated patch is retained with the report. Application source and dependencies were unchanged. The npm script is now intentionally retained to avoid that metadata rewrite in later builds. The subsequent Java-compiler preflight fix does not change the application bundle. Keep this local result separate from future GitHub build results. Native launch, record editing, persistence and responsiveness have not been exercised on a device.

## External blockers

- Source is pushed to the private `thaungzan93/belem-lng` repository, preserving the owner's initial README commit. GitHub source checks are running. The first hosted Android run [40101646177](https://github.com/thaungzan93/belem-lng/actions/runs/40101646177) stopped during SDK setup because the setup action's default requested Google's retired `tools` package. The workflow now requests only `platform-tools` and the command-line tools version used successfully locally; a fresh hosted build is pending. That setup failure did not compile the app or produce an APK.
- This workspace has no `/dev/kvm`, so hardware-accelerated emulator testing is unavailable. No physical Android device is connected.
- Original reference PDFs, HMI exports, old source and old signing key remain unavailable.

## Next bounded checkpoint

Finish GitHub source checks and the corrected manual Android workflow, and publish a private candidate download with the source and verification evidence. Exercise Android flows before calling the build runtime-verified. Continue vessel-reference recovery and calibration using TASKS.md.
