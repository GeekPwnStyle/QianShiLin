# 登录数据库

PostgreSQL 17 在 Compose 内以 `qianshilin-db` 运行，数据持久化在 `qianshilin_pgdata`，不向主机开放端口。连接密码保存在 Git 忽略的 `.env.deploy`。`001_identity.sql` 建立用户、密码哈希、别名和会话表。`seed_demo.sql` 将现有五个演示账号写入数据库，初始密码与各自用户名相同，数据库保存 bcrypt 哈希。

`002_reference_catalog.sql` 建立品牌、供应商、仓库及供应商品牌关系；`003_catalog_access.sql` 建立目录数据访问映射。新建空数据卷时 Compose 按顺序执行身份、演示账号、目录、目录访问和采购订货五个脚本。已存在的数据卷不会重复执行。对现有数据卷按编号单独执行尚未执行的迁移，不要重复运行会创建账号的种子脚本。

`004_purchase_orders.sql` 建立采购订货草稿、明细和用户可访问门店范围。新建空数据卷时它作为第五个初始化脚本执行；现有数据卷需单独执行一次。

初次手动初始化：

```bash
docker compose --env-file .env.deploy up -d --wait database
docker exec -i qianshilin-db psql -U qianshilin -d qianshilin -v ON_ERROR_STOP=1 < apps/api/db/migrations/001_identity.sql
docker exec -i qianshilin-db psql -U qianshilin -d qianshilin -v ON_ERROR_STOP=1 < apps/api/db/seed_demo.sql
docker exec -i qianshilin-db psql -U qianshilin -d qianshilin -v ON_ERROR_STOP=1 < apps/api/db/migrations/002_reference_catalog.sql
docker exec -i qianshilin-db psql -U qianshilin -d qianshilin -v ON_ERROR_STOP=1 < apps/api/db/migrations/003_catalog_access.sql
docker exec -i qianshilin-db psql -U qianshilin -d qianshilin -v ON_ERROR_STOP=1 < apps/api/db/migrations/004_purchase_orders.sql
```

`011_user_profile_theme.sql` 建立 `identity.user_profiles`（保存用户岗位头衔、文字头像、自定义头像图片、头像配色与个人系统主题色 `theme_key`），回填 `identity.users.email` 并为所有现有账号补齐默认配置；`012_pure_white_theme.sql` 为已有数据卷幂等追加 `pure_white` 主题枚举约束；API 启动时也会自动幂等检查与升级该表约束，现有数据卷可直接执行对应迁移文件升级。

Web 使用 `/qian/api/login`、`/qian/api/session`、`/qian/api/logout`、`/qian/api/account/profile` 及 `/qian/api/catalog/*`。API 在数据库验证密码，生成随机会话令牌，数据库只保存令牌哈希；浏览器持有 HttpOnly、Secure Cookie。所有已登录用户均可通过 `/qian/api/account/profile` 修改并持久化个人主题色与头像配置。

这些初始密码是公开演示凭据，不适合正式业务使用。接入真实人员前必须更换密码、取消页面中的演示账号提示，并加入权限服务端校验、登录限速和密码重置流程。
