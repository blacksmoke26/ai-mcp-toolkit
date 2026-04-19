# HTTP Client Module

Comprehensive HTTP client module built on top of Axios, providing a centralized, configurable interface for making HTTP requests throughout the application.

## Overview

The HTTP client module (`httpClient.ts`) replaces native `fetch` with a more robust solution that offers:

- **Automatic retry with exponential backoff**
- **Request and response interceptors**
- **Consistent error handling**
- **Streaming support for SSE (Server-Sent Events)**
- **Cancellation support via AbortController**
- **Configurable timeouts and headers**
- **Type-safe request/response handling**

## Installation

The HTTP client depends on Axios:

```bash
yarn add axios
```

## Quick Start

### Basic Usage

```typescript
import { createHttpClient } from '@/utils/httpClient';

// Create a client instance
const client = createHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 30000,
});

// Make GET request
const response = await client.get<User[]>('/users');
console.log(response.data);

// Make POST request
const newUser = await client.post<User>('/users', {
  name: 'John Doe',
  email: 'john@example.com',
});
```

### With Authentication

```typescript
import { createAuthClient } from '@/utils/httpClient';

const client = createAuthClient(
  'https://api.example.com',
  'your-api-token',
  {
    timeout: 60000,
    maxRetries: 3,
  }
);
```

### For Streaming/SSE

```typescript
import { createStreamingClient } from '@/utils/httpClient';

const streamClient = createStreamingClient('https://api.example.com');

const stream = await streamClient.stream('/chat/stream', {
  method: 'POST',
  data: { message: 'Hello' },
});

const reader = stream.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(new TextDecoder().decode(value));
}
```

## Features

### 1. Automatic Retry with Exponential Backoff

The client automatically retries failed requests with exponential backoff:

```typescript
const client = createHttpClient({
  baseUrl: 'https://api.example.com',
  maxRetries: 3,
  retryDelay: 1000, // Initial delay in ms
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
});
```

**Retry Logic:**
- **Initial delay:** Configured `retryDelay` (default: 1000ms)
- **Exponential backoff:** Delay doubles on each retry
- **Maximum delay:** 30 seconds
- **Jitter:** ±10% random variation to prevent thundering herd
- **Retryable codes:** 408, 429, 5xx errors by default

### 2. Request Cancellation

Cancel in-flight requests using AbortController:

```typescript
import { HttpError } from '@/utils/httpClient';

const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const response = await client.get('/endpoint', {
    signal: controller.signal,
  });
  clearTimeout(timeoutId);
} catch (error) {
  clearTimeout(timeoutId);
  if (error instanceof HttpError && error.isCancelled) {
    console.log('Request was cancelled');
  }
}
```

### 3. Interceptors

Add custom request/response interceptors:

```typescript
// Request interceptor
const requestInterceptorId = client.useRequestInterceptor(
  (config) => {
    // Add custom header
    config.headers.set('X-Custom-Header', 'value');
    return config;
  }
);

// Response interceptor
const responseInterceptorId = client.useResponseInterceptor(
  (response) => {
    // Log response time
    console.log(`Response in ${Date.now() - response.config.metadata.startTime}ms`);
    return response;
  }
);

// Remove interceptors later
client.ejectRequestInterceptor(requestInterceptorId);
client.ejectResponseInterceptor(responseInterceptorId);
```

### 4. Error Handling

All HTTP errors are wrapped in `HttpError` with detailed information:

```typescript
import { HttpError } from '@/utils/httpClient';

try {
  await client.get('/protected');
} catch (error) {
  if (error instanceof HttpError) {
    console.error(`HTTP ${error.status}: ${error.message}`);
    console.error('Response data:', error.response?.data);
    console.error('Is timeout:', error.isTimeout);
    console.error('Is cancelled:', error.isCancelled);
  }
}
```

**HttpError Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `status` | `number \| undefined` | HTTP status code |
| `response` | `AxiosResponse \| undefined` | Full response object |
| `request` | `AxiosRequestConfig \| undefined` | Failed request config |
| `isTimeout` | `boolean` | Whether error is due to timeout |
| `isCancelled` | `boolean` | Whether request was cancelled |

### 5. Streaming Support

Stream responses for large payloads or SSE:

```typescript
// Streaming POST request
const stream = await client.stream('/upload', {
  method: 'POST',
  data: fileBuffer,
});

const reader = stream.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  // Process chunk
  processChunk(value);
}
```

## Configuration

### HttpClientConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `baseUrl` | `string` | **Required** | Base URL for all requests |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `headers` | `Record<string, string>` | `{}` | Default headers for all requests |
| `maxRetries` | `number` | `3` | Maximum retry attempts |
| `retryDelay` | `number` | `1000` | Initial retry delay in milliseconds |
| `retryableStatusCodes` | `number[]` | `[408, 429, 500, 502, 503, 504]` | Status codes that trigger retry |
| `withCredentials` | `boolean` | `false` | Include cookies in cross-origin requests |
| `validateStatus` | `(status: number) => boolean` | `status >= 200 && status < 300` | Custom status validation |
| `adapter` | `AxiosAdapter` | `undefined` | Custom Axios adapter |

