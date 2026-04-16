/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module tools/csv
 * @description CSV processing tools - convert to/from CSV format, parse and validate CSV data.
 */

import type { CallToolResult } from '@/mcp/types.js';

/** CSV to JSON conversion tool */
export const csvToJsonTool = {
  name: 'csv_to_json',
  description: 'Convert CSV (Comma Separated Values) data to JSON format. Useful for data processing and API integration.',
  category: 'data-processing',

  inputSchema: {
    type: 'object',
    properties: {
      csv: {
        type: 'string',
        description: 'CSV data to convert (first row as headers)',
      },
      hasHeaders: {
        type: 'boolean',
        description: 'First row contains column headers',
      },
    },
    required: ['csv'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const csv = String(args.csv || '');
    const hasHeaders = Boolean(args.hasHeaders ?? true);

    if (!csv.trim()) {
      return {
        content: [{ type: 'text', text: '❌ Error: CSV data is required.' }],
        isError: true,
      };
    }

    try {
      const lines = csv
        .split(/\r?\n/)
        .filter(line => line.trim());

      if (lines.length === 0) {
        return {
          content: [{ type: 'text', text: '❌ Error: No valid CSV rows found.' }],
          isError: true,
        };
      }

      const parseLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());

        return result;
      };

      const parsedRows = lines.map(line => parseLine(line));

      let headers: string[];
      let dataRows: string[][];

      if (hasHeaders) {
        headers = parsedRows[0];
        dataRows = parsedRows.slice(1);
      } else {
        headers = parsedRows[0].map((_, idx) => `column_${idx}`);
        dataRows = parsedRows;
      }

      const objects = dataRows
        .filter(row => row.some(cell => cell.trim() !== ''))
        .map(row => {
          const obj: Record<string, unknown> = {};
          headers.forEach((header, idx) => {
            const value = row[idx] || '';

            if (/^\d+$/.test(value)) {
              obj[header] = parseInt(value, 10);
            } else if (/^\d+\.\d+$/.test(value)) {
              obj[header] = parseFloat(value);
            } else if (/^(true|false)$/i.test(value)) {
              obj[header] = value.toLowerCase() === 'true';
            } else {
              obj[header] = value;
            }
          });

          return obj;
        });

      const json = JSON.stringify(objects, null, 2);

      return {
        content: [{
          type: 'text',
          text: [
            `📊 CSV to JSON Conversion`,
            `────┬──────────`,
            `Headers:     ${headers.length}`,
            `Rows:        ${objects.length}`,
            `────┴──────────`,
            `JSON Output:`,
            ``,
            json,
          ].join('\n'),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Error parsing CSV: ${(error as Error).message}`,
        }],
        isError: true,
      };
    }
  },
};

/** JSON to CSV conversion tool */
export const jsonToCsvTool = {
  name: 'json_to_csv',
  description: 'Convert JSON array of objects to CSV format. Useful for exporting data or generating spreadsheet-compatible data.',
  category: 'data-processing',

  inputSchema: {
    type: 'object',
    properties: {
      json: {
        type: 'string',
        description: 'JSON array of objects to convert',
      },
      includeHeaders: {
        type: 'boolean',
        description: 'Include header row in output',
      },
      delimiter: {
        type: 'string',
        description: 'Column delimiter (default: comma)',
      },
    },
    required: ['json'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const json = String(args.json || '');
    const includeHeaders = Boolean(args.includeHeaders ?? true);
    const delimiter = String(args.delimiter ?? ',');

    if (!json.trim()) {
      return {
        content: [{ type: 'text', text: '❌ Error: JSON data is required.' }],
        isError: true,
      };
    }

    try {
      const parsed = JSON.parse(json);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        return {
          content: [{
            type: 'text',
            text: '❌ Error: JSON must be a non-empty array of objects.',
          }],
          isError: true,
        };
      }

      const objects = parsed.filter(item => typeof item === 'object' && item !== null);

      if (objects.length === 0) {
        return {
          content: [{
            type: 'text',
            text: '❌ Error: JSON array must contain objects.',
          }],
          isError: true,
        };
      }

      const headers = Array.from(
        new Set(objects.flatMap(Object.keys)),
      );

      const escapeCell = (value: unknown): string => {
        const str = value == null ? '' : String(value);
        const needsQuotes = str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r');

        if (needsQuotes) {
          return `"${str.replace(/"/g, '""')}"`;
        }

        return str;
      };

      let csvRows: string[] = [];

      if (includeHeaders) {
        csvRows.push(headers.map(h => escapeCell(h)).join(delimiter));
      }

      csvRows = [
        ...csvRows,
        ...objects.map(obj =>
          headers.map(h => escapeCell(obj[h] ?? '')).join(delimiter),
        ),
      ];

      const csv = csvRows.join('\n');

      return {
        content: [{
          type: 'text',
          text: [
            `📊 JSON to CSV Conversion`,
            `────┬──────────`,
            `Objects:     ${objects.length}`,
            `Columns:     ${headers.length}`,
            `Delimiter:   ${delimiter}`,
            `────┴──────────`,
            `CSV Output:`,
            ``,
            csv,
          ].join('\n'),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Error parsing JSON: ${(error as Error).message}`,
        }],
        isError: true,
      };
    }
  },
};
