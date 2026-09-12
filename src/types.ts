export type Confidence = 'high' | 'medium' | 'low';

export interface Evidence {
  id: string;
  sourceId: string;
  projectId: string;
  claim: string;
  supportingText: string;
  sourceUrl: string;
  sourceTitle: string;
  confidence: Confidence;
  publishedAt?: string;
}

export interface Source {
  id: string;
  projectId: string;
  title: string;
  url: string;
  domain: string;
  qualityScore: 'High' | 'Medium' | 'Low' | 'Unknown';
  type: string;
  summary?: string;
}

export interface ResearchProject {
  id: string;
  query: string;
  depth: 'Quick' | 'Standard' | 'Deep' | 'Comprehensive';
  type: string;
  status: 'started' | 'planning' | 'searching' | 'analyzing' | 'synthesis' | 'completed' | 'error' | 'cancelled';
  createdAt: string;
  userId?: string;
  preferredProvider?: string;
}

export interface Citation {
  id: string;
  projectId: string;
  evidenceId: string;
  sourceId: string;
  number: number;
}

export interface Report {
  id: string;
  projectId: string;
  title: string;
  executiveSummary: string;
  keyFindings: string[];
  body: string;
  createdAt: string;
  userId?: string;
  isSaved?: boolean;
}

// AI Provider Types
export interface ChatOptions {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface AIResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProvider {
  name: string;
  chat(options: ChatOptions): Promise<AIResponse>;
  isAvailable(): Promise<boolean>;
}
