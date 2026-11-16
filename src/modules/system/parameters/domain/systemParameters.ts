export interface SystemParametersConfig {
  // 01. 销售与收银规则 (14项)
  requirePickupCodeForPickup: 'enable' | 'disable';
  allowPointsEarnAfterPointsDeduct: 'enable' | 'disable';
  allowMemberPhonePayOnSales: 'enable' | 'disable';
  lockSalesOrderAccounting: 'enable' | 'disable';
  salesOrderQuantityAlert: 'remind' | 'no_remind';
  directStoreShareRetailPrice: 'share' | 'no_share';
  defaultUsePointsDeductOnPay: 'enable' | 'disable';
  hideCustomerPhoneOnSalesPrint: 'show' | 'hide';
  salesRefundSubmitMode: 'unlimited' | 'auth_code' | 'approval';
  normalProductNeedPreOrderOnSales: 'not_needed' | 'needed';
  showStoreStockOnSales: 'hide' | 'show';
  showProcessingStockOnSales: 'hide' | 'show';
  allowZeroYuanPayOnSales: 'allow' | 'disallow_unless_override';
  skipAuthCodeOnPartialSalesEdit: 'skip' | 'require';

  // 02. 充值、顾客与验光 (5项)
  allowCashOnMemberRecharge: 'enable' | 'disable';
  allowWriteoffOnMemberRecharge: 'enable' | 'disable';
  optometryOrderType: 'normal' | 'dedicated';
  hideCustomerContactPhone: 'hide' | 'show';
  lensCatalogPermission: 'enable' | 'disable';

  // 03. 加工中心与加工单 (6项)
  autoAcceptProcessingOrder: 'enable' | 'disable';
  processingNoticePushScope: 'all' | 'custom';
  requireProcessingCompleteBeforeReceive: 'unlimited' | 'restricted';
  hideCustomerPhoneOnProcessingPrint: 'show' | 'hide';
  enableProcessingCenterQc: 'qc' | 'no_qc';
  customLensOnlyCustomOrderFromProcessingList: 'not_needed' | 'custom_only';

  // 04. 采购与验收 (5项)
  defaultPurchaseSettlementMode: 'none' | 'store' | 'hq';
  allowModifyPurchaseDate: 'enable' | 'disable';
  allowNegativeStockOnPurchaseReturn: 'disallow' | 'allow';
  allowBranchPurchase: 'allow' | 'disallow';
  enableStoreReceivingInspection: 'inspect' | 'no_inspect';

  // 05. 调拨与调货 (4项)
  transferOrderType: 'branch_direct' | 'hq_audit';
  hqAutoApproveTransfer: 'manual' | 'auto';
  allowNegativeStockNonLensTransfer: 'disallow' | 'allow';
  allowNegativeStockLensTransfer: 'disallow' | 'allow';

  // 06. 供应商与员工 (2项)
  supplierSensitiveInfo: 'enable' | 'disable';
  hqUnifiedManageFranchiseStaff: 'franchise_self' | 'hq_unified';

  // 07. 小程序顾客端设置 (7项)
  miniProgramVisionScreeningQuery: 'enable' | 'disable';
  miniProgramCustomerOptometryAccess: 'enable' | 'disable' | 'after_pickup';
  miniProgramOptometryDisplayScope: 'full' | 'partial';
  miniProgramAllowViewOtherStores: 'enable' | 'disable';
  miniProgramShowSalesUnitPriceAndDiscount: 'show' | 'hide';
  miniProgramAllowViewSalesOrderDetail: 'allow' | 'disallow';
  memberPaymentCodeExpireSeconds: number;

  // 08. 工作提醒设置 (3项)
  homeContactLensExpiryReminder: 'enable' | 'disable';
  homeBirthdayReminder: 'enable' | 'disable';
  recentVisionReviewReminderDays: number;

  // 09. 隐形眼镜与证照预警设置 (12项)
  dailySolutionEmptyNoticeDays: number;
  monthlyLensNoticeDays: number;
  quarterlyLensNoticeDays: number;
  halfYearLensNoticeDays: number;
  yearlyLensNoticeDays: number;
  eighteenMonthLensNoticeDays: number;
  productExpiryWarningDays: number;
  productionLicenseWarningDays: number;
  businessLicenseWarningDays: number;
  medicalDevicePermitWarningDays: number;
  salesRepAuthWarningDays: number;
  medicalDeviceRegCertWarningDays: number;

  // 10. 管理员设置 (3项)
  adminAuthCode: string;
  adminAuthCodeExpiry: string;
  salesRefundAdminPhone: string;
}

