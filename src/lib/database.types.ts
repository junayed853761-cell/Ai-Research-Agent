import { z } from 'zod';

export const researchProjectSchema = z.object({
  id: z.string().uuid(),
  query: z.string().min(1, "Query is required"),
  depth: z.enum(['Quick', 'Standard', 'Deep', 'Comprehensive']),
  type: z.string().default('General'),
  status: z.enum(['started', 'planning', 'searching', 'analyzing', 'synthesis', 'completed', 'error']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
});

export const researchStepSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  step_type: z.enum(['planning', 'query_generation', 'searching', 'source_collection', 'content_extraction', 'source_evaluation', 'evidence_extraction', 'cross_checking', 'analysis', 'report_writing', 'citation_management']),
  status: z.enum(['pending', 'in_progress', 'completed', 'error']),
  details: z.record(z.string(), z.any()).optional().nullable(),
  created_at: z.string().datetime(),
  completed_at: z.string().datetime().optional().nullable(),
  error_message: z.string().optional().nullable(),
});

export type ResearchProjectRow = z.infer<typeof researchProjectSchema>;
export type ResearchStepRow = z.infer<typeof researchStepSchema>;
