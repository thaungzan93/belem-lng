# Shared contributor instructions

This repository is a new implementation, version 0.5.0. The original app code and signing key were not recovered; reference recovery is tracked separately below. Historical notes do not establish implemented features or current passing checks.

Read [docs/HANDOVER.md](docs/HANDOVER.md), [docs/STATUS.md](docs/STATUS.md) and [docs/TASKS.md](docs/TASKS.md) first. Reference recovery changed on 2026-10-25: the owner's Drive bundle was retrieved, including H1843/FGSS PDFs. Consult [docs/REFERENCES.md](docs/REFERENCES.md) and its manifest before assuming sources are missing or parameters are verified. The six HMI photo originals and 06.zip were re-uploaded and archived for the diagram fix; see docs/REFERENCE_UPLOADS.md. The old application source/signing key and editable digital HMI project remain unavailable.

## Work in small finished checkpoints

Use a separate branch for each bounded task and avoid concurrent ownership of the same files. Keep docs/STATUS.md and docs/TASKS.md current. Before ending a working session, run relevant checks, commit working changes, and record exact pending work and blockers. Never leave a half-applied change described as finished. Other AI tools should read these files first.

## Product and data

Android first with shared web source. Inputs are manual, offline observations; there is no vessel-control/IAS connection. Keep simulator data separate from manual observations. Missing fields stay unknown; numeric zero is valid. Saved-record edits retain IDs and replace complete snapshots without borrowing values or adding duplicates. Preserve custom units, tiny decimal readings, corrected-time sorting, cancellation and failure recovery.

Do not invent ship settings, curves, commissioned limits, source tags or document provenance. The current model uses explicitly labelled training assumptions. Reconcile against original references before claiming vessel fidelity. Perspective photos alone do not establish pixel equivalence.

## Native responsiveness

The old candidate reportedly stalled in react-native-svg native TSpan/Paint text drawing. The rebuild uses core React Native Views/Text for its diagram. This avoids that specific implementation path but is not evidence of an Android performance fix. Verify actual builds on Android and record unresolved failures.

## Verification and builds

Use package-lock.json. Run npm ci, npm run typecheck, npm test and npm run export:web. Run npm run verify:browser with an installed Chromium browser; see README.md. Native build instructions are in docs/ANDROID.md. CI results must match the commit being discussed. Keep source, browser, emulator and physical-device results separate. Never reuse old counts or an old APK's checks as current evidence.

Never commit credentials, private signing keys or generated APK/ZIP files. The owner authorizes sharing project context and source references with collaborators in this private repository. Keep large original reference bundles in the private reference release, with identities, hashes and applicability recorded in docs/REFERENCES.md; small reviewed source extracts may be tracked with provenance. Android native directories are generated from app.json by Expo prebuild. The new application ID keeps this rebuild separate from the earlier installation; the original signing key is unavailable. Default CI APKs are development-signed candidates, not approved production or vessel-control builds.
