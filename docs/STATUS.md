# Current checkpoint

**Debugging checkpoint, 2026-10-27 (branch `debug/diagnostics`, not released):** offline debugging infrastructure, implemented and checked locally only. `src/debug/debug.ts` adds a failure-safe persisted ring buffer (AsyncStorage key `belem-lng.debug.v1`, newest first, capped at 200 entries, messages capped at 500 characters) with a `getSnapshot()` diagnostics snapshot (app version, platform, record count, last debug save, last error, debug/watch storage error state, simulator config) and a JSON `formatDiagnostics()` document. `src/debug/storage.ts` is the AsyncStorage adapter, kept separate so the core stays importable in plain Node tests. `src/components/ErrorBoundary.tsx` wraps the app: a render crash now records to the debug log and shows a recovery screen (Try again, Copy on web, Export via the existing share-sheet helper) instead of a blank screen. `src/components/DiagnosticsPanel.tsx` adds a Diagnostics section to the settings screen with snapshot, latest 50 entries, and Refresh/Copy/Export/Clear actions. `App.tsx` wires app-start and watch-storage open/save failures into the log. `tests/debug.test.ts` adds 11 tests: **48** tests pass, strict TypeScript passes, and web export passes. No new dependencies; no changes to simulation math, vessel data, or training assumptions. NOT verified: Android device runtime (no device available), browser workflow (`verify:browser`) not re-run for this change, and no global unhandled-error handler was added — only render crashes via the boundary plus explicit storage paths are captured.

**Handover, 2026-10-26:** outgoing implementation work is closed. Continue from [TAKEOVER.md](TAKEOVER.md); [CHAT_CONTEXT.md](CHAT_CONTEXT.md) preserves the visible owner decisions. This transfer changes documentation only; the 0.5.1 APK remains unchanged. Android runtime QA and the remaining model tasks are still open.

Current source is **0.5.1 / Android code 3**. The stage recheck fixed a watch-write/navigation data-loss race, small-screen diagram collapse and inherited-name setting validation. Locked install, TypeScript, all **37** tests, web export and **15** browser groups passed locally. The browser set now covers six desktop/phone/landscape/tablet sizes, delayed write failure/retry, settings/timer behavior and unreadable-storage recovery. Source CI [40210786228](https://github.com/thaungzan93/belem-lng/actions/runs/40210786228) and Android build/static CI [40210787472](https://github.com/thaungzan93/belem-lng/actions/runs/40210787472) passed at `b28b8a47b097b21f49f2bf1d557c7295e0c3a771`. New APK SHA-256: `0a1d238d2cf42b9e280301b9dce5149230bc6d0ac93321551c6163e2f51c2e59`, 57,757,788 bytes. Download identity/CRC, signature and 16 KB ZIP alignment were independently rechecked. Use the [0.5.1 private release](https://github.com/thaungzan93/belem-lng/releases/tag/v0.5.1-candidate.1); the 0.5.0 APK below predates these fixes. Native interactions remain NOT RUN: no connected device/virtualization; the bounded software-emulator boot timed out. See [the recheck record](RECHECK-2026-10-25.md).

## Retained 0.5.0 diagram checkpoint

Version **0.5.0**, Android code **2**, package `com.belem.lng.rebuild`. This continues the new implementation introduced at 0.4.0; it is not recovered 0.3.x source.

## Retained 0.5.0 diagram fix

- Three native source-style panels: Fuel overview, Bunker stations and ME IGPR, with fit/zoom/pan and equipment inspectors.
- Four independent pump branches, two BOG compressor branches and two vaporizer branches, with source-tagged isolation/shutoff gates. Closing a branch blocks its calculated transfer; other connected branches can supply the same inventory.
- Port/starboard training transfer routes, shared ME/AE delivery allocation, latched ESD/reset and explicit aggregate-route presets.
- Source valve/equipment identity and modeling limits in each inspector. Station arms, NG heaters, glycol utilities and IGPR internal feedback remain reference-only rather than displaying fabricated telemetry.
- Manual observations remain separate/read-only; unknown readings and equipment states stay unknown. Watch-record schema, editing and backup semantics are unchanged.

See [DIAGRAM_SOURCES.md](DIAGRAM_SOURCES.md) for exact reviewed PDF pages, the reconstruction boundary and H1839A-only instrument exclusions. Independent buffer pressure/energy balances, real equipment curves, complete operating cases and commissioned protection settings are not implemented.

## Retained 0.5.0 local verification

- Locked dependency installation and strict TypeScript: passed.
- **37** engine/circuit/logbook tests: passed, no failures/skips.
- Static web export: passed.
- **11** Chromium workflow groups: passed, no page errors, desktop 1500×1000 and phone 412×915.
- Browser coverage includes source panels/tags, pump isolation and alternate flow, ESD/reset, manual unknowns, fit/zoom/pan, phone inspector accessibility and prior watch-edit/storage/export/restore flows.

New browser evidence/screenshots are under `docs/evidence/v0.5.0/`. Source/static/browser evidence does not establish Android runtime performance. [Source CI](https://github.com/thaungzan93/belem-lng/actions/runs/40184406782) and [Android build/static verification](https://github.com/thaungzan93/belem-lng/actions/runs/40184414299) passed for app commit `80061aacdd4312a23b635ea986febcee3309b4c9`. The downloaded APK archive/hash, signature and 16 KB ZIP alignment were independently rechecked. APK: 57,757,208 bytes, SHA-256 `5b31441d02a255c5ecba1daa739ceca01528901f997d3682ae8a75b50bccec90`; tracked CI source was clean. The development certificate matches the preceding rebuild candidate. Use the private [0.5.0 release](https://github.com/thaungzan93/belem-lng/releases/tag/v0.5.0-candidate.1) for the APK or all-in-one ZIP. Do not substitute the older 0.4 APK as the diagram fix.

## References and retained history

All six original HMI JPEGs and `06.zip` have been re-uploaded and preserved with hashes in the private repository. See [REFERENCE_UPLOADS.md](REFERENCE_UPLOADS.md). `06.zip` contains Shanghai bunkering records, not HMI source; delivering-barge measurements and unvalidated workbook formulas were not adopted as BELEM settings.

The recovered Drive archive with 100 PDF file entries remains in the private reference release. Its inventory/applicability register is in [REFERENCES.md](REFERENCES.md). Editable HMI exports/fonts, the old app source and original private signing key remain unavailable.

The old candidate.1 APK/source snapshot and 27-test/9-browser evidence are preserved separately in [VERIFICATION.md](VERIFICATION.md). They validate the earlier 0.4 release, not version 0.5. The new package identity is unchanged from the rebuild; current candidates use the same development signing scheme.

## Next checkpoint

The diagram source, references and evidence are pushed to GitHub; candidate publication uses the repository workflow. Execute [NATIVE_QA.md](NATIVE_QA.md) on representative Android hardware, including new route isolation and diagram gestures. Continue source review/calibration one operating case at a time. Do not call the app source-exact or runtime-verified from these checks alone.
