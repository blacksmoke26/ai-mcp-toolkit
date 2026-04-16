/**
 * @module tools/number-validate
 * @description Number validation and type checking tools for verifying numeric values and constraints.
 */

import type {CallToolResult} from '@/mcp/types.js';

/** Number validation tool */
export const numberValidateTool = {
  name: 'validate_number',
  description: 'Validate if a value is a valid number and check various numeric properties (integer, positive, negative, even, odd, prime, within range).',
  category: 'validation',

  inputSchema: {
    type: 'object',
    properties: {
      value: {
        type: 'string',
        description: 'The value to validate as a number',
      },
      checks: {
        type: 'array',
        description: 'List of validation checks to perform',
        items: {
          type: 'string',
          enum: ['isNumber', 'isInteger', 'isPositive', 'isNegative', 'isEven', 'isOdd', 'isPrime', 'isWithinRange', 'isFloat'],
        },
      },
      min: {
        type: 'number',
        description: 'Minimum value for range check',
      },
      max: {
        type: 'number',
        description: 'Maximum value for range check',
      },
    },
    required: ['value'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const value = String(args.value || '');
    const checks = Array.isArray(args.checks)
      ? args.checks.map((c) => String(c))
      : ['isNumber', 'isInteger', 'isPositive', 'isNegative'];

    const min = args.min !== undefined ? Number(args.min) : undefined;
    const max = args.max !== undefined ? Number(args.max) : undefined;

    if (!value.trim()) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: Value cannot be empty.',
        }],
        isError: true,
      };
    }

    const parsedValue = Number(value);
    const isValidNumber = !isNaN(parsedValue) && isFinite(parsedValue);

    const results: Record<string, { valid: boolean; message: string }> = {
      isNumber: {valid: isValidNumber, message: isValidNumber ? '✓ Valid number' : '✗ Not a valid number'},
      isInteger: {valid: isValidNumber && Number.isInteger(parsedValue), message: ''},
      isPositive: {valid: isValidNumber && parsedValue > 0, message: ''},
      isNegative: {valid: isValidNumber && parsedValue < 0, message: ''},
      isEven: {valid: isValidNumber && Number.isInteger(parsedValue) && parsedValue % 2 === 0, message: ''},
      isOdd: {valid: isValidNumber && Number.isInteger(parsedValue) && parsedValue % 2 !== 0, message: ''},
      isPrime: {valid: false, message: ''},
      isFloat: {valid: isValidNumber && !Number.isInteger(parsedValue), message: ''},
      isWithinRange: {valid: false, message: ''},
    };

    // Prime check
    if (isValidNumber && Number.isInteger(parsedValue) && parsedValue > 1) {
      let isPrime = true;
      const sqrt = Math.sqrt(parsedValue);
      for (let i = 2; i <= sqrt; i++) {
        if (parsedValue % i === 0) {
          isPrime = false;
          break;
        }
      }
      results.isPrime = {valid: isPrime, message: ''};
    } else if (isValidNumber) {
      results.isPrime = {valid: false, message: ''};
    }

    // Range check
    if (min !== undefined && max !== undefined) {
      results.isWithinRange = {
        valid: isValidNumber && parsedValue >= min && parsedValue <= max,
        message: '',
      };
    }

    // Add messages
    results.isInteger.message = results.isInteger.valid ? '✓ Is integer' : '✗ Not an integer';
    results.isPositive.message = results.isPositive.valid ? '✓ Is positive (> 0)' : '✗ Not positive';
    results.isNegative.message = results.isNegative.valid ? '✓ Is negative (< 0)' : '✗ Not negative';
    results.isEven.message = results.isEven.valid ? '✓ Is even' : '✗ Not even';
    results.isOdd.message = results.isOdd.valid ? '✓ Is odd' : '✗ Not odd';
    results.isPrime.message = results.isPrime.valid ? '✓ Is prime' : '✗ Not prime';
    results.isFloat.message = results.isFloat.valid ? '✓ Is floating-point' : '✗ Not a float';
    results.isWithinRange.message = results.isWithinRange.valid
      ? `✓ Within range [${min}, ${max}]`
      : `✗ Not within range [${min}, ${max}]`;

    const requestedChecks = checks.filter((check) => check in results);
    const displayResults = requestedChecks.map((check) => `  ${results[check].message}`);

    return {
      content: [{
        type: 'text',
        text: [
          `🔢 Number Validation`,
          `────┬───────`,
          `Input:         "${value}"`,
          `Parsed:        ${isValidNumber ? parsedValue : 'Invalid'}`,
          `Type:          ${isValidNumber ? typeof parsedValue : 'N/A'}`,
          `────┴───────`,
          ``,
          `Validation Results:`,
          ...displayResults,
          ``,
          `Summary:`,
          `  Valid number: ${isValidNumber ? 'Yes ✓' : 'No ✗'}`,
          `  Passed checks: ${requestedChecks.filter(c => results[c].valid).length}/${requestedChecks.length}`,
        ].join('\n'),
      }],
      isError: !isValidNumber,
    };
  },
};

