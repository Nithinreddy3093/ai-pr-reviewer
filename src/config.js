import "dotenv/config";

// Fail fast and loud if something required is missing, instead of getting a
// confusing crash three files deep when a webhook actually arrives.
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Did you copy .env.example to .env?`
    );
  }
  return value;
}

export const config = {
  githubToken: required("GITHUB_TOKEN"),
  githubWebhookSecret: required("GITHUB_WEBHOOK_SECRET"),
  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  port: Number(process.env.PORT || 3000),
  largeDiffThreshold: Number(process.env.LARGE_DIFF_THRESHOLD || 300),
};
