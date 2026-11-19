import { useEffect, useRef } from 'react';
export function useSessionIdle(enabled: boolean, userId: string, onExpired: () => void) {
 const callback=useRef(onExpired);callback.current=onExpired;
 useEffect(()=>{
  if(!enabled)return;
  let stopped=false,dirty=false,busy=false,lastSent=0;
  const base=`${import.meta.env.BASE_URL}api`;
  const expire=()=>{if(stopped)return;stopped=true;try{sessionStorage.setItem('qsl_session_expired','登录已失效或因长时间未操作而退出，请重新登录。');}catch{}callback.current();};
  const check=async(activity=false)=>{
   if(stopped||busy)return;busy=true;
   try{
    const r=await fetch(`${base}/session${activity?'/activity':''}`,{method:activity?'POST':'GET',credentials:'same-origin'});
    if(stopped)return;
    if(r.status===401){expire();return;}
    if(activity&&r.ok)lastSent=Date.now();
   }catch{ /* Network failures do not renew or revoke the server session. */ }
   finally{busy=false;}
  };
  const activity=(event:Event)=>{
   if(!event.isTrusted||document.visibilityState!=='visible')return;
   dirty=true;
   if(Date.now()-lastSent>=10000&&!busy){dirty=false;void check(true);}
  };
  const visible=()=>{if(document.visibilityState==='visible')void check(false);};
  const events=['pointerdown','pointermove','keydown','wheel','touchstart'];
  events.forEach(name=>window.addEventListener(name,activity,{passive:true}));
  document.addEventListener('visibilitychange',visible);
  void check(false);
  const timer=window.setInterval(()=>{const renew=dirty&&document.visibilityState==='visible';dirty=false;void check(renew);},10000);
  return()=>{stopped=true;clearInterval(timer);events.forEach(name=>window.removeEventListener(name,activity));document.removeEventListener('visibilitychange',visible);};
 },[enabled,userId]);
}
