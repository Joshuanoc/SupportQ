import {createClient} from '@supabase/supabase-js';
import {generateText,Output} from 'ai';
import {interpretationSchema} from '../server/interpretation.js';
import {makeInterpretHandler} from '../server/interpretHandler.js';
export const maxDuration=30;
export default makeInterpretHandler({
  authenticate:async token=>{
    const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
    if(!url||!key)return null;
    const client=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error}=await client.auth.getUser(token);
    return error||!data.user||data.user.is_anonymous||!data.user.email_confirmed_at?null:client;
  },
  configured:()=>Boolean(process.env.SUPPORTQ_AI_MODEL&&(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN)),
  reserve:async client=>{const {data,error}=await client.rpc('reserve_supportq_ai_request');if(error)throw error;return data===true},
  generate:async ({system,prompt})=>{
    const {output}=await generateText({model:process.env.SUPPORTQ_AI_MODEL,system,prompt,output:Output.object({schema:interpretationSchema}),maxOutputTokens:1200,maxRetries:0,abortSignal:AbortSignal.timeout(20000)});
    return output;
  }
});
