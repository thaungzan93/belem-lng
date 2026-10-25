# Start here: AI and developer handover

This repository is the durable source of project context. A new assistant does not need the original chat to start working. Read this file, [AGENTS.md](../AGENTS.md), [STATUS.md](STATUS.md) and [TASKS.md](TASKS.md) before changing code.

## What the owner wants

An Android-first LNG application for the gas engineer on **CMA CGM BELEM**, with a web version and other ship systems added later. The owner wants both an LNG/fuel-system simulator and manually entered day-to-day observations. The interface should eventually reproduce the ship HMI photographs and source diagrams, with scalable phone/tablet layouts and functioning equipment/routes. Saved observations must open with an Edit action. The owner's word “transactions” refers to these watch records, not an implemented financial module.

The owner wants Codex, Antigravity and other AI tools to share the same GitHub project, work in finished checkpoints and avoid losing work when a chat or token budget ends. The repository is private. Its privacy permits sharing project/reference context with authorized collaborators; it does not make credentials or private signing keys suitable for Git history.

## Essential distinction

The runnable application is **version 0.5.0, a rebuild**. The old source and signing key were lost from the execution workspace. Historical reports of 14 HMI screens, 37 operating cases, electrical coupling or 124 tests do **not** establish features in this tree. The present implementation has a smaller training fuel model, a source-connected branch wrapper, three scalable diagram panels and a manual watch log. [HISTORY.md](HISTORY.md) records the old context without treating it as current evidence.

The currently distributed APK is a development-signed candidate. Build/static checks and browser workflows passed; Android device behavior and BELEM-specific model/UI fidelity remain unverified. Do not report the entire original product as complete.

## Read only what the task needs

| Need | Read |
| --- | --- |
| Product requirements and accepted decisions | [PRODUCT.md](PRODUCT.md) |
| Current behavior and remaining work | [STATUS.md](STATUS.md), [TASKS.md](TASKS.md) |
| Code map, state and extension points | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Watch-log schema, units and editing | [DATA.md](DATA.md) |
| Training physics and limitations | [MODEL.md](MODEL.md), `src/engine/lng.ts` |
| Verified evidence, commits and hashes | [VERIFICATION.md](VERIFICATION.md), [evidence](evidence/) |
| Android build/release process | [ANDROID.md](ANDROID.md) |
| Device test plan | [NATIVE_QA.md](NATIVE_QA.md) |
| Reference locations and missing originals | [REFERENCES.md](REFERENCES.md), [reference manifest](reference-manifest.json) |
| Branch/PR/session workflow | [CONTRIBUTING.md](../CONTRIBUTING.md) |

## Start in a fresh environment

```sh
git clone https://github.com/thaungzan93/belem-lng.git
cd belem-lng
git switch main
git pull --ff-only
npm ci
npm run web
```

Use your tool's normal GitHub connection for this private repository; do not paste tokens into source, remote URLs or chat. Node 22 is the CI baseline. The lockfile is authoritative. Web development needs no Android SDK. For source checks:

```sh
npm run typecheck
npm test
npm run export:web
npx playwright install chromium
npm run verify:browser
```

On Linux without browser dependencies, use `npx playwright install --with-deps chromium`. The harness also accepts `CHROMIUM_PATH`. Native builds need a full JDK 17 including `javac`, SDK 36, NDK and CMake; use [ANDROID.md](ANDROID.md), not commands from a lost earlier chat.

## Where to resume

1. Run the current APK through [NATIVE_QA.md](NATIVE_QA.md) on a representative Android device. Record actual device/API/ABI, APK SHA, steps and logs. Browser success does not answer this task.
2. Review the recovered H1843/FGSS PDFs using [REFERENCES.md](REFERENCES.md), and review the re-uploaded HMI photographs and `06.zip` recorded in REFERENCE_UPLOADS.md. Editable digital HMI exports are still unavailable. Only the GTT training PDF is general background; the nested ship/OEM documents need their own revision and applicability review before use as BELEM settings.
3. Reconstruct one source HMI panel and its equipment/line/tag mapping at a time. Cite document revision and page for each confirmed parameter or behavior. Preserve fit/zoom/pan and native responsiveness.
4. Expand thermodynamics and equipment behavior in separately validated modules. Document input composition, validity range, units and conservation checks. Keep assumed defaults labelled until references establish vessel values.
5. Add electrical/utility coupling and other daily-engineer modules after the LNG core, following the owner's scope.

If a device or the relevant document is unavailable, a bounded independent task is simulator-state backup/restore using a **new schema/storage key**, separate from manual observations. This is proposed work, not an existing feature. Acceptance: round-trip the full state/config/ledger, reject malformed or non-finite values without changing the current plant, keep watch records untouched, and define whether run/pause state survives restoration. Follow TASKS.md before starting so two assistants do not take the same task.

Candidate.1 (0.4.0) predates reference recovery and has historical missing-files text. Version 0.5.0 updates that status and reconstructs line geometry/connectivity; rates, thermodynamics and commissioned protection settings remain training assumptions. See DIAGRAM_SOURCES.md.

## Protect behavior already implemented

- Manual observations and simulator state stay separate. Missing readings remain unknown; zero is a valid observation.
- Editing replaces one complete snapshot, retains the ID and record count, preserves units/tiny values, re-sorts corrected time and supports cancellation. A failed write must preserve the saved record and edit draft.
- The current diagram uses core React Native Views/Text. Reintroducing the old native SVG text path needs actual Android performance evidence.
- ESD/reset is training logic. It does not establish ship cause/effect, commissioned trips or relief protection.
- No live IAS/control connection exists or is requested. Manual input is the accepted current data source.
- Do not upgrade Expo/RN, replace the UI stack or rewrite the storage schema merely to begin a handover task.

## Before your context or token budget ends

Finish one bounded change, run relevant checks, commit it and push the branch. Update STATUS.md/TASKS.md with the exact commit, actual results, remaining failures and the next action. If work cannot be finished, describe precisely what is incomplete and keep it on a review branch; do not leave a half-applied change on main. Do not claim that committing or opening a PR automatically merged, published or tested it.

## Paste into another AI tool

```text
Work on the private repository https://github.com/thaungzan93/belem-lng.
Read AGENTS.md, docs/HANDOVER.md, docs/STATUS.md and docs/TASKS.md first.
This is the 0.5.0 rebuild; historical old-app features are not current code.
Pick one unclaimed bounded task, create a branch, inspect its actual source,
implement and run relevant checks, then update the handover/task status and
push a reviewable commit/PR. Preserve manual-vs-simulator separation and
watch-record edit semantics. Never invent vessel parameters or report device
validation from browser/static checks. Do not commit credentials/signing keys.
End at a concrete checkpoint before your context or token budget runs out.
```
