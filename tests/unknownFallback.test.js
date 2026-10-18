import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnosticPath} from '../src/diagnosticTransitions.js';
test('unknown evidence must not immediately escalate with safe next step',()=>{const scenario={category:'SAP MM',steps:[{q:'Check one?'},{q:'Independent check?'}]};const r=diagnosticPath(scenario,0,'unknown');assert.equal(r.next,1);assert.equal(r.escalate,undefined);});
