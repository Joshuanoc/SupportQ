import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import{isEvidenceReady,MAX_EVIDENCE_LENGTH}from'../src/evidenceInput.js';

test('accepts meaningful diagnostic evidence',()=>{
 assert.equal(isEvidenceReady('DNS lookup returned NXDOMAIN'),true);
});

test('rejects empty and whitespace-only evidence',()=>{
 assert.equal(isEvidenceReady(''),false);
 assert.equal(isEvidenceReady('   \n\t'),false);
 assert.equal(isEvidenceReady(null),false);
});

test('rejects programmatic evidence above the input safety bound',()=>{
 assert.equal(isEvidenceReady('x'.repeat(MAX_EVIDENCE_LENGTH)),true);
 assert.equal(isEvidenceReady('x'.repeat(MAX_EVIDENCE_LENGTH+1)),false);
});

test('both evidence forms expose their prompt, help, limit, and keyboard shortcut',()=>{
 const source=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
 assert.equal((source.match(/aria-labelledby=\{promptId\}/g)||[]).length,2);
 assert.equal((source.match(/aria-describedby=\{evidenceHintId\}/g)||[]).length,2);
 assert.equal((source.match(/aria-keyshortcuts="Control\+Enter Meta\+Enter"/g)||[]).length,2);
 assert.equal((source.match(/maxLength=\{MAX_EVIDENCE_LENGTH\}/g)||[]).length,2);
 assert.equal((source.match(/disabled=\{!evidenceReady\}/g)||[]).length,2);
});