export type SystemParameterKey = keyof SystemParametersConfig;

export interface ParameterOption {
  value: string;
  label: string;
}

export interface ParameterFieldDef {
  key: SystemParameterKey;
  label: string;
  helpText: string;
  kind: 'choice' | 'number' | 'authCode' | 'authExpiry' | 'adminPhone';
  options?: ParameterOption[];
  unit?: string;
  min?: number;
  max?: number;
  subGroup?: string;
  fullWidth?: boolean;
}

export interface ParameterSectionDef {
  id: string;
  code: string;
  title: string;
  shortTitle: string;
  description: string;
  fields: ParameterFieldDef[];
}

export const DEFAULT_SYSTEM_PARAMETERS: SystemParametersConfig = {
  // 01
  requirePickupCodeForPickup: 'disable',
  allowPointsEarnAfterPointsDeduct: 'disable',
  allowMemberPhonePayOnSales: 'disable',
  lockSalesOrderAccounting: 'disable',
  salesOrderQuantityAlert: 'no_remind',
  directStoreShareRetailPrice: 'share',
  defaultUsePointsDeductOnPay: 'enable',
  hideCustomerPhoneOnSalesPrint: 'show',
  salesRefundSubmitMode: 'unlimited',
  normalProductNeedPreOrderOnSales: 'not_needed',
  showStoreStockOnSales: 'show',
  showProcessingStockOnSales: 'show',
  allowZeroYuanPayOnSales: 'allow',
  skipAuthCodeOnPartialSalesEdit: 'require',

  // 02
  allowCashOnMemberRecharge: 'enable',
  allowWriteoffOnMemberRecharge: 'disable',
  optometryOrderType: 'normal',
  hideCustomerContactPhone: 'show',
  lensCatalogPermission: 'enable',

  // 03
  autoAcceptProcessingOrder: 'disable',
  processingNoticePushScope: 'custom',
  requireProcessingCompleteBeforeReceive: 'unlimited',
  hideCustomerPhoneOnProcessingPrint: 'show',
  enableProcessingCenterQc: 'no_qc',
  customLensOnlyCustomOrderFromProcessingList: 'not_needed',

  // 04
  defaultPurchaseSettlementMode: 'none',
  allowModifyPurchaseDate: 'enable',
  allowNegativeStockOnPurchaseReturn: 'allow',
  allowBranchPurchase: 'allow',
  enableStoreReceivingInspection: 'no_inspect',

  // 05
  transferOrderType: 'branch_direct',
  hqAutoApproveTransfer: 'manual',
  allowNegativeStockNonLensTransfer: 'allow',
  allowNegativeStockLensTransfer: 'allow',

  // 06
  supplierSensitiveInfo: 'enable',
  hqUnifiedManageFranchiseStaff: 'franchise_self',

  // 07
  miniProgramVisionScreeningQuery: 'disable',
  miniProgramCustomerOptometryAccess: 'disable',
  miniProgramOptometryDisplayScope: 'full',
  miniProgramAllowViewOtherStores: 'enable',
  miniProgramShowSalesUnitPriceAndDiscount: 'show',
  miniProgramAllowViewSalesOrderDetail: 'allow',
  memberPaymentCodeExpireSeconds: 30,

  // 08
  homeContactLensExpiryReminder: 'enable',
  homeBirthdayReminder: 'enable',
  recentVisionReviewReminderDays: 2,

  // 09
  dailySolutionEmptyNoticeDays: 1,
  monthlyLensNoticeDays: 1,
  quarterlyLensNoticeDays: 1,
  halfYearLensNoticeDays: 1,
  yearlyLensNoticeDays: 1,
  eighteenMonthLensNoticeDays: 30,
  productExpiryWarningDays: 30,
  productionLicenseWarningDays: 30,
  businessLicenseWarningDays: 30,
  medicalDevicePermitWarningDays: 30,
  salesRepAuthWarningDays: 30,
  medicalDeviceRegCertWarningDays: 30,

  // 10
  adminAuthCode: '95851',
  adminAuthCodeExpiry: '2033-08-15 17:53:07',
  salesRefundAdminPhone: '13858011804',
};

