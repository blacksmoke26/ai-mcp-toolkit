/**
 * @module tools/weather
 * @description Weather information tool — demonstrates building a custom MCP tool.
 * 
 * This tool provides simulated weather data. In a real implementation,
 * you would connect to a weather API (OpenWeatherMap, WeatherAPI, etc.).
 * 
 * ## Registering This Tool
 * 
 * This tool is auto-registered in `src/index.ts`. To register it manually:
 * 
 * ```typescript
 * import { weatherTool } from './tools/weather';
 * import { toolRegistry } from '@/mcp/tools/registry';
 * 
 * toolRegistry.register(weatherTool);
 * ```
 * 
 * ## MCP Tool Definition
 * 
 * Once registered, the tool is available via the MCP protocol:
 * 
 * ```json
 * {
 *   "name": "get_weather",
 *   "description": "Get current weather for a city",
 *   "inputSchema": {
 *     "type": "object",
 *     "properties": {
 *       "city": { "type": "string" }
 *     },
 *     "required": ["city"]
 *   }
 * }
 * ```
 */

import type { CallToolResult } from '@/mcp/types.js';

/**
 * Simulated weather data for demo purposes.
 * Replace this with a real API call in production.
 */
const WEATHER_DATA: Record<string, { temp: number; condition: string; humidity: number; wind: number }> = {
  'new york': { temp: 22, condition: 'Partly Cloudy', humidity: 65, wind: 12 },
  'london': { temp: 15, condition: 'Rainy', humidity: 80, wind: 20 },
  'tokyo': { temp: 28, condition: 'Sunny', humidity: 55, wind: 8 },
  'paris': { temp: 18, condition: 'Cloudy', humidity: 70, wind: 15 },
  'sydney': { temp: 25, condition: 'Sunny', humidity: 50, wind: 10 },
  'dubai': { temp: 38, condition: 'Hot & Sunny', humidity: 30, wind: 5 },
  'mumbai': { temp: 32, condition: 'Humid', humidity: 85, wind: 12 },
  'karachi': { temp: 35, condition: 'Sunny', humidity: 60, wind: 14 },
};

export const weatherTool = {
  name: 'get_weather',
  description: 'Get the current weather conditions for a specified city. Returns temperature, condition, humidity, and wind speed.',
  category: 'external-api',

  inputSchema: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: 'City name to get weather for (e.g., "New York", "London")',
      },
      units: {
        type: 'string',
        description: 'Temperature units: "celsius" or "fahrenheit"',
        enum: ['celsius', 'fahrenheit'],
      },
    },
    required: ['city'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const city = String(args.city || '').toLowerCase().trim();
    const units = String(args.units || 'celsius');

    if (!city) {
      return {
        content: [{ type: 'text', text: 'Error: "city" parameter is required.' }],
        isError: true,
      };
    }

    const data = WEATHER_DATA[city];

    if (!data) {
      // In a real implementation, you'd call a weather API here
      const availableCities = Object.keys(WEATHER_DATA).map((c) => c.charAt(0).toUpperCase() + c.slice(1));
      return {
        content: [{
          type: 'text',
          text: `Weather data not available for "${city}". Available cities: ${availableCities.join(', ')}. In production, this would call a real weather API.`,
        }],
        isError: true,
      };
    }

    const temp = units === 'fahrenheit'
      ? Math.round(data.temp * 9 / 5 + 32)
      : data.temp;
    const unitSymbol = units === 'fahrenheit' ? '°F' : '°C';

    return {
      content: [{
        type: 'text',
        text: [
          `📍 ${city.charAt(0).toUpperCase() + city.slice(1)}`,
          `🌡️  Temperature: ${temp}${unitSymbol}`,
          `☁️  Condition: ${data.condition}`,
          `💧 Humidity: ${data.humidity}%`,
          `💨 Wind: ${data.wind} km/h`,
        ].join('\n'),
      }],
    };
  },
};
