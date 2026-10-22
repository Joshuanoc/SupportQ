import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../sql/revoke_excess_table_privileges.sql',import.meta.url),'utf8');
test('least-privilege migration revokes PostgreSQL 17 MAINTAIN',()=>{
 assert.match(sql,/REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE/);
 for(const name of ['support_issues','solutions','feedback','troubleshooting_history'])assert.ok(sql.includes('public.'+name));
 assert.match(sql,/FROM anon, authenticated/);
});
test('postmigration checks cover direct and inherited grants',()=>{
 assert.match(sql,/aclexplode/);
 assert.match(sql,/has_table_privilege/);
 assert.match(sql,/\('MAINTAIN'\)/);
});
