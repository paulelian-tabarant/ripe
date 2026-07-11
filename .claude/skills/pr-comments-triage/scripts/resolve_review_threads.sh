#!/usr/bin/env bash
# Resolves GitHub PR review threads (the actual "Resolve conversation" action, not
# a reply comment) for a given set of inline review comment IDs. The REST comments
# endpoint doesn't expose thread IDs, so this looks them up via GraphQL by matching
# each comment's databaseId, then calls resolveReviewThread on the owning thread.
#
# Usage: resolve_review_threads.sh <pr-number> <comment-id> [comment-id...]
#   pr-number  - the PR number (from gather_pr_comments.sh's "=== PR ===" section)
#   comment-id - one or more comment IDs (from gather_pr_comments.sh's
#                "--- comment <id> by ... ---" headers)

set -uo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <pr-number> <comment-id> [comment-id...]" >&2
  exit 1
fi

PR_NUMBER="$1"
shift
COMMENT_IDS=("$@")

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: gh CLI not found" >&2
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
            id
            isResolved
            comments(first: 50) {
              nodes { databaseId }
            }
          }
        }
      }
    }
  }' -f owner="$OWNER" -f repo="$REPO" -F number="$PR_NUMBER" 2>&1)

if [ $? -ne 0 ]; then
  echo "ERROR: failed to fetch review threads" >&2
  echo "$THREADS_JSON" >&2
  exit 1
fi

for CID in "${COMMENT_IDS[@]}"; do
  THREAD=$(echo "$THREADS_JSON" | jq -r --argjson cid "$CID" '
    .data.repository.pullRequest.reviewThreads.nodes[]
    | select(.comments.nodes[].databaseId == $cid)
    | "\(.id)\t\(.isResolved)"
  ' | head -1)

  if [ -z "$THREAD" ]; then
    echo "comment $CID: no matching review thread found"
    continue
  fi

  THREAD_ID=$(echo "$THREAD" | cut -f1)
  IS_RESOLVED=$(echo "$THREAD" | cut -f2)

  if [ "$IS_RESOLVED" = "true" ]; then
    echo "comment $CID: thread already resolved, skipping"
    continue
  fi

  RESULT=$(gh api graphql -f query='
    mutation($threadId: ID!) {
      resolveReviewThread(input: { threadId: $threadId }) {
        thread { isResolved }
      }
    }' -f threadId="$THREAD_ID" 2>&1)

  if [ $? -ne 0 ]; then
    echo "comment $CID: FAILED to resolve — $RESULT"
  else
    echo "comment $CID: resolved"
  fi
done
