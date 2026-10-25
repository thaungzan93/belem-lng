# Historical context and recovery

This is a record of prior conversation reports. It is not verification of the current repository.

## Before the rebuild

The earlier application was reported as version 0.3.1, versionCode 4, package `com.belem.lng`. Reports described 14 HMI screens, 37 operating cases, more detailed tank/conditioning/protection logic, utilities/electrical coupling, an instrument register, 124 automated tests and 28 browser checks. That source, its raw reports, original reference archives and private signing key were not recovered after the execution workspace was replaced. Those features/counts must not be copied into a current completion report.

The old Android candidate reportedly timed out on an Android 15/API 35 x86-64 tablet emulator using software emulation. Boot/System UI also had problems. The app's reported 5,014 ms input-dispatch ANR located its main thread in:

```text
android.graphics.Paint.getTextWidths
com.horcrux.svg.TSpanView.getLinePath / getPath
com.horcrux.svg.SvgView.drawChildren / drawOutput / onDraw
```

The JavaScript thread was reportedly idle. Native watch-record editing tests were not reached. These trace excerpts identify a reported blocking location, not a proven emulator-only cause or current app diagnosis. The rebuild uses core React Native Views/Text, but that design change is not native runtime validation.

## Recovery identifiers

| Historical item | Reported identifier; availability not established |
| --- | --- |
| Old all-in-one archive | `belem-lng-v0.3.1-candidate-everything.zip`, 72,997,745 bytes |
| Archive SHA-256 | `dc835171e1c930c35b06232ce0e5c64f775cd87b9ce72e537cd9a4e6a3fc5937` |
| Old contained APK SHA-256 | `4484bbba08f132401cddae523b46234d16fd17281d65467f86e7a928e882018c` |

If recovered, inventory the archive and separate source/reference material from its reported private signing backup before uploading anything. Keep that private key outside GitHub. An APK is not the editable source. Preserve both implementations while reviewing a recovered tree; do not overwrite the rebuild or its records blindly.

## Current history

Version 0.4.0 is a new implementation. Commit `57cbc90` introduced the executable rebuild; `db31cd0` is the successfully CI-built APK source. `5d1e353` added the tested private-release packaging/upload workflow and is the source snapshot packaged in candidate.1. Later handover-only commits do not add the old operating cases or establish ship calibration. See VERIFICATION.md for actual current evidence.

On 2026-10-25 the owner's Drive reference bundle was recovered. Its outer GTT training PDF and nested H1843/FGSS archives include 100 PDF file entries overall, including the five structural PDFs named earlier. The earlier missing-reference statements describe the pre-recovery checkpoint. The old executable app source/key and original HMI files were not recovered by this download; see REFERENCES.md for the current register.
