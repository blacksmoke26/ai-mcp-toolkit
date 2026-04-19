# MCP Toolkit - Custom Tools Feature

This document describes the **Custom MCP Tools** feature that allows users to create, manage, test, and deploy custom MCP (Model Context Protocol) tools through both API endpoints and a web UI.

## Overview

The Custom Tools feature enables users to define their own MCP tools with:
- **Custom JavaScript handler code** - Write logic in a safe, restricted environment
- **JSON Schema input validation** - Define and validate input parameters
- **Dynamic enable/disable at runtime** - Toggle tools without server restart
- **Built-in testing interface** - Test tools before deployment
- **40+ pre-built templates** - Starting points for common use cases
- **Automatic MCP registration** - Tools are automatically available to AI agents

All custom tools are stored in the SQLite database and automatically registered with the MCP protocol, making them available to the AI agent via `tools/list` and `tools/call` endpoints.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              Frontend UI (React + Ant Design)                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Custom Tools Management Page (/admin/custom-tools)     │  │
│  │  - Tool List with Search, Filter, Stats                 │  │
│  │  - Create/Edit Tool Dialogs                             │  │
│  │  - Test Tool Dialog                                     │  │
│  │  - Template Selection Dialog                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────────┘
                        │ REST API
┌───────────────────────▼─────────────────────────────────────────┐
│              Backend (Fastify)                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Routes (/api/custom-tools/*)                       │  │
│  │  - GET /api/custom-tools              (List tools)      │  │
│  │  - POST /api/custom-tools             (Create tool)     │  │
│  │  - GET /api/custom-tools/:id          (Get details)     │  │
│  │  - PUT /api/custom-tools/:id          (Update tool)     │  │
│  │  - DELETE /api/custom-tools/:id       (Delete tool)     │  │
│  │  - POST /api/custom-tools/:id/test    (Test tool)       │  │
│  │  - POST /api/custom-tools/:id/toggle  (Enable/Disable)  │  │
│  │  - GET /api/custom-tools/templates    (Get templates)   │  │
│  └───────────────────────┬──────────────────────────────────┘  │
│                          │                                     │
│  ┌───────────────────────▼──────────────────────────────────┐  │
│  │  Custom Tool Executor (Singleton)                       │  │
│  │  - In-memory tool registry (Map<number, Tool>)          │  │
│  │  - Safe handler compilation (new Function)              │  │
│  │  - Dynamic registration/unregistration                  │  │
│  │  - Tool testing without registration side-effects       │  │
│  │  - Code/schema validation                               │  │
│  └───────────────────────┬──────────────────────────────────┘  │
│                          │                                     │
│  ┌───────────────────────▼──────────────────────────────────┐  │
│  │  Tool Registry (MCP Protocol)                           │  │
│  │  - tools/list endpoint                                  │  │
│  │  - tools/call endpoint                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│         Database (SQLite + Sequelize)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Table: custom_tools                                    │  │
│  │  - All tool metadata and code                           │  │
│  │  - Test results storage                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Backend API Endpoints

Base URL: `http://localhost:3100/api`

### List Custom Tools

```http
GET /api/custom-tools
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `enabled` | boolean | No | Filter by enabled status |
| `category` | string | No | Filter by category |
| `search` | string | No | Search in name, displayName, description (case-insensitive) |

**Response:** `200 OK`
```json
{
  "total": 5,
  "tools": [
    {
      "id": 1,
      "name": "example_calculator",
      "displayName": "Example Calculator",
      "description": "A simple calculator that performs basic arithmetic operations.",
      "enabled": true,
      "category": "math",
      "icon": "🧮",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "hasTestResult": false
    }
  ]
}
```

### Get Custom Tool Details

```http
GET /api/custom-tools/:id
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Tool ID |

**Response:** `200 OK`
```json
{
  "id": 1,
  "name": "example_calculator",
  "displayName": "Example Calculator",
  "description": "A simple calculator that performs basic arithmetic operations.",
  "inputSchema": "{\n  \"type\": \"object\",\n  \"properties\": {\n    \"a\": { \"type\": \"number\", \"description\": \"First number\" },\n    \"b\": { \"type\": \"number\", \"description\": \"Second number\" },\n    \"operation\": { \"type\": \"string\", \"enum\": [\"add\", \"subtract\", \"multiply\", \"divide\"] }\n  },\n  \"required\": [\"a\", \"b\", \"operation\"]\n}",
  "handlerCode": "const { a, b, operation } = args;\nconst results = {\n  add: a + b,\n  subtract: a - b,\n  multiply: a * b,\n  divide: b !== 0 ? a / b : \"Error: Division by zero\"\n};\nreturn {\n  content: [{ type: 'text', text: `${operation}(${a}, ${b}) = ${results[operation]}` }]\n};",
  "enabled": true,
  "category": "math",
  "icon": "🧮",
  "settings": null,
  "lastTestArgs": null,
  "lastTestResult": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Create Custom Tool

```http
POST /api/custom-tools
```

**Request Body:**
```json
{
  "name": "my_custom_tool",
  "displayName": "My Custom Tool",
  "description": "What this tool does",
  "inputSchema": "{\n  \"type\": \"object\",\n  \"properties\": {\n    \"param\": { \"type\": \"string\" }\n  },\n  \"required\": [\"param\"]\n}",
  "handlerCode": "const { param } = args;\nreturn {\n  content: [{ type: 'text', text: `Hello ${param}` }]\n};",
  "category": "custom",
  "icon": "🔧",
  "settings": null
}
```

**Field Validation:**
| Field | Rules |
|-------|-------|
| `name` | Must start with a letter; alphanumeric and underscores only |
| `displayName` | Required string |
| `description` | Required string |
| `inputSchema` | Valid JSON with `type: "object"` and `properties` object |
| `handlerCode` | Valid JavaScript syntax |
| `category` | Optional string (defaults to "custom") |
| `icon` | Optional emoji string |
| `settings` | Optional JSON string |

**Response:** `201 Created`
```json
{
  "status": "created",
  "tool": {
    "id": 1,
    "name": "my_custom_tool",
    "displayName": "My Custom Tool",
    "description": "What this tool does",
    "enabled": true,
    "category": "custom",
    "icon": "🔧",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Update Custom Tool

```http
PUT /api/custom-tools/:id
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Tool ID |

**Request Body:** (all fields optional)
```json
{
  "displayName": "Updated Display Name",
  "description": "Updated description",
  "inputSchema": "{...}",
  "handlerCode": "const { param } = args; return {...};",
  "category": "updated-category",
  "icon": "🎨",
  "settings": "{\"key\": \"value\"}"
}
```

**Response:** `200 OK`
```json
{
  "status": "updated",
  "tool": {
    "id": 1,
    "name": "my_custom_tool",
    "displayName": "Updated Display Name",
    "description": "Updated description",
    "enabled": true,
    "category": "updated-category",
    "icon": "🎨",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Notes:**
- Updates are validated the same as create
- If tool is enabled, it's automatically reloaded in the executor
- Tool name cannot be changed

### Delete Custom Tool

```http
DELETE /api/custom-tools/:id
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Tool ID |

**Response:** `200 OK`
```json
{
  "status": "deleted",
  "tool": "my_custom_tool"
}
```

**Notes:**
- Tool is unregistered from MCP before deletion
- Deletion is permanent

### Test Custom Tool

```http
POST /api/custom-tools/:id/test
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Tool ID |

**Request Body:** (conforms to tool's inputSchema)
```json
{
  "param": "test value"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Hello test value"
      }
    ],
    "isError": false
  },
  "elapsedTime": 15
}
```

**Content Types:**
| Type | Fields | Description |
|------|--------|-------------|
| `text` | `text` | Plain text response |
| `image` | `data`, `mimeType` | Base64-encoded image |
| `resource` | `resource.uri`, `resource.text` | Reference to a resource |

### Toggle Custom Tool

```http
POST /api/custom-tools/:id/toggle
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Tool ID |

**Request Body:**
```json
{
  "enabled": false
}
```

**Response:** `200 OK`
```json
{
  "status": "toggled",
  "tool": {
    "id": 1,
    "name": "my_custom_tool",
    "enabled": false
  }
}
```

### Get Tool Templates

```http
GET /api/custom-tools/templates
```

**Response:** `200 OK`
```json
{
  "templates": [
    {
      "name": "Simple Math Operation",
      "description": "A basic calculator that performs arithmetic operations.",
      "code": {
        "name": "simple_calculator",
        "displayName": "Simple Calculator",
        "description": "Performs basic arithmetic operations (add, subtract, multiply, divide).",
        "inputSchema": "{...}",
        "handlerCode": "...",
        "category": "math",
        "icon": "🧮"
      }
    }
  ]
}
```

## Frontend UI

### Access
Navigate to `/admin/custom-tools` in the web interface.

### Features

#### 1. Tool List View
- **Stats Panel**: Shows total, enabled, and disabled tool counts
- **Search Bar**: Search by name, display name, or description
- **Category Filter**: Dropdown to filter by category
- **Show Disabled**: Toggle to include/exclude disabled tools
- **Tool Cards**: Each tool shows icon, name, description, status badge, and action buttons

#### 2. Create/Edit Tool Dialog
- **Name Field**: Auto-generated from template or manually entered
- **Display Name**: User-friendly name
- **Description**: Detailed tool description
- **JSON Schema Editor**: Text area for input schema (with validation)
- **Code Editor**: Handler code with syntax validation
- **Category Select**: Dropdown with preset categories
- **Icon Picker**: Emoji selector
- **Real-time Validation**: Immediate feedback on invalid input
- **Save Button**: Creates or updates the tool

#### 3. Test Tool Dialog
- **Arguments JSON Editor**: Enter test parameters
- **Run Test Button**: Execute the tool
- **Result Display**: Shows success/error status and output
- **Copy Result**: One-click copy to clipboard
- **Last Test Result**: Shows previous test if available

#### 4. Tool Templates Dialog
- **Template List**: Browse all 40+ available templates
- **Search**: Filter templates by name or description
- **Preview**: See template details before selection
- **Use Template**: Load template into create form

#### 5. Tool Actions (per tool)
- **Edit**: Modify tool configuration
- **Test**: Run tool with test arguments
- **Toggle**: Enable/disable tool
- **Delete**: Remove tool permanently

## Database Schema

### Table: `custom_tools`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| `name` | VARCHAR(255) | NOT NULL, UNIQUE | Tool name (alphanumeric + underscore) |
| `displayName` | VARCHAR(255) | NOT NULL | Human-readable name |
| `description` | TEXT | NOT NULL | Detailed description |
| `inputSchema` | TEXT | NOT NULL | JSON Schema string |
| `handlerCode` | TEXT | NOT NULL | JavaScript handler body |
| `enabled` | BOOLEAN | NOT NULL, DEFAULT true | Tool activation status |
| `category` | VARCHAR(50) | NULL | Category grouping |
| `icon` | VARCHAR(10) | NULL | Emoji icon |
| `settings` | TEXT | NULL | Optional JSON configuration |
| `lastTestArgs` | TEXT | NULL | Last test input |
| `lastTestResult` | TEXT | NULL | Last test output |
| `createdAt` | DATETIME | NOT NULL | Creation timestamp |
| `updatedAt` | DATETIME | NOT NULL | Last update timestamp |

## Tool Templates

The system includes 40+ pre-built templates categorized by function:

### Math & Numbers

#### 1. Simple Calculator
**Name**: `simple_calculator` | **Category**: math | **Icon**: 🧮

```javascript
const { a, b, operation } = args;
const results = {
  add: a + b,
  subtract: a - b,
  multiply: a * b,
  divide: b !== 0 ? a / b : "Error: Division by zero"
};
return {
  content: [{ type: 'text', text: `${operation}(${a}, ${b}) = ${results[operation]}` }]
};
```

#### 2. Random Number Generator
**Name**: `random_number` | **Category**: math | **Icon**: 🎲

```javascript
const { min, max, decimals = false } = args;
const random = Math.random() * (max - min) + min;
const result = decimals ? random : Math.round(random);
return {
  content: [{ type: 'text', text: `Random number between ${min} and ${max}: ${result}` }]
};
```

#### 3. Percentage Calculator
**Name**: `percentage_calculator` | **Category**: math | **Icon**: 📊

#### 4. Tip Calculator
**Name**: `tip_calculator` | **Category**: math | **Icon**: 💰

#### 5. Compound Interest Calculator
**Name**: `compound_interest` | **Category**: math | **Icon**: 💵

#### 6. Fibonacci Generator
**Name**: `fibonacci_generator` | **Category**: math | **Icon**: 🔢

#### 7. Prime Number Checker
**Name**: `prime_checker` | **Category**: math | **Icon**: 🔍

### Text & String

#### 8. String Transformer
**Name**: `string_transformer` | **Category**: text | **Icon**: 📝

```javascript
const { text, operation } = args;
const results = {
  uppercase: text.toUpperCase(),
  lowercase: text.toLowerCase(),
  reverse: text.split('').reverse().join(''),
  length: text.length.toString()
};
return {
  content: [{ 
      type: 'text', text: `${operation}(${text}) = ${results[operation]}` 
  }]
};
```

#### 9. Word Counter
**Name**: `word_counter` | **Category**: text | **Icon**: 📖

#### 10. Character Counter
**Name**: `char_counter` | **Category**: text | **Icon**: 🔤

#### 11. Palindrome Checker
**Name**: `palindrome_checker` | **Category**: text | **Icon**: 🔄

#### 12. Text Truncator
**Name**: `text_truncator` | **Category**: text | **Icon**: ✂️

#### 13. URL Encoder/Decoder
**Name**: `url_encoder` | **Category**: text | **Icon**: 🔗

#### 14. Base64 Encoder/Decoder
**Name**: `base64_encoder` | **Category**: text | **Icon**: 📦

#### 15. Regex Matcher
**Name**: `regex_matcher` | **Category**: text | **Icon**: 🔎

#### 16. Case Converter
**Name**: `case_converter` | **Category**: text | **Icon**: 🔠

### Data & Parsing

#### 17. JSON Formatter
**Name**: `json_formatter` | **Category**: data | **Icon**: 📋

#### 18. CSV Parser
**Name**: `csv_parser` | **Category**: data | **Icon**: 📑

#### 19. URL Parser
**Name**: `url_parser` | **Category**: data | **Icon**: 🌐

#### 20. Query Parameter Parser
**Name**: `query_parser` | **Category**: data | **Icon**: 🔍

### Date & Time

#### 21. Current Time
**Name**: `current_time` | **Category**: time | **Icon**: 🕐

```javascript
const { timezone = 'UTC' } = args;
const now = new Date().toLocaleString('en-US', { timeZone: timezone });
return {
  content: [{ type: 'text', text: `Current time (${timezone}): ${now}` }]
};
```

#### 22. Date Difference
**Name**: `date_diff` | **Category**: time | **Icon**: ⏱️

#### 23. Age Calculator
**Name**: `age_calculator` | **Category**: time | **Icon**: 🎂

### Array & List

#### 24. List Reverser
**Name**: `list_reverser` | **Category**: array | **Icon**: 🔄

#### 25. List Shuffler
**Name**: `list_shuffler` | **Category**: array | **Icon**: 🔀

#### 26. List Sorter
**Name**: `list_sorter` | **Category**: array | **Icon**: 📈

### Conversion

#### 27. Temperature Converter
**Name**: `temp_converter` | **Category**: conversion | **Icon**: 🌡️

#### 28. Length Converter
**Name**: `length_converter` | **Category**: conversion | **Icon**: 📏

#### 29. Weight Converter
**Name**: `weight_converter` | **Category**: conversion | **Icon**: ⚖️

#### 30. Currency Formatter
**Name**: `currency_formatter` | **Category**: conversion | **Icon**: 💱

#### 31. Number Formatter
**Name**: `number_formatter` | **Category**: conversion | **Icon**: #️⃣

### Utility

#### 32. UUID Generator
**Name**: `uuid_generator` | **Category**: utility | **Icon**: 🆔

#### 33. Lorem Ipsum Generator
**Name**: `lorem_ipsum` | **Category**: utility | **Icon**: 📝

#### 34. Email Validator
**Name**: `email_validator` | **Category**: utility | **Icon**: ✉️

#### 35. Color Converter (RGB to Hex)
**Name**: `color_rgb_to_hex` | **Category**: utility | **Icon**: 🎨

#### 36. Color Converter (Hex to RGB)
**Name**: `color_hex_to_rgb` | **Category**: utility | **Icon**: 🎨

#### 37. City Lookup
**Name**: `city_lookup` | **Category**: utility | **Icon**: 🏙️

#### 38. Distance Calculator (Haversine)
**Name**: `distance_calculator` | **Category**: utility | **Icon**: 📍

#### 39. Zalgo Text
**Name**: `zalgo_text` | **Category**: utility | **Icon**: 😈

#### 40. Leet Speak Converter
**Name**: `leet_converter` | **Category**: utility | **Icon**: 🤖

#### 41. Zodiac Sign Calculator
**Name**: `zodiac_sign` | **Category**: utility | **Icon**: ♈

## Handler Code Environment

The handler code executes in a restricted JavaScript environment with the following structure:

### Function Signature

```javascript
// Your code receives:
// - args: Object with input parameters (from inputSchema)
// - safeContext: Object with allowed globals

// Example:
const { param1, param2 } = args;
```

### Available Globals (via `safeContext`)

| Global | Description | Example Usage |
|--------|-------------|---------------|
| `JSON` | JSON.parse / JSON.stringify | `JSON.stringify(obj)` |
| `Math` | Mathematical functions | `Math.round()`, `Math.random()` |
| `Date` | Date constructor | `new Date()` |
| `console` | Logging utility | `console.log('debug')` |
| `sleep(ms)` | Async delay | `await sleep(1000)` |
| `fetch` | HTTP requests | `await fetch(url)` |

### Return Format

Your handler must return an object conforming to the MCP `CallToolResult` interface:

```javascript
{
  content: [
    // Text response
    { type: 'text', text: 'Your message here' },
    
    // Image response (base64)
    { type: 'image', data: 'base64string', mimeType: 'image/png' },
    
    // Resource reference
    { type: 'resource', resource: { uri: 'http://...', text: '...' } }
  ],
  isError?: boolean  // Optional: true if this is an error
}
```

### Example Handler

```javascript
// Simple echo handler
const { message } = args;
return {
  content: [{ type: 'text', text: `Echo: ${message}` }]
};

// Async example with fetch
const { url } = args;
try {
  const response = await fetch(url);
  const data = await response.text();
  return {
    content: [{ type: 'text', text: data }]
  };
} catch (error) {
  return {
    content: [{ type: 'text', text: `Error: ${error.message}` }],
    isError: true
  };
}
```

## Security Considerations

### ⚠️ Important Security Notes

1. **Trusted Users Only**
   - Custom tool code executes on the server
   - Only trusted users should be allowed to create tools
   - Code runs with limited but real Node.js API access

2. **Sandbox Limitations**
   - Handler code uses `new Function()` for compilation
   - This is NOT a true sandbox - determined authors may escape restrictions
   - The `safeContext` object limits global access but doesn't prevent all attacks

3. **Potential Risks**
   - **Fetch Access**: Tools can make HTTP requests to external services
   - **Prototype Chains**: Code may access Node.js internals via prototypes
   - **No File System Access**: Direct FS access is blocked, but indirect access may be possible

4. **Mitigation Strategies**
   - Implement user authentication and authorization
   - Review tool code before deployment
   - Consider implementing rate limiting
   - Monitor tool execution logs
   - For untrusted users, consider using a proper VM sandbox (e.g., `node:vm`)

## Usage Examples

### Example 1: Temperature Converter

```json
{
  "name": "temperature_converter",
  "displayName": "Temperature Converter",
  "description": "Converts temperatures between Celsius, Fahrenheit, and Kelvin",
  "inputSchema": "{\n  \"type\": \"object\",\n  \"properties\": {\n    \"value\": { \"type\": \"number\", \"description\": \"Temperature value\" },\n    \"from\": { \"type\": \"string\", \"enum\": [\"celsius\", \"fahrenheit\", \"kelvin\"], \"description\": \"Source unit\" },\n    \"to\": { \"type\": \"string\", \"enum\": [\"celsius\", \"fahrenheit\", \"kelvin\"], \"description\": \"Target unit\" }\n  },\n  \"required\": [\"value\", \"from\", \"to\"]\n}",
  "handlerCode": "const { value, from, to } = args;\nconst toCelsius = {\n  celsius: v => v,\n  fahrenheit: v => (v - 32) * 5/9,\n  kelvin: v => v - 273.15\n};\nconst fromCelsius = {\n  celsius: v => v,\n  fahrenheit: v => v * 9/5 + 32,\n  kelvin: v => v + 273.15\n};\nconst celsius = toCelsius[from](value);\nconst result = fromCelsius[to](celsius);\nreturn {\n  content: [{ type: 'text', text: `${value}°${from[0].toUpperCase()} = ${result.toFixed(2)}°${to[0].toUpperCase()}` }]\n};",
  "category": "utility",
  "icon": "🌡️"
}
```

### Example 2: Email Validator

```json
{
  "name": "email_validator",
  "displayName": "Email Validator",
  "description": "Validates email address format",
  "inputSchema": "{\n  \"type\": \"object\",\n  \"properties\": {\n    \"email\": { \"type\": \"string\", \"description\": \"Email to validate\" }\n  },\n  \"required\": [\"email\"]\n}",
  "handlerCode": "const { email } = args;\nconst emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\nconst isValid = emailRegex.test(email);\nreturn {\n  content: [{ type: 'text', text: `Email: ${email}\\nValid: ${isValid}` }]\n};",
  "category": "utility",
  "icon": "✉️"
}
```

### Example 3: HTTP Request Helper (Advanced)

```json
{
  "name": "http_request",
  "displayName": "HTTP Request Helper",
  "description": "Makes HTTP requests to external APIs",
  "inputSchema": "{\n  \"type\": \"object\",\n  \"properties\": {\n    \"url\": { \"type\": \"string\", \"description\": \"Target URL\" },\n    \"method\": { \"type\": \"string\", \"enum\": [\"GET\", \"POST\", \"PUT\", \"DELETE\"], \"description\": \"HTTP method\", \"default\": \"GET\" }\n  },\n  \"required\": [\"url\"]\n}",
  "handlerCode": "const { url, method = 'GET' } = args;\ntry {\n  const response = await fetch(url, { method });\n  const data = await response.text();\n  return {\n    content: [{ \n      type: 'text', \n      text: `HTTP ${method} ${url}\\nStatus: ${response.status}\\nBody: ${data.substring(0, 500)}` \n    }]\n  };\n} catch (error) {\n  return {\n    content: [{ type: 'text', text: `Error: ${error.message}` }],\n    isError: true\n  };\n}",
  "category": "utility",
  "icon": "🌐"
}
```

## Testing

### Test via API

```bash
# Create a tool
curl -X POST http://localhost:3100/api/custom-tools \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test_echo",
    "displayName": "Test Echo Tool",
    "description": "A simple echo tool for testing",
    "inputSchema": "{\"type\":\"object\",\"properties\":{\"message\":{\"type\":\"string\"}},\"required\":[\"message\"]}",
    "handlerCode": "const { message } = args; return { content: [{ type: \"text\", text: \"Echo: \" + message }] };"
  }'

# Get tool details
curl http://localhost:3100/api/custom-tools/1

# Test the tool
curl -X POST http://localhost:3100/api/custom-tools/1/test \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello World"}'

# Toggle the tool
curl -X POST http://localhost:3100/api/custom-tools/1/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Delete the tool
curl -X DELETE http://localhost:3100/api/custom-tools/1
```

### Test via UI

1. Navigate to `/admin/custom-tools`
2. Click the **Play/Test** icon next to any tool
3. Enter test arguments in JSON format in the dialog
4. Click **Run Test**
5. View the result in the dialog
6. Click **Copy Result** to copy output to clipboard

### Test via MCP Protocol

```json
// List available tools
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}

// Call a custom tool
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "simple_calculator",
    "arguments": {
      "a": 10,
      "b": 5,
      "operation": "add"
    }
  }
}
```

## Integration with MCP Protocol

### Automatic Registration Flow

1. **Server Startup**
   - `CustomToolExecutor.loadAllFromDatabase()` is called
   - All enabled tools are loaded into memory
   - Each tool is registered with the MCP tool registry

2. **Tool Creation**
   - New tool saved to database
   - `loadAllFromDatabase()` refreshes the registry
   - Tool becomes available immediately (if enabled)

3. **Tool Update**
   - `reloadTool()` unregisters old version
   - Tool re-registered with updated code
   - Brief availability gap during reload

4. **Tool Toggle**
   - **Enable**: `reloadTool()` registers the tool
   - **Disable**: `unregisterTool()` removes from registry

5. **Tool Deletion**
   - `unregisterTool()` removes from registry
   - Tool deleted from database

### Available via MCP Endpoints

- `tools/list` - Lists all registered tools including custom ones
- `tools/call` - Executes custom tools with provided arguments

## Troubleshooting

### Tool Not Appearing in List

**Symptoms**: Tool created but not visible in MCP `tools/list`

**Solutions:**
- Check if tool is enabled in database
- Restart server to reload all tools
- Check server logs for registration errors
- Verify tool name doesn't conflict with existing tools

```sql
-- Check tool status
SELECT id, name, enabled FROM custom_tools WHERE id = 1;

-- Enable tool if disabled
UPDATE custom_tools SET enabled = true WHERE id = 1;
```

### Tool Execution Errors

**Symptoms**: Tool runs but returns error results

**Common Issues:**
- Invalid input parameters (not matching schema)
- Runtime errors in handler code
- Network issues (for fetch-based tools)

**Debugging:**
```javascript
// Add logging to handler
const { param } = args;
console.log('Received param:', param);
// ... your code
```

Check server logs for detailed error messages.

### Compilation Errors

**Symptoms**: Tool cannot be created or updated

**Validation Errors:**
- `Invalid tool name` - Must start with letter, alphanumeric + underscore only
- `Invalid input schema` - Must be valid JSON with `type: "object"`
- `Invalid handler code` - JavaScript syntax error

**Fix:**
```bash
# Validate code before creating
curl -X POST http://localhost:3100/api/custom-tools/validate-code \
  -H "Content-Type: application/json" \
  -d '{"code": "your code here"}'
```

### Tool Stuck in Inconsistent State

**Symptoms**: Tool exists in DB but not in executor memory

**Solution:**
```javascript
// Reload all tools
await customToolExecutor.clearAll();
await customToolExecutor.loadAllFromDatabase();
```

Or restart the server.

## Future Enhancements

Planned improvements for future versions:

### Short-term
- [ ] Tool execution history and audit logs
- [ ] Tool usage metrics and performance tracking
- [ ] Better error messages with stack traces
- [ ] Tool version history
- [ ] Import/Export tools as JSON

### Medium-term
- [ ] Tool groups and collections
- [ ] Permission-based tool access
- [ ] Tool scheduling and triggers
- [ ] Tool chaining (output of one tool feeds another)
- [ ] External dependency management (npm packages)

### Long-term
- [ ] True sandboxed execution (WebAssembly/VM)
- [ ] Tool marketplace/sharing
- [ ] Collaborative tool editing
- [ ] Tool templates with variable substitution
- [ ] AI-assisted tool generation

## API Reference

### Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `INVALID_REQUEST` | Invalid input or validation error |
| 404 | `NOT_FOUND` | Tool not found |
| 409 | `CONFLICT` | Tool name already exists |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

### Error Response Format

```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

### Rate Limits

No rate limiting is currently applied to custom tools endpoints. In production, consider:

- Rate limiting per IP/user
- Tool execution timeout limits (e.g., 30 seconds)
- Resource limits (memory, CPU per execution)

### Request Headers

All requests should include:
```
Content-Type: application/json
```

### CORS

API supports CORS for frontend integration:
- Allowed origins: `*` (configure for production)
- Allowed methods: `GET, POST, PUT, DELETE`
- Allowed headers: `Content-Type`

## Development

### Adding New Templates

Edit `backend/src/constants/custom-tools-templates.ts`:

```typescript
const customToolsTemplates: ToolTemplate[] = [
  // ... existing templates
  
  {
    name: 'Your Template Name',
    description: 'What it does',
    code: {
      name: 'template_name',
      displayName: 'Display Name',
      description: 'Full description',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: { /* ... */ },
        required: []
      }, null, 2),
      handlerCode: `// Your handler code here`,
      category: 'category',
      icon: '🎯'
    }
  }
];
```

### Extending SafeContext

Add new globals in `CustomToolExecutor.createSafeHandler()`:

```typescript
const safeContext = {
  JSON,
  Math,
  Date,
  console: /* ... */,
  sleep: /* ... */,
  // Add your custom global here
  myCustomFunc: (x) => x * 2
};
```

## Support

For issues, questions, or contributions:

1. **Check Server Logs**: Review console output or `/var/log/mcp-server.log`
2. **API Documentation**: Review this document and endpoint details
3. **Example Tools**: Use templates as starting points
4. **GitHub**: Check the repository for known issues and open issues
5. **Community**: Engage with other users for tips and solutions

---

**Version**: 2.0 | **Last Updated**: 2024 | **Maintained by**: Junaid Atari
