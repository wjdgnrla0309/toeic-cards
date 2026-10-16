// Minimal static server for the exported site (out/), used by Playwright.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = join(process.cwd(), "out");
const port = Number(process.env.PORT || 3200);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = normalize(join(root, path));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  try {
    // On Windows the export writes segment payloads as "__next.set/edit/__PAGE__.txt",
    // while the client (and the Linux build used for Pages) uses "__next.set.edit.__PAGE__.txt".
    const name = file.split(/[\\/]/).pop();
    if (name.startsWith("__next.") && name.endsWith(".txt") && !(await stat(file).catch(() => null))) {
      const parts = name.slice(0, -4).split(".");
      file = join(file, "..", `${parts[0]}.${parts[1]}`, ...parts.slice(2)) + ".txt";
    }
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" }).end(body);
  } catch {
    const body = await readFile(join(root, "404.html")).catch(() => "not found");
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" }).end(body);
  }
}).listen(port, () => console.log(`serving out/ on http://localhost:${port}`));
