import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PNG } from 'pngjs';
const root = fileURLToPath(new URL('../', import.meta.url));
export async function startFilterServer() {
    const png = new PNG({ width: 40, height: 40 });
    for (let i = 0; i < png.data.length; i += 4) {
        png.data[i] = 23;
        png.data[i + 1] = 107;
        png.data[i + 2] = 112;
        png.data[i + 3] = 255;
    }
    const image = PNG.sync.write(png);
    const create = () =>
        http.createServer(async (req, res) => {
            const url = new URL(req.url, 'http://localhost');
            if (url.pathname === '/foreign.png') {
                res.setHeader('Content-Type', 'image/png');
                res.end(image);
                return;
            }
            const allowed = new Set([
                '/tests/reftests/filter/surface-regressions.html',
                '/tests/reftests/filter/compositing.html',
                '/tests/reftests/filter/surface-nesting.html',
                '/tests/test.js',
                '/dist/html2canvas-pro.js',
                '/build/filter-surface-benchmark.js',
                '/build/html2canvas-pro-baseline.esm.js',
                '/tests/manual/filter-compositing.js',
                '/tests/manual/filter-lab.html',
                '/tests/manual/filter-lab.css',
                '/tests/manual/filter-lab.js'
            ]);
            if (!allowed.has(url.pathname)) {
                res.writeHead(404).end();
                return;
            }
            if (url.searchParams.has('csp'))
                res.setHeader(
                    'Content-Security-Policy',
                    "default-src 'self'; img-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'"
                );
            try {
                const body = await readFile(path.join(root, url.pathname));
                res.setHeader(
                    'Content-Type',
                    url.pathname.endsWith('.js')
                        ? 'text/javascript'
                        : url.pathname.endsWith('.css')
                          ? 'text/css'
                          : 'text/html'
                );
                res.end(body);
            } catch {
                res.writeHead(404).end();
            }
        });
    const primary = create(),
        foreign = create();
    for (const server of [primary, foreign]) await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    return {
        url: `http://127.0.0.1:${primary.address().port}`,
        foreignUrl: `http://127.0.0.1:${foreign.address().port}/foreign.png`,
        close: () => Promise.all([primary, foreign].map((server) => new Promise((resolve) => server.close(resolve))))
    };
}
