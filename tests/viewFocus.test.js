import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import{VIEW_HEADING_ID,headingForView,focusViewHeading}from'../src/viewFocus.js';

test('returns concise headings for every supported view',()=>{
 assert.equal(headingForView('dashboard'),'Support workspace');
 assert.equal(headingForView('scenarios'),'Scenario Library');
 assert.equal(headingForView('history'),'Incident History');
 assert.equal(headingForView('analytics'),'Support Analytics');
 assert.equal(headingForView('diagnose','VPN will not connect'),'VPN will not connect');
});

test('uses safe fallback headings for missing or unrecognized state',()=>{
 assert.equal(headingForView('diagnose','   '),'Diagnosis');
 assert.equal(headingForView('unknown'),'Support workspace');
 assert.equal(headingForView('<script>'),'Support workspace');
});

test('focuses the view heading without forcing the page to scroll',()=>{
 let options;
 const doc={getElementById:id=>{
  assert.equal(id,VIEW_HEADING_ID);
  return{focus:value=>{options=value}};
 }};
 assert.equal(focusViewHeading(doc),true);
 assert.deepEqual(options,{preventScroll:true});
});

test('missing or failing DOM focus remains recoverable',()=>{
 assert.equal(focusViewHeading({getElementById:()=>null}),false);
 assert.equal(focusViewHeading({getElementById:()=>({focus(){throw new Error('blocked')}})}),false);
 assert.equal(focusViewHeading(null),false);
});

test('the application heading is a programmatic focus target',()=>{
 const source=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
 assert.match(source,/id=\{VIEW_HEADING_ID\} tabIndex=\{-1\}/);
 assert.match(source,/focusViewHeading\(\)/);
});
