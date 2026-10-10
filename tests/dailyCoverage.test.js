import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('daily QA fixture has 50 unique scenarios and 200 structured cases',()=>{
 const d=JSON.parse(fs.readFileSync(new URL('./fixtures/daily/2026-10-09.json',import.meta.url)));
 assert.equal(d.scenarios.length,50);
 assert.equal(d.caseCount,200);
 const ids=new Set(),titles=new Set(),caseIds=new Set();
 for(const item of d.scenarios){
  assert.ok(!ids.has(item.id),'duplicate ID: '+item.id);ids.add(item.id);
  const title=item.title.toLowerCase().replace(/[^a-z0-9]/g,'');
  assert.ok(!titles.has(title),'duplicate title: '+item.title);titles.add(title);
  assert.equal(item.status,'proposed-not-executed');
  assert.equal(item.testCases.length,4);
  assert.deepEqual(item.testCases.map(c=>c.type).sort(),['accessibility','negative','positive','security']);
  for(const c of item.testCases){
   assert.ok(!caseIds.has(c.id));caseIds.add(c.id);
   assert.equal(c.steps.length,3);
   assert.ok(c.steps[0].startsWith('Given '));
   assert.ok(c.steps[1].startsWith('When '));
   assert.ok(c.steps[2].startsWith('Then '));
   assert.ok(c.expected.length>10);
  }
 }
});
