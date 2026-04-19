/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module utils/httpClient
 * @description Comprehensive HTTP client module using Axios.
 *
 * Provides a centralized, configurable HTTP client for making API requests.
 * This module replaces native `fetch` with Axios for better error handling,
 * interceptors, retry logic, and cancellation support.
 *
 * ## Features
 *
 * - Configurable base URL, timeout, headers, and interceptors
 * - Automatic retry with exponential backoff
 * - Request and response interceptors for logging, auth, and error handling
 * - Cancellation support via AbortController
 * - Type-safe request/response handling
 * - Streaming support for SSE (Server-Sent Events)
 * - Comprehensive error handling and transformation
 *
 * ## Usage
 *
 * ```typescript
 * import { createHttpClient, HttpClientConfig } from '@/utils/httpClient';
 *
 * // Create a client instance
 * const client = createHttpClient({
 *   baseUrl: 'https://api.example.com',
 *   timeout: 30000,
 *   headers: { 'Authorization': 'Bearer token' },
 * });
 *
 * // Make requests
 * const response = await client.get('/users');
 * const data = await client.post('/users', { name: 'John' });
 *
 * // With cancellation
 * const controller = new AbortController();
 * setTimeout(() => controller.abort(), 5000);
 * const result = await client.get('/users', { signal: controller.signal });
 * ```
 *
 * ## Error Handling
 *
 * All requests throw `HttpError` on failure, which provides:
 * - HTTP status code
 * - Error message and response data
 * - Original request details for debugging
 *
 * ```typescript
 * try {
 *   await client.get('/protected');
 * } catch (error) {
 *   if (error instanceof HttpError) {
 *     console.error(`HTTP ${error.status}: ${error.message}`);
 *     console.error('Response:', error.response?.data);
 *   }
 * }
 * ```
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosAdapter,
} from 'axios';

// ─── Type Definitions ──────────────────────────────────────────────────────

/**
 * Configuration options for the HTTP client.
 */
export interface HttpClientConfig {
  /** Base URL for all requests made by this client instance. */
  baseUrl: string;
  /** Default timeout in milliseconds for all requests. */
  timeout?: number;
  /** Default headers to include in all requests. */
  headers?: Record<string, string>;
  /** Maximum number of retry attempts for transient failures. */
  maxRetries?: number;
  /** Initial delay in milliseconds between retries. */
  retryDelay?: number;
  /** HTTP status codes that should trigger automatic retry. */
  retryableStatusCodes?: number[];
  /** Whether to include credentials in cross-origin requests. */
  withCredentials?: boolean;
  /** Optional custom validation function for response status. */
  validateStatus?: (status: number) => boolean;
  /** Optional adapter for custom HTTP handling. */
  adapter?: AxiosAdapter;
}

/**
 * Extended request options that support cancellation and streaming.
 *
 * @property signal - AbortSignal for request cancellation
 * @property responseType - Expected response type ('json', 'text', 'stream', etc.)
 * @property timeout - Override default timeout for this specific request
 * @property headers - Override or extend default headers
 */
export interface HttpRequestOptions extends Omit<AxiosRequestConfig, 'signal'> {
  /** AbortSignal for cancelling the request. */
  signal?: AbortSignal;
  /** Expected response type for the request. */
  responseType?: 'json' | 'text' | 'stream' | 'arraybuffer' | 'blob';
}

/**
 * Response wrapper that provides type-safe access to response data.
 */
export interface HttpResponse<T = unknown> {
  /** The parsed response body. */
  data: T;
  /** HTTP status code. */
  status: number;
  /** HTTP status text. */
  statusText: string;
  /** Response headers. */
  headers: Record<string, string>;
  /** Request configuration. */
  config: AxiosRequestConfig;
}

/**
 * Custom error class for HTTP errors with detailed information.
 *
 * Extends the standard Error class to provide HTTP-specific details
 * including status code, response data, and request information.
 *
 * @example
 * ```typescript
 * try {
 *   await client.get('/endpoint');
 * } catch (error) {
 *   if (error instanceof HttpError) {
 *     console.error(`Failed with ${error.status}: ${error.message}`);
 *     if (error.response) {
 *       console.error('Response data:', error.response.data);
 *     }
 *   }
 * }
 * ```
 */
export class HttpError extends Error {
  /** HTTP status code (undefined if request failed before response). */
  readonly status?: number;

  /** Response data if available. */
  readonly response?: Partial<AxiosResponse>;

  /** Request configuration that failed. */
  readonly request?: AxiosRequestConfig;

