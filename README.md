# FoxPlug update writer

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-FoxPlug%20update%20writer-blue?logo=github)](https://github.com/marketplace/actions/foxplug-update-writer "FoxPlug update writer on the GitHub Marketplace")

A GitHub Action that writes your project's latest update from what you actually shipped. It reads your public repository's recent releases (last 90 days) and commits (last 30 days), asks [FoxPlug](https://foxplug.com/?utm_source=gh_action) to turn them into a short product update plus three draft posts, and puts the result in one place you choose:

- **a draft release note** in your repo (it is never published by the action; you review it and press Publish yourself), or
- **a comment on an issue you name** (for example a pinned "Weekly updates" issue).

It posts nowhere else. No FoxPlug account and no secrets are needed.

Which one to use: this action writes a weekly update into your repository with no account; [FoxPlug Changelog and Launch Posts](https://github.com/OsakaSaul/foxplug-changelog-action "The other FoxPlug action: each release or push goes into your FoxPlug project") sends each release or push into a FoxPlug project, where you approve the changelog entry and posts.

Want it without a workflow file, for private repos too, with a changelog page and posts ready to share? Use the hosted version at [foxplug.com](https://foxplug.com/?utm_source=gh_action "FoxPlug, the hosted version of this action").

## Use it

```yaml
on: { schedule: [{ cron: "0 9 * * 1" }], workflow_dispatch: {} }
permissions: { contents: write }
jobs:
  update:
    runs-on: ubuntu-latest
    steps: [{ uses: OsakaSaul/foxplug-action@v1 }]
```

That runs every Monday at 09:00 UTC (and on demand from the Actions tab) and leaves a draft release for you to review.

To comment on an issue instead:

```yaml
permissions: { issues: write }
# ...
    steps:
      - uses: OsakaSaul/foxplug-action@v1
        with:
          mode: issue
          issue-number: 12
```

## Inputs

| Input | Default | What it does |
| --- | --- | --- |
| `mode` | `release` | `release` creates a draft release. `issue` comments on `issue-number`. |
| `issue-number` | none | The issue to comment on. Required when `mode` is `issue`. |
| `release-tag` | `foxplug-update-YYYY-MM-DD` | Tag for the draft release. A draft does not create the tag until you publish it. |
| `github-token` | the workflow token | Used to check the repo is public and to write the draft or the comment. |
| `foxplug-api-key` | empty | Optional, for FoxPlug account users: pass `${{ secrets.FOXPLUG_API_KEY }}`. Account keys are not issued yet, so today every call uses the free path and its limits. |

Outputs: `title`, `body`, `url` (the draft release or the comment) and `written` (`true`, or `false` when there was nothing recent enough to write about).

## Permissions

Only the default `GITHUB_TOKEN`, with the smallest permission for the mode you use:

- `mode: release` needs `contents: write` (to create the draft release).
- `mode: issue` needs `issues: write` (to add the comment).

The token never leaves the runner. FoxPlug receives only your repository's address (`github.com/owner/name`) and reads the same public data anyone can see.

## Limits

This uses the same free path as the "Paste your GitHub repo" box on foxplug.com, with the same limits:

- **Public repositories only.** On a private or internal repo the action stops with an error before anything is sent. To write updates from a private repo, connect it in a FoxPlug account.
- A few tries per runner address per day, and a shared daily limit across everyone. When a limit is reached the step fails with the reason, and the next scheduled run tries again.
- The same repository asked again within 6 hours gets the same update back.
- If the repo has too little recent activity to write about, the step succeeds, writes nothing and says why.

## Example output

This is the draft release body the action wrote for this repository on its own first run (2026-09-29), unedited. It is why every result lands as a draft: read it and fix anything before you publish.

```markdown
## Manual workflows and full documentation for FoxPlug

We added a manual run workflow so you can test the action on your own repository whenever you need. We documented the workflow example, permissions, limits and outputs so you know exactly how to set things up. We also switched to MIT licensing and made it clearer how FoxPlug writes your weekly update from public releases and commits into a draft release or a named issue, with the option to choose your listing icon and color.

<details><summary>Draft posts</summary>

**Post for X**

FoxPlug now respects private repos and lets you pick how your weekly update shows up—draft release or issue comment, your icon, your color. 🎯

**Post for LinkedIn**

We shipped documentation for FoxPlug that covers everything you need to know: the workflow example, permissions, limits and outputs. You can now run the action manually on your repository to test it out before putting it on a schedule. We also moved to MIT licensing to make it clear you can use and modify this freely. FoxPlug turns your public releases and commits into a weekly product update, posted as a draft release or an issue comment with your chosen icon and color.

**Short post**

FoxPlug got docs, manual workflows, and MIT licensing. Now you can test it on your repo anytime before automating your weekly updates. 🦊

</details>

---
Written by [FoxPlug](https://foxplug.com/?utm_source=gh_action) from this repository's public releases and commits. Review and edit it before you share it.
```

## License

MIT. See [LICENSE](LICENSE).

Made by [FoxPlug](https://foxplug.com/?utm_source=gh_action), which turns what you ship into updates, changelogs and posts, and asks before anything goes out.
