/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module tools/date-diff
 * @description Date difference and age calculation tools for calculating time spans between dates.
 */

import type { CallToolResult } from '@/mcp/types.js';

/** Date difference calculation tool */
export const dateDiffTool = {
  name: 'date_difference',
  description: 'Calculate the difference between two dates in various units (years, months, weeks, days, hours, minutes, seconds).',
  category: 'date-time',

  inputSchema: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'The start date (ISO 8601 format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)',
      },
      endDate: {
        type: 'string',
        description: 'The end date (ISO 8601 format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)',
      },
      unit: {
        type: 'string',
        description: 'Primary unit for the result',
        enum: ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'],
      },
    },
    required: ['startDate', 'endDate'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const startDateStr = String(args.startDate || '');
    const endDateStr = String(args.endDate || '');
    const unit = String(args.unit || 'days');

    if (!startDateStr || !endDateStr) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: "startDate" and "endDate" parameters are required.',
        }],
        isError: true,
      };
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: Invalid date format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss).',
        }],
        isError: true,
      };
    }

    const diffMs = endDate.getTime() - startDate.getTime();
    const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30.44);
    const diffYears = Math.floor(diffDays / 365.25);

    const isPast = diffMs < 0;
    const unitLabel = unit.charAt(0).toUpperCase() + unit.slice(1);

    return {
      content: [{
        type: 'text',
        text: [
          `📅 Date Difference Calculator`,
          `───────┬──────────────────`,
          `Start:     ${startDate.toISOString()}`,
          `End:       ${endDate.toISOString()}`,
          `Direction: ${isPast ? 'Past' : 'Future'}`,
          `───────┴──────────────────`,
          `Results:`,
          `  Years:    ${Math.abs(diffYears)} ${Math.abs(diffYears) === 1 ? 'year' : 'years'}`,
          `  Months:   ${Math.abs(diffMonths)} ${Math.abs(diffMonths) === 1 ? 'month' : 'months'}`,
          `  Weeks:    ${Math.abs(diffWeeks)} ${Math.abs(diffWeeks) === 1 ? 'week' : 'weeks'}`,
          `  Days:     ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'day' : 'days'}`,
          `  Hours:    ${Math.abs(diffHours)} ${Math.abs(diffHours) === 1 ? 'hour' : 'hours'}`,
          `  Minutes:  ${Math.abs(diffMinutes)} ${Math.abs(diffMinutes) === 1 ? 'minute' : 'minutes'}`,
          `  Seconds:  ${Math.abs(diffSeconds)} ${Math.abs(diffSeconds) === 1 ? 'second' : 'seconds'}`,
          ``,
          // @ts-ignore
          `Primary (${unit}): ${Math.abs(diffYears, diffMonths, diffWeeks, diffDays, diffHours, diffMinutes, diffSeconds)[unit === 'years' ? 0 : unit === 'months' ? 1 : unit === 'weeks' ? 2 : unit === 'days' ? 3 : unit === 'hours' ? 4 : unit === 'minutes' ? 5 : 6]}`,
        ].join('\n'),
      }],
    };
  },
};

/** Age calculation tool */
export const ageCalculateTool = {
  name: 'calculate_age',
  description: 'Calculate the exact age of a person from their birth date in years, months, and days.',
  category: 'date-time',

  inputSchema: {
    type: 'object',
    properties: {
      birthDate: {
        type: 'string',
        description: 'Birth date in ISO 8601 format (YYYY-MM-DD)',
      },
      referenceDate: {
        type: 'string',
        description: 'Reference date for calculation (defaults to today)',
      },
    },
    required: ['birthDate'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const birthDateStr = String(args.birthDate || '');
    const referenceDateStr = String(args.referenceDate || '');

    if (!birthDateStr) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: "birthDate" parameter is required.',
        }],
        isError: true,
      };
    }

    const birthDate = new Date(birthDateStr);
    const referenceDate = referenceDateStr ? new Date(referenceDateStr) : new Date();

    if (isNaN(birthDate.getTime())) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: Invalid birth date format. Use ISO 8601 format (YYYY-MM-DD).',
        }],
        isError: true,
      };
    }

    if (referenceDateStr && isNaN(referenceDate.getTime())) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: Invalid reference date format. Use ISO 8601 format (YYYY-MM-DD).',
        }],
        isError: true,
      };
    }

    let years = referenceDate.getFullYear() - birthDate.getFullYear();
    let months = referenceDate.getMonth() - birthDate.getMonth();
    let days = referenceDate.getDate() - birthDate.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    const totalDays = Math.floor((referenceDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.floor(totalDays / 7);

    return {
      content: [{
        type: 'text',
        text: [
          `🎂 Age Calculator`,
          `───────┬──────────────────`,
          `Born:        ${birthDate.toISOString().split('T')[0]}`,
          `Reference:   ${referenceDate.toISOString().split('T')[0]}`,
          `───────┴──────────────────`,
          ``,
          `Age:`,
          `  ${years} year${years === 1 ? '' : 's'}`,
          `  ${months} month${months === 1 ? '' : 's'}`,
          `  ${days} day${days === 1 ? '' : 's'}`,
          ``,
          `Total:`,
          `  ${totalDays.toLocaleString()} days`,
          `  ${totalWeeks.toLocaleString()} weeks`,
        ].join('\n'),
      }],
    };
  },
};