export const PARAMETER_SECTIONS: ParameterSectionDef[] = [
  {
    id: 'sales',
    code: '01',
    title: '销售与收银规则',
    shortTitle: '销售与收银',
    description: '控制门店开单交互、积分抵扣规则、零售价共享、小票脱敏打印以及退换冲红校验方式。',
    fields: [
      {
        key: 'requirePickupCodeForPickup',
        label: '是否输入取镜码取镜',
        helpText: '开启后，顾客到店取镜确认交付时需核验取镜码，防止错拿或漏登记。',
        kind: 'choice',
        options: [
          { value: 'enable', label: '启用' },
          { value: 'disable', label: '禁用' },
        ],
      },
      {
        key: 'allowPointsEarnAfterPointsDeduct',
        label: '销售单使用积分抵扣后，是否还可以赠送积分',
        helpText: '控制订单发生积分抵扣金额时，剩余实付部分是否继续按规则累计消费积分。',
        kind: 'choice',
        options: [
          { value: 'enable', label: '启用' },
          { value: 'disable', label: '禁用' },
        ],
      },
      {
        key: 'allowMemberPhonePayOnSales',
        label: '销售单会员支付，是否可以输入手机号支付',
        helpText: '开启后收银端支持直接输入会员手机号发起储值/积分支付，关闭则需扫码或刷卡。',
        kind: 'choice',
        options: [
          { value: 'enable', label: '启用' },
          { value: 'disable', label: '禁用' },
        ],
      },
      {
        key: 'lockSalesOrderAccounting',
        label: '销售单锁账',
        helpText: '启用后已日结或已财务对账的销售单将被锁定，禁止随意修改金额与商品明细。',
        kind: 'choice',
        options: [
          { value: 'enable', label: '启用' },
          { value: 'disable', label: '禁用' },
        ],
      },
      {
        key: 'salesOrderQuantityAlert',
        label: '销售开单数量提醒',
        helpText: '单笔开单商品数量异常或镜片单眼数量超出常规配镜套数时弹出提示。',
        kind: 'choice',
        options: [
          { value: 'remind', label: '提醒' },
          { value: 'no_remind', label: '不提醒' },
        ],
      },
      {
        key: 'directStoreShareRetailPrice',
        label: '直营店(分店)是否共享销售单零售价',
        helpText: '启用后各直营分店共用总部标准零售价体系；禁用则各门店按独立标价开单。',
        kind: 'choice',
        options: [
          { value: 'share', label: '启用（共享）' },
          { value: 'no_share', label: '禁用（不共享）' },
        ],
      },
      {
        key: 'defaultUsePointsDeductOnPay',
        label: '销售单支付，是否默认使用积分抵扣',
        helpText: '结算弹窗打开时自动优先勾选会员可用积分抵扣金额。',
        kind: 'choice',
        options: [
          { value: 'enable', label: '启用' },
          { value: 'disable', label: '禁用' },
        ],
      },
      {
        key: 'hideCustomerPhoneOnSalesPrint',
        label: '销售单打印，是否隐藏顾客手机号',
        helpText: '保护顾客隐私，选择「隐藏」将在打印的纸质销售单据中脱敏或隐藏手机号码。',
        kind: 'choice',
        options: [
          { value: 'show', label: '不隐藏' },
          { value: 'hide', label: '隐藏' },
        ],
      },
      {
        key: 'salesRefundSubmitMode',
        label: '销售单退款/换货/冲红提交方式',
        helpText: '不限：店员可直接提交；授权码：需输入下方管理员授权码；审批：进入门店/总部审批流。',
        kind: 'choice',
        options: [
          { value: 'unlimited', label: '不限' },
          { value: 'auth_code', label: '授权码' },
          { value: 'approval', label: '审批' },
        ],
      },
      {
        key: 'normalProductNeedPreOrderOnSales',
        label: '销售开单，普通商品是否需要订货',
        helpText: '当普通成品或镜架门店暂无库存时，是否允许在开单时直接转订货流程。',
        kind: 'choice',
        options: [
          { value: 'not_needed', label: '不需要' },
          { value: 'needed', label: '需要' },
        ],
      },
      {
        key: 'showStoreStockOnSales',
        label: '销售开单是否显示门店库存',
        helpText: '决定开单选品界面是否向导购展示当前门店实时可用库存数量。',
        kind: 'choice',
        options: [
          { value: 'hide', label: '不显示库存' },
          { value: 'show', label: '显示库存' },
        ],
      },
      {
        key: 'showProcessingStockOnSales',
        label: '销售开单是否显示加工中心库存',
        helpText: '决定开单选品界面是否联动展示中央加工中心的镜片/备片库存数。',
        kind: 'choice',
        options: [
          { value: 'hide', label: '不显示库存' },
          { value: 'show', label: '显示库存' },
        ],
      },
      {
        key: 'allowZeroYuanPayOnSales',
        label: '销售单支付是否允许0元支付',
        helpText: '用于赠品、全额积分/次卡抵扣场景；选择不允许时，仅拥有超权限账号方可提交 0 元单。',
        kind: 'choice',
        options: [
          { value: 'allow', label: '可以' },
          { value: 'disallow_unless_override', label: '不允许0元支付（勾选超权限可以开）' },
        ],
      },
      {
        key: 'skipAuthCodeOnPartialSalesEdit',
        label: '销售单修改部分资料，跳过授权码',
        helpText: '修改顾客备注、取镜时间等非金额字段时，是否免除管理员授权码校验。',
        kind: 'choice',
        options: [
          { value: 'skip', label: '跳过授权码' },
          { value: 'require', label: '需要授权码' },
        ],
      },
    ],
  },
  {
    id: 'recharge_customer',
    code: '02',
    title: '充值、顾客与验光',
    shortTitle: '充值与顾客',
    description: '管理会员储值收款方式、验光单专业制式、顾客隐私脱敏与镜片电子画册权限。',
    fields: [
      {
        key: 'allowCashOnMemberRecharge',
        label: '会员充值，是否可以现金支付',
        helpText: '控制会员储值充值窗口是否允许选择「现金」作为收款方式。',
        kind: 'choice',
        options: [
          { value: 'enable', label: '启用' },
          { value: 'disable', label: '禁用' },
        ],
      },
      {
        key: 'allowWriteoffOnMemberRecharge',
        label: '会员充值，是否可以核销支付',
        helpText: '控制是否支持使用第三方团购核销券直接抵充会员储值账户余额。',
        kind: 'choice',
        options: [
          { value: 'enable', label: '启用' },
          { value: 'disable', label: '禁用' },
        ],
      },
      {
        key: 'optometryOrderType',
        label: '验光单类型',
        helpText: '普通：常规配镜球柱镜轴位字段；专用：启用视功能、眼轴与医学验光扩展字段。',
        kind: 'choice',
        options: [
          { value: 'normal', label: '普通' },
          { value: 'dedicated', label: '专用' },
        ],
      },
      {
        key: 'hideCustomerContactPhone',
        label: '是否隐藏顾客联系电话',
        helpText: '在客户列表与导购查看界面的电话字段是否自动隐藏中间四位。',
        kind: 'choice',
        options: [
          { value: 'hide', label: '隐藏' },
          { value: 'show', label: '显示' },
        ],
      },
      {
        key: 'lensCatalogPermission',
        label: '镜片画册权限',
        helpText: '启用后门店可在接待顾客时打开镜片电子画册进行折射率、膜层与阿贝数对比展示。',
        kind: 'choice',
        options: [
          { value: 'enable', label: '启用' },
          { value: 'disable', label: '禁用' },
        ],
      },
    ],
  },
  {
    id: 'processing',
    code: '03',
    title: '加工中心与加工单',
    shortTitle: '加工中心',
    description: '配置中央加工厂自动接单、定制镜片开单约束、质检节点与加工单收货限制。',
    fields: [
      {
        key: 'autoAcceptProcessingOrder',
        label: '加工中心，加工单自动接单',
        helpText: '开启后门店提交的配镜加工单将自动流转至待加工状态，无需人工点击接单。',
        kind: 'choice',
        options: [
          { value: 'enable', label: '启用' },
          { value: 'disable', label: '禁用' },
        ],
      },
      {
        key: 'processingNoticePushScope',
        label: '加工通知单推送设置',
        helpText: '设置加工进度通知覆盖范围：全部工单或仅车房定制工单推送提醒。',
        kind: 'choice',
        options: [
          { value: 'all', label: '全部' },
          { value: 'custom', label: '定制' },
        ],
      },
      {
        key: 'requireProcessingCompleteBeforeReceive',
        label: '加工单列表，加工完成才可以收货',
        helpText: '选择「限制」时，加工中心未登记完工出库的工单不允许门店提前点击收货。',
        kind: 'choice',
        options: [
          { value: 'unlimited', label: '不限制' },
          { value: 'restricted', label: '限制' },
        ],
      },
      {
        key: 'hideCustomerPhoneOnProcessingPrint',
        label: '加工单打印，是否隐藏顾客手机号',
        helpText: '随镜流转加工工单中是否隐藏顾客手机号，避免外包加工环节泄露客户信息。',
        kind: 'choice',
        options: [
          { value: 'show', label: '不隐藏' },
          { value: 'hide', label: '隐藏' },
        ],
      },
      {
        key: 'enableProcessingCenterQc',
        label: '是否启用加工中心质检',
        helpText: '启用「质检」后，加工单完工前必须经过焦度计与外观质检确认环节。',
        kind: 'choice',
        options: [
          { value: 'qc', label: '质检' },
          { value: 'no_qc', label: '不质检' },
        ],
      },
      {
        key: 'customLensOnlyCustomOrderFromProcessingList',
        label: '销售开单通过《加工单列表》加工时，定制镜片是否只能开定制单',
        helpText: '约束车房定制镜片从加工列表发起加工时必须走定制单流程，防止漏填定制参数。',
        kind: 'choice',
        options: [
          { value: 'not_needed', label: '不需要' },
          { value: 'custom_only', label: '只能开定制单' },
        ],
      },
    ],
  },
  {
    id: 'purchase',
    code: '04',
    title: '采购与门店收货',
    shortTitle: '采购与验收',
    description: '控制分店自主采购权限、默认采购结算主体、入库验收与负库存退货策略。',
    fields: [
      {
        key: 'defaultPurchaseSettlementMode',
        label: '默认采购结算方式',
        helpText: '新增采购单时默认带出的财务结算归属方：不默认 / 本店结算 / 总店统一结算。',
        kind: 'choice',
        options: [
          { value: 'none', label: '不默认' },
          { value: 'store', label: '本店结算' },
          { value: 'hq', label: '总店结算' },
        ],
      },
      {
        key: 'allowModifyPurchaseDate',
        label: '采购单日期修改',
        helpText: '是否允许制单人在创建采购入库单时手工修改业务单据日期。',
        kind: 'choice',
        options: [
          { value: 'enable', label: '启用' },
          { value: 'disable', label: '禁用' },
        ],
      },
      {
        key: 'allowNegativeStockOnPurchaseReturn',
        label: '采购退货，是否允许负库存开单',
        helpText: '开启后允许在系统账面库存尚未补充入库前先登记供应商采购退货出库。',
        kind: 'choice',
        options: [
          { value: 'disallow', label: '不允许' },
          { value: 'allow', label: '允许' },
        ],
      },
      {
        key: 'allowBranchPurchase',
        label: '分店是否能采购',
        helpText: '关闭后分店仅能通过向总店发起调拨或订货补货，不能直接向外部供应商下采购单。',
        kind: 'choice',
        options: [
          { value: 'allow', label: '能采购' },
          { value: 'disallow', label: '不能采购' },
        ],
      },
      {
        key: 'enableStoreReceivingInspection',
        label: '是否启用门店收货验收',
        helpText: '选择「验收」后，门店调拨/采购到货须经质量与数量验收确认后才计入可用库存。',
        kind: 'choice',
        options: [
          { value: 'inspect', label: '验收' },
          { value: 'no_inspect', label: '不验收' },
        ],
      },
    ],
  },
  {
    id: 'transfer',
    code: '05',
    title: '调拨与调货规则',
    shortTitle: '调拨与调货',
    description: '设置门店间调拨审批路径以及镜片/非镜片品类的负库存调拨限制。',
    fields: [
      {
        key: 'transferOrderType',
        label: '调货单类型',
        helpText: '分店直调：门店之间可直接发起并完成调拨；总店审核：须经总部审批后方可执行出库。',
        kind: 'choice',
        options: [
          { value: 'branch_direct', label: '分店直调' },
          { value: 'hq_audit', label: '总店审核' },
        ],
      },
      {
        key: 'hqAutoApproveTransfer',
        label: '总店，是否开启自动审核调货',
        helpText: '在总部审核模式下，开启自动审核后系统将在提交调货单时自动通过总部审核。',
        kind: 'choice',
        options: [
          { value: 'manual', label: '需手动审核' },
          { value: 'auto', label: '自动审核' },
        ],
      },
      {
        key: 'allowNegativeStockNonLensTransfer',
        label: '调货单不允许非镜片负库存开单',
        helpText: '控制镜架、太阳镜、护理液等非镜片商品账面不足时是否允许开具调货出库单。',
        kind: 'choice',
        options: [
          { value: 'disallow', label: '不允许' },
          { value: 'allow', label: '允许负库存调货' },
        ],
      },
      {
        key: 'allowNegativeStockLensTransfer',
        label: '调货单不允许镜片负库存开单',
        helpText: '控制毛坯镜片按球柱镜光度调拨时，账面不足是否允许负库存开单。',
        kind: 'choice',
        options: [
          { value: 'disallow', label: '不允许' },
          { value: 'allow', label: '允许负库存调货' },
        ],
      },
    ],
  },
  {
    id: 'supplier_staff',
    code: '06',
    title: '供应商与员工管理',
    shortTitle: '供应商与员工',
    description: '配置供应商敏感字段可见性及加盟门店员工档案的总部统一管控权限。',
    fields: [
      {
        key: 'supplierSensitiveInfo',
        label: '供应商敏感信息',
        helpText: '启用后向具备权限的采购与管理岗位展示供应商联系方式、结算账号等敏感资料。',
        kind: 'choice',
        options: [
          { value: 'enable', label: '启用' },
          { value: 'disable', label: '禁用' },
        ],
      },
      {
        key: 'hqUnifiedManageFranchiseStaff',
        label: '总店统一管理加盟店员工',
        helpText: '选择「总店统一管理」后，加盟店员工新增、调岗与权限由总部统一维护。',
        kind: 'choice',
        options: [
          { value: 'franchise_self', label: '加盟店自己管理' },
          { value: 'hq_unified', label: '总店统一管理' },
        ],
      },
    ],
  },
  {
    id: 'miniprogram',
    code: '07',
    title: '小程序顾客端设置',
    shortTitle: '顾客端小程序',
    description: '控制顾客端小程序（千视林小助手）的视力筛查查询、验光单展示范围、门店切换及付款码效期。',
    fields: [
      {
        key: 'miniProgramVisionScreeningQuery',
        label: '视力筛查通用查询',
        helpText: '启用后家长或顾客可通过小程序输入登记信息查询校园/门店视力筛查报告。',
        kind: 'choice',
        options: [
          { value: 'enable', label: '启用' },
          { value: 'disable', label: '禁用' },
        ],
      },
      {
        key: 'miniProgramCustomerOptometryAccess',
        label: '顾客验光单查看权限',
        helpText: '可控制顾客是否在小程序内查看个人验光处方，支持设为「取镜后启用」以保障到店成交。',
        kind: 'choice',
        options: [
          { value: 'enable', label: '启用' },
          { value: 'disable', label: '禁用' },
          { value: 'after_pickup', label: '取镜后启用' },
        ],
      },
      {
        key: 'miniProgramOptometryDisplayScope',
        label: '顾客验光信息查看范围',
        helpText: '完整显示：包含球柱镜、轴位、瞳距与下加光；部分显示：仅展示基础矫正视力与建议。',
        kind: 'choice',
        options: [
          { value: 'full', label: '完整显示' },
          { value: 'partial', label: '部分显示' },
        ],
      },
      {
        key: 'miniProgramAllowViewOtherStores',
        label: '是否允许顾客查看其他门店',
        helpText: '启用后顾客可在小程序切换查看所属品牌旗下的其他连锁分店信息与营业地址。',
        kind: 'choice',
        options: [
          { value: 'enable', label: '启用' },
          { value: 'disable', label: '禁用' },
        ],
      },
      {
        key: 'miniProgramShowSalesUnitPriceAndDiscount',
        label: '销售单是否显示单价和折扣',
        helpText: '控制顾客端历史消费订单中是否明文展示商品原单价及优惠折扣明细。',
        kind: 'choice',
        options: [
          { value: 'show', label: '显示' },
          { value: 'hide', label: '隐藏' },
        ],
      },
      {
        key: 'miniProgramAllowViewSalesOrderDetail',
        label: '销售单是否允许顾客查看销售单详情',
        helpText: '控制顾客点击历史订单是否可展开查看购买商品、镜片膜层与质保信息。',
        kind: 'choice',
        options: [
          { value: 'allow', label: '允许' },
          { value: 'disallow', label: '不允许' },
        ],
      },
      {
        key: 'memberPaymentCodeExpireSeconds',
        label: '会员付款码过期时间（秒）',
        helpText: '顾客在小程序生成的动态会员付款二维码有效时长，默认 30 秒，超时自动刷新。',
        kind: 'number',
        unit: '秒',
        min: 10,
        max: 600,
      },
    ],
  },
  {
    id: 'reminders',
    code: '08',
    title: '工作提醒设置',
    shortTitle: '工作提醒',
    description: '配置工作台首页展现的隐形眼镜到期、会员生日关怀以及近期视力复查提醒窗口期。',
    fields: [
      {
        key: 'homeContactLensExpiryReminder',
        label: '首页隐形眼镜过期提醒',
        helpText: '开启后在工作台「工作提醒」区域高亮展示即将到期需换片复购的隐形眼镜顾客数量。',
        kind: 'choice',
        options: [
          { value: 'enable', label: '启用' },
          { value: 'disable', label: '禁用' },
        ],
      },
      {
        key: 'homeBirthdayReminder',
        label: '首页生日提醒',
        helpText: '开启后在工作台展现近期过生日的会员提醒，便于导购发起专属关怀与赠券触达。',
        kind: 'choice',
        options: [
          { value: 'enable', label: '启用' },
          { value: 'disable', label: '禁用' },
        ],
      },
      {
        key: 'recentVisionReviewReminderDays',
        label: '近 X 天视力复查提醒',
        helpText: '统计未来 X 天内预约或计划到店复查的视光档案数量并推送至工作台待办。',
        kind: 'number',
        unit: '天',
        min: 1,
        max: 90,
      },
    ],
  },
  {
    id: 'warnings',
    code: '09',
    title: '隐形眼镜与证照预警',
    shortTitle: '效期与预警',
    description: '设定隐形眼镜不同抛期的顾客换片提前通知天数，以及三类医疗器械证照和商品近效期预警阈值。',
    fields: [
      {
        key: 'dailySolutionEmptyNoticeDays',
        label: '日抛/护理液/空材质 提前通知天数',
        helpText: '日抛、护理液等短周期耗材在预计用完前提前多少天生成复购提醒。',
        kind: 'number',
        unit: '天',
        min: 0,
        max: 365,
        subGroup: '隐形眼镜抛期提前通知天数',
      },
      {
        key: 'monthlyLensNoticeDays',
        label: '月抛 提前通知天数',
        helpText: '月抛型隐形眼镜到期前提前提醒更换的天数。',
        kind: 'number',
        unit: '天',
        min: 0,
        max: 365,
        subGroup: '隐形眼镜抛期提前通知天数',
      },
      {
        key: 'quarterlyLensNoticeDays',
        label: '季抛 提前通知天数',
        helpText: '季抛型隐形眼镜到期前提前提醒更换的天数。',
        kind: 'number',
        unit: '天',
        min: 0,
        max: 365,
        subGroup: '隐形眼镜抛期提前通知天数',
      },
      {
        key: 'halfYearLensNoticeDays',
        label: '半年抛 提前通知天数',
        helpText: '半年抛型隐形眼镜到期前提前提醒更换的天数。',
        kind: 'number',
        unit: '天',
        min: 0,
        max: 365,
        subGroup: '隐形眼镜抛期提前通知天数',
      },
      {
        key: 'yearlyLensNoticeDays',
        label: '年抛 提前通知天数',
        helpText: '年抛型隐形眼镜到期前提前提醒更换的天数。',
        kind: 'number',
        unit: '天',
        min: 0,
        max: 365,
        subGroup: '隐形眼镜抛期提前通知天数',
      },
      {
        key: 'eighteenMonthLensNoticeDays',
        label: '18个月抛 提前通知天数',
        helpText: '长周期 18 个月抛型镜片到期前提前提醒复查换片的天数。',
        kind: 'number',
        unit: '天',
        min: 0,
        max: 365,
        subGroup: '隐形眼镜抛期提前通知天数',
      },
      {
        key: 'productExpiryWarningDays',
        label: '商品有效期 提前预警天数',
        helpText: '库存商品（隐形眼镜、护理液等）距失效期不足该天数时触发近效期预警。',
        kind: 'number',
        unit: '天',
        min: 1,
        max: 730,
        subGroup: '商品与医疗器械证照预警天数',
      },
      {
        key: 'productionLicenseWarningDays',
        label: '生产许可证 过期提前预警天数',
        helpText: '首营合作厂商生产许可证距到期不足该天数时提前预警。',
        kind: 'number',
        unit: '天',
        min: 1,
        max: 730,
        subGroup: '商品与医疗器械证照预警天数',
      },
      {
        key: 'businessLicenseWarningDays',
        label: '营业执照 过期提前预警天数',
        helpText: '门店或首营企业营业执照距到期不足该天数时提前预警。',
        kind: 'number',
        unit: '天',
        min: 1,
        max: 730,
        subGroup: '商品与医疗器械证照预警天数',
      },
      {
        key: 'medicalDevicePermitWarningDays',
        label: '医疗器械经营许可证 过期提前预警天数',
        helpText: '门店三类医疗器械经营许可证距到期不足该天数时触发合规红黄牌预警。',
        kind: 'number',
        unit: '天',
        min: 1,
        max: 730,
        subGroup: '商品与医疗器械证照预警天数',
      },
      {
        key: 'salesRepAuthWarningDays',
        label: '业务员授权书 过期提前预警天数',
        helpText: '供应商销售人员法人授权委托书到期前的提前预警天数。',
        kind: 'number',
        unit: '天',
        min: 1,
        max: 730,
        subGroup: '商品与医疗器械证照预警天数',
      },
      {
        key: 'medicalDeviceRegCertWarningDays',
        label: '医疗器械注册证 过期提前预警天数',
        helpText: '首营隐形眼镜及护理液品种医疗器械注册证到期前的提前预警天数。',
        kind: 'number',
        unit: '天',
        min: 1,
        max: 730,
        subGroup: '商品与医疗器械证照预警天数',
      },
    ],
  },
  {
    id: 'admin',
    code: '10',
    title: '管理员与授权设置',
    shortTitle: '管理员设置',
    description: '管理高危敏感操作所需的门店授权码、授权码有效期以及销售退款校验管理员手机号码。',
    fields: [
      {
        key: 'adminAuthCode',
        label: '授权码',
        helpText: '门店执行超权折扣、退款冲红或关键资料修改时需输入的临时安全授权密码。',
        kind: 'authCode',
      },
      {
        key: 'adminAuthCodeExpiry',
        label: '授权码过期时间',
        helpText: '授权码失效时间点，超过该时间后收银与修改操作将无法使用旧授权码。',
        kind: 'authExpiry',
      },
      {
        key: 'salesRefundAdminPhone',
        label: '销售退款管理员手机',
        helpText: '门店发生大额销售退款或审批确认时接收验证码与风控通知的管理员手机号。',
        kind: 'adminPhone',
      },
    ],
  },
];

