import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function start(page,issue){await page.goto('/');await page.getByLabel('What do you need help with?').fill(issue);await page.getByRole('button',{name:'Start diagnosis',exact:true}).click();}
test('SAP closed period skips intake, retains document and resumes after refresh',async({page})=>{
  await start(page,'Cannot cancel material document 4900012345 in MBST: posting period closed');
  await expect(page.getByRole('heading',{name:'Is the intended posting date permitted by your business policy?'})).toBeVisible();
  await expect(page.getByText('4900012345',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Yes, the date is approved',exact:true}).click();
  await expect(page.getByRole('heading',{name:'After the approved check or action, is the original issue resolved?'})).toBeVisible();
  // Navigation preserves tab-scoped state without a cross-user database session.
  await page.reload();await page.getByLabel('What do you need help with?').fill('Cannot cancel material document 4900012345 in MBST: posting period closed');await page.getByRole('button',{name:'Start diagnosis',exact:true}).click();
  await expect(page.getByRole('heading',{name:'After the approved check or action, is the original issue resolved?'})).toBeVisible();
  await page.getByRole('button',{name:'Yes, the original issue is resolved',exact:true}).click();
  await expect(page.getByText('USER-CONFIRMED OUTCOME',{exact:true})).toBeVisible();
});
test('Shared Wi-Fi skips repeated questions and handles unavailable checks',async({page})=>{
  await start(page,'My Mac Wi-Fi has no internet. All devices fail. Already restarted the router.');
  await expect(page.getByRole('heading',{name:'Do the modem or router lights show an offline or alarm indicator?'})).toBeVisible();
  await page.getByRole('button',{name:'I cannot check',exact:true}).click();
  await page.getByRole('button',{name:"I don't know my provider",exact:true}).click();
  await page.getByRole('button',{name:'I cannot check',exact:true}).click();
  await expect(page.getByText('ESCALATION PLAN',{exact:true})).toBeVisible();
  await expect(page.getByText('NEXT USEFUL CHECK',{exact:true})).toHaveCount(0);
});
test('Answer correction reroutes and keyboard controls remain accessible',async({page})=>{
  await start(page,'My Mac Wi-Fi has no internet');
  await page.getByRole('button',{name:'No, none of them work',exact:true}).click();
  await page.getByRole('button',{name:'Change previous answer',exact:true}).click();
  await page.getByRole('button',{name:'Yes, other devices work',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{name:'Does this device have internet on a different network, such as a phone hotspot?'})).toBeVisible();
  const results=await new AxeBuilder({page}).include('[aria-label="Adaptive troubleshooting"]').analyze();
  expect(results.violations).toEqual([]);
});
