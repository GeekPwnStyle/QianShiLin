import http from 'node:http';
import {performance} from 'node:perf_hooks';
const paths=['/session','/customers?pageSize=20','/customers?pageSize=20&keyword=9876','/customers?pageSize=20&page=4000'];
const agent=new http.Agent({keepAlive:true,maxSockets:64});
for(const concurrency of [1,10,30]) {
 let samples=[],codes={},n=0; const start=performance.now(),end=start+10000;
 async function worker(){while(performance.now()<end){const p=paths[n++%paths.length],t=performance.now(); await new Promise(resolve=>{const r=http.get({hostname:'qsl-perf-api',port:3001,path:p,agent,headers:{cookie:'qsl_session='+Buffer.from('perf-perf1').toString('hex').padEnd(64,'0')}},res=>{res.resume();res.on('end',()=>{codes[res.statusCode]=(codes[res.statusCode]||0)+1;samples.push(performance.now()-t);resolve()})});r.setTimeout(15000,()=>r.destroy());r.on('error',()=>{codes.error=(codes.error||0)+1;resolve()})})}}
 await Promise.all(Array.from({length:concurrency},worker));samples.sort((a,b)=>a-b);console.log(JSON.stringify({concurrency,requests:samples.length,rps:samples.length/((performance.now()-start)/1000),p50:samples[Math.floor(samples.length*.5)],p95:samples[Math.floor(samples.length*.95)],codes}));
}
agent.destroy();
