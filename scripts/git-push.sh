#!/usr/bin/env bash
# VeeSkin POS — Automated Git Commit & Push Script
# Usage:
#   ./scripts/git-push.sh                 # commit + push (auto message)
#   ./scripts/git-push.sh "my message"    # commit + push (custom message)
#   ./scripts/git-push.sh --status        # show git status only
#
# Reads GH_TOKEN from .env.github (gitignored). Never logs the token.

set -euo pipefail

PROJECT_DIR="/home/z/my-project"
cd "$PROJECT_DIR"

ENV_FILE="$PROJECT_DIR/.env.github"
LOG_FILE="$PROJECT_DIR/worklog.md"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log()    { echo -e "${GREEN}[git-push]${NC} $*"; }
warn()   { echo -e "${YELLOW}[git-push]${NC} $*"; }
error()  { echo -e "${RED}[git-push ERROR]${NC} $*" >&2; }

# --- 1. Load env (token) ---
if [ ! -f "$ENV_FILE" ]; then
  error "Missing $ENV_FILE. Create it with GH_TOKEN=... and GH_REPO=owner/name"
  exit 1
fi

# shellcheck disable=SC1090
set -a
. "$ENV_FILE"
set +a

if [ -z "${GH_TOKEN:-}" ] || [ -z "${GH_REPO:-}" ]; then
  error "GH_TOKEN or GH_REPO not set in $ENV_FILE"
  exit 1
fi

GH_BRANCH="${GH_BRANCH:-main}"

# --- 2. Status-only mode ---
if [ "${1:-}" = "--status" ]; then
  log "Current branch: $(git branch --show-current)"
  git status -sb
  exit 0
fi

# --- 3. Configure git identity if not set ---
if ! git config user.email >/dev/null 2>&1; then
  git config user.email "veeskin-pos-bot@users.noreply.github.com"
  log "Set git user.email"
fi
if ! git config user.name >/dev/null 2>&1; then
  git config user.name "VeeSkin POS Bot"
  log "Set git user.name"
fi

# --- 4. Ensure remote exists (URL never contains token) ---
REMOTE_NAME="origin"
REMOTE_URL="https://github.com/${GH_REPO}.git"
AUTH_REMOTE_URL="https://x-access-token:${GH_TOKEN}@github.com/${GH_REPO}.git"

if ! git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  git remote add "$REMOTE_NAME" "$REMOTE_URL"
  log "Added remote '$REMOTE_NAME' -> $REMOTE_URL"
else
  git remote set-url "$REMOTE_NAME" "$REMOTE_URL"
fi

# --- 5. Stage changes ---
git add -A
STAGED_COUNT=$(git diff --cached --numstat | wc -l | tr -d ' ')

if [ "$STAGED_COUNT" -eq 0 ]; then
  log "Nothing to commit. Working tree clean."
  if git ls-remote --exit-code --heads "$AUTH_REMOTE_URL" "$GH_BRANCH" >/dev/null 2>&1; then
    log "Pulling latest from origin/$GH_BRANCH..."
    git pull --rebase "$AUTH_REMOTE_URL" "$GH_BRANCH" 2>&1 | sed 's/'"$GH_TOKEN"'/***TOKEN***/g' || warn "Pull failed (may be first push)"
  fi
  exit 0
fi

# --- 6. Build commit message ---
CUSTOM_MSG="${1:-}"
TIMESTAMP=$(date -u "+%Y-%m-%d %H:%M:%S UTC")

if [ -n "$CUSTOM_MSG" ]; then
  COMMIT_MSG="$CUSTOM_MSG"
else
  CHANGED_FILES=$(git diff --cached --name-only | head -10)
  ADDED=$(echo "$CHANGED_FILES" | grep -c "^src/" || true)
  if [ "$STAGED_COUNT" -eq 1 ]; then
    SINGLE_FILE=$(git diff --cached --name-only)
    COMMIT_MSG="update ${SINGLE_FILE}"
  else
    COMMIT_MSG="auto-commit: ${STAGED_COUNT} files changed (${ADDED} in src/)"
  fi
fi

FULL_COMMIT_MSG="${COMMIT_MSG}

Committed: ${TIMESTAMP}
Source: VeeSkin POS development session"

# --- 7. Commit ---
log "Committing ${STAGED_COUNT} file(s)..."
git commit -m "$FULL_COMMIT_MSG" --quiet
log "Committed: ${COMMIT_MSG}"

# --- 8. Push using token-authenticated URL (token redacted in any output) ---
log "Pushing to ${GH_REPO} on branch ${GH_BRANCH}..."

PUSH_OUTPUT=$(git push "$AUTH_REMOTE_URL" "HEAD:${GH_BRANCH}" 2>&1 || true)
echo "$PUSH_OUTPUT" | sed 's/'"$GH_TOKEN"'/***TOKEN***/g'

if echo "$PUSH_OUTPUT" | grep -qiE "(error|fatal|rejected|denied)"; then
  error "Push failed. See output above."
  exit 1
fi

log "Push successful."

# --- 9. Append to worklog ---
LAST_COMMIT=$(git log -1 --format="%h")
{
  echo ""
  echo "---"
  echo "Task ID: git-push-$(date -u +%Y%m%d-%H%M%S)"
  echo "Agent: git-push.sh"
  echo "Task: Automated commit & push to GitHub"
  echo ""
  echo "Work Log:"
  echo "- Read GH_TOKEN from .env.github (gitignored, never echoed)"
  echo "- Staged ${STAGED_COUNT} file(s) with \`git add -A\`"
  echo "- Created commit: ${COMMIT_MSG}"
  echo "- Pushed ${LAST_COMMIT} to https://github.com/${GH_REPO}.git (${GH_BRANCH})"
  echo ""
  echo "Stage Summary:"
  echo "- Commit hash: ${LAST_COMMIT}"
  echo "- Files changed: ${STAGED_COUNT}"
  echo "- Timestamp: ${TIMESTAMP}"
  echo "- Repository: https://github.com/${GH_REPO}"
  echo "- Branch: ${GH_BRANCH}"
} >> "$LOG_FILE"

# --- 10. Save push state ---
echo "${LAST_COMMIT} ${TIMESTAMP}" > "$PROJECT_DIR/scripts/.last-push"

log "Done. Commit ${LAST_COMMIT} pushed to ${GH_REPO}:${GH_BRANCH}."
log "Worklog updated: $LOG_FILE"
