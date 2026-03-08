#!/usr/bin/env bash
set -euo pipefail

# Official adkbot installer.
# Installs adkbot to /usr/local/bin by default.

REPO_DEFAULT="https://github.com/codejedi-ai/ADK-Socket-Bot.git"
REPO_URL="${ADKBOT_REPO_URL:-$REPO_DEFAULT}"
INSTALL_DIR="${ADKBOT_INSTALL_DIR:-/usr/local/bin}"
WORK_DIR="${ADKBOT_WORK_DIR:-$(mktemp -d)}"

log() {
  printf "[adkbot-install] %s\n" "$*"
}

die() {
  printf "[adkbot-install] ERROR: %s\n" "$*" >&2
  exit 1
}

have() {
  command -v "$1" >/dev/null 2>&1
}

SUDO=""
if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  if have sudo; then
    SUDO="sudo"
  fi
fi

cleanup() {
  if [[ -n "${WORK_DIR:-}" && -d "${WORK_DIR:-}" ]]; then
    rm -rf "$WORK_DIR"
  fi
}
trap cleanup EXIT

have git || die "git is required"
have go || die "go is required (Go 1.25+)"

log "Cloning source from $REPO_URL"
git clone --depth 1 "$REPO_URL" "$WORK_DIR/repo"

log "Building adkbot"
(
  cd "$WORK_DIR/repo"
  go mod tidy
  go build -o adkbot ./cmd/adkbot
)

log "Installing adkbot to $INSTALL_DIR"
$SUDO mkdir -p "$INSTALL_DIR"
$SUDO install -m 0755 "$WORK_DIR/repo/adkbot" "$INSTALL_DIR/adkbot"

if have adkbot; then
  log "adkbot installed: $(command -v adkbot)"
else
  log "adkbot installed to $INSTALL_DIR/adkbot"
  log "If your PATH does not include $INSTALL_DIR, add it and reopen your shell."
fi

log "Next steps:"
log "1) adkbot onboard"
log "2) adkbot gateway start"
log "3) adkbot tui"