export type MenuNodeType = 'module' | 'group' | 'page' | 'tab';

export type PageKind =
  | 'workbench'
  | 'product_list'
  | 'sales_pos'
  | 'member_profile'
  | 'followup_notification'
  | 'role_permissions'
  | 'user_assignments'
  | 'operation_logs'
  | 'internal_notices'
  | 'store_profiles'
  | 'system_parameters'
  | 'vision_record'
  | 'inventory_query'
  | 'finance_ledger'
  | 'processing_order'
  | 'contact_lens_compliance'
  | 'screening'
  | 'orthokeratology'
  | 'analytics'
  | 'master_data'
  | 'catalog_brand'
  | 'catalog_supplier'
  | 'catalog_warehouse'
  | 'purchase_orders'
  | 'purchase_manual_inbound'
  | 'document_list'
  | 'brand_portal'
  | 'help_docs'
  | 'unconfirmed_shell';

export interface NavNode {
  id: string;
  code?: string;
  label: string;
  description?: string;
  parentId: string | null;
  moduleId: string;
  route: string;
  icon: string;
  permission: string;
  order: number;
  nodeType: MenuNodeType;
  favoritable: boolean;
  pageKind: PageKind;
  /** Whether this exact menu node/page/tab has been developed according to real business requirements */
  implemented: boolean;
  /** True if this node itself is implemented OR any descendant (L2/L3/L4) is implemented */
  hasDevelopedFeature: boolean;
  unconfirmedNote?: string;
  children?: NavNode[];
}

interface RawNodeInput {
  id: string;
  code?: string;
  label: string;
  description?: string;
  icon?: string;
  permission: string;
  nodeType: MenuNodeType;
  favoritable?: boolean;
  pageKind?: PageKind;
  implemented?: boolean;
  unconfirmedNote?: string;
  children?: RawNodeInput[];
}

function slugifyId(id: string): string {
  return id.replace(/\./g, '/').replace(/_/g, '-');
}

function buildTree(
  inputs: RawNodeInput[],
  parentId: string | null,
  moduleId: string
): NavNode[] {
  return inputs.map((item, idx) => {
    const resolvedModuleId = moduleId || item.id;
    const route =
      item.id === 'workbench'
        ? '/workbench'
        : `/modules/${slugifyId(item.id)}`;
    const children =
      item.children && item.children.length > 0
        ? buildTree(item.children, item.id, resolvedModuleId)
        : undefined;
    const implemented = Boolean(item.implemented);
    const hasDevelopedFeature =
      implemented || Boolean(children?.some((child) => child.hasDevelopedFeature));

    const node: NavNode = {
      id: item.id,
      code: item.code,
      label: item.label,
      description: item.description,
      parentId,
      moduleId: resolvedModuleId,
      route,
      icon: item.icon ?? 'FileText',
      permission: item.permission,
      order: idx + 1,
      nodeType: item.nodeType,
      favoritable: item.favoritable ?? item.nodeType === 'page',
      pageKind: item.pageKind ?? 'document_list',
      implemented,
      hasDevelopedFeature,
      unconfirmedNote: item.unconfirmedNote,
      children,
    };
    return node;
  });
}

