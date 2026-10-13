'use strict';

// Public synthetic fixture: fixed text rendered with a macOS system font.
// No design references, user content, external services or AI are used.
// Reproduce on macOS: node tests/fixtures/generate-ocr-fixture.cjs
// Font rasterization can vary with macOS; the test checks the published PNG hash
// and its actual OCR result, rather than requiring cross-OS pixel identity.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {createHash} = require('node:crypto');
const {spawnSync} = require('node:child_process');

const OCR_LINES = ['SYNTHETIC OCR FIXTURE', 'VISIBLE TEXT ONLY 2026'];

function generateOcrFixture() {
  if (process.platform !== 'darwin') throw new Error('Fixture generation requires macOS AppKit.');
  const cache = fs.mkdtempSync(path.join(os.tmpdir(), 'mengcang-ocr-font-'));
  const destination = path.join(__dirname, 'synthetic-ocr.png');
  try {
    const run = spawnSync('/usr/bin/swift', ['-module-cache-path', cache,
      path.join(__dirname, 'generate-ocr-fixture.swift'), destination, ...OCR_LINES],
      {encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024});
    if (run.error || run.status !== 0) {
      throw new Error(run.stderr || run.error?.message || `Swift exited ${run.status}`);
    }
    const recipe = JSON.parse(run.stdout);
    const source = {generator: 'tests/fixtures/generate-ocr-fixture.cjs', ...recipe,
      sha256: createHash('sha256').update(fs.readFileSync(destination)).digest('hex')};
    fs.writeFileSync(path.join(__dirname, 'synthetic-ocr-source.json'), JSON.stringify(source, null, 2) + '\n');
    return source;
  } finally {
    fs.rmSync(cache, {recursive: true, force: true});
  }
}

if (require.main === module) console.log(JSON.stringify(generateOcrFixture(), null, 2));
module.exports = {generateOcrFixture, OCR_LINES};
