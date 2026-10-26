# GitHub connection and first push

The intended repository is `https://github.com/thaungzan93/belem-lng`. Keep it private. Owner-authorized ship references follow [REFERENCES.md](REFERENCES.md): the six original photos and 06.zip are tracked privately; the large mixed bundle is in the private reference release. Credentials, private signing keys and generated APKs stay outside Git history.

The current repository is configured and has published releases. Each incoming AI/tool needs its own authorized GitHub connection; the instructions below describe connection/recovery, not an unresolved setup blocker. Start a takeover with [TAKEOVER.md](TAKEOVER.md).

## Authorize the repository

Signing in to GitHub and installing the GitHub app are separate steps. A successful account connection does not establish access to a private repository.

1. In ChatGPT, open **Settings → Plugins → GitHub** and use its connection or repository-management option.
2. Open the [official ChatGPT Codex Connector setup](https://github.com/apps/chatgpt-codex-connector/installations/select_target), select the owning account `thaungzan93`, and grant access to `belem-lng`.
3. Review and save the installation. Existing installations can be changed from [Installed GitHub Apps](https://github.com/settings/installations).
4. Recheck access from the coding session. OpenAI notes that repositories can take about five minutes to appear. Do not interpret an HTTP 404 alone as proof that a private repository does not exist.

See OpenAI's [GitHub connection instructions](https://help.openai.com/en/articles/11145903-connecting-github-to-chatgpt). App availability and write capabilities depend on the product surface; verify the actual repository permissions before promising a push or workflow run. Do not paste a personal access token into chat.

## Preserve existing work

The source is already committed locally. Before its first push, verify repository visibility, permissions and remote history. If the remote contains an initial README or other work, preserve it by merging or using a review branch; do not force-push over it. Authentication setup must use the session's configured GitHub connection rather than embedding credentials in a remote URL.

After pushing a tested commit, check **Source checks** in Actions. The **Android candidate APK** workflow is manual: run it on the intended commit and retain its actual artifact and verification report. Workflow files alone do not establish a successful build. Record the commit, workflow URL and observed result in [STATUS.md](STATUS.md).
