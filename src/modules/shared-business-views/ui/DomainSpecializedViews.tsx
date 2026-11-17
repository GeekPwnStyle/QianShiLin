import React, { useState } from 'react';
import { Check, Eye, FileWarning, Plus, ShoppingCart } from 'lucide-react';
import { STORE_CATALOG, SUPPLIER_CATALOG } from '@/src/modules/auth/domain/identity';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { FLAT_MENU_NODES, type NavNode } from '@/src/modules/navigation/domain/menuRegistry';
import { useNavigation } from '@/src/modules/navigation/application/NavigationContext';
import { formatCurrency } from '@/src/shared/lib/format';
import { Button } from '@/src/shared/ui/Button';
import { DataTable, type TableColumn } from '@/src/shared/ui/DataTable';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { Modal } from '@/src/shared/ui/Modal';
import { StatusLabel } from '@/src/shared/ui/StatusLabel';

/* ------------------------------------------------------------------
 * 1. Domain-Contextual Master Data Views (Stores, Staff, Suppliers, Brands, Fees, Rules)
 * ------------------------------------------------------------------ */
interface MasterRecord {
  id: string;
  code: string;
  name: string;
  primaryAttr: string;
  secondaryAttr: string;
  tertiaryAttr: string;
  enabled: boolean;
}

function getMasterSeedForNode(nodeId: string): {
  cols: [string, string, string, string];
  rows: MasterRecord[];
} {
  if (nodeId === 'basic.suppliers') {
    return {
      cols: ['供应商编码', '供应商名称', '供货品类', '结算周期'],
      rows: SUPPLIER_CATALOG.map((s, idx) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        primaryAttr: idx === 2 ? '光学镜架' : '功能镜片与隐形眼镜',
        secondaryAttr: '月结 30 天',
        tertiaryAttr: '首营资质已备案',
        enabled: true,
      })),
    };
  }
  if (nodeId === 'system.stores') {
    return {
      cols: ['门店编码', '门店名称', '所属大区', '门店属性'],
      rows: STORE_CATALOG.map((s, idx) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        primaryAttr: s.region,
        secondaryAttr: idx === 0 ? '旗舰视光中心 (含加工)' : '直营零售门店',
        tertiaryAttr: '正常营业',
        enabled: true,
      })),
    };
  }
  if (nodeId === 'basic.staff' || nodeId === 'system.user_assignments') {
    return {
      cols: ['工号', '员工姓名', '岗位角色', '所属门店'],
      rows: [
        { id: 'st_1', code: 'QSL-001', name: '林致远', primaryAttr: '总部运营管理员', secondaryAttr: '全部授权门店', tertiaryAttr: '已激活', enabled: true },
        { id: 'st_2', code: 'QSL-014', name: '周婉宁', primaryAttr: '门店店长', secondaryAttr: '杭州西湖旗舰店', tertiaryAttr: '已激活', enabled: true },
        { id: 'st_3', code: 'QSL-022', name: '许文博', primaryAttr: '高级验光师', secondaryAttr: '杭州西湖旗舰店', tertiaryAttr: '持有二级验光资格证', enabled: true },
        { id: 'st_4', code: 'QSL-031', name: '陈明轩', primaryAttr: '门店导购员', secondaryAttr: '杭州滨江天街店', tertiaryAttr: '已激活', enabled: true },
      ],
    };
  }
  if (nodeId.includes('fee')) {
    return {
      cols: ['项目编码', '收费项目名称', '所属类别', '参考标准价'],
      rows: [
        { id: 'fe_1', code: 'FEE-OPT-01', name: '全套医学综合验光与双眼视评估', primaryAttr: '视光检查服务', secondaryAttr: '¥120.00（配镜可抵扣）', tertiaryAttr: '常规启用', enabled: true },
        { id: 'fe_2', code: 'FEE-OK-02', name: '角膜地形图与眼轴生物测量套餐', primaryAttr: '视光专项检查', secondaryAttr: '¥180.00', tertiaryAttr: '常规启用', enabled: true },
        { id: 'fe_3', code: 'FEE-TRN-03', name: '双眼调节灵敏度训练单次课', primaryAttr: '视功能训练', secondaryAttr: '¥160.00', tertiaryAttr: '常规启用', enabled: true },
      ],
    };
  }
  return {
    cols: ['配置编码', '配置/档案名称', '业务分类', '规则说明'],
    rows: [
      { id: 'md_1', code: 'CFG-001', name: '卡尔蔡司战略合作品牌', primaryAttr: '核心合作品牌', secondaryAttr: '支持车房定制片直连', tertiaryAttr: '默认启用', enabled: true },
      { id: 'md_2', code: 'CFG-002', name: '青少年控度7天适应回访方案', primaryAttr: '售后回访策略', secondaryAttr: '取镜后第7天自动生成提醒', tertiaryAttr: '默认启用', enabled: true },
      { id: 'md_3', code: 'CFG-003', name: '高散光(>2.00DC)镜片定制附加费', primaryAttr: '镜片加工策略', secondaryAttr: '单副加收 ¥150.00', tertiaryAttr: '默认启用', enabled: true },
    ],
  };
}

