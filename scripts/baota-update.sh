#!/usr/bin/env bash

set -Eeuo pipefail
IFS=$'\n\t'

log() {
  printf '\n==> %s\n' "$1"
}

fail() {
  printf '\n错误：%s\n' "$1" >&2
  exit 1
}

cleanup_running_copy() {
  local temporary_script="${WEREAD_UPDATE_TEMP_SCRIPT:-}"
  if [[
    "${WEREAD_UPDATE_RUNNING_COPY:-0}" == "1" &&
      -n "$temporary_script" &&
      "${BASH_SOURCE[0]}" == "$temporary_script" &&
      "$temporary_script" == /tmp/weread-baota-update.*
  ]]; then
    rm -f -- "$temporary_script"
  fi
}

report_error() {
  local exit_code=$?
  local line_number=$1
  local failed_command=$2

  printf '\n更新失败（第 %s 行）：%s\n' "$line_number" "$failed_command" >&2
  printf '宝塔中的 WeReadNotes 暂时不要重启，请先处理以上错误。\n' >&2
  exit "$exit_code"
}

trap cleanup_running_copy EXIT
trap 'report_error "$LINENO" "$BASH_COMMAND"' ERR

if [[ "${WEREAD_UPDATE_RUNNING_COPY:-0}" != "1" ]]; then
  script_directory="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
  project_directory="$(CDPATH= cd -- "$script_directory/.." && pwd)"
  running_copy="$(mktemp /tmp/weread-baota-update.XXXXXX)"
  cp -- "${BASH_SOURCE[0]}" "$running_copy"
  chmod 700 "$running_copy"

  WEREAD_UPDATE_RUNNING_COPY=1 \
    WEREAD_UPDATE_PROJECT_DIR="$project_directory" \
    WEREAD_UPDATE_TEMP_SCRIPT="$running_copy" \
    exec bash "$running_copy" "$@"
fi

readonly PROJECT_DIR="${WEREAD_UPDATE_PROJECT_DIR:?缺少项目目录}"
readonly UPDATE_REMOTE="${WEREAD_UPDATE_REMOTE:-origin}"
readonly UPDATE_BRANCH="${WEREAD_UPDATE_BRANCH:-main}"
readonly HEALTH_URL="${WEREAD_HEALTH_URL:-http://127.0.0.1:3100/}"

for required_command in git node npm; do
  command -v "$required_command" >/dev/null 2>&1 ||
    fail "找不到命令：$required_command"
done

[[ -d "$PROJECT_DIR/.git" ]] || fail "项目目录不是 Git 仓库：$PROJECT_DIR"
[[ -f "$PROJECT_DIR/package.json" ]] || fail "项目目录缺少 package.json：$PROJECT_DIR"

cd "$PROJECT_DIR"

log "检查 Node.js 与 npm"
node_version="$(node --version)"
npm_version="$(npm --version)"

if [[ ! "$node_version" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+) ]]; then
  fail "无法识别 Node.js 版本：$node_version"
fi

node_major="${BASH_REMATCH[1]}"
node_minor="${BASH_REMATCH[2]}"
if ! {
  ((node_major == 22 && node_minor >= 13)) ||
    ((node_major == 24));
}; then
  fail "当前为 ${node_version}；请使用 Node.js 22.13+ LTS 或 24 LTS。"
fi

printf 'Node.js: %s\nnpm: %s\n' "$node_version" "$npm_version"

log "检查 Git 工作区"
current_branch="$(git branch --show-current)"
[[ -n "$current_branch" ]] || fail "当前处于 detached HEAD，不能执行自动更新。"
[[ "$current_branch" == "$UPDATE_BRANCH" ]] ||
  fail "当前分支为 ${current_branch}，预期分支为 ${UPDATE_BRANCH}。"

working_tree_status="$(git status --porcelain --untracked-files=normal)"
if [[ -n "$working_tree_status" ]]; then
  printf '%s\n' "$working_tree_status" >&2
  fail "服务器工作区存在未提交修改，已停止更新。"
fi

old_commit="$(git rev-parse --short HEAD)"
printf '当前版本：%s (%s)\n' "$old_commit" "$current_branch"

log "拉取 $UPDATE_REMOTE/$UPDATE_BRANCH"
git pull --ff-only "$UPDATE_REMOTE" "$UPDATE_BRANCH"
new_commit="$(git rev-parse --short HEAD)"
printf '目标版本：%s\n' "$new_commit"

log "安装锁定依赖"
npm ci

log "构建生产版本"
npm run build

[[ -f "$PROJECT_DIR/dist/server/index.js" ]] ||
  fail "构建结束但未找到 dist/server/index.js。"
[[ -d "$PROJECT_DIR/dist/client" ]] ||
  fail "构建结束但未找到 dist/client。"

log "更新构建完成"
printf '版本：%s -> %s\n' "$old_commit" "$new_commit"
printf '下一步：进入宝塔面板的 Node 项目 WeReadNotes，点击“重启”。\n'
printf '重启后验证：curl -I %s\n' "$HEALTH_URL"
printf '预期结果：HTTP/1.1 200 OK\n'
