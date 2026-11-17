# 登录数据库

PostgreSQL 17 在 Compose 内以 `qianshilin-db` 运行，数据持久化在 `qianshilin_pgdata`，不向主机开放端口。连接密码保存在 Git 忽略的 `.env.deploy`。`001_identity.sql` 建立用户、密码哈希、别名和会话表。`seed_demo.sql` 将现有五个演示账号写入数据库，初始密码与各自用户名相同，数据库保存 bcrypt 哈希。

`002_reference_catalog.sql` 建立品牌、供应商、仓库及供应商品牌关系；`003_catalog_access.sql` 建立目录数据访问映射。新建空数据卷时 Compose 按顺序执行身份、演示账号、目录、目录访问四个脚本。已存在的数据卷不会重复执行。对现有数据卷按编号单独执行尚未执行的迁移，不要重复运行会创建账号的种子脚本。

初次手动初始化：

```bash
docker compose --env-file .env.deploy up -d --wait database
docker exec -i qianshilin-db psql -U qianshilin -d qianshilin -v ON_ERROR_STOP=1 < apps/api/db/migrations/001_identity.sql
docker exec -i qianshilin-db psql -U qianshilin -d qianshilin -v ON_ERROR_STOP=1 < apps/api/db/seed_demo.sql
docker exec -i qianshilin-db psql -U qianshilin -d qianshilin -v ON_ERROR_STOP=1 < apps/api/db/migrations/002_reference_catalog.sql
docker exec -i qianshilin-db psql -U qianshilin -d qianshilin -v ON_ERROR_STOP=1 < apps/api/db/migrations/003_catalog_access.sql
```

Web 使用 `/qian/api/login`、`/qian/api/session`、`/qian/api/logout` 及 `/qian/api/catalog/*`。API 在数据库验证密码，生成随机会话令牌，数据库只保存令牌哈希；浏览器持有 HttpOnly、Secure Cookie。用户 UUID 用于目录权限映射。其他业务角色和业务数据仍为前端演示模型，尚未迁至数据库。

这些初始密码是公开演示凭据，不适合正式业务使用。接入真实人员前必须更换密码、取消页面中的演示账号提示，并加入权限服务端校验、登录限速和密码重置流程。
