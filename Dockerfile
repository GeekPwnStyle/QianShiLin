FROM docker.1panel.live/library/node:24-slim AS build
WORKDIR /app
RUN npm install -g bun@1.4.4
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG APP_BASE_PATH=/qian/
ENV APP_BASE_PATH=${APP_BASE_PATH}
RUN bun run lint && bun run build
FROM docker.m.daocloud.io/library/caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
