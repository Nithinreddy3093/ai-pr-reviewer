import crypto from "node:crypto";

/**
 * GitHub signs every webhook payload with your secret using HMAC-SHA256 and
 * sends it in the `x-hub-signature-256` header as `sha256=<hexdigest>`.
 *
 * Verifying this proves the request actually came from GitHub (or someone
 * who knows your secret) and wasn't forged by a random person hitting your
 * public endpoint with a fake "PR opened" payload.
 *
 * @param {Buffer} rawBody - the *raw, unparsed* request body bytes
 * @param {string | undefined} signatureHeader - the x-hub-signature-256 header
 * @param {string} secret - your webhook secret (same one set in GitHub's UI)
 * @returns {boolean}
 */
export function verifyGithubSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || rawBody == null || !secret) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  // timingSafeEqual throws if the buffers differ in length, so guard that
  // first rather than let a length mismatch leak timing information anyway.
  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signatureHeader, "utf8");

  if (expectedBuffer.length !== signatureBuffer.length) return false;

  // Use a constant-time comparison so an attacker can't guess the signature
  // one byte at a time by measuring how long each failed attempt takes.
  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}
