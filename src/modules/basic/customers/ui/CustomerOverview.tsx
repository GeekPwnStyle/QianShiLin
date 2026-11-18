import React from 'react';
import { UserRound } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { CustomerProfile } from '../infrastructure/customersApi';
import { isMemberSale, scoreMemberValue, summarize } from './CustomerValuePanel';

type Payload = Record<string, unknown>;
const position = [
  'lg:col-start-2 lg:row-start-1 lg:justify-self-center',
  'lg:col-start-1 lg:row-start-2', 'lg:col-start-1 lg:row-start-3', 'lg:col-start-1 lg:row-start-4',
  'lg:col-start-1 lg:row-start-5', 'lg:col-start-3 lg:row-start-5',
  'lg:col-start-3 lg:row-start-4', 'lg:col-start-3 lg:row-start-3', 'lg:col-start-3 lg:row-start-2',
];
const sections = ['vision', 'sales', 'referrals', 'repairs'];
const money = (value: number | null) => value === null ? null : value.toFixed(2);

function sumField(items: Payload[] | undefined, field: string) {
  if (!items?.length) return items ? 0 : null;
  const values = items.map(item => item[field]);
  if (values.some(value => (typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '' || !Number.isFinite(Number(value)))) return null;
  return values.reduce<number>((sum, value) => sum + Number(value), 0);
}

export function CustomerOverview({ customer, debugMode, onNavigate }: {
  customer: CustomerProfile; debugMode: boolean; onNavigate: (tab: string) => void;
}) {
  const { data, isError } = useQuery({
    queryKey: ['customer-overview', customer.id],
    enabled: !debugMode,
    queryFn: async () => {
      const entries = await Promise.all(sections.map(async section => {
        const response = await fetch(`${import.meta.env.BASE_URL}api/customers/${customer.id}/detail/${section}`);
        if (!response.ok) throw new Error('客户概览加载失败');
        const result = await response.json() as { items: { payload: Payload }[] };
        return [section, result.items.map(item => item.payload)] as const;
      }));
      return Object.fromEntries(entries);
    },
  });
  const vision = data?.vision[0];
  const prescription = (field: string) => {
    const value = (eye: string) => vision?.[`配镜处方 · ${field} · ${eye}`] || vision?.[`验光处方 · ${field} · ${eye}`];
    const right = value('OD');
    const left = value('OS');
    return right || left ? `右 ${right || '—'} / 左 ${left || '—'}` : null;
  };
  const values = summarize(data?.sales, data?.referrals);
  const scores = scoreMemberValue(values);
  const subtotal = (from: number, to: number) => {
    const list = scores.slice(from, to);
    return list.every(value => value !== null) ? list.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null;
  };
  const groups: { title: string; tab?: string; rows: [string, unknown][] }[] = [
    { title: '基本信息', tab: 'basic', rows: [['会员等级', customer.tier], ['性别', customer.gender], ['年龄', customer.age], ['顾客来源', customer.source], ['生命周期', null]] },
    { title: '联带会员', tab: 'referrals', rows: [['子会员数', null], ['子会员消费额', null], ['推荐会员数', data?.referrals.length], ['推荐会员消费额', money(sumField(data?.referrals, '消费金额'))]] },
    { title: '积分信息', rows: [['总积分', null], ['使用积分', null], ['剩余积分', customer.pointsBalance]] },
    { title: '充值信息', rows: [['充值总额', null], ['充值消费', null], ['充值剩余', customer.storedValueBalance], ['充值可退', customer.refundableAmount]] },
    { title: '价值分析', tab: 'value', rows: [['忠诚度', subtotal(0, 3)], ['购买力', subtotal(3, 5)], ['价格容忍度', subtotal(5, 7)]] },
    { title: '售后信息', tab: 'repairs', rows: [['售后维修', data?.repairs.length], ['退换货', data?.sales.filter(order => /退货|换货/.test(String(order['类型'] ?? ''))).length]] },
    { title: '消费偏好', tab: 'sales', rows: [['品牌偏好', null], ['品类偏好', null], ['商品偏好', null]] },
    { title: '消费信息', tab: 'sales', rows: [['消费总额', money(values[3])], ['消费件数', sumField(data?.sales.filter(isMemberSale), '数量')], ['消费次数', values[2]], ['客单价', money(values[2] && values[3] !== null ? values[3] / values[2] : null)]] },
    { title: '眼健康信息', tab: 'vision', rows: [['度数', prescription('球镜(SPH)')], ['散光', prescription('柱镜(CYL)')]] },
  ];
  return <div className="mx-auto max-w-[1120px]">
    {isError && <p role="status" className="mb-3 text-sm text-[#73796F]">部分概览数据加载失败</p>}
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(250px,360px)_minmax(0,1fr)] lg:grid-rows-[auto_repeat(3,minmax(100px,auto))_auto] lg:items-center lg:gap-x-6">
      <div className="relative mx-auto aspect-square w-full max-w-[360px] sm:col-span-2 lg:col-span-1 lg:col-start-2 lg:row-span-3 lg:row-start-2">
        {[6, 17, 29].map(inset => <div key={inset} className="absolute rounded-full border border-[var(--qsl-accent-border)]" style={{ inset: `${inset}%` }} />)}
        <div className="absolute inset-[34%] flex items-center justify-center rounded-full bg-[var(--qsl-accent-soft-45)]">
          <UserRound aria-hidden="true" className="h-12 w-12 text-[var(--qsl-accent-soft-ink)]" />
        </div>
        {groups.map(({ title, tab }, index) => {
          const angle = -Math.PI / 2 - index * 2 * Math.PI / groups.length;
          const props = {
            className: 'absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--qsl-accent-border)] bg-[var(--qsl-accent-soft)] text-sm font-semibold tabular-nums text-[var(--qsl-accent-soft-ink)]',
            style: { left: `${50 + 44 * Math.cos(angle)}%`, top: `${50 + 44 * Math.sin(angle)}%` },
          };
          const label = String(index + 1).padStart(2, '0');
          return tab ? <button key={title} type="button" aria-label={title} onClick={() => onNavigate(tab)} {...props}>{label}</button>
            : <span key={title} title={title} {...props}>{label}</span>;
        })}
      </div>
      {groups.map(({ title, rows }, index) => <section key={title} className={`min-w-0 border-l-2 border-[var(--qsl-accent-border)] pl-3 ${position[index]}`}>
        <h3 className="mb-1 text-sm font-semibold text-[#171916]">{String(index + 1).padStart(2, '0')} {title}</h3>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-sm">
          {rows.map(([label, value]) => <React.Fragment key={label}>
            <dt className="whitespace-nowrap text-[#5F645D]">{label}</dt>
            <dd className="break-words tabular-nums">{value == null || value === '' ? '—' : String(value)}</dd>
          </React.Fragment>)}
        </dl>
      </section>)}
    </div>
  </div>;
}
