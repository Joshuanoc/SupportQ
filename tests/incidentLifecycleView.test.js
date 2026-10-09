import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {IncidentLifecycleTimeline} from '../src/incidentLifecycleView.js';

test('lifecycle timeline uses a labeled semantic list and machine-readable times',()=>{
  const html=renderToStaticMarkup(React.createElement(IncidentLifecycleTimeline,{lifecycle:[
    {status:'Reported',at:'2026-10-09T20:00:00.000Z'},
    {status:'In progress',at:'2026-10-09T20:00:00.000Z'},
    {status:'Resolved',at:'2026-10-09T20:05:00.000Z'},
  ]}));
  assert.match(html,/<details/);
  assert.match(html,/<summary>Lifecycle<\/summary>/);
  assert.match(html,/<ol aria-label="Incident lifecycle">/);
  assert.match(html,/<time dateTime="2026-10-09T20:05:00.000Z">/);
  assert.match(html,/Resolved/);
});

test('missing legacy lifecycle renders no misleading timeline',()=>{
  assert.equal(renderToStaticMarkup(React.createElement(IncidentLifecycleTimeline,{})),'');
});
