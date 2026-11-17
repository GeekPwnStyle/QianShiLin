import React, { useState } from 'react';
import { DataTable, type TableColumn } from '@/src/shared/ui/DataTable';
import { StatusLabel } from '@/src/shared/ui/StatusLabel';

interface ProcessingOrder {
  id: string;
  jobNo: string;
  salesOrderNo: string;
  storeName: string;
  customerName: string;
  odSpec: string;
  osSpec: string;
  pdMm: string;
  lensSummary: string;
  stage: '待配片' | '磨边加工中' | '质检完成' | '已发往门店';
  eta: string;
}

const INITIAL_JOBS: ProcessingOrder[] = [
  { id: 'jg_01', jobNo: 'JG-20261115-01', salesOrderNo: 'SO-20261115-001', storeName: '杭州西湖旗舰店', customerName: '沈佳宁', odSpec: '-2.25/-0.75×175', osSpec: '-2.00/-0.50×5', pdMm: '60.5mm', lensSummary: '蔡司小乐圆 1.60 车房定制', stage: '磨边加工中', eta: '2026-11-17' },
  { id: 'jg_02', jobNo: 'JG-20261112-08', salesOrderNo: 'SO-20261112-022', storeName: '杭州西湖旗舰店', customerName: '陆文涛', odSpec: '-6.50/-1.25×90', osSpec: '-6.25/-1.00×88', pdMm: '65.0mm', lensSummary: '蔡司智锐 1.74 铂金膜', stage: '质检完成', eta: '2026-11-16' },
  { id: 'jg_03', jobNo: 'JG-20261114-03', salesOrderNo: 'SO-20261114-005', storeName: '杭州滨江天街店', customerName: '许知远', odSpec: '-4.00/0.00', osSpec: '-3.75/-0.50×180', pdMm: '63.0mm', lensSummary: '蔡司新清锐 1.67 现片', stage: '待配片', eta: '2026-11-16' },
];

export const ProcessingOrderPage: React.FC = () => {
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [page, setPage] = useState(1);

  const advanceStage = (id: string) => {
    const order: ProcessingOrder['stage'][] = ['待配片', '磨边加工中', '质检完成', '已发往门店'];
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== id) return j;
        const idx = order.indexOf(j.stage);
        return { ...j, stage: order[Math.min(order.length - 1, idx + 1)] };
      })
    );
  };

  const columns: TableColumn<ProcessingOrder>[] = [
    { key: 'jobNo', header: '加工单号', sticky: true, render: (r) => <span className="font-mono font-medium">{r.jobNo}</span> },
    { key: 'salesOrderNo', header: '关联销售单', render: (r) => <span className="font-mono text-[14px] text-[#5F645D]">{r.salesOrderNo}</span> },
    { key: 'storeName', header: '门店', render: (r) => r.storeName },
    { key: 'customerName', header: '顾客', render: (r) => r.customerName },
    { key: 'odSpec', header: '右眼 (OD) 光度', render: (r) => <span className="font-mono text-[14px]">{r.odSpec}</span> },
    { key: 'osSpec', header: '左眼 (OS) 光度', render: (r) => <span className="font-mono text-[14px]">{r.osSpec}</span> },
    { key: 'pdMm', header: '瞳距', render: (r) => <span className="font-mono text-[14px]">{r.pdMm}</span> },
    { key: 'lensSummary', header: '镜片工艺', render: (r) => r.lensSummary },
    {
      key: 'stage',
      header: '加工状态',
      render: (r) => (
        <StatusLabel
          tone={r.stage === '质检完成' || r.stage === '已发往门店' ? 'success' : 'processing'}
          label={r.stage}
        />
      ),
    },
    { key: 'eta', header: '预计完成', render: (r) => <span className="tabular-nums">{r.eta}</span> },
    {
      key: 'actions',
      header: '演示流转',
      render: (r) =>
        r.stage !== '已发往门店' ? (
          <button
            type="button"
            onClick={() => advanceStage(r.id)}
            className="text-[14px] font-medium text-[var(--qsl-accent-ink)] bg-[var(--qsl-accent)] hover:bg-[var(--qsl-accent-hover)] border border-[var(--qsl-accent-border)] px-3 py-1 rounded-full cursor-pointer transition-colors"
          >
            推进下一工序
          </button>
        ) : (
          <span className="text-[14px] text-[#73796F]">已完结</span>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={jobs}
      total={jobs.length}
      page={page}
      pageSize={8}
      onPageChange={setPage}
    />
  );
};
