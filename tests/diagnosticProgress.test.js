import test from'node:test';
import assert from'node:assert/strict';
import React from'react';
import{renderToStaticMarkup}from'react-dom/server';
import{boundedProgress,DiagnosticProgress}from'../src/DiagnosticProgress.js';

test('preserves and rounds valid diagnostic progress',()=>{
 assert.equal(boundedProgress(42.6),43);
 assert.equal(boundedProgress(100),100);
});

test('clamps progress to the supported range',()=>{
 assert.equal(boundedProgress(-20),0);
 assert.equal(boundedProgress(140),100);
});

test('rejects nonnumeric and nonfinite progress without CSS injection',()=>{
 assert.equal(boundedProgress('100%;background:red'),0);
 assert.equal(boundedProgress(Number.NaN),0);
 assert.equal(boundedProgress(Number.POSITIVE_INFINITY),0);
});

test('renders an accessible diagnostic progressbar',()=>{
 const html=renderToStaticMarkup(React.createElement(DiagnosticProgress,{value:36}));
 assert.match(html,/role="progressbar"/);
 assert.match(html,/aria-label="Diagnostic progress"/);
 assert.match(html,/aria-valuemin="0"/);
 assert.match(html,/aria-valuemax="100"/);
 assert.match(html,/aria-valuenow="36"/);
 assert.match(html,/aria-hidden="true"/);
 assert.match(html,/width:36%/);
});
