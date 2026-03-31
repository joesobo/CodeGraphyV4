import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..', '..', '..', '..');
const webviewDist = path.join(root, 'dist', 'webview');
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CodeGraphy Webview Smoke</title>
    <link rel="stylesheet" href="/dist/webview/index.css" />
  </head>
  <body>
    <div id="root"></div>
    <script>
      (function bootstrapWebviewState() {
        const publish = function () {
          window.postMessage(
            { type: 'GRAPH_DATA_UPDATED', payload: { nodes: [], edges: [] } },
            '*'
          );
          window.postMessage(
            {
              type: 'SETTINGS_UPDATED',
              payload: { bidirectionalEdges: 'separate', showOrphans: true },
            },
            '*'
          );
        };

        window.addEventListener('load', function () {
          setTimeout(publish, 50);
        }, { once: true });
      })();
    </script>
    <script type="module" src="/dist/webview/index.js"></script>
  </body>
</html>`;

const server = http.createServer(async (req, res) => {
  try {
    const requestPath = req.url ?? '/';

    if (requestPath === '/' || requestPath === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (!requestPath.startsWith('/dist/webview/')) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const relativePath = requestPath.replace('/dist/webview/', '');
    const filePath = path.join(webviewDist, relativePath);
    const ext = path.extname(filePath);
    const file = await readFile(filePath);

    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(file);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Playwright webview server listening on http://127.0.0.1:${port}\n`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
