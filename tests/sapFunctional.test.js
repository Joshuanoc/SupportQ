import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {scenarios} from '../src/data.js';
import {classifyIssue} from '../src/classifyIssue.js';
import {diagnosticPath,resolutionProgress} from '../src/diagnosticTransitions.js';
const cases=JSON.parse(fs.readFileSync(new URL('./fixtures/sap-functional-cases.json',import.meta.url)));
const scenario=id=>scenarios.find(s=>s.id===id);
function trace(id,answers){const s=scenario(id);let step=0,path;for(const a of answers){assert.ok(!path?.result,'Trace continued after terminal');path=diagnosticPath(s,step,a);step=path.next;}return path;}
for(const c of cases)test(`SAP ${c.number}: ${c.prompt}`,()=>{
 const matches=classifyIssue(c.prompt);
 assert.equal(matches[0]?.s.id,c.expected);
 assert.ok(matches.length===1||matches[0].score>=matches[1].score+3,'Intake must start the expected flow');
});
test('active reversal flow distinguishes downstream invoice, stock, period and authorization',()=>{
 assert.match(trace('sap-material-document-reversal',['no','yes']).cause,/later business transaction/i);
 assert.match(trace('sap-material-document-reversal',['no','no','no']).cause,/quantity or stock type/i);
 assert.match(trace('sap-material-document-reversal',['no','no','yes','yes']).cause,/posting date/i);
 assert.match(trace('sap-material-document-reversal',['no','no','yes','no','yes']).cause,/authorization/i);
 assert.equal(scenario('sap-material-document-reversal').steps.length,7);
});
test('project flow separates object restrictions, budget and organizational mismatch',()=>{
 assert.match(trace('sap-account-assignment',['yes']).cause,/status or validity/);
 assert.match(trace('sap-account-assignment',['no','yes']).cause,/budget/);
 assert.match(trace('sap-account-assignment',['no','no','yes']).cause,/organizational/);
 const r=trace('sap-account-assignment',['no','no','no','no']);assert.equal(r.confidence,0);assert.equal(r.escalate,true);
});
test('MIRO closed period asks a period question before invoice variances',()=>{
 const s=classifyIssue('MIRO posting period closed.')[0].s;
 assert.match(s.steps[0].q,/period is closed/);assert.equal(trace(s.id,['yes']).assignment,'SAP MM/FI');
});
test('IDoc error presence alone cannot confirm a mapping cause',()=>{
 const s=scenario('sap-idoc-data');assert.match(s.steps[0].q,/source value/);
 assert.match(trace(s.id,['yes']).cause,/master-data/);
 const r=trace(s.id,['no','no']);assert.equal(r.confidence,0);assert.equal(r.escalate,true);
});
test('unknown answer never invents a cause or marks a case resolved',()=>{
 const r=trace('sap-material-document-reversal',['unknown']);assert.equal(r.confidence,0);assert.equal(r.escalate,true);assert.match(r.cause,/unknown/);
});
test('generic SAP fallback does not treat having an error as a diagnosis',()=>{
 for(const id of ['sap-mm-extended','sap-fi','sap-basis-runtime','sap-fiori-admin'])for(const choice of ['yes','no']){
  const r=trace(id,[choice]);assert.equal(r.confidence,0);assert.equal(r.escalate,true);
 }
});
test('failed remedies continue then escalate; resolution requires a successful retest',()=>{
 assert.deepEqual(resolutionProgress(false,0,2),{phase:'resolve',actionIndex:1});
 assert.equal(resolutionProgress(false,1,2).phase,'escalated');
 assert.equal(resolutionProgress(true,0,2).phase,'resolved');
});
test('all registered SAP branches have valid next steps and terminal actions',()=>{
 assert.equal(new Set(scenarios.map(s=>s.id)).size,scenarios.length);
 for(const s of scenarios.filter(s=>s.category.startsWith('SAP')))for(const node of s.steps)for(const answer of ['yes','no']){
  const r=node[answer];assert.ok(r);if(r.result){assert.ok(r.cause);assert.ok(r.actions.length);assert.ok(Number.isFinite(r.confidence));}else assert.ok(s.steps[r.next],`${s.id} missing ${r.next}`);
 }
});
