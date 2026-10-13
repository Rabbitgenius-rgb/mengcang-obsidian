'use strict';
// Shared capture-format regression cases retained from the former connector suite.
// These use only synthetic data and the same helpers as LocalVaultGateway.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {randomUUID} = require('node:crypto');
const {hash, frontmatterOf, splitNote} = require('../src/desktop-connector/notes');
const {capturePaths, validateCaptureInput, assertCapturePath, hasCaptureOperation, createCapture} = require('../src/desktop-connector/capture');
const SOURCE = '01_sources/cards/text/source.md';
const sourceText = '---\ntype: material\ntitle: Synthetic parent\n---\nOnly synthetic source material.\n';
const request = extra => ({ operationId: randomUUID(), title: '一个摘录', body: '\n  逐字保留。\r\n\r\n- 原有列表\r\n尾部空格  \n', sourceUrl: '', sourceTitle: '', author: '', page: null, sourcePath: '', expectedSourceHash: '', tags: [], ...extra });
const code = expected => error => error?.code === expected;

test('capture validates exact fields, UUID, links, source versions, pages and reserved metadata', () => {
  const value = request(), accepted = validateCaptureInput(value);
  assert.equal(accepted.body, value.body);
  assert.equal(accepted.path, capturePaths(value.operationId)[0]);
  assert.equal(assertCapturePath(accepted.path), accepted.path);
  for (const patch of [
    { operationId: '../arbitrary' }, { title: '' }, { title: 'x'.repeat(301) }, { body: 'x'.repeat(100001) }, { body: '\ud800' },
    { body: '<!-- mengcang:operation {"id":"injected"} -->' }, { body: '<!-- MENGCANG-relations:start -->' },
    { sourceUrl: 'javascript:alert(1)' }, { sourceUrl: 'https://user:pass@example.test' }, { sourceUrl: ' https://example.test' }, { sourceUrl: 'https://example.test/a\n' }, { sourceUrl: 'https:example.test' }, { sourceUrl: 'https:\\example.test' },
    { page: 0 }, { page: 1.1 }, { page: '2' }, { page: 1000001 }, { sourcePath: SOURCE }, { expectedSourceHash: hash(sourceText) },
    { tags: [''] }, { tags: ['a\nb'] }, { tags: 'tag' }, { destination: '03_projects/arbitrary.md' }, { vaultPath: '/arbitrary' },
    { caption: 'x'.repeat(50001) }, { caption: {} }, { importFingerprint: 'wrong-prefix' }, { importFingerprint: 'highlight-v1:bad\nmarker' },
    { importFingerprint: `highlight-v1:${'x'.repeat(139)}` }, { importFingerprint: 'highlight-v1:bad\x7fmarker' },
    { sourceLocation: 'x'.repeat(1001) }, { sourceLocation: 123 }, { sourceLocation: 'Location 123\n124' }, { sourceLocation: 'Location 123\t124' }, { sourceLocation: 'Location 123\x7f124' },
  ]) assert.throws(() => validateCaptureInput({ ...value, ...patch }));
  assert.throws(() => assertCapturePath('01_sources/cards/text/capture-not-a-uuid.md'), code('PATH_FORBIDDEN'));
  const web = validateCaptureInput(request({ body: '', sourceUrl: 'https://example.test/a?x=1#anchor', page: 3, tags: [' visual ', 'visual'] }));
  assert.equal(web.sourceUrl, 'https://example.test/a?x=1#anchor'); assert.deepEqual(web.tags, ['visual']);
  assert.equal(web.path, capturePaths(web.operationId)[1]);
});

test('new Markdown preserves excerpt bytes and provenance without implicit knowledge relations', () => {
  const raw = request({ sourceUrl: 'https://example.test/article?x=1#p2', sourceTitle: '原网页标题', author: '作者', sourcePath: SOURCE, expectedSourceHash: hash(sourceText), page: 2, tags: ['excerpt'], caption: '我的补充说明\n不会混入逐字高亮', importFingerprint: 'highlight-v1:source-specific-id' });
  const input = validateCaptureInput(raw), markdown = createCapture(input, '2026-10-02T00:00:00.000Z');
  assert.equal(splitNote(markdown).body, raw.body);
  const fields = frontmatterOf(markdown);
  assert.equal(fields.type, 'material'); assert.equal(fields.record_type, 'excerpt'); assert.equal(fields.status, 'inbox'); assert.equal(fields.rights, 'unknown');
  assert.equal(fields.source_url, raw.sourceUrl); assert.equal(fields.source_title, raw.sourceTitle); assert.equal(fields.author, raw.author);
  assert.equal(fields.source_page, 2); assert.equal(fields.source_note, SOURCE); assert.equal(fields.source_note_sha256, hash(sourceText));
  assert.equal(fields.excerpt_sha256, hash(raw.body));
  assert.equal(fields.caption, raw.caption); assert.equal(fields.import_fingerprint, raw.importFingerprint);
  assert.equal(splitNote(markdown).body.includes(raw.caption), false);
  assert.equal(fields.relation_candidates, undefined); assert.equal(fields.material_notes, undefined);
  assert.equal(hasCaptureOperation(markdown, input), true);
  assert.throws(() => hasCaptureOperation(markdown, validateCaptureInput({ ...raw, body: `${raw.body}!` })), code('OPERATION_REUSED'));
  assert.throws(() => hasCaptureOperation(markdown, validateCaptureInput({ ...raw, caption: 'different caption' })), code('OPERATION_REUSED'));
  assert.throws(() => hasCaptureOperation(markdown, validateCaptureInput({ ...raw, importFingerprint: 'highlight-v1:different-import' })), code('OPERATION_REUSED'));
});

const pdfBytes=fs.readFileSync(path.join(__dirname,'fixtures/discovery-excerpt.pdf'));
const original=extra=>({name:'原始参考.pdf',type:'application/pdf',size:pdfBytes.length,dataUrl:'data:application/pdf;base64,'+pdfBytes.toString('base64'),...extra});
test('original-file capture reserves a fixed operation folder, validates bytes and preserves text-only identities',()=>{
 const plain=request(),before=validateCaptureInput(plain),without=validateCaptureInput({...plain,attachment:null});assert.equal(before.fingerprint,without.fingerprint);
 const input=validateCaptureInput({...plain,body:'',attachment:original()});assert.equal(input.attachment.sha256,hash(pdfBytes));assert.deepEqual(input.attachment.bytes,pdfBytes);assert.match(input.attachment.path,/^01_sources\/_originals\/capture-[a-f0-9-]+\/[a-f0-9]{64}-[a-f0-9]{64}\.pdf$/);
 for(const attachment of [original({name:'evil.html'}),original({size:1}),original({type:'image/png'}),original({dataUrl:'data:application/pdf;base64,'+Buffer.from('<html>bad</html>').toString('base64')}),original({path:'../anywhere'})])assert.throws(()=>validateCaptureInput({...plain,attachment}),code('INVALID_CAPTURE'));
});
