import test from 'node:test';
import assert from 'node:assert/strict';
import {wifiFlow,initialHypotheses,applyBoosts,calculatePriority,parseDiagnosticText,getNode} from '../src/diagnosticEngine.js';
import {scenarioProfiles,profileFor,profileHypotheses,interpretGeneric} from '../src/scenarioEngines.js';

function validateGraph(nodes, name){
  for(const [id,node] of Object.entries(nodes)){
    assert.ok(['choice','action','text'].includes(node.type), `${name}:${id} invalid node type`);
    assert.ok(node.prompt, `${name}:${id} missing prompt`);
    if(node.type==='choice'){
      assert.ok(Array.isArray(node.options)&&node.options.length>0, `${name}:${id} choice without options`);
      for(const o of node.options){
        assert.ok(o.label, `${name}:${id} option missing label`);
        if(o.next) assert.ok(nodes[o.next], `${name}:${id} points to missing node ${o.next}`);
        if(o.resolve){assert.ok(o.resolve.cause);assert.ok(Number.isFinite(o.resolve.confidence));}
        if(o.escalate){assert.ok(o.escalate.team);assert.ok(o.escalate.reason);}
        assert.ok(o.next||o.resolve||o.escalate, `${name}:${id} option has no terminal or next`);
      }
    }
    if(node.type==='action'){
      assert.ok(node.action, `${name}:${id} missing action`);
      assert.ok(node.expected, `${name}:${id} missing expected result`);
      assert.ok(Array.isArray(node.outcomes)&&node.outcomes.length>0, `${name}:${id} action without outcomes`);
      for(const o of node.outcomes){
        if(o.next) assert.ok(nodes[o.next], `${name}:${id} outcome points to missing node ${o.next}`);
        if(o.resolve){assert.ok(o.resolve.cause);assert.ok(Number.isFinite(o.resolve.confidence));}
        if(o.escalate){assert.ok(o.escalate.team);assert.ok(o.escalate.reason);}
        assert.ok(o.next||o.resolve||o.escalate, `${name}:${id} outcome has no terminal or next`);
      }
    }
    if(node.type==='text'){
      assert.ok(node.why, `${name}:${id} text node missing why`);
    }
  }
}

test('Wi-Fi graph integrity',()=>validateGraph(wifiFlow,'wifi'));

test('All deep scenario graphs are structurally valid',()=>{
  for(const [name,p] of Object.entries(scenarioProfiles)){
    assert.ok(p.nodes[p.start], `${name} missing start node`);
    validateGraph(p.nodes,name);
  }
});

test('Expected scenario profiles exist',()=>{
  const ids=['vpn-failure','locked-account','outlook-send','slow-pc','printer-offline','phishing','onedrive-sync','app-crash','camera-teams','azure-access','disk-full'];
  for(const id of ids) assert.ok(profileFor(id), `Missing ${id}`);
});

test('Profile hypotheses are normalized objects',()=>{
  const hs=profileHypotheses('vpn-failure');
  assert.ok(hs.length>=3);
  assert.ok(hs.every(h=>typeof h.name==='string'&&Number.isFinite(h.score)));
});

test('Hypothesis boost reorders and normalizes scores',()=>{
  const out=applyBoosts(initialHypotheses(),{'DNS resolution failure':40,'ISP outage':-7});
  assert.equal(out[0].name,'DNS resolution failure');
  assert.ok(out.every(x=>x.score>=0&&x.score<=100));
  const total=out.reduce((s,x)=>s+x.score,0);
  assert.ok(total>=98&&total<=102);
});

test('Priority: security event is P1',()=>{
  assert.deepEqual(calculatePriority({},'Security'),{priority:'P1',severity:'Critical',reason:'Security event'});
});

test('Priority: site-wide incident is P1',()=>{
  assert.equal(calculatePriority({scope:'Everyone / site-wide'},'Network').priority,'P1');
});

test('Priority: several users is P2',()=>{
  assert.equal(calculatePriority({scope:'Several users'},'Peripheral').priority,'P2');
});

test('Priority: work blocked is P2',()=>{
  assert.equal(calculatePriority({impact:'I cannot work'},'Endpoint').priority,'P2');
});

