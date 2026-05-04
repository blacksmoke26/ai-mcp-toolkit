/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import type {RegisteredPrompt} from './registry';

/**
 * Sample array of prompt definitions for demonstration purposes.
 * These prompts can be registered with the promptRegistry to provide
 * reusable templates for various LLM interactions.
 */
export const samplePrompts: RegisteredPrompt[] = [
  {
    name: 'summarize',
    description: 'Summarizes the provided text into a concise overview.',
    arguments: [
      {
        name: 'text',
        description: 'The text content to summarize.',
        required: true,
      },
      {
        name: 'length',
        description: 'Target length of the summary (e.g., "short", "medium", "long").',
        required: false,
      },
    ],
    async handler(args) {
      const {text, length = 'medium'} = args as { text: string; length?: string };
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please summarize the following text in a ${length} format:\n\n${text}`,
            },
          },
        ],
      };
    },
  },
  {
    name: 'translate',
    description: 'Translates the given text into the specified target language.',
    arguments: [
      {
        name: 'text',
        description: 'The text content to translate.',
        required: true,
      },
      {
        name: 'targetLanguage',
        description: 'The ISO code or name of the language to translate into.',
        required: true,
      },
    ],
    async handler(args) {
      const {text, targetLanguage} = args as { text: string; targetLanguage: string };
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Translate the following text into ${targetLanguage}:\n\n${text}`,
            },
          },
        ],
      };
    },
  },
  {
    name: 'codeReview',
    description: 'Analyzes code snippets for potential bugs, style issues, and improvements.',
    arguments: [
      {
        name: 'code',
        description: 'The source code to review.',
        required: true,
      },
      {
        name: 'language',
        description: 'The programming language of the code.',
        required: true,
      },
    ],
    async handler(args) {
      const {code, language} = args as { code: string; language: string };
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Review the following ${language} code for potential bugs, style issues, and improvements:\n\n\`\`\`${language}\n${code}\n\`\`\``,
            },
          },
        ],
      };
    },
  },
  {
    name: 'emailDraft',
    description: 'Drafts a professional email based on a topic and key points.',
    arguments: [
      {
        name: 'topic',
        description: 'The subject or topic of the email.',
        required: true,
      },
      {
        name: 'points',
        description: 'A list of key points to include in the email body.',
        required: true,
      },
      {
        name: 'tone',
        description: 'The tone of the email (e.g., "formal", "casual", "persuasive").',
        required: false,
      },
    ],
    async handler(args) {
      const {topic, points, tone = 'professional'} = args as unknown as {
        topic: string;
        points: string[];
        tone?: string
      };
      const pointsList = Array.isArray(points) ? points.join('\n- ') : points;
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Draft a ${tone} email with the subject "${topic}". Include the following key points:\n- ${pointsList}`,
            },
          },
        ],
      };
    },
  },
];
