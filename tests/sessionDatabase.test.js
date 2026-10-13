import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('Postgres executes migration and enforces owner isolation, CAS and private AI quota',async()=>{
  const db=new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; grant usage on schema auth to anon,authenticated;
      create table auth.users(id uuid primary key);
      create function auth.jwt() returns jsonb language sql as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
      create function auth.uid() returns uuid language sql as $$ select (auth.jwt()->>'sub')::uuid $$;
      insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261013232444_adaptive_diagnostic_sessions.sql',import.meta.url),'utf8'));
    async function login(id,anonymous=false){await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claims','${JSON.stringify({sub:id,is_anonymous:anonymous})}',false);`)}
    const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333';
    await login(a);
    let result=await db.query(`select public.save_supportq_session($1,'{"version":1}'::jsonb,0) as revision`,[id]);assert.equal(Number(result.rows[0].revision),1);
    assert.equal((await db.query('select * from public.diagnostic_sessions')).rows.length,1);
    await login(b);assert.equal((await db.query('select * from public.diagnostic_sessions')).rows.length,0);
    assert.equal((await db.query('delete from public.diagnostic_sessions where id=$1 returning id',[id])).rows.length,0);
    await assert.rejects(()=>db.query(`select public.save_supportq_session($1,'{}',1)`,[id]),/conflict/);
    await assert.rejects(()=>db.query('insert into public.diagnostic_sessions(id,user_id,state) values($1,$2,$3)',[crypto.randomUUID(),a,{}]),/row-level security/);
    await login(a);
    result=await db.query(`select public.save_supportq_session($1,'{"version":1}'::jsonb,1) as revision`,[id]);assert.equal(Number(result.rows[0].revision),2);
    await assert.rejects(()=>db.query(`select public.save_supportq_session($1,'{}',1)`,[id]),/conflict/);
    await assert.rejects(()=>db.query('update public.diagnostic_sessions set user_id=$1 where id=$2',[b,id]),/permission denied/);
    await assert.rejects(()=>db.query('select * from supportq_private.ai_usage'),/permission denied/);
    for(let i=0;i<3;i++)assert.equal((await db.query('select public.reserve_supportq_ai_request() as allowed')).rows[0].allowed,true);
    assert.equal((await db.query('select public.reserve_supportq_ai_request() as allowed')).rows[0].allowed,false);
    await login(a,true);assert.equal((await db.query('select * from public.diagnostic_sessions')).rows.length,0);
    await assert.rejects(()=>db.query('select public.reserve_supportq_ai_request()'),/insufficient_privilege|insufficient privilege/);
    await db.exec('reset role;set role anon;');
    await assert.rejects(()=>db.query('select * from public.diagnostic_sessions'),/permission denied/);
    await assert.rejects(()=>db.query('select public.reserve_supportq_ai_request()'),/permission denied/);
    await db.exec('reset role;');
    // Exhausting the daily budget persists across minute resets.
    await db.query("update supportq_private.ai_usage set used=30,minute_start=now()-interval '2 minutes'");
    await login(a);assert.equal((await db.query('select public.reserve_supportq_ai_request() as allowed')).rows[0].allowed,false);
  }finally{await db.close()}
});