### HttpRequestOptions

| Property | Type | Description |
|----------|------|-------------|
| `signal` | `AbortSignal` | Abort signal for cancellation |
| `timeout` | `number` | Override default timeout |
| `headers` | `Record<string, string>` | Override default headers |
| `params` | `Record<string, unknown>` | URL query parameters |
| `data` | `unknown` | Request body |
| `method` | `string` | HTTP method |

## API Reference

### Factory Functions

#### `createHttpClient(config: HttpClientConfig): HttpClient`

Creates a new HTTP client instance with the specified configuration.

```typescript
const client = createHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 30000,
  headers: { 'Authorization': 'Bearer token' },
});
```

#### `createPublicClient(baseUrl: string, options?: Partial<HttpClientConfig>): HttpClient`

Creates an unauthenticated client for public endpoints.

```typescript
const client = createPublicClient('https://api.public.com');
```

#### `createAuthClient(baseUrl: string, token: string, options?: Partial<HttpClientConfig>): HttpClient`

Creates an authenticated client with Bearer token.

```typescript
const client = createAuthClient(
  'https://api.example.com',
  'sk-your-api-token'
);
```

#### `createStreamingClient(baseUrl: string, token?: string, options?: Partial<HttpClientConfig>): HttpClient`

Creates a client optimized for streaming connections.

```typescript
const streamClient = createStreamingClient('https://api.example.com', 'token');
```

### HttpClient Methods

#### `get<T>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>`

Sends a GET request.

```typescript
const users = await client.get<User[]>('/users', {
  params: { page: 1, limit: 10 },
});
```

#### `post<T>(url: string, data?: unknown, options?: HttpRequestOptions): Promise<HttpResponse<T>>`

Sends a POST request.

```typescript
const user = await client.post<User>('/users', {
  name: 'John',
  email: 'john@example.com',
});
```

#### `put<T>(url: string, data?: unknown, options?: HttpRequestOptions): Promise<HttpResponse<T>>`

Sends a PUT request.

```typescript
const user = await client.put<User>('/users/123', {
  name: 'John Updated',
});
```

#### `patch<T>(url: string, data?: unknown, options?: HttpRequestOptions): Promise<HttpResponse<T>>`

Sends a PATCH request.

```typescript
const user = await client.patch<User>('/users/123', {
  name: 'John Patched',
});
```

#### `delete<T>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>`

Sends a DELETE request.

```typescript
await client.delete('/users/123');
```

#### `head(url: string, options?: HttpRequestOptions): Promise<HttpResponse<unknown>>`

Sends a HEAD request.

```typescript
const response = await client.head('/file.pdf');
console.log(response.headers['content-length']);
```

#### `options(url: string, options?: HttpRequestOptions): Promise<HttpResponse<unknown>>`

Sends an OPTIONS request.

```typescript
const response = await client.options('/api');
```

#### `stream(url: string, options?: HttpRequestOptions): Promise<ReadableStream>`

Sends a request and returns a streaming response.

```typescript
const stream = await client.stream('/download', {
  method: 'POST',
  data: { fileId: '123' },
});
```

#### `text(url: string, options?: HttpRequestOptions): Promise<HttpResponse<string>>`

Sends a request and returns the response body as text.

```typescript
const response = await client.text('/plaintext');
console.log(response.data);
```

### Utility Methods

#### `getConfig(): Readonly<HttpClientConfig>`

Gets the current client configuration.

```typescript
const config = client.getConfig();
```

#### `setBaseUrl(baseUrl: string): void`

Updates the base URL.

```typescript
client.setBaseUrl('https://new-api.example.com');
```

#### `setTimeout(timeout: number): void`

Updates the default timeout.

```typescript
client.setTimeout(60000);
```

#### `setDefaultHeader(name: string, value: string): void`

Adds a default header to all requests.

```typescript
client.setDefaultHeader('X-API-Key', 'your-api-key');
```

#### `removeDefaultHeader(name: string): void`

Removes a default header.

```typescript
client.removeDefaultHeader('X-API-Key');
```

#### `useRequestInterceptor(onFulfilled, onRejected): number`

Adds a request interceptor. Returns interceptor ID.

```typescript
const id = client.useRequestInterceptor((config) => {
  config.headers.set('X-Tracing-Id', crypto.randomUUID());
  return config;
});
```

#### `useResponseInterceptor(onFulfilled, onRejected): number`

Adds a response interceptor. Returns interceptor ID.

```typescript
const id = client.useResponseInterceptor((response) => {
  console.log(`${response.status} ${response.config.url}`);
  return response;
});
```

#### `ejectRequestInterceptor(interceptorId: number): void`

Removes a request interceptor.

```typescript
client.ejectRequestInterceptor(id);
```

#### `ejectResponseInterceptor(interceptorId: number): void`

Removes a response interceptor.

```typescript
client.ejectResponseInterceptor(id);
```

#### `destroy(): void`

Destroys the client and cleans up resources.

```typescript
client.destroy();
```

## Use Cases in This Project

