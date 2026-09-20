# Filter validation and native WKWebView CI policy

The expensive native macOS WKWebView pixel probe is diagnostic and is no longer part of the regular PR CI or the NPM publication dependency chain. This changes scheduling and release gating, not rendering code or pixel thresholds.

## What runs when

| Workflow / checks | Pull request to main | Push to main | Push of a v-prefixed tag | Manual run |
| --- | --- | --- | --- | --- |
| `CI` (`ci.yml`): build, lint/unit, browser checks, Chromium/WebKit pixel and allocation checks | Yes | Yes | Yes | Not configured |
| `Native WKWebView pixels` (`wkwebview-pixels.yml`) | No | No | Yes | `workflow_dispatch` |
| `Publish NPM` job in `CI` | No | No | After its existing browser and filter-pixel dependencies succeed | Not configured |

The tag pattern is `v*`, including prerelease tags such as `v2.4.4-rc.1`. It does not run the new workflow for ordinary branch pushes or non-v-prefixed tags. The separate `Filter performance` workflow keeps its existing PR path filters and manual trigger; it is not a dependency of NPM publication.

**Regular macOS Safari browser tests remain in `CI`.** Moving the genuine WKWebView host does not remove Safari from the browser matrix or remove Linux Playwright WebKit pixel checks. Playwright WebKit and system WKWebView are different runtimes; neither test is represented as a substitute for the other.

## Publication is independent of the diagnostic workflow

`publish.needs` is now `[browser-test, filter-pixels]`; it does not reference `wkwebview-pixels`. Those browser and filter-pixel jobs still depend on the normal build. The native diagnostic workflow builds its own artifacts from the selected ref and does not depend on a release artifact or a completed publication. Thus a skipped, slow or failed native diagnostic run does not skip or delay NPM publication through a workflow dependency.

Failures are still visible: the diagnostic job does not use `continue-on-error` and does not weaken the probe's assertions. Its PNGs and `results.json` are uploaded with `if: always()` when they exist, even if the probe fails. A green regular CI run alone no longer means that a native WKWebView run was executed for that commit.

Repository branch-protection rules are separate from workflow dependencies. If the old `Native WKWebView pixels` check was configured as required, a repository maintainer must remove or replace that required-check entry when adopting this policy, or PRs could wait for a check that no longer runs on PRs. This change does not modify or claim to have verified repository protection settings.

## Run a native check on demand

In GitHub Actions, choose **Native WKWebView pixels → Run workflow** and select the intended branch or tag. The UI button requires the workflow file to exist on the repository's default branch; it should not be expected merely because a new workflow file appears in a draft PR.

Once manual dispatch is available, a maintainer can also use:

```sh
gh workflow run wkwebview-pixels.yml \
  --repo yorickshan/html2canvas-pro \
  --ref main
```

Replace `main` with the branch or tag being checked. Run only a ref whose code you intend to execute. The workflow checks out the selected event ref, uses `pnpm install --frozen-lockfile`, and has only `contents: read` permissions. It has no release/publish step or access to an NPM publishing token.

For a local macOS run, including before the workflow reaches the default branch:

```sh
pnpm install --frozen-lockfile
pnpm build
node scripts/wkwebview-probe.mjs
```

Xcode command line tools are required for the AppKit/WKWebView host. The existing probe and its native-image thresholds are unchanged. Do not create a version tag just to test scheduling: the normal CI also publishes on v-prefixed tags.

## Artifacts and resource limits

The standalone workflow first builds on Ubuntu with a 10-minute timeout, uploading `wkwebview-dist` and `wkwebview-build` for that run (7-day retention). The macOS job downloads those same-run artifacts into `dist/` and `build/` and runs the unchanged native probe with a 15-minute timeout.

The diagnostic artifact is `native-wkwebview-pixels`, retained for 30 days, with `tmp/wkwebview-probe/*.png` and `tmp/wkwebview-probe/results.json`. Concurrency is scoped to the selected ref; a newer diagnostic run on that ref cancels an older one without cancelling a different ref's run. Checkouts do not persist Git credentials.

## Related documentation

See [CSS filters and layer opacity](./filter-support.md) for supported combinations and the two fallback decisions, the [design note](./filter-compositing-draft.md) for the native WebKit discrepancy, and the [production fast-path report](./filter-native-fastpath.md) for revision-specific historical test evidence. Earlier reports stating that native WKWebView passed on a specific commit remain historical evidence; they do not imply it runs on every subsequent PR revision.

GitHub references: [workflow events and manual dispatch](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) and [workflow syntax, dependencies and permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).
