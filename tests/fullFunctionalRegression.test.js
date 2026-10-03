import test from 'node:test';
import assert from 'node:assert/strict';
import { scenarios as itScenarios } from '../src/data.js';
import { sapScenarios } from '../src/sapData.js';
import { extendedItScenarios, extendedSapScenarios } from '../src/coverageScenarios.js';
import { routingScenarios } from '../src/routingScenarios.js';
import { classifyIssue } from '../src/issueClassifier.js';
import { getActionGuide } from '../src/guidance.js';
import { requiresDeviceContext } from '../src/diagnosticPolicy.js';

const scenarios=[...itScenarios,...sapScenarios,...extendedItScenarios,...extendedSapScenarios,...routingScenarios];
const byId=new Map(scenarios.map(s=>[s.id,s]));

const variants=text=>[
 text,
 text.toUpperCase(),
 `  ${text}  `,
 text.replace(/can't/gi,'cant').replace(/cannot/gi,"can't"),
 text.replace(/[.?!]+$/,'')+'!'
];

test('scenario IDs are unique and every scenario has a complete support contract',()=>{
 assert.equal(byId.size,scenarios.length,'Duplicate scenario IDs found');
 for(const s of scenarios){
  assert.ok(s.id, 'Scenario missing id');
  assert.ok(s.category, `${s.id}: missing category`);
  assert.ok(s.title, `${s.id}: missing title`);
  assert.ok(['P1','P2','P3','P4'].includes(s.priority), `${s.id}: invalid priority ${s.priority}`);
  assert.ok(s.severity, `${s.id}: missing severity`);
  assert.ok(Array.isArray(s.symptoms)&&s.symptoms.length>0, `${s.id}: no routing symptoms`);
  assert.ok(Array.isArray(s.hypotheses)&&s.hypotheses.length>0, `${s.id}: no hypotheses`);
  assert.ok(Array.isArray(s.steps)&&s.steps.length>0, `${s.id}: no diagnostic workflow`);
 }
});

test('every scenario title routes back to its intended support function',()=>{
 const failures=[];
 for(const s of scenarios){
  const matches=classifyIssue(s.title,scenarios);
  if(!matches.length||matches[0].s.id!==s.id){
   failures.push(`${s.id}: "${s.title}" -> ${matches[0]?.s.id||'NO MATCH'}`);
  }
 }
 assert.equal(failures.length,0,`Incorrect title routing (${failures.length}):\n${failures.join('\n')}`);
});

test('every configured enquiry/symptom routes to the intended function',()=>{
 const failures=[];
 for(const s of scenarios){
  for(const enquiry of s.symptoms){
   const matches=classifyIssue(enquiry,scenarios);
   if(!matches.length||matches[0].s.id!==s.id){
    failures.push(`${s.id}: "${enquiry}" -> ${matches[0]?.s.id||'NO MATCH'}`);
   }
  }
 }
 assert.equal(failures.length,0,`Incorrect symptom routing (${failures.length}):\n${failures.join('\n')}`);
});

test('routing is stable for case, whitespace and common wording variants',()=>{
 const failures=[];
 const highSignal=scenarios.filter(s=>s.symptoms.some(x=>x.length>=12));
 for(const s of highSignal){
  const enquiry=s.symptoms.find(x=>x.length>=12);
  for(const variant of variants(enquiry)){
   const matches=classifyIssue(variant,scenarios);
   if(!matches.length||matches[0].s.id!==s.id){
    failures.push(`${s.id}: "${variant}" -> ${matches[0]?.s.id||'NO MATCH'}`);
   }
  }
 }
 assert.equal(failures.length,0,`Variant routing regressions (${failures.length}):\n${failures.join('\n')}`);
});

test('classifier is deterministic and does not change answer for identical enquiry',()=>{
 for(const s of scenarios){
  const enquiry=s.symptoms[0];
  const a=classifyIssue(enquiry,scenarios).map(x=>[x.s.id,x.score]);
  const b=classifyIssue(enquiry,scenarios).map(x=>[x.s.id,x.score]);
  assert.deepEqual(a,b,`${s.id}: non-deterministic routing`);
 }
});

test('all diagnostic branches point to a next step or a usable result',()=>{
 for(const s of scenarios){
  s.steps.forEach((step,index)=>{
   assert.ok(step.q,`${s.id} step ${index}: missing question`);
   assert.ok(step.help,`${s.id} step ${index}: missing diagnostic purpose`);
   for(const answer of ['yes','no']){
    const branch=step[answer];
    assert.ok(branch,`${s.id} step ${index}: missing ${answer} branch`);
    const hasNext=Number.isInteger(branch.next);
    const hasResult=Boolean(branch.result);
    assert.ok(hasNext||hasResult,`${s.id} step ${index} ${answer}: dead-end branch`);
    if(hasNext) assert.ok(s.steps[branch.next],`${s.id} step ${index} ${answer}: invalid next step ${branch.next}`);
    if(hasResult){
     assert.ok(branch.cause,`${s.id} step ${index} ${answer}: result missing root cause`);
     assert.ok(Number.isFinite(branch.confidence),`${s.id} step ${index} ${answer}: result missing confidence`);
     assert.ok(Array.isArray(branch.actions)&&branch.actions.length>0,`${s.id} step ${index} ${answer}: result has no actions`);
    }
   }
  });
 }
});

test('every resolution action returns instructions, purpose and expected result',()=>{
 const failures=[];
 for(const s of scenarios){
  for(const step of s.steps){
   for(const answer of ['yes','no']){
    const branch=step[answer];
    if(!branch?.result||!Array.isArray(branch.actions)) continue;
    for(const action of branch.actions){
     const guide=getActionGuide(action,'Windows 11',s.id);
     if(!guide?.title||!guide?.why||!Array.isArray(guide?.steps)||guide.steps.length===0||!guide?.expected){
      failures.push(`${s.id}: ${action}`);
     }
    }
   }
  }
 }
 assert.equal(failures.length,0,`Actions without performable guidance (${failures.length}):\n${failures.join('\n')}`);
});

test('critical routing regressions never return unrelated support functions',()=>{
 const cases=[
  ['material document cant be cancelled in sap','sap-material-document-reversal'],
  ['Cannot cancel material document in MIGO','sap-material-document-reversal'],
  ['Wi-Fi connected but no internet','wifi-no-internet'],
  ['VPN will not connect','vpn-failure'],
  ['User account locked','locked-account'],
  ['Outlook cannot send email','outlook-send'],
  ['Computer is very slow','slow-pc'],
  ['Printer shows offline','printer-offline'],
  ['Suspicious phishing email received','phishing'],
  ['OneDrive not syncing files','onedrive-sync'],
  ['Application crashes at launch','app-crash'],
  ['Teams camera not working','camera-teams'],
  ['Azure 403 authorization error','azure-access'],
  ['System disk critically full','disk-full']
 ];
 for(const [enquiry,id] of cases){
  const matches=classifyIssue(enquiry,scenarios);
  assert.ok(matches.length,`No route for: ${enquiry}`);
  assert.equal(matches[0].s.id,id,`"${enquiry}" routed to ${matches[0].s.id}, expected ${id}`);
 }
});


test('SAP business diagnostics never require operating-system context',()=>{
 const sap=scenarios.filter(s=>s.category.toLowerCase().startsWith('sap'));
 assert.ok(sap.length>0,'No SAP scenarios loaded');
 for(const s of sap) assert.equal(requiresDeviceContext(s),false,\`${s.id}: SAP diagnosis incorrectly requires OS/device context\`);
});

test('IT diagnostics retain device context where OS can change troubleshooting',()=>{
 const ids=['wifi-no-internet','vpn-failure','outlook-send','slow-pc','camera-teams'];
 for(const id of ids){
  const s=byId.get(id); assert.ok(s,\`Missing scenario ${id}\`); assert.equal(requiresDeviceContext(s),true,\`${id}: expected device context\`);
 }
});
