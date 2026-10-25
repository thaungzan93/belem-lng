# Manual observation data contract

The authoritative implementation is `src/storage/logbook.ts`; UI behavior is in `src/components/WatchLog.tsx` and `App.tsx`. This document describes version one as implemented. Manual observations are independent from simulator inventories/settings and are stored locally under AsyncStorage key `belem-lng.logbook.v1`.

## Backup schema

The smallest useful backup contains one finite reading. This example is accepted by `decodeLogbook`; its zero is a known value:

```json
{
  "version": 1,
  "entries": [
    {
      "id": "example-observation-1",
      "timestamp": "2026-10-24T12:00:00Z",
      "notes": "",
      "readings": {"gasFlowKgh": 0},
      "source": "manual"
    }
  ]
}
```

`{"version":1,"entries":[]}` is also valid. Each entry requires a nonblank string ID of at most 256 characters, a valid UTC timestamp, string notes of at most 4000 characters, a readings object with at least one reading, and exactly `source:"manual"`. New IDs combine observation timestamp, current time, a process counter and a random component; they are identity strings, not a timestamp to parse.

Timestamps must use `YYYY-MM-DDTHH:mm:ssZ` or exactly three fractional digits (`.sssZ`), with a real calendar date. Offsets, local-time strings, invalid days and other fractional precision are rejected. Entries sort newest observation time first after decode/add/update; equal timestamps are allowed with distinct IDs and retain stable input order. IDs must be unique within a book, including an incoming backup.

Book and entry objects may contain extra properties, but validation constructs clean output without them. Unknown properties inside `readings` are rejected. Only version 1 is supported; no upgrade/migration path exists. `decodeLogbook` parses JSON and validates the whole book before returning any entries.

## Reading keys, units and entry checks

Common readings are optional numeric properties. Omit unknown values; `null`, strings and nonfinite numbers are invalid. Do not substitute zero. Bounds below are inclusive manual-entry sanity checks, independent of simulator capacity and ship operating/trip limits.

| Key | Unit | Min | Max |
| --- | --- | ---: | ---: |
| `tankVolumeM3` | m³ | 0 | 100000 |
| `tankPressureMbarg` | mbar(g) | −100 | 5000 |
| `liquidTemperatureC` | °C | −200 | 60 |
| `densityKgM3` | kg/m³ | 300 | 600 |
| `bunkerFlowM3h` | m³/h | 0 | 10000 |
| `bunkerPressureBarg` | bar(g) | −1 | 30 |
| `bunkerTemperatureC` | °C | −200 | 80 |
| `gasFlowKgh` | kg/h | 0 | 50000 |
| `bufferPressureBarg` | bar(g) | −1 | 50 |
| `gasTemperatureC` | °C | −200 | 150 |
| `enginePowerKw` | kW | 0 | 100000 |
| `bottomC`, `temp30C`, `temp60C`, `temp85C`, `topC` | °C | −200 | 80 |
| `ibsPressureMbarg`, `isPressureMbarg` | mbar(g) | −100 | 1000 |
| `coldGlycolSupplyC`, `coldGlycolReturnC` | °C | −100 | 100 |
| `hotGlycolSupplyC`, `hotGlycolReturnC` | °C | −50 | 200 |
| `nitrogenPressureBarg` | bar(g) | −1 | 50 |
| `nitrogenPurityPercent` | % | 0 | 100 |
| `gasDetectorPercentLel` | % LEL | 0 | 100 |
| `ventPressureMbarg` | mbar(g) | −100 | 5000 |

These rows cover all 26 keys. `readingFields` additionally supplies their UI labels; gas-detector sensor identity belongs in notes. No automatic density calculation, unit conversion or source-instrument lookup is performed for saved readings.

`parseReadings` consumes string drafts, trims whitespace and omits blank fields. It accepts signed decimal syntax, including `.5` and `1.`, but rejects exponent syntax, unit suffixes and nonfinite/out-of-range input. `allowEmpty:true` permits an intermediate empty common-field result; final entry validation still requires a common or instrument value. JSON backups contain numbers, so valid numeric JSON exponent notation can decode. Storage uses JavaScript `number` precision, not arbitrary-precision decimals.

`formatReadingDraft` expands the number's shortest representation into decimal syntax without fixed-place rounding. It is used for edits/details/CSV so tiny stored values do not become zero or an exponent string rejected by the draft parser. Diagram readouts use presentation rounding; they are not the stored precision.

## Custom instrument values and units

`readings.instrumentValues` optionally maps normalized tag strings to finite numbers within ±1000000000000. A record may contain only instrument values. For example:

