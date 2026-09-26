import { fetchPullRequestDiff, postReviewComment } from "../github/client.js";
import { generateReview } from "../review/llm.js";

// Only these PR actions actually mean "there's new code to review".
// GitHub sends many other pull_request actions (labeled, assigned, closed,
// etc.) that we should just ignore.
const REVIEWABLE_ACTIONS = new Set(["opened", "synchronize", "reopened"]);

/**
 * Handles a verified `pull_request` webhook event end-to-end:
 * fetch the diff -> send to the LLM -> post the review back as a comment.
 *
 * Kept separate from the Express route so it's easy to unit test without
 * spinning up a server or mocking HTTP request/response objects.
 */
export async function handlePullRequestEvent(payload) {
  const { action, pull_request: pr, repository } = payload;

  if (!REVIEWABLE_ACTIONS.has(action)) {
    return { skipped: true, reason: `action "${action}" is not reviewable` };
  }

  const owner = repository.owner.login;
  const repo = repository.name;
  const pullNumber = pr.number;

  const diffText = await fetchPullRequestDiff({ owner, repo, pullNumber });

  if (!diffText || diffText.trim().length === 0) {
    return { skipped: true, reason: "empty diff" };
  }

  const { size, reviewText } = await generateReview(diffText);

  const commentBody = `### 🤖 AI Review (${size} diff)\n\n${reviewText}\n\n---\n*Automated review — please still get a human look before merging.*`;

  await postReviewComment({ owner, repo, pullNumber, body: commentBody });

  return { skipped: false, size, pullNumber };
}
