import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./e2e',fullyParallel:true,reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure'},
  webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4173',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI,env:{VITE_SUPABASE_URL:'https://supportq-test.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'test-publishable-key'}},
  projects:[{name:'desktop',use:{browserName:'chromium'}},{name:'mobile',use:{browserName:'chromium',viewport:{width:390,height:844},isMobile:true,hasTouch:true}}]
});
