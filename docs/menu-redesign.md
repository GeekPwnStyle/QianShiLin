# 未完成菜单的信息架构调整

仅调整未完成节点的显示名；已完成页面及其上级「基本资料／采购／系统管理」的显示名保持原样。保留节点的 ID、路由、权限码和页面类型保持不变。重复入口从菜单树移除，旧路径转到对应页面。原「优惠券放大游戏」单独玩法取消。

覆盖：189 个重命名节点，13 个合并入口，1 个取消的活动玩法；已完成节点保持不变。

## 一级模块新结构

| 保留既有名称 | 重新命名的模块 |
| --- | --- |
| 基本资料、采购、系统管理 | 门店交易、店间协同、库存运营、服务保障、经营分析、资金往来、接触镜运营、客户经营、交付加工、视力健康档案、校园视力项目、塑形镜随访、品牌采购门户、品牌传播、使用支持 |

命名围绕零售交易、客户服务、视力健康和供应链履约组织，避免机械照搬原系统的名词。所有 18 个一级模块仍保留；本轮收敛的是功能相近的深层入口。未来若要继续压缩顶层模块，须单独核对角色范围与导航习惯。

## 重命名对照

| ID | 原名称 | 新名称 |
| --- | --- | --- |
| `basic.product` | 商品资料 | 商品档案 |
| `basic.product.list` | 商品列表 | 商品总览 |
| `basic.product.categories` | 商品品类 | 商品分类体系 |
| `basic.product.tags` | 商品标签 | 选品标签 |
| `basic.product.lens_surcharge` | 镜片附加费 | 镜片工艺加价 |
| `basic.customers` | 顾客资料 | 客户档案 |
| `basic.staff` | 店员资料 | 员工档案 |
| `basic.fees` | 收费管理 | 服务定价 |
| `basic.fees.categories` | 收费类别 | 服务类别 |
| `basic.fees.items` | 收费项目 | 服务项目 |
| `sales` | 销售管理 | 门店交易 |
| `sales.pos` | 销售开单 | 收银工作台 |
| `sales.orders` | 销售单 | 交易单据 |
| `sales.processing_list` | 加工单列表 | 配镜交付 |
| `sales.pre_orders` | 订货单 | 顾客预订 |
| `sales.custom_lens_followup` | 定制镜片跟进表 | 定制片进度 |
| `sales.followup` | 销售跟进表 | 成交线索 |
| `sales.approvals` | 审批记录列表 | 特批记录 |
| `sales.settings` | 销售设置 | 交易规则 |
| `sales.settings.platform_verify` | 平台核销 | 平台券核验 |
| `sales.settings.customer_source` | 顾客来源 | 获客渠道 |
| `sales.settings.discount_rules` | 折扣权限设置 | 优惠授权 |
| `sales.settings.commission` | 店员提成 | 绩效提成 |
| `sales.campaigns` | 活动设置 | 促销方案 |
| `sales.campaigns.bundles` | 商品套餐 | 组合商品 |
| `sales.campaigns.times_cards` | 次卡管理 | 服务权益卡 |
| `sales.campaigns.events` | 活动管理 | 营销日历 |
| `sales.campaigns.coupons` | 优惠券设置 | 券规则 |
| `sales.targets` | 销售任务管理 | 业绩目标 |
| `sales.targets.setup` | 任务设定 | 目标计划 |
| `sales.targets.breakdown` | 任务分解 | 目标分配 |
| `sales.targets.achievement` | 任务达成率 | 目标进度 |
| `purchase.scan_inbound` | 扫码入库 | 条码验收 |
| `purchase.returns` | 采购退货 | 退供处理 |
| `purchase.bills` | 采购单 | 入库凭证 |
| `purchase.in_transit` | 在途商品 | 到货跟踪 |
| `purchase.approvals` | 采购审批 | 订货审核 |
| `purchase.replenishment` | 补货清单 | 智能补货 |
| `transfer` | 调拨 | 店间协同 |
| `transfer.outbound` | 调拨出库 | 发货任务 |
| `transfer.inbound` | 调拨入库 | 收货确认 |
| `transfer.requests` | 调拨申请 | 调货需求 |
| `transfer.pricing_policy` | 调货价格策略 | 内部结算规则 |
| `transfer.store_orders` | 门店订货单 | 总部订货 |
| `transfer.processing_exchange` | 加工调拨出库换货单 | 加工件换仓 |
| `inventory` | 库存管理 | 库存运营 |
| `inventory.query` | 库存查询 | 库存总览 |
| `inventory.reports` | 库存报表 | 库存健康度 |
| `inventory.loss_overflow` | 报损报溢单 | 库存调整 |
| `inventory.stocktake` | 盘点单 | 盘点任务 |
| `inventory.reprint_labels` | 补标记录 | 标签补打 |
| `inventory.crosstab` | 库存交叉表 | 镜片规格矩阵 |
| `after_sales` | 售后维修 | 服务保障 |
| `after_sales.tickets` | 退货维修单 | 售后工单 |
| `after_sales.repair_stock` | 退货维修库存查询 | 返修件台账 |
| `reports` | 统计报表 | 经营分析 |
| `reports.performance` | 销售业绩看板 | 门店业绩 |
| `reports.summary` | 统计报表汇总 | 经营报表 |
| `finance` | 账款管理 | 资金往来 |
| `finance.reconciliation` | 往来对账 | 供应链对账 |
| `finance.payment_requests` | 付款申请单 | 付款申请 |
| `finance.payment_writeoffs` | 付款核销单 | 付款核销 |
| `finance.ap_ledger` | 应付台账 | 应付明细 |
| `finance.receipt_writeoffs` | 收款核销单 | 收款核销 |
| `finance.ar_ledger` | 应收台账 | 应收明细 |
| `finance.expense_categories` | 费用分类 | 费用科目 |
| `finance.expense_records` | 费用登记 | 门店支出 |
| `finance.expense_applications` | 费用登记申请 | 支出审批 |
| `finance.purchase_audit` | 采购单财务审核 | 采购财务复核 |
| `contact_lenses` | 隐形眼镜管理 | 接触镜运营 |
| `contact_lenses.orders` | 隐形眼镜订货单 | 接触镜采购 |
| `contact_lenses.receipts` | 隐形眼镜收货单 | 到货登记 |
| `contact_lenses.inspection_inbound` | 隐形眼镜验收入库 | 质量验收入库 |
| `contact_lenses.purchase_returns` | 隐形眼镜采购退货 | 供应商退货 |
| `contact_lenses.stocktake` | 隐形眼镜盘点 | 批次盘点 |
| `contact_lenses.loss_overflow` | 隐形眼镜报损报溢单 | 不合格品处置 |
| `contact_lenses.presales` | 隐形眼镜预售单 | 接触镜预订 |
| `contact_lenses.temp_humidity` | 仓库温湿度记录 | 储存环境监测 |
| `contact_lenses.equipment_maintenance` | 设备养护记录 | 设备校验 |
| `contact_lenses.product_maintenance` | 商品养护记录 | 在库养护 |
| `contact_lenses.first_enterprise` | 首营企业 | 供方资质 |
| `contact_lenses.first_product` | 首营商品 | 品种准入 |
| `contact_lenses.near_expiry` | 近效期产品 | 效期预警 |
| `contact_lenses.training_logs` | 医疗器械培训登记 | 合规培训 |
| `contact_lenses.complaint_logs` | 医疗器械治疗投诉登记 | 质量投诉 |
| `contact_lenses.udi_logs` | UDI上报记录 | 器械追溯 |
| `members` | 会员管理 | 客户经营 |
| `members.profile` | 会员资料 | 客户中心 |
| `members.profile.basic` | 基本资料 | 客户总览 |
| `members.profile.create` | 会员新增 | 新建客户档案 |
| `members.followup` | 售后回访 | 客户关怀 |
| `members.followup.notifications` | 推送通知 | 触达提醒 |
| `members.followup.notifications.review_reminder` | 视力复查通知 | 复查邀约 |
| `members.followup.notifications.pickup_reminder` | 取镜通知 | 取镜提醒 |
| `members.followup.notifications.contact_lens_expiry` | 隐形眼镜过期提醒 | 接触镜效期提醒 |
| `members.followup.plans` | 设置回访方案 | 关怀计划 |
| `members.followup.execution_records` | 回访执行记录 | 服务记录 |
| `members.followup.completion_analysis` | 回访完成分析 | 关怀成效 |
| `members.points` | 积分管理 | 权益积分 |
| `members.points.adjust` | 积分调整 | 积分变更 |
| `members.points.stats` | 积分消费查询/统计 | 积分流水 |
| `members.points.redemption` | 积分兑换明细 | 权益兑换 |
| `members.recharge` | 充值管理 | 储值账户 |
| `members.recharge.operate` | 充值/退款 | 储值操作 |
| `members.recharge.query` | 充值查询 | 储值记录 |
| `members.recharge.ledger` | 会员流水 | 账户流水 |
| `members.recharge.report` | 充值消费报表 | 储值分析 |
| `members.appointments` | 会员预约 | 到店预约 |
| `members.appointments.register` | 预约登记 | 预约日历 |
| `members.appointments.completion` | 预约完成查询 | 履约记录 |
| `members.marketing` | 会员营销 | 客户增长 |
| `members.marketing.push` | 消息推送 | 消息触达 |
| `members.marketing.push.config` | 推送基础配置 | 触达规则 |
| `members.marketing.push.templates` | 模板管理 | 消息模板 |
| `members.marketing.push.manual` | 手动推送 | 定向发送 |
| `members.marketing.push.history` | 历史推送列表 | 发送记录 |
| `members.marketing.sms` | 短信业务 | 短信账户 |
| `members.marketing.sms.recharge` | 充值流水 | 额度充值 |
| `members.marketing.sms.logs` | 短信流水管理列表 | 短信记录 |
| `members.marketing.roi` | 活动效果评估 | 活动复盘 |
| `members.marketing.coupons` | 优惠券营销 | 券活动 |
| `members.marketing.coupons.stats` | 优惠券使用统计 | 用券效果 |
| `members.marketing.referral` | 会员推荐 | 老客推荐 |
| `members.marketing.referral.settings` | 推荐设置 | 推荐奖励 |
| `members.marketing.referral.stats` | 会员推荐统计 | 裂变表现 |
| `members.settings` | 会员设置 | 客户规则 |
| `members.settings.tiers` | 会员等级设置 | 成长等级 |
| `members.settings.points` | 积分设置 | 积分规则 |
| `members.settings.recharge` | 充值设置 | 储值规则 |
| `members.settings.appointments` | 预约设置 | 预约规则 |
| `members.bind_guide` | 顾客绑定导购员 | 专属顾问 |
| `members.reception_logs` | 顾客接待记录 | 到店接待 |
| `members.persona` | 顾客用户画像 | 客群画像 |
| `members.analytics` | 数据分析 | 客户洞察 |
| `members.analytics.basic` | 基础数据分析 | 增长概览 |
| `members.analytics.consumption` | 会员消费分析 | 消费结构 |
| `members.analytics.rfm` | 价值分析（RFM） | 客户分层 |
| `members.analytics.category` | 品类分析 | 偏好品类 |
| `members.analytics.repurchase` | 复购分析 | 复购趋势 |
| `members.optometry` | 验光管理 | 验配服务 |
| `members.optometry.pediatric` | 儿童验光档案 | 青少年视力档案 |
| `members.optometry.report` | 验光单报表 | 验配记录分析 |
| `processing` | 加工中心 | 交付加工 |
| `processing.orders` | 加工单 | 配镜生产单 |
| `processing.waybills` | 运单登记 | 物流交接 |
| `processing.clients` | 客户资料 | 委托方档案 |
| `processing.sales_pos` | 加工销售开单 | 加工收费 |
| `processing.sales_orders` | 加工销售单 | 加工结算单 |
| `processing.client_notices` | 客户加工通知单 | 完工通知 |
| `processing.client_returns` | 客户退货单 | 委托退件 |
| `processing.warehouse_picking` | 仓库配货加工单 | 物料领用 |
| `vision_records` | 视光档案管理 | 视力健康档案 |
| `vision_records.customer_files` | 顾客档案 | 受检者档案 |
| `vision_records.optometry_files` | 视光档案 | 屈光检查记录 |
| `vision_records.reviews` | 视力复查 | 复诊随访 |
| `vision_records.training` | 视力训练 | 视功能训练 |
| `vision_records.registration` | 挂号管理 | 预约登记 |
| `vision_screening` | 视力筛查 | 校园视力项目 |
| `vision_screening.schools` | 学校管理 | 学校档案 |
| `vision_screening.summary` | 统计汇总 | 筛查概览 |
| `vision_screening.details` | 明细查询 | 筛查明细 |
| `vision_screening.thresholds` | 筛查度数设置 | 异常判定规则 |
| `orthokeratology` | 角膜塑形管理 | 塑形镜随访 |
| `orthokeratology.full_exam` | 塑形镜全项检查 | 配戴评估 |
| `orthokeratology.training` | 客户训练档案 | 摘戴训练 |
| `orthokeratology.extended_info` | 顾客拓展信息 | 配戴者信息 |
| `orthokeratology.case_files` | 病例档案 | 临床随访记录 |
| `brands` | 品牌专区 | 品牌采购门户 |
| `brands.showcase` | 品牌之窗 | 品牌展厅 |
| `brands.favorites` | 查看收藏 | 我的选品 |
| `brands.cart` | 购物车 | 采购篮 |
| `brands.new_arrivals` | 新品浏览 | 上新速览 |
| `brands.order_place` | 订货下单 | 提交订货 |
| `brands.order_list` | 订单列表 | 订货进度 |
| `brands.sales_orders` | 销售订单 | 销售回传 |
| `brands.ccs_returns` | CCS退货 | 渠道退货 |
| `brands.ccs_stocktake` | CCS盘点 | 渠道盘点 |
| `brands.ccs_statements` | CCS对账单 | 渠道结算 |
| `brands.online_order_apply` | 线上下单申请 | 线上采购申请 |
| `marketing` | 营销推广 | 品牌传播 |
| `marketing.assets` | 我的素材 | 创意素材库 |
| `system.notices_send` | 发送站内信 | 内部公告 |
| `system.product_maintenance` | 商品维护管理 | 商品数据治理 |
| `system.banks` | 银行资料 | 结算账户档案 |
| `system.onboarding` | 新手指引 | 岗位上手指南 |
| `system.init_setup` | 初始化设置 | 开店初始化 |
| `system.period_close` | 期末处理 | 账期结转 |
| `help` | 帮助中心 | 使用支持 |
| `help.docs` | 操作文档 | 操作指引 |

