# Webhook Configuration Guide

ReviewForge includes a Fastify HTTP daemon on port 9440 that accepts incoming webhook events from GitHub and GitLab.

## GitHub Configuration

### 1. Start the ReviewForge Daemon

Run ReviewForge with environment variables set:

```bash
export GITHUB_TOKEN="ghp_yourPersonalAccessTokenOrAppToken"
export GITHUB_WEBHOOK_SECRET="your_shared_hmac_secret"
export PORT=9440

node dist/cli.js serve
```

### 2. Configure the GitHub Webhook

1. Navigate to your repository on GitHub.
2. Go to **Settings** > **Webhooks** > **Add webhook**.
3. Set **Payload URL** to your server URL: `https://your-server.example.com/api/webhook/github`.
4. Set **Content type** to `application/json`.
5. Enter the **Secret** matching `GITHUB_WEBHOOK_SECRET`.
6. Under **Which events would you like to trigger this webhook?**, select **Let me select individual events**.
7. Check:
   - **Pull requests** (events: `opened`, `synchronize`, `reopened`)
   - **Issue comments** (optional, for on-demand `/reviewforge review` triggers)
8. Click **Add webhook**.

### 3. Payload Verification

Every request is verified against the `X-Hub-Signature-256` header using HMAC SHA-256. Requests with missing or invalid signatures are rejected with HTTP 401.

## GitLab Configuration

1. In your GitLab project, go to **Settings** > **Webhooks**.
2. Set URL to `https://your-server.example.com/api/webhook/gitlab`.
3. Provide the secret token in `GITLAB_WEBHOOK_SECRET`.
4. Trigger on **Merge request events**.
5. Save the webhook.

## Local Development with ngrok or Cloudflare Tunnel

To test webhooks on a development workstation:

```bash
# Using Cloudflare Tunnel
cloudflared tunnel --url http://localhost:9440

# Or using ngrok
ngrok http 9440
```

Copy the generated public HTTPS URL into the GitHub Webhook settings.