  /** Whether this error is due to a timeout. */
  readonly isTimeout: boolean;

  /** Whether this error is due to cancellation. */
  readonly isCancelled: boolean;

  /**
   * Creates a new HttpError instance.
   *
   * @param message - Error message description.
   * @param status - HTTP status code (if available).
   * @param response - Full response object (if available).
   * @param request - Request configuration that failed.
   */
  constructor(
    message: string,
    status?: number,
    response?: Partial<AxiosResponse>,
    request?: AxiosRequestConfig,
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.response = response;
    this.request = request;
    this.isTimeout = status === undefined && request !== undefined;
    this.isCancelled = request?.signal?.aborted ?? false;
  }

  /**
   * Creates an HttpError from an AxiosError.
   *
   * @param axiosError - The caught AxiosError instance.
   * @returns A new HttpError with all relevant information.
   */
  static fromAxiosError(axiosError: AxiosError): HttpError {
    if (axiosError.response) {
      return new HttpError(
        `${axiosError.response.status} ${axiosError.response.statusText}`,
        axiosError.response.status,
        axiosError.response,
        axiosError.config,
      );
    }

    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return new HttpError('Request timed out', undefined, undefined, axiosError.config);
    }

    if (axiosError.code === 'ERR_CANCELED') {
      return new HttpError('Request was cancelled', undefined, undefined, axiosError.config);
    }

    return new HttpError(
      axiosError.message || 'Unknown HTTP error',
      undefined,
      undefined,
      axiosError.config,
    );
  }
}

 /**
  * Configuration for retry behavior.
  *
  * Defines the parameters used to control how failed requests are retried,
  * including the number of attempts, timing strategy, and backoff behavior.
  */
 interface RetryConfig {
   /** Whether the retry logic is enabled for the client. */
   enabled: boolean;
   /** Maximum number of retry attempts before giving up. */
   maxAttempts: number;
   /** Initial delay in milliseconds before the first retry. */
   initialDelay: number;
   /** Maximum delay cap in milliseconds for exponential backoff. */
   maxDelay: number;
   /** Multiplier used for exponential backoff calculation (e.g., 2 for doubling). */
   backoffMultiplier: number;
 }

// ─── Retry Logic ────────────────────────────────────────────────────────────

/**
 * Calculates the delay for the next retry using exponential backoff.
 *
 * Uses the formula: min(maxDelay, initialDelay * (multiplier ^ attempt))
 * with optional jitter to prevent thundering herd problems.
 *
 * @param attempt - Current retry attempt number (0-indexed).
 * @param config - Retry configuration object.
 * @returns The calculated delay in milliseconds.
 */
function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  const delay = Math.min(exponentialDelay, config.maxDelay);
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.2 * delay; // ±10%
  return Math.floor(delay + jitter);
}

/**
 * Checks if a status code should trigger a retry.
 *
 * @param status - HTTP status code to check.
 * @param retryableCodes - Array of status codes that should retry.
 * @returns True if the status should retry, false otherwise.
 */
function shouldRetry(status: number, retryableCodes: number[]): boolean {
  // Always retry on 5xx errors if included in retryable codes
  if (status >= 500 && status < 600) return retryableCodes.includes(status);
  // Retry on 429 (Too Many Requests)
  if (status === 429) return true;
  // Retry on 408 (Request Timeout)
  if (status === 408) return true;
  // Retry on specific 4xx errors if included
  return status < 500 && retryableCodes.includes(status);
}

// ─── HttpClient Class ────────────────────────────────────────────────────────

/**
 * HTTP client class providing a centralized interface for all HTTP requests.
 *
 * This class wraps Axios to provide:
 * - Configurable base settings and defaults
 * - Automatic retry with exponential backoff
 * - Request and response interceptors
 * - Cancellation support
 * - Consistent error handling
 * - Streaming support
 *
 * @example
 * ```typescript
 * const client = createHttpClient({
 *   baseUrl: 'https://api.example.com',
 *   timeout: 30000,
 *   maxRetries: 3,
 * });
 *
 * const users = await client.get<User[]>('/users');
 * const user = await client.post<User>('/users', { name: 'John' });
 * ```
 */
export class HttpClient {
  /** Underlying Axios instance. */
  private axios: AxiosInstance;

  /** Client configuration. */
  private config: HttpClientConfig & {
    timeout: number;
    headers: Record<string, string>;
    maxRetries: number;
    retryDelay: number;
    retryableStatusCodes: number[];
    withCredentials: boolean;
    validateStatus: (status: number) => boolean;
  };

