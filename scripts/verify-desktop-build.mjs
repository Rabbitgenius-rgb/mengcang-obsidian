import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

// Inspect output without requiring main.cjs, launching Electron, or reading a
// user's library. Native behavior is exercised separately by regression tests.
export async function verifyDesktopBuild(target, expectedVersion) {
  const manifest = JSON.parse(await fs.readFile(path.join(target, 'package.json'), 'utf8'));
  assert.equal(manifest.version, expectedVersion, 'Desktop output version must match package.json');
  assert.equal(manifest.main, 'main.cjs');

  // Resolve dependencies from the copied output, not the source tree. Only Node
  // builtins, Electron, and the optional isolated-candidate config may be external.
  const result = await build({
    absWorkingDir: target,
    entryPoints: ['main.cjs', 'preload.cjs', 'mengcang-mcp.cjs'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    outdir: '.verification',
    write: false,
    metafile: true,
    external: ['electron', './candidate-config.json'],
    logLevel: 'silent',
  });
  for (const input of Object.keys(result.metafile.inputs)) {
    const relative = path.relative(target, path.resolve(target, input));
    assert.ok(relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
      `Desktop output resolves a dependency outside its bundle: ${input}`);
  }
  const allowedExternals = new Set([
    ...builtinModules, ...builtinModules.map(name => `node:${name}`),
    'electron', './candidate-config.json',
  ]);
  for (const output of Object.values(result.metafile.outputs)) {
    for (const dependency of output.imports) {
      assert.ok(!dependency.external || allowedExternals.has(dependency.path),
        `Desktop output has an unpackaged dependency: ${dependency.path}`);
    }
  }

  const renderer = path.join(target, 'renderer');
  const html = await fs.readFile(path.join(renderer, 'index.html'), 'utf8');
  const assetReferences = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(match => match[1]);
  assert.ok(assetReferences.some(reference => /\.js(?:[?#]|$)/.test(reference)),
    'Renderer index must reference a compiled JavaScript entry');
  for (const reference of assetReferences) {
    const url = new URL(reference, 'https://desktop.invalid/');
    assert.equal(url.origin, 'https://desktop.invalid', `Renderer entry must be local: ${reference}`);
    const file = path.resolve(renderer, `.${decodeURIComponent(url.pathname)}`);
    const relative = path.relative(renderer, file);
    assert.ok(relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
    assert.ok((await fs.stat(file)).isFile(), `Missing renderer entry asset: ${reference}`);
  }
  for (const directory of ['cmaps', 'standard_fonts', 'wasm']) {
    assert.ok((await fs.readdir(path.join(renderer, 'pdf-assets', directory))).length > 0,
      `Missing local PDF resources: ${directory}`);
  }
  for (const license of ['renderer/pdf-assets/LICENSE', 'html-parser-LICENSE.txt', 'html-parser-entities-LICENSE.txt']) {
    assert.ok((await fs.stat(path.join(target, license))).size > 0, `Missing bundled license: ${license}`);
  }
  for (const asset of ['mengcang-mark.svg', 'inspiration-placeholder.svg']) {
    const stat = await fs.stat(path.join(renderer, 'assets', asset));
    assert.ok(stat.isFile() && stat.size > 0, `Missing or empty bundled asset: ${asset}`);
  }

  const helper = path.join(target, 'discovery-helper');
  await fs.access(helper, constants.X_OK);
  const architecture = spawnSync('lipo', ['-archs', helper], { encoding: 'utf8' });
  if (architecture.error) throw architecture.error;
  assert.equal(architecture.status, 0, architecture.stderr || 'Cannot inspect the native helper');
  assert.equal(architecture.stdout.trim(), 'arm64', 'Native helper must match the desktop arm64 target');
  console.log('Verified desktop module closure, renderer entry, PDF resources, licenses, and arm64 helper.');
}
