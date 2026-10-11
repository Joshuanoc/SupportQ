// Static guardrails only: these do NOT replace staging authorization tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const sql = readFileSync(new URL('../sql/lock_down_solution_authorization.sql', import.meta.url), 'utf8');
const normalized = sql.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ').toLowerCase();

test('prevents author from self-verifying on insert, update and delete', () => {
  for (const name of ['solutions_insert_for_own_issue','solutions_update_own','solutions_delete_own']) {
    const section = normalized.split('alter policy '+name.toLowerCase())[1]?.split(';')[0];
    assert.ok(section, 'missing policy '+name);
    assert.match(section, /is_verified\s*=\s*false/);
  }
});

test('limits authenticated updates to non-privileged fields', () => {
  assert.match(normalized, /revoke update on table public\.solutions from anon, authenticated/);
  assert.match(normalized, /grant update\s*\(title, steps, updated_at\) on table public\.solutions to authenticated/);
  assert.doesNotMatch(normalized, /grant update\s*\([^)]*(is_verified|created_by|issue_id|id,)/);
});

test('checks issue ownership for insert and update', () => {
  for (const name of ['solutions_insert_for_own_issue','solutions_update_own']) {
    const section = normalized.split('alter policy '+name.toLowerCase())[1]?.split(';')[0];
    assert.match(section, /i\.user_id\s*=\s*\(select auth\.uid\(\)\)/);
  }
});
