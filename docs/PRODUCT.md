# Product scope and decisions

These requirements are distilled from the owner's instructions. They describe the intended product; STATUS.md says what is implemented.

| Area | Accepted requirement or decision |
| --- | --- |
| Vessel and audience | CMA CGM BELEM; gas engineer's daily LNG work first. |
| Platform | Android first; shared web option. iOS is not validated. |
| Inputs | Manually entered observations; simulator alongside them. No live ship connection requested. |
| GUI | Eventually reproduce the ship's source HMI layout, symbols, colors, lines, navigation and plant-control popups. Scale across phone/tablet with fit, zoom and pan. Current diagram is source-inspired. |
| Physics | Begin with the LNG/fuel-system engine; equipment and routes share model state. Expand against actual reference PDFs and measured data. |
| Records | Open a saved watch record, Edit, Save or Cancel. Preserve IDs, missing-vs-zero values, custom units and corrected-time sorting. |
| Persistence/export | Offline local observations, CSV/JSON backups and an installable standalone APK. Source and project exports must remain portable. |
| Collaboration | Private GitHub, shared instructions and handovers, bounded tasks/branches and finished checkpoints usable by multiple AI tools. |
| Later scope | Other daily-engineer systems, electrical/utility coupling and more detailed model/HMI coverage after the LNG core. |

## Decisions already reflected in source

The current React Native/Expo/TypeScript project shares its UI and model with web. Core View/Text drawing was chosen for the rebuild after the earlier SVG text ANR report. Watch data uses a validated version-1 JSON schema and AsyncStorage; simulator state is volatile. Saving occurs before the app swaps its in-memory record collection. There is no sync server, user-account service, payment/financial transaction feature or approved vessel control interface.

The rebuild's package ID is `com.belem.lng.rebuild`; the old package was reported as `com.belem.lng`. The old signing key is unavailable, so candidates install separately and do not automatically migrate the old app's data. Current signing is a development identity; production signing and compatible-update policy remain future work.

GTT PDFs/training material are **general references**. Ship documents require separate applicability checks. Numerical model defaults are training assumptions, never inferred commissioned settings. Pressure units must distinguish absolute pressure from bar(g)/mbar(g); temperatures, flow units and mass/volume conversions must be explicit.

## Definition of a completed change

Implemented behavior exists in committed code, relevant checks were actually run, and the handover names any unresolved gaps. Source tests, web/browser checks, static APK checks, emulator runs, physical-device results and vessel calibration are different evidence levels. A generated APK alone is not proof of working Android flows, and a reference filename alone is not proof of an inspected source document.