/** Type checking tool */
export const typeCheckTool = {
  name: 'check_type',
  description: 'Check the JavaScript type of a value. Supports checking strings, numbers, booleans, arrays, objects, null, and undefined.',
  category: 'validation',

  inputSchema: {
    type: 'object',
    properties: {
      value: {
        type: 'string',
        description: 'The value to check (as JSON string or plain text)',
      },
      expectedType: {
        type: 'string',
        description: 'Expected type to validate against',
        enum: ['string', 'number', 'boolean', 'array', 'object', 'null', 'undefined'],
      },
    },
    required: ['value'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const valueStr = String(args.value || '');
    const expectedType = String(args.expectedType || '');

    let parsedValue: unknown;
    let isParsedAsJson = false;
    let parseError: string | null = null;

    // Try to parse as JSON first
    try {
      parsedValue = JSON.parse(valueStr);
      isParsedAsJson = true;
    } catch {
      // If not valid JSON, use as plain string
      parsedValue = valueStr;
      isParsedAsJson = false;
    }

    const actualType = Array.isArray(parsedValue) ? 'array' : typeof parsedValue;
    const typeMatches = expectedType === '' || actualType === expectedType;

    return {
      content: [{
        type: 'text',
        text: [
          `🔍 Type Checking`,
          `────┬───────`,
          `Input:         "${valueStr.substring(0, 50)}${valueStr.length > 50 ? '...' : ''}"`,
          `Parsed as JSON:${isParsedAsJson ? ' Yes' : ' No'}`,
          `─┴──────────`,
          `Actual Type:   ${actualType}`,
          expectedType
            ? `Expected Type: ${expectedType}`
            : undefined,
          expectedType
            ? `Type Match:    ${typeMatches ? '✓ Yes' : '✗ No'}`
            : undefined,
          `─┴──────────`,
          ``,
          `Type Details:`,
          `  typeof:        ${typeof parsedValue}`,
          `  Array.isArray: ${Array.isArray(parsedValue)}`,
          `  is null:       ${parsedValue === null}`,
          `  is undefined:  ${parsedValue === undefined}`,
          ``,
          `Type Category:`,
          actualType === 'string' ? '  Text/String data' :
            actualType === 'number' ? '  Numeric data' :
              actualType === 'boolean' ? '  Boolean/Logical data' :
                actualType === 'array' ? '  Array/Collection' :
                  actualType === 'object' ? '  Object/Dictionary' :
                    parsedValue === null ? '  Null/Empty value' :
                      actualType === 'undefined' ? '  Undefined/Missing' :
                        '  Unknown type',
          ``,
          !typeMatches && expectedType
            ? `⚠️ Type mismatch: Expected "${expectedType}" but got "${actualType}"`
            : undefined,
        ].filter(Boolean).join('\n'),
      }],
      isError: !typeMatches && expectedType !== '',
    };
  },
};
