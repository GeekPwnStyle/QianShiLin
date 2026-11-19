import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { formatCurrency } from '@/src/shared/lib/format';
import { Button } from '@/src/shared/ui/Button';
import { DataTable, type TableColumn } from '@/src/shared/ui/DataTable';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { Modal } from '@/src/shared/ui/Modal';
import { StatusLabel } from '@/src/shared/ui/StatusLabel';

interface FinanceDocRow {
  id: string;
  docNo: string;
  sourceDocNo: string;
  counterparty: string;
  supplierId?: string;
  bizDate: string;
  dueDate: string;
  payableAmount: string;
  settledAmount: string;
  unsettledAmount: string;
  status: '待核对' | '部分核销' | '待财务审核';
}

const FINANCE_ROWS: FinanceDocRow[] = [
  { id: 'fin_01', docNo: 'DZ-202611-001', sourceDocNo: 'CG-20261102-014', counterparty: '卡尔蔡司光学华东代理', supplierId: 'sup_zeiss_01', bizDate: '2026-11-02', dueDate: '2026-12-02', payableAmount: '68400.00', settledAmount: '20000.00', unsettledAmount: '48400.00', status: '部分核销' },
  { id: 'fin_02', docNo: 'DZ-202611-002', sourceDocNo: 'CG-20261108-009', counterparty: '依视路镜片供应链中心', supplierId: 'sup_essilor_02', bizDate: '2026-11-08', dueDate: '2026-12-08', payableAmount: '42180.00', settledAmount: '0.00', unsettledAmount: '42180.00', status: '待核对' },
  { id: 'fin_03', docNo: 'DZ-202611-003', sourceDocNo: 'CG-20261112-021', counterparty: '北欧钛架联合供货商', supplierId: 'sup_linberg_03', bizDate: '2026-11-12', dueDate: '2026-12-12', payableAmount: '31950.00', settledAmount: '0.00', unsettledAmount: '31950.00', status: '待财务审核' },
];

export const FinanceLedgerPage: React.FC<{ pageTitle: string }> = ({ pageTitle }) => {
  const { session } = useAuth();
  const [detail, setDetail] = useState<FinanceDocRow | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const visibleRows = FINANCE_ROWS.filter((r) => {
    if (session.identityType === 'supplier') {
      return r.supplierId === session.supplierId;
    }
    return true;
  });

  const columns: TableColumn<FinanceDocRow>[] = [
    { key: 'docNo', header: '账款单号', sticky: true, render: (r) => <span className="font-mono font-medium">{r.docNo}</span> },
    { key: 'sourceDocNo', header: '来源业务单据', render: (r) => <span className="font-mono text-[14px] text-[#5F645D]">{r.sourceDocNo}</span> },
    { key: 'counterparty', header: '往来单位/账户', render: (r) => r.counterparty },
    { key: 'bizDate', header: '业务日期', render: (r) => <span className="tabular-nums">{r.bizDate}</span> },
    { key: 'dueDate', header: '账期到期日', render: (r) => <span className="tabular-nums">{r.dueDate}</span> },
    { key: 'payableAmount', header: '应付/应收总额', align: 'right', render: (r) => formatCurrency(r.payableAmount) },
    { key: 'settledAmount', header: '已核销金额', align: 'right', render: (r) => formatCurrency(r.settledAmount) },
    { key: 'unsettledAmount', header: '未结余额', align: 'right', render: (r) => <span className="font-semibold">{formatCurrency(r.unsettledAmount)}</span> },
    {
      key: 'status',
      header: '财务状态',
      render: (r) => (
        <StatusLabel
          tone={r.status === '部分核销' ? 'processing' : 'warning'}
          label={r.status}
        />
      ),
    },
    {
      key: 'actions',
      header: '操作',
      render: (r) => (
        <button
          type="button"
          onClick={() => setDetail(r)}
          className="text-[14px] font-medium text-[#171916] hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          <span>核对明细</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-[18px] font-semibold text-[#171916]">{pageTitle}台账</h2>
        <HelpTooltip
          tone="warning"
          title="财务原型约束声明"
          content={`当前「${pageTitle}」展示来源单据、右对齐精确金额与未结状态；前端原型不模拟真实银行付款、开票或总账结算完成动作，三单匹配与账期核销规则待财务部最终确认。`}
          ariaLabel="查看财务原型约束声明"
        />
      </div>

      <DataTable
        columns={columns}
        rows={visibleRows}
        total={visibleRows.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setPageSize(next);
          setPage(1);
        }}
      />

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={`账款单据明细 · ${detail?.docNo ?? ''}`}
        subtitle={`关联来源单据：${detail?.sourceDocNo ?? ''}`}
        footer={<Button variant="secondary" onClick={() => setDetail(null)}>关闭</Button>}
      >
        {detail && (
          <div className="space-y-3 text-[15px]">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[14px] text-[#73796F]">往来关联方</div>
                <div className="font-medium mt-0.5">{detail.counterparty}</div>
              </div>
              <div>
                <div className="text-[14px] text-[#73796F]">账期到期日</div>
                <div className="tabular-nums mt-0.5">{detail.dueDate}</div>
              </div>
              <div>
                <div className="text-[14px] text-[#73796F]">应付总额</div>
                <div className="tabular-nums font-semibold mt-0.5">{formatCurrency(detail.payableAmount)}</div>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[14px] text-[#73796F]">未结金额</div>
                  <div className="tabular-nums font-semibold text-[#B45309] mt-0.5">{formatCurrency(detail.unsettledAmount)}</div>
                </div>
                <HelpTooltip
                  title="核销幂等性说明"
                  content="正式环境将由 NestJS + PostgreSQL 事务流水控制核销幂等性，此处仅作单据结构展示。"
                  placement="bottom-end"
                  ariaLabel="查看核销幂等性说明"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
