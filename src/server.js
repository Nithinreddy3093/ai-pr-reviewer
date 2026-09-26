import express from "express";
import { config } from "./config.js";
import { verifyGithubSignature } from "./webhook/verify.js";
import { handlePullRequestEvent } from "./webhook/handler.js";

const app = express();

// IMPORTANT: we need the *raw* request body bytes to verify GitHub's
// signature (HMAC is computed over the exact bytes GitHub sent, not over a
// JSON.parse()'d and re-serialized version, which can differ in whitespace).
// express.json() with a `verify` callback lets us capture the raw buffer
// while still getting `req.body` parsed as JSON for convenience.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/webhook", async (req, res) => {
  const signature = req.get("x-hub-signature-256");
  const isValid = verifyGithubSignature(
    req.rawBody,
    signature,
    config.githubWebhookSecret
  );

  if (!isValid) {
    console.warn("Rejected webhook: invalid signature");
    return res.status(401).json({ error: "invalid signature" });
  }

  const event = req.get("x-github-event");

  // Respond to GitHub immediately so it doesn't retry the delivery, then do
  // the actual (slower) review work after responding. Webhooks time out
  // around 10s on GitHub's side, and an LLM call can easily take longer.
  res.status(202).json({ received: true });

  if (event !== "pull_request") {
    console.log(`Ignoring non-PR event: ${event}`);
    return;
  }

  try {
    const result = await handlePullRequestEvent(req.body);
    console.log("Handled pull_request event:", result);
  } catch (err) {
    console.error("Failed to process pull_request event:", err);
  }
});

app.listen(config.port, () => {
  console.log(`AI PR reviewer listening on port ${config.port}`);
  console.log(`Webhook URL to configure in GitHub: http://<your-host>:${config.port}/webhook`);
});
