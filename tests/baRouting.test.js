import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyIssue } from '../src/classifyIssue.js';
import { intakeDecision, initialPhase } from '../src/intakeDecision.js';

const routingCases = [
  ['How to cancel the material document', 'sap-material-document-reversal'],
  ['Please reverse the material document', 'sap-material-document-reversal'],
  ['Cancel my material document in MIGO', 'sap-material-document-reversal'],
  ['Material document cannot be cancelled', 'sap-material-document-reversal'],
  ['Cannot cancel material document; Azure SSO login works', 'sap-material-document-reversal'],
  ['SAP purchase order approval stuck; Azure login works', 'sap-po-release'],
  ['SAP WBS locked; Azure login works', 'sap-account-assignment'],
  ['MIGO not authorized', 'sap-authorization'],
  ['MIRO posting period closed', 'sap-posting-period'],
  ['Azure RBAC access denied', 'azure-access'],
  ['Azure network activity logs unavailable', 'azure-access'],
];
for (const [prompt, id] of routingCases) test(`intake starts ${id}: ${prompt}`, () => {
  const decision = intakeDecision(prompt);
  assert.equal(decision.type, 'start');
  assert.equal(decision.scenario.id, id);
  if (decision.scenario.category.startsWith('SAP')) assert.equal(initialPhase(decision.scenario, {}), 'diagnose');
});
for (const prompt of ['My GitHub PR cannot be approved', 'GitLab pull request approval fails', 'The supplier website is down', 'The vendor website cannot load']) {
  test(`IT context does not select SAP: ${prompt}`, () => {
    assert.ok(classifyIssue(prompt).every(x => !x.s.category.startsWith('SAP')));
  });
}
for (const input of ['', '  ', null, undefined, 123, 'SAP', 'SAP broken', 'SAP not working']) {
  test(`missing evidence requests clarification: ${JSON.stringify(input)}`, () => {
    assert.deepEqual(classifyIssue(input), []);
    const decision = intakeDecision(input);
    assert.equal(decision.type, 'clarify');
    assert.deepEqual(decision.suggestions, []);
    assert.match(decision.message, /exact error/);
  });
}
test('IT triage is required only when context is missing', () => {
  const s = classifyIssue('Outlook cannot send email')[0].s;
  assert.equal(initialPhase(s, {}), 'triage');
  assert.equal(initialPhase(s, {os: 'Windows 11', environment: 'Office', scope: 'Only me'}), 'diagnose');
});
test('untrusted markup cannot replace the detected route', () => {
  const decision = intakeDecision('Cancel the material document <script>alert("synthetic")</script>');
  assert.equal(decision.type, 'start');
  assert.equal(decision.scenario.id, 'sap-material-document-reversal');
});
