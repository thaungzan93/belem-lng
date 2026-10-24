# Android candidate builds

This rebuild targets Android 7.0 and newer (API 24), with target SDK 36. The application version, Android version code and package ID come from [app.json](../app.json). The new package `com.belem.lng.rebuild` installs alongside the earlier Belem application; it does not replace it or migrate its saved data.

The original Android source, SDK installation and private signing key were not recovered. These instructions create a **development-signed release candidate**, using the Expo template development key. This is an installable APK with its JavaScript included, without a Metro development server. It is not a production signing or Google Play release process. No new private signing secret is needed for this candidate workflow, and no signing key is uploaded in its artifacts.

## Build with GitHub Actions

1. Open the private repository's **Actions** tab and enable Actions if GitHub asks.
2. Select **Android candidate APK**, choose **Run workflow**, and select the intended branch.
3. Once the run succeeds, download its **belem-android-candidate-…** artifact. Extract the ZIP to obtain the APK, `SHA256SUMS.txt`, `verification.json` and public static-check reports.

The native workflow runs only when manually requested. It uses GitHub-hosted Ubuntu, Node 22, JDK 17 and Android SDK 36. It installs locked dependencies, runs TypeScript and tests, generates the Android project with Expo prebuild and assembles all four Android ABIs. The source-check workflow runs on pushes and pull requests and also exports a web preview. Both retain artifacts for 14 days; download a build you want to keep before it expires. No repository write permission or GitHub token secret is required.

Workflow files being present does not establish a successful build. Until an actual run finishes, APK generation and its static checks remain unverified. A successful build alone also does not establish working Android controls or acceptable device performance.

## Build locally

Use Node 22, JDK 17, Python 3 and an Android SDK. Install SDK platform 36, build-tools 36.0.0, NDK 27.1.12297006 and CMake 3.22.1 with Android Studio or `sdkmanager`, accept the SDK licenses, and set `ANDROID_HOME`. Keep the project on a normal writable filesystem with enough space for dependencies, native build outputs and Gradle caches.

```sh
npm ci
npm run typecheck
npm test
bash scripts/build-android.sh
```

The script replaces the ignored, generated `android/` directory using `expo prebuild --platform android --clean --no-install`. Keep application changes and configuration plugins in tracked source. The script refuses to overwrite a tracked Android project. It uses the generated Gradle wrapper rather than a separately installed Gradle. Initial builds download Gradle and Maven dependencies; later builds can reuse local caches.

Outputs are written to the ignored `artifacts/android/` directory. The APK filename includes the version from `app.json`. Check integrity after copying or downloading:

```sh
cd artifacts/android
sha256sum -c SHA256SUMS.txt
```

The script checks package/version metadata, API levels, launcher activity, absence of the debuggable flag, ZIP integrity, signature verification, the embedded Hermes bytecode, all four ABIs, 16 KB ZIP and 64-bit ELF alignment, and the absence of Internet, overlay, microphone, storage and all configured blocked permissions. Its JSON report explicitly labels runtime verification as **not run**. Static checks do not prove offline launch, watch-record editing or persistence.

## Install and validate

Back up any existing application data before replacing an installed build. Android updates require both the same package ID and the same signing certificate. Inspect the certificate fingerprint in `verification.json`; do not uninstall an application containing the only copy of your watch records to bypass a signature mismatch. The separate rebuild package preserves an existing older Belem installation, but Android does not automatically transfer its data into the rebuild.

Copy the extracted APK to the device, open it, and allow that file manager to install unknown apps when Android asks. Alternatively, use `adb install -r path/to/the-candidate.apk`. A release candidate includes the Hermes bundle and does not need the development server. The release manifest deliberately excludes Internet access and broad microphone/storage access; application files remain in its private storage.

On a representative Android device, enable airplane mode, launch the installed application, navigate its screens, enter and save a synthetic watch record, open its details, and exercise Edit/Cancel/Save. Force-stop and reopen the application and confirm the saved values persist. Check responsive scrolling and text entry before relying on it during a watch. Keep observed results separate from the static build report. The earlier application's emulator results do not validate this rebuild.

## Future production signing

Before distributing a production identity, generate and securely back up a dedicated release key outside the repository, then configure the Gradle signing step to use protected GitHub environment secrets and require environment approval. Restrict the workflow to trusted branches; never pass a private key to pull-request code or include keys/passwords in artifacts. Changing from the development signer will require an explicit migration/install plan. Production signing is not configured or claimed by this candidate workflow.
