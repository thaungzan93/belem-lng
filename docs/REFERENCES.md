# Source references and recovery register

The owner authorizes sharing the app's working context and reference files with collaborators in this **private repository**. Large original archives are stored in a private reference release, with a small searchable inventory in Git. Keep account credentials and private signing keys outside both source and reference releases.

## Recovered on 2026-10-25

The owner's [original Drive link](https://drive.google.com/file/d/1zHtmCNCSggOgJXufD8U1UVEU7Txbfp2P/view) was downloadable after Google's large-file confirmation page. Its displayed filename is `GTT Training_Fuel tank operational familiarization.zip`, but it is a **mixed bundle**, not just GTT training.

| Original component | Observed contents | Applicability |
| --- | --- | --- |
| `GTT Training_Fuel tank operational familiarization_B023.pdf` | One PDF | General GTT training, as distinguished by the owner. Never silently treat its examples as BELEM settings. |
| `H1843.zip` | 85 PDF files, one MSG and 25 directory entries | Candidate vessel/OEM/as-built reference set. Filenames include H1843A, H1839A and CMA CGM BELEM; confirm applicability and revision per document. |
| `fgsa.zip` | 14 PDFs and one directory | H1843A FGSS diagrams: fuel gas, ESD, nitrogen, gas detection, purge/safety valve, utilities and bunker arrangement. Document content and installed applicability still need review. |

The outer ZIP has 3 entries and is **312,884,714 bytes**, SHA-256:

```text
50bf9889bb3acde59344c59103f0124a31196b69daac366e7df850a65bcf5578
```

It contains 100 PDF file entries overall; repeated documents can occur across subarchives. This is recovery/inventory evidence, not proof that all documents have been read or used to calibrate the app. Original bytes are preserved. The MSG entry is part of the owner's archive; it has not been executed or treated as a numerical source.

## Download and locate documents

Use the private [reference release](https://github.com/thaungzan93/belem-lng/releases/tag/references-2026-10-25), signed in to an authorized GitHub account. It contains `belem-owner-reference-bundle.zip`, the recursively hashed inventory and a checksum file. The release filename is clearer than the original Drive filename; its bytes/hash are identical to the owner-provided archive.

The tracked [manifest](reference-manifest.json) records source identity, component hashes and remaining gaps; the [recursive inventory](reference-inventory.json) records member names, sizes and hashes. A nested ZIP is a document container, not an instruction to execute files. Inspect/list it before extracting into the ignored local `references/` directory. In a normally authenticated GitHub CLI environment:

```sh
gh release download references-2026-10-25 --repo thaungzan93/belem-lng --dir references
```

Verify the supplied checksum file before extraction. If a managed environment cannot follow GitHub's asset redirect, use the authenticated GitHub download tool or browser; do not make the repo public or disable its proxy/TLS settings. The original Drive URL is also preserved for recovery.

## First documents to inspect for implementation

Use exact paths from the inventory; these are filename identifiers, not a claim that source behavior has been transcribed.

| Task | Documents found by filename |
| --- | --- |
| Reconstruct fuel topology | WGS `1.0P&ID - Binder ... 1749062 ... 04`; `F_FGSS-03 ... 9081102F-FUEL GAS SYSTEM` |
| Source operating routes | WGS `2.1Flow Diagrams - Main Operations ... 1749955 ... 00`; `2.1Process Flow Diagram ... 1757880 ... 01` |
| Equipment/valve/tag register | WGS Valve List `1750117`; Actuator List `1749867`; Instrument List `1748371`; Equipment and Weight List `1749947` |
| Protective logic | WGS Cause and Effect Matrix `1749878 ... 07`; FMEA `1749956`; `F_FGSS-02 ... ESD SYSTEM DIAGRAM`; gas-detection/safety-valve diagrams |
| Equipment characteristics | BOG compressor instruction manual/datasheet; fuel-pump IOM; vaporizing/buffer skid and nitrogen documentation |
| Electrical/utility coupling later | Electrical Load List `1749946`; Single Line Diagram `1750082`; utility diagrams in `fgsa.zip` |
| Tank/dome structure | AUXANA/AUXDWG pump tower, combined dome, PTBS and crossing-piece PDFs |

Some manuals explicitly carry H1839A identifiers even though they are stored under H1843. Resolve this before treating any curve or limit as BELEM-specific. Structural analyses do not themselves establish FGSS operating sequences or trip settings.

The five separately named structural PDFs from the original chat were found inside `H1843.zip`: pump-tower stress analysis, combined-dome penetrations, PTBS analyses, dome crossing pieces and pump-tower tubular structure. They are no longer missing reference files. The manifest identifies their recovered paths.

## Still unavailable

- The separately uploaded `06.zip`: its contents/relationship to the recovered bundle are unverified.
- Original local files for six ship-HMI photographs (suffixes 1036, 1023, 988, 961, 962 and 1589). Conversation previews are not original HMI exports.
- Original digital HMI project/screens/fonts and commissioned installed-setting records, where not established by reviewed source pages.
- The earlier 0.3.x editable app source and private signing key. The signing key must be recovered/stored privately, never uploaded with references.

## How to turn a source into code

For every adopted tag, connection, capacity, curve, threshold or sequence, record: archive/member SHA, document number/title, revision, page/diagram sheet, unit, vessel/equipment applicability, extracted value/rule, and whether installed commissioning data confirms it. Preserve conflicting revisions instead of silently choosing one. Add an executable behavior/conservation check appropriate to that rule. General theory and filename hints do not establish a commissioned BELEM value.

No model settings, control logic or HMI geometry were changed as part of this handover/recovery task. The candidate APK predates recovery; its model/source-status text describes that earlier checkpoint.
