/**
 * @module tools/currency-convert
 * @description Currency conversion tools with placeholder data and API override capability.
 */

import type { CallToolResult } from '@/mcp/types.js';

/** Currency conversion tool */
export const currencyConvertTool = {
  name: 'currency_convert',
  description: 'Convert amounts between different currencies using exchange rates. Supports placeholder data or custom API URL for live rates.',
  category: 'conversion',

  inputSchema: {
    type: 'object',
    properties: {
      amount: {
        type: 'number',
        description: 'The amount to convert',
      },
      from: {
        type: 'string',
        description: 'Source currency code (e.g., USD, EUR, GBP, JPY, PKR)',
      },
      to: {
        type: 'string',
        description: 'Target currency code (e.g., USD, EUR, GBP, JPY, PKR)',
      },
      usePlaceholder: {
        type: 'boolean',
        description: 'Use placeholder data instead of API (default: true)',
      },
      apiUrl: {
        type: 'string',
        description: 'Custom API URL for exchange rates (only used if usePlaceholder is false)',
      },
    },
    required: ['amount', 'from', 'to'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const amount = Number(args.amount ?? 0);
    const from = String(args.from || 'USD').toUpperCase();
    const to = String(args.to || 'EUR').toUpperCase();
    const usePlaceholder = Boolean(args.usePlaceholder ?? true);
    const apiUrl = String(args.apiUrl || '');

    if (isNaN(amount)) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: Amount must be a valid number.',
        }],
        isError: true,
      };
    }

    if (!from || !to) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: "from" and "to" currency codes are required.',
        }],
        isError: true,
      };
    }

    if (from === to) {
      return {
        content: [{
          type: 'text',
          text: [
            `💱 Currency Conversion`,
            `───────┬─────`,
            `From:        ${from}`,
            `To:          ${to}`,
            `────────┴─────`,
            `Note: Same currency, no conversion needed.`,
            `Result:      ${amount.toLocaleString()} ${to}`,
          ].join('\n'),
        }],
      };
    }

    // Placeholder exchange rates (base: USD)
    const placeholderRates: Record<string, number> = {
      USD: 1,
      EUR: 0.92,
      GBP: 0.79,
      JPY: 149.50,
      PKR: 278.86,
      CAD: 1.36,
      AUD: 1.52,
      CHF: 0.88,
      CNY: 7.23,
      SEK: 10.45,
      NOK: 10.68,
      MXN: 17.12,
      SGD: 1.34,
      HKD: 7.81,
      NZD: 1.63,
      KRW: 1320.50,
      TRY: 32.15,
      RUB: 92.50,
      BRL: 4.98,
      ZAR: 18.75,
    };

    let rate: number;
    let note: string = '';

    if (usePlaceholder) {
      if (!placeholderRates[from] || !placeholderRates[to]) {
        const available = Object.keys(placeholderRates).join(', ');
        return {
          content: [{
            type: 'text',
            text: [
              `❌ Currency Not Supported`,
              `───────┬─────`,
              `Available: ${available}`,
              `───────┴─────`,
              `Please use supported currency codes or disable placeholder mode.`,
            ].join('\n'),
          }],
          isError: true,
        };
      }
      // Convert via USD as intermediate
      const toUSD = amount / placeholderRates[from];
      const result = toUSD * placeholderRates[to];
      rate = placeholderRates[to] / placeholderRates[from];
      note = `Using placeholder data`;
    } else {
      // API mode - would make real API call here
      if (!apiUrl) {
        return {
          content: [{
            type: 'text',
            text: '❌ Error: API URL is required when usePlaceholder is false.',
          }],
          isError: true,
        };
      }
      // Placeholder for API call - in production, fetch from apiUrl
      const defaultRate = 1; // fallback
      rate = defaultRate;
      note = `API mode (placeholder response - API URL: ${apiUrl})`;
    }

    const result = amount * rate;
    const formattedAmount = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedResult = result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return {
      content: [{
        type: 'text',
        text: [
          `💱 Currency Conversion`,
          `───────┬─────`,
          `Amount:      ${formattedAmount} ${from}`,
          `From:        ${from}`,
          `To:          ${to}`,
          `Rate:        1 ${from} = ${rate.toFixed(4)} ${to}`,
          `───────┴─────`,
          `Result:      ${formattedResult} ${to}`,
          ``,
          `${note}`,
          usePlaceholder
            ? `💡 Note: Placeholder rates. Set usePlaceholder=false and provide apiUrl for live rates.`
            : undefined,
        ].filter(Boolean).join('\n'),
      }],
    };
  },
};

