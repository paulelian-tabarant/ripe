#!/usr/bin/env bash
# Fetches inline PR review comments (comments attached to a specific file/line,
# not top-level PR conversation) via gh api, and prints them as plain text
# blocks for a model to classify and act on. Does no classification itself.
# Comments belonging to an already-resolved review thread are filtered out
# (resolution state is looked up via GraphQL, since the REST comments endpoint
# doesn't expose it) — only unresolved threads are returned.
#
# Usage: gather_pr_comments.sh [ref]
#   ref - PR number, PR URL, or branch name. Defaults to the current branch's
#         open PR (auto-detected via `gh pr view`).

set -uo pipefail

REF="${1:-}"

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: gh CLI not found — required to fetch PR review comments" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "ERROR: gh is not authenticated — run 'gh auth login'" >&2
  exit 1
fi

PR_JSON=$(gh pr view "$REF" --json number,title,url,baseRefName,headRefName 2>&1)
if [ $? -ne 0 ]; then
  echo "ERROR: could not resolve a PR for '${REF:-<current branch>}'" >&2
  echo "$PR_JSON" >&2
  exit 1
fi

NUM=$(echo "$PR_JSON" | grep -o '"number":[0-9]*' | head -1 | grep -o '[0-9]*')
TITLE=$(echo "$PR_JSON" | sed -n 's/.*"title":"\([^"]*\)".*/\1/p')
URL=$(echo "$PR_JSON" | sed -n 's/.*"url":"\([^"]*\)".*/\1/p')

echo "=== PR ==="
echo "#$NUM: $TITLE"
echo "$URL"
echo

COMMENTS=$(gh api "repos/{owner}/{repo}/pulls/$NUM/comments" --paginate 2>&1)
if [ $? -ne 0 ]; then
  echo "ERROR: failed to fetch review comments" >&2
  echo "$COMMENTS" >&2
  exit 1
fi

OWNER=$(gh repo view --json owner -q '.owner.login' 2>/dev/null)
REPO=$(gh repo view --json name -q '.name' 2>/dev/null)
if [ -z "$OWNER" ] || [ -z "$REPO" ]; then
  echo "ERROR: could not resolve owner/repo for the current directory" >&2
  exit 1
fi

THREADS_JSON=$(gh api graphql -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100) {
          nodes {
            isResolved
            comments(first: 50) {
              nodes { databaseId }
            }
          }
        }
      }
    }
  }' -f owner="$OWNER" -f repo="$REPO" -F number="$NUM" 2>&1)
if [ $? -ne 0 ]; then
  echo "ERROR: failed to fetch review thread resolution status" >&2
  echo "$THREADS_JSON" >&2
  exit 1
fi

RESOLVED_IDS_JSON=$(echo "$THREADS_JSON" | jq -c '
  [.data.repository.pullRequest.reviewThreads.nodes[]
   | select(.isResolved)
   | .comments.nodes[].databaseId]
')

COMMENTS=$(echo "$COMMENTS" | jq --argjson resolved "$RESOLVED_IDS_JSON" '
  [.[] | select((.id as $id | $resolved | index($id)) | not)]
')

COUNT=$(echo "$COMMENTS" | jq 'length')
if [ "$COUNT" = "0" ]; then
  echo "=== INLINE REVIEW COMMENTS ==="
  echo "No unresolved inline review comments found on this PR."
  exit 0
fi

echo "=== UNRESOLVED INLINE REVIEW COMMENTS ($COUNT) ==="
echo

echo "$COMMENTS" | jq -r '
  .[] |
  "--- comment \(.id) by \(.user.login) on \(.path):\(.line // .original_line // "?")" +
  (if .line == null then " [outdated diff position]" else "" end) +
  (if .in_reply_to_id then " (reply to \(.in_reply_to_id))" else "" end) +
  " ---\n" +
  .body +
  "\n\ndiff context:\n" +
  (.diff_hunk // "(none)") +
  "\n"
'
