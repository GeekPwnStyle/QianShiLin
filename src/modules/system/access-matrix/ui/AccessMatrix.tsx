import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import type { NavNode } from '@/src/modules/navigation/domain/menuRegistry';
import { ACCESS_ACTIONS, ACCESS_TREE, actionCodes, nodePermitted, type AccessAction } from '../domain/accessMatrix';

export function AccessMenuTree({ selected, onSelect }: { selected: NavNode; onSelect: (node: NavNode) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const visible = (node: NavNode): boolean => !q || node.label.toLowerCase().includes(q) || Boolean(node.children?.some(visible));
  const row = (node: NavNode, depth: number): React.ReactNode => {
    if (!visible(node)) return null;
    const open = expanded.has(node.id) || Boolean(q);
    return <React.Fragment key={node.id}>
      <div className={`flex items-center rounded-xl ${selected.id === node.id ? 'bg-[#ECF9A8] font-semibold' : 'hover:bg-[#F5F7EC]'}`} style={{ paddingLeft: depth * 14 + 6 }}>
        {node.children?.length ? <button type="button" aria-label={`${open ? '收起' : '展开'}${node.label}`} onClick={() => setExpanded(old => { const next = new Set(old); open ? next.delete(node.id) : next.add(node.id); return next; })} className="p-1.5">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button> : <span className="w-[26px]" />}
        <button type="button" onClick={() => onSelect(node)} className="min-w-0 flex-1 truncate py-2 pr-2 text-left text-[13px] text-[#171916]" title={node.label}>{node.label}</button>
      </div>
      {open && node.children?.map(child => row(child, depth + 1))}
    </React.Fragment>;
  };
  return <aside className="rounded-[20px] border border-[#D9DDD4] bg-white p-3 lg:sticky lg:top-4">
    <div className="px-2 pb-3 text-[15px] font-semibold">功能菜单 <span className="text-xs font-normal text-[#777D73]">18 个模块</span></div>
    <label className="mb-3 flex items-center gap-2 rounded-xl border border-[#E0E4DB] bg-[#F8F9F5] px-3 py-2"><Search size={15} className="text-[#777D73]" /><input aria-label="筛选功能菜单" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索菜单" className="w-full bg-transparent text-sm outline-none" /></label>
    <div className="max-h-[72vh] space-y-0.5 overflow-y-auto">{ACCESS_TREE.map(node => row(node, 0))}</div>
  </aside>;
}

export function AccessSummaryTable<T extends { id: string }>({ subjects, selected, nameOf, subtitleOf, codesOf, onEdit }: {
  subjects: T[]; selected: NavNode; nameOf: (item: T) => string; subtitleOf: (item: T) => string;
  codesOf: (item: T) => readonly string[]; onEdit: (item: T) => void;
}) {
  const mapped = useMemo(() => actionCodes(selected), [selected]);
  return <div className="overflow-x-auto rounded-[20px] border border-[#D9DDD4] bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E8E0] px-5 py-4"><div><h3 className="text-lg font-semibold">{selected.label}</h3><p className="text-xs text-[#73796F]">{selected.description ?? '按操作查看已生效的权限'}</p></div><span className="rounded-full bg-[#F0F2E9] px-3 py-1 text-xs">{subjects.length} 个对象</span></div>
    <table className="w-full min-w-[760px] border-collapse text-center text-sm"><thead className="bg-[#F8F9F5] text-[#5F645D]"><tr><th className="sticky left-0 bg-[#F8F9F5] px-4 py-3 text-left">操作 / 对象</th><th>角色</th>{ACCESS_ACTIONS.map(a => <th key={a} className="min-w-[74px]">{a}</th>)}</tr></thead><tbody>{subjects.map(item => {
      const codes = codesOf(item); const any = nodePermitted(selected, codes);
      return <tr key={item.id} className="border-t border-[#EEF0E9] hover:bg-[#FBFCF6]"><td className="sticky left-0 bg-white px-4 py-3 text-left"><button type="button" onClick={() => onEdit(item)} className="font-medium text-[#171916] underline-offset-2 hover:underline">编辑 · {nameOf(item)}</button></td><td className="whitespace-nowrap px-2 text-[#74796F]">{subtitleOf(item)}</td>{ACCESS_ACTIONS.map(action => {
        const available = action === '无权限' || Boolean(mapped[action]?.length);
        const active = action === '无权限' ? !any : Boolean(mapped[action]?.some(code => codes.includes(code)));
        return <td key={action} className="px-1">{available ? <span aria-label={active ? `${action}已授权` : `${action}未授权`} className={`inline-block h-3 w-3 rounded-full ${active ? 'bg-[#171916]' : 'border border-[#C8CEC1] bg-white'}`} /> : <span className="text-[#C8CEC1]">—</span>}</td>;
      })}</tr>;
    })}</tbody></table>
  </div>;
}

export function PermissionEditor({ title, codes, onChange, onClose, onSave, saving, locked = [], allowedCodes, header }: {
  title: string; codes: readonly string[]; onChange: (node: NavNode, action: AccessAction, enabled: boolean) => void;
  onClose: () => void; onSave: () => void; saving: boolean; locked?: string[]; allowedCodes?: readonly string[]; header?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const row = (node: NavNode, depth: number): React.ReactNode => {
    const mapped = actionCodes(node); const open = expanded.has(node.id);
    return <React.Fragment key={node.id}><tr className="border-b border-[#EFF1E9]"><td className="sticky left-0 z-10 bg-white px-2 py-2 text-left" style={{ paddingLeft: depth * 14 + 8 }}><div className="flex items-center gap-1">{node.children?.length ? <button type="button" aria-label={`${open ? '收起' : '展开'}${node.label}`} onClick={() => setExpanded(old => { const n = new Set(old); open ? n.delete(node.id) : n.add(node.id); return n; })} className="p-1">{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button> : <span className="w-5" />}<span className="truncate" title={node.label}>{node.label}</span></div></td>{ACCESS_ACTIONS.map(action => {
      const related = action === '无权限' ? Object.values(mapped).flat() : mapped[action] ?? [];
      const available = action === '无权限' || related.length > 0;
      const checked = action === '无权限' ? !nodePermitted(node, codes) : related.length > 0 && related.every(code => codes.includes(code));
      const disabled = !available || (action !== '无权限' && allowedCodes !== undefined && related.every(code => !allowedCodes.includes(code))) || (action === '无权限' ? related.some(code => locked.includes(code)) : related.some(code => locked.includes(code) && checked));
      return <td key={action} className="px-1 text-center">{available ? <input aria-label={`${node.label} ${action}`} type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(node, action, e.target.checked)} className="accent-[#171916]" /> : <span className="text-[#CDD1C8]">—</span>}</td>;
    })}</tr>{open && node.children?.map(child => row(child, depth + 1))}</React.Fragment>;
  };
  return <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#171916]/50 p-3"><section className="flex max-h-[94vh] w-full max-w-[1150px] flex-col overflow-hidden rounded-[22px] bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-[#E5E8E0] p-5"><div><h3 className="text-xl font-semibold">{title}</h3><p className="mt-1 text-xs text-[#74796F]">逐级展开菜单，按操作配置。横线表示系统尚无对应操作能力。</p></div><button type="button" onClick={onClose} aria-label="关闭编辑" className="rounded-full px-3 py-1 text-xl">×</button></header>{header && <div className="border-b border-[#E5E8E0] px-5 py-4">{header}</div>}<div className="overflow-auto p-4"><table className="w-full min-w-[800px] border-collapse text-xs"><thead className="sticky top-0 z-20 bg-[#F5F7EF]"><tr><th className="sticky left-0 z-30 min-w-[240px] bg-[#F5F7EF] px-3 py-3 text-left">菜单</th>{ACCESS_ACTIONS.map(a => <th key={a} className="min-w-[72px]">{a}</th>)}</tr></thead><tbody>{ACCESS_TREE.map(node => row(node, 0))}</tbody></table></div><footer className="flex justify-end gap-2 border-t border-[#E5E8E0] p-4"><button type="button" onClick={onClose} className="rounded-xl border border-[#D9DDD4] px-5 py-2">取消</button><button type="button" onClick={onSave} disabled={saving} className="rounded-xl bg-[#D7FF00] px-5 py-2 font-semibold disabled:opacity-50">{saving ? '保存中…' : '保存权限'}</button></footer></section></div>;
}
