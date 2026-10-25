# Belem LNG Rebuild

A new Android-first, offline React Native / Expo application for manual LNG watch records and a training fuel-system simulator. The rebuild started at version 0.4.0 as a new implementation because the earlier project and signing key could not be recovered. Version 0.5.0 reconstructs three source-style line-diagram panels and adds independent flow-blocking branches. The recovered H1843/FGSS topology and HMI photos inform those diagrams; numerical rates and thermodynamics remain training assumptions.

This repository contains executable source and tests. It does not restore the earlier application's reported 37 operating cases, protection matrix, electrical model or source-instrument register. See [STATUS](docs/STATUS.md), [TASKS](docs/TASKS.md) and [MODEL](docs/MODEL.md) for implemented behavior and limits.

Download the APK or the all-in-one project ZIP from the private [v0.4.0 candidate release](https://github.com/thaungzan93/belem-lng/releases/tag/v0.4.0-candidate.1). Sign in to GitHub with an account authorized for this repository. Source checks and APK static verification passed; Android device testing and vessel-reference validation remain pending.

## Run

Use Node 22, or a supported version at least 20.19.4.

```sh
npm ci
npm run web
```

For an Android development session with a configured Android SDK:

```sh
npm run android
```

The standalone APK build is separate: see [Android builds](docs/ANDROID.md). A development APK launched by Expo may require Metro; the release-candidate build script embeds the application for offline use.

## Current features

- Three scalable source-style panels (Fuel, Bunker stations, ME IGPR), native symbols and source-cited inspectors. Four pumps, two BOG branches, two vaporizer branches and isolation gates operate one shared training inventory. Manual mode disables actuation and displays only the latest entered snapshot, leaving unknown values blank.
- See [diagram sources and limits](docs/DIAGRAM_SOURCES.md) for source topology, training route abstractions and reference-only feedback.
- Tank liquid/gas inventories, assumed latent-heat boiloff, ideal-methane ullage and buffer pressures, pump/vaporizer and BOG-compressor routes, consumer delivery, bunkering, commanded venting and an external fuel-mass ledger.
- ESD latch/reset behavior; resetting does not restart equipment. Settings are labelled training assumptions rather than approved vessel settings.
- Local watch records with 26 common reading fields, custom instrument tags and units, UTC timestamps and notes.
- Open a saved record, select **Edit**, then **Save changes** or **Cancel editing**. Edits replace that snapshot without changing its ID or adding another entry. Clearing a reading makes it unknown. New-entry drafts stay separate.
- Actual CSV/JSON file exports and pasted JSON backup import. Android uses the system share sheet; web downloads a file. Duplicate IDs within an imported backup are rejected.

Watch records persist locally. Export backups before clearing storage. The simulator currently starts at its training defaults on each app launch; simulation state is not a saved watch observation.

The new Android application ID, `com.belem.lng.rebuild`, installs separately from the old app. The old signing key is unavailable. Current APK automation uses a development signing key and produces candidates; it does not create an approved production release.

## Verify

```sh
npm run typecheck
npm test
npm run export:web
npm run verify:browser
```

The browser check serves `dist/web` locally. It uses `CHROMIUM_PATH` when set, otherwise system Chromium or Playwright's installed Chromium (`npx playwright install chromium`). It requires `npm run export:web` first. Results belong to the exact source checked and are separate from Android runtime/device verification.

To serve the static web export yourself:

```sh
python3 -m http.server 8080 --directory dist/web
```

## Collaborate without losing work

**New AI or developer: start with [the complete handover](docs/HANDOVER.md).** It includes a copyable starter prompt, product decisions, architecture/data documentation, verification evidence, reference locations and next tasks. Read [AGENTS.md](AGENTS.md) before coding. Assign one task and branch per contributor, review pull requests, and keep [STATUS](docs/STATUS.md) and [TASKS](docs/TASKS.md) current. End each session at a tested commit with a concrete next task and explicit blockers. GitHub does not automatically coordinate AI agents.

For repository authorization and the first push, see [GitHub setup](docs/GITHUB.md).

The owner-authorized reference bundle is stored separately in the private [reference release](https://github.com/thaungzan93/belem-lng/releases/tag/references-2026-10-25). See [REFERENCES](docs/REFERENCES.md) for the GTT-versus-vessel distinction, hashes, inventory and missing files. Do not commit signing keys, passwords or generated APKs/ZIPs. Retain document identity, revision, page and applicability when adding source-confirmed vessel data.
