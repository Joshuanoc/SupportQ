import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const folder = new URL('./fixtures/daily/', import.meta.url);
const filenames = fs.readdirSync(folder).filter(n => /^\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();
const load = () => filenames.map(name => ({name, data: JSON.parse(fs.readFileSync(new URL(name, folder), 'utf8'))}));
const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g,'');
function check(items) {
 const errors = [], ids = new Set(), titles = new Set(), caseIds = new Set();
 let scenarios = 0, cases = 0;
 for(const {name,data} of items){
  if(data.date !== name.slice(0,10) || data.status !== 'test-specifications-only' || data.count !== 50 || data.caseCount !== 200 || data.scenarios?.length !== 50) errors.push(name+': invalid fixture totals/status');
  const areas = {};
  for(const s of data.scenarios || []){
   scenarios++; areas[s.area] = (areas[s.area]||0)+1;
   if(ids.has(s.id)) errors.push('duplicate scenario ID '+s.id); ids.add(s.id);
   const title = normalize(s.title || '');
   if(!title || titles.has(title)) errors.push('duplicate normalized title '+s.title); titles.add(title);
   if(s.status !== 'proposed-not-executed') errors.push('unverified execution claim '+s.id);
   if(s.testCases?.length !== 4 || JSON.stringify(s.testCases.map(c=>c.type).sort()) !== JSON.stringify(['accessibility','negative','positive','security'])) errors.push('missing required case type '+s.id);
   for(const c of s.testCases || []){
    cases++;
    if(caseIds.has(c.id)) errors.push('duplicate case ID '+c.id); caseIds.add(c.id);
    if(!c.steps?.[0]?.startsWith('Given ') || !c.steps?.[1]?.startsWith('When ') || !c.steps?.[2]?.startsWith('Then ') || c.steps.slice(3).some(v=>!v.startsWith('And '))) errors.push('invalid Given/When/Then '+c.id);
    if(!c.expected || c.expected.length < 12) errors.push('missing expected result '+c.id);
   }
  }
  if(JSON.stringify(Object.entries(areas).sort()) !== JSON.stringify(Object.entries(data.areas || {}).sort())) errors.push('area mismatch '+name);
 }
 return {errors,scenarios,cases};
}
test('every daily fixture is unique, complete and reconciled with dated ledger',()=>{
 const items=load(), result=check(items);
 assert.ok(items.length >= 3);
 assert.deepEqual(result.errors,[]);
 const ledger=JSON.parse(fs.readFileSync(new URL('../docs/qa/2026-10-12-coverage-ledger.json', import.meta.url),'utf8'));
 assert.equal(ledger.counts.dailyScenariosProposed,result.scenarios);
 assert.equal(ledger.counts.dailyCasesSpecified,result.cases);
 assert.equal(ledger.counts.featuresProposed,items.length*5);
 for(const {data} of items){
  const run=ledger.runs.find(r=>r.date===data.date);
  assert.ok(run,'missing ledger run '+data.date);
  assert.equal(run.scenarios,50);assert.equal(run.caseCount,200);
  assert.equal(run.statuses.automatedFunctionalExecuted,0);
  assert.equal(run.statuses.uiVerified,0);
  assert.equal(run.statuses.accepted,0);
  assert.equal(run.statuses.deployed,0);
 }
});
test('duplicate title across dates fails',()=>{
 const x=structuredClone(load());x[1].data.scenarios[0].title=x[0].data.scenarios[0].title.toUpperCase().replaceAll(' ','-');
 assert.ok(check(x).errors.some(e=>e.includes('duplicate normalized title')));
});
test('missing security case and repeated case ID fail',()=>{
 const x=structuredClone(load());x[0].data.scenarios[0].testCases[2].type='positive';
 x[1].data.scenarios[0].testCases[0].id=x[0].data.scenarios[0].testCases[0].id;
 assert.ok(check(x).errors.some(e=>e.includes('missing required case type')));
 assert.ok(check(x).errors.some(e=>e.includes('duplicate case ID')));
});
