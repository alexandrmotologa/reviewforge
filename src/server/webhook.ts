import * as crypto from 'crypto';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ReviewForgeEngine, defaultEngine } from '../engine/reviewer';
import { GitHubReviewer } from '../git/octokit_client';

/**
 * Validates the HMAC-SHA256 signature from GitHub webhook requests.
 */
export function verifyGitHubSignature(payload: string, signature: string | undefined, secret: string): boolean {
  if (!signature || !secret) {
    return false;
  }

  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex')}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

/**
 * Fastify route handler for GitHub webhook events.
 */
export async function handleGitHubWebhook(
  req: FastifyRequest,
  reply: FastifyReply,
  engine: ReviewForgeEngine = defaultEngine
) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const signature = req.headers['x-hub-signature-256'] as string | undefined;

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  if (secret) {
    const isValid = verifyGitHubSignature(rawBody, signature, secret);
    if (!isValid) {
      return reply.code(401).send({ error: 'Invalid HMAC signature' });
    }
  }

  const event = req.headers['x-github-event'] as string;
  const body = req.body as any;

  if (event === 'ping') {
    return reply.send({ message: 'PONG' });
  }

  if (event === 'pull_request') {
    const action = body.action;
    if (['opened', 'synchronize', 'reopened'].includes(action)) {
      const pullNumber = body.pull_request?.number;
      const repoFullName = body.repository?.full_name;

      if (!pullNumber || !repoFullName) {
        return reply.code(400).send({ error: 'Missing PR number or repository' });
      }

      const [owner, repo] = repoFullName.split('/');
      const reviewer = new GitHubReviewer();

      try {
        const diff = await reviewer.getPullRequestDiff(owner, repo, pullNumber);
        const reviewResult = await engine.reviewDiff(diff);

        await reviewer.publishReview({
          owner,
          repo,
          pullNumber,
          commitId: body.pull_request?.head?.sha,
          scorecard: reviewResult.scorecard,
          synthesizedTests: reviewResult.synthesizedTests,
          generalComments: reviewResult.generalComments
        });

        return reply.send({
          status: 'success',
          reviewId: reviewResult.id,
          findings: reviewResult.scorecard.totalFindings,
          score: reviewResult.scorecard.riskScore
        });
      } catch (err: any) {
        req.log.error(err, 'Failed to review PR via webhook');
        return reply.code(500).send({ error: err.message || 'Review failed' });
      }
    }
  }

  return reply.send({ status: 'ignored', event });
}
