import fs from 'fs';

let agent = fs.readFileSync('src/server/agent.ts', 'utf8');

// The replacement was applied twice.
// Let's just remove the first instance of searchCache
agent = agent.replace("const searchCache = new Map<string, {results: any[], timestamp: number}>();\\nconst SEARCH_CACHE_TTL = 1000 * 60 * 60 * 24;\\n", "");

// Let's just clean it up manually by parsing it, wait it's easier to just use regex to remove duplicates.
// Or I can look at the code and write the exact cleanup.
