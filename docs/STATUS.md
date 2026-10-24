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

The browser script and fresh reports/screenshots are included in the downloadable checkpoint. Historical test counts from the lost implementation are not evidence for this rebuild. Actual Android generation/runtime and vessel-reference validation have not run.

## External blockers

- GitHub authentication succeeds as `thaungzan93`, but GitHub denied repository creation through the connected authorization. No remote repository or push is claimed. Create an empty private `belem-lng` repository and authorize its access; then this local project can be pushed and the workflows run.
- This workspace has no Android SDK. The manual GitHub Actions build is prepared, but an APK has not been generated here.
- Original reference PDFs, HMI exports, old source and old signing key remain unavailable.

## Next bounded checkpoint

This working source is ready for commit/export and for pushing once the private repository is authorized. Run the source-check workflow, then manually run the Android workflow and retain its actual APK/build report. Exercise the Android flows before calling the build verified. Continue vessel-reference recovery and calibration using TASKS.md.