const STORAGE_KEY = 'qsl_system_parameters_by_store_v1';

export function loadAllStoreParameters(): Record<string, SystemParametersConfig> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, SystemParametersConfig>)
      : {};
  } catch {
    return {};
  }
}

export function getStoreParameters(storeId: string): SystemParametersConfig {
  const map = loadAllStoreParameters();
  const saved = map[storeId];
  if (!saved) return { ...DEFAULT_SYSTEM_PARAMETERS };
  return { ...DEFAULT_SYSTEM_PARAMETERS, ...saved };
}

export function saveStoreParameters(
  storeId: string,
  config: SystemParametersConfig
): void {
  if (typeof window === 'undefined') return;
  try {
    const map = loadAllStoreParameters();
    map[storeId] = config;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors in prototype mode
  }
}

export function syncParametersToOtherStores(
  sourceConfig: SystemParametersConfig,
  targetStoreIds: string[],
  changedKeysOnly?: SystemParameterKey[]
): void {
  if (typeof window === 'undefined') return;
  try {
    const map = loadAllStoreParameters();
    for (const targetId of targetStoreIds) {
      const existing = map[targetId]
        ? { ...DEFAULT_SYSTEM_PARAMETERS, ...map[targetId] }
        : { ...DEFAULT_SYSTEM_PARAMETERS };
      if (changedKeysOnly && changedKeysOnly.length > 0) {
        for (const k of changedKeysOnly) {
          (existing as Record<string, unknown>)[k] = sourceConfig[k];
        }
        map[targetId] = existing;
      } else {
        map[targetId] = { ...sourceConfig };
      }
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors in prototype mode
  }
}
