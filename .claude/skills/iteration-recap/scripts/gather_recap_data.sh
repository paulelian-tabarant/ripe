#!/usr/bin/env bash
# Gathers raw material for a PR/branch recap: PR metadata (via gh, if available),
# commit log, and diffstat against the merge-base with the default/base branch.
# Prints plain sections for a model to read and summarize — does no formatting
# or judgment itself, since that's the part that needs a human-readable recap.
#
# Usage: gather_recap_data.sh [ref] [base]
#   ref  - PR number, PR URL, or branch name. Defaults to the current branch.
#   base - base branch to diff against. Defaults to the repo's default branch.

set -uo pipefail

REF="${1:-}"
BASE_OVERRIDE="${2:-}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: not inside a git repository" >&2
  exit 1
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
HEAD_REF="${REF:-$CURRENT_BRANCH}"

DEFAULT_BRANCH="$BASE_OVERRIDE"
if [ -z "$DEFAULT_BRANCH" ]; then
  DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
fi
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"

PR_FOUND=0
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  PR_JSON=$(gh pr view "${REF:-}" --json number,title,body,url,baseRefName,headRefName,state,mergedAt,author,statusCheckRollup 2>/dev/null)
  if [ -n "$PR_JSON" ]; then
    PR_FOUND=1
    echo "=== PR METADATA (source: gh) ==="
    echo "$PR_JSON"
    echo
    BASE_FROM_PR=$(gh pr view "${REF:-}" --json baseRefName -q '.baseRefName' 2>/dev/null)
    HEAD_FROM_PR=$(gh pr view "${REF:-}" --json headRefName -q '.headRefName' 2>/dev/null)
    [ -n "$BASE_FROM_PR" ] && DEFAULT_BRANCH="$BASE_FROM_PR"
    [ -n "$HEAD_FROM_PR" ] && HEAD_REF="$HEAD_FROM_PR"
  fi
fi

if [ "$PR_FOUND" = "0" ]; then
  echo "=== PR METADATA ==="
  echo "No open PR found for '$HEAD_REF' (or gh unavailable/unauthenticated). Falling back to local git history."
  echo
fi

# Make sure we can diff against the base even if it's a remote-only branch.
BASE_REF="$DEFAULT_BRANCH"
if ! git rev-parse --verify --quiet "$BASE_REF" >/dev/null; then
  BASE_REF="origin/$DEFAULT_BRANCH"
fi

if ! git rev-parse --verify --quiet "$BASE_REF" >/dev/null; then
  echo "ERROR: could not resolve base branch '$DEFAULT_BRANCH' locally or as origin/$DEFAULT_BRANCH" >&2
  exit 1
fi

MERGE_BASE=$(git merge-base "$BASE_REF" "$HEAD_REF" 2>/dev/null)
if [ -z "$MERGE_BASE" ]; then
  echo "ERROR: could not find a merge-base between '$BASE_REF' and '$HEAD_REF'" >&2
  exit 1
fi

echo "=== COMPARING: $BASE_REF...$HEAD_REF (merge-base $MERGE_BASE) ==="
echo

echo "=== COMMITS ==="
git log --pretty=format:'%h %ad %an: %s' --date=short "$MERGE_BASE".."$HEAD_REF"
echo
echo

echo "=== DIFFSTAT ==="
git diff --stat "$MERGE_BASE" "$HEAD_REF"
echo

echo "=== FILES CHANGED (name-status) ==="
git diff --name-status "$MERGE_BASE" "$HEAD_REF"
