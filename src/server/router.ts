import { GroqProvider, CerebrasProvider } from './providers.js';
import { ChatOptions, AIResponse } from '../types.js';

import crypto from 'crypto';

interface CacheEntry {
  response: AIResponse;
  provider: string;
  model: string;
  timestamp: number;
}
const llmCache = new Map<string, CacheEntry>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function getCacheKey(taskType: string, options: Omit<ChatOptions, 'model'>, preferredProvider?: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(taskType);
  hash.update(JSON.stringify(options.messages || []));
  if (preferredProvider) hash.update(preferredProvider);
  return hash.digest('hex');
}

export const groq = new GroqProvider();
export const cerebras = new CerebrasProvider();

type TaskType = 'planner' | 'sourceAnalyzer' | 'factChecker' | 'synthesizer' | 'reportWriter' | 'followUp' | 'lightClassification';

interface RouteDefinition {
  provider: 'Groq' | 'Cerebras';
  model: string;
}

// Fallback configuration strictly using Cerebras (128k long context) and Groq
const ROUTER_CONFIG: Record<TaskType, RouteDefinition[]> = {
  planner: [
    { provider: 'Cerebras', model: 'llama3.1-8b' },
    { provider: 'Groq', model: 'llama-3.1-8b-instant' },
  ],
  sourceAnalyzer: [
    // Long context tasks - Cerebras 128k context is ideal for analyzing long web pages
    { provider: 'Cerebras', model: 'llama3.3-70b' },
    { provider: 'Groq', model: 'llama-3.3-70b-versatile' },
  ],
  lightClassification: [
    { provider: 'Cerebras', model: 'llama3.1-8b' },
    { provider: 'Groq', model: 'llama-3.1-8b-instant' },
  ],
  factChecker: [
    // Cross-referencing evidence across all scraped sources
    { provider: 'Cerebras', model: 'llama3.3-70b' },
    { provider: 'Groq', model: 'llama-3.3-70b-versatile' },
  ],
  synthesizer: [
    // Deep long-context synthesis
    { provider: 'Cerebras', model: 'llama3.3-70b' },
    { provider: 'Groq', model: 'llama-3.3-70b-versatile' },
  ],
  reportWriter: [
    // Comprehensive structured report writing with long context
    { provider: 'Cerebras', model: 'llama3.3-70b' },
    { provider: 'Groq', model: 'llama-3.3-70b-versatile' },
  ],
  followUp: [
    { provider: 'Cerebras', model: 'llama3.3-70b' },
    { provider: 'Groq', model: 'llama-3.3-70b-versatile' },
  ]
};

export async function routeTask(taskType: TaskType, options: Omit<ChatOptions, 'model'>, preferredProvider?: string): Promise<{ response: AIResponse, provider: string, model: string }> {
  const cacheKey = getCacheKey(taskType, options, preferredProvider);
  const cached = llmCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Router] Cache hit for ${taskType}`);
    return { response: cached.response, provider: cached.provider, model: cached.model };
  }

  const baseRoutes = ROUTER_CONFIG[taskType] || [
    { provider: 'Cerebras', model: 'llama3.3-70b' },
    { provider: 'Groq', model: 'llama-3.3-70b-versatile' },
  ];
  
  let routes: RouteDefinition[] = [];
  if (preferredProvider && preferredProvider !== 'Auto') {
    const preferred = baseRoutes.filter(r => r.provider.toLowerCase() === preferredProvider.toLowerCase());
    const others = baseRoutes.filter(r => r.provider.toLowerCase() !== preferredProvider.toLowerCase());
    // Try preferred first, but keep remaining provider as fallback in case of rate limits
    routes = [...preferred, ...others];
  } else {
    routes = [...baseRoutes];
  }
  
  let lastError: any = null;

  for (const route of routes) {
    try {
      let providerInstance;
      if (route.provider === 'Groq') providerInstance = groq;
      else if (route.provider === 'Cerebras') providerInstance = cerebras;

      if (!providerInstance || !(await providerInstance.isAvailable())) {
        console.warn(`[Router] Provider ${route.provider} is not configured or available. Trying next provider...`);
        continue;
      }

      console.log(`[Router] Routing ${taskType} to ${route.provider} (${route.model})`);
      
      const response = await providerInstance.chat({ ...options, model: route.model });
      
      // Cache successful response
      llmCache.set(cacheKey, {
        response,
        provider: route.provider,
        model: route.model,
        timestamp: Date.now()
      });

      return { response, provider: route.provider, model: route.model };

    } catch (error: any) {
      console.error(`[Router] Error with ${route.provider} (${route.model}):`, error.message);
      lastError = error;
      // Continue to next provider in the fallback chain
    }
  }

  throw new Error(`All providers failed for task: ${taskType}. Last error: ${lastError?.message || 'No providers available'}`);
}
