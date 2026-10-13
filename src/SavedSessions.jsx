import React,{useEffect,useState} from 'react';
import {useAuth} from './AuthContext.jsx';
import {listSessions,restoreSession} from './sessionPersistence.js';
import {scenarios} from './data.js';
export default function SavedSessions({onResume}) {
  const {client,user}=useAuth(),[rows,setRows]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;if(!user){setLoading(false);return}listSessions(client,user.id).then(data=>{if(active){setRows(data);setLoading(false)}}).catch(e=>{if(active){setError(e.message);setLoading(false)}});return()=>{active=false}},[client,user?.id]);
  if(!user)return <p>Sign in to save and resume your troubleshooting sessions.</p>;
  return <section aria-label="Saved troubleshooting sessions"><h2>Your saved sessions</h2>{loading&&<p role="status">Loading…</p>}{error&&<p role="alert">{error}</p>}{!loading&&!error&&!rows.length&&<p>No saved sessions yet. Open a diagnostic session and select Save session.</p>}
    {rows.map(row=><article className="sidePanel" key={row.id}><p>{row.state.evidence?.[0]?.text}</p><span>{new Date(row.updated_at).toLocaleString()}</span><button onClick={()=>{try{const session=restoreSession(row.state),scenario=scenarios.find(s=>s.id===session.scenarioId);if(!scenario)throw new Error('This scenario is no longer supported.');onResume(scenario,session,{revision:row.revision})}catch(e){setError(e.message)}}}>Resume session</button></article>)}
  </section>;
}
