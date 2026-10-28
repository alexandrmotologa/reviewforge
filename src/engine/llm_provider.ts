export type ProviderType = 'ollama' | 'openai' | 'anthropic' | 'gemini' | 'offline';

export interface LLMConfig {
  provider: ProviderType;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LLMProvider {
  private config: LLMConfig;

  constructor(config?: Partial<LLMConfig>) {
    const defaultProvider = (process.env.LLM_PROVIDER as ProviderType) ||
      (process.env.OLLAMA_HOST ? 'ollama' :
      process.env.OPENAI_API_KEY ? 'openai' :
      process.env.ANTHROPIC_API_KEY ? 'anthropic' :
      process.env.GEMINI_API_KEY ? 'gemini' : 'offline');

    this.config = {
      provider: config?.provider || defaultProvider,
      baseUrl: config?.baseUrl || process.env.OLLAMA_HOST || 'http://localhost:11434',
      apiKey: config?.apiKey || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY,
      model: config?.model || process.env.OLLAMA_MODEL || process.env.OPENAI_MODEL || 'deepseek-coder:6.7b',
      temperature: config?.temperature ?? 0.2
    };
  }

  public getProviderType(): ProviderType {
    return this.config.provider;
  }

  public getModelName(): string {
    return this.config.model || 'none';
  }

  /**
   * Health check to test if the configured provider is reachable.
   */
  public async checkHealth(): Promise<{ ok: boolean; message: string }> {
    if (this.config.provider === 'offline') {
      return { ok: true, message: 'Running in offline deterministic mode (static AST rules only).' };
    }

    if (this.config.provider === 'ollama') {
      try {
        const url = `${this.config.baseUrl}/api/version`;
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data = await res.json() as { version?: string };
          return { ok: true, message: `Ollama is active (version: ${data.version || 'detected'}).` };
        }
        return { ok: false, message: `Ollama responded with HTTP ${res.status}.` };
      } catch (err) {
        return { ok: false, message: 'Ollama is unreachable at configured base URL.' };
      }
    }

    if (this.config.apiKey) {
      return { ok: true, message: `Cloud provider '${this.config.provider}' configured with API key.` };
    }

    return { ok: false, message: `Provider '${this.config.provider}' missing API key.` };
  }

  /**
   * Sends prompt messages to the configured LLM and returns the completion string.
   */
  public async complete(messages: LLMMessage[]): Promise<string | null> {
    if (this.config.provider === 'offline') {
      return null;
    }

    try {
      if (this.config.provider === 'ollama') {
        const prompt = messages.map(m => `${m.role.toUpperCase()}:\n${m.content}`).join('\n\n');
        const res = await fetch(`${this.config.baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.config.model,
            prompt,
            stream: false,
            options: { temperature: this.config.temperature }
          }),
          signal: AbortSignal.timeout(30000)
        });

        if (!res.ok) return null;
        const data = await res.json() as { response?: string };
        return data.response || null;
      }

      if (this.config.provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify({
            model: this.config.model || 'gpt-4o',
            messages,
            temperature: this.config.temperature
          }),
          signal: AbortSignal.timeout(30000)
        });

        if (!res.ok) return null;
        const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
        return data.choices?.[0]?.message?.content || null;
      }

      if (this.config.provider === 'anthropic') {
        const systemMsg = messages.find(m => m.role === 'system')?.content || '';
        const userMsgs = messages.filter(m => m.role !== 'system');

        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey || '',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: this.config.model || 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            system: systemMsg,
            messages: userMsgs.map(m => ({ role: m.role, content: m.content })),
            temperature: this.config.temperature
          }),
          signal: AbortSignal.timeout(30000)
        });

        if (!res.ok) return null;
        const data = await res.json() as { content?: Array<{ text?: string }> };
        return data.content?.[0]?.text || null;
      }

      if (this.config.provider === 'gemini') {
        const model = this.config.model || 'gemini-2.0-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`;
        const prompt = messages.map(m => m.content).join('\n\n');

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: this.config.temperature }
          }),
          signal: AbortSignal.timeout(30000)
        });

        if (!res.ok) return null;
        const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
      }
    } catch {
      // Fallback to offline on network timeout or failure
      return null;
    }

    return null;
  }
}
