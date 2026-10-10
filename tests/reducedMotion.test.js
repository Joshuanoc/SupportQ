import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import{exitForMotionPreference}from'../src/motionPreferences.js';

test('removes diagnostic exit animation when reduced motion is requested',()=>{
 assert.equal(exitForMotionPreference(true,{opacity:0}),undefined);
});

test('preserves diagnostic exit feedback without a reduced-motion request',()=>{
 const exit={opacity:0};
 assert.equal(exitForMotionPreference(false,exit),exit);
 assert.equal(exitForMotionPreference(undefined,exit),exit);
});

test('the diagnostic question does not retain an unconditional exit fade',()=>{
 const source=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
 assert.doesNotMatch(source,/exit=\{\{opacity:0\}\}/);
 assert.match(source,/exit=\{exitForMotionPreference\(reduceMotion,\{opacity:0\}\)\}/);
});

test('CSS disables motion and spatial hover movement for reduced-motion users',()=>{
 const base=fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
 const enterprise=fs.readFileSync(new URL('../src/enterprise-ui.css',import.meta.url),'utf8');
 assert.match(base,/prefers-reduced-motion:reduce/);
 assert.match(base,/scroll-behavior:auto!important;transition:none!important;animation:none!important/);
 assert.match(enterprise,/prefers-reduced-motion:reduce/);
 assert.match(enterprise,/\.scenarioCard:hover \{ transform:none!important; \}/);
});
