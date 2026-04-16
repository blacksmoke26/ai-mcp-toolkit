/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

 export interface ToolTemplate {
   /**
    * The unique name identifier for the tool template.
    * @example 'Simple Math Operation'
    */
   name: string;
   /**
    * A brief description of what the tool template does.
    * @example 'A basic calculator that performs arithmetic operations.'
    */
   description: string;
   /**
    * The code configuration for the tool, including metadata and implementation details.
    */
   code: {
     /**
      * The technical name/ID used for the tool (e.g., for function calls).
      * @example 'simple_calculator'
      */
     name: string;
     /**
      * The human-readable display name for the UI.
      * @example 'Simple Calculator'
      */
     displayName: string;
     /**
      * A detailed description of the tool's functionality.
      * @example 'Performs basic arithmetic operations (add, subtract, multiply, divide).'
      */
     description: string;
     /**
      * The JSON schema defining the input arguments for the tool, stringified.
      * @example '{"type": "object", "properties": {...}}'
      */
     inputSchema: string;
     /**
      * The executable JavaScript code for the tool's handler function.
      * @example 'const { a, b } = args; return { content: [...] };'
      */
     handlerCode: string;
     /**
      * The category the tool belongs to (e.g., 'math', 'text', 'utility').
      * @example 'math'
      */
     category: string;
     /**
      * An emoji icon representing the tool.
      * @example '🧮'
      */
     icon: string;
   };
 }

 /**
  * A collection of predefined tool templates.
  * These templates define the structure, metadata, and executable code
  * for various utility tools such as calculators, formatters, and generators.
  */
 const customToolsTemplates: ToolTemplate[] = [
  // --- 1. Simple Math Operation ---
  {
    name: 'Simple Math Operation',
    description: 'A basic calculator that performs arithmetic operations.',
    code: {
      name: 'simple_calculator',
      displayName: 'Simple Calculator',
      description: 'Performs basic arithmetic operations (add, subtract, multiply, divide).',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          a: {type: 'number', description: 'First number'},
          b: {type: 'number', description: 'Second number'},
          operation: {
            type: 'string',
            enum: ['add', 'subtract', 'multiply', 'divide'],
            description: 'Operation to perform',
          },
        },
        required: ['a', 'b', 'operation'],
      }, null, 2),
      handlerCode: `const { a, b, operation } = args;
const results = {
  add: a + b,
  subtract: a - b,
  multiply: a * b,
  divide: b !== 0 ? a / b : "Error: Division by zero"
};
return {
  content: [{ type: 'text', text: \`\${operation}(\${a}, \${b}) = \${results[operation]}\` }]
};`,
      category: 'math',
      icon: '🧮',
    },
  },
  // --- 2. String Transformation ---
  {
    name: 'String Transformation',
    description: 'Transforms strings with various operations.',
    code: {
      name: 'string_transformer',
      displayName: 'String Transformer',
      description: 'Transforms a string using various operations (uppercase, lowercase, reverse, etc.).',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          text: {type: 'string', description: 'Text to transform'},
          operation: {
            type: 'string',
            enum: ['uppercase', 'lowercase', 'reverse', 'length'],
            description: 'Transformation operation',
          },
        },
        required: ['text', 'operation'],
      }, null, 2),
      handlerCode: `const { text, operation } = args;
const results = {
  uppercase: text.toUpperCase(),
  lowercase: text.toLowerCase(),
  reverse: text.split('').reverse().join(''),
  length: text.length.toString()
};
return {
  content: [{ type: 'text', text: \`\${operation}(\${text}) = \${results[operation]}\` }]
};`,
      category: 'text',
      icon: '📝',
    },
  },
  // --- 3. Random Number Generator ---
  {
    name: 'Random Number Generator',
    description: 'Generates random numbers within a range.',
    code: {
      name: 'random_number',
      displayName: 'Random Number Generator',
      description: 'Generates a random number between min and max values.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          min: {type: 'number', description: 'Minimum value (inclusive)', default: 0},
          max: {type: 'number', description: 'Maximum value (inclusive)', default: 100},
          decimals: {type: 'boolean', description: 'Allow decimal results', default: false},
        },
        required: ['min', 'max'],
      }, null, 2),
      handlerCode: `const { min, max, decimals = false } = args;
const random = Math.random() * (max - min) + min;
const result = decimals ? random : Math.round(random);
return {
  content: [{ type: 'text', text: \`Random number between \${min} and \${max}: \${result}\` }]
};`,
      category: 'utility',
      icon: '🎲',
    },
  },
  // --- 4. HTTP Request Helper ---
  {
    name: 'HTTP Request Helper',
    description: 'Makes HTTP requests to external APIs.',
    code: {
      name: 'http_helper',
      displayName: 'HTTP Helper',
      description: 'Makes HTTP requests (GET only) to external endpoints.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          url: {type: 'string', description: 'URL to fetch'},
          method: {type: 'string', enum: ['GET'], description: 'HTTP method', default: 'GET'},
        },
        required: ['url'],
      }, null, 2),
      handlerCode: `const { url, method = 'GET' } = args;
try {
  const response = await fetch(url, { method });
  const data = await response.text();
  return {
    content: [{
      type: 'text',
      text: \`HTTP \${method} \${url}: \${response.status} \${data.substring(0, 500)}\`
    }]
  };
} catch (error) {
  return {
    content: [{ type: 'text', text: \`Error: \${error.message}\` }],
    isError: true
  };
}`,
      category: 'network',
      icon: '🌐',
    },
  },
  // --- 5. Data Parser ---
  {
    name: 'Data Parser',
    description: 'Parses JSON or CSV data.',
    code: {
      name: 'data_parser',
      displayName: 'Data Parser',
      description: 'Parses JSON or CSV data and returns structured results.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          data: {type: 'string', description: 'Data to parse (JSON or CSV)'},
          format: {type: 'string', enum: ['json', 'csv'], description: 'Data format'},
        },
        required: ['data', 'format'],
      }, null, 2),
      handlerCode: `const { data, format } = args;
try {
  let parsed;
  if (format === 'json') {
    parsed = JSON.parse(data);
  } else {
    const lines = data.split('\\n');
    const headers = lines[0].split(',').map(h => h.trim());
    parsed = lines.slice(1).map(line => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ''; });
      return obj;
    }).filter(o => Object.keys(o).length > 0);
  }
  return {
    content: [{ type: 'text', text: \`Parsed \${format.toUpperCase()}: \${JSON.stringify(parsed)}\` }]
  };
} catch (error) {
  return {
    content: [{ type: 'text', text: \`Parse error: \${error.message}\` }],
    isError: true
  };
}`,
      category: 'data',
      icon: '📊',
    },
  },

  // ==========================================
  // NEW TEMPLATES START HERE
  // ==========================================

  // --- 6. UUID Generator ---
  {
    name: 'UUID Generator',
    description: 'Generates a random UUID (v4).',
    code: {
      name: 'uuid_generator',
      displayName: 'UUID Generator',
      description: 'Generates a random universally unique identifier (UUID).',
      inputSchema: JSON.stringify({type: 'object', properties: {}}, null, 2),
      handlerCode: `return {
  content: [{ type: 'text', text: crypto.randomUUID() }]
};`,
      category: 'utility',
      icon: '🔑',
    },
  },

  // --- 7. Base64 Encoder ---
  {
    name: 'Base64 Encoder',
    description: 'Encodes a string to Base64 format.',
    code: {
      name: 'base64_encode',
      displayName: 'Base64 Encode',
      description: 'Encodes a plain text string into Base64.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          text: {type: 'string', description: 'Text to encode'},
        },
        required: ['text'],
      }, null, 2),
      handlerCode: `const { text } = args;
const encoded = Buffer.from(text).toString('base64');
return {
  content: [{ type: 'text', text: \`\${encoded}\` }]
};`,
      category: 'encoding',
      icon: '🔐',
    },
  },

  // --- 8. Base64 Decoder ---
  {
    name: 'Base64 Decoder',
    description: 'Decodes a Base64 string back to text.',
    code: {
      name: 'base64_decode',
      displayName: 'Base64 Decode',
      description: 'Decodes a Base64 string back to plain text.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          text: {type: 'string', description: 'Base64 string to decode'},
        },
        required: ['text'],
      }, null, 2),
      handlerCode: `const { text } = args;
try {
  const decoded = Buffer.from(text, 'base64').toString('utf-8');
  return {
    content: [{ type: 'text', text: \`\${decoded}\` }]
  };
} catch (error) {
  return { content: [{ type: 'text', text: "Error decoding Base64 string." }], isError: true };
}`,
      category: 'encoding',
      icon: '🔓',
    },
  },

  // --- 9. URL Encoder ---
  {
    name: 'URL Encoder',
    description: 'Encodes a string for use in a URL.',
    code: {
      name: 'url_encode',
      displayName: 'URL Encode',
      description: 'Encodes special characters in a string for URL safety.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          text: {type: 'string', description: 'String to encode'},
        },
        required: ['text'],
      }, null, 2),
      handlerCode: `const { text } = args;
return {
  content: [{ type: 'text', text: encodeURIComponent(text) }]
};`,
      category: 'encoding',
      icon: '🔗',
    },
  },

  // --- 10. URL Decoder ---
  {
    name: 'URL Decoder',
    description: 'Decodes a URL-encoded string.',
    code: {
      name: 'url_decode',
      displayName: 'URL Decode',
      description: 'Decodes a URL-encoded string back to plain text.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          text: {type: 'string', description: 'String to decode'},
        },
        required: ['text'],
      }, null, 2),
      handlerCode: `const { text } = args;
try {
  return {
    content: [{ type: 'text', text: decodeURIComponent(text) }]
  };
} catch (error) {
  return { content: [{ type: 'text', text: "Error decoding URL string." }], isError: true };
}`,
      category: 'encoding',
      icon: '🔗',
    },
  },

  // --- 11. Current Date & Time ---
  {
    name: 'Current Date & Time',
    description: 'Gets the current date and time in various formats.',
    code: {
      name: 'current_time',
      displayName: 'Current Time',
      description: 'Returns the current date and time.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          timezone: {type: 'string', description: 'Time zone (e.g., \'UTC\', \'America/New_York\')', default: 'UTC'},
        },
      }, null, 2),
      handlerCode: `const now = new Date();
return {
  content: [{
    type: 'text',
    text: \`Current Time (UTC): \${now.toISOString()}\nLocal: \${now.toLocaleString()}\`
  }]
};`,
      category: 'time',
      icon: '🕐',
    },
  },

  // --- 12. Timestamp Converter ---
  {
    name: 'Timestamp Converter',
    description: 'Converts Unix timestamp to human-readable date and vice versa.',
    code: {
      name: 'timestamp_converter',
      displayName: 'Timestamp Converter',
      description: 'Converts between Unix timestamps and date strings.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          input: {type: 'string', description: 'Unix timestamp (ms) or ISO date string'},
        },
        required: ['input'],
      }, null, 2),
      handlerCode: `const { input } = args;
const num = parseInt(input);
let result = '';
if (!isNaN(num)) {
  result = new Date(num).toISOString();
} else {
  result = new Date(input).getTime().toString();
}
return { content: [{ type: 'text', text: result }] };`,
      category: 'time',
      icon: '⏳',
    },
  },

  // --- 13. Countdown Calculator ---
  {
    name: 'Countdown Calculator',
    description: 'Calculates time remaining until a specific date.',
    code: {
      name: 'countdown',
      displayName: 'Countdown',
      description: 'Calculates days, hours, and minutes until a target date.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          targetDate: {type: 'string', description: 'Target date (YYYY-MM-DD)'},
        },
        required: ['targetDate'],
      }, null, 2),
      handlerCode: `const { targetDate } = args;
const target = new Date(targetDate);
const now = new Date();
const diff = target - now;
const days = Math.floor(diff / (1000 * 60 * 60 * 24));
return {
  content: [{ type: 'text', text: \`\${days} days remaining until \${targetDate}\` }]
};`,
      category: 'time',
      icon: '⏲️',
    },
  },

  // --- 14. Hex to RGB ---
  {
    name: 'Hex to RGB',
    description: 'Converts Hex color codes to RGB values.',
    code: {
      name: 'hex_to_rgb',
      displayName: 'Hex to RGB',
      description: 'Converts a hex color string to RGB format.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          hex: {type: 'string', description: 'Hex color code (e.g., #FF5733)'},
        },
        required: ['hex'],
      }, null, 2),
      handlerCode: `const { hex } = args;
const shorthandRegex = /^#?([a-f\\d])([a-f\\d])([a-f\\d])$/i;
const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(fullHex);
if (result) {
  const rgb = {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
  return { content: [{ type: 'text', text: \`rgb(\${rgb.r}, \${rgb.g}, \${rgb.b})\` }] };
}
return { content: [{ type: 'text', text: 'Invalid Hex format' }], isError: true };`,
      category: 'utility',
      icon: '🎨',
    },
  },

  // --- 15. RGB to Hex ---
  {
    name: 'RGB to Hex',
    description: 'Converts RGB values to Hex color codes.',
    code: {
      name: 'rgb_to_hex',
      displayName: 'RGB to Hex',
      description: 'Converts RGB values to a hex color string.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          r: {type: 'number', description: 'Red (0-255)'},
          g: {type: 'number', description: 'Green (0-255)'},
          b: {type: 'number', description: 'Blue (0-255)'},
        },
        required: ['r', 'g', 'b'],
      }, null, 2),
      handlerCode: `const { r, g, b } = args;
const toHex = (c) => {
  const hex = c.toString(16);
  return hex.length === 1 ? "0" + hex : hex;
};
const hex = "#" + toHex(r) + toHex(g) + toHex(b);
return { content: [{ type: 'text', text: hex.toUpperCase() }] };`,
      category: 'utility',
      icon: '🎨',
    },
  },

  // --- 16. Password Generator ---
  {
    name: 'Password Generator',
    description: 'Generates a secure random password.',
    code: {
      name: 'password_gen',
      displayName: 'Password Generator',
      description: 'Generates a random password with specified length.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          length: {type: 'number', description: 'Length of password', default: 16},
        },
      }, null, 2),
      handlerCode: `const { length = 16 } = args;
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
let password = "";
for (let i = 0; i < length; i++) {
  password += chars.charAt(Math.floor(Math.random() * chars.length));
}
return { content: [{ type: 'text', text: password }] };`,
      category: 'security',
      icon: '🔒',
    },
  },

  // --- 17. Lorem Ipsum Generator ---
  {
    name: 'Lorem Ipsum Generator',
    description: 'Generates placeholder text.',
    code: {
      name: 'lorem_ipsum',
      displayName: 'Lorem Ipsum',
      description: 'Generates placeholder text for mocking layouts.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          paragraphs: {type: 'number', description: 'Number of paragraphs', default: 1},
        },
      }, null, 2),
      handlerCode: `const { paragraphs = 1 } = args;
const text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
const result = Array(paragraphs).fill(text).join('\\n\\n');
return { content: [{ type: 'text', text: result }] };`,
      category: 'text',
      icon: '📜',
    },
  },

  // --- 18. Slug Generator ---
  {
    name: 'Slug Generator',
    description: 'Converts a string into a URL-friendly slug.',
    code: {
      name: 'slugify',
      displayName: 'Slug Generator',
      description: 'Converts text to a URL-friendly slug format.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          text: {type: 'string', description: 'Text to slugify'},
        },
        required: ['text'],
      }, null, 2),
      handlerCode: `const { text } = args;
const slug = text.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)+/g, '');
return { content: [{ type: 'text', text: slug }] };`,
      category: 'text',
      icon: '🔗',
    },
  },

  // --- 19. Word Counter ---
  {
    name: 'Word Counter',
    description: 'Counts words, characters, and sentences in text.',
    code: {
      name: 'word_count',
      displayName: 'Word Counter',
      description: 'Analyzes text to count words, characters, and sentences.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          text: {type: 'string', description: 'Text to analyze'},
        },
        required: ['text'],
      }, null, 2),
      handlerCode: `const { text } = args;
const words = text.trim().split(/\\s+/).filter(Boolean).length;
const chars = text.length;
const sentences = text.split(/[.!?]+/).filter(Boolean).length;
return {
  content: [{ type: 'text', text: \`Words: \${words}\\nCharacters: \${chars}\\nSentences: \${sentences}\` }]
};`,
      category: 'text',
      icon: '📏',
    },
  },

  // --- 20. Percentage Calculator ---
  {
    name: 'Percentage Calculator',
    description: 'Calculates percentages.',
    code: {
      name: 'percentage_calc',
      displayName: 'Percentage Calculator',
      description: 'Calculates what percentage X is of Y.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          part: {type: 'number', description: 'The part value'},
          total: {type: 'number', description: 'The total value'},
        },
        required: ['part', 'total'],
      }, null, 2),
      handlerCode: `const { part, total } = args;
if (total === 0) return { content: [{ type: 'text', text: "Total cannot be zero" }], isError: true };
const percentage = (part / total) * 100;
return { content: [{ type: 'text', text: \`\${part} is \${percentage.toFixed(2)}% of \${total}\` }] };`,
      category: 'math',
      icon: '💯',
    },
  },

  // --- 21. Tip Calculator ---
  {
    name: 'Tip Calculator',
    description: 'Calculates tip amount and total bill.',
    code: {
      name: 'tip_calc',
      displayName: 'Tip Calculator',
      description: 'Calculates tip based on bill amount and percentage.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          amount: {type: 'number', description: 'Bill amount'},
          tipPercent: {type: 'number', description: 'Tip percentage'},
        },
        required: ['amount', 'tipPercent'],
      }, null, 2),
      handlerCode: `const { amount, tipPercent } = args;
const tip = amount * (tipPercent / 100);
const total = amount + tip;
return {
  content: [{ type: 'text', text: \`Tip: $\${tip.toFixed(2)}\\nTotal: $\${total.toFixed(2)}\` }]
};`,
      category: 'finance',
      icon: '💸',
    },
  },

  // --- 22. Temperature Converter ---
  {
    name: 'Temperature Converter',
    description: 'Converts between Celsius and Fahrenheit.',
    code: {
      name: 'temp_converter',
      displayName: 'Temperature Converter',
      description: 'Converts temperature between C and F.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          value: {type: 'number', description: 'Temperature value'},
          from: {type: 'string', enum: ['C', 'F'], description: 'From unit (C or F)'},
        },
        required: ['value', 'from'],
      }, null, 2),
      handlerCode: `const { value, from } = args;
let result;
if (from === 'C') {
  result = (value * 9/5) + 32;
  return { content: [{ type: 'text', text: \`\${value}°C = \${result.toFixed(2)}°F\` }] };
} else {
  result = (value - 32) * 5/9;
  return { content: [{ type: 'text', text: \`\${value}°F = \${result.toFixed(2)}°C\` }] };
}`,
      category: 'utility',
      icon: '🌡️',
    },
  },

  // --- 23. BMI Calculator ---
  {
    name: 'BMI Calculator',
    description: 'Calculates Body Mass Index.',
    code: {
      name: 'bmi_calc',
      displayName: 'BMI Calculator',
      description: 'Calculates BMI given weight (kg) and height (m).',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          weight: {type: 'number', description: 'Weight in kilograms'},
          height: {type: 'number', description: 'Height in meters'},
        },
        required: ['weight', 'height'],
      }, null, 2),
      handlerCode: `const { weight, height } = args;
const bmi = weight / (height * height);
let category = "";
if (bmi < 18.5) category = "Underweight";
else if (bmi < 25) category = "Normal weight";
else if (bmi < 30) category = "Overweight";
else category = "Obese";
return { content: [{ type: 'text', text: \`BMI: \${bmi.toFixed(1)} (\${category})\` }] };`,
      category: 'health',
      icon: '⚖️',
    },
  },

  // --- 24. Currency Formatter ---
  {
    name: 'Currency Formatter',
    description: 'Formats numbers as currency strings.',
    code: {
      name: 'currency_format',
      displayName: 'Currency Formatter',
      description: 'Formats a number into a specific currency format.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          amount: {type: 'number', description: 'Amount to format'},
          currency: {type: 'string', description: 'Currency code (e.g., USD, EUR)', default: 'USD'},
        },
        required: ['amount'],
      }, null, 2),
      handlerCode: `const { amount, currency = 'USD' } = args;
const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
return { content: [{ type: 'text', text: formatted }] };`,
      category: 'finance',
      icon: '💰',
    },
  },

  // --- 25. JSON Formatter ---
  {
    name: 'JSON Formatter',
    description: 'Prettifies or minifies JSON strings.',
    code: {
      name: 'json_formatter',
      displayName: 'JSON Formatter',
      description: 'Formats JSON strings for readability.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          json: {type: 'string', description: 'JSON string to format'},
          minify: {type: 'boolean', description: 'Minify instead of prettify', default: false},
        },
        required: ['json'],
      }, null, 2),
      handlerCode: `const { json, minify } = args;
try {
  const parsed = JSON.parse(json);
  const result = minify ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2);
  return { content: [{ type: 'text', text: result }] };
} catch (e) {
  return { content: [{ type: 'text', text: "Invalid JSON provided" }], isError: true };
}`,
      category: 'data',
      icon: '📄',
    },
  },

  // --- 26. HTML Entity Encoder ---
  {
    name: 'HTML Entity Encoder',
    description: 'Escapes HTML special characters.',
    code: {
      name: 'html_encode',
      displayName: 'HTML Encoder',
      description: 'Converts characters to HTML entities.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          text: {type: 'string', description: 'Text to encode'},
        },
        required: ['text'],
      }, null, 2),
      handlerCode: `const { text } = args;
const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
const encoded = text.replace(/[&<>"']/g, m => map[m]);
return { content: [{ type: 'text', text: encoded }] };`,
      category: 'web',
      icon: '🕸️',
    },
  },

  // --- 27. HTML Entity Decoder ---
  {
    name: 'HTML Entity Decoder',
    description: 'Decodes HTML entities back to characters.',
    code: {
      name: 'html_decode',
      displayName: 'HTML Decoder',
      description: 'Converts HTML entities back to plain text.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          text: {type: 'string', description: 'Text to decode'},
        },
        required: ['text'],
      }, null, 2),
      handlerCode: `const { text } = args;
const doc = new DOMParser().parseFromString(text, 'text/html');
return { content: [{ type: 'text', text: doc.documentElement.textContent }] };`,
      category: 'web',
      icon: '🕸️',
    },
  },

  // --- 28. Regex Tester ---
  {
    name: 'Regex Tester',
    description: 'Tests a Regular Expression against a string.',
    code: {
      name: 'regex_tester',
      displayName: 'Regex Tester',
      description: 'Tests if a string matches a regex pattern.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          pattern: {type: 'string', description: 'Regex pattern'},
          text: {type: 'string', description: 'Text to test'},
          flags: {type: 'string', description: 'Regex flags (e.g. gi)', default: ''},
        },
        required: ['pattern', 'text'],
      }, null, 2),
      handlerCode: `const { pattern, text, flags = "" } = args;
try {
  const regex = new RegExp(pattern, flags);
  const matches = text.match(regex);
  const result = matches ? \`Matches found: \${JSON.stringify(matches)}\` : "No matches found.";
  return { content: [{ type: 'text', text: result }] };
} catch (e) {
  return { content: [{ type: 'text', text: "Invalid Regex: " + e.message }], isError: true };
}`,
      category: 'developer',
      icon: '🔍',
    },
  },

  // --- 29. List Sorter ---
  {
    name: 'List Sorter',
    description: 'Sorts a comma-separated list of items.',
    code: {
      name: 'list_sort',
      displayName: 'List Sorter',
      description: 'Sorts a list of strings alphabetically.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          list: {type: 'string', description: 'Comma-separated list'},
          order: {type: 'string', enum: ['asc', 'desc'], description: 'Sort order', default: 'asc'},
        },
        required: ['list'],
      }, null, 2),
      handlerCode: `const { list, order = 'asc' } = args;
const items = list.split(',').map(s => s.trim()).sort();
if (order === 'desc') items.reverse();
return { content: [{ type: 'text', text: items.join(', ') }] };`,
      category: 'text',
      icon: '📃',
    },
  },

  // --- 30. List Deduplicator ---
  {
    name: 'List Deduplicator',
    description: 'Removes duplicates from a comma-separated list.',
    code: {
      name: 'list_dedupe',
      displayName: 'List Deduplicator',
      description: 'Removes duplicate items from a list.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          list: {type: 'string', description: 'Comma-separated list'},
        },
        required: ['list'],
      }, null, 2),
      handlerCode: `const { list } = args;
const items = [...new Set(list.split(',').map(s => s.trim()))];
return { content: [{ type: 'text', text: items.join(', ') }] };`,
      category: 'text',
      icon: '🧹',
    },
  },

  // --- 31. Email Validator ---
  {
    name: 'Email Validator',
    description: 'Validates the format of an email address.',
    code: {
      name: 'validate_email',
      displayName: 'Email Validator',
      description: 'Checks if an email string has a valid format.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          email: {type: 'string', description: 'Email address to validate'},
        },
        required: ['email'],
      }, null, 2),
      handlerCode: `const { email } = args;
const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
const isValid = regex.test(email);
return {
  content: [{ type: 'text', text: \`\${email} is \${isValid ? "valid" : "invalid"}.\` }],
  isError: !isValid
};`,
      category: 'utility',
      icon: '📧',
    },
  },

  // --- 32. Credit Card Masker ---
  {
    name: 'Credit Card Masker',
    description: 'Masks a credit card number, showing only last 4 digits.',
    code: {
      name: 'cc_mask',
      displayName: 'Card Masker',
      description: 'Masks sensitive numbers except the last 4 digits.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          number: {type: 'string', description: 'Number to mask'},
        },
        required: ['number'],
      }, null, 2),
      handlerCode: `const { number } = args;
const cleaned = number.replace(/\\D/g, '');
if (cleaned.length < 4) return { content: [{ type: 'text', text: "Number too short" }], isError: true };
const masked = '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
return { content: [{ type: 'text', text: masked }] };`,
      category: 'security',
      icon: '💳',
    },
  },

  // --- 33. Dice Roller ---
  {
    name: 'Dice Roller',
    description: 'Simulates rolling dice (e.g., D20, D6).',
    code: {
      name: 'dice_roll',
      displayName: 'Dice Roller',
      description: 'Rolls a die with a specified number of sides.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          sides: {type: 'number', description: 'Number of sides on the die', default: 6},
        },
      }, null, 2),
      handlerCode: `const { sides = 6 } = args;
const result = Math.floor(Math.random() * sides) + 1;
return { content: [{ type: 'text', text: \`Rolled a D\${sides}: \${result}\` }] };`,
      category: 'fun',
      icon: '🎲',
    },
  },

  // --- 34. Coin Flip ---
  {
    name: 'Coin Flip',
    description: 'Flips a coin resulting in Heads or Tails.',
    code: {
      name: 'coin_flip',
      displayName: 'Coin Flip',
      description: 'Randomly returns Heads or Tails.',
      inputSchema: JSON.stringify({type: 'object', properties: {}}, null, 2),
      handlerCode: `const result = Math.random() > 0.5 ? "Heads" : "Tails";
return { content: [{ type: 'text', text: \`Result: \${result}\` }] };`,
      category: 'fun',
      icon: '🪙',
    },
  },

  // --- 35. Decision Maker ---
  {
    name: 'Decision Maker',
    description: 'Picks a random option from a list.',
    code: {
      name: 'decision_maker',
      displayName: 'Decision Maker',
      description: 'Selects a random item from a comma-separated list.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          options: {type: 'string', description: 'Comma-separated list of options'},
        },
        required: ['options'],
      }, null, 2),
      handlerCode: `const { options } = args;
const items = options.split(',').map(s => s.trim());
const choice = items[Math.floor(Math.random() * items.length)];
return { content: [{ type: 'text', text: \`I choose: \${choice}\` }] };`,
      category: 'fun',
      icon: '🤔',
    },
  },

  // --- 36. ASCII Art Generator ---
  {
    name: 'ASCII Art Generator',
    description: 'Generates simple ASCII art text.',
    code: {
      name: 'ascii_art',
      displayName: 'ASCII Art',
      description: 'Converts text to simple ASCII art (figlet style).',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          text: {type: 'string', description: 'Text to convert (short words recommended)'},
        },
        required: ['text'],
      }, null, 2),
      handlerCode: `const { text } = args;
// Simple standard alphabet mock
const art = text.toUpperCase().split('').map(c => {
  if (c === 'A') return "  A  \\n A A \\nAAAAA\\nA   A";
  if (c === 'B') return "BBBB \\nB   B\\nBBBB \\nB   B\\nBBBB";
  if (c === 'C') return " CCCC\\nC    \\nC    \\n CCCC";
  return "#####"; // Fallback
}).join('\\n\\n');
return { content: [{ type: 'text', text: art }] };`,
      category: 'fun',
      icon: '🖼️',
    },
  },

  // --- 37. QR Code Generator (URL) ---
  {
    name: 'QR Code Generator',
    description: 'Generates a QR code image URL for given text.',
    code: {
      name: 'qr_gen',
      displayName: 'QR Code',
      description: 'Returns a Google Chart API URL for a QR code.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          text: {type: 'string', description: 'Text/URL to encode'},
        },
        required: ['text'],
      }, null, 2),
      handlerCode: `const { text } = args;
const url = \`https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=\${encodeURIComponent(text)}\`;
return { content: [{ type: 'text', text: \`QR Code URL: \${url}\` }] };`,
      category: 'utility',
      icon: '📱',
    },
  },

  // --- 38. Age Calculator ---
  {
    name: 'Age Calculator',
    description: 'Calculates age in years based on birthdate.',
    code: {
      name: 'age_calc',
      displayName: 'Age Calculator',
      description: 'Calculates age from date of birth.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          dob: {type: 'string', description: 'Date of birth (YYYY-MM-DD)'},
        },
        required: ['dob'],
      }, null, 2),
      handlerCode: `const { dob } = args;
const birthDate = new Date(dob);
const today = new Date();
let age = today.getFullYear() - birthDate.getFullYear();
const m = today.getMonth() - birthDate.getMonth();
if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
  age--;
}
return { content: [{ type: 'text', text: \`Age: \${age} years old.\` }] };`,
      category: 'time',
      icon: '🎂',
    },
  },

  // --- 39. Compound Interest Calculator ---
  {
    name: 'Compound Interest Calculator',
    description: 'Calculates compound interest earnings.',
    code: {
      name: 'compound_interest',
      displayName: 'Compound Interest',
      description: 'Calculates interest earned over time.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          principal: {type: 'number', description: 'Initial amount'},
          rate: {type: 'number', description: 'Annual interest rate (as %)'},
          years: {type: 'number', description: 'Number of years'},
          n: {type: 'number', description: 'Times compounded per year', default: 12},
        },
        required: ['principal', 'rate', 'years'],
      }, null, 2),
      handlerCode: `const { principal, rate, years, n = 12 } = args;
const r = rate / 100;
const amount = principal * Math.pow((1 + (r/n)), n*years);
const interest = amount - principal;
return {
  content: [{ type: 'text', text: \`Total: $\${amount.toFixed(2)}\\nInterest Earned: $\${interest.toFixed(2)}\` }]
};`,
      category: 'finance',
      icon: '🏦',
    },
  },

  // --- 40. Prime Number Checker ---
  {
    name: 'Prime Number Checker',
    description: 'Checks if a number is prime.',
    code: {
      name: 'prime_check',
      displayName: 'Prime Checker',
      description: 'Determines if a number is a prime number.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          number: {type: 'number', description: 'Number to check'},
        },
        required: ['number'],
      }, null, 2),
      handlerCode: `const { number } = args;
const isPrime = (n) => {
  if (n <= 1) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) return false;
  }
  return true;
};
return { content: [{ type: 'text', text: \`\${number} is \${isPrime(number) ? "Prime" : "Not Prime"}.\` }] };`,
      category: 'math',
      icon: '🔢',
    },
  },

  // --- 41. Fibonacci Generator ---
  {
    name: 'Fibonacci Generator',
    description: 'Generates a Fibonacci sequence.',
    code: {
      name: 'fib_gen',
      displayName: 'Fibonacci Generator',
      description: 'Generates the first N numbers of the Fibonacci sequence.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          count: {type: 'number', description: 'How many numbers to generate', default: 10},
        },
      }, null, 2),
      handlerCode: `const { count = 10 } = args;
const fib = [0, 1];
for (let i = 2; i < count; i++) {
  fib[i] = fib[i-1] + fib[i-2];
}
return { content: [{ type: 'text', text: \`Sequence: \${fib.slice(0, count).join(', ')}\` }] };`,
      category: 'math',
      icon: '🐚',
    },
  },

  // --- 42. Unit Converter ---
  {
    name: 'Unit Converter',
    description: 'Converts between different units of measurement.',
    code: {
      name: 'unit_convert',
      displayName: 'Unit Converter',
      description: 'Converts lengths (km to miles, etc).',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          value: {type: 'number', description: 'Value to convert'},
          type: {type: 'string', enum: ['km_to_mi', 'mi_to_km', 'kg_to_lb', 'lb_to_kg'], description: 'Conversion type'},
        },
        required: ['value', 'type'],
      }, null, 2),
      handlerCode: `const { value, type } = args;
let result;
switch(type) {
  case 'km_to_mi': result = value * 0.621371; break;
  case 'mi_to_km': result = value * 1.60934; break;
  case 'kg_to_lb': result = value * 2.20462; break;
  case 'lb_to_kg': result = value * 0.453592; break;
}
return { content: [{ type: 'text', text: \`\${value} -> \${result.toFixed(2)}\` }] };`,
      category: 'utility',
      icon: '🛠️',
    },
  },

  // --- 43. Average Calculator ---
  {
    name: 'Average Calculator',
    description: 'Calculates the average of a list of numbers.',
    code: {
      name: 'average_calc',
      displayName: 'Average Calculator',
      description: 'Computes the mean of a comma-separated list of numbers.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          numbers: {type: 'string', description: 'Comma-separated numbers'},
        },
        required: ['numbers'],
      }, null, 2),
      handlerCode: `const { numbers } = args;
const nums = numbers.split(',').map(Number);
const sum = nums.reduce((a, b) => a + b, 0);
const avg = sum / nums.length;
return { content: [{ type: 'text', text: \`Average: \${avg.toFixed(2)}\` }] };`,
      category: 'math',
      icon: '📊',
    },
  },

  // --- 44. Median Calculator ---
  {
    name: 'Median Calculator',
    description: 'Calculates the median of a list of numbers.',
    code: {
      name: 'median_calc',
      displayName: 'Median Calculator',
      description: 'Computes the median of a comma-separated list of numbers.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          numbers: {type: 'string', description: 'Comma-separated numbers'},
        },
        required: ['numbers'],
      }, null, 2),
      handlerCode: `const { numbers } = args;
const nums = numbers.split(',').map(Number).sort((a,b) => a-b);
const mid = Math.floor(nums.length / 2);
const median = nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
return { content: [{ type: 'text', text: \`Median: \${median}\` }] };`,
      category: 'math',
      icon: '📊',
    },
  },

  // --- 45. GCD Calculator ---
  {
    name: 'GCD Calculator',
    description: 'Calculates Greatest Common Divisor of two numbers.',
    code: {
      name: 'gcd_calc',
      displayName: 'GCD Calculator',
      description: 'Finds the greatest common divisor of two integers.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          a: {type: 'number', description: 'First integer'},
          b: {type: 'number', description: 'Second integer'},
        },
        required: ['a', 'b'],
      }, null, 2),
      handlerCode: `const { a, b } = args;
const gcd = (a, b) => {
  while(b) {
    let t = b;
    b = a % b;
    a = t;
  }
  return a;
};
return { content: [{ type: 'text', text: \`GCD(\${a}, \${b}) = \${gcd(a, b)}\` }] };`,
      category: 'math',
      icon: '🔢',
    },
  },

  // --- 46. Factorial Calculator ---
  {
    name: 'Factorial Calculator',
    description: 'Calculates the factorial of a number.',
    code: {
      name: 'factorial_calc',
      displayName: 'Factorial',
      description: 'Calculates n! (n factorial).',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          n: {type: 'number', description: 'Number to calculate factorial for'},
        },
        required: ['n'],
      }, null, 2),
      handlerCode: `const { n } = args;
if (n < 0) return { content: [{ type: 'text', text: "Factorial of negative number undefined" }], isError: true };
let result = 1;
for (let i = 2; i <= n; i++) result *= i;
return { content: [{ type: 'text', text: \`\${n}! = \${result}\` }] };`,
      category: 'math',
      icon: '❗',
    },
  },

  // --- 47. Binary to Decimal ---
  {
    name: 'Binary to Decimal',
    description: 'Converts binary numbers to decimal.',
    code: {
      name: 'bin_to_dec',
      displayName: 'Binary to Decimal',
      description: 'Converts a binary string to a decimal number.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          binary: {type: 'string', description: 'Binary string (e.g. 1010)'},
        },
        required: ['binary'],
      }, null, 2),
      handlerCode: `const { binary } = args;
const decimal = parseInt(binary, 2);
return { content: [{ type: 'text', text: \`Binary \${binary} = Decimal \${decimal}\` }] };`,
      category: 'math',
      icon: '💻',
    },
  },

  // --- 48. Decimal to Binary ---
  {
    name: 'Decimal to Binary',
    description: 'Converts decimal numbers to binary.',
    code: {
      name: 'dec_to_bin',
      displayName: 'Decimal to Binary',
      description: 'Converts a decimal number to a binary string.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          decimal: {type: 'number', description: 'Decimal number'},
        },
        required: ['decimal'],
      }, null, 2),
      handlerCode: `const { decimal } = args;
const binary = decimal.toString(2);
return { content: [{ type: 'text', text: \`Decimal \${decimal} = Binary \${binary}\` }] };`,
      category: 'math',
      icon: '💻',
    },
  },

  // --- 49. Geolocation Coordinates ---
  {
    name: 'Geolocation Coordinates',
    description: 'Returns the latitude and longitude of a city (mock).',
    code: {
      name: 'geo_coords',
      displayName: 'Geo Coordinates',
      description: 'Looks up approximate coordinates for a city name.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          city: {type: 'string', description: 'City name'},
        },
        required: ['city'],
      }, null, 2),
      handlerCode: `const { city } = args;
// Mock database
const db = {
  "london": { lat: 51.5074, lng: -0.1278 },
  "paris": { lat: 48.8566, lng: 2.3522 },
  "new york": { lat: 40.7128, lng: -74.0060 },
  "tokyo": { lat: 35.6762, lng: 139.6503 }
};
const found = db[city.toLowerCase()];
if (found) return { content: [{ type: 'text', text: \`\${city}: Lat \${found.lat}, Lng \${found.lng}\` }] };
return { content: [{ type: 'text', text: "City not found in mock database." }] };`,
      category: 'maps',
      icon: '🌍',
    },
  },

  // --- 50. Distance Calculator ---
  {
    name: 'Distance Calculator',
    description: 'Calculates distance between two lat/long points (Haversine).',
    code: {
      name: 'distance_calc',
      displayName: 'Distance Calculator',
      description: 'Calculates distance in km between two coordinates.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          lat1: {type: 'number', description: 'Lat Point 1'},
          lon1: {type: 'number', description: 'Lon Point 1'},
          lat2: {type: 'number', description: 'Lat Point 2'},
          lon2: {type: 'number', description: 'Lon Point 2'},
        },
        required: ['lat1', 'lon1', 'lat2', 'lon2'],
      }, null, 2),
      handlerCode: `const { lat1, lon1, lat2, lon2 } = args;
const R = 6371; // Radius of the earth in km
const dLat = (lat2 - lat1) * Math.PI / 180;
const dLon = (lon2 - lon1) * Math.PI / 180;
const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
const d = R * c;
return { content: [{ type: 'text', text: \`Distance: \${d.toFixed(2)} km\` }] };`,
      category: 'maps',
      icon: '📏',
    },
  },

  // --- 51. Escape String ---
  {
    name: 'Escape String',
    description: 'Escapes special characters in a string for code usage.',
    code: {
      name: 'escape_string',
      displayName: 'String Escaper',
      description: 'Escapes quotes and backslashes in a string.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          text: {type: 'string', description: 'Text to escape'},
        },
        required: ['text'],
      }, null, 2),
      handlerCode: `const { text } = args;
const escaped = text.replace(/([\\\\'"])/g, "\\\\$1");
return { content: [{ type: 'text', text: escaped }] };`,
      category: 'developer',
      icon: '🛡️',
    },
  },

  // --- 52. Unescape String ---
  {
    name: 'Unescape String',
    description: 'Unescapes a previously escaped string.',
    code: {
      name: 'unescape_string',
      displayName: 'String Unescaper',
      description: 'Reverts escaped characters to original form.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          text: {type: 'string', description: 'Text to unescape'},
        },
        required: ['text'],
      }, null, 2),
      handlerCode: `const { text } = args;
try {
  const unescaped = text.replace(/\\\\([\\\\'"])/g, '$1');
  return { content: [{ type: 'text', text: unescaped }] };
} catch(e) {
  return { content: [{ type: 'text', text: "Error unescaping string" }], isError: true };
}`,
      category: 'developer',
      icon: '🛡️',
    },
  },

  // --- 53. Case Converter ---
  {
    name: 'Case Converter',
    description: 'Converts text to different casing styles.',
    code: {
      name: 'case_converter',
      displayName: 'Case Converter',
      description: 'Converts string to snake_case, camelCase, etc.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          text: {type: 'string', description: 'Text to convert'},
          targetCase: {type: 'string', enum: ['camel', 'snake', 'kebab', 'dot'], description: 'Target casing'},
        },
        required: ['text', 'targetCase'],
      }, null, 2),
      handlerCode: `const { text, targetCase } = args;
const words = text.trim().split(/[\\s_\\-.]+/);
let result = "";
if (targetCase === 'camel') {
  result = words.map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
} else if (targetCase === 'snake') {
  result = words.map(w => w.toLowerCase()).join('_');
} else if (targetCase === 'kebab') {
  result = words.map(w => w.toLowerCase()).join('-');
} else if (targetCase === 'dot') {
  result = words.map(w => w.toLowerCase()).join('.');
}
return { content: [{ type: 'text', text: result }] };`,
      category: 'text',
      icon: '🔤',
    },
  },

  // --- 54. IP Address Validator ---
  {
    name: 'IP Address Validator',
    description: 'Validates an IPv4 address format.',
    code: {
      name: 'validate_ip',
      displayName: 'IP Validator',
      description: 'Checks if a string is a valid IPv4 address.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          ip: {type: 'string', description: 'IP address to validate'},
        },
        required: ['ip'],
      }, null, 2),
      handlerCode: `const { ip } = args;
const regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const isValid = regex.test(ip);
return { content: [{ type: 'text', text: \`\${ip} is \${isValid ? "a valid" : "an invalid"} IPv4 address.\` }] };`,
      category: 'network',
      icon: '🖥️',
    },
  },

  // --- 55. Horoscope Provider ---
  {
    name: 'Horoscope Provider',
    description: 'Provides a random horoscope for a zodiac sign.',
    code: {
      name: 'horoscope',
      displayName: 'Horoscope',
      description: 'Returns a random vague horoscope message.',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          sign: {type: 'string', description: 'Zodiac sign (e.g. Aries, Taurus)'},
        },
        required: ['sign'],
      }, null, 2),
      handlerCode: `const { sign } = args;
const messages = [
  "Today is a good day to code.",
  "You will find a bug in your logic.",
  "Unexpected semicolon ahead.",
  "Beware of infinite loops."
];
const msg = messages[Math.floor(Math.random() * messages.length)];
return { content: [{ type: 'text', text: \`\${sign}: \${msg}\` }] };`,
      category: 'fun',
      icon: '🔮',
    },
  },
];

export default customToolsTemplates;
