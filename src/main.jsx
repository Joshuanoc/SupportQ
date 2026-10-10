import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './enterprise-ui.css';
import{getPublicAppError}from'./errorPresentation.js';

class AppErrorBoundary extends React.Component{
  constructor(props){super(props);this.state={error:null}}
  static getDerivedStateFromError(error){return{error}}
  componentDidCatch(error,info){console.error('SupportQ render error',error,info)}
  render(){
    if(this.state.error){
      const fallback=getPublicAppError(this.state.error);
      return <main role="alert" aria-labelledby="app-error-title" style={{fontFamily:'Inter,system-ui,sans-serif',maxWidth:760,margin:'80px auto',padding:'24px'}}><h1 id="app-error-title">{fallback.title}</h1><p>{fallback.message}</p><button type="button" onClick={()=>window.location.reload()} style={{minHeight:44,padding:'10px 16px'}}>Reload SupportQ</button></main>
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode><AppErrorBoundary><App/></AppErrorBoundary></React.StrictMode>
);
