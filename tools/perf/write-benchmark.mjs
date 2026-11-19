const token=Buffer.from('perf-perf1').toString('hex').padEnd(64,'0');
const base='http://qsl-perf-api:3001';
const body={storeId:'store_hq_01',supplierId:'11111111-1111-4111-8111-111111111111',businessDate:'2026-11-19',settlementType:'store',freight:0,lines:Array.from({length:100},(_,i)=>({productName:'Synthetic '+i,quantity:2,purchasePrice:3,retailPrice:5}))};
const times=[];const codes={};
await Promise.all(Array.from({length:5},async()=>{for(let i=0;i<4;i++){let t=performance.now();const r=await fetch(base+'/purchase/manual-inbound',{method:'POST',headers:{cookie:'qsl_session='+token,'content-type':'application/json'},body:JSON.stringify(body)});await r.text();times.push(performance.now()-t);codes[r.status]=(codes[r.status]||0)+1}}));
times.sort((a,b)=>a-b);console.log(JSON.stringify({scenario:'20 drafts x 100 lines, concurrency 5',codes,p50:times[10],p95:times[19]}));
