import React,{createContext,useContext,useEffect,useState,useRef} from 'react';
import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const client=url&&key?createClient(url,key):null;
const Context=createContext({client:null,user:null,session:null});
export const useAuth=()=>useContext(Context);
export function AuthProvider({children}) {
  const [session,setSession]=useState(null),[ready,setReady]=useState(!client);
  const previousOwner=useRef(null);
  useEffect(()=>{
    if(!client)return;
    let active=true;
    const update=value=>{
      if(!active)return;
      const previous=previousOwner.current,next=value?.user?.id;
      if(previous&&previous!==next){try{for(const key of Object.keys(sessionStorage))if(key.startsWith(`supportq-adaptive:${previous}:`))sessionStorage.removeItem(key);localStorage.removeItem(`supportq-history:${previous}`)}catch{}}
      previousOwner.current=next;
      if(active){setSession(value);setReady(true)}
    };
    client.auth.getSession().then(({data})=>update(data.session)).catch(()=>{if(active){setSession(null);setReady(true)}});
    const {data}=client.auth.onAuthStateChange((_event,value)=>update(value));
    return()=>{active=false;data.subscription.unsubscribe()};
  },[]);
  return <Context.Provider value={{client,session,user:session?.user||null,ready}}>{children}</Context.Provider>;
}
export function AccountPanel() {
  const {client,user}=useAuth();
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[open,setOpen]=useState(false);
  if(!client)return <span className="muted">Guest mode</span>;
  async function submit(signup=false){
    setBusy(true);setMessage('');
    try {
      const {error}=signup?await client.auth.signUp({email,password}):await client.auth.signInWithPassword({email,password});
      if(error)throw error;setPassword('');setMessage(signup?'Check your email to confirm your account.':'Signed in.');
    }catch{setMessage('Unable to sign in or create the account. Check your details and email confirmation.')}finally{setBusy(false)}
  }
  return <div><button onClick={()=>setOpen(v=>!v)} aria-expanded={open}>{user?'Account':'Sign in to save sessions'}</button>{open&&<div className="sidePanel" style={{position:'absolute',right:20,top:80,zIndex:30,maxWidth:320,background:'#fff',color:'#182733'}}>
    {user?<><p>Signed in as {user.email}</p><button disabled={busy} onClick={async()=>{setBusy(true);try{const {error}=await client.auth.signOut();if(error)throw error;setMessage('Signed out.')}catch{setMessage('Sign out failed; try again.')}finally{setBusy(false)}}}>Sign out</button></>:<form onSubmit={e=>{e.preventDefault();submit()}}>
      <label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label>Password<input type="password" autoComplete="current-password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <button type="submit" disabled={busy}>Sign in</button><button type="button" disabled={busy||!email||password.length<8} onClick={()=>submit(true)}>Create account</button>
    </form>}{message&&<p role="status">{message}</p>}
  </div>}</div>;
}
