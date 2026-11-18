import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

type Payload = Record<string, unknown>;
const day = 86_400_000;
const within = (days: number, bounds: number[]) => bounds.filter(bound => days <= bound).length;
const above = (value: number, bounds: number[]) => bounds.filter(bound => value >= bound).length;

const metrics = [
  { name: '推荐会员数', bounds: [1, 2, 3, 4, 5], unit: '人' },
  { name: '最近一次消费时间', bounds: [365, 180, 90, 30, 7], unit: '天内' },
  { name: '消费次数', bounds: [1, 2, 4, 8, 12], unit: '次' },
  { name: '消费总金额', bounds: [500, 2000, 5000, 10000, 20000], unit: '元' },
  { name: '单笔最高消费金额', bounds: [300, 1000, 2500, 5000, 10000], unit: '元' },
  { name: '高单价消费商品占比', bounds: [10, 25, 50, 75, 90], unit: '%' },
  { name: '促销(特价)商品消费占比', bounds: [10, 25, 50, 75, 90], unit: '%' },
];
const groups = [{ name: '忠诚度', start: 0, count: 3 }, { name: '购买力', start: 3, count: 2 }, { name: '价格容忍度', start: 5, count: 2 }];
const cell = 'border border-[#D9DDD4] px-3 py-1.5';
const number = (value: unknown) => {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const parsed = Number(String(value).replaceAll(',', ''));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

function share(sales: Payload[], key: string) {
  const pairs = sales.map(order => [number(order['数量']), number(order[key])] as const);
  if (!pairs.length || pairs.some(([total, count]) => total === null || count === null || count > total)) return null;
  const quantity = pairs.reduce((sum, [total]) => sum + (total ?? 0), 0);
  return quantity ? 100 * pairs.reduce((sum, [, count]) => sum + (count ?? 0), 0) / quantity : null;
}

function summarize(orders?: Payload[], referrals?: Payload[]): (number | null)[] {
  const sales = orders?.filter(order => order['类型'] === '销售单' && (order['退换货'] == null || order['退换货'] === '' || order['退换货'] === '无') && !['已取消','已作废','已退款','已退货'].includes(String(order['状态'])));
  const amounts = sales?.map(order => number(order['折后金额']));
  const dates = sales?.map(order => Date.parse(String(order['业务时间'] ?? '').replace(' ', 'T')));
  const hasAmounts = amounts?.length && amounts.every(amount => amount !== null);
  const hasDates = dates?.length && dates.every(Number.isFinite);
  return [
    referrals?.length ?? null,
    hasDates ? Math.max(0, Math.floor((Date.now() - Math.max(...dates!)) / day)) : null,
    sales?.length ?? null,
    hasAmounts ? amounts!.reduce<number>((sum, amount) => sum + (amount ?? 0), 0) : null,
    hasAmounts ? Math.max(...amounts!.map(amount => amount ?? 0)) : null,
    sales ? share(sales, '高单价商品件数') : null,
    sales ? share(sales, '促销商品件数') : null,
  ];
}

function Radar({ scores }: { scores: (number | null)[] }) {
  const point = (index: number, radius: number) => ({
    x: 370 + Math.cos(-Math.PI / 2 - index * 2 * Math.PI / metrics.length) * radius,
    y: 190 + Math.sin(-Math.PI / 2 - index * 2 * Math.PI / metrics.length) * radius,
  });
  const ring = (radius: number) => metrics.map((_, index) => Object.values(point(index, radius)).join(',')).join(' ');
  return <div className="overflow-x-auto">
    <svg viewBox="0 0 740 380" className="mx-auto h-auto w-full min-w-[470px] max-w-[740px]" role="img" aria-label="七项会员价值得分雷达图，满分每项 5 分">
      {[145,116,87,58,29].map((radius, index) => <polygon key={radius} points={ring(radius)} fill={index % 2 ? '#F3F5F2' : '#FFFFFF'} stroke="#D9DDD4" />)}
      {metrics.map(({name}, index) => {
        const edge = point(index,145);
        const label = point(index,158);
        return <g key={name}>
          <line x1={370} y1={190} x2={edge.x} y2={edge.y} stroke="#D9DDD4" />
          <text x={label.x} y={label.y} textAnchor={index === 0 ? 'middle' : label.x < 370 ? 'end' : 'start'} dominantBaseline="middle" fill="#5F645D" fontSize="13">{name}</text>
        </g>;
      })}
      {scores.every(score => score !== null) && <polygon points={scores.map((score, index) => Object.values(point(index, score! * 29)).join(',')).join(' ')} fill="var(--qsl-accent)" fillOpacity=".28" stroke="var(--qsl-accent-border)" strokeWidth="2" />}
      {scores.map((score, index) => {
        if (score === null) return null;
        const { x, y } = point(index, score * 29);
        return <g key={metrics[index].name}>
          <circle cx={x} cy={y} r={4} fill="var(--qsl-accent)" stroke="var(--qsl-accent-border)" />
          <text x={x} y={y - 8} textAnchor="middle" fontSize="12" fill="#171916">{score}</text>
        </g>;
      })}
    </svg>
  </div>;
}

export function CustomerValuePanel({ customerId, debugMode }: { customerId: string; debugMode: boolean }) {
  const [showStandard, setShowStandard] = useState(false);
  const query = useQuery({
    queryKey: ['customer-value', customerId],
    enabled: !debugMode,
    queryFn: async () => {
      const read = async (section: string): Promise<Payload[]> => {
        const response = await fetch(`${import.meta.env.BASE_URL}api/customers/${customerId}/detail/${section}`);
        if (!response.ok) throw new Error('会员价值数据加载失败');
        const data = await response.json() as { items: { payload: Payload }[] };
        return data.items.map(item => item.payload);
      };
      const [orders, referrals] = await Promise.all([read('sales'), read('referrals')]);
      return { orders, referrals };
    },
  });
  const values = summarize(query.data?.orders, query.data?.referrals);
  const scores = values.map((value, index) => value === null ? null : index === 1 ? within(value, metrics[index].bounds) : above(value, metrics[index].bounds));
  const sum = (items: (number | null)[]) => items.some(score => score === null) ? '—' : items.reduce<number>((total, score) => total + (score ?? 0), 0);
  const heading = 'border-b border-[var(--qsl-accent-border)] pb-1 text-sm font-semibold';
  return <div className="space-y-3 text-sm">
    <div className={heading}>会员价值评分标准
      <button type="button" onClick={() => setShowStandard(open => !open)} aria-expanded={showStandard}
        className="ml-2 rounded-md bg-[var(--qsl-accent)] px-2 py-0.5 text-xs text-[var(--qsl-accent-ink)]">{showStandard ? '隐藏' : '显示'}</button>
    </div>
    {showStandard && <div className="overflow-x-auto">
      <p className="mb-2 text-xs text-[#5F645D]">千视林评分规则。各项最高 5 分，达到对应阈值即可得分，未达到 1 分阈值记 0 分。</p>
      <table className="border-collapse text-xs"><thead className="bg-[#F5F7F2]"><tr>{['指标','1 分','2 分','3 分','4 分','5 分'].map(label => <th className={cell} key={label}>{label}</th>)}</tr></thead>
      <tbody>{metrics.map(metric => <tr key={metric.name}><th scope="row" className={cell}>{metric.name}</th>{metric.bounds.map(bound => <td key={bound} className={cell}>{bound}{metric.unit}</td>)}</tr>)}</tbody></table>
    </div>}
    <h3 className={heading}>会员价值总和得分</h3>
    <div className="overflow-x-auto">
      <table className="border-collapse text-center text-xs tabular-nums">
        <thead className="bg-[#F5F7F2]"><tr>{['分析','维度','指标','得分','小计','总分'].map(label => <th key={label} className={cell}>{label}</th>)}</tr></thead>
        <tbody>{groups.flatMap(group => scores.slice(group.start, group.start + group.count).map((score, index) => <tr key={group.start + index}>
          {group.start === 0 && index === 0 && <th rowSpan={metrics.length} className={cell}>会员价值分析</th>}
          {index === 0 && <th rowSpan={group.count} className={cell}>{group.name}</th>}
          <th scope="row" className={cell}>{metrics[group.start + index].name}</th>
          <td className={cell}>{score ?? '—'}</td>
          {index === 0 && <td rowSpan={group.count} className={cell}>{sum(scores.slice(group.start, group.start + group.count))}</td>}
          {group.start === 0 && index === 0 && <td rowSpan={metrics.length} className={cell}>{sum(scores)}</td>}
        </tr>))}</tbody>
      </table>
    </div>
    <h3 className={heading}>会员价值雷达分析</h3>
    <div className="flex items-center justify-center gap-2 text-xs"><span className="h-2.5 w-5 rounded bg-[var(--qsl-accent)]" />会员价值得分</div>
    <Radar scores={scores} />
    {scores.some(score => score === null) && <p className="text-center text-xs text-[#5F645D]">{query.isError ? '会员价值数据加载失败' : query.isFetching ? '正在加载会员价值数据' : '部分指标缺少数据，以「—」显示。'}</p>}
  </div>;
}
