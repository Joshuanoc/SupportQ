import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('daily QA fixture has exactly 50 scenarios',()=>{
 const d=JSON.parse(fs.readFileSync(new URL('./fixtures/daily/2026-10-09.json',import.meta.url)));
 assert.equal(d.scenarios.length,50);
 assert.equal(d.caseCount,200);
});
