/* eslint-disable */
import express from 'express';
import yargs from 'yargs';
import { Argv, ScreenshotRequest } from './types';
import cors from 'cors';
import path from 'path';
import serveIndex from 'serve-index';
import fs from 'fs';
import bodyParser from 'body-parser';
import rateLimit from 'express-rate-limit';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const proxy = require('./proxy.cjs');
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const app = express();
app.use('/', serveIndex(path.resolve(__dirname, '../'), { icons: true }));
// Express 5 fails to fall through an array of paths on app.use, so mount
// the regex and the root separately or every static file 404s.
app.use(/^\/src($|\/)/, express.static(path.resolve(__dirname, '../')));
app.use('/', express.static(path.resolve(__dirname, '../')));

// Add route to handle redirect-image test case
app.get('/redirect-image', (_req, res) => {
    // Redirect to an external domain
    res.redirect('https://yorickshan.github.io/html2canvas-pro/logo.png');
});

export const corsApp = express();
corsApp.use('/proxy', proxy());
corsApp.use('/cors', cors(), express.static(path.resolve(__dirname, '../')));
corsApp.use('/', express.static(path.resolve(__dirname, '.')));

// Add route to handle redirect-image test case in CORS app too
corsApp.get('/redirect-image', (_req, res) => {
    // Redirect to an external domain
    res.redirect('https://yorickshan.github.io/html2canvas-pro/logo.png');
});

export const screenshotApp = express();
screenshotApp.use(cors());
screenshotApp.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
    // IE9 doesn't set headers for cross-domain ajax requests
    if (typeof req.headers['content-type'] === 'undefined') {
        req.headers['content-type'] = 'application/json';
    }
    next();
});
screenshotApp.use(
    bodyParser.json({
        limit: '15mb',
        type: '*/*'
    })
);

const prefix = 'data:image/png;base64,';
const screenshotFolder = '../tmp/reftests';
const metadataFolder = '../tmp/reftests/metadata';

const screenshotDir = path.resolve(__dirname, screenshotFolder);
const metadataDir = path.resolve(__dirname, metadataFolder);

fs.mkdirSync(screenshotDir, { recursive: true });
fs.mkdirSync(metadataDir, { recursive: true });

/**
 * Reduce the test URL to a filesystem-safe filename fragment.
 *
 * Whitelist-based (not blacklist): every character outside [A-Za-z0-9!-] is
 * replaced, so path separators, `..` sequences and URL-encoded traversal
 * cannot survive into the written path.
 */
const safeFilenameFragment = (testUrl: string): string => {
    return testUrl
        .replace(/^\/tests\/reftests\//, '')
        .replace(/\.html$/, '')
        .replace(/[^A-Za-z0-9!]+/g, '-')
        .replace(/^-+/, '')
        .slice(0, 180);
};

/**
 * Resolve `filename` inside `dir` and refuse anything that escapes it.
 *
 * The containment check on the canonicalized path is what makes the write
 * verifiably scoped: even if a future sanitizer regressed, a resolved path
 * outside `dir` throws instead of writing.
 */
const resolveInsideDir = (dir: string, filename: string): string => {
    const resolved = path.resolve(dir, filename);
    if (!resolved.startsWith(dir + path.sep)) {
        throw new Error(`Refusing to write outside ${dir}: ${filename}`);
    }
    return resolved;
};

const writeScreenshot = (buffer: Buffer, body: ScreenshotRequest): string => {
    // Baselines in tests/results must survive browser minor updates, so the
    // capture filename carries only the engine name (metadata keeps the
    // full version + TARGET_BROWSER id).
    const platform = safeFilenameFragment(body.platform?.name ?? 'unknown') || 'unknown';
    const filename = `${safeFilenameFragment(body.test)}!${platform}`;

    fs.writeFileSync(resolveInsideDir(screenshotDir, `${filename}.png`), buffer as Uint8Array);
    return filename;
};

// Generous for a reftest suite (121 uploads in ~15s from one browser) but
// bounded against runaway or abusive clients.
const uploadRateLimit = rateLimit({
    windowMs: 60_000,
    limit: 600,
    standardHeaders: 'draft-7',
    legacyHeaders: false
});

screenshotApp.post(
    '/screenshot',
    uploadRateLimit,
    (req: express.Request<Record<string, never>, void, ScreenshotRequest>, res: express.Response) => {
        if (!req.body || !req.body.screenshot) {
            return res.sendStatus(400);
        }

        try {
            const buffer = Buffer.from(req.body.screenshot.substring(prefix.length), 'base64');
            const filename = writeScreenshot(buffer, req.body);
            fs.writeFileSync(
                resolveInsideDir(metadataDir, `${filename}.json`),
                JSON.stringify({
                    windowWidth: req.body.windowWidth,
                    windowHeight: req.body.windowHeight,
                    platform: req.body.platform,
                    devicePixelRatio: req.body.devicePixelRatio,
                    test: req.body.test,
                    id: process.env.TARGET_BROWSER,
                    screenshot: filename
                })
            );
            return res.sendStatus(200);
        } catch (error) {
            // Malformed payloads (e.g. invalid base64) must not crash the
            // upload server mid-suite.
            console.error(error);
            return res.sendStatus(400);
        }
    }
);

screenshotApp.use((error: Error, _req: express.Request, _res: express.Response, next: express.NextFunction) => {
    console.error(error);
    next();
});

const args = yargs(process.argv.slice(2)).number(['port', 'cors']).argv as Argv;

// Test-only servers: bind to loopback so the write-capable screenshot route
// and the open image proxy are never reachable from other machines.
const LISTEN_HOST = '127.0.0.1';

if (args.port) {
    app.listen(args.port, LISTEN_HOST, () => {
        console.log(`Server running on port ${args.port}`);
    });
}

if (args.cors) {
    corsApp.listen(args.cors, LISTEN_HOST, () => {
        console.log(`CORS server running on port ${args.cors}`);
    });
}
