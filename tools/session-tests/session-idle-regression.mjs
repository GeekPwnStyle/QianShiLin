import assert from 'node:assert/strict';
const base='http://qsl-idle-api:3001';const admin=Buffer.from('perf-perf1').toString('hex').padEnd(64,'0'),store='b'.repeat(64);
async function call(path,method='GET',body,token=admin){const r=await fetch(base+path,{method,headers:{cookie:'qsl_session='+token,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
if(process.env.STAGE==='expired'){
 assert.equal((await call('/session','GET',undefined,store)).status,401);
 assert.equal((await call('/session/activity','POST',undefined,store)).status,401);
 assert.equal((await call('/customers','GET',undefined,store)).status,401);
 assert.equal((await call('/session')).status,200);
 console.log('PASS idle expiry cannot be revived by passive reads or activity; expired business access denied');
}else{
 const p=await call('/system/session-policy');assert.equal(p.status,200);assert.equal(p.body.idle_timeout_minutes,30);
 const before=(await call('/session')).body.user.idle_expires_at;
 await new Promise(r=>setTimeout(r,100));assert.equal((await call('/session')).body.user.idle_expires_at,before);
 const active=await call('/session/activity','POST');assert.equal(active.status,200);assert.ok(Date.parse(active.body.idle_expires_at)>Date.parse(before));
 for(const n of [0,1441,1.5,'30'])assert.equal((await call('/system/session-policy','PUT',{idle_timeout_minutes:n})).status,400);
 assert.equal((await call('/system/session-policy','PUT',{idle_timeout_minutes:1},store)).status,403);
 assert.equal((await call('/system/session-policy','PUT',{idle_timeout_minutes:1})).status,200);
 assert.equal((await call('/system/session-policy')).body.idle_timeout_minutes,1);
 assert.equal((await call('/system/session-policy','PUT',{idle_timeout_minutes:30})).status,200);
 console.log('PASS passive read does not renew; activity renews; admin policy persists; bounds validated; store writes denied');
}
