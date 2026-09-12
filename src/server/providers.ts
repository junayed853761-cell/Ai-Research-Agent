import { AIProvider, ChatOptions, AIResponse } from '../types.js';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

class BaseOpenAIProvider implements AIProvider {
  name: string;
  apiKeyEnvNames: string[];
  baseUrl: string;
  private keyIndex: number = 0;

  constructor(name: string, apiKeyEnvNames: string[], baseUrl: string) {
    this.name = name;
    this.apiKeyEnvNames = apiKeyEnvNames;
    this.baseUrl = baseUrl;
  }

  private getAvailableKeys(): string[] {
    const keys: string[] = [];
    for (const keyName of this.apiKeyEnvNames) {
      const val = process.env[keyName]?.trim();
      if (val && !val.startsWith('MY_') && val !== 'undefined') {
        // Handle comma-separated keys if provided in a single variable
        if (val.includes(',')) {
          val.split(',').map(k => k.trim()).filter(k => k && !k.startsWith('MY_')).forEach(k => keys.push(k));
        } else {
          keys.push(val);
        }
      }
    }
    return Array.from(new Set(keys));
  }

  async isAvailable(): Promise<boolean> {
    return this.getAvailableKeys().length > 0;
  }

  async chat(options: ChatOptions): Promise<AIResponse> {
    const keys = this.getAvailableKeys();
    if (keys.length === 0) {
      throw new Error(`Provider ${this.name} is not configured. Please set at least one valid API key.`);
    }

    let lastError: any = null;
    const startIndex = this.keyIndex;

    // Try all available keys starting from the current round-robin index
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const activeIndex = (startIndex + attempt) % keys.length;
      const apiKey = keys[activeIndex];
      this.keyIndex = (activeIndex + 1) % keys.length;

      try {
        const client = new OpenAI({
          apiKey,
          baseURL: this.baseUrl,
        });

        console.log(`[${this.name}] Executing ${options.model} with key #${activeIndex + 1}/${keys.length}`);

        const response = await client.chat.completions.create({
          model: options.model,
          messages: options.messages as any,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens,
        }, { signal: options.signal as any });

        return {
          content: response.choices[0]?.message?.content || '',
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0,
          }
        };
      } catch (error: any) {
        console.warn(`[${this.name}] Key #${activeIndex + 1} failed (${error.message}). Rotating to next key...`);
        lastError = error;
      }
    }

    throw new Error(`All ${keys.length} API keys for ${this.name} failed. Last error: ${lastError?.message}`);
  }
}

export class GroqProvider extends BaseOpenAIProvider {
  constructor() {
    super(
      'Groq',
      [
        'GROQ_API_KEY',
        'GROQ_API_KEY_1',
        'GROQ_API_KEY_2',
        'GROQ_API_KEY_3',
        'GROQ_API_KEY_4',
        'GROQ_API_KEY_5'
      ],
      process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1'
    );
  }
}

export class CerebrasProvider extends BaseOpenAIProvider {
  constructor() {
    super(
      'Cerebras',
      [
        'CEREBRAS_API_KEY',
        'CEREBRAS_API_KEY_1',
        'CEREBRAS_API_KEY_2',
        'CEREBRAS_API_KEY_3',
        'CEREBRAS_API_KEY_4',
        'CEREBRAS_API_KEY_5'
      ],
      process.env.CEREBRAS_BASE_URL || 'https://api.cerebras.ai/v1'
    );
  }
}

export class GeminiProvider implements AIProvider {
  name = 'Gemini';
  private keyIndex: number = 0;
  private apiKeyEnvNames = [
    'GEMINI_API_KEY',
    'GEMINI_API_KEY_1',
    'GEMINI_API_KEY_2',
    'GEMINI_API_KEY_3',
    'GEMINI_API_KEY_4',
    'GEMINI_API_KEY_5'
  ];

  private getAvailableKeys(): string[] {
    const keys: string[] = [];
    for (const keyName of this.apiKeyEnvNames) {
      const val = process.env[keyName]?.trim();
      if (val && !val.startsWith('MY_') && val !== 'undefined') {
        if (val.includes(',')) {
          val.split(',').map(k => k.trim()).filter(k => k && !k.startsWith('MY_')).forEach(k => keys.push(k));
        } else {
          keys.push(val);
        }
      }
    }
    return Array.from(new Set(keys));
  }

  async isAvailable(): Promise<boolean> {
    return this.getAvailableKeys().length > 0;
  }

  async chat(options: ChatOptions): Promise<AIResponse> {
    const keys = this.getAvailableKeys();
    if (keys.length === 0) {
      throw new Error('Gemini Provider is not configured. Please set a valid GEMINI_API_KEY.');
    }

    let lastError: any = null;
    const startIndex = this.keyIndex;

    for (let attempt = 0; attempt < keys.length; attempt++) {
      const activeIndex = (startIndex + attempt) % keys.length;
      const apiKey = keys[activeIndex];
      this.keyIndex = (activeIndex + 1) % keys.length;

      try {
        const client = new GoogleGenAI({ apiKey });

        let systemInstruction = '';
        const contents = [];

        for (const msg of options.messages) {
          if (msg.role === 'system') {
            systemInstruction += msg.content + '\n';
          } else {
            contents.push({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }]
            });
          }
        }

        const model = options.model || 'gemini-2.5-flash';

        console.log(`[Gemini] Executing ${model} with key #${activeIndex + 1}/${keys.length}`);

        const reqPromise = client.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: systemInstruction.trim() ? systemInstruction.trim() : undefined,
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens,
          }
        });

        let response;
        if (options.signal) {
          response = await Promise.race([
            reqPromise,
            new Promise((_, reject) => {
              if (options.signal?.aborted) return reject(new Error('AbortError'));
              options.signal?.addEventListener('abort', () => reject(new Error('AbortError')));
            })
          ]) as any;
        } else {
          response = await reqPromise;
        }

        return {
          content: response.text || '',
          usage: {
            promptTokens: response.usageMetadata?.promptTokenCount || 0,
            completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata?.totalTokenCount || 0,
          }
        };
      } catch (error: any) {
        console.warn(`[Gemini] Key #${activeIndex + 1} failed (${error.message}). Rotating to next key...`);
        lastError = error;
      }
    }

    throw new Error(`All ${keys.length} Gemini API keys failed. Last error: ${lastError?.message}`);
  }
}
