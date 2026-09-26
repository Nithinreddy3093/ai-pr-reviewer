import { Octokit } from "@octokit/rest";
import { config } from "../config.js";

const octokit = new Octokit({ auth: config.githubToken });

/**
 * Fetches the unified diff for a pull request.
 * GitHub returns diff-formatted text when you ask for this media type,
 * instead of the usual JSON PR object.
 */
export async function fetchPullRequestDiff({ owner, repo, pullNumber }) {
  const response = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    {
      owner,
      repo,
      pull_number: pullNumber,
      mediaType: { format: "diff" },
    }
  );
  // When format is "diff", the SDK hands back the raw diff text as `data`.
  return response.data;
}

/**
 * Posts a single issue comment on the PR containing the AI review.
 * (Using an issue comment rather than a formal "review" keeps the first
 * version simple — PRs are issues under the hood in GitHub's API, so this
 * comment shows up directly in the PR's conversation tab.)
 */
export async function postReviewComment({ owner, repo, pullNumber, body }) {
  await octokit.request(
    "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
    {
      owner,
      repo,
      issue_number: pullNumber,
      body,
    }
  );
}