export const MasterDataView: React.FC<{ node: NavNode }> = ({ node }) => {
  const seed = getMasterSeedForNode(node.id);
  const [rows, setRows] = useState(seed.rows);
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAttr, setNewAttr] = useState('');

  React.useEffect(() => {
    setRows(getMasterSeedForNode(node.id).rows);
    setPage(1);
  }, [node.id]);

  const toggleStatus = (id: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const columns: TableColumn<MasterRecord>[] = [
    { key: 'code', header: seed.cols[0], render: (r) => <span className="font-mono text-[14px]">{r.code}</span> },
    { key: 'name', header: seed.cols[1], sticky: true, render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'primaryAttr', header: seed.cols[2], render: (r) => r.primaryAttr },
    { key: 'secondaryAttr', header: seed.cols[3], render: (r) => r.secondaryAttr },
    {
      key: 'enabled',
      header: '状态',
      render: (r) => <StatusLabel tone={r.enabled ? 'success' : 'neutral'} label={r.enabled ? '启用' : '停用'} />,
    },
    {
      key: 'actions',
      header: '操作',
      render: (r) => (
        <button
          type="button"
          onClick={() => toggleStatus(r.id)}
          className="text-[14px] text-[#171916] hover:underline cursor-pointer"
        >
          {r.enabled ? '停用' : '启用'}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="accent" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAddOpen(true)}>
          新增{node.label}
        </Button>
      </div>
      <DataTable columns={columns} rows={rows} total={rows.length} page={page} pageSize={8} onPageChange={setPage} />

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={`新增${node.label}`}
        maxWidthClass="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>取消</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!newName.trim()) return;
                setRows([
                  {
                    id: `md_${Date.now()}`,
                    code: `NEW-${String(rows.length + 101)}`,
                    name: newName.trim(),
                    primaryAttr: newAttr.trim() || '常规配置',
                    secondaryAttr: '本地演示新增',
                    tertiaryAttr: '启用',
                    enabled: true,
                  },
                  ...rows,
                ]);
                setAddOpen(false);
                setNewName('');
                setNewAttr('');
              }}
            >
              确认保存
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-[15px]">
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">{seed.cols[1]} *</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4]" />
          </div>
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">{seed.cols[2]}</label>
            <input value={newAttr} onChange={(e) => setNewAttr(e.target.value)} className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4]" />
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ------------------------------------------------------------------
 * 2. Business Document List View (Purchase, Transfer, After-Sales, Approvals)
 * ------------------------------------------------------------------ */
interface BusinessDocument {
  id: string;
  docNo: string;
  docType: string;
  bizDate: string;
  orgName: string;
  counterparty: string;
  status: '待处理' | '演示流转中' | '已完成(演示)';
  amount: string;
  lineSummary: string;
}

