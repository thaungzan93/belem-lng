# Preserved verification evidence

The `v0.4.0/` directory contains small, durable copies of the actual CI browser report/screenshots, raw CI APK verification report, independent download/static recheck and published release metadata. They survive the 14-day Actions artifact retention period. The APK and full project ZIP remain private release assets; they are not committed binaries.

These files describe the commits/runs inside them, not every future main commit. Screenshots show the rebuilt web interface, not original ship HMI photos. Android runtime checks remain not run. See [VERIFICATION.md](../VERIFICATION.md) for the evidence levels and [NATIVE_QA.md](../NATIVE_QA.md) for the next device checks.