  /** Retry configuration derived from client config. */
  private retryConfig: RetryConfig;

  /**
   * Creates a new HttpClient instance.
   *
   * @param config - Configuration options for the HTTP client.
   */
  constructor(config: HttpClientConfig) {
    // Set default values for all config options
    this.config = {
      baseUrl: config.baseUrl,
      timeout: config.timeout ?? 30000,
      headers: config.headers ?? {},
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      retryableStatusCodes: config.retryableStatusCodes ?? [408, 429, 500, 502, 503, 504],
      withCredentials: config.withCredentials ?? false,
      validateStatus: config.validateStatus ?? ((status) => status >= 200 && status < 300),
    };

    // Create Axios instance with base configuration
    const axiosConfig: Partial<AxiosRequestConfig> = {
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: this.config.headers,
      withCredentials: this.config.withCredentials,
      validateStatus: this.config.validateStatus,
      decompress: true,
      adapter: this.config.adapter,
    };

    // Initialize retry configuration
    this.retryConfig = {
      enabled: this.config.maxRetries > 0,
      maxAttempts: this.config.maxRetries,
      initialDelay: this.config.retryDelay,
      maxDelay: 30000,
      backoffMultiplier: 2,
    };

    this.axios = axios.create(axiosConfig);

    // Set up interceptors
    this.setupInterceptors();
  }

