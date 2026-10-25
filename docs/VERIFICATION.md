# Verification record — retained 0.4 release

Version 0.5 diagram-change results are recorded in [STATUS.md](STATUS.md) and `docs/evidence/v0.5.0/`. The hashes/counts below intentionally remain pinned to the earlier 0.4 candidate.

Evidence snapshot: 2026-10-25, version 0.4.0. These results belong to the commits and files below; they do not automatically validate later edits. **Android runtime testing has NOT RUN.** Start device work with [NATIVE_QA.md](NATIVE_QA.md).

## Pinned evidence

| Area | Source / run | Observed result | Limit |
| --- | --- | --- | --- |
| Built application source | `db31cd070b2a1457802f0b7d6a6caff7c80f60ae` | Release tag `v0.4.0-candidate.1` identifies this commit. | Later handover documentation is a separate snapshot. |
| Source and browser CI | [40101777969](https://github.com/thaungzan93/belem-lng/actions/runs/40101777969), `db31cd0` | TypeScript, 27 engine/logbook tests, web export and 9 Chromium workflow groups passed. | Desktop 1500×1000 and phone viewport 412×915; browser evidence does not test Android. |
| Native build and static checks | [40101785824](https://github.com/thaungzan93/belem-lng/actions/runs/40101785824), `db31cd0` | Four-ABI release APK built; report records a clean tracked tree. | No install, launch or interaction test occurred. |
| Main checkpoint CI | [40153241088](https://github.com/thaungzan93/belem-lng/actions/runs/40153241088), `5d1e353e704699c66ba66f63debb406107ab8be5` | Source/web/browser workflow passed. | Application files/dependencies remained identical to the native build; this did not rebuild the APK. |
| Private publication | [40153265983](https://github.com/thaungzan93/belem-lng/actions/runs/40153265983), `5d1e353` | Packaged source/history/web/APK/evidence and published the private prerelease. | Publication is delivery evidence, not native QA. |
| Downloaded APK recheck | Same CI APK below | SHA manifests, archive digest, signature and independent static checks passed locally. | Still no Android runtime result. |
| Vessel fidelity / calibration | Source-specific references and commissioning review | NOT RUN. | General training material cannot establish Belem's settings or source-exact UI. |

The private [candidate release](https://github.com/thaungzan93/belem-lng/releases/tag/v0.4.0-candidate.1) contains these published assets:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `belem-lng-v0.4.0-candidate.apk` | 57,725,876 | `3b73368f52bc183393bd8c6f20fe5cc4bec56882d5dd63f32d4eed292936ec71` |
| `belem-lng-v0.4.0-all.zip` | 25,163,197 | `6e87eda7bca379c010f073c3a30677ccc1ef6f828649e608b7f70a6c04328761` |
| `SHA256SUMS.txt` | 188 | `06440763913eba239774afac2bfda4eb395140bc85b7a05f1f56bb263ef759e3` |

The published ZIP packages source snapshot `5d1e353`; its APK was built from `db31cd0`. The publisher checks that application files and dependencies are unchanged. The earlier local APK (`104dd591…`) and earlier local ZIP (`e6fd92ed…`) are different files and are not the published assets above.

## What the static APK checks establish

- Package `com.belem.lng.rebuild`, version 0.4.0 / code 1, minimum API 24 and target API 36.
- APK signature verifies using v2; the release APK is not debuggable and passes ZIP CRC validation.
- Embedded Hermes bytecode and Hermes libraries for arm64-v8a, armeabi-v7a, x86 and x86_64.
- 16 KB ZIP alignment and aligned LOAD segments in all 28 ARM64/x86_64 libraries.
- No Internet, overlay, microphone or broad storage/media permissions. Remaining uses-permissions are VIBRATE and the application's signature-protected receiver permission.
- Development certificate SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.

This is the Expo template development signer, not a production identity. The original signing key is unavailable; the rebuild's separate package preserves the earlier installation and does not migrate its data. An embedded bundle establishes packaging without Metro; it does not prove successful offline launch.

## Reproduce checks

Use Node 22 and the committed lockfile. Browser verification needs Chromium:

```sh
npm ci
npm run typecheck
npm test
npm run export:web
npx playwright install --with-deps chromium
npm run verify:browser
```

For Android, use a **full JDK 17 including javac**; `JAVA_HOME/bin/javac` must exist when JAVA_HOME is set. Install SDK platform 36, build-tools 36.0.0, NDK 27.1.12297006 and CMake 3.22.1, accept licenses and set ANDROID_HOME. A dependency also requested build-tools 35.0.0 during the recorded build. First builds require Gradle/Maven downloads; preserve environment proxy/CA settings and TLS verification. See [ANDROID.md](ANDROID.md).

```sh
java -version
javac -version
bash scripts/build-android.sh
cd artifacts/android
sha256sum -c SHA256SUMS.txt
```

After downloading release assets, verify their release checksums before installation. Optional independent SDK checks, from that download directory:

```sh
sha256sum -c SHA256SUMS.txt
BELEM_APK=belem-lng-v0.4.0-candidate.apk
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --verbose --print-certs "$BELEM_APK"
"$ANDROID_HOME/build-tools/36.0.0/zipalign" -c -P 16 4 "$BELEM_APK"
"$ANDROID_HOME/build-tools/36.0.0/aapt" dump permissions "$BELEM_APK"
```

The outer ZIP's SHA256SUMS.json covers every other member; android/ contains the raw static report, and verification/ contains browser evidence. Generated artifacts are ignored by Git. CI artifacts expire after 14 days; the private release is the retained distribution. Do not commit APKs, archives or private keys. Owner-authorized references follow [REFERENCES.md](REFERENCES.md).

## Recorded build issues and interpretation

- The first local attempt used a Java 21 runtime without javac and stopped before compilation. Installing full JDK 17 resolved that toolchain failure; preflight now rejects runtime-only installations.
- Hosted run 40101646177 failed because setup-android requested Google's retired `tools` package. The workflow now pins command-line tools 13114758 and requests platform-tools; the subsequent native run passed.
- Expo prebuild regenerates ignored android/; keep changes in configuration/source rather than generated native files. Its ios npm script is retained to prevent an incidental package.json rewrite; iOS has not been tested.
- The older implementation reportedly stalled in native react-native-svg text drawing. The rebuild uses core React Native Views/Text and no SVG diagram; this does not establish a performance fix.
- At this checkpoint no physical Android device or hardware-accelerated emulator was available. Keyboard, rotation, storage failure, native sharing, persistence and responsiveness remain NOT RUN. The recovered mixed owner-reference bundle contains a general GTT training PDF and filename-indicated candidate vessel references in H1843/fgsa; per-document applicability is unreviewed. Consult STATUS.md and the reference inventory before calibration.
