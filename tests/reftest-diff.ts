import { sync } from 'glob';
import { resolve, basename } from 'path';
import { existsSync, promises } from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const resultsDir = resolve(__dirname, '../results');
const customSnapshotsDir = resolve(__dirname, '../tmp/snapshots');
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
    const files: string[] = sync('../tmp/reftests/**/*.png', {
        cwd: __dirname,
        root: resolve(__dirname, '../../')
    }).filter((path) => existsSync(resolve(resultsDir, basename(path))));

    it.each(files.map((path) => basename(path)))('%s', async (filename) => {
        const previous = resolve(resultsDir, filename);
        const updated = resolve(__dirname, '../tmp/reftests/', filename);
        const diffOutput = resolve(customDiffDir, `${filename}-diff.png`);

        const [expected, actual] = await Promise.all([promises.readFile(previous), promises.readFile(updated)]);

        await compareImages(actual, expected, diffOutput);
    });
});
