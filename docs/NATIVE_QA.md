# Android runtime QA plan

**Every test below is NOT RUN for the published 0.4.0 candidate.** Static build, browser and publication results are recorded separately in [VERIFICATION.md](VERIFICATION.md). Change a result only after executing that test on the identified APK and retaining evidence. A checklist is not a passing test report.

## Session record

Copy this record into a dated test report; use synthetic watch observations, not the sole copy of real watch data.

| Field | Value to record |
| --- | --- |
| Tester / UTC start and end | NOT RECORDED |
| Device manufacturer/model, Android/API, ABI | NOT RECORDED |
| Physical device or emulator; acceleration | NOT RECORDED |
| Screen size, density, font scale, orientations | NOT RECORDED |
| Install state and prior-data backup location/hash | NOT RECORDED |
| APK filename, SHA-256, package/version/code, certificate | NOT RECORDED; verify against release evidence |
| Source/build run; instrumented harness commit if used | NOT RECORDED |
| Network/airplane mode, battery/thermal state | NOT RECORDED |
| Evidence directory / report hash | NOT RECORDED |

Use PASS, FAIL, BLOCKED or NOT RUN for each result. Record actual actions, expected versus observed behavior, evidence paths/hashes and any issue ID. A blocked test must name its blocker; it does not pass. Label physical-device, emulator and instrumented-build results separately.

## Preparation

1. Download the private candidate and verify SHA256SUMS.txt. Expected APK digest is `3b73368f52bc183393bd8c6f20fe5cc4bec56882d5dd63f32d4eed292936ec71`.
2. Back up any existing rebuild watch records before an update. Do not uninstall the only copy to bypass a signing mismatch. Package `com.belem.lng.rebuild` is separate from the older app; no automatic data migration is expected.
3. Use a representative ARM device first; record any additional API/ABI/device separately. A software emulator result does not establish physical-device performance.
4. Install via Android's package installer or `adb install -r path/to/the-candidate.apk`. Keep Metro and Expo Go stopped. Confirm package 0.4.0 / code 1 before testing.
5. Store synthetic fixtures and redacted screenshots/logs outside tracked source. For each crash/ANR preserve the time, last action, screen recording and available adb logcat / system ANR trace. Do not clear evidence by rebooting first.

Example diagnostic commands; choose the connected device explicitly when several are present:

```sh
adb devices
adb shell dumpsys package com.belem.lng.rebuild
adb logcat -c
adb logcat -v threadtime > native-session.log
# In a separate terminal, only after saving the synthetic watch:
adb shell am force-stop com.belem.lng.rebuild
```

Force-stop is used for persistence tests; it must not be replaced by clearing application data.

## Test cases

