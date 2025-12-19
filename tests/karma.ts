import { screenshotApp, corsApp } from './server';
import { Server } from 'http';
import { createRequire } from 'module';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Karma doesn't have proper ESM exports, so we use require

const karma = require('karma');
const { config: KarmaConfig, Server: KarmaServer } = karma;
type TestResults = typeof karma.TestResults;

const karmaTestRunner = (): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        const karmaConfig = KarmaConfig.parseConfig(path.resolve(__dirname, '../karma.conf.cjs'), {});
        const server = new KarmaServer(karmaConfig, (exitCode: number) => {
            if (exitCode > 0) {
                reject(`Karma has exited with ${exitCode}`);
            } else {
                resolve();
            }
        });
        server.on('run_complete', (_browsers: unknown, _results: TestResults) => {
            server.stop();
        });
        server.start();
    });
const servers: Server[] = [];

servers.push(screenshotApp.listen(8000));
servers.push(corsApp.listen(8081));

karmaTestRunner()
    .then(() => {
        servers.forEach((server) => server.close());
    })
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