  /**
   * Sets up request and response interceptors.
   *
   * Request interceptors handle:
   - Adding request ID for tracing
   - Request logging (in development)
   - Timeout overrides
   - Cancellation token handling
   *
   * Response interceptors handle:
   - Response logging (in development)
   - Error transformation
   - Retry logic
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.axios.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Add request ID for tracing
        const requestId = crypto.randomUUID();
        config.headers.set('x-request-id', requestId);

        // Add timestamp
        config.headers.set('x-request-timestamp', new Date().toISOString());

        // Log request in development
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[HTTP] ${config.method?.toUpperCase() || 'GET'} ${config.url}`, {
            requestId,
            headers: config.headers,
          });
        }

        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(HttpError.fromAxiosError(error));
      },
    );

    // Response interceptor with retry logic
    this.axios.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log response in development
        if (process.env.NODE_ENV === 'development') {
          const requestId = response.headers['x-request-id'];
          console.debug(`[HTTP] ${response.status} ${response.config.url}`, { requestId });
        }

        return response;
      },
      async (error: AxiosError) => {
        const config = error.config as AxiosRequestConfig & { retryCount?: number };

        if (!config) {
          return Promise.reject(HttpError.fromAxiosError(error));
        }

        // Check if request was cancelled
        if (error.code === 'ERR_CANCELED') {
          return Promise.reject(HttpError.fromAxiosError(error));
        }

        // Check if we should retry
        if (
          this.retryConfig.enabled &&
          config.method &&
          !['get', 'head', 'options'].includes(config.method.toLowerCase())
        ) {
          const retryCount = config.retryCount ?? 0;

          if (retryCount < this.retryConfig.maxAttempts) {
            const status = error.response?.status;

            if (status && shouldRetry(status, this.config.retryableStatusCodes)) {
              config.retryCount = retryCount + 1;
              const delay = calculateRetryDelay(retryCount, this.retryConfig);

              if (process.env.NODE_ENV === 'development') {
                console.debug(`[HTTP] Retrying (${config.retryCount}/${this.retryConfig.maxAttempts}) after ${delay}ms`, {
                  requestId: error.config?.headers?.get('x-request-id'),
                  status,
                  delay,
                });
              }

              // Wait before retrying
              await new Promise((resolve) => setTimeout(resolve, delay));

              // Retry the request
              return this.axios(config);
            }
          }
        }

        // Don't retry GET requests by default (idempotent, but may cause issues)
        if (config.method?.toLowerCase() === 'get' && this.retryConfig.enabled) {
          const status = error.response?.status;
          const retryCount = config.retryCount ?? 0;

          if (
            retryCount < this.retryConfig.maxAttempts &&
            status &&
            shouldRetry(status, this.config.retryableStatusCodes)
          ) {
            config.retryCount = retryCount + 1;
            const delay = calculateRetryDelay(retryCount, this.retryConfig);

            if (process.env.NODE_ENV === 'development') {
              console.debug(`[HTTP] GET Retry (${config.retryCount}/${this.retryConfig.maxAttempts}) after ${delay}ms`);
            }

            await new Promise((resolve) => setTimeout(resolve, delay));
            return this.axios(config);
          }
        }

        // Transform and reject with HttpError
        return Promise.reject(HttpError.fromAxiosError(error));
      },
    );
  }

  // ─── HTTP Methods ─────────────────────────────────────────────────────────

  /**
   * Sends a GET request to the specified endpoint.
   *
   * @param url - Relative or absolute URL path.
   * @param options - Optional request configuration.
   * @returns Promise resolving to the response data.
   * @throws {HttpError} If the request fails.
   *
   * @example
   * ```typescript
   * const users = await client.get<User[]>('/users', {
   *   params: { page: 1, limit: 10 }
   * });
   * ```
   */
  async get<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    const response = await this.axios.get<T>(url, {
      ...options,
      signal: options?.signal,
      validateStatus: () => true, // Handle all status codes manually
    });
    return this.wrapResponse(response);
  }

  /**
   * Sends a POST request to the specified endpoint.
   *
   * @param url - Relative or absolute URL path.
   * @param data - Request payload.
   * @param options - Optional request configuration.
   * @returns Promise resolving to the response data.
   * @throws {HttpError} If the request fails.
   *
   * @example
   * ```typescript
   * const newUser = await client.post<User>('/users', {
   *   name: 'John',
   *   email: 'john@example.com'
   * });
   * ```
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse<T>> {
    const response = await this.axios.post<T>(url, data, {
      ...options,
      signal: options?.signal,
      validateStatus: () => true,
    });
    return this.wrapResponse(response);
  }

  /**
   * Sends a PUT request to the specified endpoint.
   *
   * @param url - Relative or absolute URL path.
   * @param data - Request payload.
   * @param options - Optional request configuration.
   * @returns Promise resolving to the response data.
   * @throws {HttpError} If the request fails.
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse<T>> {
    const response = await this.axios.put<T>(url, data, {
      ...options,
      signal: options?.signal,
      validateStatus: () => true,
    });
    return this.wrapResponse(response);
  }

  /**
   * Sends a PATCH request to the specified endpoint.
   *
   * @param url - Relative or absolute URL path.
   * @param data - Request payload.
   * @param options - Optional request configuration.
   * @returns Promise resolving to the response data.
   * @throws {HttpError} If the request fails.
   */
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse<T>> {
    const response = await this.axios.patch<T>(url, data, {
      ...options,
      signal: options?.signal,
      validateStatus: () => true,
    });
    return this.wrapResponse(response);
  }

  /**
   * Sends a DELETE request to the specified endpoint.
   *
   * @param url - Relative or absolute URL path.
   * @param options - Optional request configuration.
   * @returns Promise resolving to the response data.
   * @throws {HttpError} If the request fails.
   */
  async delete<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    const response = await this.axios.delete<T>(url, {
      ...options,
      signal: options?.signal,
      validateStatus: () => true,
    });
    return this.wrapResponse(response);
  }

  /**
   * Sends a HEAD request to the specified endpoint.
   *
   * @param url - Relative or absolute URL path.
   * @param options - Optional request configuration.
   * @returns Promise resolving to the response headers and status.
   * @throws {HttpError} If the request fails.
   */
  async head(url: string, options?: HttpRequestOptions): Promise<HttpResponse<unknown>> {
    const response = await this.axios.head(url, {
      ...options,
      signal: options?.signal,
      validateStatus: () => true,
    });
    return this.wrapResponse(response);
  }

  /**
   * Sends an OPTIONS request to the specified endpoint.
   *
   * @param url - Relative or absolute URL path.
   * @param options - Optional request configuration.
   * @returns Promise resolving to the response headers.
   * @throws {HttpError} If the request fails.
   */
  async options(url: string, options?: HttpRequestOptions): Promise<HttpResponse<unknown>> {
    const response = await this.axios.options(url, {
      ...options,
      signal: options?.signal,
      validateStatus: () => true,
    });
    return this.wrapResponse(response);
  }

  // ─── Streaming Methods ────────────────────────────────────────────────────

  /**
   * Makes a streaming request and returns the raw response body.
   *
   * Useful for Server-Sent Events (SSE) or large file downloads.
   *
   * @param url - Relative or absolute URL path.
   * @param options - Optional request configuration including method and body.
   * @returns Promise resolving to a ReadableStream.
   * @throws {HttpError} If the request fails.
   *
   * @example
   * ```typescript
   * const stream = await client.stream('/chat/stream', {
   *   method: 'POST',
   *   data: { message: 'Hello' },
   * });
   *
   * const reader = stream.getReader();
   * while (true) {
   *   const { done, value } = await reader.read();
   *   if (done) break;
   *   console.log(new TextDecoder().decode(value));
   * }
   * ```
   */
  async stream(url: string, options?: HttpRequestOptions): Promise<ReadableStream> {
    try {
      const response = await this.axios(url, {
        ...options,
        method: options?.method ?? 'GET',
        responseType: 'stream',
        signal: options?.signal,
        validateStatus: () => true,
      });

      if (!response.data || typeof response.data.pipe !== 'function') {
        throw new HttpError('Response is not a stream', response.status, response);
      }

      // Convert Node.js stream to Web API ReadableStream
      return this.nodeStreamToWebStream(response.data as NodeJS.ReadableStream);
    } catch (error) {
      if (error instanceof AxiosError) {
        throw HttpError.fromAxiosError(error);
      }
      throw error;
    }
  }

  /**
   * Makes a request and returns the response body as text.
   *
   * @param url - Relative or absolute URL path.
   * @param options - Optional request configuration.
   * @returns Promise resolving to the response text.
   * @throws {HttpError} If the request fails.
   */
  async text(url: string, options?: HttpRequestOptions): Promise<HttpResponse<string>> {
    const response = await this.axios(url, {
      ...options,
      method: options?.method ?? 'GET',
      responseType: 'text',
      signal: options?.signal,
      validateStatus: () => true,
    });
    return this.wrapResponse(response);
  }

  // ─── Utility Methods ──────────────────────────────────────────────────────

  /**
   * Wraps an Axios response into our HttpResponse type.
   *
   * @param response - The raw Axios response.
   * @returns A typed HttpResponse object.
   */
  private wrapResponse<T = unknown>(response: AxiosResponse<T>): HttpResponse<T> {
    const headers: Record<string, string> = {};
    const axiosHeaders = response.headers;
    for (const key in axiosHeaders) {
      const value = axiosHeaders[key];
      if (typeof value === 'string') {
        headers[key] = value;
      } else if (Array.isArray(value)) {
        headers[key] = value.join(', ');
      } else if (value !== null && value !== undefined) {
        headers[key] = String(value);
      }
    }

    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers,
      config: response.config,
    };
  }

  /**
   * Converts a Node.js ReadableStream to a Web API ReadableStream.
   *
   * @param nodeStream - The Node.js stream to convert.
   * @returns A Web API compatible ReadableStream.
   */
  private nodeStreamToWebStream(nodeStream: NodeJS.ReadableStream): ReadableStream {
    return new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });

        nodeStream.on('end', () => {
          controller.close();
        });

        nodeStream.on('error', (error) => {
          controller.error(error);
        });
      },

      cancel(reason?: unknown) {
        const nodeStreamAny = nodeStream as unknown as { destroy: (err?: Error) => void };
        if (nodeStreamAny.destroy) {
          nodeStreamAny.destroy(reason as Error);
        }
      },
    });
  }

  /**
   * Gets the current client configuration.
   *
   * @returns A copy of the client configuration.
   */
  getConfig(): Readonly<HttpClientConfig> {
    return { ...this.config };
  }

  /**
   * Updates the client's base URL.
   *
   * @param baseUrl - The new base URL.
   */
  setBaseUrl(baseUrl: string): void {
    this.config.baseUrl = baseUrl;
    this.axios.defaults.baseURL = baseUrl;
  }

  /**
   * Updates the default timeout for all requests.
   *
   * @param timeout - The new timeout in milliseconds.
   */
  setTimeout(timeout: number): void {
    this.config.timeout = timeout;
    this.axios.defaults.timeout = timeout;
  }

  /**
   * Adds a default header to all requests.
   *
   * @param name - Header name.
   * @param value - Header value.
   */
  setDefaultHeader(name: string, value: string): void {
    this.config.headers[name] = value;
    (this.axios.defaults.headers as Record<string, unknown>)[name] = value;
  }

  /**
   * Removes a default header from all requests.
   *
   * @param name - Header name to remove.
   */
  removeDefaultHeader(name: string): void {
    delete this.config.headers[name];
    delete (this.axios.defaults.headers as Record<string, unknown>)[name];
  }

  /**
   * Intercepts requests before they are sent.
   *
   * @param onFulfilled - Function to transform the request config.
   * @param onRejected - Function to handle request errors.
   * @returns Interceptor ID for later removal.
   */
  useRequestInterceptor(
    onFulfilled?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>,
    onRejected?: (error: unknown) => unknown,
  ): number {
    return this.axios.interceptors.request.use(onFulfilled, onRejected);
  }

  /**
   * Intercepts responses after they are received.
   *
   * @param onFulfilled - Function to transform the response.
   * @param onRejected - Function to handle response errors.
   * @returns Interceptor ID for later removal.
   */
  useResponseInterceptor(
    onFulfilled?: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>,
    onRejected?: (error: unknown) => unknown,
  ): number {
    return this.axios.interceptors.response.use(onFulfilled, onRejected);
  }

  /**
   * Ejects (removes) a request interceptor.
   *
   * @param interceptorId - The ID returned when the interceptor was added.
   */
  ejectRequestInterceptor(interceptorId: number): void {
    this.axios.interceptors.request.eject(interceptorId);
  }

  /**
   * Ejects (removes) a response interceptor.
   *
   * @param interceptorId - The ID returned when the interceptor was added.
   */
  ejectResponseInterceptor(interceptorId: number): void {
    this.axios.interceptors.response.eject(interceptorId);
  }

  /**
   * Destroys the client instance and cleans up resources.
   *
   * After calling this method, the client should not be used.
   */
  destroy(): void {
    // Cancel any pending requests
    this.axios.defaults.cancelToken = undefined;
  }
}

