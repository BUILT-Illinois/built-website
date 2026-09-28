#!/usr/bin/env bash
# Shared configuration + safety guards for the Phase 2 provisioning scripts.
# Sourced by the numbered scripts; not meant to be run directly.

set -euo pipefail

# ---- Settings you may want to change -----------------------------------
# Bucket names are globally unique across all of AWS. If creation fails with
# BucketAlreadyExists, change this.
export BUCKET="${BUCKET:-built-illinois-org-site}"

export DOMAIN="built-illinois.org"
export WWW_DOMAIN="www.${DOMAIN}"

# CloudFront and ACM for CloudFront are us-east-1 only. Keeping everything in
# one region removes a whole class of "wrong region" mistakes.
export REGION="us-east-1"

# The account this is allowed to touch: builtuiuc. The guard below refuses to
# run anywhere else, so a stale profile cannot provision into tech-committee.
export EXPECTED_ACCOUNT="242201276922"

export FUNCTION_NAME="built-illinois-index-rewrite"
export OAC_NAME="built-illinois-site-oac"
export HEADERS_POLICY_NAME="built-illinois-security-headers"
export CALLER_REF_PREFIX="built-illinois-site"

# Repo paths, resolved relative to this file.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
export SITE_DIR="${REPO_ROOT}/frontend/out"
export FUNCTION_FILE="${REPO_ROOT}/infra/cloudfront-index-rewrite.js"
export STATE_FILE="${SCRIPT_DIR}/.provision-state"

# ---- Helpers -----------------------------------------------------------
say()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
info() { printf '    %s\n' "$*"; }
warn() { printf '\033[33m    ! %s\033[0m\n' "$*"; }
die()  { printf '\033[31m\nERROR: %s\033[0m\n' "$*" >&2; exit 1; }

# Remember ids between scripts so step 02 can find what step 01 created.
state_set() {
  local key="$1" val="$2"
  touch "$STATE_FILE"
  grep -v "^${key}=" "$STATE_FILE" > "${STATE_FILE}.tmp" 2>/dev/null || true
  mv "${STATE_FILE}.tmp" "$STATE_FILE"
  echo "${key}=${val}" >> "$STATE_FILE"
}
state_get() {
  [ -f "$STATE_FILE" ] || return 1
  grep "^$1=" "$STATE_FILE" | tail -1 | cut -d= -f2-
}

# Git Bash / MSYS rewrites POSIX-looking arguments before handing them to a
# native Windows .exe, which mangles the file:// URLs the AWS CLI expects.
# Convert to a real Windows path there; pass through unchanged on Linux/macOS.
awspath() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$1"
  else
    printf '%s' "$1"
  fi
}

# Wrapper so every call is protected from that same rewriting.
awscli() {
  MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' aws "$@"
}

require_aws() {
  command -v aws >/dev/null 2>&1 || die "aws CLI not found. Install AWS CLI v2 first."

  local ident account arn
  ident="$(awscli sts get-caller-identity --output json 2>/dev/null)" \
    || die "No AWS credentials. Run 'aws configure' (or your SSO login) first."

  account="$(echo "$ident" | grep -o '"Account"[^,]*' | cut -d'"' -f4)"
  arn="$(echo "$ident" | grep -o '"Arn"[^,}]*' | cut -d'"' -f4)"

  if [ "$account" != "$EXPECTED_ACCOUNT" ]; then
    die "Wrong AWS account.
    Connected to: $account
    Expected:     $EXPECTED_ACCOUNT (builtuiuc)
  Switch profile (AWS_PROFILE=...) and re-run. Refusing to provision here."
  fi

  info "account : $account (builtuiuc)"
  info "identity: $arn"
  info "region  : $REGION"
}

confirm() {
  local prompt="${1:-Continue?}"
  read -r -p "    ${prompt} [y/N] " reply
  case "$reply" in [yY]|[yY][eE][sS]) return 0 ;; *) die "Aborted by user." ;; esac
}
