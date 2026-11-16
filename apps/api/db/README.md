# 登录数据库

PostgreSQL 17 在 Compose 内以 `qianshilin-db` 运行，数据持久化在 `qianshilin_pgdata`，不向主机开放端口。连接密码保存在 Git 忽略的 `.env.deploy`。`001_identity.sql` 建立用户、密码哈希、别名和会话表。`seed_demo.sql` 将现有五个演示账号写入数据库，初始密码与各自用户名相同，数据库保存 bcrypt 哈希。

新建空数据卷时 Compose 会按顺序自动执行两个 SQL 文件。已存在的数据卷不会重复执行。手动初始化：

```bash
docker compose --env-file .env.deploy up -d --wait database
docker exec -i qianshilin-db psql -U qianshilin -d qianshilin -v ON_ERROR_STOP=1 < apps/api/db/migrations/001_identity.sql
docker exec -i qianshilin-db psql -U qianshilin -d qianshilin -v ON_ERROR_STOP=1 < apps/api/db/seed_demo.sql
```

Web 使用 `/qian/api/login`、`/qian/api/session`、`/qian/api/logout`。API 在数据库验证密码，生成随机会话令牌，数据库只保存令牌哈希；浏览器持有 HttpOnly、Secure Cookie。用户 UUID 可作为后续表的外键。当前角色和业务数据仍为前端演示模型，尚未迁至数据库。

这些初始密码是公开演示凭据，不适合正式业务使用。接入真实人员前必须更换密码、取消页面中的演示账号提示，并加入权限服务端校验、登录限速和密码重置流程。
