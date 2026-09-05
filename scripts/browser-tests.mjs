// Run the isolated Playwright suite without downloading a system-wide browser.
// Linux's minimal preview image needs the NSS libraries bundled with Chromium.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const env = { ...process.env };
if (process.platform === 'linux') {
  const directory = resolve('.data/browser-libs');
  mkdirSync(directory, { recursive: true });
  const tar = resolve(directory, 'libraries.tar');
  writeFileSync(
    tar,
    brotliDecompressSync(readFileSync(resolve('node_modules/@sparticuz/chromium/bin/al2023.tar.br'))),
  );
  const unpack = spawnSync('tar', ['xf', tar, '-C', directory], { stdio: 'inherit' });
  if (unpack.status !== 0) process.exit(unpack.status || 1);
  env.LD_LIBRARY_PATH = resolve(directory, 'lib') + (env.LD_LIBRARY_PATH ? ':' + env.LD_LIBRARY_PATH : '');
}
const result = spawnSync(
  process.execPath,
  ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)],
  { env, stdio: 'inherit' },
);
process.exit(result.status ?? 1);
