export async function interpretMessage(session,text,question) {
  if(!session?.access_token)throw new Error('Sign in to use AI interpretation.');
  const response=await fetch('/api/interpret',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({text,question:question?{prompt:question.prompt,options:question.options}:undefined}),signal:AbortSignal.timeout(25000)});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||'AI interpretation unavailable.');
  return result;
}
