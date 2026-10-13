// Static guardrails only: these do NOT replace staging authorization tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const sql = readFileSync(new URL('../sql/lock_down_solution_authorization.sql', import.meta.url), 'utf8');
const normalized = sql.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ').toLowerCase();
const cascadeSql = readFileSync(new URL('../sql/prevent_verified_solution_cascade.sql', import.meta.url), 'utf8');
const normalizedCascade = cascadeSql.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ').toLowerCase();

test('prevents author from self-verifying on insert, update and delete', () => {
  for (const name of ['solutions_insert_for_own_issue','solutions_update_own','solutions_delete_own']) {
    const section = normalized.split('alter policy '+name.toLowerCase())[1]?.split(';')[0];
    assert.ok(section, 'missing policy '+name);
    assert.match(section, /is_verified\s*=\s*false/);
  }
});

test('limits authenticated updates to non-privileged fields', () => {
  assert.match(normalized, /revoke update on table public\.solutions from anon, authenticated/);
  assert.match(normalized, /from pg_catalog\.pg_attribute/);
  assert.match(normalized, /not a\.attisdropped/);
  assert.match(normalized, /revoke update \(%i\) on table public\.solutions from anon, authenticated/);
  assert.match(normalized, /grant update\s*\(title, steps\) on table public\.solutions to authenticated/);
  assert.doesNotMatch(normalized, /grant update\s*\([^)]*(is_verified|created_by|issue_id|id,)/);
});

test('checks issue ownership for insert and update', () => {
  for (const name of ['solutions_insert_for_own_issue','solutions_update_own']) {
    const section = normalized.split('alter policy '+name.toLowerCase())[1]?.split(';')[0];
    assert.match(section, /i\.user_id\s*=\s*\(select auth\.uid\(\)\)/);
  }
});

test('cascade guard sees verified children without trusting caller RLS visibility', () => {
  assert.match(normalizedCascade, /security definer/);
  assert.match(normalizedCascade, /set search_path\s*=\s*''/);
  assert.match(normalizedCascade, /set row_security\s*=\s*off/);
  assert.match(normalizedCascade, /revoke all on function public\.reject_issue_delete_with_verified_solutions\(\) from public, anon, authenticated/);
  assert.match(normalizedCascade, /before delete on public\.support_issues/);
  assert.doesNotMatch(normalizedCascade, /security invoker/);
});
