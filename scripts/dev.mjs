/* Local development server.
 *
 *   npm run dev   →  http://localhost:8080
 *
 * Watches the sources, rebuilds on change, and pushes a reload to every open
 * tab. Three deliberate differences from `npm run serve`:
 *
 *   1. DEV=1 is set, so drafts and future-dated posts render. Without it you
 *      cannot see a post until you have already committed to publishing it.
 *   2. Every response is sent no-store. Python's http.server sends
 *      Last-Modified, which Chrome caches against, and a stale style.css then
 *      looks exactly like a broken page.
 *   3. A tiny reload script is injected into HTML on the way out. It only
 *      exists in this server's responses and never touches a file on disk,
 *      so it cannot leak into what you publish.
 *
 * No dependencies beyond what the site already uses.
 */
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 8080;
const WATCH = ['content', 'scripts', 'assets', 'style.css', 'index.html'];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.css': 'text/css; charset=utf-8',   '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',         '.xml': 'application/xml',
  '.svg': 'image/svg+xml',             '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png',                 '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',              '.txt': 'text/plain; charset=utf-8',
};

const clients = new Set();
const grey = (s) => `\x1b[90m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;

/* index.html is both a hand-authored source and a build output, so the build's
   own writes land back in the watcher and would loop forever. Ignore filesystem
   events while a build runs, and for a moment after it finishes. */
let building = false;
let quietUntil = 0;

function build(reason) {
  building = true;
  const started = Date.now();
  const r = spawnSync('node', ['scripts/build-blog.mjs'], {
    cwd: ROOT, env: { ...process.env, DEV: '1' }, encoding: 'utf8',
  });
  const ms = Date.now() - started;
  if (r.status !== 0) {
    console.log(red(`\n  build failed (${reason})`));
    console.log((r.stderr || r.stdout || '').trim().split('\n').slice(-12).join('\n'));
    for (const c of clients) c.write(`event: failed\ndata: ${JSON.stringify(r.stderr || '')}\n\n`);
    building = false; quietUntil = Date.now() + 500;
    return false;
  }
  const built = (r.stdout.match(/✅ built/g) || []).length;
  console.log(green(`  rebuilt`) + grey(` ${built} targets in ${ms}ms · ${reason}`));
  for (const c of clients) c.write('event: reload\ndata: 1\n\n');
  building = false; quietUntil = Date.now() + 500;
  return true;
}

/* fs.watch fires several times for one save, so collapse a burst into one build */
let timer = null, pending = new Set();
function schedule(file) {
  if (building || Date.now() < quietUntil) return;
  pending.add(file);
  clearTimeout(timer);
  timer = setTimeout(() => {
    const names = [...pending].slice(0, 3).join(', ') + (pending.size > 3 ? ` +${pending.size - 3}` : '');
    pending.clear();
    build(names);
  }, 90);
}

for (const target of WATCH) {
  const abs = path.join(ROOT, target);
  if (!fs.existsSync(abs)) continue;
  fs.watch(abs, { recursive: fs.statSync(abs).isDirectory() }, (_e, name) => {
    if (!name) return;
    if (/(^|\/)\.|\.swp$|~$|\.DS_Store$/.test(name)) return;   // editor scratch files
    schedule(path.basename(name));
  });
}

const RELOAD = `<script>
(() => {
  const es = new EventSource('/__dev');
  es.addEventListener('reload', () => location.reload());
  es.addEventListener('failed', (e) => console.error('[dev] build failed\\n' + (e.data || '')));
  es.onerror = () => { /* server restarting; EventSource retries on its own */ };
})();
</script>`;

createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);

  if (url === '/__dev') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    });
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  let file = path.join(ROOT, url);
  if (url.endsWith('/')) file = path.join(file, 'index.html');
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }   // no path traversal

  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    const fallback = path.join(ROOT, '404.html');
    const body = fs.existsSync(fallback) ? fs.readFileSync(fallback, 'utf8') : 'not found';
    res.writeHead(404, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
    res.end(body.replace('</body>', RELOAD + '</body>'));
    return;
  }

  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const headers = { 'Content-Type': type, 'Cache-Control': 'no-store, must-revalidate' };

  if (ext === '.html') {
    let html = fs.readFileSync(file, 'utf8');
    html = html.includes('</body>') ? html.replace('</body>', RELOAD + '</body>') : html + RELOAD;
    res.writeHead(200, headers);
    res.end(html);
  } else {
    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
  }
}).listen(PORT, () => {
  console.log(`\n  ${green('dev')} http://localhost:${PORT}`);
  console.log(grey(`  watching ${WATCH.join(', ')} · drafts and scheduled posts are visible\n`));
  build('first run');
});
