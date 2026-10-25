# Original reference uploads recovered on 2026-10-25

The owner explicitly authorized storing these original files in the **private Git repository** so collaborators can use the same references. Keep them private. The six JPEGs and `06.zip` are unchanged copies of the supplied upload bytes; only the transport's leading ordinal (`1-`, `2-`, etc.) was removed from each filename. No image was cropped, optimized, redrawn or replaced, and no derived images were created.

The earlier mixed Drive bundle remains in the private reference release described in [REFERENCES.md](REFERENCES.md). These separately supplied files are additional sources, not replacements for that bundle. [reference-manifest.json](reference-manifest.json) records the ZIP's member identities, sizes, SHA-256 hashes, PDF page counts and content classification. [hmi-photo-manifest.json](hmi-photo-manifest.json) records each photo's identity, upload provenance and limits.

## HMI photographs

These are photographs of physical monitor screens supplied by the owner as ship references. The stable source IDs below are suitable for a page/panel map. Their original filenames share the prefix `217e4ef1-ce79-4720-89fe-b02b1cd0d3e8-1_all_`; the source ID's number is the preserved filename suffix.

| Source / original file | Visible subject | Pixels | Bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| [HMI-961](hmi-photos/217e4ef1-ce79-4720-89fe-b02b1cd0d3e8-1_all_961.jpg) | FGSS system view with FGSS Plant Control popup | 1280×960 | 106,272 | `26a8411ae8ea35fe783afafbce80d7df4530eeb19b61a7b11d71c8e246574995` |
| [HMI-962](hmi-photos/217e4ef1-ce79-4720-89fe-b02b1cd0d3e8-1_all_962.jpg) | Main-engine iGPR Overview | 1280×960 | 106,287 | `dd3d5f153050b42bda3142cb9e9a4d1001dfdb2df2bc0b1e14294840e431f5f8` |
| [HMI-988](hmi-photos/217e4ef1-ce79-4720-89fe-b02b1cd0d3e8-1_all_988.jpg) | Split monitor with Fuel Tank and Bunker Station views | 1280×960 | 130,404 | `a04c7ffee87a2315eb8d62eaabf868fb516d847f0b4eee78ab06b1201162326a` |
| [HMI-1023](hmi-photos/217e4ef1-ce79-4720-89fe-b02b1cd0d3e8-1_all_1023.jpg) | Bunker Station — port and starboard liquid/vapour routes | 1280×960 | 136,871 | `fac9ca4f7996ae6e91195817ed1beb694f37d655ddf31e3d46802531606655c4` |
| [HMI-1036](hmi-photos/217e4ef1-ce79-4720-89fe-b02b1cd0d3e8-1_all_1036.jpg) | Power Management Overview | 1280×960 | 124,277 | `e66bc8e60404b931ec3e6a8fabf9754fbe895cd8660014a7a84ab31ab2d9e883` |
| [HMI-1589](hmi-photos/217e4ef1-ce79-4720-89fe-b02b1cd0d3e8-1_all_1589.jpg) | FGSS Plant Control popup over Cold Glycol and Compressor System | 960×1280 | 110,355 | `2147e7e0416936032c752fdebf2ce4cade85e53bec8f389cfdac0cdd983758ed` |

The images show perspective, moire, glare, monitor borders and portions of adjacent displays. They establish visible layout/labels only to the resolution and angle shown. A photographed value or highlighted state is one instant: it does not establish a commissioned limit, complete process route, control sequence, alarm logic or equipment curve. These files are **not** digital HMI screenshots/exports, editable HMI projects or fonts. Any later rectification, crop or annotation must be a separately named derived file with its original source ID; retain these originals.

## `06.zip`: Shanghai LNG bunkering records

Stable source ID: **BUNKERING-06**. Original filename: [`06.zip`](../reference-material/bunkering/06.zip). Size: **7,914,347 bytes**. SHA-256:

```text
f9f3fa4aacf801f48a51cd73eb0fa2e9864cb45b9e61af51942505f51140552c
```

