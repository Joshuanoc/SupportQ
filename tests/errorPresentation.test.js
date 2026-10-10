import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getPublicAppError} from '../src/errorPresentation.js';

const mainSource=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');

test('public render failure gives concise recovery guidance',()=>{
  const fallback=getPublicAppError();
  assert.equal(fallback.title,'SupportQ could not load.');
  assert.match(fallback.message,/reload/i);
  assert.match(fallback.message,/contact support/i);
});

test('public error copy never includes exception or secret details',()=>{
  const secret='service_role=do-not-expose';
  const fallback=getPublicAppError(new Error(secret));
  assert.doesNotMatch(JSON.stringify(fallback),/service_role|do-not-expose/);
});

test('error boundary does not render raw exception details',()=>{
  assert.doesNotMatch(mainSource,/String\(this\.state\.error/);
  assert.doesNotMatch(mainSource,/<pre/);
  assert.match(mainSource,/componentDidCatch\(error,info\).*console\.error/);
});

test('error recovery is announced and keyboard operable',()=>{
  assert.match(mainSource,/<main role="alert" aria-labelledby="app-error-title"/);
  assert.match(mainSource,/<h1 id="app-error-title">/);
  assert.match(mainSource,/<button type="button" onClick=\{\(\)=>window\.location\.reload\(\)\}/);
  assert.match(mainSource,/minHeight:44/);
});
