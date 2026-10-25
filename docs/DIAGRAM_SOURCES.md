# Fuel-diagram reconstruction — version 0.5.0

The previous seven-box mimic has been replaced with three scalable native View/Text panels: Fuel overview, Bunker stations and ME IGPR. Equipment and source-valve symbols open inspectors with their source citation, operating-model scope and applicable training control. The app does not display the photographs as a background or copy their frozen readings into telemetry.

## Sources reviewed

| Source | Pages / role |
| --- | --- |
| WGS P&ID binder, document 1749062 rev.04, As Built 28-Sep-2023, H1839A–H1844A | PDF p.10 tank/four pump discharge branches; p.11 common BOG suction/K.O. drum and parallel compressors; p.12 parallel LNG vaporizer and NG heater trains; p.13 ME/AE buffers, reducing train, engine outlets and separate boiler/free-flow connection; p.16 station arms; p.18 applicability notes. |
| Equipment and Weight List, document 1749947 rev.00 | PDF p.3 confirms four 45PS1001–1004 fuel pumps, two 23KB5501/5502 BOG skids, two 45HA6001/6002 vaporizers, two 45HA6501/6502 NG heaters and 45VA6501/6502 ME/AE buffers. |
| Main Operations flow diagrams, document 1749955 rev.00 | PDF p.20 forced vapour return; p.22 vapour return; p.30 combined fuel supply; p.31 BOG supply; p.32 fuel-pump/vaporizer supply. These documents contain 37 source cases; this change does not implement all of those sequences. |
| HMI-988 / HMI-961 / HMI-1589 | Fuel-tank/process arrangement and FGSS plant-control visual references. |
| HMI-1023 | Port/starboard station layout, orange liquid/yellow vapour conventions, station arm tags and vacuum-pipe panel appearance. |
| HMI-962 | ME/iGPR connection view and display structure. Vendor-internal feedback remains unknown. |

Original PDF member paths/hashes are in [reference-inventory.json](reference-inventory.json); the equipment register is `src/components/diagram/equipment.ts`. Photo identity/hash links are in [REFERENCE_UPLOADS.md](REFERENCE_UPLOADS.md). The separately uploaded `06.zip` contains bunkering records, not HMI drawings. Its delivering-barge measurements are not BELEM tank configuration.

## Topology corrected

- Four independent pump branches enter one liquid header; both the 45HV1011–1014 isolation valves and 45FV1001–1004 flow/shutoff gates affect their respective training branches.
- Two BOG branches leave the common knock-out drum and join the hot-gas delivery path. The pump/vaporizer path and compressor path feed the same training gas inventory.
- The two LNG-vaporizer trains are parallel. Each is followed graphically by its NG heater; individual heater energy/control is not modeled.
- ME and AE buffer vessels are distinct source components. AE supply is shown from the ME-buffer supply through its reducing train. The boiler/free-flow connection is a separate off-page path, not an invented third independent modeled buffer.
- Port and starboard stations each have two liquid arms and a vapour arm. The source arm valves remain unmodeled/unknown; station training transfer is controlled through explicitly named route abstractions in Plant controls.
- Symbol port connectors meet their pipe coordinates. Connected-flow highlighting comes from calculated branch transfer, not just a start request.

The model's `liquidHeader`, `bogHeader`, station route and bunker-shutoff controls are training connectivity abstractions. They are not newly invented source valve tags. Inspectors distinguish these from source-tagged equipment.

## Functional model boundary

`src/engine/fuelCircuit.ts` wraps the unchanged pure-methane inventory engine. It retains independent start/open requests, calculates route readiness from branch gates and masks aggregate equipment before advancing the inventory. Actual aggregate pump/compressor capacity is shared equally among connected branches, not multiplied by the number of motors started. Branch allocations sum to the aggregate transfer; vaporizer allocation repeats the same stream downstream rather than creating additional fuel mass.

Both buffers still share the one aggregate training inventory. Independent ME/AE pressures are not calculated; a shared model pressure is labelled separately, and a manually entered ME pressure is displayed only in observation mode. Bunker vapour-return mass/energy, glycol utilities, individual NG heaters, boiler demand and vendor IGPR internal control remain reference-only. Missing readings and states are shown as unknown, never copied from photos or another watch entry.

ESD clears all training requests/gates; reset leaves them stopped. This is not a commissioned cause-and-effect implementation. Aggregate ON presets explicitly open a representative route; direct individual commands do not silently open another component. Closing a pump route stops its transfer, while delivery may continue from existing buffer gas.

## Applicability and fidelity limits

Binder p.18 note 2 identifies fuel-pump/vaporizer flowmeter 45FT/FI6010 as **H1839A only**. Binder p.11/p.12 notes similarly identify gas analyzer 70AT0090/tubing as H1839A-only with blind flanges on subsequent hulls. These are not fabricated as BELEM live instruments. Model allocation boxes intentionally have no invented instrument tag.

This is a geometry/style reconstruction from photographs and reviewed drawing topology, not a pixel-identical vendor HMI export. Perspective, glare and missing digital exports limit exact fonts/positions. The power-management photo is retained as a later-system reference; no electrical power-management model is added by this change. Source settings, curves, protections and thermodynamic calibration remain separate review tasks.

## Verification

The new circuit tests cover aggregate-model parity, alternate pump/vaporizer routes, both pump gate types, compressor isolation, common headers, port/starboard gates, actual zero flow despite requests, shared ME/AE demand, conservation, ESD/reset and immutable rejected commands. Browser checks exercise source tags/panes, an isolated pump and alternate branch, manual unknowns, fit/zoom/pan, phone inspectors and the existing watch-log workflows. Record actual current results in STATUS.md; native build/static checks and Android device testing remain separate evidence levels.
