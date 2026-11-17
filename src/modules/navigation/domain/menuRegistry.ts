export type MenuNodeType = 'module' | 'group' | 'page' | 'tab';

export type PageKind =
  | 'workbench'
  | 'product_list'
  | 'sales_pos'
  | 'member_profile'
  | 'followup_notification'
  | 'role_permissions'
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
        label: '商品资料',
        permission: 'basic.product.read',
        nodeType: 'group',
        children: [
          {
            id: 'basic.product.list',
            label: '商品列表',
            description: '管理镜架、镜片、隐形眼镜及护理液主数据，支持品类树筛选与批量导入导出。',
            permission: 'basic.product.read',
            nodeType: 'page',
            favoritable: true,
            pageKind: 'product_list',
          },
          {
            id: 'basic.product.categories',
            label: '商品品类',
            description: '维护光学镜架、功能镜片、太阳镜及护理耗材的多级分类树。',
            permission: 'basic.product.read',
            nodeType: 'page',
            pageKind: 'master_data',
          },
          {
            id: 'basic.product.tags',
            label: '商品标签',
            description: '维护热销、控度、防蓝光、高折射率等商品营销与选品标签。',
            permission: 'basic.product.read',
            nodeType: 'page',
            pageKind: 'master_data',
          },
          {
            id: 'basic.product.lens_surcharge',
            label: '镜片附加费',
            description: '配置高散光定制、超薄加工、特殊镀膜与染色附加费标准。',
            permission: 'basic.product.read',
            nodeType: 'page',
            pageKind: 'master_data',
          },
        ],
      },
      {
        id: 'basic.customers',
        label: '顾客资料',
        description: '门店散客及建档顾客的基础联系与消费来源信息。',
        permission: 'basic.customer.read',
        nodeType: 'page',
        pageKind: 'master_data',
      },
      {
        id: 'basic.staff',
        label: '店员资料',
        description: '维护门店店长、导购员、验光师与加工技师岗位档案。',
        permission: 'basic.staff.read',
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
        label: '收费管理',
        permission: 'basic.fee.read',
        nodeType: 'group',
        children: [
          {
            id: 'basic.fees.categories',
            label: '收费类别',
            description: '定义验光服务、视功能训练、角膜塑形护理等收费大类。',
            permission: 'basic.fee.read',
            nodeType: 'page',
            pageKind: 'master_data',
          },
          {
            id: 'basic.fees.items',
            label: '收费项目',
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
    label: '销售管理',
    description: '门店销售开单、配镜加工追踪、活动促销与业绩目标管理。',
    icon: 'ShoppingBag',
    permission: 'sales.read',
    nodeType: 'module',
    children: [
      {
        id: 'sales.pos',
        label: '销售开单',
        description: '选择顾客与配镜商品，核验折扣权限并生成销售草稿单（原型阶段不执行真实扣款与库存扣减）。',
        permission: 'sales.pos.create',
        nodeType: 'page',
        favoritable: true,
        pageKind: 'sales_pos',
      },
      {
        id: 'sales.orders',
        label: '销售单',
        description: '查询门店历史销售单据、客单构成及取镜状态。',
        permission: 'sales.order.read',
        nodeType: 'page',
        favoritable: true,
        pageKind: 'document_list',
      },
      {
        id: 'sales.processing_list',
        label: '加工单列表',
        description: '查看销售单关联的配镜加工进度与来片状态。',
        permission: 'sales.order.read',
        nodeType: 'page',
        pageKind: 'processing_order',
      },
      {
        id: 'sales.pre_orders',
        label: '订货单',
        description: '客户预订未现货交付的镜架、特殊定制片订货单管理。',
        permission: 'sales.order.read',
        nodeType: 'page',
        pageKind: 'document_list',
      },
      {
        id: 'sales.custom_lens_followup',
        label: '定制镜片跟进表',
        description: '追踪车房定制片、渐进多焦点镜片的工厂生产与物流节点。',
        permission: 'sales.order.read',
        nodeType: 'page',
        pageKind: 'processing_order',
      },
      {
        id: 'sales.followup',
        label: '销售跟进表',
        description: '潜在成交顾客与未完成配镜意向的跟进记录表。',
        permission: 'sales.order.read',
        nodeType: 'page',
        pageKind: 'document_list',
      },
      {
        id: 'sales.approvals',
        label: '审批记录列表',
        description: '超权折扣、特殊退单审批演示流水（最终审批流规则待确认）。',
        permission: 'sales.order.read',
        nodeType: 'page',
        pageKind: 'document_list',
        unconfirmedNote: '跨店特批折扣及退单终审流转节点待总部业务规则确认。',
      },
      {
        id: 'sales.settings',
        label: '销售设置',
        permission: 'sales.settings.manage',
        nodeType: 'group',
        children: [
          { id: 'sales.settings.platform_verify', label: '平台核销', description: '团购及第三方平台核销映射配置。', permission: 'sales.settings.manage', nodeType: 'page', pageKind: 'master_data' },
          { id: 'sales.settings.customer_source', label: '顾客来源', description: '自然进店、老客转介、学校筛查、线上引流渠道字典。', permission: 'sales.settings.manage', nodeType: 'page', pageKind: 'master_data' },
          { id: 'sales.settings.discount_rules', label: '折扣权限设置', description: '按岗位配置最低授权折扣下限。', permission: 'sales.settings.manage', nodeType: 'page', pageKind: 'master_data' },
          { id: 'sales.settings.commission', label: '店员提成', description: '导购员与验光师提成规则草案（待财务口径最终确认）。', permission: 'sales.settings.manage', nodeType: 'page', pageKind: 'master_data', unconfirmedNote: '阶梯提成及退货扣减口径待财务制度确认。' },
        ],
      },
      {
        id: 'sales.campaigns',
        label: '活动设置',
        permission: 'sales.settings.manage',
        nodeType: 'group',
        children: [
          { id: 'sales.campaigns.bundles', label: '商品套餐', description: '镜架+镜片组合套餐定价与有效期管理。', permission: 'sales.settings.manage', nodeType: 'page', pageKind: 'master_data' },
          { id: 'sales.campaigns.times_cards', label: '次卡管理', description: '视功能训练次卡、护理次卡权益配置。', permission: 'sales.settings.manage', nodeType: 'page', pageKind: 'master_data' },
          { id: 'sales.campaigns.events', label: '活动管理', description: '门店档期满减、开学季及会员日促销方案。', permission: 'sales.settings.manage', nodeType: 'page', pageKind: 'document_list' },
          { id: 'sales.campaigns.coupons', label: '优惠券设置', description: '配镜代金券、复查抵扣券发放规则。', permission: 'sales.settings.manage', nodeType: 'page', pageKind: 'master_data' },
        ],
      },
      {
        id: 'sales.targets',
        label: '销售任务管理',
        permission: 'sales.read',
        nodeType: 'group',
        children: [
          { id: 'sales.targets.setup', label: '任务设定', description: '设定月度/季度区域及门店总销售目标。', permission: 'sales.settings.manage', nodeType: 'page', pageKind: 'analytics' },
          { id: 'sales.targets.breakdown', label: '任务分解', description: '将门店任务按品类与店员拆分。', permission: 'sales.read', nodeType: 'page', pageKind: 'analytics' },
          { id: 'sales.targets.achievement', label: '任务达成率', description: '实时对比实际营收与阶段目标完成率。', permission: 'sales.read', nodeType: 'page', pageKind: 'analytics' },
          { id: 'sales.targets.tracking', label: '任务追踪', description: '按日跟踪店员任务推进与偏差预警。', permission: 'sales.read', nodeType: 'page', pageKind: 'analytics' },
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
      { id: 'purchase.orders', label: '采购订货单', description: '向合作光学厂商发起采购订货并跟踪交期。', permission: 'purchase.read', nodeType: 'page', favoritable: true, pageKind: 'document_list' },
      { id: 'purchase.manual_inbound', label: '手工入库', description: '非扫码批次商品的手工入库制单与规格核对。', permission: 'purchase.create', nodeType: 'page', pageKind: 'document_list' },
      { id: 'purchase.scan_inbound', label: '扫码入库', description: '支持条码/UDI枪连续扫描核验入库（模拟录入）。', permission: 'purchase.create', nodeType: 'page', pageKind: 'document_list' },
      { id: 'purchase.returns', label: '采购退货', description: '瑕疵品及滞销协议退回供应商出库单据。', permission: 'purchase.create', nodeType: 'page', pageKind: 'document_list' },
      { id: 'purchase.temp_returns', label: '临时退货登记', description: '待供应商确认折让或换货的暂存退货记录。', permission: 'purchase.create', nodeType: 'page', pageKind: 'document_list' },
      { id: 'purchase.bills', label: '采购单', description: '已入库并关联应付对账的正式采购单汇总。', permission: 'purchase.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'purchase.in_transit', label: '在途商品', description: '供应商已发货但尚未签收入库的在途批次明细。', permission: 'purchase.read', nodeType: 'page', pageKind: 'inventory_query' },
      { id: 'purchase.approvals', label: '采购审批', description: '采购预算及超额订货审批队列（演示审批流，规则待确认）。', permission: 'purchase.approve', nodeType: 'page', pageKind: 'document_list', unconfirmedNote: '大额采购多级审批阈值待总部供应链规则确认。' },
      { id: 'purchase.replenishment', label: '补货清单', description: '基于安全库存阈值生成的待采购建议清单。', permission: 'purchase.read', nodeType: 'page', pageKind: 'inventory_query' },
    ],
  },
  {
    id: 'transfer',
    code: '04',
    label: '调拨',
    description: '总仓与各连锁门店间的商品调拨、补货与换货协同。',
    icon: 'ArrowLeftRight',
    permission: 'transfer.read',
    nodeType: 'module',
    children: [
      { id: 'transfer.outbound', label: '调拨出库', description: '门店或中心仓发出调拨商品的出库明细与在途追踪。', permission: 'transfer.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'transfer.inbound', label: '调拨入库', description: '调入方核对数量、光度及包装后确认调拨签收。', permission: 'transfer.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'transfer.requests', label: '调拨申请', description: '门店发起跨店急需镜架或片源调货申请。', permission: 'transfer.create', nodeType: 'page', pageKind: 'document_list' },
      { id: 'transfer.pricing_policy', label: '调货价格策略', description: '跨店调拨内部结算价规则配置（待财务最终确认）。', permission: 'transfer.read', nodeType: 'page', pageKind: 'master_data', unconfirmedNote: '跨组织调拨加价率与内部往来结算规则待确认。' },
      { id: 'transfer.replenishment_requests', label: '补货申请', description: '门店向区域总仓发起常规铺货补货申请。', permission: 'transfer.create', nodeType: 'page', pageKind: 'document_list' },
      { id: 'transfer.store_orders', label: '门店订货单', description: '加盟或直营门店向总部提交的标准订货单。', permission: 'transfer.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'transfer.processing_exchange', label: '加工调拨出库换货单', description: '因加工损耗或光度偏差产生的跨仓换片调拨单。', permission: 'transfer.read', nodeType: 'page', pageKind: 'processing_order' },
    ],
  },
  {
    id: 'inventory',
    code: '05',
    label: '库存管理',
    description: '实时账面/可用库存查询、盘点单、报损报溢与多维交叉分析。',
    icon: 'Package',
    permission: 'inventory.read',
    nodeType: 'module',
    children: [
      { id: 'inventory.query', label: '库存查询', description: '按门店、仓库、品牌与球柱镜规格查询账面及可用库存（禁止直接修改数字，须经单据调整）。', permission: 'inventory.read', nodeType: 'page', favoritable: true, pageKind: 'inventory_query', unconfirmedNote: '预占库存释放时长与安全库存计算口径待业务确认。' },
      { id: 'inventory.reports', label: '库存报表', description: '按品类、库龄及周转天数统计门店库存健康度。', permission: 'inventory.read', nodeType: 'page', pageKind: 'analytics' },
      { id: 'inventory.loss_overflow', label: '报损报溢单', description: '登记加工碎片、陈列损耗或盘盈调整单据。', permission: 'inventory.adjust.doc', nodeType: 'page', pageKind: 'document_list' },
      { id: 'inventory.stocktake', label: '盘点单', description: '全盘及动态抽盘任务与账实差异汇总。', permission: 'inventory.adjust.doc', nodeType: 'page', pageKind: 'document_list' },
      { id: 'inventory.reprint_labels', label: '补标记录', description: '商品条码吊牌损坏或换贴门店价格标签的补打记录。', permission: 'inventory.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'inventory.crosstab', label: '库存交叉表', description: '按球镜(SPH)×柱镜(CYL)二维矩阵查看库存镜片分布。', permission: 'inventory.read', nodeType: 'page', pageKind: 'inventory_query' },
    ],
  },
  {
    id: 'after_sales',
    code: '06',
    label: '售后维修',
    description: '顾客退换货、镜架焊接/换鼻托维修及售后周转库存管理。',
    icon: 'Wrench',
    permission: 'after_sales.read',
    nodeType: 'module',
    children: [
      { id: 'after_sales.tickets', label: '退货维修单', description: '登记配镜不适复检、鼻托镜腿维修及质保返厂单据。', permission: 'after_sales.read', nodeType: 'page', favoritable: true, pageKind: 'document_list' },
      { id: 'after_sales.repair_stock', label: '退货维修库存查询', description: '查询待返厂修件、周转备件及报废待处理实物库存。', permission: 'after_sales.read', nodeType: 'page', pageKind: 'inventory_query' },
    ],
  },
  {
    id: 'reports',
    code: '07',
    label: '统计报表',
    description: '连锁经营业绩看板、门店坪效及综合统计报表汇总。',
    icon: 'BarChart3',
    permission: 'reports.read',
    nodeType: 'module',
    children: [
      { id: 'reports.performance', label: '销售业绩看板', description: '聚合各门店营收走势、品类贡献与验光转化率指标（含口径说明）。', permission: 'reports.read', nodeType: 'page', favoritable: true, pageKind: 'analytics' },
      { id: 'reports.summary', label: '统计报表汇总', description: '月度经营对比、客单构成及导购/验光师绩效汇总表。', permission: 'reports.read', nodeType: 'page', pageKind: 'analytics' },
    ],
  },
  {
    id: 'finance',
    code: '08',
    label: '账款管理',
    description: '供应商往来对账、应收应付台账、费用报销及财务审核（原型不模拟真实结算）。',
    icon: 'Receipt',
    permission: 'finance.read',
    nodeType: 'module',
    children: [
      { id: 'finance.reconciliation', label: '往来对账', description: '核对供应商入库、退货与应付往来账目差异。', permission: 'finance.read', nodeType: 'page', pageKind: 'finance_ledger' },
      { id: 'finance.statements', label: '对账单', description: '生成并导出期间往来对账确认单。', permission: 'finance.read', nodeType: 'page', pageKind: 'finance_ledger' },
      { id: 'finance.payment_requests', label: '付款申请单', description: '向供应商申请货款支付的业务审批单据。', permission: 'finance.read', nodeType: 'page', pageKind: 'finance_ledger' },
      { id: 'finance.payment_writeoffs', label: '付款核销单', description: '将已付银行流水核销至对应采购应付单据。', permission: 'finance.audit', nodeType: 'page', pageKind: 'finance_ledger' },
      { id: 'finance.ap_ledger', label: '应付台账', description: '按供应商及账期统计未结应付余额与到期预警。', permission: 'finance.read', nodeType: 'page', pageKind: 'finance_ledger' },
      { id: 'finance.receipt_writeoffs', label: '收款核销单', description: '核销团购平台、企业大客户及挂账收款单。', permission: 'finance.audit', nodeType: 'page', pageKind: 'finance_ledger' },
      { id: 'finance.ar_ledger', label: '应收台账', description: '企业团体配镜及学校筛查项目的应收账款台账。', permission: 'finance.read', nodeType: 'page', pageKind: 'finance_ledger' },
      { id: 'finance.expense_categories', label: '费用分类', description: '门店房租、水电、耗材与营销费用科目维护。', permission: 'finance.read', nodeType: 'page', pageKind: 'master_data' },
      { id: 'finance.expense_records', label: '费用登记', description: '登记门店日常零星支出与发票凭据编号。', permission: 'finance.read', nodeType: 'page', pageKind: 'finance_ledger' },
      { id: 'finance.expense_applications', label: '费用登记申请', description: '门店大额维修或活动费用报销申请流水。', permission: 'finance.read', nodeType: 'page', pageKind: 'finance_ledger' },
      { id: 'finance.purchase_audit', label: '采购单财务审核', description: '财务复核采购入库单价、税率与发票一致性（审核规则待确认）。', permission: 'finance.audit', nodeType: 'page', pageKind: 'finance_ledger', unconfirmedNote: '三单匹配容差比例及自动记账凭证规则待财务部确认。' },
    ],
  },
  {
    id: 'contact_lenses',
    code: '09',
    label: '隐形眼镜管理',
    description: '医疗器械三类合规管理：温湿度监测、首营资质、近效期与UDI上报。',
    icon: 'Eye',
    permission: 'contact_lenses.read',
    nodeType: 'module',
    children: [
      { id: 'contact_lenses.orders', label: '隐形眼镜订货单', description: '按批号与注册证号向合法资质供货商订购隐形眼镜。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.receipts', label: '隐形眼镜收货单', description: '核验随货同行单、生产批号与外包装完好度。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.inspection_inbound', label: '隐形眼镜验收入库', description: '三类医疗器械逐批质量验收合格后正式入库。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.purchase_returns', label: '隐形眼镜采购退货', description: '近效期或不合格隐形眼镜批次退回记录。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.stocktake', label: '隐形眼镜盘点', description: '按生产批号与效期维度开展在库隐形眼镜盘点。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.loss_overflow', label: '隐形眼镜报损报溢单', description: '过期销毁或破损隐形眼镜合规报损单据。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.presales', label: '隐形眼镜预售单', description: '散光定制片或特殊基弧隐形眼镜预售订单。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.inspection_records', label: '隐形眼镜验收记录', description: '医疗器械GSP验收台账与质检员签核记录。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.temp_humidity', label: '仓库温湿度记录', description: '每日早晚监测隐形眼镜阴凉库温度(°C)与相对湿度(%RH)。', permission: 'contact_lenses.read', nodeType: 'page', favoritable: true, pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.equipment_maintenance', label: '设备养护记录', description: '温湿度计、裂隙灯及校准仪器的周期检定养护档案。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.product_maintenance', label: '商品养护记录', description: '在库隐形眼镜及护理液重点养护检查日志。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.first_enterprise', label: '首营企业', description: '供货企业营业执照、医疗器械经营许可证资质审查。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.first_product', label: '首营商品', description: '医疗器械注册证及说明书首营品种准入审核。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.near_expiry', label: '近效期产品', description: '距失效期不足90天/180天的隐形眼镜批次预警处理。', permission: 'contact_lenses.read', nodeType: 'page', favoritable: true, pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.training_logs', label: '医疗器械培训登记', description: '门店人员医疗器械法规与验配安全培训考核登记。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
      { id: 'contact_lenses.complaint_logs', label: '医疗器械治疗投诉登记', description: '佩戴不良反应及医疗器械质量投诉追溯登记（规则待确认）。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance', unconfirmedNote: '不良事件药监上报接口及临床处置时限待质管部确认。' },
      { id: 'contact_lenses.udi_logs', label: 'UDI上报记录', description: '医疗器械唯一标识(UDI)扫码追溯与上报状态日志。', permission: 'contact_lenses.read', nodeType: 'page', pageKind: 'contact_lens_compliance' },
    ],
  },
  {
    id: 'members',
    code: '10',
    label: '会员管理',
    description: '会员全生命周期管理、售后回访推送、储值积分及RFM价值分析。',
    icon: 'Users',
    permission: 'members.read',
    nodeType: 'module',
    children: [
      {
        id: 'members.profile',
        label: '会员资料',
        permission: 'members.profile.read',
        nodeType: 'group',
        children: [
          { id: 'members.profile.basic', label: '基本资料', description: '查询门店会员档案、会员等级、积分储值余额及关联视光与消费记录。', permission: 'members.profile.read', nodeType: 'page', favoritable: true, pageKind: 'member_profile' },
          { id: 'members.profile.create', label: '会员新增', description: '快速新建门店会员并绑定专属导购员与初始等级。', permission: 'members.profile.create', nodeType: 'page', pageKind: 'member_profile' },
          { id: 'members.profile.import', label: '会员导入', description: '从旧系统批量导入历史会员档案与期初积分储值。', permission: 'members.profile.create', nodeType: 'page', pageKind: 'member_profile' },
          { id: 'members.profile.import_confirm', label: '会员导入金额确认', description: '复核历史会员导入后的储值本金与赠送余额核对。', permission: 'members.profile.create', nodeType: 'page', pageKind: 'finance_ledger', unconfirmedNote: '历史导入储值赠金拆分规则待财务确认。' },
        ],
      },
      {
        id: 'members.followup',
        label: '售后回访',
        permission: 'members.followup.notification.read',
        nodeType: 'group',
        children: [
          {
            id: 'members.followup.notifications',
            label: '推送通知',
            description: '按门店和复查计划筛选顾客，安排通知并查看处理进度。',
            permission: 'members.followup.notification.read',
            nodeType: 'page',
            favoritable: true,
            pageKind: 'followup_notification',
            children: [
              { id: 'members.followup.notifications.review_reminder', label: '视力复查通知', description: '按门店和复查计划筛选顾客，安排通知并查看处理进度。', permission: 'members.followup.notification.read', nodeType: 'tab', pageKind: 'followup_notification' },
              { id: 'members.followup.notifications.pickup_reminder', label: '取镜通知', description: '加工检验合格待取镜订单提醒顾客到店试戴取镜。', permission: 'members.followup.notification.read', nodeType: 'tab', pageKind: 'followup_notification' },
              { id: 'members.followup.notifications.contact_lens_expiry', label: '隐形眼镜过期提醒', description: '抛弃型隐形眼镜周期临近更换前发送复购与复查提示。', permission: 'members.followup.notification.read', nodeType: 'tab', pageKind: 'followup_notification' },
            ],
          },
          { id: 'members.followup.plans', label: '设置回访方案', description: '配置配镜7天适应期回访、3个月/6个月复查周期方案。', permission: 'members.followup.notification.read', nodeType: 'page', pageKind: 'master_data' },
          { id: 'members.followup.tasks_add', label: '添加回访任务', description: '针对重点客群手动创建导购电话或微信回访任务。', permission: 'members.followup.notification.read', nodeType: 'page', pageKind: 'document_list' },
          { id: 'members.followup.task_reminders', label: '回访任务提醒', description: '展示当日待办及逾期未联系的售后回访任务列表。', permission: 'members.followup.notification.read', nodeType: 'page', pageKind: 'document_list' },
          { id: 'members.followup.execution_records', label: '回访执行记录', description: '记录顾客佩戴舒适度反馈与预约到店意向。', permission: 'members.followup.notification.read', nodeType: 'page', pageKind: 'document_list' },
          { id: 'members.followup.completion_analysis', label: '回访完成分析', description: '统计各门店与导购回访及时率及二次复购转化率。', permission: 'members.analytics.read', nodeType: 'page', pageKind: 'analytics' },
        ],
      },
      {
        id: 'members.points',
        label: '积分管理',
        permission: 'members.points.read',
        nodeType: 'group',
        children: [
          { id: 'members.points.adjust', label: '积分调整', description: '按授权原因进行会员积分人工调增或扣减并留痕。', permission: 'members.points.read', nodeType: 'page', pageKind: 'finance_ledger' },
          { id: 'members.points.stats', label: '积分消费查询/统计', description: '统计各门店积分抵现与礼券消耗汇总。', permission: 'members.points.read', nodeType: 'page', pageKind: 'analytics' },
          { id: 'members.points.redemption', label: '积分兑换明细', description: '护理液、镜布及抵扣券等积分兑换流水记录。', permission: 'members.points.read', nodeType: 'page', pageKind: 'document_list' },
        ],
      },
      {
        id: 'members.recharge',
        label: '充值管理',
        permission: 'members.recharge.read',
        nodeType: 'group',
        children: [
          { id: 'members.recharge.operate', label: '充值/退款', description: '会员储值开卡与退款申请（演示模式不真实划扣资金）。', permission: 'members.recharge.read', nodeType: 'page', pageKind: 'finance_ledger', unconfirmedNote: '储值退款原路退回与赠金回收规则待财务确认。' },
          { id: 'members.recharge.query', label: '充值查询', description: '查询会员账户当前本金余额、赠送余额与累计充值额。', permission: 'members.recharge.read', nodeType: 'page', pageKind: 'finance_ledger' },
          { id: 'members.recharge.details', label: '会员充值明细', description: '按门店与收款方式统计每笔储值充值记录。', permission: 'members.recharge.read', nodeType: 'page', pageKind: 'finance_ledger' },
          { id: 'members.recharge.ledger', label: '会员流水', description: '会员余额消费、充值、退款完整变动台账。', permission: 'members.recharge.read', nodeType: 'page', pageKind: 'finance_ledger' },
          { id: 'members.recharge.report', label: '充值消费报表', description: '统计储值沉淀余额与月度消课/消费占比。', permission: 'members.analytics.read', nodeType: 'page', pageKind: 'analytics' },
        ],
      },
      {
        id: 'members.appointments',
        label: '会员预约',
        permission: 'members.appointments.read',
        nodeType: 'group',
        children: [
          { id: 'members.appointments.register', label: '预约登记', description: '登记顾客到店医学验光、塑形镜复查及取镜时段预约。', permission: 'members.appointments.read', nodeType: 'page', pageKind: 'document_list' },
          { id: 'members.appointments.completion', label: '预约完成查询', description: '追踪预约履约率、爽约改期与接待验光师匹配情况。', permission: 'members.appointments.read', nodeType: 'page', pageKind: 'document_list' },
        ],
      },
      {
        id: 'members.marketing',
        label: '会员营销',
        permission: 'members.marketing.read',
        nodeType: 'group',
        children: [
          {
            id: 'members.marketing.push',
            label: '消息推送',
            description: '营销推送基础通道、模板库、手动群发与历史记录（组织方式保留调整能力）。',
            permission: 'members.marketing.read',
            nodeType: 'page',
            pageKind: 'followup_notification',
            children: [
              { id: 'members.marketing.push.config', label: '推送基础配置', description: '企业微信/公众号/短信渠道网关配置占位。', permission: 'members.marketing.read', nodeType: 'tab', pageKind: 'master_data' },
              { id: 'members.marketing.push.templates', label: '模板管理', description: '维护复查、取镜与活动模板文案及变量占位符。', permission: 'members.marketing.read', nodeType: 'tab', pageKind: 'master_data' },
              { id: 'members.marketing.push.manual', label: '手动推送', description: '按标签圈选会员执行测试或定时模拟推送。', permission: 'members.marketing.read', nodeType: 'tab', pageKind: 'followup_notification' },
              { id: 'members.marketing.push.history', label: '历史推送列表', description: '查询历史触达批次与送达率统计。', permission: 'members.marketing.read', nodeType: 'tab', pageKind: 'document_list' },
            ],
          },
          {
            id: 'members.marketing.sms',
            label: '短信业务',
            description: '管理短信余额充值与发送扣费流水。',
            permission: 'members.marketing.read',
            nodeType: 'page',
            pageKind: 'finance_ledger',
            children: [
              { id: 'members.marketing.sms.recharge', label: '充值流水', description: '门店短信条数包购买与分配记录。', permission: 'members.marketing.read', nodeType: 'tab', pageKind: 'finance_ledger' },
              { id: 'members.marketing.sms.logs', label: '短信流水管理列表', description: '每条模拟短信触发渠道、模板编号与回执状态。', permission: 'members.marketing.read', nodeType: 'tab', pageKind: 'document_list' },
            ],
          },
          { id: 'members.marketing.roi', label: '活动效果评估', description: '评估会员触达后到店转化、核销券数与连带销售额。', permission: 'members.analytics.read', nodeType: 'page', pageKind: 'analytics' },
          {
            id: 'members.marketing.coupons',
            label: '优惠券营销',
            description: '优惠券裂变活动与用券明细统计。',
            permission: 'members.marketing.read',
            nodeType: 'page',
            pageKind: 'analytics',
            children: [
              { id: 'members.marketing.coupons.game', label: '优惠券放大游戏', description: '裂变膨胀券营销活动配置演示。', permission: 'members.marketing.read', nodeType: 'tab', pageKind: 'master_data' },
              { id: 'members.marketing.coupons.stats', label: '优惠券使用统计', description: '各批次优惠券领取、核销与过期率对比。', permission: 'members.analytics.read', nodeType: 'tab', pageKind: 'analytics' },
            ],
          },
          {
            id: 'members.marketing.referral',
            label: '会员推荐',
            description: '老带新转介奖励设置与推荐统计。',
            permission: 'members.marketing.read',
            nodeType: 'page',
            pageKind: 'analytics',
            children: [
              { id: 'members.marketing.referral.settings', label: '推荐设置', description: '设置推荐人积分/赠券奖励与被推荐人首单礼。', permission: 'members.marketing.read', nodeType: 'tab', pageKind: 'master_data' },
              { id: 'members.marketing.referral.stats', label: '会员推荐统计', description: '统计各门店老客转介人数与贡献销售额。', permission: 'members.analytics.read', nodeType: 'tab', pageKind: 'analytics' },
            ],
          },
        ],
      },
      {
        id: 'members.settings',
        label: '会员设置',
        permission: 'members.settings.manage',
        nodeType: 'group',
        children: [
          { id: 'members.settings.tiers', label: '会员等级设置', description: '配置银卡、金卡、黑卡会员门槛与配镜折扣权益。', permission: 'members.settings.manage', nodeType: 'page', pageKind: 'master_data' },
          { id: 'members.settings.points', label: '积分设置', description: '配置消费积分获取比例、抵扣上限与有效期。', permission: 'members.settings.manage', nodeType: 'page', pageKind: 'master_data' },
          { id: 'members.settings.recharge', label: '充值设置', description: '配置储值阶梯赠金方案与适用门店范围。', permission: 'members.settings.manage', nodeType: 'page', pageKind: 'master_data' },
          { id: 'members.settings.appointments', label: '预约设置', description: '设置验光室排班时段及单时段最大预约承载量。', permission: 'members.settings.manage', nodeType: 'page', pageKind: 'master_data' },
        ],
      },
      { id: 'members.bind_guide', label: '顾客绑定导购员', description: '维护高价值会员专属服务导购归属及离职交接分配。', permission: 'members.profile.read', nodeType: 'page', pageKind: 'master_data' },
      { id: 'members.reception_logs', label: '顾客接待记录', description: '记录顾客进店试戴偏好、未成交原因与跟进计划。', permission: 'members.profile.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'members.persona', label: '顾客用户画像', description: '聚合年龄段、度数区间、镜框材质偏好与消费周期标签。', permission: 'members.analytics.read', nodeType: 'page', pageKind: 'analytics' },
      {
        id: 'members.analytics',
        label: '数据分析',
        permission: 'members.analytics.read',
        nodeType: 'group',
        children: [
          { id: 'members.analytics.basic', label: '基础数据分析', description: '新增会员数、活跃率与门店会员渗透率趋势。', permission: 'members.analytics.read', nodeType: 'page', pageKind: 'analytics' },
          { id: 'members.analytics.consumption', label: '会员消费分析', description: '不同等级会员的客单价、连带率与换镜周期分析。', permission: 'members.analytics.read', nodeType: 'page', pageKind: 'analytics' },
          { id: 'members.analytics.rfm', label: '价值分析（RFM）', description: '基于最近消费(R)、消费频次(F)、消费金额(M)分层运营。', permission: 'members.analytics.read', nodeType: 'page', pageKind: 'analytics' },
          { id: 'members.analytics.category', label: '品类分析', description: '分析框架眼镜、功能性离焦镜、隐形眼镜复购构成。', permission: 'members.analytics.read', nodeType: 'page', pageKind: 'analytics' },
          { id: 'members.analytics.repurchase', label: '复购分析', description: '追踪6/12/24个月复购曲线与流失预警客群。', permission: 'members.analytics.read', nodeType: 'page', pageKind: 'analytics' },
        ],
      },
      {
        id: 'members.optometry',
        label: '验光管理',
        permission: 'members.optometry.read',
        nodeType: 'group',
        children: [
          { id: 'members.optometry.pediatric', label: '儿童验光档案', description: '青少年近视防控专项视力变化曲线与眼轴追踪档案。', permission: 'members.optometry.read', nodeType: 'page', pageKind: 'vision_record' },
          { id: 'members.optometry.report', label: '验光单报表', description: '统计门店验光量、试戴转化率与验光师工作量。', permission: 'members.optometry.read', nodeType: 'page', pageKind: 'analytics' },
        ],
      },
    ],
  },
  {
    id: 'processing',
    code: '11',
    label: '加工中心',
    description: '中央加工厂与门店加工工单、光学参数校验及运单配送管理。',
    icon: 'Sliders',
    permission: 'processing.read',
    nodeType: 'module',
    children: [
      { id: 'processing.orders', label: '加工单', description: '查看配镜加工工单、OD/OS光度、瞳距(PD)与质检状态。', permission: 'processing.read', nodeType: 'page', favoritable: true, pageKind: 'processing_order' },
      { id: 'processing.waybills', label: '运单登记', description: '记录加工成品寄往各门店或直邮顾客的快递运单号。', permission: 'processing.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'processing.clients', label: '客户资料', description: '对外承接来料加工的合作眼镜店客户档案。', permission: 'processing.read', nodeType: 'page', pageKind: 'master_data' },
      { id: 'processing.sales_pos', label: '加工销售开单', description: '加工中心对外代加工及配片批发的开单入口。', permission: 'processing.read', nodeType: 'page', pageKind: 'sales_pos' },
      { id: 'processing.sales_orders', label: '加工销售单', description: '加工服务及片框成镜对外结算销售单汇总。', permission: 'processing.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'processing.client_notices', label: '客户加工通知单', description: '加工异常缺片、超范围定制通知协作门店确认单。', permission: 'processing.read', nodeType: 'page', pageKind: 'processing_order' },
      { id: 'processing.order_details', label: '加工单明细', description: '按镜片折射率、镀膜与车房工艺查询单片加工明细。', permission: 'processing.read', nodeType: 'page', pageKind: 'processing_order' },
      { id: 'processing.client_returns', label: '客户退货单', description: '加工中心质量返工及客退单处理台账。', permission: 'processing.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'processing.warehouse_picking', label: '仓库配货加工单', description: '加工单自动关联仓库毛坯片与镜架拣货波次单。', permission: 'processing.read', nodeType: 'page', pageKind: 'processing_order' },
    ],
  },
  {
    id: 'vision_records',
    code: '12',
    label: '视光档案管理',
    description: '顾客专业医学验光档案、左右眼屈光参数、复查随访与训练记录。',
    icon: 'ClipboardList',
    permission: 'vision_records.read',
    nodeType: 'module',
    children: [
      { id: 'vision_records.customer_files', label: '顾客档案', description: '视光业务维度顾客主索引及既往戴镜史汇总。', permission: 'vision_records.read', nodeType: 'page', pageKind: 'vision_record' },
      { id: 'vision_records.optometry_files', label: '视光档案', description: '分组录入与查看右眼(OD)/左眼(OS)球镜、柱镜、轴位、下加光、瞳距及矫正视力。', permission: 'vision_records.read', nodeType: 'page', favoritable: true, pageKind: 'vision_record' },
      { id: 'vision_records.reviews', label: '视力复查', description: '对比历次验光屈光度变化与眼轴增长速率。', permission: 'vision_records.read', nodeType: 'page', pageKind: 'vision_record' },
      { id: 'vision_records.training', label: '视力训练', description: '调节灵敏度、聚散球等双眼视功能训练疗程记录。', permission: 'vision_records.read', nodeType: 'page', pageKind: 'vision_record' },
      { id: 'vision_records.registration', label: '挂号管理', description: '视光门诊与专科检查挂号队列（字段与叫号规则待确认，未宣称完整还原）。', permission: 'vision_records.read', nodeType: 'page', pageKind: 'unconfirmed_shell', unconfirmedNote: '挂号分诊号源、医保/自费结算及HIS对接字段待业务确认。' },
    ],
  },
  {
    id: 'vision_screening',
    code: '13',
    label: '视力筛查',
    description: '校园及社区公益视力筛查学校建档、屈光异常汇总与阈值配置。',
    icon: 'School',
    permission: 'vision_screening.read',
    nodeType: 'module',
    children: [
      { id: 'vision_screening.schools', label: '学校管理', description: '合作中小学、幼儿园学校及年级班级建档管理。', permission: 'vision_screening.read', nodeType: 'page', pageKind: 'screening' },
      { id: 'vision_screening.summary', label: '统计汇总', description: '按学校、年级汇总视力不良率与转诊复查人数。', permission: 'vision_screening.read', nodeType: 'page', pageKind: 'screening' },
      { id: 'vision_screening.details', label: '明细查询', description: '按学生姓名/学号查询裸眼视力及电脑验光筛查结果。', permission: 'vision_screening.read', nodeType: 'page', pageKind: 'screening' },
      { id: 'vision_screening.charts', label: '分析图表', description: '各年级近视率分布及同比变化可视化分析。', permission: 'vision_screening.read', nodeType: 'page', pageKind: 'analytics' },
      { id: 'vision_screening.thresholds', label: '筛查度数设置', description: '配置不同学段视力预警与建议进一步医学验光阈值。', permission: 'vision_screening.read', nodeType: 'page', pageKind: 'master_data', unconfirmedNote: '地方卫健委筛查判定标准差异需按区域配置确认。' },
    ],
  },
  {
    id: 'orthokeratology',
    code: '14',
    label: '角膜塑形管理',
    description: 'OK镜全项角膜地形图与眼轴检查、摘戴训练及病例档案管理。',
    icon: 'Activity',
    permission: 'orthokeratology.read',
    nodeType: 'module',
    children: [
      { id: 'orthokeratology.full_exam', label: '塑形镜全项检查', description: '记录角膜曲率(K1/K2)、眼轴长度、角膜内皮及试戴荧光染色评估。', permission: 'orthokeratology.read', nodeType: 'page', favoritable: true, pageKind: 'orthokeratology', unconfirmedNote: '临床禁忌症拦截与医师双签规则待医疗质控确认。' },
      { id: 'orthokeratology.training', label: '客户训练档案', description: '记录顾客及家长镜片摘戴、清洗消毒考核通过情况。', permission: 'orthokeratology.read', nodeType: 'page', pageKind: 'orthokeratology' },
      { id: 'orthokeratology.extended_info', label: '顾客拓展信息', description: '既往眼病史、过敏史、睡眠习惯及复查依从性档案。', permission: 'orthokeratology.read', nodeType: 'page', pageKind: 'orthokeratology' },
      { id: 'orthokeratology.case_files', label: '病例档案', description: '按时间轴归档角膜塑形镜验配全周期随访病例。', permission: 'orthokeratology.read', nodeType: 'page', pageKind: 'orthokeratology' },
    ],
  },
  {
    id: 'brands',
    code: '15',
    label: '品牌专区',
    description: '品牌商协同订货门户、新品目录浏览及CCS供应链对账。',
    icon: 'Award',
    permission: 'brands.read',
    nodeType: 'module',
    children: [
      { id: 'brands.showcase', label: '品牌之窗', description: '浏览合作品牌官方系列、季度主推镜架与镜片矩阵。', permission: 'brands.read', nodeType: 'page', favoritable: true, pageKind: 'brand_portal' },
      { id: 'brands.favorites', label: '查看收藏', description: '门店已收藏的常备补货款式与重点样品清单。', permission: 'brands.read', nodeType: 'page', pageKind: 'brand_portal' },
      { id: 'brands.cart', label: '购物车', description: '汇总待提交给品牌供应商的采购订货明细。', permission: 'brands.order.create', nodeType: 'page', pageKind: 'brand_portal' },
      { id: 'brands.new_arrivals', label: '新品浏览', description: '2026秋季光学新品与限量系列首发订货窗口。', permission: 'brands.read', nodeType: 'page', pageKind: 'brand_portal' },
      { id: 'brands.order_place', label: '订货下单', description: '确认交期、整箱包装与收货门店后提交品牌订货单。', permission: 'brands.order.create', nodeType: 'page', pageKind: 'brand_portal' },
      { id: 'brands.order_list', label: '订单列表', description: '品牌专区已下单采购订单状态追踪。', permission: 'brands.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'brands.sales_orders', label: '销售订单', description: '品牌供货方视角下的门店采购履约销售订单。', permission: 'brands.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'brands.ccs_returns', label: 'CCS退货', description: '品牌协同平台(CCS)标准退换货申请单。', permission: 'brands.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'brands.ccs_stocktake', label: 'CCS盘点', description: '寄售/代销品牌专柜商品协同盘点差异单。', permission: 'brands.read', nodeType: 'page', pageKind: 'inventory_query' },
      { id: 'brands.ccs_statements', label: 'CCS对账单', description: '品牌协同供应链月度对账与返利确认单。', permission: 'brands.read', nodeType: 'page', pageKind: 'finance_ledger' },
      { id: 'brands.online_order_apply', label: '线上下单申请', description: '大额或定制款品牌线上授信下单审批申请。', permission: 'brands.order.create', nodeType: 'page', pageKind: 'document_list' },
    ],
  },
  {
    id: 'marketing',
    code: '16',
    label: '营销推广',
    description: '连锁品牌视觉海报、门店陈列物料及宣发素材库管理。',
    icon: 'Megaphone',
    permission: 'marketing.read',
    nodeType: 'module',
    children: [
      { id: 'marketing.assets', label: '我的素材', description: '下载或预览总部统一下发的护眼科普、新品海报与物料规范。', permission: 'marketing.read', nodeType: 'page', pageKind: 'brand_portal' },
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
      { id: 'system.roles', label: '角色权限管理', description: '配置身份类型、18模块功能权限树、数据范围与敏感字段可见性及变更留痕。', permission: 'system.role.manage', nodeType: 'page', favoritable: true, pageKind: 'role_permissions' },
      { id: 'system.user_assignments', label: '用户权限分配', description: '为员工、店长及供应商账号绑定角色及授权门店范围。', permission: 'system.user.manage', nodeType: 'page', pageKind: 'master_data' },
      { id: 'system.parameters', label: '参数设置', description: '配置销售收银、充值验光、加工中心、采购调拨、小程序、工作提醒、近效期预警及管理员授权等全局与门店参数。', permission: 'system.read', nodeType: 'page', favoritable: true, pageKind: 'system_parameters', implemented: true },
      { id: 'system.notices_send', label: '发送站内信', description: '向指定门店或岗位发布总部运营通知与合规公告。', permission: 'system.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'system.notices_history', label: '站内信发布记录', description: '查看历史站内公告已读人数与下发范围。', permission: 'system.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'system.product_maintenance', label: '商品维护管理', description: '批量校准商品条码、默认归属门店及停用清洗规则。', permission: 'basic.product.update', nodeType: 'page', pageKind: 'product_list' },
      { id: 'system.stores', label: '门店资料', description: '维护直营/加盟门店编码、营业地址、医疗器械资质、小程序显示与跨店查看权限。', permission: 'system.store.manage', nodeType: 'page', favoritable: true, pageKind: 'store_profiles', implemented: true },
      { id: 'system.processing_warehouses', label: '加工仓库设置', description: '配置门店对应的中央加工仓与毛坯片默认调出仓。', permission: 'system.store.manage', nodeType: 'page', pageKind: 'catalog_warehouse', implemented: true },
      { id: 'system.banks', label: '银行资料', description: '公司收付款对公账户与POS结算账户档案。', permission: 'system.read', nodeType: 'page', pageKind: 'master_data' },
      { id: 'system.audit_logs', label: '操作日志', description: '记录关键数据导出、权限变更与敏感操作审计追踪。', permission: 'system.read', nodeType: 'page', pageKind: 'document_list' },
      { id: 'system.onboarding', label: '新手指引', description: '新上线门店初始化操作清单与岗位培训指引。', permission: 'system.read', nodeType: 'page', pageKind: 'help_docs' },
      { id: 'system.init_setup', label: '初始化设置', description: '新租户或新门店开账期初库存、应收应付导入入口。', permission: 'system.read', nodeType: 'page', pageKind: 'unconfirmed_shell', unconfirmedNote: '期初建账锁定条件与跨系统迁移校验规则待确认。' },
      { id: 'system.period_close', label: '期末处理', description: '月结/年结库存成本核算与账期锁定（规则待确认，未宣称完整还原）。', permission: 'system.period_close.execute', nodeType: 'page', pageKind: 'unconfirmed_shell', unconfirmedNote: '移动加权平均成本结转口径及反结账审批条件待财务确认。' },
    ],
  },
  {
    id: 'help',
    code: '18',
    label: '帮助中心',
    description: '系统操作指引、原型演示边界说明与待确认业务规则清单。',
    icon: 'HelpCircle',
    permission: 'help.read',
    nodeType: 'module',
    children: [
      { id: 'help.docs', label: '操作文档', description: '查看18模块导航说明、角色权限验证指南及待确认业务规则列表。', permission: 'help.read', nodeType: 'page', pageKind: 'help_docs' },
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

export const MENU_BY_ROUTE: Record<string, NavNode> = Object.fromEntries(
  FLAT_MENU_NODES.map((n) => [n.route, n])
);

export function findFirstAccessibleLeaf(
  node: NavNode,
  hasPerm: (perm: string) => boolean
): NavNode | null {
  if (!node.children || node.children.length === 0) {
    return hasPerm(node.permission) ? node : null;
  }
  for (const child of node.children) {
    if (child.nodeType === 'tab') {
      return hasPerm(node.permission) ? child : null;
    }
    const found = findFirstAccessibleLeaf(child, hasPerm);
    if (found) return found;
  }
  return null;
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
