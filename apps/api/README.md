# QianShiLin API

当前运行 Node.js + PostgreSQL。`server.js` 处理身份与会话，`catalog.js` 处理品牌、供应商、仓库资料。数据库迁移见 `db/README.md`。

目录 API：`GET /catalog/:resource`、`GET /catalog/:resource/:id`、`POST /catalog/:resource`、`PATCH /catalog/:resource/:id`、`DELETE /catalog/:resource/:id`，其中 `resource` 只允许 `brands`、`suppliers`、`warehouses`。列表支持 `page`、`pageSize`、`search`。参数字段采用固定白名单，SQL 值参数化。管理员可维护，门店只读；供应商须绑定自身目录记录才能读取，未绑定时拒绝。门店读取供应商记录时不返回银行字段。

目前业务 API 只覆盖上述三种目录。其他业务页面仍使用前端演示数据，不能视为已接入真实数据库。未来按业务模块拆分服务并补全门店范围、审计、乐观并发控制与真实角色权限。

当前目录表使用 PostgreSQL 索引与分页，尚无需要 Redis 缓存的慢查询证据。先保持数据库为唯一事实来源；出现明确的高频重复查询或异步队列需求后，再针对具体查询和失效规则接入 Redis。
