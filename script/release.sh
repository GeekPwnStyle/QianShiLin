#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_FILE="$PROJECT_DIR/.env.deploy"
REPOSITORY='registry.nat.gmaigc.cn/zhiarch/images/qianshilin'
usage() {
  cat <<'HELP'
Usage:
  bash script/release.sh deploy [VERSION]  Build and deploy (default: v1.0.0).
  bash script/release.sh push              Push both images from the last successful deployment.
  bash script/release.sh --help

Examples:
  bash script/release.sh deploy
  bash script/release.sh deploy v1.0.1
  bash script/release.sh push

Tags use Asia/Shanghai time. Push requires prior docker login.
HELP
}
ACTION="${1:---help}"
case "$ACTION" in
  -h|--help) usage; exit 0 ;;
  deploy) [[ $# -le 2 ]] || { usage >&2; exit 2; } ;;
  push) [[ $# -eq 1 ]] || { usage >&2; exit 2; } ;;
  *) usage >&2; exit 2 ;;
esac
cd "$PROJECT_DIR"
[[ -f "$STATE_FILE" ]] || { echo 'Missing .env.deploy.' >&2; exit 1; }
DB_PASSWORD="$(sed -n 's/^QIANSHILIN_DB_PASSWORD=//p' "$STATE_FILE")"
[[ -n "$DB_PASSWORD" ]] || { echo 'Missing QIANSHILIN_DB_PASSWORD in .env.deploy.' >&2; exit 1; }
export QIANSHILIN_DB_PASSWORD="$DB_PASSWORD"
command -v docker >/dev/null || { echo 'Docker is required.' >&2; exit 1; }
# Prevent concurrent releases; the lock file stays outside the build context.
exec 9>"${TMPDIR:-/tmp}/qianshilin-release-$(id -u).lock"
flock -n 9 || { echo 'Another release is running.' >&2; exit 1; }
if [[ "$ACTION" == push ]]; then
  [[ -f "$STATE_FILE" ]] || { echo 'No deployment recorded in .env.deploy.' >&2; exit 1; }
  IMAGE="$(sed -n 's/^QIANSHILIN_IMAGE=//p' "$STATE_FILE")"
  [[ "$IMAGE" == "$REPOSITORY"-*:* && "$IMAGE" != *$'\n'* && "$IMAGE" != *' '* ]] || { echo 'Invalid deployment image.' >&2; exit 1; }
  API_IMAGE="$(sed -n 's/^QIANSHILIN_API_IMAGE=//p' "$STATE_FILE")"
  [[ "$API_IMAGE" == "$REPOSITORY-api"-*:* && "$API_IMAGE" != *$'\n'* && "$API_IMAGE" != *' '* ]] || { echo 'Missing or invalid API image; run deploy first.' >&2; exit 1; }
  [[ "${IMAGE##*:}" == "${API_IMAGE##*:}" ]] || { echo 'Frontend/API tag mismatch.' >&2; exit 1; }
  docker push "$IMAGE"
  docker push "$API_IMAGE"
  printf 'Pushed frontend: %s\nPushed API: %s\n' "$IMAGE" "$API_IMAGE"
  exit 0
fi
VERSION="${2:-v1.0.0}"
[[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo 'Version must look like v1.0.0.' >&2; exit 2; }
IMAGE="$REPOSITORY-$VERSION:$(TZ=Asia/Shanghai date +Y%Y-D%m%d-T%H%M%S)"
API_IMAGE="$REPOSITORY-api-$VERSION:${IMAGE##*:}"
export QIANSHILIN_IMAGE="$IMAGE"
export QIANSHILIN_API_IMAGE="$API_IMAGE"
docker compose version >/dev/null
docker info >/dev/null
docker network inspect proxy >/dev/null
docker compose -f "$PROJECT_DIR/compose.yaml" config --quiet
printf 'Building: %s\n' "$IMAGE"
docker build -t "$IMAGE" "$PROJECT_DIR"
printf 'Building API: %s\n' "$API_IMAGE"
docker build -t "$API_IMAGE" "$PROJECT_DIR/apps/api"
# --wait fails if the application does not become healthy.
docker compose -f "$PROJECT_DIR/compose.yaml" up -d --no-build --wait --wait-timeout 120
TEMP_STATE="$(mktemp "$PROJECT_DIR/.env.deploy.XXXXXX")"
trap 'rm -f -- "$TEMP_STATE"' EXIT
printf 'QIANSHILIN_IMAGE=%s\nQIANSHILIN_API_IMAGE=%s\nQIANSHILIN_DB_PASSWORD=%s\n' "$IMAGE" "$API_IMAGE" "$DB_PASSWORD" > "$TEMP_STATE"
chmod 600 "$TEMP_STATE"
mv -f -- "$TEMP_STATE" "$STATE_FILE"
trap - EXIT
printf 'Deployed frontend: %s\nDeployed API: %s\nURL: https://zhiarch.org/qian/\nTo push: bash script/release.sh push\n' "$IMAGE" "$API_IMAGE"
