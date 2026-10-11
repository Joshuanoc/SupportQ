import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyIssue,normalizeIssueText} from '../src/classifyIssue.js';

const cases=[
 ['migo tranfer posting wbs eror','sap-account-assignment'],
 ['wifi conected but no intrnet','wifi-no-internet'],
 ['materail document reversel','sap-material-document-reversal'],
 ['343 movement','sap-goods-movement'],
 ['miro invoce error','sap-miro-blocked']
];
for(const [input,expected] of cases){
 test('route '+input,()=>assert.equal(classifyIssue(input)[0]?.s.id,expected));
}
test('preserve SAP codes',()=>assert.match(normalizeIssueText('MIGO 343 WBS'),/migo 343 wbs/));