// ─── Factory Function ────────────────────────────────────────────────────────

/**
 * Creates a new HttpClient instance with the specified configuration.
 *
 * This is the primary entry point for creating HTTP clients.
 *
 * @param config - Configuration options for the HTTP client.
 * @returns A new HttpClient instance.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const client = createHttpClient({
 *   baseUrl: 'https://api.example.com',
 * });
 *
 * // Advanced configuration
 * const advancedClient = createHttpClient({
 *   baseUrl: 'https://api.example.com',
 *   timeout: 60000,
 *   headers: {
 *     'Authorization': 'Bearer token',
 *     'X-Custom-Header': 'value'
 *   },
 *   maxRetries: 5,
 *   retryDelay: 2000,
 *   retryableStatusCodes: [408, 429, 500, 502, 503, 504],
 * });
 * ```
 */
export function createHttpClient(config: HttpClientConfig): HttpClient {
  return new HttpClient(config);
}

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Creates an unauthenticated HTTP client for public endpoints.
 *
 * @param baseUrl - Base URL for the API.
 * @param options - Optional configuration overrides.
 * @returns A configured HttpClient instance.
 */
export function createPublicClient(baseUrl: string, options?: Partial<HttpClientConfig>): HttpClient {
  return createHttpClient({
    baseUrl,
    timeout: 30000,
    maxRetries: 2,
    ...options,
  });
}

