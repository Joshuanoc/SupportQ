import test from 'node:test';
import assert from 'node:assert/strict';
import {completeIncidentLifecycle,startIncidentLifecycle,transitionIncident,validateIncidentLifecycle} from '../src/incidentLifecycle.js';

const startAt='2026-10-09T20:00:00.000Z';
const endAt='2026-10-09T20:05:00.000Z';

test('new incident records Reported then In progress with timestamps',()=>{
  const result=startIncidentLifecycle(startAt);
  assert.equal(result.ok,true);
  assert.deepEqual(result.lifecycle,[
    {status:'Reported',at:startAt},
    {status:'In progress',at:startAt},
  ]);
});

test('in-progress incident can be resolved',()=>{
  const started=startIncidentLifecycle(startAt).lifecycle;
  const result=completeIncidentLifecycle(started,'Resolved',endAt);
  assert.equal(result.ok,true);
  assert.deepEqual(result.lifecycle.at(-1),{status:'Resolved',at:endAt});
});

test('in-progress incident can be escalated',()=>{
  const started=startIncidentLifecycle(startAt).lifecycle;
  const result=completeIncidentLifecycle(started,'Escalated',endAt);
  assert.equal(result.ok,true);
  assert.deepEqual(result.lifecycle.at(-1),{status:'Escalated',at:endAt});
});

test('transition creates a new timeline without mutating existing history',()=>{
  const started=startIncidentLifecycle(startAt).lifecycle;
  const snapshot=structuredClone(started);
  const result=completeIncidentLifecycle(Object.freeze(started),'Resolved',endAt);
  assert.equal(result.ok,true);
  assert.deepEqual(started,snapshot);
  assert.notEqual(result.lifecycle,started);
});

test('terminal incidents reject further transitions',()=>{
  const resolved=completeIncidentLifecycle(startIncidentLifecycle(startAt).lifecycle,'Resolved',endAt).lifecycle;
  const result=transitionIncident(resolved,'Escalated','2026-10-09T20:06:00.000Z');
  assert.equal(result.ok,false);
  assert.match(result.error,/Invalid incident transition/);
  assert.equal(result.lifecycle,resolved);
});

test('lifecycle cannot skip directly from Reported to terminal state',()=>{
  const reported=[{status:'Reported',at:startAt}];
  assert.equal(transitionIncident(reported,'Resolved',endAt).ok,false);
});

test('unknown states are rejected',()=>{
  const started=startIncidentLifecycle(startAt).lifecycle;
  assert.equal(transitionIncident(started,'Deleted',endAt).ok,false);
  assert.equal(validateIncidentLifecycle([{status:'Administrator approved',at:startAt}]).ok,false);
});

test('invalid and backwards timestamps are rejected',()=>{
  assert.equal(startIncidentLifecycle('not-a-time').ok,false);
  const started=startIncidentLifecycle(startAt).lifecycle;
  assert.equal(completeIncidentLifecycle(started,'Resolved','2026-10-09T19:59:59.000Z').ok,false);
});

test('parseable but noncanonical timestamps are rejected in supplied history',()=>{
  const noncanonical=[
    {status:'Reported',at:'2026-10-09 20:00:00Z'},
    {status:'In progress',at:'2026-10-09T20:00:00.000Z'},
  ];
  assert.equal(validateIncidentLifecycle(noncanonical).ok,false);
});

test('forged lifecycle chains are rejected before a transition is appended',()=>{
  const forged=[
    {status:'Reported',at:startAt},
    {status:'Resolved',at:endAt},
  ];
  const result=transitionIncident(forged,'Escalated','2026-10-09T20:06:00.000Z');
  assert.equal(result.ok,false);
  assert.match(result.error,/invalid transition/i);
});

test('completion helper accepts terminal states only',()=>{
  const started=startIncidentLifecycle(startAt).lifecycle;
  assert.equal(completeIncidentLifecycle(started,'In progress',endAt).ok,false);
});
