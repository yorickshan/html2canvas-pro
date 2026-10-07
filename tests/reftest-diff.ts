/**
 * Visual regression check: compares fresh captures (tmp/reftests/**.png,
 * produced by `pnpm reftests:pw`) against the committed baselines in
 * tests/results/, which carry the engine name only (`test!Chrome.png`) so
 * they survive browser minor updates. Regenerate a baseline by copying the
 * capture from tmp/reftests after eyeballing it.
 */
import { globSync } from 'glob';
import { resolve, basename } from 'path';
import { existsSync, promises } from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const resultsDir = resolve(__dirname, 'results');
const customDiffDir = resolve(__dirname, '../tmp/snapshot-diffs');

async function compareImages(updated: Buffer, previous: Buffer, diffOutputPath: string): Promise<void> {
    const img1 = PNG.sync.read(updated);
    const img2 = PNG.sync.read(previous);

    const { width, height } = img1;
    const diff = new PNG({ width, height });

    const mismatchedPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, {
        threshold: 0.1
    });

    if (mismatchedPixels > 0) {
        await promises.mkdir(customDiffDir, { recursive: true });
        await promises.writeFile(diffOutputPath, PNG.sync.write(diff));
        throw new Error(
            `Image mismatch: ${mismatchedPixels} pixels differ.\n  Expected: ${previous.length} bytes\n  Received: ${updated.length} bytes\n  Diff saved: ${diffOutputPath}`
        );
    }
}

describe('Image diff', () => {
    const captures: string[] = globSync('tmp/reftests/**/*.png', { cwd: resolve(__dirname, '..') }).filter((path) =>
        existsSync(resolve(resultsDir, basename(path)))
    );

    for (const file of captures) {
        const filename: string = basename(file);
        it(filename, async () => {
            const previous = resolve(resultsDir, filename);
            const updated = resolve(__dirname, '../tmp/reftests/', filename);
            const diffOutput = resolve(customDiffDir, `${filename}-diff.png`);

            const [expected, actual] = await Promise.all([promises.readFile(previous), promises.readFile(updated)]);

            await compareImages(actual, expected, diffOutput);
        });
    }
});
