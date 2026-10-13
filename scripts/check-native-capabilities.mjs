import assert from 'node:assert/strict';
import os from 'node:os';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {analyze} = require('../desktop/discovery.cjs');

// Use fixed synthetic sentences and the same native entry point as the app.
// Metadata alone is insufficient: each required language must produce a real vector.
const samples = [
  {id: 'zh-Hans', text: '园丁每天给花草浇水，照顾幼苗并翻松土壤。'},
  {id: 'en', text: 'The gardener waters flowers and tends the seedlings every morning.'},
];
const result = await analyze({texts: samples});
const diagnostics = {
  platform: process.platform,
  architecture: process.arch,
  kernel: os.release(),
  semanticLanguages: result.capabilities.semanticLanguages,
  embeddings: result.embeddings.map(({id, language, model, vector}) => ({
    id, language, model, dimensions: vector.length,
    finite: vector.every(Number.isFinite),
  })),
};
console.log(JSON.stringify(diagnostics, null, 2));
for (const {id} of samples) {
  assert.ok(diagnostics.semanticLanguages.includes(id), `Native sentence model unavailable: ${id}`);
  const embedding = diagnostics.embeddings.find(item => item.id === id);
  assert.ok(embedding && embedding.language === id && embedding.dimensions > 0 && embedding.finite,
    `Native sentence model did not return a finite vector: ${id}`);
}
