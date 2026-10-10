import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {drawerButtons} from '../src/mobileNavigation.js';

const appSource=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const cssSource=readFileSync(new URL('../src/enterprise-ui.css',import.meta.url),'utf8');

test('drawer buttons preserve DOM order for predictable focus movement',()=>{
  const close={id:'close'},overview={id:'overview'},history={id:'history'};
  const drawer={querySelectorAll:selector=>{
    assert.equal(selector,'button');
    return [close,overview,history];
  }};

  assert.deepEqual(drawerButtons(drawer),[close,overview,history]);
});

test('a missing or unavailable drawer returns no focus targets',()=>{
  assert.deepEqual(drawerButtons(null),[]);
  assert.deepEqual(drawerButtons({querySelectorAll(){throw new Error('unavailable')}}),[]);
});

test('mobile dialog contains an explicit close control inside its focus trap',()=>{
  const asideIndex=appSource.indexOf('<aside id="primary-navigation"');
  const closeIndex=appSource.indexOf('className="mobileNavClose"');
  const navIndex=appSource.indexOf('<nav aria-label="Main navigation">');

  assert.ok(asideIndex>=0&&closeIndex>asideIndex&&closeIndex<navIndex);
  assert.match(appSource,/mobileNavClose" onClick=\{\(\)=>setMobile\(false\)\}/);
  assert.match(appSource,/const buttons=\(\)=>drawerButtons\(drawer\)/);
});

test('drawer close control is hidden on desktop and usable at mobile size',()=>{
  assert.match(cssSource,/\.navBackdrop,\.mobileNavClose \{ display:none; \}/);
  assert.match(cssSource,/@media\(max-width:780px\)[\s\S]*\.mobileNavClose \{ display:flex;[\s\S]*min-height:44px;/);
});