The ZIP CRC integrity test passed. It contains one directory, `06. LNG Bunker Shanghai 09-Jan-2026/`, and eight files: **four PDFs (24 pages total), two MSG files, one XLSX workbook and one DOCX plan**. The following inventory describes the contents; it does not convert the records into approved simulator inputs.

| Original member filename | Type | PDF pages | Bytes | Inspected content |
| --- | --- | --- | --- | --- |
| `31未来质量.pdf` | PDF | 2 | 2,189,323 | Issued 31-Dec-2025 for M/T HAI GANG WEI LAI; loading/sampling at Yang Shan LNG Terminal, Shanghai on 30-Dec-2025. Includes a composition and total-sulfur analysis. |
| `COQ.msg` | MSG | — | 2,557,952 | Original Outlook MSG file named COQ.msg. |
| `DOS.msg` | MSG | — | 997,376 | Original Outlook MSG file named DOS.msg. |
| `LNG Tank CD  Shanghai 07-Jan-2026.xlsx` | XLSX | — | 222,899 | BELEM tank cooldown/first-bunkering workbook with sheets CC Belem CD, CD curve CC BELEM, CC Belem 1st Bunkering (original name has a trailing space), and Reference tables. |
| `MSDS Malaysia Liquefied Natural Gas -.pdf` | PDF | 14 | 318,666 | Fourteen-page PETRONAS/Malaysia LNG safety data sheet. |
| `SSES-JPO-CMA 13Kanchorage-rev 0 - 20260106.docx` | DOCX | — | 1,818,230 | Joint cooldown/LNG-bunkering plan between CMA CGM 13K TEU series receiving vessels and HAI GANG WEI LAI at Lv Hua Shan South Anchorage. |
| `WSHB26003.pdf` | PDF | 4 | 345,927 | Four-page scanned/signed set: Bunker Delivery Note / Bunker Declaration for delivery from HAI GANG WEI LAI to CMA CGM BELEM at LVHUASHAN anchorage on 9-Jan-2026; opening/closing measurements dated 9–10-Jan-2026. Followed by certificates of measurements before unloading, after unloading and quantity unloaded for HAI GANG WEI LAI. |
| `WSHCD26003.pdf` | PDF | 4 | 362,865 | Four-page scanned/signed set: Bunker Delivery Note / Bunker Declaration for delivery from HAI GANG WEI LAI to CMA CGM BELEM at LVHUASHAN anchorage on 9-Jan-2026. Followed by certificates of measurements before unloading, after unloading and quantity unloaded for HAI GANG WEI LAI. |

The quality certificate is for HAI GANG WEI LAI's LNG loaded on 30-Dec-2025, and the MSDS is general supplier safety material. The JPO concerns the CMA CGM 13K series; its filename's `rev 0` and date require approval/applicability review. The workbook contains BELEM cooldown/bunkering records and reference tables, but formulas, charts and data completeness have not been validated. The two signed/scanned PDF sets record a particular bunkering event; their before/after-unloading tank measurements concern the delivering bunker vessel HAI GANG WEI LAI, not BELEM tank geometry or control settings. None is an editable HMI project or digital HMI export.

Inspection used ZIP listing/CRC checks, PDF text and page inspection, and static Office ZIP/XML inspection. The MSG files were inventoried as original bytes without executing messages or trusting their bodies/attachments as numerical sources. No Office formulas, macros or document active content were executed. Member hashes are in [reference-manifest.json](reference-manifest.json).

## Remaining recovery and adoption limits

The six original photo files and `06.zip` are now recovered. The original digital HMI project/screens/fonts, missing commissioned installed-setting records, prior 0.3.x application source and original private signing key remain unavailable. Keep a recovered signing key outside Git and reference releases.

Archiving these sources does not calibrate the model or establish source fidelity. Before adopting a tag, connection, value, formula or sequence, record its exact source ID/container/member hash, document revision, page or worksheet/cell, unit and vessel/equipment applicability. Resolve contradictions with the reviewed H1843/FGSS documents and installed evidence instead of silently choosing one source.