| ID | Actions | Expected behavior | Result | Evidence / observed result |
| --- | --- | --- | --- | --- |
| N01 | Enable airplane mode; cold-launch the installed APK with no development server. | App opens without Metro, Expo Go or a network request being required; no crash/ANR. | NOT RUN | — |
| N02 | Open Fuel diagram, Watch log and Model/status; verify the simulator label and assumptions. | Screens open and the training model is distinguishable from manual observations; no claimed live vessel connection. | NOT RUN | — |
| N03 | Start fuel supply; step one minute; toggle available equipment and inspect readouts. | Modeled values respond; equipment states agree with the selected commands; no UI lockup. | NOT RUN | — |
| N04 | Activate ESD, attempt actuator/start commands, reset ESD and step again. | ESD latches controls disabled; reset leaves equipment stopped and does not restart delivery. | NOT RUN | — |
| N05 | Switch to Manual observations before entering data; inspect every readout/control. | Missing observations stay unknown; training actuators and ESD controls are disabled in manual mode. | NOT RUN | — |
| N06 | Save synthetic UTC observation with volume 0, pressure 135 mbar(g), tag TINYVALUE=0.0000001 kPa, CUSTOMZERO=0 sensor units and multiline notes. | One manual record persists; zeros/tiny values/units/notes remain intact; 135 mbar(g) displays as 0.135 bar(g); missing fields stay unknown. | NOT RUN | — |
| N07 | Open that saved record, then Edit. | Initial details are read-only; edit loads that record's complete snapshot, ID/time/notes and custom fields without borrowing other observations. | NOT RUN | — |
| N08 | Leave an unsaved new-entry draft; edit a saved record, alter fields, Cancel; repeat and Close. | Saved record stays unchanged; independent new-entry draft is preserved. | NOT RUN | — |
| N09 | Attempt invalid numeric input, impossible UTC date, invalid unit and an empty edited snapshot. | Clear validation errors; no saved-record mutation; valid draft fields remain available. | NOT RUN | — |
| N10 | Clear the saved pressure, add a custom tag, edit notes and correct its time to precede another record; Save. | Original ID and total count remain; corrected time re-sorts history; pressure stays unknown; other records and tiny values remain unchanged. | NOT RUN | — |
| N11 | Save, force-stop, reopen without network, open/Edit the saved record; then cancel. | Corrected data, IDs, units and cleared fields survive; cancelled draft does not persist. Simulator resetting is expected and separate from watch storage. | NOT RUN | — |
| N12 | Export CSV and Backup JSON through the native share sheet to a local receiver/file destination; read resulting bytes. | Files are readable and contain corrected records, multiline notes, unknown blanks, zero/tiny values and units; cancellation causes no data loss. | NOT RUN | — |
| N13 | Merge valid synthetic JSON backup; try malformed JSON and duplicate observation IDs. | Valid merge preserves identities; invalid/duplicate-ID input is rejected without changing stored records. | NOT RUN | — |
| N14 | On a disposable test build only, make one AsyncStorage write reject using a reviewed test hook; retry after restoring writes. | Error appears, saved data stays unchanged and draft remains; retry succeeds once with no duplicate ID. | NOT RUN | —; hook not supplied by release APK |
| N15 | Merge enough synthetic older observations to paginate; open and edit an older record with a tiny reading and absent custom unit. | Older records remain reachable/editable; notes-only edits preserve tiny values and originally absent units. | NOT RUN | — |
| N16 | Focus first/last form fields and multiline notes; show/hide keyboard, scroll and tap Save/Cancel. | Focused input and all essential actions remain reachable; no accidental save or hidden error. | NOT RUN | — |
| N17 | Rotate phone with diagram zoomed and with an unsaved edit open; repeat on tablet if available. | Layout remains readable; draft/state is retained; Save/Cancel stay accessible; diagram fits/zooms/pans without clipped controls. | NOT RUN | — |
| N18 | Exercise fit, zoom buttons and finger scrolling/pan in portrait and landscape. | Entire fixed-aspect diagram can be inspected; native gestures do not intercept toolbar/form controls. | NOT RUN | — |
| N19 | Repeat stepping, navigation, zoom and edit flows for a recorded session; record timings, stalls, memory/thermal context and ANRs. | Controls remain operable; crashes/ANRs/stalls are captured as failures, with actual observations rather than invented benchmarks. | NOT RUN | — |
| N20 | Use increased font scale and Android accessibility navigation on essential controls. | Labels/readings and actions remain discoverable and reachable; record device-specific limitations. | NOT RUN | — |

N14 needs a reviewed fault-injection method; none is claimed to exist in the release. If unavailable, mark BLOCKED. Never fill a real device's disk or corrupt the only watch database to provoke failure. If an instrumented build is used, record its separate SHA/commit and do not relabel its results as release-APK results.

## Close the checkpoint

Attach a per-test report and evidence hashes, including the actual CSV/JSON files used in assertions. Distinguish failures in the app from a missing share receiver or emulator/System UI obstruction; preserve observations rather than guessing the cause. Re-run only affected tests after a fix and identify the new APK explicitly. Update STATUS.md/TASKS.md with completed and still-pending scope. Do not mark Android runtime verified while core offline launch, save/edit/cancel, reopen and native file-delivery paths remain untested.

Passing this plan would validate application behavior on the tested devices. It would not establish source-exact ship HMI fidelity, commissioned protection settings or a calibrated LNG model.
