// lav-ikoner.js — laver hjemmeskærm-ikonerne ikoner/ikon-180.png, -192.png og -512.png ud fra ikoner/ikon.svg.
// Bruger Playwright (WebKit), som kun er et værktøj her og aldrig en del af appen. Tungt: kør gennem låsen:
//   bash ~/.claude/tung-koersel.sh "kogebog: ikoner" node vaerktoej/lav-ikoner.js
// Kommer det rigtige app-ikon som PNG fra ChatGPT (fase 2), så skalér det i stedet, og slet ikon.svg fra FILER i sw.js.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

export function hentPlaywright() {
  try { return require('playwright'); } catch (e) { /* prøv den globale */ }
  const glob = execSync('npm root -g').toString().trim();
  for (const p of [path.join(glob, 'playwright'), path.join(glob, '@playwright', 'cli', 'node_modules', 'playwright')]) {
    try { return require(p); } catch (e) { /* næste */ }
  }
  throw new Error('Playwright blev ikke fundet. Sæt NODE_PATH til den globale @playwright/cli/node_modules.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { webkit } = hentPlaywright();
  const svg = fs.readFileSync(path.join(ROD, 'ikoner', 'ikon.svg'));
  const data = 'data:image/svg+xml;base64,' + svg.toString('base64');
  const browser = await webkit.launch();
  try {
    for (const n of [180, 192, 512]) {
      const side = await browser.newPage({ viewport: { width: n, height: n }, deviceScaleFactor: 1 });
      await side.setContent('<!doctype html><html><body style="margin:0;background:#F2C14E"><img id="i" width="' + n + '" height="' + n + '" style="display:block" src="' + data + '"></body></html>');
      await side.waitForFunction(() => document.getElementById('i').complete);
      const ud = path.join(ROD, 'ikoner', 'ikon-' + n + '.png');
      await side.screenshot({ path: ud, clip: { x: 0, y: 0, width: n, height: n } });
      await side.close();
      console.log('Skrev ' + path.relative(ROD, ud) + ' (' + fs.statSync(ud).size + ' byte)');
    }
  } finally {
    await browser.close();
  }
}
