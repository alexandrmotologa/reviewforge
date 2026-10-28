import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import * as path from 'path';
import * as fs from 'fs';
import { ReviewForgeEngine, defaultEngine, ReviewResult } from '../engine/reviewer';
import { LLMProvider, ProviderType } from '../engine/llm_provider';
import { GitHubReviewer } from '../git/octokit_client';
import { generateSarifReport } from '../export/sarif';
import { handleGitHubWebhook } from './webhook';
import { testCustomRule, saveCustomRuleToConfig, CustomRuleDefinition } from '../security/custom_rule_engine';

export interface ServerOptions {
  port?: number;
  host?: string;
  engine?: ReviewForgeEngine;
}

export interface WebhookEventRecord {
  id: string;
  timestamp: string;
  event: string;
  repo: string;
  pullNumber?: number;
  author?: string;
  reviewId?: string;
  riskScore?: number;
  status: 'PASSED' | 'ACTION REQUIRED' | 'ERROR';
}

export function buildServer(options: ServerOptions = {}): FastifyInstance {
  const app = fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info'
    }
  });

  const engine = options.engine || defaultEngine;
  let llmProvider = new LLMProvider();
  const reviewsStore = new Map<string, ReviewResult>();
  const auditLogStore: WebhookEventRecord[] = [];

  // Register CORS
  app.register(cors, {
    origin: true
  });

  // Serve static files from web/dist if built
  const webDistPath = path.resolve(__dirname, '../../web/dist');
  if (fs.existsSync(webDistPath)) {
    app.register(fastifyStatic, {
      root: webDistPath,
      prefix: '/'
    });
  }

  // Health check endpoint
  app.get('/api/health', async () => {
    const health = await llmProvider.checkHealth();
    return {
      status: 'ok',
      service: 'ReviewForge',
      version: '1.0.0',
      uptime: process.uptime(),
      provider: llmProvider.getProviderType(),
      model: llmProvider.getModelName(),
      providerStatus: health
    };
  });

  // Webhook endpoint
  app.post('/api/webhook/github', async (req, reply) => {
    return handleGitHubWebhook(req, reply, engine);
  });

  // Review raw diff endpoint
  app.post('/api/review/diff', async (req, reply) => {
    const body = req.body as {
      diff: string;
      generateTests?: boolean;
      preferredFramework?: any;
    };

    if (!body || !body.diff) {
      return reply.code(400).send({ error: 'Field "diff" is required.' });
    }

    try {
      const result = await engine.reviewDiff(body.diff, {
        generateTests: body.generateTests,
        preferredFramework: body.preferredFramework,
        llmProvider
      });

      reviewsStore.set(result.id, result);
      if (reviewsStore.size > 100) {
        const firstKey = reviewsStore.keys().next().value;
        if (firstKey) reviewsStore.delete(firstKey);
      }

      // Add to audit log
      auditLogStore.unshift({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event: 'manual_diff_review',
        repo: 'local-diff',
        reviewId: result.id,
        riskScore: result.scorecard.riskScore,
        status: result.scorecard.passed ? 'PASSED' : 'ACTION REQUIRED'
      });
      if (auditLogStore.length > 200) auditLogStore.pop();

      return reply.send(result);
    } catch (err: any) {
      req.log.error(err, 'Failed to process diff review');
      return reply.code(500).send({ error: err.message || 'Review failed' });
    }
  });

  // Review GitHub PR endpoint (accepts owner/repo/number or prUrl)
  app.post('/api/review/pr', async (req, reply) => {
    const body = req.body as {
      prUrl?: string;
      owner?: string;
      repo?: string;
      pullNumber?: number;
      publish?: boolean;
    };

    let owner = body?.owner;
    let repo = body?.repo;
    let pullNumber = body?.pullNumber;

    if (body?.prUrl) {
      const match = body.prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i);
      if (match) {
        owner = match[1];
        repo = match[2];
        pullNumber = parseInt(match[3], 10);
      } else {
        const parts = body.prUrl.trim().split('/');
        if (parts.length === 3) {
          owner = parts[0];
          repo = parts[1];
          pullNumber = parseInt(parts[2], 10);
        }
      }
    }

    if (!owner || !repo || !pullNumber || isNaN(pullNumber)) {
      return reply.code(400).send({ error: 'Please provide valid owner, repo, and pullNumber or full PR URL' });
    }

    try {
      const reviewer = new GitHubReviewer();
      const diff = await reviewer.getPullRequestDiff(owner, repo, pullNumber);
      const prDetails = await reviewer.getPullRequestDetails(owner, repo, pullNumber);

      const result = await engine.reviewDiff(diff, { llmProvider });

      reviewsStore.set(result.id, result);

      if (body.publish) {
        await reviewer.publishReview({
          owner,
          repo,
          pullNumber,
          scorecard: result.scorecard,
          synthesizedTests: result.synthesizedTests,
          generalComments: result.generalComments
        });
      }

      auditLogStore.unshift({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event: 'pr_review',
        repo: `${owner}/${repo}`,
        pullNumber,
        author: prDetails.user?.login,
        reviewId: result.id,
        riskScore: result.scorecard.riskScore,
        status: result.scorecard.passed ? 'PASSED' : 'ACTION REQUIRED'
      });
      if (auditLogStore.length > 200) auditLogStore.pop();

      return reply.send({
        ...result,
        prInfo: {
          title: prDetails.title,
          author: prDetails.user?.login,
          state: prDetails.state,
          headBranch: prDetails.head?.ref,
          baseBranch: prDetails.base?.ref,
          htmlUrl: prDetails.html_url,
          owner,
          repo,
          pullNumber
        }
      });
    } catch (err: any) {
      req.log.error(err, 'Failed to review GitHub PR');
      return reply.code(500).send({ error: err.message || 'PR review failed' });
    }
  });

  // Publish existing review to GitHub
  app.post('/api/reviews/:id/publish', async (req, reply) => {
    const { id } = req.params as { id: string };
    const review = reviewsStore.get(id);
    if (!review) {
      return reply.code(404).send({ error: 'Review not found' });
    }

    const body = req.body as { owner: string; repo: string; pullNumber: number };
    if (!body || !body.owner || !body.repo || !body.pullNumber) {
      return reply.code(400).send({ error: 'Missing owner, repo, or pullNumber' });
    }

    try {
      const reviewer = new GitHubReviewer();
      const pubResult = await reviewer.publishReview({
        owner: body.owner,
        repo: body.repo,
        pullNumber: body.pullNumber,
        scorecard: review.scorecard,
        synthesizedTests: review.synthesizedTests,
        generalComments: review.generalComments
      });
      return reply.send({ success: true, reviewId: pubResult.reviewId });
    } catch (err: any) {
      return reply.code(500).send({ error: err.message || 'Publishing review failed' });
    }
  });

  // Audit Log & Webhook history endpoints
  app.get('/api/audit-log', async () => {
    return { records: auditLogStore };
  });

  app.post('/api/audit-log/:id/re-review', async (req, reply) => {
    const { id } = req.params as { id: string };
    const record = auditLogStore.find(r => r.id === id);
    if (!record || !record.repo || !record.pullNumber) {
      return reply.code(404).send({ error: 'Historical PR record not found or missing target' });
    }

    const [owner, repo] = record.repo.split('/');
    const pullNumber = record.pullNumber;

    try {
      const reviewer = new GitHubReviewer();
      const diff = await reviewer.getPullRequestDiff(owner, repo, pullNumber);
      const prDetails = await reviewer.getPullRequestDetails(owner, repo, pullNumber);
      const result = await engine.reviewDiff(diff, { llmProvider });

      reviewsStore.set(result.id, result);
      record.reviewId = result.id;
      record.riskScore = result.scorecard.riskScore;
      record.status = result.scorecard.passed ? 'PASSED' : 'ACTION REQUIRED';
      record.timestamp = new Date().toISOString();

      return reply.send({
        ...result,
        prInfo: {
          title: prDetails.title,
          author: prDetails.user?.login,
          state: prDetails.state,
          headBranch: prDetails.head?.ref,
          baseBranch: prDetails.base?.ref,
          htmlUrl: prDetails.html_url,
          owner,
          repo,
          pullNumber
        }
      });
    } catch (err: any) {
      return reply.code(500).send({ error: err.message || 'Re-review failed' });
    }
  });

  // Custom Rules Sandbox API
  app.post('/api/rules/test', async (req, reply) => {
    const body = req.body as { pattern: string; code: string; severity?: any };
    if (!body || !body.pattern || !body.code) {
      return reply.code(400).send({ error: 'pattern and code are required' });
    }
    const result = testCustomRule(body.pattern, body.code, body.severity || 'high');
    return reply.send(result);
  });

  app.post('/api/rules/save', async (req, reply) => {
    const body = req.body as CustomRuleDefinition;
    if (!body || !body.id || !body.pattern) {
      return reply.code(400).send({ error: 'id and pattern are required' });
    }
    const saved = saveCustomRuleToConfig(body);
    return reply.send({ success: saved });
  });

  // List recent reviews
  app.get('/api/reviews', async () => {
    const list = Array.from(reviewsStore.values()).map(r => ({
      id: r.id,
      createdAt: r.createdAt,
      summary: r.summary,
      filesCount: r.fileDiffs.length,
      totalFindings: r.scorecard.totalFindings,
      breakingChangesCount: r.breakingChanges.length,
      riskScore: r.scorecard.riskScore,
      passed: r.scorecard.passed,
      testsCount: r.synthesizedTests.length
    }));
    return { reviews: list.reverse() };
  });

  // Get specific review
  app.get('/api/reviews/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const review = reviewsStore.get(id);
    if (!review) {
      return reply.code(404).send({ error: 'Review not found' });
    }
    return reply.send(review);
  });

  // Export review as SARIF
  app.get('/api/reviews/:id/sarif', async (req, reply) => {
    const { id } = req.params as { id: string };
    const review = reviewsStore.get(id);
    if (!review) {
      return reply.code(404).send({ error: 'Review not found' });
    }
    const sarif = generateSarifReport(review.scorecard.findings);
    reply.header('Content-Type', 'application/json');
    return reply.send(sarif);
  });

  // Export review as Git unified .patch file
  app.get('/api/reviews/:id/patch', async (req, reply) => {
    const { id } = req.params as { id: string };
    const review = reviewsStore.get(id);
    if (!review) {
      return reply.code(404).send({ error: 'Review not found' });
    }
    reply.header('Content-Type', 'text/x-diff');
    reply.header('Content-Disposition', `attachment; filename="${id}-fixes.patch"`);
    return reply.send(review.patchContent || '');
  });

  // Settings endpoints
  app.get('/api/settings', async () => {
    return {
      provider: llmProvider.getProviderType(),
      model: llmProvider.getModelName(),
      hasGithubToken: Boolean(process.env.GITHUB_TOKEN),
      hasWebhookSecret: Boolean(process.env.GITHUB_WEBHOOK_SECRET)
    };
  });

  app.post('/api/settings', async (req, reply) => {
    const body = req.body as {
      provider: ProviderType;
      baseUrl?: string;
      apiKey?: string;
      model?: string;
      temperature?: number;
    };

    llmProvider = new LLMProvider(body);
    const health = await llmProvider.checkHealth();

    return reply.send({
      status: 'updated',
      provider: llmProvider.getProviderType(),
      model: llmProvider.getModelName(),
      health
    });
  });

  app.post('/api/settings/test', async () => {
    return llmProvider.checkHealth();
  });

  return app;
}

export async function startServer(port: number = 9440, host: string = '0.0.0.0'): Promise<FastifyInstance> {
  const app = buildServer();
  try {
    await app.listen({ port, host });
    console.log(`ReviewForge server and web studio active at http://${host}:${port}`);
    return app;
  } catch (err) {
    console.error('Failed to bind ReviewForge server:', err);
    throw err;
  }
}
