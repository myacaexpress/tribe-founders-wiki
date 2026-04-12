import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function runAgent(prompt: string, context?: string): Promise<string> {
  // TODO: Implement agent calls for Phase 2
  // - Meeting transcript processing
  // - Pre-meeting brief generation
  // - Email watcher analysis
  // - Commitment extraction
  throw new Error('Agent not yet configured. Set ANTHROPIC_API_KEY in environment.');
}

export { anthropic };
