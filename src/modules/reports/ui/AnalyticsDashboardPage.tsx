import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { formatCurrency } from '@/src/shared/lib/format';
import { DotMatrixChart, RoundedBarChart, ThinLineChart } from '@/src/shared/ui/Charts';
import { DataTable, type TableColumn } from '@/src/shared/ui/DataTable';
import { Modal } from '@/src/shared/ui/Modal';
import { Button } from '@/src/shared/ui/Button';

interface StoreAnalysisRow {
  id: string;
  storeName: string;
  ordersCount: number;
  revenue: string;
  avgTicket: string;
  repurchaseRate: string;
  controlLensRatio: string;
}

const STORE_ANALYTICS: StoreAnalysisRow[] = [
  { id: 'sa_01', storeName: '杭州西湖旗舰店', ordersCount: 184, revenue: '468200.00', avgTicket: '2544.57', repurchaseRate: '34.2%', controlLensRatio: '41.8%' },
  { id: 'sa_02', storeName: '上海静安嘉里中心店', ordersCount: 152, revenue: '412800.00', avgTicket: '2715.79', repurchaseRate: '31.5%', controlLensRatio: '38.4%' },
  { id: 'sa_03', storeName: '杭州滨江天街店', ordersCount: 129, revenue: '238400.00', avgTicket: '1848.06', repurchaseRate: '26.8%', controlLensRatio: '35.1%' },
  { id: 'sa_04', storeName: '南京新街口视光中心', ordersCount: 98, revenue: '196500.00', avgTicket: '2005.10', repurchaseRate: '29.0%', controlLensRatio: '44.2%' },
];

export const AnalyticsDashboardPage: React.FC<{ pageTitle: string }> = ({ pageTitle }) => {
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [definitionOpen, setDefinitionOpen] = useState(false);
  const [page, setPage] = useState(1);

  const visibleRows =
    selectedStore === 'all'
      ? STORE_ANALYTICS
      : STORE_ANALYTICS.filter((r) => r.id === selectedStore);

  const columns: TableColumn<StoreAnalysisRow>[] = [
    { key: 'storeName', header: '门店', sticky: true, render: (r) => <span className="font-medium">{r.storeName}</span> },
    { key: 'ordersCount', header: '成交单数', align: 'right', render: (r) => r.ordersCount },
    { key: 'revenue', header: '营业额', align: 'right', render: (r) => <span className="font-semibold">{formatCurrency(r.revenue)}</span> },
    { key: 'avgTicket', header: '平均客单价', align: 'right', render: (r) => formatCurrency(r.avgTicket) },
    { key: 'repurchaseRate', header: '12个月复购率', align: 'right', render: (r) => r.repurchaseRate },
    { key: 'controlLensRatio', header: '功能控度片占比', align: 'right', render: (r) => r.controlLensRatio },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] text-[#5F645D]">联动筛选门店：</span>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="h-10 px-3 rounded-[9px] bg-[#F8F9F5] border border-[#D9DDD4] text-[15px]"
          >
            <option value="all">全部授权门店</option>
            {STORE_ANALYTICS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.storeName}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="secondary"
          icon={<HelpCircle className="w-4 h-4" />}
          onClick={() => setDefinitionOpen(true)}
        >
          查看指标口径说明
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-[#D9DDD4] rounded-[20px] p-5">
          <h2 className="text-[18px] font-semibold text-[#171916] mb-1">{pageTitle} · 周期走势</h2>
          <p className="text-[14px] text-[#73796F] mb-3">近6周营收与同比基线对照</p>
          <ThinLineChart
            data={[
              { label: 'W41', primary: 192000, secondary: 168000 },
              { label: 'W42', primary: 215000, secondary: 184000 },
              { label: 'W43', primary: 204000, secondary: 192000 },
              { label: 'W44', primary: 248000, secondary: 210000 },
              { label: 'W45', primary: 269000, secondary: 224000 },
              { label: 'W46', primary: 288000, secondary: 241000 },
            ]}
            primaryLabel="本期汇总 (元)"
            secondaryLabel="去年同期 (元)"
            valueFormatter={(v) => `¥${v.toLocaleString('zh-CN')}`}
          />
        </div>

        <div className="lg:col-span-5 bg-white border border-[#D9DDD4] rounded-[20px] p-5 space-y-5">
          <div>
            <h2 className="text-[18px] font-semibold text-[#171916] mb-1">品类结构贡献</h2>
            <RoundedBarChart
              data={[
                { label: '离焦控度片', value: 418, highlight: true },
                { label: '高折单光片', value: 312 },
                { label: '纯钛镜架', value: 265 },
                { label: '隐形及护理', value: 184 },
              ]}
              unit=" 千元"
            />
          </div>
          <div className="pt-3 border-t border-[#E5E8E0]">
            <h3 className="text-[16px] font-semibold text-[#171916] mb-2">RFM 会员价值分层分布</h3>
            <DotMatrixChart
              items={[
                { label: '重要价值客户', count: 142, highlight: true },
                { label: '重点复查客群', count: 96 },
                { label: '新客首配', count: 118 },
                { label: '流失预警客群', count: 43 },
              ]}
              unit="人"
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={visibleRows}
        total={visibleRows.length}
        page={page}
        pageSize={8}
        onPageChange={setPage}
      />

      <Modal
        open={definitionOpen}
        onClose={() => setDefinitionOpen(false)}
        title="统计口径与指标计算说明"
        footer={<Button variant="secondary" onClick={() => setDefinitionOpen(false)}>关闭</Button>}
      >
        <div className="space-y-3 text-[15px] text-[#5F645D]">
          <p><strong className="text-[#171916]">营业额：</strong>按门店有效成交销售单折后实收口径统计（扣除已退货单，未计入未核销草稿）。</p>
          <p><strong className="text-[#171916]">平均客单价：</strong>周期内营业额 ÷ 成交单数，保留两位小数。</p>
          <p><strong className="text-[#171916]">功能控度片占比：</strong>青少年近视防控离焦镜片及渐进多焦点镜片销售额 ÷ 镜片总销售额。</p>
          <p><strong className="text-[#171916]">待确认说明：</strong>跨店取镜订单的业绩归属门店（开单店 vs 取镜店）分摊比例待财务制度最终确认。</p>
        </div>
      </Modal>
    </div>
  );
};
