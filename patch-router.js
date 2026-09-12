import fs from 'fs';
import crypto from 'crypto';

let content = fs.readFileSync('src/server/router.ts', 'utf8');

const cacheImplementation = `
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
`;

content = content.replace(
  "import { ChatOptions, AIResponse } from '../types.js';",
  "import { ChatOptions, AIResponse } from '../types.js';" + cacheImplementation
);

const oldRouteTaskStart = `export async function routeTask(taskType: TaskType, options: Omit<ChatOptions, 'model'>, preferredProvider?: string): Promise<{ response: AIResponse, provider: string, model: string }> {
  let routes = ROUTER_CONFIG[taskType];`;

const newRouteTaskStart = `export async function routeTask(taskType: TaskType, options: Omit<ChatOptions, 'model'>, preferredProvider?: string): Promise<{ response: AIResponse, provider: string, model: string }> {
  const cacheKey = getCacheKey(taskType, options, preferredProvider);
  const cached = llmCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(\`[Router] Cache hit for \${taskType}\`);
    return { response: cached.response, provider: cached.provider, model: cached.model };
  }

  let routes = ROUTER_CONFIG[taskType];`;

content = content.replace(oldRouteTaskStart, newRouteTaskStart);

const oldReturn = `const response = await providerInstance.chat({ ...options, model: route.model });
            
            return { response, provider: route.provider, model: route.model };`;

const newReturn = `const response = await providerInstance.chat({ ...options, model: route.model });
            
            const result = { response, provider: route.provider, model: route.model };
            llmCache.set(cacheKey, { ...result, timestamp: Date.now() });
            return result;`;

content = content.replace(oldReturn, newReturn);

fs.writeFileSync('src/server/router.ts', content);
console.log('patched router');
