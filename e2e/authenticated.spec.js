import {test,expect} from '@playwright/test';
const user={id:'11111111-1111-4111-8111-111111111111',email:'qa@example.test',aud:'authenticated',role:'authenticated',email_confirmed_at:'2026-10-13T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-10-13T00:00:00Z'};
const token=[{alg:'HS256',typ:'JWT'},{sub:user.id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600},'test'].map(x=>typeof x==='object'?Buffer.from(JSON.stringify(x)).toString('base64url'):x).join('.');
test('Sign in, confirm AI answer, save, resume in a second browser and sign out',async({page,browser})=>{
  let saved=null;
  async function configure(p){
    await p.route('https://supportq-test.supabase.co/**',async route=>{
      const url=route.request().url();let data={};
      if(url.includes('/auth/v1/token'))data={access_token:token,refresh_token:'refresh-test',token_type:'bearer',expires_in:3600,user};
      else if(url.includes('/auth/v1/user'))data=user;
      else if(url.includes('/auth/v1/logout'))data={};
      else if(url.includes('/rpc/save_supportq_session')){const b=route.request().postDataJSON();saved={id:b.session_id,state:b.session_state,revision:1,updated_at:new Date().toISOString()};data=1}
      else if(url.includes('/diagnostic_sessions'))data=saved?[saved]:[];
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
    });
    await p.route('**/api/interpret',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({scenarioId:null,answerValue:'shared',facts:[],needsClarification:false,confirmationRequired:true})}));
  }
  async function login(p){await p.goto('/');await p.getByRole('button',{name:'Sign in to save sessions',exact:true}).click();await p.getByLabel('Email',{exact:true}).fill('qa@example.test');await p.getByLabel('Password',{exact:true}).fill('TestPassword123');await p.getByRole('button',{name:'Sign in',exact:true}).click();await expect(p.getByRole('button',{name:'Account',exact:true})).toBeVisible()}
  await configure(page);await login(page);
  await page.getByLabel('What do you need help with?').fill('My Mac has no internet');await page.getByRole('button',{name:'Start diagnosis',exact:true}).click();
  await page.getByLabel('Answer in your own words').fill('No gadget in the house can get online');await page.getByRole('button',{name:'Understand answer with AI'}).click();
  await expect(page.getByText('Did you mean: No, none of them work?')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Do other devices on the same Wi-Fi have internet access?'})).toBeVisible();
  await page.getByRole('button',{name:'Confirm interpretation'}).click();
  await page.getByRole('button',{name:'Save session',exact:true}).click();await expect(page.getByText('Session saved to your account.')).toBeVisible();
  expect(saved.state.knownFacts.scope).toBe('shared');
  const second=await browser.newContext(),p2=await second.newPage();await configure(p2);await login(p2);
  await p2.getByRole('button',{name:'Saved sessions',exact:true}).click();await p2.getByRole('button',{name:'Resume session'}).click();
  await expect(p2.getByRole('heading',{name:'Have you already restarted the router or modem?'})).toBeVisible();
  await p2.getByRole('button',{name:'Account',exact:true}).click();await p2.getByRole('button',{name:'Sign out',exact:true}).click();
  await expect(p2.getByRole('button',{name:'Sign in to save sessions',exact:true})).toBeVisible();await expect(p2.getByText('My Mac has no internet',{exact:true})).toHaveCount(0);
  await second.close();
});
