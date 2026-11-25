#!/usr/bin/env node
/**
 * Generate the CHANGELOG.md increment for the newest release window.
 *
 * Replaces the bare `conventional-changelog -p conventionalcommits` CLI call
 * used before: the CLI also lifts issue references from commit BODIES, and it
 * links prose hex colours (`color-mix(in hsl, #121212 64%, transparent)`) as
 * `issues/121212`. Its `-n` config file cannot stop that (JSON-only — functions
 * are impossible, and empty `issuePrefixes`/`referenceActions` fall back to the
 * GitHub host defaults instead of disabling the feature).
 *
 * This script therefore drives the programmatic API with a filtered writer
 * transform: a reference collected without an action keyword must be
 * issue-number-shaped, i.e. 1 to 4 pure digits. Action references
 * (`closes #244`) always pass, real body references (`PR #250`) pass, while
 * prose hex colours are dropped (#0075ff, #2a2a2a, #121212 — every all-digit
 * colour is ≥6 digits, digits-only 1-4 cannot be a colour).
 *
 * Merges into CHANGELOG.md exactly like the old CLI call: the generated
 * section is prepended to the existing file (`-i … -r 1` semantics).
 *
 * Usage: node scripts/generate-changelog.mjs <infile> [release-count]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { ConventionalChangelog } from 'conventional-changelog';
import createPreset from 'conventional-changelog-conventionalcommits';

const args = process.argv.slice(2);
const infile = args[0] ?? 'CHANGELOG.md';
const releaseCountArg = args[1] !== undefined ? Number(args[1]) : 1;

// Pure-digit issue numbers 1-4 long. GitHub issue numbers in this repository
// grow with use (currently ~250); all-digit hex colours start at 6 digits
// (#000000). 3-digit colours (#123-style) would collide with issue numbers,
// but short-hex has not appeared in commit prose; bump the bound if the issue
// count approaches 9999.
const ISSUE_LIKE = /^\d{1,4}$/;

const preset = createPreset();
const stockTransform = preset.writer.transform;

// The parser freezes commits, so filtered references are re-applied on a copy
// only when the filter removed something; the stock transform's behaviour
// (subject de-dup, discard rules, notes formatting) is otherwise preserved.
const transform = (commit, context) => {
    let candidate = commit;
    if (Array.isArray(commit.references)) {
        const kept = commit.references.filter((reference) => reference.action || ISSUE_LIKE.test(reference.issue));
        if (kept.length !== commit.references.length) {
            candidate = { ...commit, references: kept };
        }
    }
    return stockTransform(candidate, context);
};

let releaseCount;
if (releaseCountArg !== undefined) {
    if (!Number.isFinite(releaseCountArg) || releaseCountArg < 0) {
        console.error('Invalid release-count value');
        process.exit(2);
    }
    releaseCount = releaseCountArg;
}

const generator = new ConventionalChangelog().readPackage().config({
    commits: preset.commits,
    parser: preset.parser,
    writer: { ...preset.writer, transform }
});

if (releaseCount !== undefined) {
    generator.options({ releaseCount });
}

let generated = '';
for await (const chunk of generator.write()) {
    generated += chunk;
}

// Mirror the CLI's same-file merge semantics: existing file first is what
// `-i infile -r 1` produces for a non-append run (buffer of the fresh
// changelog with the old content appended, separated by a blank line).
const existing = await readFile(infile, 'utf8').catch(() => null);
if (existing === null) {
    await writeFile(infile, generated);
    process.stdout.write(generated);
} else {
    const separator = generated && !generated.endsWith('\n') ? '\n' : '';
    const merged = generated
        ? `${generated}${separator}${existing.startsWith('\n') || generated.endsWith('\n\n') ? '' : '\n'}${existing}`
        : existing;
    await writeFile(infile, merged);
    process.stdout.write(merged);
}
