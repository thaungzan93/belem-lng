# Collaborating across AI tools

Start with [docs/HANDOVER.md](docs/HANDOVER.md) and [AGENTS.md](AGENTS.md). The repository is the shared checkpoint; a chat transcript is not the task tracker.

1. Fetch main, read STATUS.md/TASKS.md and choose one bounded task. Record ownership in the task list or a GitHub issue before overlapping work starts.
2. Create a task branch. If another assistant is editing the same module, agree on ownership or work in separate clones/worktrees; never run concurrent Git checkouts in a shared worktree.
3. Inspect existing code/tests and preserve the invariants documented in DATA.md/MODEL.md. Keep changes reviewable and avoid unrelated dependency or formatting churn.
4. Run checks relevant to the change. Source/browser commands are in README.md; native/release commands are in ANDROID.md. Docs-only changes need link/example consistency checks; they do not require rebuilding an unchanged APK.
5. Update STATUS.md/TASKS.md, commit and push the branch. Open a PR describing the user-visible result, validation and remaining limits. Inspect remote changes before merging; do not force-push over someone else's work.
6. At the end, leave the exact commit/PR, files changed, tests and next task. New assistants should be able to resume without asking the owner to reconstruct the chat.

Private ship references needed by collaborators may be stored in a private reference release or an explicitly reviewed reference folder, following [REFERENCES.md](docs/REFERENCES.md). Never upload account tokens, `.env` secrets or private signing keys. Generated APKs and archives belong in releases, not source history.

## Session handover template

```text
Task / branch / commit / PR:
Result and affected files:
Commands actually run and results:
Android APK/device evidence, if applicable:
Reference identity/revision/page and assumptions changed:
Unresolved failures or work not performed:
Next concrete action and required inputs:
```

## Baseline for review

Watch-record edits must not change identity/count, inherit unrelated values or lose unknown/zero/tiny readings and units. Failed writes and cancelled edits must not corrupt saved data. Engine changes need conservation/finite-inventory and command-state validation. Diagram changes need fit/zoom/pan and Android responsiveness checks appropriate to their rendering path. A parameter backed only by general training material remains a training assumption.