export const DocumentListView: React.FC<{ node: NavNode }> = ({ node }) => {
  const { session } = useAuth();
  const [detail, setDetail] = useState<BusinessDocument | null>(null);
  const [page, setPage] = useState(1);

  const prefix = node.moduleId === 'purchase' ? 'CG' : node.moduleId === 'transfer' ? 'DB' : node.moduleId === 'after_sales' ? 'WX' : 'YW';
  const docs: BusinessDocument[] = [
    {
      id: 'doc_1',
      docNo: `${prefix}-20261115-001`,
      docType: node.label,
      bizDate: '2026-11-15',
      orgName: session.currentStoreId === 'all' ? '杭州西湖旗舰店' : session.currentStoreName,
      counterparty: node.moduleId === 'transfer' ? '华东总仓 -> 滨江天街店' : '卡尔蔡司光学华东代理',
      status: '待处理',
      amount: '12480.00',
      lineSummary: '蔡司新清锐 1.67 现片 × 10副；纯钛镜架 NOW-6541 × 2支',
    },
    {
      id: 'doc_2',
      docNo: `${prefix}-20261114-008`,
      docType: node.label,
      bizDate: '2026-11-14',
      orgName: session.currentStoreId === 'all' ? '上海静安嘉里中心店' : session.currentStoreName,
      counterparty: node.moduleId === 'after_sales' ? '顾客唐若溪 · 鼻托调校换新' : '依视路镜片供应链中心',
      status: '演示流转中',
      amount: '6840.00',
      lineSummary: '星趣控膜岩 1.591 定制片 × 3副',
    },
  ];

  const columns: TableColumn<BusinessDocument>[] = [
    { key: 'docNo', header: '业务单号', sticky: true, render: (r) => <span className="font-mono font-medium">{r.docNo}</span> },
    { key: 'bizDate', header: '单据日期', render: (r) => <span className="tabular-nums">{r.bizDate}</span> },
    { key: 'orgName', header: '所属门店/组织', render: (r) => r.orgName },
    { key: 'counterparty', header: '关联方 / 业务对象', render: (r) => r.counterparty },
    {
      key: 'status',
      header: '单据状态',
      render: (r) => <StatusLabel tone={r.status === '待处理' ? 'warning' : 'processing'} label={r.status} />,
    },
    { key: 'amount', header: '单据金额', align: 'right', render: (r) => formatCurrency(r.amount) },
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
          <span>单据明细</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable columns={columns} rows={docs} total={docs.length} page={page} pageSize={8} onPageChange={setPage} />
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={`${detail?.docType ?? ''} · ${detail?.docNo ?? ''}`}
        subtitle="单据明细预览（审核、作废及实物流转规则待最终业务确认）"
        footer={<Button variant="secondary" onClick={() => setDetail(null)}>关闭</Button>}
      >
        {detail && (
          <div className="space-y-3 text-[15px]">
            <div><strong>所属组织：</strong>{detail.orgName}</div>
            <div><strong>关联方：</strong>{detail.counterparty}</div>
            <div><strong>商品/服务明细：</strong>{detail.lineSummary}</div>
            <div><strong>参考金额：</strong><span className="tabular-nums font-semibold">{formatCurrency(detail.amount)}</span></div>
          </div>
        )}
      </Modal>
    </div>
  );
};

/* ------------------------------------------------------------------
 * 3. School Vision Screening View
 * ------------------------------------------------------------------ */
