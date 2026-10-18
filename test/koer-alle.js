// koer-alle.js — kører alle node-testene efter hinanden (ingen browser, ingen afhængigheder).
// Kør:  node test/koer-alle.js        (eller: npm.cmd test)
// Browsertesten (WebKit) køres for sig: se README.md.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAPPE = path.dirname(fileURLToPath(import.meta.url));
const TESTS = ['test-opskrifter.js', 'test-validator.js', 'test-tid.js', 'test-sw.js', 'test-css.js'];

let fejl = 0;
for (const t of TESTS) {
  const k = spawnSync(process.execPath, [path.join(MAPPE, t)], { encoding: 'utf8' });
  const ud = (k.stdout || '') + (k.stderr || '');
  const bestaaet = /ℹ pass (\d+)/.exec(ud);
  const fejlet = /ℹ fail (\d+)/.exec(ud);
  const linje = bestaaet ? bestaaet[1] + ' bestået, ' + (fejlet ? fejlet[1] : '0') + ' fejlet' : ud.trim().split('\n')[0];
  if (k.status === 0) console.log('OK    ' + t.padEnd(22) + linje);
  else {
    fejl++;
    console.log('FEJL  ' + t.padEnd(22) + linje);
    console.log(ud.split('\n').map((l) => '      ' + l).join('\n'));
  }
}
console.log(fejl ? fejl + ' af ' + TESTS.length + ' testfiler fejlede' : 'Alle ' + TESTS.length + ' testfiler er grønne');
process.exit(fejl ? 1 : 0);
