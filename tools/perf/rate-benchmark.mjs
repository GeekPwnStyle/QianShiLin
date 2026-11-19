import http from 'node:http';import {createHash} from 'node:crypto';import {performance} from 'node:perf_hooks';
const rate=Number(process.env.RATE||100),seconds=Number(process.env.SECONDS||20),agent=new http.Agent({keepAlive:true,maxSockets:100});
const tokens=Array.from({length:100},(_,i)=>createHash('sha256').update('user'+(i+1)).digest('hex'));
let sent=0,done=0,pending=0,maxPending=0;const samples=[],codes={},byPath={};
const start=performance.now();
function request(i){let path,body;const m=i%20;
if(m===19){path='/purchase/manual-inbound';body=JSON.stringify({storeId:'store_hq_01',supplierId:'11111111-1111-4111-8111-111111111111',businessDate:'2026-11-19',settlementType:'store',freight:0,lines:Array.from({length:10},(_,j)=>({productName:'Synthetic '+j,quantity:2,purchasePrice:3,retailPrice:5}))});}
else if(m>=16)path='/session';else path=['/customers?pageSize=20','/customers?pageSize=20&keyword=9876','/customers?pageSize=20&page=4000','/customers?pageSize=20&keyword=1234'][i%4];
const kind=body?'write':path==='/session'?'session':'list',t=performance.now();pending++;maxPending=Math.max(maxPending,pending);
const req=http.request({hostname:'qsl-perf2-api',port:3001,path,method:body?'POST':'GET',agent,headers:{cookie:'qsl_session='+tokens[i%tokens.length],...(body?{'content-type':'application/json'}:{})}},res=>{let data='';res.on('data',c=>data+=c);res.on('end',()=>{const elapsed=performance.now()-t;let valid=false;try{const v=JSON.parse(data);valid=kind==='write'?!!v.id:kind==='session'?!!v.user:!!v.items;}catch{}
const code=valid?res.statusCode:'invalid-'+res.statusCode;codes[code]=(codes[code]||0)+1;const p=byPath[kind]??={n:0,ok:0};p.n++;if(valid&&res.statusCode<300)p.ok++;samples.push(elapsed);pending--;done++;});});req.setTimeout(10000,()=>req.destroy());req.on('error',()=>{codes.error=(codes.error||0)+1;pending--;done++});if(body)req.write(body);req.end();}
const timer=setInterval(()=>{const due=Math.min(rate*seconds,Math.floor((performance.now()-start)*rate/1000));while(sent<due)request(sent++);if(sent>=rate*seconds)clearInterval(timer);},10);
await new Promise(resolve=>{const t=setInterval(()=>{if(sent>=rate*seconds&&done===sent){clearInterval(t);resolve()}},100)});
samples.sort((a,b)=>a-b);const elapsed=(performance.now()-start)/1000;console.log(JSON.stringify({rate,seconds,sent,elapsed,successRps:((codes[200]||0)+(codes[201]||0))/elapsed,codes,byPath,maxPending,p50:samples[Math.floor(samples.length*.5)],p95:samples[Math.floor(samples.length*.95)],p99:samples[Math.floor(samples.length*.99)]}));agent.destroy();
