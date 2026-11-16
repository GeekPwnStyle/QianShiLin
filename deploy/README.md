# QianShiLin deployment
Frontend prototype: React, Vite, browser localStorage/mock data; no backend service.

Build: docker build -t IMAGE .
Push: docker push IMAGE
Run: QIANSHILIN_IMAGE=IMAGE docker compose up -d
Current deployment: docker compose --env-file .env.deploy up -d
Public URL: https://zhiarch.org/qian/
Vite APP_BASE_PATH defaults to /qian/ in Docker builds. Navigation preserves this prefix.
Caddy proxy network: proxy. Import deploy/qianshilin.routes inside the existing domain block.
Validate before reload: docker exec caddy caddy validate --config /etc/caddy/Caddyfile
Health endpoint: /qian/healthz
Proxy backup: /opt/caddy-deploy/proxy/sites/zhiarch.caddy.bak-qian-20261116
