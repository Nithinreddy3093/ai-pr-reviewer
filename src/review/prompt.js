import { config } from "../config.js";

/**
 * Rough proxy for diff size: count lines that start with + or - (added or
 * removed lines), ignoring the +++ / --- file header lines.
 */
export function countChangedLines(diffText) {
  return diffText
    .split("\n")
    .filter(
      (line) =>
        (line.startsWith("+") && !line.startsWith("+++")) ||
        (line.startsWith("-") && !line.startsWith("---"))
    ).length;
}

export function classifyDiffSize(diffText) {
  const changedLines = countChangedLines(diffText);
  return changedLines > config.largeDiffThreshold ? "large" : "small";
}

const BASE_INSTRUCTIONS = `You are a senior software engineer reviewing a GitHub pull request.
You will be given a unified diff. Review it and respond in this exact structure:

## Summary
One or two sentences on what this change does.

## Issues
Bullet list of bugs, edge cases, or correctness problems. Write "None found" if there are none.

## Suggestions
Bullet list of concrete improvements (naming, structure, error handling). Write "None" if there are none.

## Verdict
One line: "Approve", "Approve with suggestions", or "Request changes" — plus a one-sentence reason.

Be specific and reference actual lines/functions from the diff. Do not restate the whole diff back.`;

const LARGE_DIFF_ADDENDUM = `
This is a LARGE change. In addition to the sections above, also add:

## Breaking Changes
Anything that could break existing callers or behavior. Write "None identified" if none.

Be extra careful here — large diffs are exactly where subtle regressions hide.`;

export function buildReviewPrompt(diffText) {
  const size = classifyDiffSize(diffText);
  const instructions =
    size === "large" ? BASE_INSTRUCTIONS + LARGE_DIFF_ADDENDUM : BASE_INSTRUCTIONS;

  return {
    size,
    prompt: `${instructions}\n\n--- DIFF START ---\n${diffText}\n--- DIFF END ---`,
  };
}
