import test from 'node:test';
import assert from 'node:assert/strict';
import { HISTORY_KEY, readIncidentHistory, writeIncidentHistory } from '../src/historyStorage.js';

const incident = (id = 1) => ({ id, scenario: 'Goods receipt failure', category: 'SAP MM', status: 'Escalated', priority: 'P2', confidence: 0, completedAt: '2026-10-09', reportedIssue: 'Synthetic MIGO case', cause: 'Evidence missing', answers: [] });
const store = raw => ({ getItem: key => { assert.equal(key, HISTORY_KEY); return raw; } });

test('valid existing incidents round-trip without losing evidence', () => {
  const entry = { ...incident(), evidence: [{ summary: 'Synthetic check' }] };
  let serialized;
  assert.deepEqual(writeIncidentHistory([entry], () => ({setItem: (key, value) => {assert.equal(key, HISTORY_KEY); serialized = value;}})), {saved: true, warning: ''});
  assert.deepEqual(readIncidentHistory(() => store(serialized)), {history: [entry], warning: ''});
});
for (const raw of [null, '']) test(`missing history is a safe empty state: ${JSON.stringify(raw)}`, () => {
  assert.deepEqual(readIncidentHistory(() => store(raw)), {history: [], warning: ''});
});
for (const raw of ['null', '{}', 'true', '123', '"history"', '[null]', '{broken']) test(`corrupt saved history cannot break consumers: ${raw}`, () => {
  const result = readIncidentHistory(() => store(raw));
  assert.deepEqual(result.history, []);
  assert.match(result.warning, /could not be loaded/);
  assert.doesNotThrow(() => result.history.slice(0, 25).map(h => h.category));
});
test('valid records survive mixed invalid data and duplicate IDs', () => {
  const entries = [null, incident(1), {}, {...incident(2), reportedIssue: {}}, incident(1), incident(3)];
  const result = readIncidentHistory(() => store(JSON.stringify(entries)));
  assert.deepEqual(result.history, [incident(1), incident(3)]);
  assert.ok(result.warning);
});
test('retention keeps the first 25 valid records', () => {
  const entries = Array.from({length: 30}, (_, i) => incident(i));
  assert.deepEqual(readIncidentHistory(() => store(JSON.stringify(entries))).history, entries.slice(0, 25));
  let saved;
  writeIncidentHistory(entries, () => ({setItem: (_, value) => {saved = JSON.parse(value);}}));
  assert.deepEqual(saved, entries.slice(0, 25));
});
test('storage property access failures are contained on read and write', () => {
  const denied = () => {throw new Error('Synthetic access denied');};
  assert.deepEqual(readIncidentHistory(denied).history, []);
  assert.match(readIncidentHistory(denied).warning, /unavailable/);
  assert.equal(writeIncidentHistory([incident()], denied).saved, false);
});
test('getItem failure and unavailable storage return a warning', () => {
  assert.ok(readIncidentHistory(() => ({getItem: () => {throw new Error('Synthetic blocked read');}})).warning);
  assert.ok(readIncidentHistory(() => undefined).warning);
});
test('quota errors preserve the in-memory incident and do not claim success', () => {
  const data = [incident()];
  const result = writeIncidentHistory(data, () => ({setItem: () => {throw new Error('Synthetic quota');}}));
  assert.equal(result.saved, false);
  assert.match(result.warning, /could not be saved/);
  assert.deepEqual(data, [incident()]);
});
test('successful retry clears the failure state', () => {
  assert.deepEqual(writeIncidentHistory([incident()], () => ({setItem: () => {}})), {saved: true, warning: ''});
});
test('read never writes back or removes malformed stored data', () => {
  let writes = 0;
  readIncidentHistory(() => ({getItem: () => 'null', setItem: () => writes++, removeItem: () => writes++}));
  assert.equal(writes, 0);
});
test('oversized history is rejected on read and not written', () => {
  assert.ok(readIncidentHistory(() => store(' '.repeat(1_000_001))).warning);
  let writes = 0;
  const result = writeIncidentHistory([{...incident(), reportedIssue: 'x'.repeat(1_000_001)}], () => ({setItem: () => writes++}));
  assert.equal(result.saved, false);
  assert.equal(writes, 0);
});
test('malformed text fields or confidence cannot reach history render and analytics', () => {
  for (const override of [{cause: {}}, {category: []}, {confidence: -1}, {confidence: 101}, {status: 'Verified'}, {id: null}]) {
    assert.deepEqual(readIncidentHistory(() => store(JSON.stringify([{...incident(), ...override}]))).history, []);
  }
});
test('failure warnings do not expose underlying storage exception contents', () => {
  const failure = () => {throw new Error('PRIVATE_SYNTHETIC_LOG_VALUE');};
  assert.doesNotMatch(readIncidentHistory(failure).warning, /PRIVATE_SYNTHETIC/);
  assert.doesNotMatch(writeIncidentHistory([incident()], failure).warning, /PRIVATE_SYNTHETIC/);
});
test('invalid writes leave existing browser data untouched', () => {
  let writes = 0;
  for (const value of [null, {}, [null], [{...incident(), cause: {}}]]) {
    assert.equal(writeIncidentHistory(value, () => ({setItem: () => writes++})).saved, false);
  }
  assert.equal(writes, 0);
});