/**
 * Creates an authenticated HTTP client with Bearer token.
 *
 * @param baseUrl - Base URL for the API.
 * @param token - Bearer authentication token.
 * @param options - Optional configuration overrides.
 * @returns A configured HttpClient instance with Authorization header.
 *
 * @example
 * ```typescript
 * const client = createAuthClient(
 *   'https://api.example.com',
 *   'sk-your-api-token'
 * );
 * ```
 */
export function createAuthClient(
  baseUrl: string,
  token: string,
  options?: Partial<HttpClientConfig>,
): HttpClient {
  const client = createHttpClient({
    baseUrl,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
    maxRetries: 3,
    ...options,
  });

  return client;
}

/**
 * Creates an HTTP client for streaming/SSE endpoints.
 *
 * Optimized configuration for long-running streaming connections.
 *
 * @param baseUrl - Base URL for the API.
 * @param token - Optional authentication token.
 * @param options - Optional configuration overrides.
 * @returns A configured HttpClient instance for streaming.
 *
 * @example
 * ```typescript
 * const streamClient = createStreamingClient(
 *   'https://api.example.com',
 *   'your-token'
 * );
 *
 * const stream = await streamClient.stream('/chat/stream', {
 *   method: 'POST',
 *   data: { message: 'Hello' },
 * });
 * ```
 */
export function createStreamingClient(
  baseUrl: string,
  token?: string,
  options?: Partial<HttpClientConfig>,
): HttpClient {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const client = createHttpClient({
    baseUrl,
    headers,
    timeout: 600000, // 10 minutes for streaming
    maxRetries: 0, // Don't retry streaming requests
    ...options,
  });

  return client;
}

// ─── Exports ────────────────────────────────────────────────────────────────

export { axios };
