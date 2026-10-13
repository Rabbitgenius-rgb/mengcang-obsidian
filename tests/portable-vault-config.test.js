'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const { LocalVaultGateway } = require('../desktop/local-gateway.cjs');
const { readPairing } = require('../desktop/security.cjs');

function temporaryRoot(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mengcang-portable-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

const captureInput = () => ({
  operationId: '00000000-0000-4000-8000-000000000001',
  title: 'Synthetic portable fixture',
  body: 'A deliberately synthetic local capture.',
});

function blockLibraryAndNetworkIO(t, profileMetadataIO = {}) {
  const calls = [];
  const unexpected = name => () => { calls.push(name); throw new Error('unexpected I/O: ' + name); };
  for (const name of ['statSync', 'lstatSync', 'realpathSync', 'readFileSync', 'readdirSync', 'mkdirSync', 'writeFileSync']) {
    t.mock.method(fs, name, profileMetadataIO[name] || unexpected('fs.' + name));
  }
  for (const name of ['open', 'readFile', 'readdir', 'mkdir', 'writeFile', 'link', 'unlink']) {
    t.mock.method(fs.promises, name, unexpected('fs.promises.' + name));
  }
  t.mock.method(http, 'request', unexpected('http.request'));
  t.mock.method(https, 'request', unexpected('https.request'));
  return calls;
}

async function assertUnconfiguredWorkspace(gateway, id) {
  const state = await gateway.connect();
  assert.equal(state.connected, false);
  assert.equal(state.code, 'NOT_CONFIGURED');
  assert.equal(state.identity.id, id);
  assert.equal(state.identity.path, null);
  assert.equal(gateway.vaultPath, null);
  const snapshot = await gateway.snapshot();
  assert.equal(snapshot.identity.id, id);
  assert.equal(snapshot.identity.path, null);
  for (const field of ['entries', 'materials', 'books', 'projects', 'errors']) assert.deepEqual(snapshot[field], []);
  assert.deepEqual(snapshot.capabilities, { capture: false, captureAttachment: false });
  await assert.rejects(gateway.readNote('01_sources/cards/text/example.md'), { code: 'NOT_CONFIGURED' });
  await assert.rejects(gateway.capture(captureInput()), { code: 'NOT_CONFIGURED' });
  assert.throws(() => readPairing(), { code: 'NOT_CONFIGURED' });
}

test('unconfigured local workspace without a profile cache returns empty data without disk or network access', async t => {
  const calls = blockLibraryAndNetworkIO(t);
  const gateway = new LocalVaultGateway();
  t.after(() => gateway.dispose());
  await assertUnconfiguredWorkspace(gateway, 'unpaired');
  assert.deepEqual(calls, []);
});

test('explicit profile metadata preserves the old workspace id without restoring or accessing its library path', async t => {
  const cachePath = '/synthetic/profile/desktop-cache.json';
  const oldId = 'previous-workspace-uuid';
  const metadataReads = [];
  const cache = JSON.stringify({ snapshot: { identity: { id: oldId, path: '/synthetic/do-not-open-vault' }, entries: [{ title: 'Do not import cached entries' }] } });
  const calls = blockLibraryAndNetworkIO(t, {
    statSync(input) {
      metadataReads.push(['stat', input]);
      assert.equal(input, cachePath);
      return { size: Buffer.byteLength(cache) };
    },
    readFileSync(input, encoding) {
      metadataReads.push(['read', input]);
      assert.equal(input, cachePath);
      assert.equal(encoding, 'utf8');
      return cache;
    },
  });
  const gateway = new LocalVaultGateway({ cachePath });
  t.after(() => gateway.dispose());
  await assertUnconfiguredWorkspace(gateway, oldId);
  assert.deepEqual(metadataReads, [['stat', cachePath], ['read', cachePath]]);
  assert.deepEqual(calls, []);
});

test('a profile without valid identity metadata stays unpaired and never opens a library', async t => {
  const cachePath = '/synthetic/new-profile/desktop-cache.json';
  const metadataReads = [];
  let cache;
  const calls = blockLibraryAndNetworkIO(t, {
    statSync(input) {
      metadataReads.push(['stat', input]);
      assert.equal(input, cachePath);
      if (cache === undefined) throw Object.assign(new Error('Synthetic missing profile cache'), { code: 'ENOENT' });
      return { size: Buffer.byteLength(cache) };
    },
    readFileSync(input, encoding) {
      metadataReads.push(['read', input]);
      assert.equal(input, cachePath);
      assert.equal(encoding, 'utf8');
      return cache;
    },
  });
  for (const content of [undefined, '{}', '{invalid JSON', JSON.stringify({ snapshot: { identity: { id: 12345678 } } }), JSON.stringify({ snapshot: { identity: { id: '../invalid-id' } } })]) {
    cache = content;
    const gateway = new LocalVaultGateway({ cachePath });
    await assertUnconfiguredWorkspace(gateway, 'unpaired');
    gateway.dispose();
    assert.deepEqual(metadataReads.splice(0), content === undefined ? [['stat', cachePath]] : [['stat', cachePath], ['read', cachePath]]);
  }
  assert.deepEqual(calls, []);
});

test('relative and malformed directory options cannot silently resolve against cwd', () => {
  for (const vaultPath of ['', 'relative-materials', false, 42, {}, '/tmp/invalid\0directory']) {
    assert.throws(() => new LocalVaultGateway({ vaultPath }), { code: 'INVALID_CONFIGURATION' });
    assert.throws(() => readPairing(vaultPath), { code: 'INVALID_CONFIGURATION' });
  }
});

test('an explicitly configured but absent directory stays absent and capture remains disabled', async t => {
  const root = temporaryRoot(t);
  const missing = path.join(root, 'not-created');
  const gateway = new LocalVaultGateway({ vaultPath: missing });
  t.after(() => gateway.dispose());
  assert.equal((await gateway.connect()).code, 'VAULT_UNAVAILABLE');
  assert.equal((await gateway.snapshot()).capabilities.capture, false);
  await assert.rejects(gateway.capture(captureInput()), { code: 'ENOENT' });
  assert.equal(fs.existsSync(missing), false);
});

test('an explicitly selected synthetic directory still supports snapshots and explicit capture', async t => {
  const root = temporaryRoot(t);
  const directory = path.join(root, '01_sources/cards/text');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'fixture.md'), '---\ntype: material\nrecord_type: inspiration\ntitle: Synthetic source\n---\nSynthetic original.\n');
  const gateway = new LocalVaultGateway({ vaultPath: root });
  t.after(() => gateway.dispose());
  assert.equal((await gateway.connect()).connected, true);
  const before = await gateway.snapshot();
  assert.equal(before.entries.length, 1);
  assert.equal(before.capabilities.capture, true);
  const result = await gateway.capture(captureInput());
  assert.equal(result.note.title, captureInput().title);
  assert.equal((await gateway.readNote(result.note.path)).markdown.includes(captureInput().body), true);
  assert.equal(fs.readFileSync(path.join(directory, 'fixture.md'), 'utf8').includes('Synthetic original.'), true);
});

test('explicit pairing paths retain the local-only connection policy', t => {
  const root = temporaryRoot(t);
  const directory = path.join(root, '.obsidian/plugins/obsidian-local-rest-api');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'data.json'), JSON.stringify({ bindingHost: '0.0.0.0' }));
  assert.throws(() => readPairing(root), { code: 'UNSAFE_CONNECTION' });
});