```json
{
  "instrumentValues": {"CUSTOM.FLOW": 0.0000001, "CUSTOM.TEMP": -160},
  "instrumentUnits": {"CUSTOM.FLOW": "L/min"}
}
```

`normalizeInstrumentTag` trims outer whitespace, removes all whitespace/underscores/hyphens, then uppercases. The normalized tag must be 3–32 characters, start with A–Z/0–9, and contain only A–Z/0–9/dots. `PROTO`, `PROTOTYPE` and `CONSTRUCTOR` are rejected. Two keys normalizing to one tag are rejected. Draft instrument values use the same decimal syntax as common fields; blank values are omitted.

Optional `instrumentUnits` maps tags to strings of at most 24 characters, with no CR/LF, `<` or `>`. Every unit key must have a corresponding instrument value. Missing units remain unspecified; units are never inferred, normalized or converted. Empty unit strings are valid. On UI save, clearing an instrument reading removes its value and associated unit from the snapshot. The custom tag example is illustrative, not a verified ship tag.

## Add, edit and persistence semantics

- `createLogEntry` validates and copies readings/notes into a manual entry. `addEntry` validates both book and entry, rejects duplicate identity and returns a sorted new book without mutating inputs.
- `updateEntry(book,id,readings,notes,timestamp)` requires an existing ID. It preserves ID/source and count, replaces the entire readings/notes/time snapshot and sorts again. Omitted or cleared fields stay unknown; no values carry forward from the previous version or another entry.
- The edit UI initializes only saved values, expands tiny decimals and copies custom units. Cancel discards the edit draft; closing does not save. A notes-only correction retains the existing numeric precision and absent/custom units.
- New-save and edit drafts clear/exit only after `onSave` succeeds. Validation or write failures show an error and retain the draft for correction/retry. Buttons/inputs are disabled during the operation. There is no separate historical revision record or delete operation.
- Startup reads and decodes the stored JSON before enabling saves. A read/decode failure keeps storage unready, does not overwrite the raw data and exposes Retry. If a raw payload was read, “Export unread backup” can deliver it unchanged for recovery.
- `App.saveBook` refuses writes while unready, validates via encode/decode, awaits `AsyncStorage.setItem`, then commits the clean book to React state. Failed writes do not replace the displayed saved book. Storage is one whole JSON document per write, with no transaction journal, encryption layer, quota handling policy or multi-writer locking.

Records belong to the browser/app storage context; clearing that storage or uninstalling can lose them. Export backups before destructive device/browser operations. There is no cloud copy, automatic scheduled backup or simulator-state backup.

## Import, export and delivery

“Merge backup” accepts pasted JSON only. It decodes the complete incoming book, then merges by ID: incoming entries replace existing entries with the same ID in full; unrelated saved entries remain. Duplicate IDs *inside* the incoming backup are rejected. Distinct IDs sharing a timestamp remain separate. The merged book is sorted and persisted through the same async save boundary. On failure the current book and pasted JSON remain; on success the paste clears. This is replacement by identity, without conflict detection or per-field merging.

JSON backup exports the current version-one book with indentation and exact stored number values subject to JavaScript number/JSON semantics. CSV is an export format only; there is no CSV import. CSV includes UTC/source, all 26 common columns in `readingFields` order, alphabetically sorted instrument tags as value/unit column pairs, then notes. It omits IDs. Unknown readings are empty cells; known zero is `0`. All cells are quoted, quotes are doubled, rows use CRLF, and notes may contain newlines. Notes/units beginning with optional whitespace then `=`, `+`, `@` or `-` gain a leading apostrophe to reduce spreadsheet formula interpretation; numeric signs remain unchanged.

`deliverFile` sanitizes filenames and creates a real browser Blob download. Native delivery writes UTF-8 files under the cache `watch-exports/` directory and invokes the system share sheet; unavailable sharing/cache or write errors are surfaced. A prepared export does not prove the user saved a durable external copy. Cache files are not an archival store. Browser integration checks cover downloads; native sharing requires a device check recorded in [STATUS.md](STATUS.md).

See `tests/logbook.test.ts` for executable examples of UTC validation, duplicate rejection, snapshot replacement, tiny decimals, custom units and CSV escaping. Keep this contract synchronized with the decoder before changing persistence or adding external writers.

## In-flight writes

Version 0.5.1 locks watch mutations and screen/mode navigation at App level until storage acknowledges the write. This prevents reopening a fresh editor with a stale snapshot while another save is pending. Failure unlocks the UI while preserving saved data and the editor draft. It does not change the v1 schema.
