# 旧供应商资料接入设计

2026-11-21。输入为用户提供的五张“供货商账户列表”截图，不是供应商详细档案导出。

## 现状与缺口

React/Vite 前端 + Node/PostgreSQL API。供应商档案具备分页、搜索、证照、银行及门店授权字段，足以存储已提供的名称；但 `suppliers.user_id` 唯一绑定且服务启动自动开户，无法表达旧账号授权多个供应商，也会为只有名称的档案制造账号。旧角色“管理员”不能直接映射新平台管理员。

## 本次方案

1. 保留供应商完整名称，一名一条档案，不拆括号、不推测手机号、联系人、类别和归属门店。未知门店留空，不授予所有门店。
2. `catalog.legacy_supplier_accounts` 保存旧用户名、原角色、原状态及原始日期文本；`catalog.legacy_supplier_account_grants` 保存多对多授权，外键保证一致性。此为迁移来源记录，不参与实际鉴权，不创建密码。日后经验证再显式对接 identity 账号。
3. `catalog.suppliers.auto_provision_account` 默认维持已有开户行为；截图导入档案设为 false，启动同步及编辑均不能隐式开户。
4. 管理员可在供应商页打开“旧账号授权”，一行一个账号显示授权数量，点击展开并搜索授权供应商。现有档案列表默认只展示常用列，低频字段仍可从列设置显示。
5. 导入使用独立 Node 脚本，默认 dry-run，显式 --apply 才写库；单事务、咨询锁、防重与重复名称歧义检查。保留输入来源、校对说明；重跑不覆盖人工维护字段或扩大实际权限。

## 数据边界

截图跨屏有重叠，按完整名称去重；ZYY 与 msmx 分别录入其各自可见的授权，不能把两人授权简单设为相同。原始日期无时区，因此保留文本，不猜时区。空的更新时间和联系电话保持空值。账号的旧角色和旧状态仅用于展示。

本次不迁移密码，不激活旧账号。供应商日常资料管理仍使用现有 API；旧授权可查询但不能直接用于登录权限。正式账号多对多鉴权属于后续明确绑定流程，不能拿来源记录绕过现有权限。

## 执行与验证

本次已导入 88 个供应商、11 个旧账号、182 条授权。ZYY 为 86 家、msmx 为 87 家，另外 9 个账号各 1 家；6 个名称标记待复核。全量备份位于服务器 `/root/backups/qianshilin/before-supplier-import-20261121.dump`（不可提交 Git）。

先执行 `026_legacy_supplier_accounts.sql` 并部署新 API，再运行导入，防止旧 API 的自动开户逻辑处理真实档案。运行方式：

```bash
docker exec -i qianshilin-db psql -U qianshilin -d qianshilin -v ON_ERROR_STOP=1 < apps/api/db/migrations/026_legacy_supplier_accounts.sql
docker cp tools/supplier-import qianshilin-api:/tmp/qsl-supplier-import
# 默认单事务预演并回滚
docker exec -e NODE_PATH=/app/node_modules qianshilin-api node /tmp/qsl-supplier-import/import.mjs
# 正式写入
docker exec -e NODE_PATH=/app/node_modules qianshilin-api node /tmp/qsl-supplier-import/import.mjs --apply
# 实库读取回归；包含 schema 初始化，确认不自动开户
docker exec qianshilin-api node /tmp/qsl-supplier-import/verify-live.mjs
```

已验证：预演后供应商为 0；首次正式写入 88，重复执行新增 0；登录用户数量不变、供应商未绑定登录账号。实库接口回归覆盖账号数量、授权差异、按账号与供应商名称搜索、空结果、非法 ID、401/403、供应商分页及防止自动开户。`node --test apps/api/tests/supplier-import.test.mjs`、TypeScript 检查及 Node 24 Docker 构建通过。

管理员打开「基础资料 → 供应商 → 旧账号授权」可核对旧账号与授权明细。名称待复核意味着截图小字号转录仍应对照原系统导出校对；不要用商号猜测联系人或品牌分类。
