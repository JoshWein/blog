// Runs axe-core against every page of the built blog and exits non-zero
// on any violation. Usage: node scripts/a11y-check.mjs [siteDir]
// Build first: LANG=C.UTF-8 bundle exec jekyll build -d _site/blog
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { join, extname, resolve, relative, sep } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const axeSource = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
const root = resolve(process.argv[2] || "_site");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml", ".xml": "application/xml" };

async function htmlFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await htmlFiles(p));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out.sort();
}

const server = createServer(async (req, res) => {
  let path;
  try { path = decodeURIComponent(new URL(req.url, "http://x").pathname); }
  catch { res.writeHead(400).end(); return; }
  if (path.endsWith("/")) path += "index.html";
  const file = resolve(root, "." + path);
  if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" }).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

const VIEWPORTS = [{ name: "desktop", width: 1280, height: 900 }, { name: "phone", width: 390, height: 844 }];
const browser = await chromium.launch();
const page = await browser.newPage();
// Keep runs deterministic: only load files from the local build,
// plus the Google Fonts the layout uses (no analytics, ads or Disqus).
const allowed = u => u.startsWith(origin) || /^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u);
await page.route("**/*", r => allowed(r.request().url()) ? r.continue() : r.abort());

let failures = 0;
const files = await htmlFiles(root);
for (const vp of VIEWPORTS) {
await page.setViewportSize({ width: vp.width, height: vp.height });
for (const file of files) {
  const url = origin + "/" + relative(root, file).split(sep).join("/");
  await page.goto(url, { waitUntil: "load" });
  await page.addScriptTag({ content: axeSource });
  const { violations } = await page.evaluate(tags => axe.run(document, { runOnly: { type: "tag", values: tags } }), TAGS);
  const name = `${url.slice(origin.length)} (${vp.name})`;
  if (!violations.length) { console.log(`ok    ${name}`); continue; }
  failures += violations.length;
  console.log(`FAIL  ${name}`);
  for (const v of violations) {
    console.log(`  [${v.impact}] ${v.id}: ${v.help}`);
    for (const n of v.nodes.slice(0, 5)) console.log(`      ${n.target.join(" ")}`);
    if (v.nodes.length > 5) console.log(`      ...and ${v.nodes.length - 5} more`);
  }
}
}
await browser.close();
server.close();
console.log(`\n${files.length} pages checked at ${VIEWPORTS.length} widths, ${failures} violation(s).`);
process.exit(failures ? 1 : 0);
