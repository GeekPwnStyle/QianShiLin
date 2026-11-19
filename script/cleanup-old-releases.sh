#!/usr/bin/env bash
set -Eeuo pipefail
[[ $# -eq 2 ]] || { echo 'Expected current frontend and API image references.' >&2; exit 2; }
CURRENT_WEB="$1"
CURRENT_API="$2"
REPO='registry.nat.gmaigc.cn/zhiarch/images/qianshilin'
# Compose already replaces previous active containers. Remove only exited leftovers
# with this deployment's project label and the frontend/API service labels.
PROJECT="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' qianshilin)"
[[ -n "$PROJECT" && "$PROJECT" != '<no value>' ]] || { echo 'Cannot determine Compose project; skipping cleanup.' >&2; exit 1; }
for SERVICE in qianshilin api; do
  while IFS= read -r ID; do
    [[ -n "$ID" ]] || continue
    docker rm "$ID"
  done < <(docker ps -aq --filter "label=com.docker.compose.project=$PROJECT" --filter "label=com.docker.compose.service=$SERVICE" --filter status=exited)
done
while IFS= read -r IMAGE; do
  case "$IMAGE" in
    "$REPO"-v[0-9]*:*|"$REPO"-api-v[0-9]*:*|qianshilin-web:*|qianshilin-api:*) ;;
    *) continue ;;
  esac
  [[ "$IMAGE" != "$CURRENT_WEB" && "$IMAGE" != "$CURRENT_API" ]] || continue
  # A previous tag may share the current image's content. Remove that old tag,
  # but retain tags explicitly referenced by any container (including stopped).
  KEEP=false
  while IFS= read -r CONTAINER; do
    [[ -n "$CONTAINER" ]] || continue
    REFERENCE="$(docker inspect --format '{{.Config.Image}}' "$CONTAINER")"
    if [[ "$REFERENCE" == "$IMAGE" || "$REFERENCE" == sha256:* || "$REFERENCE" =~ ^[a-f0-9]{12,64}$ ]]; then KEEP=true; break; fi
  done < <(docker ps -aq --filter "ancestor=$IMAGE")
  if [[ "$KEEP" == true ]]; then
    printf 'Retained referenced image: %s\n' "$IMAGE"
    continue
  fi
  docker image rm "$IMAGE"
done < <(docker image ls --format '{{.Repository}}:{{.Tag}}' | sort -u)
