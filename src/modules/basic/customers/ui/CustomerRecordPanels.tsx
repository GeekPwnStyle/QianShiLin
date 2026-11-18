import React, { useState } from 'react';
import type { CustomerProfile } from '../infrastructure/customersApi';
import { OperationStatus } from '@/src/shared/ui/OperationStatus';

type Item = { id: string; payload: Record<string, unknown>; created_at: string };
const columns: Record<string,string[]> = {
  sales:['序号','操作','单号','业务时间','类型','退换货','销售门店','取镜时间','数量','折前金额','折后金额','状态','制单店员','联系人','联系电话','收货地址'],
  history:['操作','时间','门店','标题','内容','图片'],
  repairs:['单号','状态','商品名称','品类','品牌','规格型号','类型','关联销售单号','创建时间','处理结果','费用','备注','关联处理单号','是否回访'],
  referrals:['序号','顾客姓名','会员等级','类型','手机号','关联时间','消费单数','消费金额','消费件数','推荐人获得积分'],
  health:['序号','操作','病例档案号','检查时间','顾客姓名','手机号','性别','年龄'],
};
const historyKinds=['全部','用户注册','验光','购买商品','回访','视力复查通知','隐形眼镜过期提醒','会员充值','预约到店','售后维修','自定义'];
const cell=(p:Record<string,unknown>,key:string,index:number,created:string)=>key==='序号'?String(index+1):key==='操作'?'—':String(p[key]??(key==='时间'||key==='创建时间'?created:'—'));
export function CustomerRecordPanel({section,items,customer,loading,error,debugMode,refresh}:{section:string;items:Item[];customer:CustomerProfile;loading:boolean;error:boolean;debugMode:boolean;refresh:()=>Promise<unknown>}){
 const [kind,setKind]=useState('全部');const [draft,setDraft]=useState<Record<string,string>>({});const [editing,setEditing]=useState(false);const [saving,setSaving]=useState(false);const [message,setMessage]=useState('');
 const shown=section==='history'&&kind!=='全部'?items.filter(i=>String(i.payload['标题']??'')===kind):items;
 const save=async()=>{setSaving(true);setMessage('');try{const r=await fetch(`${import.meta.env.BASE_URL}api/customers/${customer.id}/detail/${section}`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)});if(!r.ok)throw new Error((await r.json()).error||'保存失败');await refresh();setDraft({});setEditing(false);setMessage('记录已保存')}catch(e){setMessage(e instanceof Error?e.message:'保存失败')}finally{setSaving(false)}};
 return <div className="space-y-4">
  {message&&<OperationStatus role="status">{message}</OperationStatus>}{saving&&<OperationStatus loading>正在保存记录</OperationStatus>}
  {section==='history'&&<div className="flex flex-wrap items-center gap-1 border-b pb-3"><button type="button" onClick={()=>setEditing(true)} disabled={debugMode} className="mr-3 rounded-lg bg-[var(--qsl-accent)] px-3 py-2 text-sm font-semibold disabled:opacity-40">新增历史记录</button><span className="text-[#778078]">视图</span>{historyKinds.map(k=><button key={k} onClick={()=>setKind(k)} className={`rounded-lg px-2 py-1.5 text-xs ${kind===k?'bg-[#0DB79D] font-semibold text-white':'border border-[#D9DDD4] bg-white'}`}>{k} ({k==='全部'?items.length:items.filter(i=>i.payload['标题']===k).length})</button>)}</div>}
  {section==='sales'&&<div className="inline-flex rounded-lg bg-[#0DB79D] px-3 py-2 text-sm font-semibold text-white">全部回访记录</div>}
  {section==='health'&&<button onClick={()=>setEditing(true)} disabled={debugMode} className="rounded-lg bg-[#0DB79D] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">新增</button>}
  {editing&&<div className="rounded-xl border border-[#B6DDD5] bg-[#F7FCFA] p-4"><div className="mb-3 flex items-center justify-between font-semibold">新增{section==='health'?'眼健康档案':'历史记录'}<button onClick={()=>setEditing(false)}>关闭</button></div><div className="grid gap-3 md:grid-cols-3">{(section==='health'?['病例档案号','检查时间','顾客姓名','手机号','性别','年龄','诊断','备注']:['时间','门店','标题','内容','图片']).map(key=><label key={key} className="text-sm">{key}<input className="mt-1 w-full rounded-lg border bg-white p-2" value={draft[key]??(key==='顾客姓名'?customer.name:key==='手机号'?customer.phone:'')} onChange={e=>setDraft(v=>({...v,[key]:e.target.value}))}/></label>)}</div><button onClick={()=>void save()} disabled={saving||!Object.values(draft).some(Boolean)} className="mt-3 rounded-lg bg-[var(--qsl-accent)] px-4 py-2 font-semibold disabled:opacity-40">保存</button></div>}
  <div className="overflow-x-auto rounded-lg border border-[#D9DDD4] bg-white"><table className="w-full min-w-[1250px] border-collapse text-left text-xs"><thead className="bg-[#F5F6F6]"> <tr>{columns[section].map(c=><th key={c} className="whitespace-nowrap border-r border-b border-[#D9DDD4] px-3 py-2 font-semibold text-[#59605B]">{c}</th>)}</tr></thead><tbody>{shown.map((i,n)=><tr key={i.id} className="border-b align-top hover:bg-[#F4FBF8]">{columns[section].map(c=><td key={c} className="max-w-[450px] border-r border-[#E7EBE6] px-3 py-3 text-[#575D59]">{cell(i.payload,c,n,i.created_at)}</td>)}</tr>)}</tbody></table>{loading?<div className="p-10 text-center text-[#8B918C]">加载中…</div>:error?<div className="p-10 text-center text-red-700">记录加载失败</div>:!shown.length?<div className="flex min-h-64 items-center justify-center text-sm text-[#A0A9A3]">暂无数据</div>:null}</div>
 </div>;
}