### LLM Providers

The HTTP client is used by LLM providers to make API requests:

```typescript
// OllamaProvider
private buildHttpClientConfig(): HttpClientConfig {
  return {
    baseUrl: this.config.baseUrl,
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    maxRetries: 3,
    retryDelay: 1000,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  };
}

async chat(messages: ChatMessage[], options?: Partial<LLMGenerationParams>) {
  const response = await this.httpClient.post<OllamaChatResponse>('/api/chat', params);
  return this.parseResponse(response.data);
}

async *streamChat(messages: ChatMessage[], options?: Partial<LLMGenerationParams>) {
  const stream = await this.httpClient.stream('/api/chat', {
    method: 'POST',
    data: params,
  });
  // Process stream...
}
```

### OpenAI-Compatible APIs

```typescript
// OpenAIProvider
private buildHttpClientConfig(): HttpClientConfig {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (this.config.apiKey) {
    headers['Authorization'] = `Bearer ${this.config.apiKey}`;
  }

  return {
    baseUrl: this.config.baseUrl,
    timeout: 60000,
    headers,
    maxRetries: 3,
    retryDelay: 1000,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  };
}
```

## Migration from Fetch

### Before (fetch)

```typescript
const response = await fetch(`${baseUrl}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(params),
});

if (!response.ok) {
  throw new Error(`API error: ${response.status}`);
}

const data = await response.json();
```

### After (HttpClient)

```typescript
const client = createHttpClient({
  baseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
  maxRetries: 3,
});

const response = await client.post('/api/chat', params);

if (response.status >= 400) {
  throw new HttpError(`API error: ${response.status}`, response.status, {
    data: response.data,
    status: response.status,
    statusText: response.statusText,
  });
}

const data = response.data;
```

## Error Handling Best Practices

### 1. Catch HttpError Specifically

```typescript
import { HttpError } from '@/utils/httpClient';

try {
  await client.post('/endpoint', data);
} catch (error) {
  if (error instanceof HttpError) {
    // Handle HTTP errors
    if (error.status === 401) {
      // Handle unauthorized
      redirectToLogin();
    } else if (error.status === 429) {
      // Handle rate limit
      waitAndRetry();
    } else {
      // Handle other errors
      showError(error.message);
    }
  } else {
    // Handle network or other errors
    showError('Network error');
  }
}
```

### 2. Use Health Checks with Timeout

```typescript
async healthCheck(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await client.get('/health', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof HttpError && error.isCancelled) {
        return false;
      }
      throw error;
    }
  } catch {
    return false;
  }
}
```

## Performance Considerations

### Connection Pooling

Axios maintains an internal connection pool. For high-throughput applications:

```typescript
const client = createHttpClient({
  baseUrl: 'https://api.example.com',
  // Keep client instance alive for connection reuse
});
```

### Timeout Configuration

Set appropriate timeouts based on operation:

```typescript
// Fast operations
const client = createHttpClient({
  baseUrl,
  timeout: 5000, // 5 seconds
});

// Streaming operations
const streamClient = createStreamingClient(baseUrl, token, {
  timeout: 600000, // 10 minutes
});
```

### Retry Strategy

Adjust retry strategy based on use case:

```typescript
// Idempotent operations
const client = createHttpClient({
  baseUrl,
  maxRetries: 5,
  retryDelay: 1000,
});

// Non-idempotent operations
const client = createHttpClient({
  baseUrl,
  maxRetries: 1, // Single retry only
});
```

## Troubleshooting

### Common Issues

**Issue:** Request times out

**Solution:** Increase timeout or optimize endpoint:

```typescript
const client = createHttpClient({
  baseUrl,
  timeout: 120000, // 2 minutes
});
```

**Issue:** Too many retries

**Solution:** Reduce maxRetries for non-idempotent operations:

```typescript
const client = createHttpClient({
  baseUrl,
  maxRetries: 1,
});
```

**Issue:** CORS errors

**Solution:** Enable withCredentials:

```typescript
const client = createHttpClient({
  baseUrl,
  withCredentials: true,
});
```

**Issue:** Rate limiting

**Solution:** Add retry-after handling:

```typescript
const client = createHttpClient({
  baseUrl,
  useResponseInterceptor: (response) => {
    const retryAfter = response.headers['retry-after'];
    if (response.status === 429 && retryAfter) {
      // Handle rate limit
    }
    return response;
  },
});
```

## Security Best Practices

### 1. Don't Log Sensitive Data

```typescript
// Good - log only in development
if (process.env.NODE_ENV === 'development') {
  console.log('Request details...');
}

// Bad - never log tokens
console.log(config.headers); // May contain Authorization header
```

### 2. Use Environment Variables for API Keys

```typescript
const client = createAuthClient(
  'https://api.example.com',
  process.env.API_KEY || '',
);
```

### 3. Validate Response Status

Always check response status:

```typescript
const response = await client.get('/endpoint');

if (response.status < 200 || response.status >= 300) {
  throw new HttpError('Request failed', response.status);
}
```

## License

MIT License - see [LICENSE](../../LICENSE)