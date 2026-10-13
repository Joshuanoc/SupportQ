import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreSession,saveSession,confirmedInterpretation} from '../src/sessionPersistence.js';
import {createSession,respond,nextAction,backtrack} from '../src/adaptiveSession.js';
test('Resume reconstructs state and ignores forged terminal status or facts',()=>{
  const original=respond(createSession('My Mac has no internet','wifi-no-internet','id'),{value:'shared'});
  const restored=restoreSession({...original,resolutionStatus:'resolved',knownFacts:{scope:'device',restart:'done'}});
  assert.equal(restored.resolutionStatus,'in_progress');assert.equal(nextAction(restored).id,'restart');
});
test('Intake model observations require a quoted user confirmation and survive correction',()=>{
  const text='Nothing in the house can get online';
  const facts=confirmedInterpretation({facts:[{key:'scope',value:'shared',quote:'Nothing in the house'}]},text);
  const s=createSession(text,'wifi-no-internet','id');s.confirmedIntakeFacts=facts;s.knownFacts.scope='shared';
  const updated=respond(s,{value:'done'}),restored=restoreSession(updated);
  assert.equal(nextAction(restored).id,'lights');assert.equal(nextAction(backtrack(restored)).id,'restart');
  assert.deepEqual(confirmedInterpretation({facts:[{key:'scope',value:'shared',quote:'fabricated'}]},text),[]);
});
test('Invalid saved state is rejected and stale cloud save reports a conflict',async()=>{
  assert.throws(()=>restoreSession({version:1,turns:[]}));
  const s=createSession('No internet','wifi-no-internet','id');
  await assert.rejects(()=>saveSession({rpc:async()=>({error:{code:'40001'}})},s,1),/another device/);
  const revision=await saveSession({rpc:async(name,args)=>{assert.equal(name,'save_supportq_session');assert.equal(args.expected_revision,0);return {data:1}}},s,0);assert.equal(revision,1);
});
