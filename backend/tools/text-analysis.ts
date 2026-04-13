/**
 * @module tools/text-analysis
 * @description Text analysis tools — word count, sentiment, summarization, etc.
 * 
 * Demonstrates registering multiple tools from a single module.
 */

import type { CallToolResult } from '@/mcp/types.js';

/** Word and character count tool */
export const wordCountTool = {
  name: 'word_count',
  description: 'Count words, characters, sentences, and paragraphs in a text. Useful for content analysis and editing.',
  category: 'text-processing',

  inputSchema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'The text to analyze' },
    },
    required: ['text'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const text = String(args.text || '');

    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    const sentences = text.trim() ? text.split(/[.!?]+/).filter((s) => s.trim()).length : 0;
    const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter((p) => p.trim()).length : 0;
    const avgWordLength = words > 0 ? (charactersNoSpaces / words).toFixed(1) : 0;
    const readingTimeMin = Math.ceil(words / 200);

    return {
      content: [{
        type: 'text',
        text: [
          `📊 Text Analysis Results`,
          `─────────────────────`,
          `📝 Words:           ${words.toLocaleString()}`,
          `🔤 Characters:      ${characters.toLocaleString()}`,
          `📏 Chars (no space): ${charactersNoSpaces.toLocaleString()}`,
          `📄 Sentences:       ${sentences}`,
          `📋 Paragraphs:      ${paragraphs}`,
          `📐 Avg word length: ${avgWordLength}`,
          `⏱️  Reading time:    ~${readingTimeMin} min`,
        ].join('\n'),
      }],
    };
  },
};

/** Text case transformation tool */
export const textTransformTool = {
  name: 'text_transform',
  description: 'Transform text case: uppercase, lowercase, title case, sentence case, camelCase, snake_case, kebab-case.',
  category: 'text-processing',

  inputSchema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Text to transform' },
      transform: {
        type: 'string',
        description: 'Transformation to apply',
        enum: ['uppercase', 'lowercase', 'title', 'sentence', 'camelCase', 'snake_case', 'kebab-case', 'reverse'],
      },
    },
    required: ['text', 'transform'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const text = String(args.text || '');
    const transform = String(args.transform || '');

    let result: string;

    switch (transform) {
      case 'uppercase':
        result = text.toUpperCase();
        break;
      case 'lowercase':
        result = text.toLowerCase();
        break;
      case 'title':
        result = text.replace(/\b\w/g, (c) => c.toUpperCase());
        break;
      case 'sentence':
        result = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        break;
      case 'camelCase':
        result = text
          .toLowerCase()
          .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase());
        break;
      case 'snake_case':
        result = text
          .replace(/\s+/g, '_')
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          .toLowerCase();
        break;
      case 'kebab-case':
        result = text
          .replace(/\s+/g, '-')
          .replace(/([a-z])([A-Z])/g, '$1-$2')
          .toLowerCase();
        break;
      case 'reverse':
        result = text.split('').reverse().join('');
        break;
      default:
        result = `Unknown transform: ${transform}`;
    }

    return {
      content: [{ type: 'text', text: result }],
    };
  },
};
