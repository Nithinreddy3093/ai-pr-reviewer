import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { buildReviewPrompt } from "./prompt.js";

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

/**
 * Sends the diff to the LLM and returns the review text plus metadata
 * about how it was classified (small/large), so the caller can decide
 * how to format the final comment.
 */
export async function generateReview(diffText) {
  const { size, prompt } = buildReviewPrompt(diffText);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5", // swap for whichever model your API key has access to
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const reviewText = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return { size, reviewText };
}
