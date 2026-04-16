/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module tools/hash
 * @description Hash and checksum generation tools.
 */

import type { CallToolResult } from '@/mcp/types.js';
import crypto from 'crypto';

/** Hash generation tool */
export const hashTool = {
  name: 'generate_hash',
  description: 'Generate cryptographic hash (MD5, SHA-1, SHA-256, SHA-512) from text or data. Useful for data integrity verification and checksums.',
  category: 'encoding',

  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The text or data to hash',
      },
      algorithm: {
        type: 'string',
        description: 'Hash algorithm to use',
        enum: ['md5', 'sha1', 'sha256', 'sha512', 'sha3-256', 'sha3-512'],
      },
      output: {
        type: 'string',
        description: 'Output format for the hash',
        enum: ['hex', 'base64'],
      },
    },
    required: ['text', 'algorithm'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const text = String(args.text || '');
    const algorithm = String(args.algorithm || 'sha256');
    const output = String(args.output || 'hex');

    if (!text) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: "text" parameter is required for hashing.',
        }],
        isError: true,
      };
    }

    try {
      const hash = crypto.createHash(algorithm);
      hash.update(text, 'utf8');
      const digest = hash.digest(output === 'base64' ? 'base64' : 'hex');

      return {
        content: [{
          type: 'text',
          text: [
            `🔐 Hash Generation (${algorithm.toUpperCase()})`,
            `──────────────────────`,
            `Algorithm:   ${algorithm.toUpperCase()}`,
            `Input:       "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
            `Input size:  ${text.length} chars`,
            `Output:      ${output.toUpperCase()}`,
            `──────────────────────`,
            `Hash:`,
            `${digest}`,
          ].join('\n'),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Error: Failed to generate hash. ${(error as Error).message}`,
        }],
        isError: true,
      };
    }
  },
};

/** Checksum verification tool */
export const checksumVerifyTool = {
  name: 'verify_checksum',
  description: 'Verify data integrity by comparing expected and calculated checksums. Supports MD5, SHA-1, SHA-256, and SHA-512.',
  category: 'encoding',

  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The text or data to verify',
      },
      expectedChecksum: {
        type: 'string',
        description: 'The expected checksum value to compare against',
      },
      algorithm: {
        type: 'string',
        description: 'Hash algorithm used for the checksum',
        enum: ['md5', 'sha1', 'sha256', 'sha512'],
      },
    },
    required: ['text', 'expectedChecksum', 'algorithm'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const text = String(args.text || '');
    const expectedChecksum = String(args.expectedChecksum || '').toLowerCase().trim();
    const algorithm = String(args.algorithm || 'sha256');

    if (!text || !expectedChecksum) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: "text" and "expectedChecksum" parameters are required.',
        }],
        isError: true,
      };
    }

    try {
      const hash = crypto.createHash(algorithm);
      hash.update(text, 'utf8');
      const calculatedChecksum = hash.digest('hex');
      const matches = calculatedChecksum.toLowerCase() === expectedChecksum.toLowerCase();

      return {
        content: [{
          type: 'text',
          text: [
            `✅ Checksum Verification (${algorithm.toUpperCase()})`,
            `──────────────────────────────`,
            `Expected:   ${expectedChecksum}`,
            `Calculated: ${calculatedChecksum}`,
            `──────────────────────────────`,
            `Status: ${matches ? '✓ VERIFIED - Checksum matches!' : '✗ FAILED - Checksum does not match!'}`,
          ].join('\n'),
        }],
        isError: !matches,
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Error: Failed to verify checksum. ${(error as Error).message}`,
        }],
        isError: true,
      };
    }
  },
};