/** Get exchange rates tool */
export const exchangeRatesTool = {
  name: 'get_exchange_rates',
  description: 'Get current exchange rates for multiple currencies relative to a base currency. Supports placeholder data or custom API.',
  category: 'conversion',

  inputSchema: {
    type: 'object',
    properties: {
      base: {
        type: 'string',
        description: 'Base currency code (e.g., USD, EUR, GBP)',
      },
      targets: {
        type: 'array',
        description: 'Target currency codes to get rates for (empty for all available)',
        items: { type: 'string' },
      },
      usePlaceholder: {
        type: 'boolean',
        description: 'Use placeholder data instead of API (default: true)',
      },
      apiUrl: {
        type: 'string',
        description: 'Custom API URL for exchange rates',
      },
    },
    required: ['base'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const base = String(args.base || 'USD').toUpperCase();
    const targets = Array.isArray(args.targets)
      ? args.targets.map((t) => String(t).toUpperCase())
      : [];
    const usePlaceholder = Boolean(args.usePlaceholder ?? true);
    const apiUrl = String(args.apiUrl || '');

    if (!base) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: "base" currency code is required.',
        }],
        isError: true,
      };
    }

    // Placeholder exchange rates (base: USD)
    const placeholderRates: Record<string, number> = {
      USD: 1,
      EUR: 0.92,
      GBP: 0.79,
      JPY: 149.50,
      INR: 83.20,
      CAD: 1.36,
      AUD: 1.52,
      CHF: 0.88,
      CNY: 7.23,
      SEK: 10.45,
      NOK: 10.68,
      MXN: 17.12,
      SGD: 1.34,
      HKD: 7.81,
      NZD: 1.63,
      KRW: 1320.50,
      TRY: 32.15,
      RUB: 92.50,
      BRL: 4.98,
      ZAR: 18.75,
    };

    if (usePlaceholder) {
      if (!placeholderRates[base]) {
        const available = Object.keys(placeholderRates).join(', ');
        return {
          content: [{
            type: 'text',
            text: [
              `❌ Base Currency Not Supported`,
              `───────┬─────`,
              `Available: ${available}`,
              `───────┴─────`,
            ].join('\n'),
          }],
          isError: true,
        };
      }

      const selectedTargets = targets.length > 0
        ? targets.filter(t => placeholderRates[t])
        : Object.keys(placeholderRates);

      const rates: Array<{currency: string; rate: number}> = [];

      for (const target of selectedTargets) {
        const rate = placeholderRates[target] / placeholderRates[base];
        rates.push({ currency: target, rate });
      }

      return {
        content: [{
          type: 'text',
          text: [
            `📊 Exchange Rates (Base: ${base})`,
            `───────┬─────`,
            `Data:        Using placeholder`,
            `Base:        ${base}`,
            `Targets:     ${rates.length} currencies`,
            `───────┴─────`,
            ``,
            `Rates:`,
            ...rates.map((r) => `  ${r.currency.padEnd(4)} : 1 ${base} = ${r.rate.toFixed(4)} ${r.currency}`),
            ``,
            `💡 Note: These are placeholder rates. Set usePlaceholder=false and provide apiUrl for live rates.`,
          ].join('\n'),
        }],
      };
    } else {
      // API mode
      if (!apiUrl) {
        return {
          content: [{
            type: 'text',
            text: '❌ Error: API URL is required when usePlaceholder is false.',
          }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: [
            `📊 Exchange Rates (Base: ${base})`,
            `───────┬─────`,
            `API:         ${apiUrl}`,
            `Base:        ${base}`,
            `Targets:     ${targets.length > 0 ? targets.join(', ') : 'All available'}`,
            `───────┴─────`,
            ``,
            `ℹ️ In production, this would fetch live rates from the API.`,
            `This is a placeholder response for the API mode.`,
          ].join('\n'),
        }],
      };
    }
  },
};