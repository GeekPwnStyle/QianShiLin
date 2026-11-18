import { CustomerOverview } from './CustomerOverview';
import { CustomerRecordPanel } from './CustomerRecordPanels';
import { CustomerValuePanel } from './CustomerValuePanel';
import { ExtensionPanel } from './ExtensionPanel';
import { VisionExamPanel } from './VisionExamPanel';
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CustomerProfile } from '../infrastructure/customersApi';
import { Modal } from '@/src/shared/ui/Modal';
import { OperationStatus } from '@/src/shared/ui/OperationStatus';

type RecordItem = { id: string; payload: Record<string, unknown>; created_at: string };
const sections = [
  ['home','首页'],['basic','基本资料'],['vision','验光信息'],['sales','销售记录'],['history','历史记录'],['repairs','售后维修记录'],['referrals','推荐会员'],['value','会员价值分析'],['health','眼健康档案'],['extensions','拓展信息']
] as const;
const fields: Record<string,string[]> = {
  vision:['检查时间','验光师','来源','球镜OD','柱镜OD','轴位OD','球镜OS','柱镜OS','轴位OS','瞳距','科学建议','备注'],
  sales:['单号','业务时间','类型','销售门店','取镜时间','数量','折前金额','折后金额','状态','制单店员','联系人','联系电话','收货地址'],
  history:['时间','门店','标题','内容','图片'],
  repairs:['单号','状态','商品名称','品类','品牌','规格型号','类型','关联销售单号','创建时间','处理结果','费用','备注','关联处理单号','是否回访'],
  referrals:['顾客姓名','会员等级','类型','手机号','关联时间','消费单数','消费金额','消费件数','推荐人获得积分'],
  health:['病例档案号','检查时间','顾客姓名','手机号','性别','年龄','诊断','备注'],
  extensions:['所在学校','所在班级','学号','现史','既往史','遗传因素','环境行为因素','营养因素','备注'],
};
const api = `${import.meta.env.BASE_URL}api/customers`;
export function CustomerDetailModal({customer,onClose,debugMode}:{customer:CustomerProfile|null;onClose:()=>void;debugMode:boolean}) {
  const [tab,setTab]=useState('home'); const [draft,setDraft]=useState<Record<string,string>>({}); const [saving,setSaving]=useState(false); const [error,setError]=useState(''); const [minimized,setMinimized]=useState(false);
  const qc=useQueryClient(); const section=tab==='value'?'sales':tab;
  const records=useQuery({queryKey:['customer-detail',customer?.id,section],enabled:!!customer&&tab!=='home'&&tab!=='value'&&!debugMode,queryFn:async()=>{const r=await fetch(`${api}/${customer!.id}/detail/${section}`,{credentials:'same-origin'});if(!r.ok)throw new Error('详情加载失败');return (await r.json()).items as RecordItem[]}});
  const items=records.data??[];
  const save=async()=>{if(!customer||debugMode)return;setSaving(true);setError('');try{const r=await fetch(`${api}/${customer.id}/detail/${section}`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)});if(!r.ok)throw new Error((await r.json()).error??'保存失败');setDraft({});await qc.invalidateQueries({queryKey:['customer-detail',customer.id,section]})}catch(e){setError(e instanceof Error?e.message:'保存失败')}finally{setSaving(false)}};
  if(!customer)return null;
  return <Modal open onClose={onClose} title={`顾客全景档案 · ${customer.name}`} subtitle={`${customer.memberNo} · ${customer.storeName}`} fixedViewportSize footer={<>
      <button type="button" onClick={()=>setMinimized(v=>!v)} className="rounded-xl border px-4 py-2">{minimized?'展开':'最小化'}</button>
      <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2">关闭</button>
      {tab==='vision'&&!minimized&&<button type="submit" form="customer-vision-form" disabled={debugMode||records.isLoading||records.isError} className="rounded-xl bg-[var(--qsl-accent)] px-4 py-2 font-semibold text-[var(--qsl-accent-ink)] disabled:opacity-40">保存验光单</button>}
    </>}>
    <div className="flex h-full min-h-0 flex-col">
    {error&&<OperationStatus role="alert">{error}</OperationStatus>}{saving&&<OperationStatus loading>正在保存档案</OperationStatus>}
    <div className="flex shrink-0 flex-nowrap overflow-x-auto border-b border-[#D9DDD4] pb-0">{sections.map(([key,label])=><button key={key} type="button" onClick={()=>{setTab(key);setDraft({})}} className={`whitespace-nowrap px-4 py-3 text-sm ${tab===key?'border-b-2 border-[var(--qsl-accent)] bg-[var(--qsl-accent-soft-85)] font-semibold':'hover:bg-[#F5F7EF]'}`}>{label}</button>)}</div>
    {minimized?<button onClick={()=>setMinimized(false)} className="mt-5 rounded-xl border px-4 py-2">展开详情</button>:<div className={tab==='vision' ? "min-h-0 flex-1 overflow-hidden pt-3" : "min-h-0 flex-1 overflow-y-auto py-5"}>
      {tab==='home'&&<CustomerOverview customer={customer} debugMode={debugMode} onNavigate={setTab}/>}
      {tab==='basic'&&<div className="grid gap-4 md:grid-cols-2"><Card title="身份与联系" rows={[["姓名",customer.name],["手机号",customer.phoneMasked?'已按权限隐藏':customer.phone],["性别",customer.gender],["生日",customer.birthday],["年龄",String(customer.age)],["地址",customer.address]]}/><Card title="会员与门店" rows={[["卡号",customer.memberNo],["等级",customer.tier],["门店",customer.storeName],["导购",customer.guideName],["顾客来源",customer.source],["备注",customer.remark]]}/></div>}
      {tab==='value'&&<CustomerValuePanel customerId={customer.id} debugMode={debugMode}/>}
      {tab==='vision'&&<VisionExamPanel customerId={customer.id} debugMode={debugMode} items={items} refresh={()=>records.refetch()} />}
      {tab==='extensions'&&<ExtensionPanel customerId={customer.id} debugMode={debugMode} items={items} refresh={()=>records.refetch()} />}
      {['sales','history','repairs','referrals','health'].includes(tab)&&<CustomerRecordPanel section={tab} items={items} customer={customer} loading={records.isLoading} error={records.isError} debugMode={debugMode} refresh={()=>records.refetch()}/>}
    </div>}

    </div>
  </Modal>;
}
function Card({title,rows}:{title:string;rows:[string,string][]}){return <section className="rounded-2xl border border-[#E5E8E0] bg-[#F8F9F5] p-5"><h3 className="mb-3 font-semibold">{title}</h3>{rows.map(([label,value])=><div key={label} className="flex justify-between gap-4 border-t border-[#E5E8E0] py-2 text-sm"><span className="shrink-0 text-[#73796F]">{label}</span><span className="text-right">{value||'—'}</span></div>)}</section>}