export const VisionScreeningView: React.FC<{ pageTitle: string }> = ({ pageTitle }) => {
  const [page, setPage] = useState(1);
  const rows = [
    { id: 'sc_1', school: '杭州市西湖区学军小学（示例）', grade: '四年级 (8个班)', screened: 342, alertCount: 94, rate: '27.5%', date: '2026-10-28' },
    { id: 'sc_2', school: '杭州市滨江区江南实验学校（示例）', grade: '七年级 (10个班)', screened: 465, alertCount: 218, rate: '46.9%', date: '2026-11-04' },
    { id: 'sc_3', school: '上海静安区第一中心小学（示例）', grade: '三年级 (6个班)', screened: 256, alertCount: 49, rate: '19.1%', date: '2026-11-11' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-[18px] font-semibold text-[#171916]">{pageTitle}</h2>
        <HelpTooltip
          title="筛查数据说明"
          content="记录校园公益视力普查数据与转诊复查预警统计（均为虚构学校示例）。"
            ariaLabel="查看校园视力项目说明"
        />
      </div>
      <DataTable
        columns={[
          { key: 'school', header: '合作学校名称', sticky: true, render: (r) => <span className="font-medium">{r.school}</span> },
          { key: 'grade', header: '筛查年级与班级', render: (r) => r.grade },
          { key: 'screened', header: '实测人数', align: 'right', render: (r) => r.screened },
          { key: 'alertCount', header: '视力不良预警人数', align: 'right', render: (r) => <span className="font-semibold text-[#B45309]">{r.alertCount}</span> },
          { key: 'rate', header: '预警占比', align: 'right', render: (r) => r.rate },
          { key: 'date', header: '筛查日期', render: (r) => <span className="tabular-nums">{r.date}</span> },
        ]}
        rows={rows}
        total={rows.length}
        page={page}
        pageSize={8}
        onPageChange={setPage}
      />
    </div>
  );
};

/* ------------------------------------------------------------------
 * 4. Brand Portal & Marketing Showcase
 * ------------------------------------------------------------------ */
export const BrandPortalView: React.FC<{ pageTitle: string }> = ({ pageTitle }) => {
  const [cartIds, setCartIds] = useState<string[]>(['bp_1']);
  const catalog = [
    { id: 'bp_1', brand: '卡尔蔡司', title: '2026秋季 小乐圆青少年防控光学方案包', moq: '10 副起订', wholesale: '1850.00', tag: '新品首发' },
    { id: 'bp_2', brand: '林德伯格', title: 'N.O.W. 极简无框纯钛陈列套装 (含展具)', moq: '6 支整箱', wholesale: '2150.00', tag: '品牌推荐' },
    { id: 'bp_3', brand: '依视路', title: '星趣控膜岩防冲击镜片补充常备片', moq: '20 片起订', wholesale: '1620.00', tag: '高频复购' },
  ];

  const toggleCart = (id: string) => {
    setCartIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#D9DDD4] rounded-[20px] p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[18px] font-semibold text-[#171916]">{pageTitle}</h2>
          <HelpTooltip
            title="品牌采购门户说明"
            content="合作光学品牌直供订货与门店宣发素材中心。"
            ariaLabel="查看品牌采购门户说明"
          />
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#171916] text-white text-[14px] font-medium">
          <ShoppingCart className="w-4 h-4 text-[#D7FF00]" />
          <span>品牌订货车 ({cartIds.length} 项)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {catalog.map((item) => {
          const inCart = cartIds.includes(item.id);
          return (
            <div key={item.id} className="bg-white border border-[#D9DDD4] rounded-[20px] p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="text-[14px] text-[#73796F]">{item.brand} · {item.tag}</div>
                <h3 className="text-[18px] font-semibold text-[#171916] mt-1">{item.title}</h3>
                <p className="text-[14px] text-[#5F645D] mt-2">起订门槛：{item.moq}</p>
              </div>
              <div className="pt-3 border-t border-[#E5E8E0] flex items-center justify-between">
                <div>
                  <div className="text-[13px] text-[#73796F]">协同供货参考价</div>
                  <div className="text-[20px] font-semibold tabular-nums">{formatCurrency(item.wholesale)}</div>
                </div>
                <Button
                  size="sm"
                  variant={inCart ? 'accent' : 'secondary'}
                  icon={inCart ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  onClick={() => toggleCart(item.id)}
                >
                  {inCart ? '已加入订货' : '加入订货'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------
 * 5. Explicitly Unconfirmed Deep Page Shell (e.g. 预约登记, 账期结转)
 * ------------------------------------------------------------------ */
export const UnconfirmedPageShell: React.FC<{ node: NavNode }> = ({ node }) => {
  const { navigateToRoute } = useNavigation();
  return (
    <div className="bg-white border border-[#D9DDD4] rounded-[22px] p-8 space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FEF7EC] text-[#B45309] flex items-center justify-center shrink-0">
          <FileWarning className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2.5">
          <h2 className="text-[20px] font-semibold text-[#171916]">
            {node.label} · 业务规则与字段待确认
          </h2>
          <HelpTooltip
            tone="warning"
            title="待确认业务规则说明"
            content={
              node.unconfirmedNote ??
              '该深层业务功能尚未收到完整字段定义及财务/医疗合规终审规则，依据原型设计规范，本系统不虚构不可靠的结算或医疗流程，也不宣称此页面已完整还原。'
            }
            ariaLabel="查看待确认业务规则说明"
          />
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-[#F8F9F5] border border-[#E5E8E0] text-[15px] text-[#5F645D] space-y-1.5">
        <div className="font-semibold text-[#171916]">已预留接口与菜单位置</div>
        <p>稳定菜单编码：<span className="font-mono text-[#171916]">{node.id}</span></p>
        <p>路由路径：<span className="font-mono text-[#171916]">{node.route}</span></p>
        <p>所需权限编码：<span className="font-mono text-[#171916]">{node.permission}</span></p>
      </div>

      <div>
        <Button variant="primary" onClick={() => navigateToRoute('/modules/help/docs')}>
          查看全部待确认业务规则清单
        </Button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------
 * 6. Help Docs & Prototype Status Registry
 * ------------------------------------------------------------------ */
export const HelpDocsPage: React.FC = () => {
  const { navigateToRoute } = useNavigation();
  const unconfirmedNodes = FLAT_MENU_NODES.filter((n) => Boolean(n.unconfirmedNote));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-5 space-y-2">
          <div className="text-[14px] text-[#73796F]">已完成核心交互模块</div>
          <div className="text-[18px] font-semibold text-[#171916]">业务页面分阶段接入</div>
          <p className="text-[15px] text-[#5F645D]">
            登录与身份隔离、商品总览与导入、收银工作台、客户中心详情、复查邀约和角色权限管理。
          </p>
        </div>
        <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-5 space-y-2">
          <div className="text-[14px] text-[#73796F]">原型模拟与安全边界</div>
          <div className="text-[18px] font-semibold text-[#171916]">真实接口与示例数据并存</div>
          <p className="text-[15px] text-[#5F645D]">
            部分未完成页面仍采用示例数据；不会触发真实短信或微信推送、收银扣款、库存扣减及财务核销。
          </p>
        </div>
        <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-5 space-y-2">
          <div className="text-[14px] text-[#73796F]">未来后端演进契约</div>
          <div className="text-[18px] font-semibold text-[#171916]">Node.js API + PostgreSQL</div>
          <p className="text-[15px] text-[#5F645D]">
            当前已接入角色权限、采购及部分主数据接口，其他模块仍按菜单边界逐步建设。
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-6 space-y-4">
        <h2 className="text-[19px] font-semibold text-[#171916]">
          待确认业务规则清单 ({unconfirmedNodes.length} 项)
        </h2>
        <div className="divide-y divide-[#E5E8E0]">
          {unconfirmedNodes.map((n) => (
            <div key={n.id} className="py-3 flex flex-wrap items-start justify-between gap-3 text-[15px]">
              <div>
                <div className="font-semibold text-[#171916]">{n.label}</div>
                <div className="text-[#5F645D] mt-0.5">{n.unconfirmedNote}</div>
              </div>
              <button
                type="button"
                onClick={() => navigateToRoute(n.route)}
                className="text-[14px] font-medium text-[#171916] underline cursor-pointer shrink-0"
              >
                前往查看
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