const RAW_MODULES: RawNodeInput[] = [
  {
    id: 'basic',
    code: '01',
    label: '基本资料',
    description: '商品目录、顾客与店员档案、供应商及收费标准主数据。',
    icon: 'Layers',
    permission: 'basic.read',
    nodeType: 'module',
    children: [
      {
        id: 'basic.product',
        label: '商品档案',
        permission: 'basic.product.read',
        nodeType: 'group',
        children: [
          {
            id: 'basic.product.list',
            label: '商品总览',
            description: '管理镜架、镜片、隐形眼镜及护理液主数据，支持品类树筛选与批量导入导出。',
            permission: 'basic.product.read',
            nodeType: 'page',
            favoritable: true,
            pageKind: 'product_list',
          },
          {
            id: 'basic.product.categories',
            label: '商品分类体系',
            description: '维护光学镜架、功能镜片、太阳镜及护理耗材的多级分类树。',
            permission: 'basic.product.read',
            nodeType: 'page',
            pageKind: 'master_data',
          },
          {
            id: 'basic.product.tags',
            label: '选品标签',
            description: '维护热销、控度、防蓝光、高折射率等商品营销与选品标签。',
            permission: 'basic.product.read',
            nodeType: 'page',
            pageKind: 'master_data',
          },
          {
            id: 'basic.product.lens_surcharge',
            label: '镜片工艺加价',
            description: '配置高散光定制、超薄加工、特殊镀膜与染色附加费标准。',
            permission: 'basic.product.read',
            nodeType: 'page',
            pageKind: 'master_data',
          },
        ],
      },
      {
        id: 'basic.customers',
        label: '客户档案',
        description: '门店散客及建档顾客的基础联系与消费来源信息。',
        permission: 'basic.customer.read',
        nodeType: 'page',
        pageKind: 'master_data',
      },
      {
        id: 'basic.staff',
        label: '员工档案',
        description: '维护门店店长、导购员、验光师与加工技师岗位档案。',
        permission: 'basic.staff.read',
        implemented: true,
        nodeType: 'page',
        pageKind: 'master_data',
      },
      {
        id: 'basic.suppliers',
        label: '供应商资料',
        description: '合作镜片厂商、镜架代理商及资质效期主数据管理。',
        permission: 'basic.supplier.read',
        nodeType: 'page',
        pageKind: 'catalog_supplier',
        implemented: true,
      },
      {
        id: 'basic.brands',
        label: '品牌资料',
        description: '代理品牌与自有品牌档案、授权等级与折扣基线配置。',
        permission: 'basic.brand.read',
        nodeType: 'page',
        pageKind: 'catalog_brand',
        implemented: true,
      },
      {
        id: 'basic.fees',
        label: '服务定价',
        permission: 'basic.fee.read',
        nodeType: 'group',
        children: [
          {
            id: 'basic.fees.categories',
            label: '服务类别',
            description: '定义验光服务、视功能训练、角膜塑形护理等收费大类。',
            permission: 'basic.fee.read',
            nodeType: 'page',
            pageKind: 'master_data',
          },
          {
            id: 'basic.fees.items',
            label: '服务项目',
            description: '配置具体非商品类服务收费明细与参考标准价。',
            permission: 'basic.fee.read',
            nodeType: 'page',
            pageKind: 'master_data',
          },
        ],
      },
    ],
  },
  {
    id: 'sales',
    code: '02',
    label: '门店交易',
    description: '门店收银、配镜交付、促销方案与业绩目标协同。',
    icon: 'ShoppingBag',
    permission: 'sales.read',
    nodeType: 'module',
    children: [
      {
        id: 'sales.pos',
        label: '收银工作台',
        description: '选择顾客与配镜商品，核验折扣权限并生成销售草稿单（原型阶段不执行真实扣款与库存扣减）。',
        permission: 'sales.pos.create',
        nodeType: 'page',
        favoritable: true,
        pageKind: 'sales_pos',
      },
      {
        id: 'sales.orders',
        label: '交易单据',
        description: '查询门店历史销售单据、客单构成及取镜状态。',
        permission: 'sales.order.read',
        nodeType: 'page',
        favoritable: true,
        pageKind: 'document_list',
      },
      {
        id: 'sales.processing_list',
        label: '配镜交付',
        description: '查看销售单关联的配镜加工进度与来片状态。',
        permission: 'sales.order.read',
        nodeType: 'page',
        pageKind: 'processing_order',
      },
      {
        id: 'sales.pre_orders',
        label: '顾客预订',
        description: '客户预订未现货交付的镜架、特殊定制片订货单管理。',
        permission: 'sales.order.read',
        nodeType: 'page',
        pageKind: 'document_list',
      },
      {
        id: 'sales.custom_lens_followup',
        label: '定制片进度',
        description: '追踪车房定制片、渐进多焦点镜片的工厂生产与物流节点。',
        permission: 'sales.order.read',
        nodeType: 'page',
        pageKind: 'processing_order',
      },
      {
        id: 'sales.followup',
        label: '成交线索',
        description: '潜在成交顾客与未完成配镜意向的跟进记录表。',
        permission: 'sales.order.read',
        nodeType: 'page',
        pageKind: 'document_list',
      },
      {
        id: 'sales.approvals',
        label: '特批记录',
        description: '超权折扣、特殊退单审批演示流水（最终审批流规则待确认）。',
        permission: 'sales.order.read',
        nodeType: 'page',
        pageKind: 'document_list',
        unconfirmedNote: '跨店特批折扣及退单终审流转节点待总部业务规则确认。',
      },
      {
        id: 'sales.settings',
        label: '交易规则',
        permission: 'sales.settings.manage',
        nodeType: 'group',
        children: [
          { id: 'sales.settings.platform_verify', label: '平台券核验', description: '团购及第三方平台核销映射配置。', permission: 'sales.settings.manage', nodeType: 'page', pageKind: 'master_data' },
          { id: 'sales.settings.customer_source', label: '获客渠道', description: '自然进店、老客转介、学校筛查、线上引流渠道字典。', permission: 'sales.settings.manage', nodeType: 'page', pageKind: 'master_data' },
          { id: 'sales.settings.discount_rules', label: '优惠授权', description: '按岗位配置最低授权折扣下限。', permission: 'sales.settings.manage', nodeType: 'page', pageKind: 'master_data' },
          { id: 'sales.settings.commission', label: '绩效提成', description: '导购员与验光师提成规则草案（待财务口径最终确认）。', permission: 'sales.settings.manage', nodeType: 'page', pageKind: 'master_data', unconfirmedNote: '阶梯提成及退货扣减口径待财务制度确认。' },
        ],
      },
      {
        id: 'sales.campaigns',
        label: '促销方案',
        permission: 'sales.settings.manage',
        nodeType: 'group',
        children: [
          { id: 'sales.campaigns.bundles', label: '组合商品', description: '镜架+镜片组合套餐定价与有效期管理。', permission: 'sales.settings.manage', nodeType: 'page', pageKind: 'master_data' },
          { id: 'sales.campaigns.times_cards', label: '服务权益卡', description: '视功能训练次卡、护理次卡权益配置。', permission: 'sales.settings.manage', nodeType: 'page', pageKind: 'master_data' },
          { id: 'sales.campaigns.events', label: '营销日历', description: '门店档期满减、开学季及会员日促销方案。', permission: 'sales.settings.manage', nodeType: 'page', pageKind: 'document_list' },
          { id: 'sales.campaigns.coupons', label: '券规则', description: '配镜代金券、复查抵扣券发放规则。', permission: 'sales.settings.manage', nodeType: 'page', pageKind: 'master_data' },
        ],
      },
      {
        id: 'sales.targets',
        label: '业绩目标',
        permission: 'sales.read',
        nodeType: 'group',
        children: [
          { id: 'sales.targets.setup', label: '目标计划', description: '设定月度/季度区域及门店总销售目标。', permission: 'sales.settings.manage', nodeType: 'page', pageKind: 'analytics' },
          { id: 'sales.targets.breakdown', label: '目标分配', description: '将门店任务按品类与店员拆分。', permission: 'sales.read', nodeType: 'page', pageKind: 'analytics' },
          { id: 'sales.targets.achievement', label: '目标进度', description: '按日对比实际营收、阶段目标完成率与偏差预警。', permission: 'sales.read', nodeType: 'page', pageKind: 'analytics' },
        ],
      },
    ],
  },
  {
    id: 'purchase',
    code: '03',
    label: '采购',
    description: '供应商订货、入库验收、退货登记及补货计划管理。',
    icon: 'Truck',
    permission: 'purchase.read',
    nodeType: 'module',
    children: [
      { id: 'purchase.orders', label: '采购订货单', description: '向合作光学厂商发起采购订货并跟踪交期。', permission: 'purchase.read', nodeType: 'page', favoritable: true, pageKind: 'purchase_orders', implemented: true },
      { id: 'purchase.manual_inbound', label: '手工入库', description: '供应商、商品、价格与数量的手工入库草稿。', permission: 'purchase.create', nodeType: 'page', pageKind: 'purchase_manual_inbound', implemented: true },
      { id: 'purchase.scan_inbound', label: '条码验收', description: '支持条码/UDI枪连续扫描核验入库（模拟录入）。', permission: 'purchase.create', nodeType: 'page', pageKind: 'document_list' },
      { id: 'purchase.returns', label: '退供处理', description: '统一管理待供应商确认的退供草稿及正式退货出库。', permission: 'purchase.create', nodeType: 'page', pageKind: 'document_list' },
      { id: 'purchase.bills', label: '入库凭证', description: '已入库并关联应付对账的正式采购单汇总。', permission: 'purchase.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'purchase.in_transit', label: '到货跟踪', description: '供应商已发货但尚未签收入库的在途批次明细。', permission: 'purchase.read', nodeType: 'page', pageKind: 'inventory_query' },
      { id: 'purchase.approvals', label: '订货审核', description: '采购预算及超额订货审批队列（演示审批流，规则待确认）。', permission: 'purchase.approve', nodeType: 'page', pageKind: 'document_list', unconfirmedNote: '大额采购多级审批阈值待总部供应链规则确认。' },
      { id: 'purchase.replenishment', label: '智能补货', description: '基于安全库存阈值生成的待采购建议清单。', permission: 'purchase.read', nodeType: 'page', pageKind: 'inventory_query' },
    ],
  },
  {
    id: 'transfer',
    code: '04',
    label: '店间协同',
    description: '总仓与各连锁门店间的商品调拨、补货与换货协同。',
    icon: 'ArrowLeftRight',
    permission: 'transfer.read',
    nodeType: 'module',
    children: [
      { id: 'transfer.outbound', label: '发货任务', description: '门店或中心仓发出调拨商品的出库明细与在途追踪。', permission: 'transfer.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'transfer.inbound', label: '收货确认', description: '调入方核对数量、光度及包装后确认调拨签收。', permission: 'transfer.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'transfer.requests', label: '调货需求', description: '统一发起跨店急件调货与常规补货需求，并按类型跟踪。', permission: 'transfer.create', nodeType: 'page', pageKind: 'document_list' },
      { id: 'transfer.pricing_policy', label: '内部结算规则', description: '跨店调拨内部结算价规则配置（待财务最终确认）。', permission: 'transfer.read', nodeType: 'page', pageKind: 'master_data', unconfirmedNote: '跨组织调拨加价率与内部往来结算规则待确认。' },
      { id: 'transfer.store_orders', label: '总部订货', description: '加盟或直营门店向总部提交的标准订货单。', permission: 'transfer.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'transfer.processing_exchange', label: '加工件换仓', description: '因加工损耗或光度偏差产生的跨仓换片调拨单。', permission: 'transfer.read', nodeType: 'page', pageKind: 'processing_order' },
    ],
  },
  {
    id: 'inventory',
    code: '05',
    label: '库存运营',
    description: '实时库存总览、盘点任务、库存调整与镜片规格分析。',
    icon: 'Package',
    permission: 'inventory.read',
    nodeType: 'module',
    children: [
      { id: 'inventory.query', label: '库存总览', description: '按门店、仓库、品牌与球柱镜规格查询账面及可用库存（禁止直接修改数字，须经单据调整）。', permission: 'inventory.read', nodeType: 'page', favoritable: true, pageKind: 'inventory_query', unconfirmedNote: '预占库存释放时长与安全库存计算口径待业务确认。' },
      { id: 'inventory.reports', label: '库存健康度', description: '按品类、库龄及周转天数统计门店库存健康度。', permission: 'inventory.read', nodeType: 'page', pageKind: 'analytics' },
      { id: 'inventory.loss_overflow', label: '库存调整', description: '登记加工碎片、陈列损耗或盘盈调整单据。', permission: 'inventory.adjust.doc', nodeType: 'page', pageKind: 'document_list' },
      { id: 'inventory.stocktake', label: '盘点任务', description: '全盘及动态抽盘任务与账实差异汇总。', permission: 'inventory.adjust.doc', nodeType: 'page', pageKind: 'document_list' },
      { id: 'inventory.reprint_labels', label: '标签补打', description: '商品条码吊牌损坏或换贴门店价格标签的补打记录。', permission: 'inventory.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'inventory.crosstab', label: '镜片规格矩阵', description: '按球镜(SPH)×柱镜(CYL)二维矩阵查看库存镜片分布。', permission: 'inventory.read', nodeType: 'page', pageKind: 'inventory_query' },
    ],
  },
  {
    id: 'after_sales',
    code: '06',
    label: '服务保障',
    description: '顾客退换货、镜架焊接/换鼻托维修及售后周转库存管理。',
    icon: 'Wrench',
    permission: 'after_sales.read',
    nodeType: 'module',
    children: [
      { id: 'after_sales.tickets', label: '售后工单', description: '登记配镜不适复检、鼻托镜腿维修及质保返厂单据。', permission: 'after_sales.read', nodeType: 'page', favoritable: true, pageKind: 'document_list' },
      { id: 'after_sales.repair_stock', label: '返修件台账', description: '查询待返厂修件、周转备件及报废待处理实物库存。', permission: 'after_sales.read', nodeType: 'page', pageKind: 'inventory_query' },
    ],
  },
  {
    id: 'reports',
    code: '07',
    label: '经营分析',
    description: '连锁门店业绩、坪效和经营指标的统一分析入口。',
    icon: 'BarChart3',
    permission: 'reports.read',
    nodeType: 'module',
    children: [
      { id: 'reports.performance', label: '门店业绩', description: '聚合各门店营收走势、品类贡献与验光转化率指标（含口径说明）。', permission: 'reports.read', nodeType: 'page', favoritable: true, pageKind: 'analytics' },
      { id: 'reports.summary', label: '经营报表', description: '月度经营对比、客单构成及导购/验光师绩效汇总表。', permission: 'reports.read', nodeType: 'page', pageKind: 'analytics' },
    ],
  },
  {
    id: 'finance',
    code: '08',
    label: '资金往来',
    description: '供应链对账、应收应付明细、门店支出及财务复核（原型不模拟真实结算）。',
    icon: 'Receipt',
    permission: 'finance.read',
    nodeType: 'module',
    children: [
      { id: 'finance.reconciliation', label: '供应链对账', description: '核对入库、退货与应付差异，并生成期间对账确认单。', permission: 'finance.read', nodeType: 'page', pageKind: 'finance_ledger' },
      { id: 'finance.payment_requests', label: '付款申请', description: '向供应商申请货款支付的业务审批单据。', permission: 'finance.read', nodeType: 'page', pageKind: 'finance_ledger' },
      { id: 'finance.payment_writeoffs', label: '付款核销', description: '将已付银行流水核销至对应采购应付单据。', permission: 'finance.audit', nodeType: 'page', pageKind: 'finance_ledger' },
      { id: 'finance.ap_ledger', label: '应付明细', description: '按供应商及账期统计未结应付余额与到期预警。', permission: 'finance.read', nodeType: 'page', pageKind: 'finance_ledger' },
      { id: 'finance.receipt_writeoffs', label: '收款核销', description: '核销团购平台、企业大客户及挂账收款单。', permission: 'finance.audit', nodeType: 'page', pageKind: 'finance_ledger' },
      { id: 'finance.ar_ledger', label: '应收明细', description: '企业团体配镜及学校筛查项目的应收账款台账。', permission: 'finance.read', nodeType: 'page', pageKind: 'finance_ledger' },
      { id: 'finance.expense_categories', label: '费用科目', description: '门店房租、水电、耗材与营销费用科目维护。', permission: 'finance.read', nodeType: 'page', pageKind: 'master_data' },
      { id: 'finance.expense_records', label: '门店支出', description: '登记门店日常零星支出与发票凭据编号。', permission: 'finance.read', nodeType: 'page', pageKind: 'finance_ledger' },
      { id: 'finance.expense_applications', label: '支出审批', description: '门店大额维修或活动费用报销申请流水。', permission: 'finance.read', nodeType: 'page', pageKind: 'finance_ledger' },
      { id: 'finance.purchase_audit', label: '采购财务复核', description: '财务复核采购入库单价、税率与发票一致性（审核规则待确认）。', permission: 'finance.audit', nodeType: 'page', pageKind: 'finance_ledger', unconfirmedNote: '三单匹配容差比例及自动记账凭证规则待财务部确认。' },
    ],
  },
  {
    id: 'contact_lenses',
    code: '09',
    label: '接触镜运营',
    description: '医疗器械三类合规管理：温湿度监测、首营资质、近效期与UDI上报。',
    icon: 'Eye',
    permission: 'contact_lenses.read',
    nodeType: 'module',
    children: [
      { id: 'contact_lenses.orders', label: '接触镜采购', description: '按批号与注册证号向合法资质供货商订购隐形眼镜。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.receipts', label: '到货登记', description: '核验随货同行单、生产批号与外包装完好度。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.inspection_inbound', label: '质量验收入库', description: '逐批验收后入库，保留 GSP 验收台账与质检签核记录。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.purchase_returns', label: '供应商退货', description: '近效期或不合格隐形眼镜批次退回记录。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.stocktake', label: '批次盘点', description: '按生产批号与效期维度开展在库隐形眼镜盘点。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.loss_overflow', label: '不合格品处置', description: '过期销毁或破损隐形眼镜合规报损单据。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.presales', label: '接触镜预订', description: '散光定制片或特殊基弧隐形眼镜预售订单。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.temp_humidity', label: '储存环境监测', description: '每日早晚监测隐形眼镜阴凉库温度(°C)与相对湿度(%RH)。', permission: 'contact_lenses.read', nodeType: 'page', favoritable: true, pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.equipment_maintenance', label: '设备校验', description: '温湿度计、裂隙灯及校准仪器的周期检定养护档案。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.product_maintenance', label: '在库养护', description: '在库隐形眼镜及护理液重点养护检查日志。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.first_enterprise', label: '供方资质', description: '供货企业营业执照、医疗器械经营许可证资质审查。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.first_product', label: '品种准入', description: '医疗器械注册证及说明书首营品种准入审核。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.near_expiry', label: '效期预警', description: '距失效期不足90天/180天的隐形眼镜批次预警处理。', permission: 'contact_lenses.read', nodeType: 'page', favoritable: true, pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.training_logs', label: '合规培训', description: '门店人员医疗器械法规与验配安全培训考核登记。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.complaint_logs', label: '质量投诉', description: '佩戴不良反应及医疗器械质量投诉追溯登记（规则待确认）。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance', unconfirmedNote: '不良事件药监上报接口及临床处置时限待质管部确认。' },
      { id: 'contact_lenses.udi_logs', label: '器械追溯', description: '医疗器械唯一标识(UDI)扫码追溯与上报状态日志。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
    ],
  },
  {
    id: 'members',
    code: '10',
    label: '客户经营',
    description: '客户档案、关怀触达、储值权益及客群价值分析。',
    icon: 'Users',
    permission: 'members.read',
    nodeType: 'module',
    children: [
      {
        id: 'members.profile',
        label: '客户中心',
        permission: 'members.profile.read',
        nodeType: 'group',
        children: [
          { id: 'members.profile.basic', label: '客户总览', description: '客户档案、验配历史及批量导入；导入储值余额需复核。', permission: 'members.profile.read', nodeType: 'page', favoritable: true, pageKind: 'member_profile' },
          { id: 'members.profile.create', label: '新建客户档案', description: '快速新建门店会员并绑定专属导购员与初始等级。', permission: 'members.profile.create', nodeType: 'page', pageKind: 'member_profile' },
        ],
      },
      {
        id: 'members.followup',
        label: '客户关怀',
        permission: 'members.followup.notification.read',
        nodeType: 'group',
        children: [
          {
            id: 'members.followup.notifications',
            label: '触达提醒',
            description: '按门店和复查计划筛选顾客，安排通知并查看处理进度。',
            permission: 'members.followup.notification.read',
            nodeType: 'page',
            favoritable: true,
            pageKind: 'followup_notification',
            children: [
              { id: 'members.followup.notifications.review_reminder', label: '复查邀约', description: '按门店和复查计划筛选顾客，安排通知并查看处理进度。', permission: 'members.followup.notification.read', nodeType: 'tab', pageKind: 'followup_notification' },
              { id: 'members.followup.notifications.pickup_reminder', label: '取镜提醒', description: '加工检验合格待取镜订单提醒顾客到店试戴取镜。', permission: 'members.followup.notification.read', nodeType: 'tab', pageKind: 'followup_notification' },
              { id: 'members.followup.notifications.contact_lens_expiry', label: '接触镜效期提醒', description: '抛弃型隐形眼镜周期临近更换前发送复购与复查提示。', permission: 'members.followup.notification.read', nodeType: 'tab', pageKind: 'followup_notification' },
            ],
          },
          { id: 'members.followup.plans', label: '关怀计划', description: '配置回访周期，在同页创建任务并查看待办提醒。', permission: 'members.followup.notification.read', nodeType: 'page', pageKind: 'master_data' },
          { id: 'members.followup.execution_records', label: '服务记录', description: '记录顾客佩戴舒适度反馈与预约到店意向。', permission: 'members.followup.notification.read', nodeType: 'page', pageKind: 'document_list' },
          { id: 'members.followup.completion_analysis', label: '关怀成效', description: '统计各门店与导购回访及时率及二次复购转化率。', permission: 'members.analytics.read', nodeType: 'page', pageKind: 'analytics' },
        ],
      },
      {
        id: 'members.points',
        label: '权益积分',
        permission: 'members.points.read',
        nodeType: 'group',
        children: [
          { id: 'members.points.adjust', label: '积分变更', description: '按授权原因进行会员积分人工调增或扣减并留痕。', permission: 'members.points.read', nodeType: 'page', pageKind: 'finance_ledger' },
          { id: 'members.points.stats', label: '积分流水', description: '统计各门店积分抵现与礼券消耗汇总。', permission: 'members.points.read', nodeType: 'page', pageKind: 'analytics' },
          { id: 'members.points.redemption', label: '权益兑换', description: '护理液、镜布及抵扣券等积分兑换流水记录。', permission: 'members.points.read', nodeType: 'page', pageKind: 'document_list' },
        ],
      },
      {
        id: 'members.recharge',
        label: '储值账户',
        permission: 'members.recharge.read',
        nodeType: 'group',
        children: [
          { id: 'members.recharge.operate', label: '储值操作', description: '会员储值开卡与退款申请（演示模式不真实划扣资金）。', permission: 'members.recharge.read', nodeType: 'page', pageKind: 'finance_ledger', unconfirmedNote: '储值退款原路退回与赠金回收规则待财务确认。' },
          { id: 'members.recharge.query', label: '储值记录', description: '查询账户余额与每笔充值、赠送及退款明细。', permission: 'members.recharge.read', nodeType: 'page', pageKind: 'finance_ledger' },
          { id: 'members.recharge.ledger', label: '账户流水', description: '会员余额消费、充值、退款完整变动台账。', permission: 'members.recharge.read', nodeType: 'page', pageKind: 'finance_ledger' },
          { id: 'members.recharge.report', label: '储值分析', description: '统计储值沉淀余额与月度消课/消费占比。', permission: 'members.analytics.read', nodeType: 'page', pageKind: 'analytics' },
        ],
      },
      {
        id: 'members.appointments',
        label: '到店预约',
        permission: 'members.appointments.read',
        nodeType: 'group',
        children: [
          { id: 'members.appointments.register', label: '预约日历', description: '登记顾客到店医学验光、塑形镜复查及取镜时段预约。', permission: 'members.appointments.read', nodeType: 'page', pageKind: 'document_list' },
          { id: 'members.appointments.completion', label: '履约记录', description: '追踪预约履约率、爽约改期与接待验光师匹配情况。', permission: 'members.appointments.read', nodeType: 'page', pageKind: 'document_list' },
        ],
      },
      {
        id: 'members.marketing',
        label: '客户增长',
        permission: 'members.marketing.read',
        nodeType: 'group',
        children: [
          {
            id: 'members.marketing.push',
            label: '消息触达',
            description: '营销推送基础通道、模板库、手动群发与历史记录（组织方式保留调整能力）。',
            permission: 'members.marketing.read',
            nodeType: 'page',
            pageKind: 'followup_notification',
            children: [
              { id: 'members.marketing.push.config', label: '触达规则', description: '企业微信/公众号/短信渠道网关配置占位。', permission: 'members.marketing.read', nodeType: 'tab', pageKind: 'master_data' },
              { id: 'members.marketing.push.templates', label: '消息模板', description: '维护复查、取镜与活动模板文案及变量占位符。', permission: 'members.marketing.read', nodeType: 'tab', pageKind: 'master_data' },
              { id: 'members.marketing.push.manual', label: '定向发送', description: '按标签圈选会员执行测试或定时模拟推送。', permission: 'members.marketing.read', nodeType: 'tab', pageKind: 'followup_notification' },
              { id: 'members.marketing.push.history', label: '发送记录', description: '查询历史触达批次与送达率统计。', permission: 'members.marketing.read', nodeType: 'tab', pageKind: 'document_list' },
            ],
          },
          {
            id: 'members.marketing.sms',
            label: '短信账户',
            description: '管理短信余额充值与发送扣费流水。',
            permission: 'members.marketing.read',
            nodeType: 'page',
            pageKind: 'finance_ledger',
            children: [
              { id: 'members.marketing.sms.recharge', label: '额度充值', description: '门店短信条数包购买与分配记录。', permission: 'members.marketing.read', nodeType: 'tab', pageKind: 'finance_ledger' },
              { id: 'members.marketing.sms.logs', label: '短信记录', description: '每条模拟短信触发渠道、模板编号与回执状态。', permission: 'members.marketing.read', nodeType: 'tab', pageKind: 'document_list' },
            ],
          },
          { id: 'members.marketing.roi', label: '活动复盘', description: '评估会员触达后到店转化、核销券数与连带销售额。', permission: 'members.analytics.read', nodeType: 'page', pageKind: 'analytics' },
          {
            id: 'members.marketing.coupons',
            label: '券活动',
            description: '优惠券裂变活动与用券明细统计。',
            permission: 'members.marketing.read',
            nodeType: 'page',
            pageKind: 'analytics',
            children: [
              { id: 'members.marketing.coupons.stats', label: '用券效果', description: '各批次优惠券领取、核销与过期率对比。', permission: 'members.analytics.read', nodeType: 'tab', pageKind: 'analytics' },
            ],
          },
          {
            id: 'members.marketing.referral',
            label: '老客推荐',
            description: '老带新转介奖励设置与推荐统计。',
            permission: 'members.marketing.read',
            nodeType: 'page',
            pageKind: 'analytics',
            children: [
              { id: 'members.marketing.referral.settings', label: '推荐奖励', description: '设置推荐人积分/赠券奖励与被推荐人首单礼。', permission: 'members.marketing.read', nodeType: 'tab', pageKind: 'master_data' },
              { id: 'members.marketing.referral.stats', label: '裂变表现', description: '统计各门店老客转介人数与贡献销售额。', permission: 'members.analytics.read', nodeType: 'tab', pageKind: 'analytics' },
            ],
          },
        ],
      },
      {
        id: 'members.settings',
        label: '客户规则',
        permission: 'members.settings.manage',
        nodeType: 'group',
        children: [
          { id: 'members.settings.tiers', label: '成长等级', description: '配置银卡、金卡、黑卡会员门槛与配镜折扣权益。', permission: 'members.settings.manage', nodeType: 'page', pageKind: 'master_data' },
          { id: 'members.settings.points', label: '积分规则', description: '配置消费积分获取比例、抵扣上限与有效期。', permission: 'members.settings.manage', nodeType: 'page', pageKind: 'master_data' },
          { id: 'members.settings.recharge', label: '储值规则', description: '配置储值阶梯赠金方案与适用门店范围。', permission: 'members.settings.manage', nodeType: 'page', pageKind: 'master_data' },
          { id: 'members.settings.appointments', label: '预约规则', description: '设置验光室排班时段及单时段最大预约承载量。', permission: 'members.settings.manage', nodeType: 'page', pageKind: 'master_data' },
        ],
      },
      { id: 'members.bind_guide', label: '专属顾问', description: '维护高价值会员专属服务导购归属及离职交接分配。', permission: 'members.profile.read', nodeType: 'page', pageKind: 'master_data' },
      { id: 'members.reception_logs', label: '到店接待', description: '记录顾客进店试戴偏好、未成交原因与跟进计划。', permission: 'members.profile.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'members.persona', label: '客群画像', description: '聚合年龄段、度数区间、镜框材质偏好与消费周期标签。', permission: 'members.analytics.read', nodeType: 'page', pageKind: 'analytics' },
      {
        id: 'members.analytics',
        label: '客户洞察',
        permission: 'members.analytics.read',
        nodeType: 'group',
        children: [
          { id: 'members.analytics.basic', label: '增长概览', description: '新增会员数、活跃率与门店会员渗透率趋势。', permission: 'members.analytics.read', nodeType: 'page', pageKind: 'analytics' },
          { id: 'members.analytics.consumption', label: '消费结构', description: '不同等级会员的客单价、连带率与换镜周期分析。', permission: 'members.analytics.read', nodeType: 'page', pageKind: 'analytics' },
          { id: 'members.analytics.rfm', label: '客户分层', description: '基于最近消费(R)、消费频次(F)、消费金额(M)分层运营。', permission: 'members.analytics.read', nodeType: 'page', pageKind: 'analytics' },
          { id: 'members.analytics.category', label: '偏好品类', description: '分析框架眼镜、功能性离焦镜、隐形眼镜复购构成。', permission: 'members.analytics.read', nodeType: 'page', pageKind: 'analytics' },
          { id: 'members.analytics.repurchase', label: '复购趋势', description: '追踪6/12/24个月复购曲线与流失预警客群。', permission: 'members.analytics.read', nodeType: 'page', pageKind: 'analytics' },
        ],
      },
      {
        id: 'members.optometry',
        label: '验配服务',
        permission: 'members.optometry.read',
        nodeType: 'group',
        children: [
          { id: 'members.optometry.pediatric', label: '青少年视力档案', description: '青少年近视防控专项视力变化曲线与眼轴追踪档案。', permission: 'members.optometry.read', nodeType: 'page', pageKind: 'vision_record' },
          { id: 'members.optometry.report', label: '验配记录分析', description: '统计门店验光量、试戴转化率与验光师工作量。', permission: 'members.optometry.read', nodeType: 'page', pageKind: 'analytics' },
        ],
      },
    ],
  },
  {
    id: 'processing',
    code: '11',
    label: '交付加工',
    description: '中央加工厂与门店加工工单、光学参数校验及运单配送管理。',
    icon: 'Sliders',
    permission: 'processing.read',
    nodeType: 'module',
    children: [
      { id: 'processing.orders', label: '配镜生产单', description: '查看加工工单、单片工艺明细、OD/OS 光度与质检状态。', permission: 'processing.read', nodeType: 'page', favoritable: true, pageKind: 'processing_order' },
      { id: 'processing.waybills', label: '物流交接', description: '记录加工成品寄往各门店或直邮顾客的快递运单号。', permission: 'processing.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'processing.clients', label: '委托方档案', description: '对外承接来料加工的合作眼镜店客户档案。', permission: 'processing.read', nodeType: 'page', pageKind: 'master_data' },
      { id: 'processing.sales_pos', label: '加工收费', description: '加工中心对外代加工及配片批发的开单入口。', permission: 'processing.read', nodeType: 'page', pageKind: 'sales_pos' },
      { id: 'processing.sales_orders', label: '加工结算单', description: '加工服务及片框成镜对外结算销售单汇总。', permission: 'processing.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'processing.client_notices', label: '完工通知', description: '加工异常缺片、超范围定制通知协作门店确认单。', permission: 'processing.read', nodeType: 'page', pageKind: 'processing_order' },
      { id: 'processing.client_returns', label: '委托退件', description: '加工中心质量返工及客退单处理台账。', permission: 'processing.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'processing.warehouse_picking', label: '物料领用', description: '加工单自动关联仓库毛坯片与镜架拣货波次单。', permission: 'processing.read', nodeType: 'page', pageKind: 'processing_order' },
    ],
  },
  {
    id: 'vision_records',
    code: '12',
    label: '视力健康档案',
    description: '顾客专业医学验光档案、左右眼屈光参数、复查随访与训练记录。',
    icon: 'ClipboardList',
    permission: 'vision_records.read',
    nodeType: 'module',
    children: [
      { id: 'vision_records.customer_files', label: '受检者档案', description: '视光业务维度顾客主索引及既往戴镜史汇总。', permission: 'vision_records.read', nodeType: 'page', pageKind: 'vision_record' },
      { id: 'vision_records.optometry_files', label: '屈光检查记录', description: '分组录入与查看右眼(OD)/左眼(OS)球镜、柱镜、轴位、下加光、瞳距及矫正视力。', permission: 'vision_records.read', nodeType: 'page', favoritable: true, pageKind: 'vision_record' },
      { id: 'vision_records.reviews', label: '复诊随访', description: '对比历次验光屈光度变化与眼轴增长速率。', permission: 'vision_records.read', nodeType: 'page', pageKind: 'vision_record' },
      { id: 'vision_records.training', label: '视功能训练', description: '调节灵敏度、聚散球等双眼视功能训练疗程记录。', permission: 'vision_records.read', nodeType: 'page', pageKind: 'vision_record' },
      { id: 'vision_records.registration', label: '预约登记', description: '视光门诊与专科检查挂号队列（字段与叫号规则待确认，未宣称完整还原）。', permission: 'vision_records.read', nodeType: 'page', pageKind: 'unconfirmed_shell', unconfirmedNote: '挂号分诊号源、医保/自费结算及HIS对接字段待业务确认。' },
    ],
  },
  {
    id: 'vision_screening',
    code: '13',
    label: '校园视力项目',
    description: '校园与社区视力项目的学校档案、筛查结果及异常判定规则。',
    icon: 'School',
    permission: 'vision_screening.read',
    nodeType: 'module',
    children: [
      { id: 'vision_screening.schools', label: '学校档案', description: '合作中小学、幼儿园学校及年级班级建档管理。', permission: 'vision_screening.read', nodeType: 'page', pageKind: 'screening' },
      { id: 'vision_screening.summary', label: '筛查概览', description: '按学校与年级汇总异常率、复查人数及趋势图表。', permission: 'vision_screening.read', nodeType: 'page', pageKind: 'screening' },
      { id: 'vision_screening.details', label: '筛查明细', description: '按学生姓名/学号查询裸眼视力及电脑验光筛查结果。', permission: 'vision_screening.read', nodeType: 'page', pageKind: 'screening' },
      { id: 'vision_screening.thresholds', label: '异常判定规则', description: '配置不同学段视力预警与建议进一步医学验光阈值。', permission: 'vision_screening.read', nodeType: 'page', pageKind: 'master_data', unconfirmedNote: '地方卫健委筛查判定标准差异需按区域配置确认。' },
    ],
  },
  {
    id: 'orthokeratology',
    code: '14',
    label: '塑形镜随访',
    description: '塑形镜配戴评估、眼轴跟踪、摘戴训练及临床随访记录。',
    icon: 'Activity',
    permission: 'orthokeratology.read',
    nodeType: 'module',
    children: [
      { id: 'orthokeratology.full_exam', label: '配戴评估', description: '记录角膜曲率(K1/K2)、眼轴长度、角膜内皮及试戴荧光染色评估。', permission: 'orthokeratology.read', nodeType: 'page', favoritable: true, pageKind: 'orthokeratology', unconfirmedNote: '临床禁忌症拦截与医师双签规则待医疗质控确认。' },
      { id: 'orthokeratology.training', label: '摘戴训练', description: '记录顾客及家长镜片摘戴、清洗消毒考核通过情况。', permission: 'orthokeratology.read', nodeType: 'page', pageKind: 'orthokeratology' },
      { id: 'orthokeratology.extended_info', label: '配戴者信息', description: '既往眼病史、过敏史、睡眠习惯及复查依从性档案。', permission: 'orthokeratology.read', nodeType: 'page', pageKind: 'orthokeratology' },
      { id: 'orthokeratology.case_files', label: '临床随访记录', description: '按时间轴归档角膜塑形镜验配全周期随访病例。', permission: 'orthokeratology.read', nodeType: 'page', pageKind: 'orthokeratology' },
    ],
  },
  {
    id: 'brands',
    code: '15',
    label: '品牌采购门户',
    description: '品牌商协同订货门户、新品目录浏览及CCS供应链对账。',
    icon: 'Award',
    permission: 'brands.read',
    nodeType: 'module',
    children: [
      { id: 'brands.showcase', label: '品牌展厅', description: '浏览合作品牌官方系列、季度主推镜架与镜片矩阵。', permission: 'brands.read', nodeType: 'page', favoritable: true, pageKind: 'brand_portal' },
      { id: 'brands.favorites', label: '我的选品', description: '门店已收藏的常备补货款式与重点样品清单。', permission: 'brands.read', nodeType: 'page', pageKind: 'brand_portal' },
      { id: 'brands.cart', label: '采购篮', description: '汇总待提交给品牌供应商的采购订货明细。', permission: 'brands.order.create', nodeType: 'page', pageKind: 'brand_portal' },
      { id: 'brands.new_arrivals', label: '上新速览', description: '2026秋季光学新品与限量系列首发订货窗口。', permission: 'brands.read', nodeType: 'page', pageKind: 'brand_portal' },
      { id: 'brands.order_place', label: '提交订货', description: '确认交期、整箱包装与收货门店后提交品牌订货单。', permission: 'brands.order.create', nodeType: 'page', pageKind: 'brand_portal' },
      { id: 'brands.order_list', label: '订货进度', description: '品牌采购门户已提交订单的履约状态追踪。', permission: 'brands.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'brands.sales_orders', label: '销售回传', description: '品牌供货方视角下的门店采购履约销售订单。', permission: 'brands.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'brands.ccs_returns', label: '渠道退货', description: '品牌协同平台(CCS)标准退换货申请单。', permission: 'brands.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'brands.ccs_stocktake', label: '渠道盘点', description: '寄售/代销品牌专柜商品协同盘点差异单。', permission: 'brands.read', nodeType: 'page', pageKind: 'inventory_query' },
      { id: 'brands.ccs_statements', label: '渠道结算', description: '品牌协同供应链月度对账与返利确认单。', permission: 'brands.read', nodeType: 'page', pageKind: 'finance_ledger' },
      { id: 'brands.online_order_apply', label: '线上采购申请', description: '大额或定制款品牌线上授信下单审批申请。', permission: 'brands.order.create', nodeType: 'page', pageKind: 'document_list' },
    ],
  },
  {
    id: 'marketing',
    code: '16',
    label: '品牌传播',
    description: '连锁品牌视觉海报、门店陈列物料及宣发素材库管理。',
    icon: 'Megaphone',
    permission: 'marketing.read',
    nodeType: 'module',
    children: [
      { id: 'marketing.assets', label: '创意素材库', description: '下载或预览总部统一下发的护眼科普、新品海报与物料规范。', permission: 'marketing.read', nodeType: 'page', pageKind: 'brand_portal' },
    ],
  },
  {
    id: 'system',
    code: '17',
    label: '系统管理',
    description: 'RBAC角色权限、用户数据范围分配、门店仓库设置与审计日志。',
    icon: 'Settings',
    permission: 'system.read',
    nodeType: 'module',
    children: [
      { id: 'system.roles', label: '角色权限管理', description: '按菜单与操作矩阵配置角色授权，管理自定义角色、敏感字段及变更留痕。', permission: 'system.role.manage', nodeType: 'page', favoritable: true, pageKind: 'role_permissions', implemented: true },
      { id: 'system.user_assignments', label: '用户权限分配', description: '按员工与菜单操作矩阵核对实际权限，绑定角色、授权门店并设置个人减权。', permission: 'system.user.manage', nodeType: 'page', pageKind: 'user_assignments', implemented: true },
      { id: 'system.parameters', label: '参数设置', description: '配置销售收银、充值验光、加工中心、采购调拨、小程序、工作提醒、近效期预警及管理员授权等全局与门店参数。', permission: 'system.read', nodeType: 'page', favoritable: true, pageKind: 'system_parameters', implemented: true },
      { id: 'system.notices_send', label: '内部公告', description: '管理员发布公告并查看每位接收人的阅读状态；用户可在消息中心查阅历史。', permission: 'system.notice.publish', nodeType: 'page', pageKind: 'internal_notices', implemented: true },
      { id: 'system.product_maintenance', label: '商品数据治理', description: '跨门店价格同步、商品合并、效期批量修改及监管数据导出。', permission: 'basic.product.update', nodeType: 'page', pageKind: 'product_list' },
      { id: 'system.stores', label: '门店资料', description: '维护直营/加盟门店编码、营业地址、医疗器械资质、小程序显示与跨店查看权限。', permission: 'system.store.manage', nodeType: 'page', favoritable: true, pageKind: 'store_profiles', implemented: true },
      { id: 'system.processing_warehouses', label: '加工仓库设置', description: '配置门店对应的中央加工仓与毛坯片默认调出仓。', permission: 'system.store.manage', nodeType: 'page', pageKind: 'catalog_warehouse', implemented: true },
      { id: 'system.banks', label: '结算账户档案', description: '公司收付款对公账户与POS结算账户档案。', permission: 'system.read', nodeType: 'page', pageKind: 'master_data' },
        { id: 'system.audit_logs', label: '操作日志', description: '按月份查询登录与权限变更审计记录。', permission: 'system.read', nodeType: 'page', pageKind: 'operation_logs', implemented: true },
      { id: 'system.onboarding', label: '岗位上手指南', description: '新上线门店初始化操作清单与岗位培训指引。', permission: 'system.read', nodeType: 'page', pageKind: 'help_docs' },
      { id: 'system.init_setup', label: '开店初始化', description: '新租户或新门店开账期初库存、应收应付导入入口。', permission: 'system.read', nodeType: 'page', pageKind: 'unconfirmed_shell', unconfirmedNote: '期初建账锁定条件与跨系统迁移校验规则待确认。' },
      { id: 'system.period_close', label: '账期结转', description: '月结/年结库存成本核算与账期锁定（规则待确认，未宣称完整还原）。', permission: 'system.period_close.execute', nodeType: 'page', pageKind: 'unconfirmed_shell', unconfirmedNote: '移动加权平均成本结转口径及反结账审批条件待财务确认。' },
    ],
  },
  {
    id: 'help',
    code: '18',
    label: '使用支持',
    description: '系统操作指引、原型演示边界说明与待确认业务规则清单。',
    icon: 'HelpCircle',
    permission: 'help.read',
    nodeType: 'module',
    children: [
      { id: 'help.docs', label: '操作指引', description: '查看18模块导航说明、角色权限验证指南及待确认业务规则列表。', permission: 'help.read', nodeType: 'page', pageKind: 'help_docs' },
    ],
  },
];

export const WORKBENCH_NODE: NavNode = {
  id: 'workbench',
  label: '系统工作台',
  description: '按登录身份呈现今日门店经营概览、重点指标、待办与资质效期提醒。',
  parentId: null,
  moduleId: 'workbench',
  route: '/workbench',
  icon: 'LayoutDashboard',
  permission: 'workbench.read',
  order: 0,
  nodeType: 'page',
  favoritable: false,
  pageKind: 'workbench',
  implemented: false,
  hasDevelopedFeature: false,
};

export const MENU_TREE: NavNode[] = buildTree(RAW_MODULES, null, '');

export const FLAT_MENU_NODES: NavNode[] = (() => {
  const result: NavNode[] = [WORKBENCH_NODE];
  const walk = (nodes: NavNode[]) => {
    for (const n of nodes) {
      result.push(n);
      if (n.children) walk(n.children);
    }
  };
  walk(MENU_TREE);
  return result;
})();

export const MENU_BY_ID: Record<string, NavNode> = Object.fromEntries(
  FLAT_MENU_NODES.map((n) => [n.id, n])
);

/** Keep old bookmarked routes working after duplicate menu entries are folded into a page. */
export const CONSOLIDATED_MENU_ROUTES: Record<string, string> = {
  'sales.targets.tracking': 'sales.targets.achievement',
  'purchase.temp_returns': 'purchase.returns',
  'transfer.replenishment_requests': 'transfer.requests',
  'finance.statements': 'finance.reconciliation',
  'contact_lenses.inspection_records': 'contact_lenses.inspection_inbound',
  'members.profile.import': 'members.profile.basic',
  'members.profile.import_confirm': 'members.profile.basic',
  'members.followup.tasks_add': 'members.followup.plans',
  'members.followup.task_reminders': 'members.followup.plans',
  'members.recharge.details': 'members.recharge.query',
  'members.marketing.coupons.game': 'members.marketing.coupons',
  'processing.order_details': 'processing.orders',
  'vision_screening.charts': 'vision_screening.summary',
  'system.notices_history': 'system.notices_send',
};

export const MENU_BY_ROUTE: Record<string, NavNode> = {
  ...Object.fromEntries(FLAT_MENU_NODES.map((n) => [n.route, n])),
  ...Object.fromEntries(Object.entries(CONSOLIDATED_MENU_ROUTES).map(([oldId, targetId]) =>
    [`/modules/${slugifyId(oldId)}`, MENU_BY_ID[targetId]])),
};

export function findFirstAccessibleLeaf(
  node: NavNode,
  hasPerm: (perm: string) => boolean
): NavNode | null {
  if (!node.children || node.children.length === 0) {
    return hasPerm(node.permission) ? node : null;
  }
  for (const child of node.children) {
    if (child.nodeType === 'tab') {
      if (hasPerm(node.permission) && hasPerm(child.permission)) return child;
      continue;
    }
    const found = findFirstAccessibleLeaf(child, hasPerm);
    if (found) return found;
  }
  return node.nodeType === 'page' && hasPerm(node.permission) ? node : null;
}

export function findFirstLeafRegardlessOfPerm(node: NavNode): NavNode {
  if (!node.children || node.children.length === 0) return node;
  if (node.children[0].nodeType === 'tab') return node.children[0];
  return findFirstLeafRegardlessOfPerm(node.children[0]);
}

export function getAncestorChain(nodeId: string): NavNode[] {
  const chain: NavNode[] = [];
  let current: NavNode | undefined = MENU_BY_ID[nodeId];
  while (current) {
    chain.unshift(current);
    current = current.parentId ? MENU_BY_ID[current.parentId] : undefined;
  }
  return chain;
}

export function isNodeDevelopedForUser(
  node: NavNode,
  hasPerm: (perm: string) => boolean
): boolean {
  if (!hasPerm(node.permission)) return false;
  if (node.implemented) return true;
  return Boolean(node.children?.some((child) => isNodeDevelopedForUser(child, hasPerm)));
}
