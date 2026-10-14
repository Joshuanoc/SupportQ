import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,nextAction,respond,backtrack} from '../src/adaptiveSession.js';
import {classifyIssue} from '../src/classifyIssue.js';
const wifi=issue=>createSession(issue,'wifi-no-internet','test');
const sap=issue=>createSession(issue,'sap-material-document-reversal','sap-test');
const choose=(s,value)=>respond(s,{value});
test('Initial SAP period evidence bypasses error and document questions',()=>{
  const s=sap('Cannot cancel material document 4900012345 in MBST: posting period closed');
  assert.equal(s.entities.documentNumber,'4900012345');assert.equal(s.entities.transaction,'MBST');
  assert.equal(nextAction(s).id,'datePolicy');
});
test('SAP period follow-up routes directly without restarting intake',()=>{
  let s=sap('Cannot cancel material document 4900012345');
  s=choose(s,'period');assert.equal(nextAction(s).id,'datePolicy');
  assert.equal(s.entities.documentNumber,'4900012345');
});
test('Known shared scope and restart are never requested again',()=>{
  let s=wifi('My Mac has no internet. All devices fail. Already restarted the router.');
  assert.equal(nextAction(s).id,'lights');
  s=choose(s,'unavailable');assert.equal(nextAction(s).id,'outage');
  s=choose(s,'provider_unknown');assert.equal(nextAction(s).id,'cable');
  s=choose(s,'unavailable');assert.equal(nextAction(s).status,'escalated');
  assert.deepEqual(s.unavailableChecks,['lights','cable']);
  assert.ok(!nextAction(s).why.includes('confirmed ISP outage'));
});
test('Changing an answer discards dependent state and conclusions',()=>{
  let s=choose(wifi('Mac Wi-Fi no internet'),'shared');
  s=choose(s,'done');s=choose(s,'alarm');
  s=backtrack(s);assert.equal(nextAction(s).id,'lights');assert.equal(s.knownFacts.lights,undefined);
  s=backtrack(backtrack(s));assert.equal(nextAction(s).id,'scope');
  s=choose(s,'device');assert.equal(nextAction(s).id,'hotspot');
  assert.equal(s.knownFacts.restart,undefined);
});
test('Unavailable scope has a safe alternative',()=>{
  const s=choose(wifi('Mac Wi-Fi no internet'),'unavailable');assert.equal(nextAction(s).id,'hotspot');
});
test('No action or positive clue is automatically a verified resolution',()=>{
  let s=choose(sap('Material document already reversed'),'resolved');
  assert.equal(s.resolutionStatus,'resolved');assert.equal(nextAction(s).status,'resolved');
  s=sap('Material document already reversed');assert.equal(s.resolutionStatus,'in_progress');
  assert.equal(nextAction(s).id,'verification');
});
test('SAP unavailable policy escalates with authorization boundary',()=>{
  const s=choose(sap('Posting period closed'),'unavailable');
  assert.equal(nextAction(s).status,'escalated');assert.match(nextAction(s).why,/without business approval/);
});
test('Free-text period error and unavailable check are understood',()=>{
  let s=respond(sap('Cancel material document'),{text:'Posting period is closed'});
  assert.equal(nextAction(s).id,'datePolicy');
  s=respond(s,{text:'I cannot check'});assert.equal(nextAction(s).status,'escalated');
});
test('Invalid, empty and oversized answers are rejected without state mutation',()=>{
  const s=wifi('No internet');
  for(const payload of [{value:'bogus'},{text:''},{text:'x'.repeat(4001)},{text:'banana'}])assert.throws(()=>respond(s,payload));
  assert.equal(s.turns.length,0);
});
test('Common misspellings still route SAP reversal correctly',()=>{
  assert.equal(classifyIssue('cancle materail documnet 4900012345')[0].s.id,'sap-material-document-reversal');
});
test('Unrecognized exact error remains evidence rather than model-confirmed cause',()=>{
  let s=choose(sap('Cannot cancel material document'),'other');
  s=respond(s,{text:'Unrecognized error Z123'});
  assert.equal(nextAction(s).status,'escalated');assert.equal(s.evidence.at(-1).text,'Unrecognized error Z123');
});
test('Unavailable verification terminates without repeating the check',()=>{
  const s=choose(sap('Material document already reversed'),'unavailable');
  assert.equal(nextAction(s).status,'escalated');assert.equal(s.resolutionStatus,'escalated');
});
test('An exact error supplied at intake is not requested again',()=>{
  const s=sap('Cannot cancel material document 4900012345: error Z123');
  assert.equal(nextAction(s).status,'escalated');assert.match(s.knownFacts.exactError,/Z123/);
});
