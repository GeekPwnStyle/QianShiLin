#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_FILE="$PROJECT_DIR/.env.deploy"
REPOSITORY='registry.nat.gmaigc.cn/zhiarch/images/qianshilin'
usage() {
  cat <<'HELP'
Usage:
  bash script/release.sh deploy [VERSION]  Build and deploy (default: v1.0.0).
  bash script/release.sh push              Push the last successful deployment.
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
command -v docker >/dev/null || { echo 'Docker is required.' >&2; exit 1; }
# Prevent concurrent releases; the lock file stays outside the build context.
exec 9>"${TMPDIR:-/tmp}/qianshilin-release-$(id -u).lock"
flock -n 9 || { echo 'Another release is running.' >&2; exit 1; }
if [[ "$ACTION" == push ]]; then
  [[ -f "$STATE_FILE" ]] || { echo 'No deployment recorded in .env.deploy.' >&2; exit 1; }
  IMAGE="$(sed -n 's/^QIANSHILIN_IMAGE=//p' "$STATE_FILE")"
  [[ "$IMAGE" == "$REPOSITORY"-*:* && "$IMAGE" != *$'\n'* && "$IMAGE" != *' '* ]] || { echo 'Invalid deployment image.' >&2; exit 1; }
  docker push "$IMAGE"
  printf 'Pushed: %s\n' "$IMAGE"
  exit 0
fi
VERSION="${2:-v1.0.0}"
[[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo 'Version must look like v1.0.0.' >&2; exit 2; }
IMAGE="$REPOSITORY-$VERSION:$(TZ=Asia/Shanghai date +Y%Y-D%m%d-T%H%M%S)"
export QIANSHILIN_IMAGE="$IMAGE"
docker compose version >/dev/null
docker info >/dev/null
docker network inspect proxy >/dev/null
docker compose -f "$PROJECT_DIR/compose.yaml" config --quiet
printf 'Building: %s\n' "$IMAGE"
docker build -t "$IMAGE" "$PROJECT_DIR"
# --wait fails if the application does not become healthy.
docker compose -f "$PROJECT_DIR/compose.yaml" up -d --wait --wait-timeout 120 qianshilin
TEMP_STATE="$(mktemp "$PROJECT_DIR/.env.deploy.XXXXXX")"
trap 'rm -f -- "$TEMP_STATE"' EXIT
printf 'QIANSHILIN_IMAGE=%s\n' "$IMAGE" > "$TEMP_STATE"
mv -f -- "$TEMP_STATE" "$STATE_FILE"
trap - EXIT
printf 'Deployed: %s\nURL: https://zhiarch.org/qian/\nTo push: bash script/release.sh push\n' "$IMAGE"
