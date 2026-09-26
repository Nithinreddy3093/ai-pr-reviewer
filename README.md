# AI PR Reviewer

Listens for GitHub pull request webhooks, fetches the diff, sends it to an
LLM for review, and posts the review back as a comment on the PR
automatically.

## How it works

```
GitHub PR opened/updated
        │
        ▼
  Webhook fires ──► POST /webhook
        │
        ▼
  Verify HMAC signature (reject if invalid — this stops anyone but
  GitHub from triggering fake reviews on your repo)
        │
        ▼
  Fetch the PR diff via GitHub API
        │
        ▼
  Classify diff size (small / large) and build a matching prompt
        │
        ▼
  Send to Claude, get back a structured review
        │
        ▼
  Post the review as a comment on the PR
```

## Setup

1. **Clone and install**
   ```bash
   git clone <your-repo-url>
   cd ai-pr-reviewer
   npm install
   ```

2. **Create a GitHub Personal Access Token**
   Settings → Developer settings → Personal access tokens → generate one
   with `repo` scope (needed to read PR diffs and post comments).

3. **Get an Anthropic API key** from [console.anthropic.com](https://console.anthropic.com).

4. **Copy the env file and fill it in**
   ```bash
   cp .env.example .env
   ```
   Fill in `GITHUB_TOKEN` and `ANTHROPIC_API_KEY`. Leave
   `GITHUB_WEBHOOK_SECRET` for the next step — you'll set the *same* value
   in both places.

5. **Run it locally and expose it publicly** (GitHub needs a real URL to
   send webhooks to — localhost alone won't work):
   ```bash
   npm start
   # in another terminal:
   ngrok http 3000
   ```
   Copy the `https://...ngrok-free.app` URL ngrok gives you.

6. **Register the webhook on a test repo**
   Repo → Settings → Webhooks → Add webhook:
   - Payload URL: `https://<your-ngrok-url>/webhook`
   - Content type: `application/json`
   - Secret: any string you choose — put the *same* string in your `.env`
     as `GITHUB_WEBHOOK_SECRET`
   - Events: select "Pull requests" only

7. **Test it**: open a PR on that repo, or push a new commit to an existing
   one. Within a few seconds you should see an AI-generated review comment
   appear on the PR.

## Project structure

```
src/
├── server.js           Express app — receives webhooks, checks signature
├── webhook/
│   ├── verify.js        HMAC-SHA256 signature verification
│   └── handler.js        orchestrates: fetch diff -> review -> post comment
├── github/
│   └── client.js         GitHub API: fetch diff, post comment
├── review/
│   ├── prompt.js         builds the review prompt, classifies diff size
│   └── llm.js             calls the LLM, returns the review text
└── config.js             loads and validates environment variables
```

## Why it's built this way (talking points for an interview)

- **Signature verification uses `crypto.timingSafeEqual`**, not `===`, so
  the comparison takes the same time regardless of where the strings first
  differ — a plain string comparison would leak timing information an
  attacker could use to guess the correct signature byte by byte.
- **The raw request body is captured separately from the parsed JSON.**
  HMAC is computed over the exact bytes GitHub sent; re-serializing a
  parsed JSON object can produce different bytes (whitespace, key order),
  which would break verification even for a legitimate request.
- **The webhook responds `202` before doing the actual review work.**
  GitHub expects a response within ~10 seconds or it retries the delivery;
  an LLM call can take longer than that, so the slow work happens after
  responding rather than before.
- **Diffs are classified by size** and large diffs get an extra
  "breaking changes" section in the prompt — a deliberate design choice
  that large changes deserve more scrutiny, not the same fixed-length
  review as a one-line fix.

## Possible extensions

- Post as a proper GitHub "review" (approve / request changes) instead of
  a plain comment, using the Reviews API
- Add a small SQLite log of reviews performed, for a "review history" view
- Support GitLab webhooks alongside GitHub
- Add a `/config` endpoint to let a repo customize which files to ignore
  (e.g. skip reviewing `*.lock` or generated files)