## 合并的入口

| 原菜单 ID | 原名称 | 并入页面 |
| --- | --- | --- |
| `sales.targets.tracking` | 任务追踪 | `sales.targets.achievement`（目标进度） |
| `purchase.temp_returns` | 临时退货登记 | `purchase.returns`（退供处理） |
| `transfer.replenishment_requests` | 补货申请 | `transfer.requests`（调货需求） |
| `finance.statements` | 对账单 | `finance.reconciliation`（供应链对账） |
| `contact_lenses.inspection_records` | 隐形眼镜验收记录 | `contact_lenses.inspection_inbound`（质量验收入库） |
| `members.profile.import` | 会员导入 | `members.profile.basic`（客户总览） |
| `members.profile.import_confirm` | 会员导入金额确认 | `members.profile.basic`（客户总览） |
| `members.followup.tasks_add` | 添加回访任务 | `members.followup.plans`（关怀计划） |
| `members.followup.task_reminders` | 回访任务提醒 | `members.followup.plans`（关怀计划） |
| `members.recharge.details` | 会员充值明细 | `members.recharge.query`（储值记录） |
| `processing.order_details` | 加工单明细 | `processing.orders`（配镜生产单） |
| `vision_screening.charts` | 分析图表 | `vision_screening.summary`（筛查概览） |
| `system.notices_history` | 站内信发布记录 | `system.notices_send`（内部公告） |

## 设计约束

- 合并只改变导航入口，不代表已实现对应功能。开发目标页时需把原入口的操作、记录或筛选能力放进页内，并通过对应服务端权限校验。
- 取消“优惠券放大游戏”这一单独玩法；旧书签导向“券活动”，不承诺继续提供原玩法。
- 已完成菜单的名称及路径未改。旧书签和历史导航链接通过路由映射到合并后的页面；收藏和权限判断继续使用原有稳定 ID 与权限码。
- GSS 功能可作为需求线索，产品应建立自己的信息架构、交互、文案及视觉语言；菜单改名本身不能替代独立设计与法律评估。
