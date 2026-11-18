import React, { useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { useNavigation } from '@/src/modules/navigation/application/NavigationContext';
import { Button } from '@/src/shared/ui/Button';
import { DataTable, type TableColumn } from '@/src/shared/ui/DataTable';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { StatusLabel } from '@/src/shared/ui/StatusLabel';

interface StockRow {
  id: string;
  skuCode: string;
  productName: string;
  storeName: string;
  warehouseName: string;
  spec: string;
  bookQty: number;
  reservedQty: number;
  availableQty: number;
  safetyMin: number;
}

const STOCK_ROWS: StockRow[] = [
  { id: 'stk_01', skuCode: 'QSL-FR-1001', productName: '林德伯格风格超轻纯钛镜架 N.O.W. 6541', storeName: '杭州西湖旗舰店', warehouseName: '西湖正仓', spec: '曜石黑/51□19', bookQty: 8, reservedQty: 2, availableQty: 6, safetyMin: 3 },
  { id: 'stk_02', skuCode: 'QSL-LN-2001', productName: '蔡司新清锐铂金膜非球面镜片 1.67', storeName: '杭州西湖旗舰店', warehouseName: '西湖现片库', spec: '-3.00D / 现片', bookQty: 24, reservedQty: 4, availableQty: 20, safetyMin: 10 },
  { id: 'stk_03', skuCode: 'QSL-LN-2003', productName: '依视路星趣控膜岩青少年控度镜片', storeName: '杭州滨江天街店', warehouseName: '滨江专柜仓', spec: '-1.75D / 现片', bookQty: 4, reservedQty: 2, availableQty: 2, safetyMin: 5 },
  { id: 'stk_04', skuCode: 'QSL-CL-3001', productName: '安视优欧舒适硅水凝胶日抛 30片装', storeName: '上海静安嘉里中心店', warehouseName: '静安阴凉库', spec: '-3.50D / BC8.5', bookQty: 18, reservedQty: 0, availableQty: 18, safetyMin: 8 },
  { id: 'stk_05', skuCode: 'QSL-FR-1002', productName: '千视林甄选复古板材方框 QSL-AC2608', storeName: '杭州滨江天街店', warehouseName: '滨江陈列仓', spec: '琥珀玳瑁/50□20', bookQty: 12, reservedQty: 1, availableQty: 11, safetyMin: 4 },
];

const CROSSTAB_SPHS = ['-1.00', '-1.50', '-2.00', '-2.50', '-3.00', '-3.50', '-4.00'];
const CROSSTAB_CYLS = ['0.00', '-0.50', '-0.75', '-1.00', '-1.25'];

export const InventoryQueryPage: React.FC<{ isCrosstab?: boolean; pageTitle: string }> = ({
  isCrosstab = false,
  pageTitle,
}) => {
  const { session } = useAuth();
  const { navigateToRoute } = useNavigation();
  const [kw, setKw] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = STOCK_ROWS.filter((r) => {
    if (session.identityType === 'store' && session.currentStoreId !== 'all') {
      if (!r.storeName.includes(session.currentStoreName.slice(0, 4))) return false;
    }
    if (!kw.trim()) return true;
    const q = kw.toLowerCase();
    return r.productName.toLowerCase().includes(q) || r.skuCode.toLowerCase().includes(q) || r.spec.toLowerCase().includes(q);
  });

  const columns: TableColumn<StockRow>[] = [
    {
      key: 'productName',
      header: '商品名称与编码',
      sticky: true,
      render: (r) => (
        <div>
          <div className="font-medium text-[#171916]">{r.productName}</div>
          <div className="text-[13px] font-mono text-[#73796F]">{r.skuCode}</div>
        </div>
      ),
    },
    { key: 'storeName', header: '门店', render: (r) => r.storeName },
    { key: 'warehouseName', header: '仓库', render: (r) => r.warehouseName },
    { key: 'spec', header: '规格/光度', render: (r) => <span className="font-mono text-[14px]">{r.spec}</span> },
    { key: 'bookQty', header: '账面库存', align: 'right', render: (r) => r.bookQty },
    { key: 'reservedQty', header: '加工/开单预占', align: 'right', render: (r) => r.reservedQty },
    {
      key: 'availableQty',
      header: '可用库存',
      align: 'right',
      render: (r) => (
        <span className={`font-semibold ${r.availableQty < r.safetyMin ? 'text-[#DC2626]' : 'text-[#171916]'}`}>
          {r.availableQty}
        </span>
      ),
    },
    {
      key: 'health',
      header: '库存状态',
      render: (r) =>
        r.availableQty < r.safetyMin ? (
          <StatusLabel tone="warning" label={`低于安全线 (${r.safetyMin})`} />
        ) : (
          <StatusLabel tone="success" label="库存充足" />
        ),
    },
  ];

  return (
    <div className="space-y-5">
      {isCrosstab ? (
        <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-semibold text-[#171916]">
                {pageTitle} · 球镜 (SPH) × 柱镜 (CYL) 现片分布矩阵
              </h2>
              <HelpTooltip
                tone="warning"
                title="库存口径与矩阵说明"
                content={
    '示例品种：蔡司新清锐 1.67 铂金膜；主题高亮格代表低库存预警（<3片）。\n\n账面库存与可用库存差异（加工预占、店间在途锁定）需由业务最终定义；库存数量严禁在列表中直接手改，必须通过「库存调整」「盘点任务」或「店间协同」留痕调整。'
                }
                ariaLabel="查看库存口径与矩阵说明"
              />
            </div>
            <span className="text-[14px] text-[#5F645D]">蔡司新清锐 1.67 铂金膜</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-center text-[14px] tabular-nums">
              <thead>
                <tr className="bg-[#F8F9F5] border-b border-[#D9DDD4]">
                  <th className="p-3 text-left font-semibold text-[#5F645D]">球镜 \ 柱镜</th>
                  {CROSSTAB_CYLS.map((c) => (
                    <th key={c} className="p-3 font-mono font-semibold text-[#171916]">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8E0]">
                {CROSSTAB_SPHS.map((s, si) => (
                  <tr key={s}>
                    <td className="p-3 text-left font-mono font-semibold bg-[#F8F9F5] text-[#171916]">
                      {s}
                    </td>
                    {CROSSTAB_CYLS.map((c, ci) => {
                      const val = ((si * 3 + ci * 5 + 7) % 14);
                      const low = val <= 2;
                      return (
                        <td
                          key={c}
                          className={`p-3 font-mono border-l border-[#E5E8E0] ${
                            low ? 'bg-[var(--qsl-accent-soft)] font-semibold text-[#171916]' : 'text-[#5F645D]'
                          }`}
                        >
                          {val} 片
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-72">
              <Search className="w-4 h-4 text-[#73796F] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={kw}
                onChange={(e) => {
                  setKw(e.target.value);
                  setPage(1);
                }}
                placeholder="按商品名称、SKU或光度规格筛选"
                className="w-full h-10 pl-9 pr-3 rounded-[9px] bg-[#F8F9F5] border border-[#D9DDD4] text-[15px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                icon={<ArrowRight className="w-3.5 h-3.5" />}
                onClick={() => navigateToRoute('/modules/inventory/stocktake')}
              >
                    前往盘点任务调整
              </Button>
              <Button
                variant="secondary"
                icon={<ArrowRight className="w-3.5 h-3.5" />}
                onClick={() => navigateToRoute('/modules/inventory/loss-overflow')}
              >
                    新建库存调整单
              </Button>
              <HelpTooltip
                tone="warning"
                title="库存口径与调整原则"
            content="账面库存与可用库存差异（加工预占、店间在途锁定）需由业务最终定义；库存数量严禁在列表中直接手改，必须通过「库存调整」「盘点任务」或「店间协同」留痕调整。"
                placement="bottom-end"
                ariaLabel="查看库存口径与调整原则"
              />
            </div>
          </div>

          <DataTable
            columns={columns}
            rows={filtered}
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </>
      )}
    </div>
  );
};
