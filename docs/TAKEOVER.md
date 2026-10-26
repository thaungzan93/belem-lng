# Takeover checkpoint — 2026-10-26

The owner requested a full transfer to GitHub so another AI can continue. This is a **documentation-only handover** of the completed 0.5.1 checkpoint. No application code, dependency, data schema or APK changes are introduced by this handover. Product implementation is not complete; the remaining work below is explicit.

Start with [AGENTS.md](../AGENTS.md), [HANDOVER.md](HANDOVER.md), [STATUS.md](STATUS.md) and [TASKS.md](TASKS.md). The [chat decision record](CHAT_CONTEXT.md) preserves the visible owner requests, accepted decisions and important corrections; it is not a complete or verbatim chat export.

## Exact release and evidence

Repository: [thaungzan93/belem-lng](https://github.com/thaungzan93/belem-lng), **private**, default branch `main`. Each AI/developer must independently authenticate with an account or integration authorized for this repository; this chat's GitHub connection is not transferred.

| Item | Pinned identity |
| --- | --- |
| App | Version 0.5.1, Android versionCode 3, package `com.belem.lng.rebuild` |
| App source / release tag commit | `b28b8a47b097b21f49f2bf1d557c7295e0c3a771` |
| Source snapshot inside the published ZIP | `75ed0495f0e0b2e17414d7c72c395c0e58f78316`; adds verification documentation, same app inputs |
| Download | [v0.5.1-candidate.1 private prerelease](https://github.com/thaungzan93/belem-lng/releases/tag/v0.5.1-candidate.1) |
| Source/browser CI for app commit | [40210786228](https://github.com/thaungzan93/belem-lng/actions/runs/40210786228), passed: TypeScript, 37 tests, web export, 15 browser groups |
| Android CI for app commit | [40210787472](https://github.com/thaungzan93/belem-lng/actions/runs/40210787472), passed: build and static APK checks |
| Private publication | [40217548835](https://github.com/thaungzan93/belem-lng/actions/runs/40217548835), passed |
| Documentation/source checkpoint CI | [40217525858](https://github.com/thaungzan93/belem-lng/actions/runs/40217525858), passed at `75ed049` |
| Raw retained evidence | [evidence/v0.5.1](evidence/v0.5.1/), [stage recheck](RECHECK-2026-10-25.md) |

| Release file | Bytes | SHA-256 |
| --- | ---: | --- |
| `belem-lng-v0.5.1-candidate.apk` | 57,757,788 | `0a1d238d2cf42b9e280301b9dce5149230bc6d0ac93321551c6163e2f51c2e59` |
| `belem-lng-v0.5.1-all.zip` | 44,196,478 | `c5a5ee32e52a43250736f9d6c4c0c1dd17f998828fc5b96289784ca782d3776c` |
| `SHA256SUMS.txt` | 188 | `571aa26c681b4412efd2f9a42993f67ed572ba90da180675ba27a6dd6338e654` |

Release visibility, uploaded asset sizes/digests and the recorded checkpoint CI were rechecked through GitHub on 2026-10-26. [release-delivery.json](evidence/v0.5.1/release-delivery.json) retains the delivery identities. The APK signature/hash/CRC/alignment were independently checked during the preceding recheck. The current handover does not rerun Android or extend those results to another build.

The release ZIP is an immutable earlier snapshot and does **not** contain this 2026-10-26 handover. Clone or pull current `main` to get these final documents. Do not replace published assets merely to refresh documentation.

## What currently works in source

The training circuit, three source-style diagram panes and manual watch log are implemented. Four pump branches, two BOG branches, two vaporizer branches and their modeled gates affect shared fuel inventories. ESD clears requests; reset stays stopped. Aggregate capacities are shared across enabled branches. Manual mode uses the latest observation snapshot, leaves omitted readings unknown, and disables simulator actuation.

Saved watch records open read-only, then support Edit/Save/Cancel without changing identity/count or filling omitted values. Units, zero/tiny values and corrected UTC ordering survive round trips. CSV/JSON export and JSON merge are implemented. Version 0.5.1 fixes an overlapping slow-storage save/navigation race, small-screen diagram collapse and inherited-name setting validation. [DATA.md](DATA.md), [ARCHITECTURE.md](ARCHITECTURE.md) and the actual tests define the precise contract.

## What is still unverified or absent

- **Native interactions NOT RUN.** No connected device or hardware virtualization was available. An AOSP API 30 x86_64 software emulator failed to finish booting within the bounded 300-second wait; no APK was installed/launched. This is a test-environment blocker, not an app launch failure or pass.
- Native sharing, keyboard/rotation behavior, saved-data reopen and sustained physical ARM performance still need [NATIVE_QA.md](NATIVE_QA.md). Browser/static checks cannot answer them.
- Pure methane, fixed temperatures and assumed rates remain a training mass model. Independent ME/AE inventory/pressure and energy balances, mixture equilibrium, calibrated equipment curves and commissioned protections are unfinished.
- Bunker arm valves, NG heater energy/control, glycol utilities, boiler demand and vendor IGPR internals are reference-only. Inspectors and unknown states are intentional; do not describe every source symbol as a full equipment model.
- Digital HMI project/fonts, old 0.3.x editable application and original private signing key remain unavailable. Perspective photos do not establish pixel-equivalent UI.
- No simulator-state persistence/restore, electrical coupling, multi-device backend or production signing is implemented. Current candidates use the template development signer. Its certificate matches preceding rebuild candidates, not the old pre-rebuild app.

## References are already in GitHub

Read [REFERENCES.md](REFERENCES.md), [REFERENCE_UPLOADS.md](REFERENCE_UPLOADS.md), [DIAGRAM_SOURCES.md](DIAGRAM_SOURCES.md) and the manifests before asking the owner to upload anything again.

- Six original HMI JPEGs: [hmi-photos](hmi-photos/), SHA/dimension register in [hmi-photo-manifest.json](hmi-photo-manifest.json).
- Original Shanghai bunkering archive: [reference-material/bunkering/06.zip](../reference-material/bunkering/06.zip), 7,914,347 bytes, SHA `f9f3fa4aacf801f48a51cd73eb0fa2e9864cb45b9e61af51942505f51140552c`. Barge measurements are not BELEM tank settings; workbook formulas were not validated.
- Large mixed Drive bundle: [private reference release](https://github.com/thaungzan93/belem-lng/releases/tag/references-2026-10-25), `belem-owner-reference-bundle.zip`, 312,884,714 bytes, SHA `50bf9889bb3acde59344c59103f0124a31196b69daac366e7df850a65bcf5578`. It contains general GTT training plus nested H1843/FGSS material, with 100 PDF file entries including duplicates. [reference-inventory.json](reference-inventory.json) makes members searchable without this chat.
- The five originally named structural PDFs are recovered inside that bundle. Not all PDF contents or installed applicability have been reviewed. Some H1839A-only instruments are explicitly excluded from BELEM live readings; see DIAGRAM_SOURCES.md.

Large reference bytes remain in the reference release. No credentials or private signing keys belong in source or release archives.

## First next task

1. Fetch current main, inspect remote changes, and claim one task/branch using [CONTRIBUTING.md](../CONTRIBUTING.md). The outgoing implementation work has ended; this handover does not reserve an active coding task.
2. With representative Android hardware, execute NATIVE_QA.md using the pinned APK and synthetic observations. Record device/API/ABI, APK SHA, actual per-case results, logs and exported bytes. Fix any reproducible failures in a separately tested patch.
3. Without hardware, choose a bounded source review/calibration task, or implement the separately proposed validated simulator-state backup/restore described in HANDOVER.md. Preserve the watch-data key/schema. Do not repeatedly attempt software emulation without new evidence that the blocker changed.
4. Adopt ship parameters/operating cases one source-reviewed module at a time: document identity/hash/revision/page, installed applicability, units and checks. Keep unreviewed values labelled assumptions. Electrical/other systems follow the LNG core.

## Working tools and delivery gotchas

Use Node 22, `npm ci`, `npm run typecheck`, `npm test`, `npm run export:web`, then `npm run verify:browser`. Chromium must be installed; `CHROMIUM_PATH` can select a system binary. Native builds require a **full JDK 17 including javac**, SDK 36, NDK 27.1.12297006 and CMake 3.22.1; see ANDROID.md. Keep the existing lockfile and UI stack unless the task specifically requires a change. Generated android/ and caches are not the source of truth.

GitHub Android builds are manual. The publisher requires successful source and Android runs at the same app commit and a new existing draft prerelease/tag for the current version. Its form has historical defaults: supply explicit intended run IDs/tag. Do not rerun it against a published release. Follow ANDROID.md and the actual workflow validations. New production signing requires separate protected storage and an update/migration plan; never put private keys in a Git bundle.

Other environments normally download private release assets with their authenticated GitHub tools. This managed session encountered artifact redirect restrictions and used the GitHub artifact-download connector followed by its temporary file download. If a redirect fails, retain proxy/TLS settings and use a supported authenticated download route; do not expose signed URLs, credentials or make the repository public.

## Handover validation

Local Markdown links and documentation JSON were checked, release/source/version/hash/test-count identities were compared, all six original photo hashes and original 06.zip SHA/CRC were verified, and application/config/dependency/build/test inputs were confirmed unchanged from the published checkpoint. An independent documentation review checked transcript labeling, evidence boundaries and resume guidance. This handover adds no new application test or native-runtime claim.

## Copy into the next AI

```text
Take over https://github.com/thaungzan93/belem-lng (private).
Read AGENTS.md, docs/TAKEOVER.md, docs/HANDOVER.md, docs/STATUS.md and
docs/TASKS.md, then docs/CHAT_CONTEXT.md for the owner's decisions.
Use your own authorized GitHub connection and current main.
The app is the 0.5.1 rebuild; do not treat older feature/test claims as current.
The current APK/source identities, references and remaining gaps are pinned.
Start with real Android QA if hardware is available; otherwise claim one
bounded task from the handover. Preserve manual/simulator separation,
watch-record identity/unknown/zero/unit semantics, the slow-write guard,
and source applicability. Run relevant checks, update status/tasks, and
push a finished checkpoint. No credentials/private signing keys in Git.
```
