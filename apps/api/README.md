# 千视林零售管理系统 Qianshilink — 后端架构预留契约 (NestJS + PostgreSQL + Redis)

> 当前阶段为前端原型验证期，本目录仅用于定义未来服务端架构分层与接口契约，不运行真实后端服务。

## 目录规划

```text
apps/api/src/
  modules/
    identity/         # 认证、JWT、会话、三端身份上下文
    organization/     # 租户、大区、门店与仓库主数据
    catalog/          # 商品、品类、品牌、镜片附加费与Excel异步导入
    sales/            # 销售开单、加工关联单、审批流、活动与任务
    purchase/         # 采购订货、入库验收、退货与补货建议
    transfer/         # 跨店调拨出入库、内部调货价格策略
    inventory/        # 库存账本（PostgreSQL事务约束，禁止Redis充当唯一事实来源）
    after-sales/      # 退货维修工单与维修备件库
    reports/          # 业绩看板、聚合统计
    finance/          # 往来对账、应付/应收台账、核销与费用
    contact-lenses/   # 三类医疗器械合规、GSP温湿度、首营与UDI上报
    members/          # 会员档案、积分、储值流水、回访与RFM
    processing/       # 中央加工中心工单、运单与仓库拣货
    vision/           # 视光档案（OD/OS屈光参数与眼轴历史）
    screening/        # 校园视力筛查学校档案与汇总
    orthokeratology/  # 角膜塑形镜全项检查与病例档案
    brands/           # 品牌专区与CCS协同对账
    marketing/        # 营销素材与活动配置
    system/           # RBAC角色权限、审计日志、参数设置与期末处理
    notifications/    # 异步消息队列调度（短信/企微/服务通知）与回执追踪
```

## 模块内部分层约定

每个业务模块内部严格遵循四层结构：
- `presentation/` — NestJS Controller、DTO 参数校验、统一响应包装与 OpenAPI 注解
- `application/` — 用例编排、RBAC 权限守卫、DataScope 数据范围注入与事务边界
- `domain/` — 纯业务领域实体、状态机与数值计算（金额使用整型分或十进制字符串）
- `infrastructure/` — PostgreSQL (TypeORM/Prisma) 仓储实现、Redis 缓存与异步任务适配器

## 安全与并发基线

1. 所有身份、动作权限（如 `basic.product.cost.read`）及门店/供应商数据范围由服务端从认证令牌解析并强制注入查询条件，禁止信任客户端直接传入的 `tenantId` / `storeId` / `supplierId`。
2. 库存扣减、会员储值余额变动与财务核销必须使用 PostgreSQL 数据库事务 + 乐观锁或行锁，并保留不可篡改业务流水。
3. Redis 仅用于短期缓存、幂等键防重及通知异步任务队列，不作为余额、库存或账目的唯一事实来源。
