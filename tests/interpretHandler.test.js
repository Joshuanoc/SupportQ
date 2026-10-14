import test from 'node:test';
import assert from 'node:assert/strict';
import {makeInterpretHandler} from '../server/interpretHandler.js';
import {validateInterpretation} from '../server/interpretation.js';
const output={scenarioId:'wifi-no-internet',answerValue:'shared',facts:[{key:'scope',value:'shared',quote:'none work'}],needsClarification:false};
async function request(overrides={},dependencies={}) {
  let generated=0,reserved=0;
  const handler=makeInterpretHandler({authenticate:async()=>({}),reserve:async()=>{reserved++;return true},generate:async()=>{generated++;return output},...dependencies});
  const req={method:'POST',headers:{host:'supportq.test',origin:'https://supportq.test','content-type':'application/json',authorization:'Bearer test'},body:{text:'none work'},...overrides};
  const res={headers:{},setHeader(k,v){this.headers[k]=v},status(s){this.statusCode=s;return this},json(j){this.body=j;return this}};
  await handler(req,res);return {...res,generated,reserved};
}
test('AI requires authentication before any quota or model use',async()=>{
  const r=await request({headers:{host:'supportq.test','content-type':'application/json'}});assert.equal(r.statusCode,401);assert.equal(r.generated,0);
  const invalid=await request({}, {authenticate:async()=>null});assert.equal(invalid.statusCode,401);assert.equal(invalid.generated,0);
});
test('AI enforces JSON, method, origin and input bounds',async()=>{
  for(const [overrides,status] of [[{method:'GET'},405],[{headers:{host:'supportq.test',origin:'https://evil.test','content-type':'application/json'}},403],[{headers:{'content-type':'text/plain'}},415],[{body:{text:'x'.repeat(4001)}},400],[{body:'{bad'},400],[{body:{text:'hi',padding:'x'.repeat(16001)}},413]]){const r=await request(overrides);assert.equal(r.statusCode,status);assert.equal(r.generated,0)}
});
test('Unavailable model configuration never invokes the model',async()=>{
  const r=await request({}, {configured:()=>false});assert.equal(r.statusCode,503);assert.equal(r.generated,0);
});
test('Quota blocks calls and transient failures return safe fallback',async()=>{
  assert.equal((await request({}, {reserve:async()=>false})).statusCode,429);
  const r=await request({}, {generate:async()=>{throw new Error('private provider details')}});assert.equal(r.statusCode,503);assert.ok(!r.body.error.includes('private'));
});
test('Only registered scenarios, allowed answers and grounded quotes are accepted',async()=>{
  const r=await request();assert.equal(r.statusCode,200);assert.equal(r.body.confirmationRequired,true);
  assert.throws(()=>validateInterpretation({...output,scenarioId:'invented'},'none work'));
  assert.throws(()=>validateInterpretation(output,'none work',{options:[{value:'yes'}]}));
  const result=validateInterpretation({...output,facts:[{key:'scope',value:'shared',quote:'invented claim'}]},'none work');assert.deepEqual(result.facts,[]);
});
test('Oversized question and malicious output cannot change diagnostics',async()=>{
  const r=await request({body:{text:'none work',question:{prompt:'x'.repeat(1001),options:[]}}});assert.equal(r.statusCode,400);
  const invalid=await request({}, {generate:async()=>({...output,scenarioId:'delete_database'})});assert.equal(invalid.statusCode,503);
});
test('Malformed question options are safely rejected before quota or model use',async()=>{
  for(const question of [null,false,0,'',[],{prompt:'Question',options:[null]},{prompt:'Question',options:[false]},{prompt:'Question',options:[[]]}]){
    const r=await request({body:{text:'none work',question}});
    assert.equal(r.statusCode,400);assert.equal(r.reserved,0);assert.equal(r.generated,0);
    assert.equal(r.headers['Cache-Control'],'no-store');
    assert.equal(r.body.error,'Invalid question context');
  }
  const valid=await request({body:{text:'none work',question:{prompt:'Scope?',options:[{value:'shared',label:'All devices'}]}}});
  assert.equal(valid.statusCode,200);assert.equal(valid.reserved,1);assert.equal(valid.generated,1);
});
test('Raw whitespace and UTF-8 byte overflow are rejected without quota or model use',async()=>{
  for(const body of [' '.repeat(16001)+'{"text":"hi"}',{text:'hi',padding:'😀'.repeat(4000)}]){
    const r=await request({body});assert.equal(r.statusCode,413);assert.equal(r.reserved,0);assert.equal(r.generated,0);
  }
});
