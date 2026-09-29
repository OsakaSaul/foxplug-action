# FoxPlug update writer

A GitHub Action that writes your project's latest update from what you actually shipped. It reads your public repository's recent releases (last 90 days) and commits (last 30 days), asks [FoxPlug](https://foxplug.com/?utm_source=gh_action) to turn them into a short product update plus three draft posts, and puts the result in one place you choose:

- **a draft release note** in your repo (it is never published by the action; you review it and press Publish yourself), or
- **a comment on an issue you name** (for example a pinned "Weekly updates" issue).

It posts nowhere else. No FoxPlug account and no secrets are needed.

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

This is the draft release body the action wrote for this repository on its own self-test run:

```markdown
EXAMPLE_OUTPUT_PLACEHOLDER
```

## License

MIT. See [LICENSE](LICENSE).

Made by [FoxPlug](https://foxplug.com/?utm_source=gh_action), which turns what you ship into updates, changelogs and posts, and asks before anything goes out.
