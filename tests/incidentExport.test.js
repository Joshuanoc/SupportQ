import test from 'node:test';
import assert from 'node:assert/strict';
import {copySanitizedIncident,sanitizeIncidentText} from '../src/incidentExport.js';

test('ordinary diagnostic evidence remains useful',()=>{
  const source='SAP material document 4900123456 failed for movement type 343 on WBS PRJ-2026-04.';
  assert.equal(sanitizeIncidentText(source),source);
});

test('labeled credentials and one-time codes are redacted',()=>{
  const output=sanitizeIncidentText('password: Winter2026! otp=938441 api_key: abcdef123456789 access token=token-value-123');
  assert.equal(output,'password: [REDACTED] otp=[REDACTED] api_key: [REDACTED] access token=[REDACTED]');
});

test('authorization headers and known token formats are redacted',()=>{
  const output=sanitizeIncidentText([
    'Authorization: Bearer abc.def_123456789',
    'Authorization: Basic dXNlcjpwYXNzd29yZA==',
    'JWT eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature123',
    'GitHub ghp_abcdefghijklmnopqrstuvwxyz123456',
    'Supabase sb_secret_abcdefghijklmnopqrstuvwxyz',
    'Stripe sk_test_abcdefghijklmnopqrstuvwxyz',
    'AWS AKIAABCDEFGHIJKLMNOP',
  ].join('\n'));
  for(const secret of ['abc.def_123456789','dXNlcjpwYXNzd29yZA==','eyJhbGciOiJIUzI1NiJ9','ghp_abcdefghijklmnopqrstuvwxyz123456','sb_secret_abcdefghijklmnopqrstuvwxyz','sk_test_abcdefghijklmnopqrstuvwxyz','AKIAABCDEFGHIJKLMNOP']){
    assert.ok(!output.includes(secret),`export retained ${secret}`);
  }
  assert.match(output,/Bearer \[REDACTED\]/);
  assert.match(output,/Basic \[REDACTED\]/);
  assert.match(output,/\[TOKEN \[REDACTED\]\]/);
});

test('private keys are removed as a complete block',()=>{
  const output=sanitizeIncidentText('before\n-----BEGIN PRIVATE KEY-----\nvery-secret-key-material\n-----END PRIVATE KEY-----\nafter');
  assert.equal(output,'before\n[PRIVATE KEY [REDACTED]]\nafter');
});

test('contact, identity, payment and URL credentials are redacted',()=>{
  const output=sanitizeIncidentText('Email alice@example.com phone: +1 (902) 555-0199 SIN: 123 456 789 card number=4111 1111 1111 1111 URL https://alice:secret-pass@example.test/path');
  for(const secret of ['alice@example.com','+1 (902) 555-0199','123 456 789','4111 1111 1111 1111','secret-pass']) assert.ok(!output.includes(secret));
  assert.match(output,/\[EMAIL \[REDACTED\]\]/);
  assert.match(output,/phone: \[REDACTED\]/);
  assert.match(output,/SIN: \[REDACTED\]/);
  assert.match(output,/card number=\[REDACTED\]/);
});

test('unlabeled operational numbers are not treated as sensitive values',()=>{
  const source='Document 4900123456, company code 1000, plant 1710, movement 343, error M7 021.';
  assert.equal(sanitizeIncidentText(source),source);
});

test('line endings are normalized and unsafe control characters removed',()=>{
  assert.equal(sanitizeIncidentText('first\r\nsecond\rthird\u0000\u0007'),'first\nsecond\nthird');
});

test('oversized exports are capped and clearly marked',()=>{
  const output=sanitizeIncidentText('x'.repeat(100_001));
  assert.equal(output.length,100_000+'\n[EXPORT TRUNCATED]'.length);
  assert.ok(output.endsWith('\n[EXPORT TRUNCATED]'));
});

test('copy writes only sanitized text and reports success',async()=>{
  let copied='';
  const result=await copySanitizedIncident('Issue\npassword: do-not-copy',{writeText:async value=>{copied=value;}});
  assert.deepEqual(result,{ok:true,message:'Incident copied with sensitive values redacted.'});
  assert.equal(copied,'Issue\npassword: [REDACTED]');
});

test('missing clipboard access reports a failure without throwing',async()=>{
  const result=await copySanitizedIncident('Issue',undefined);
  assert.deepEqual(result,{ok:false,message:'Incident could not be copied. Clipboard access is unavailable.'});
});

test('clipboard rejection reports a safe failure without exception details',async()=>{
  const result=await copySanitizedIncident('Issue',{writeText:async()=>{throw new Error('secret browser detail');}});
  assert.equal(result.ok,false);
  assert.match(result.message,/could not be copied/i);
  assert.doesNotMatch(result.message,/secret browser detail/);
});

test('common prose beginning with Basic is not over-redacted',()=>{
  const source='Basic troubleshooting confirms the printer is online.';
  assert.equal(sanitizeIncidentText(source),source);
});
