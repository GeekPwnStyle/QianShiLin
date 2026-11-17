import type { Component } from "vue"
import {
  AccountBookOutlined,
  BarChartOutlined,
  CompassOutlined,
  CustomerServiceOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  GiftOutlined,
  HomeOutlined,
  InboxOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  SolutionOutlined,
  TeamOutlined,
  ToolOutlined
} from "@ant-design/icons-vue"

export interface MenuNode {
  /** 路由路径，同时作为菜单 key */
  key: string
  title: string
  icon?: Component
  children?: MenuNode[]
}

/** GSS 后台菜单（按钉钉文档 SCS合并后菜单） */
export const menuTree: MenuNode[] = [
  { key: "/home", title: "首页", icon: HomeOutlined },
  {
    key: "/region",
    title: "区域管理",
    icon: EnvironmentOutlined,
    children: [
      { key: "/region/manager", title: "区域负责人" }
    ]
  },
  { key: "/guide", title: "新手指引", icon: CompassOutlined },
  {
    key: "/purchase",
    title: "采购管理",
    icon: ShoppingCartOutlined,
    children: [
      {
        key: "/purchase/order",
        title: "订单管理",
        children: [
          { key: "/purchase/order/frame-po", title: "镜架采购订单" },
          { key: "/purchase/order/ready-po", title: "成镜采购订单" },
          { key: "/purchase/order/lab-po", title: "车房镜采购订单" },
          { key: "/purchase/order/po-list", title: "采购订单列表" },
          { key: "/purchase/order/po-detail", title: "采购订单明细" },
          { key: "/purchase/order/po-follow-beta", title: "采购订单跟进表(beta)" }
        ]
      },
      {
        key: "/purchase/inbound",
        title: "入库管理",
        children: [
          { key: "/purchase/inbound/frame-in", title: "镜架采购入库单" },
          { key: "/purchase/inbound/ready-in", title: "成镜采购入库单" },
          { key: "/purchase/inbound/lab-in", title: "车房镜采购入库单" },
          { key: "/purchase/inbound/in-list", title: "采购入库单列表" },
          { key: "/purchase/inbound/in-transit", title: "在途商品" }
        ]
      },
      {
        key: "/purchase/return",
        title: "退货管理",
        children: [
          { key: "/purchase/return/frame-return", title: "镜架采购退货单" },
          { key: "/purchase/return/ready-return", title: "成镜采购退货单" },
          { key: "/purchase/return/lab-return", title: "车房镜采购退货单" },
          { key: "/purchase/return/return-list", title: "采购退货单列表" }
        ]
      },
      {
        key: "/purchase/price",
        title: "价格管理",
        children: [
          { key: "/purchase/price/supplier-price-set", title: "供应商价格设置" },
          { key: "/purchase/price/supplier-price-query", title: "供应商价格查询" },
          { key: "/purchase/price/supplier-price-record", title: "供应商交易价格记录" }
        ]
      },
      {
        key: "/purchase/purchase-report",
        title: "采购报表",
        children: [
          { key: "/purchase/purchase-report/in-summary", title: "采购入库汇总" },
          { key: "/purchase/purchase-report/in-detail", title: "采购入库明细" }
        ]
      }
    ]
  },
  {
    key: "/retail",
    title: "零售管理",
    icon: ShopOutlined,
    children: [
      {
        key: "/retail/sale-order",
        title: "销售单管理",
        children: [
          { key: "/retail/sale-order/optical-sale", title: "配镜销售单" },
          { key: "/retail/sale-order/optical-return", title: "配镜退货单" }
        ]
      },
      {
        key: "/retail/transfer",
        title: "调货管理",
        children: [
          { key: "/retail/transfer/transfer-apply", title: "调货申请管理" },
          { key: "/retail/transfer/transfer-in", title: "调货入库单管理" },
          { key: "/retail/transfer/transfer-out", title: "调货出库单管理" }
        ]
      },
      {
        key: "/retail/promo",
        title: "促销活动设置",
        children: [
          { key: "/retail/promo/activity", title: "活动管理" },
          { key: "/retail/promo/coupon-set", title: "优惠券设置" },
          { key: "/retail/promo/times-card", title: "次卡设置" },
          { key: "/retail/promo/combo", title: "商品套餐" }
        ]
      },
      {
        key: "/retail/sale-settings",
        title: "销售设置",
        children: [
          { key: "/retail/sale-settings/platform-writeoff", title: "平台核销设置" },
          { key: "/retail/sale-settings/discount-auth", title: "折扣权限设置" }
        ]
      },
      {
        key: "/retail/price",
        title: "价格管理",
        children: [
          { key: "/retail/price/product-price", title: "产品价格维护" },
          { key: "/retail/price/customer-price", title: "客户价格设置" }
        ]
      }
    ]
  },
  {
    key: "/sales",
    title: "销售管理 （加盟店）",
    icon: SolutionOutlined,
    children: [
      {
        key: "/sales/order",
        title: "订单管理",
        children: [
          { key: "/sales/order/frame-so", title: "镜架销售订单" },
          { key: "/sales/order/ready-so", title: "成镜销售订单" },
          { key: "/sales/order/lab-so", title: "车房镜销售订单" },
          { key: "/sales/order/so-pick", title: "销售订单拣货" },
          { key: "/sales/order/so-list", title: "销售订单列表" },
          { key: "/sales/order/so-detail", title: "销售订单明细" },
          { key: "/sales/order/so-follow", title: "销售订单跟进表" }
        ]
      },
      {
        key: "/sales/shipment",
        title: "发货管理",
        children: [
          { key: "/sales/shipment/frame-out", title: "镜架销售出库单" },
          { key: "/sales/shipment/ready-out", title: "成镜销售出库单" },
          { key: "/sales/shipment/lab-out", title: "车房镜销售出库单" },
          { key: "/sales/shipment/out-list", title: "销售出库单列表" }
        ]
      },
      {
        key: "/sales/return",
        title: "退货管理",
        children: [
          { key: "/sales/return/frame-sale-return", title: "镜架销售退货单" },
          { key: "/sales/return/ready-sale-return", title: "成镜销售退货单" },
          { key: "/sales/return/lab-sale-return", title: "车房镜销售退货单" },
          { key: "/sales/return/sale-return-list", title: "销售退货单列表" }
        ]
      },
      {
        key: "/sales/price",
        title: "价格管理",
        children: [
          { key: "/sales/price/product-price", title: "产品价格维护" },
          { key: "/sales/price/customer-price", title: "客户价格设置" },
          { key: "/sales/price/consign-quota", title: "寄卖额度设置" },
          { key: "/sales/price/credit-quota", title: "信用额度设置" },
          { key: "/sales/price/customer-price-query", title: "客户价格查询" },
          { key: "/sales/price/customer-price-record", title: "客户交易价格记录" }
        ]
      },
      {
        key: "/sales/sale-report",
        title: "销售报表",
        children: [
          { key: "/sales/sale-report/out-summary", title: "销售出库汇总" },
          { key: "/sales/sale-report/out-detail", title: "销售出库明细" }
        ]
      }
    ]
  },
  {
    key: "/member",
    title: "会员管理",
    icon: TeamOutlined,
    children: [
      { key: "/member/member-info", title: "会员资料" },
      {
        key: "/member/settings",
        title: "会员设置",
        children: [
          { key: "/member/settings/level", title: "会员等级设置" },
          { key: "/member/settings/points-set", title: "积分设置" },
          { key: "/member/settings/source", title: "顾客来源设置" },
          { key: "/member/settings/recharge-set", title: "充值设置" },
          { key: "/member/settings/appointment", title: "预约设置" },
          { key: "/member/settings/referral", title: "会员推荐设置" },
          { key: "/member/settings/visit-set", title: "会员回访设置" }
        ]
      },
      {
        key: "/member/followup",
        title: "售后回访",
        children: [
          { key: "/member/followup/visit-exec", title: "回访执行记录" },
          { key: "/member/followup/visit-analysis", title: "回访完成分析" }
        ]
      },
      {
        key: "/member/points",
        title: "积分管理",
        children: [
          { key: "/member/points/points-adjust", title: "积分调整" },
          { key: "/member/points/points-consume", title: "积分消费查询/统计" },
          { key: "/member/points/points-exchange", title: "积分兑换明细" }
        ]
      },
      {
        key: "/member/recharge",
        title: "充值管理",
        children: [
          { key: "/member/recharge/recharge-query", title: "充值查询" },
          { key: "/member/recharge/recharge-detail", title: "会员充值明细" },
          { key: "/member/recharge/member-flow", title: "会员流水" },
          { key: "/member/recharge/recharge-consume-report", title: "充值消费报表" }
        ]
      },
      { key: "/member/reception", title: "顾客接待记录" },
      { key: "/member/persona", title: "顾客用户画像" }
    ]
  },
  {
    key: "/warehouse",
    title: "仓库管理",
    icon: InboxOutlined,
    children: [
      {
        key: "/warehouse/transfer",
        title: "调货管理",
        children: [
          { key: "/warehouse/transfer/transfer-apply", title: "调货申请管理" },
          { key: "/warehouse/transfer/transfer-in", title: "调货入库单管理" },
          { key: "/warehouse/transfer/transfer-out", title: "调货出库单管理" }
        ]
      },
      {
        key: "/warehouse/stocktake",
        title: "盘点管理",
        children: [
          { key: "/warehouse/stocktake/frame-stocktake", title: "镜架盘点单" },
          { key: "/warehouse/stocktake/lens-stocktake", title: "镜片盘点单" }
        ]
      },
      {
        key: "/warehouse/loss-overflow",
        title: "报损报溢管理",
        children: [
          { key: "/warehouse/loss-overflow/frame-loss", title: "镜架报损报溢单" },
          { key: "/warehouse/loss-overflow/lens-loss", title: "镜片报损报溢单" }
        ]
      },
      {
        key: "/warehouse/stock-alert",
        title: "库存预警管理",
        children: [
          { key: "/warehouse/stock-alert/goods-replenish", title: "普通商品补货清单" },
          { key: "/warehouse/stock-alert/lens-replenish", title: "镜片补货清单" }
        ]
      },
      {
        key: "/warehouse/stock-query",
        title: "库存查询",
        children: [
          { key: "/warehouse/stock-query/list", title: "库存查询" },
          { key: "/warehouse/stock-query/customer-stock", title: "客户库存查询" }
        ]
      },
      {
        key: "/warehouse/stock-report",
        title: "库存报表",
        children: [
          { key: "/warehouse/stock-report/list", title: "库存报表" },
          { key: "/warehouse/stock-report/age-stat", title: "库龄统计" },
          { key: "/warehouse/stock-report/stock-carry", title: "库存结转列表" },
          { key: "/warehouse/stock-report/age-analysis", title: "库龄分析" }
        ]
      }
    ]
  },
  {
    key: "/finance",
    title: "账款管理",
    icon: AccountBookOutlined,
    children: [
      {
        key: "/finance/receivable",
        title: "应收管理",
        children: [
          { key: "/finance/receivable/shou-kuan-he-xiao-dan", title: "收款核销单" },
          { key: "/finance/receivable/customer-reconcile-order", title: "客户往来对账（订单）" },
          { key: "/finance/receivable/customer-reconcile-out", title: "客户往来对账（出库）" },
          { key: "/finance/receivable/customer-reconcile-beta", title: "客户往来对账[Beta]" },
          { key: "/finance/receivable/ke-hu-dui-zhang-dan-lie-biao", title: "客户对账单列表" },
          { key: "/finance/receivable/customer-ledger", title: "客户总账目" },
          { key: "/finance/receivable/customer-ledger-beta", title: "客户总账目[Beta]" },
          { key: "/finance/receivable/ke-hu-tai-zhang", title: "客户台账" },
          { key: "/finance/receivable/ying-shou-kuan-zhang-bu", title: "应收款账簿" },
          { key: "/finance/receivable/ke-hu-zhang-kuan-tiao-zheng", title: "客户账款调整" },
          { key: "/finance/receivable/xiao-shou-chu-ku-dan-diao-zhang", title: "销售出库单调账" },
          { key: "/finance/receivable/xiao-shou-tui-huo-dan-diao-zhang", title: "销售退货单调账" },
          { key: "/finance/receivable/ying-shou-zhang-kuan-jie-zhuan", title: "应收账款结转" },
          { key: "/finance/receivable/shou-kuan-hui-zong", title: "收款汇总" },
          { key: "/finance/receivable/ying-shou-zhang-kuan-jie-zhuan-lie-biao", title: "应收账款结转列表" }
        ]
      },
      {
        key: "/finance/payable",
        title: "应付管理",
        children: [
          { key: "/finance/payable/fu-kuan-he-xiao-dan", title: "付款核销单" },
          { key: "/finance/payable/fu-kuan-shen-qing-dan", title: "付款申请单" },
          { key: "/finance/payable/gong-ying-shang-wang-lai-dui-zhang", title: "供应商往来对账" },
          { key: "/finance/payable/gong-ying-shang-dui-zhang-dan-lie-biao", title: "供应商对账单列表" },
          { key: "/finance/payable/gong-ying-shang-tai-zhang", title: "供应商台账" },
          { key: "/finance/payable/gong-ying-shang-zong-zhang-mu", title: "供应商总账目" },
          { key: "/finance/payable/gong-ying-shang-zhang-kuan-tiao-zheng", title: "供应商账款调整" },
          { key: "/finance/payable/ying-fu-zhang-kuan-jie-zhuan", title: "应付账款结转" },
          { key: "/finance/payable/ying-fu-zhang-kuan-jie-zhuan-lie-biao", title: "应付账款结转列表" },
          { key: "/finance/payable/cai-gou-ru-ku-dan-diao-zhang", title: "采购入库单调账" },
          { key: "/finance/payable/cai-gou-tui-huo-dan-diao-zhang", title: "采购退货单调账" }
        ]
      },
      {
        key: "/finance/other",
        title: "其他管理",
        children: [
          { key: "/finance/other/ai-fei-yong-ji-lu", title: "AI费用记录" },
          { key: "/finance/other/qi-ta-fei-yong", title: "其他费用" },
          { key: "/finance/other/xian-shang-zhi-fu", title: "线上支付" },
          { key: "/finance/other/yue-mo-jie-zhuan", title: "月末结转" },
          { key: "/finance/other/zhang-tao-wang-lai-jie-suan", title: "账套往来结算" },
          { key: "/finance/other/chong-zhi-hui-zong", title: "充值汇总" },
          { key: "/finance/other/dian-zi-he-tong", title: "电子合同" },
          { key: "/finance/other/dian-zi-he-tong-fei-yong-ji-lu", title: "电子合同费用记录" },
          { key: "/finance/other/cai-gou-yun-fei-tiao-zheng", title: "采购运费调整" },
          { key: "/finance/other/xiao-shou-yun-fei-tiao-zheng", title: "销售运费调整" },
          { key: "/finance/other/liu-dong-zi-jin", title: "流动资金" }
        ]
      }
    ]
  },
  {
    key: "/report",
    title: "统计报表",
    icon: BarChartOutlined,
    children: [
      {
        key: "/report/purchase-report",
        title: "采购报表",
        children: [
          { key: "/report/purchase-report/in-summary", title: "采购入库汇总" },
          { key: "/report/purchase-report/in-detail", title: "采购入库明细" },
          { key: "/report/purchase-report/supplier-price-record", title: "供应商交易价格记录" }
        ]
      },
      {
        key: "/report/wholesale-sale-report",
        title: "销售报表 （批发）",
        children: [
          { key: "/report/wholesale-sale-report/out-summary", title: "销售出库汇总" },
          { key: "/report/wholesale-sale-report/out-detail", title: "销售出库明细" },
          { key: "/report/wholesale-sale-report/xiao-shou-zou-shi", title: "销售走势" },
          { key: "/report/wholesale-sale-report/ke-dan-fen-xi", title: "客单分析" },
          { key: "/report/wholesale-sale-report/xiao-shou-ren-wu-wan-cheng-jin-du", title: "销售任务完成进度" },
          { key: "/report/wholesale-sale-report/ke-hu-xiao-liang-pai-hang", title: "客户销量排行" },
          { key: "/report/wholesale-sale-report/chang-zhi-xiao-pin-pai-hang", title: "畅滞销品排行" },
          { key: "/report/wholesale-sale-report/chang-zhi-xiao-chan-pin-bao-biao", title: "畅滞销产品报表" },
          { key: "/report/wholesale-sale-report/dong-xiao-lv-zou-shi", title: "动销率走势" },
          { key: "/report/wholesale-sale-report/pu-huo-ji-fen-hui-zong", title: "铺货积分汇总" },
          { key: "/report/wholesale-sale-report/chan-pin-xiao-shou-pai-ming", title: "产品销售排名" },
          { key: "/report/wholesale-sale-report/xiao-shou-pai-hang-fen-xi-beta", title: "销售排行分析[Beta]" }
        ]
      },
      {
        key: "/report/psi-report",
        title: "进销存报表",
        children: [
          { key: "/report/psi-report/cun-xiao-bi-bao-biao", title: "存销比报表" },
          { key: "/report/psi-report/jin-xiao-bi-bao-biao", title: "进销比报表" },
          { key: "/report/psi-report/jin-xiao-cun-hui-zong-bao-biao", title: "进销存汇总报表" }
        ]
      },
      {
        key: "/report/cost-profit",
        title: "成本利润报表",
        children: [
          { key: "/report/cost-profit/xiao-shou-cheng-ben", title: "销售成本" },
          { key: "/report/cost-profit/xiao-shou-mao-li-bao-biao", title: "销售毛利报表" },
          { key: "/report/cost-profit/mao-li-fen-xi-bao-biao", title: "毛利分析报表" },
          { key: "/report/cost-profit/jing-li-run-bao-biao", title: "净利润报表" }
        ]
      },
      {
        key: "/report/finance-report",
        title: "财务账款报表",
        children: [
          { key: "/report/finance-report/zhang-kuan-yu-jing", title: "账款预警" },
          { key: "/report/finance-report/chong-zhi-hui-zong", title: "充值汇总" },
          { key: "/report/finance-report/ri-jie-dan-hui-zong", title: "日结单汇总" },
          { key: "/report/finance-report/xiao-shou-shou-kuan-hui-zong", title: "销售收款汇总" },
          { key: "/report/finance-report/shou-kuan-ming-xi-bao-biao", title: "收款明细报表" },
          { key: "/report/finance-report/shou-kuan-hui-zong-bao-biao", title: "收款汇总报表" }
        ]
      },
      {
        key: "/report/analysis",
        title: "综合分析报表",
        children: [
          { key: "/report/analysis/mu-biao-da-cheng-tong-ji-fen-xi", title: "目标达成统计分析" },
          { key: "/report/analysis/yuan-gong-ye-ji-tong-ji-fen-xi", title: "员工业绩统计分析" },
          { key: "/report/analysis/xiao-shou-ye-ji-tong-ji-fen-xi", title: "销售业绩统计分析" },
          { key: "/report/analysis/hui-yuan-tong-ji-fen-xi-bao-biao", title: "会员统计分析报表" },
          { key: "/report/analysis/xiao-shou-li-run-tong-ji-fen-xi", title: "销售利润统计分析" },
          { key: "/report/analysis/shang-pin-jin-xiao-cun-tong-ji-bao-biao", title: "商品进销存统计报表" }
        ]
      },
      {
        key: "/report/retail-sale-report",
        title: "零售销售报表",
        children: [
          { key: "/report/retail-sale-report/ling-shou-xiao-shou-fen-xi", title: "零售销售分析" },
          { key: "/report/retail-sale-report/ling-shou-ming-xi-bao-biao", title: "零售明细报表" },
          { key: "/report/retail-sale-report/ling-shou-hui-zong-bao-biao", title: "零售汇总报表" }
        ]
      },
      {
        key: "/report/member-stat",
        title: "会员统计报表",
        children: [
          { key: "/report/member-stat/duan-xin-liu-shui", title: "短信流水" },
          { key: "/report/member-stat/li-shi-tui-song-lie-biao", title: "历史推送列表" }
        ]
      }
    ]
  },
  {
    key: "/process",
    title: "加工管理",
    icon: ToolOutlined,
    children: [
      { key: "/process/work-order", title: "加工单管理" },
      { key: "/process/craftsman", title: "加工师加工" },
      { key: "/process/qc", title: "加工质检" },
      { key: "/process/spot-check", title: "加工抽检" },
      { key: "/process/material-cabinet", title: "物料柜" },
      {
        key: "/process/logistics",
        title: "物流管理",
        children: [
          { key: "/process/logistics/jia-gong-wu-liu-gong-si", title: "加工物流公司" },
          { key: "/process/logistics/yun-dan-deng-ji", title: "运单登记" }
        ]
      },
      { key: "/process/center-config", title: "加工中心配置" }
    ]
  },
  {
    key: "/contact",
    title: "隐形眼镜管理",
    icon: EyeOutlined,
    children: [
      { key: "/contact/eye-care", title: "眼护产品（SCS）" }
    ]
  },
  {
    key: "/screen",
    title: "视力筛查",
    icon: ExperimentOutlined,
    children: [
      { key: "/screen/school", title: "学校管理" },
      { key: "/screen/summary", title: "统计汇总" },
      { key: "/screen/detail", title: "明细查询" },
      { key: "/screen/charts", title: "分析图表" },
      { key: "/screen/degree-setting", title: "筛查度数设置" }
    ]
  },
  {
    key: "/mall",
    title: "商城管理",
    icon: GiftOutlined,
    children: [
      { key: "/mall/home-decor", title: "首页装修" },
      { key: "/mall/goods", title: "商品管理" },
      { key: "/mall/order-users", title: "用户管理（下单）" },
      { key: "/mall/recharge-config", title: "充值配置" },
      { key: "/mall/coupon", title: "优惠劵管理" },
      { key: "/mall/aftersale-order", title: "售后订单" },
      { key: "/mall/repair-config", title: "维修配置" },
      { key: "/mall/repair-order", title: "售后维修订单" }
    ]
  },
  {
    key: "/base",
    title: "基本资料",
    icon: DatabaseOutlined,
    children: [
      { key: "/product/product-info", title: "产品资料" },
      { key: "/product/goods-maintain", title: "商品维护管理" },
      { key: "/base/brand", title: "品牌资料" },
      { key: "/base/sales-region", title: "销售区域资料" },
      { key: "/base/customer", title: "客户资料" },
      { key: "/base/supplier", title: "供应商资料" },
      { key: "/base/warehouse-info", title: "仓库资料" },
      { key: "/base/logistics-co", title: "物流公司" },
      { key: "/base/bank", title: "银行资料" },
      { key: "/base/customer-credit-term", title: "客户账期设置" },
      {
        key: "/base/fee",
        title: "收费管理",
        children: [
          { key: "/base/fee/fee-category", title: "收费类别" },
          { key: "/base/fee/fee-item", title: "收费项目" }
        ]
      }
    ]
  },
  {
    key: "/system",
    title: "系统维护",
    icon: SettingOutlined,
    children: [
      {
        key: "/system/init",
        title: "初始化设置",
        children: [
          { key: "/system/init/ying-shou-zhang-kuan-qi-chu-lu-ru", title: "应收账款期初录入" },
          { key: "/system/init/ying-fu-zhang-kuan-qi-chu-lu-ru", title: "应付账款期初录入" },
          { key: "/system/init/qi-chu-ku-cun-chu-shi-hua-she-zhi", title: "期初库存初始化设置" }
        ]
      },
      {
        key: "/system/org",
        title: "组织管理",
        children: [
          { key: "/system/org/men-dian-guan-li", title: "门店管理" },
          { key: "/system/org/zhen-shi-guan-li", title: "诊室管理" },
          { key: "/system/org/bu-men-guan-li", title: "部门管理" },
          { key: "/system/org/gang-wei-guan-li", title: "岗位管理" },
          { key: "/system/org/jue-se-guan-li", title: "角色管理" },
          { key: "/system/org/yuan-gong-guan-li", title: "员工管理" },
          { key: "/system/org/zu-zhi-jia-gou", title: "组织架构" }
        ]
      },
      { key: "/system/kpi", title: "目标绩效管理" },
      {
        key: "/system/logs",
        title: "系统日志",
        children: [
          { key: "/system/logs/da-yin-ri-zhi", title: "打印日志" },
          { key: "/system/logs/cao-zuo-ri-zhi", title: "操作日志" },
          { key: "/system/logs/xi-tong-ri-zhi-cha-kan", title: "系统日志查看" },
          { key: "/system/logs/mu-ban-guan-li", title: "模板管理" }
        ]
      },
      {
        key: "/system/month-end",
        title: "月末处理",
        children: [
          { key: "/system/month-end/yue-mo-jie-zhuan", title: "月末结转" }
        ]
      },
      {
        key: "/system/mp",
        title: "公众号配置",
        children: [
          { key: "/system/mp/ji-chu-pei-zhi", title: "基础配置" },
          { key: "/system/mp/mu-ban-guan-li", title: "模板管理" },
          { key: "/system/mp/li-shi-tui-song-lie-biao", title: "历史推送列表" }
        ]
      },
      {
        key: "/system/data-gov",
        title: "数据治理",
        children: [
          { key: "/system/data-gov/pin-pai-he-bing", title: "品牌合并" },
          { key: "/system/data-gov/shang-pin-he-bing", title: "商品合并" },
          { key: "/system/data-gov/hui-yuan-he-bing", title: "会员合并" }
        ]
      },
      {
        key: "/system/inbox",
        title: "站内信管理",
        children: [
          { key: "/system/inbox/fa-song-zhan-nei-xin", title: "发送站内信" },
          { key: "/system/inbox/zhan-nei-xin-fa-bu-ji-lu", title: "站内信发布记录" }
        ]
      },
      { key: "/system/params", title: "参数设置" }
    ]
  },
  {
    key: "/help",
    title: "帮助中心",
    icon: QuestionCircleOutlined,
    children: [
      { key: "/help/docs", title: "操作文档" }
    ]
  },
  {
    key: "/service",
    title: "客服管理",
    icon: CustomerServiceOutlined,
    children: [
      { key: "/service/session", title: "客服会话" },
      { key: "/service/satisfaction", title: "满意度分析" },
      { key: "/service/config", title: "客服配置" },
      { key: "/service/knowledge", title: "知识库管理" }
    ]
  }
]

export interface MenuLeaf {
  key: string
  title: string
  /** 从一级菜单到当前页面的标题链，用于面包屑 */
  breadcrumb: string[]
  /** 所有祖先菜单的 key，用于自动展开 */
  parentKeys: string[]
}

const flatten = (nodes: MenuNode[], trail: string[] = [], parents: string[] = []): MenuLeaf[] =>
  nodes.flatMap((n) =>
    n.children?.length
      ? flatten(n.children, [...trail, n.title], [...parents, n.key])
      : [{ key: n.key, title: n.title, breadcrumb: [...trail, n.title], parentKeys: parents }]
  )

export const menuLeaves = flatten(menuTree)

export const menuLeafMap = new Map(menuLeaves.map((l) => [l.key, l]))