test('APIPA is detected',()=>{
  const r=parseDiagnosticText('ip_check','IPv4 Address: 169.254.18.22');
  assert.equal(r.next,'dhcp_failure');
});

test('DHCP unreachable is detected',()=>{
  const r=parseDiagnosticText('freeform_error','Unable to contact your DHCP server.');
  assert.equal(r.next,'adapter_check');
});

test('Gateway timeout routes to gateway failure',()=>{
  const r=parseDiagnosticText('gateway_test','Request timed out.');
  assert.equal(r.next,'gateway_fail');
});

test('Public IP success routes to DNS test',()=>{
  const r=parseDiagnosticText('public_ip_test','Reply from 1.1.1.1: bytes=32 time=20ms TTL=57');
  assert.equal(r.next,'dns_test');
});

test('DNS success continues diagnosis instead of claiming resolution',()=>{
  const r=parseDiagnosticText('dns_test','Server: 10.0.0.1\nNon-authoritative answer:\nName: google.com\nAddress: 142.250.72.14');
  assert.equal(r.next,'browser_test');
  assert.equal(r.resolve,undefined);
  assert.match(r.summary,/requires retest/i);
  assert.ok(r.boosts?.['Browser/application issue']>0);
});

test('NXDOMAIN wins over nslookup server metadata',()=>{
  const r=parseDiagnosticText('dns_test','Server: 10.0.0.1\nAddress: 10.0.0.1#53\n*** server can\'t find intranet.example: NXDOMAIN');
  assert.equal(r.next,'dns_settings');
  assert.match(r.summary,/nxdomain/i);
  assert.ok(r.boosts?.['DNS resolution failure']>0);
});

test('SERVFAIL wins over dig answer metadata',()=>{
  const r=parseDiagnosticText('dns_test',';; SERVER: 10.0.0.1#53\n;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL');
  assert.equal(r.next,'dns_settings');
  assert.match(r.summary,/error|refusal/i);
  assert.ok(r.boosts?.['DNS resolution failure']>0);
});

test('unavailable alternate-network test avoids a disruptive stack reset',()=>{
  const option=wifiFlow.adapter_check.options.find(item=>item.value==='cant_test');
  assert.equal(option.next,'driver_health');
  assert.notEqual(option.next,'stack_reset');
});

test('DNS timeout routes to DNS fix',()=>{
  const r=parseDiagnosticText('dns_test','DNS request timed out.');
  assert.equal(r.next,'dns_fix');
});

test('Valid private IP routes to gateway test',()=>{
  const r=parseDiagnosticText('ip_check','IPv4 Address: 192.168.1.25\nDefault Gateway: 192.168.1.1');
  assert.equal(r.next,'gateway_test');
});

test('Wi-Fi auth error routes to authentication branch',()=>{
  const r=parseDiagnosticText('freeform_error','Authentication failed: certificate required');
  assert.equal(r.next,'wifi_auth');
});

test('Admin-required evidence returns justified escalation',()=>{
  const r=parseDiagnosticText('freeform_error','Access is denied. Administrator privileges required.');
  assert.equal(r.escalate.team,'Desktop Support');
  assert.ok(r.escalate.reason);
});

test('Azure authorization error routes to Azure error handling',()=>{
  const r=interpretGeneric('azure-access','activity_log','403 AuthorizationFailed');
  assert.ok(r.next==='azure_error'||r.escalate);
});

test('Slow PC high CPU evidence changes branch',()=>{
  const r=interpretGeneric('slow-pc','resources','CPU 94% Memory 70%');
  assert.equal(r.next,'disk');
  assert.ok(r.boosts?.['High CPU/memory']>0);
});

test('Known camera not-found signature routes to device health',()=>{
  const r=interpretGeneric('camera-teams','teams_error','0xA00F4244 no camera found');
  assert.equal(r.next,'device_health');
});

test('Generic unknown evidence must not immediately escalate solely because it is unknown',()=>{
  const r=interpretGeneric('vpn-failure','vpn_error','The icon flashes blue twice and then returns to disconnected.');
  assert.ok(!r.escalate, 'Unknown evidence should continue diagnosis or request clarification, not immediately escalate');
});

test('getNode falls back safely',()=>{
  assert.equal(getNode('not-real').id,'freeform_error');
});
