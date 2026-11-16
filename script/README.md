# 快捷发布

在服务器项目目录执行：

```bash
cd /root/ZhaoJiangLin/QianShiLin
# 构建并更新线上服务，默认版本 v1.0.0
bash script/release.sh deploy
# 指定版本构建并更新
bash script/release.sh deploy v1.0.1
# 将最近成功部署的镜像推送到仓库
bash script/release.sh push
```

脚本可以从任意工作目录调用，会自动定位项目目录。镜像标签按北京时间生成，精确到秒。
部署会先检查配置，再构建和启动容器，等待健康检查通过后保存 `.env.deploy`。构建失败不会更新容器；启动失败时脚本返回错误，保留上一次部署记录，此时应检查容器日志并按需回滚。部署会短暂重建应用容器，无需修改 Caddy。

推送使用 `.env.deploy` 中记录的镜像，不重新构建。首次推送前执行 `docker login registry.nat.gmaigc.cn -u GeekPwnStyle`，交互输入密码；脚本不保存密码。

页面地址：https://zhiarch.org/qian/

查看状态：`docker compose --env-file .env.deploy ps`
查看日志：`docker compose --env-file .env.deploy logs --tail=100 qianshilin`
