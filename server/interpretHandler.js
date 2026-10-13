import {scenarios} from '../src/data.js';
import {validateInterpretation,systemPrompt} from './interpretation.js';
export function makeInterpretHandler({authenticate,reserve,generate,configured=()=>true}) {
  return async function handler(req,res) {
    res.setHeader('Cache-Control','no-store');
    const send=(status,error)=>res.status(status).json({error});
    if(req.method!=='POST') {res.setHeader('Allow','POST');return send(405,'Method not allowed');}
    const origin=req.headers.origin,host=req.headers.host;
    if(origin){try{if(new URL(origin).host!==host)return send(403,'Cross-origin request rejected')}catch{return send(403,'Invalid origin')}}
    if(!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type']||'')))return send(415,'JSON required');
    let body;try {body=typeof req.body==='string'?JSON.parse(req.body):req.body;if(JSON.stringify(body).length>16000)return send(413,'Request too large')}catch{return send(400,'Invalid JSON')}
    if(!body||typeof body.text!=='string'||!body.text.trim()||body.text.length>4000)return send(400,'Provide a message of 1–4000 characters');
    const token=String(req.headers.authorization||'').match(/^Bearer (\S+)$/)?.[1];
    if(!token)return send(401,'Sign in to use AI interpretation');
    let client;try {client=await authenticate(token);if(!client)return send(401,'Invalid or expired sign-in')}catch{return send(401,'Invalid or expired sign-in')}
    if(!configured())return send(503,'AI interpretation is not configured');
    let question;
    if(body.question) {
      const q=body.question;
      if(typeof q.prompt!=='string'||q.prompt.length>1000||!Array.isArray(q.options)||q.options.length>10||q.options.some(o=>typeof o.value!=='string'||typeof o.label!=='string'||o.value.length>80||o.label.length>200))return send(400,'Invalid question context');
      question={prompt:q.prompt,options:q.options};
    }
    try {
      if(!await reserve(client))return send(429,'AI limit reached; use the choice buttons');
      const context=question?{question}:{scenarios:scenarios.map(s=>({id:s.id,title:s.title,category:s.category}))};
      const output=await generate({system:systemPrompt,prompt:JSON.stringify({context,userMessage:body.text})});
      return res.status(200).json(validateInterpretation(output,body.text,question));
    }catch{return send(503,'AI interpretation is temporarily unavailable; use the choice buttons');}
  };
}
