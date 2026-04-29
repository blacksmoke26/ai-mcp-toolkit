/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module websocket/auth
 * @description Pluggable authentication strategy with session management and rate limiting.
 *
 * This module provides:
 *
 * - Pluggable authentication strategies (JWT, API Key, OAuth, custom)
 * - Session management with automatic expiration
 * - Rate limiting for authentication attempts
 * - Token refresh support
 *
 * ## Architecture
 *
 * ```
 * ┌─────────────────────────────────────┐
 * │          AuthManager                │
 * ├─────────────────────────────────────┤
 * │  strategies: Map<string, Strategy> │
 * │  sessions: Map<sessionId, Session>  │
 * │  rateLimiters: Map<ip, RateLimit>  │
 * │                                  │
 * │  + authenticate()    + validateSession() │
 * │  + refreshSession()  + revokeSession()  │
 * │  + createStrategy()  + getRateLimit()   │
 * └─────────────────────────────────────┘
 * ```
 *
 * ## Usage Example
 *
 * ```typescript
 * import { authManager, JwtAuthStrategy } from '@/websocket/auth';
 *
 * // Register a JWT strategy
 * authManager.registerStrategy('jwt', new JwtAuthStrategy({
 *   secret: process.env.JWT_SECRET,
 *   expiresIn: '24h',
 * }));
 *
 * // Authenticate a client
 * const session = await authManager.authenticate('jwt', 'token-xyz');
 * if (session) {
 *   console.log('Authenticated as:', session.userId);
 * }
 *
 * // Check rate limiting
 * const rateLimit = authManager.getRateLimit('192.168.1.1');
 * if (rateLimit.remaining < 5) {
 *   throw new Error('Too many authentication attempts');
 * }
 * ```
 */

// ══════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════

import logger from '@/utils/logger';
import {nanoid} from 'nanoid';

/**
 * Authentication result.
 */
export interface AuthResult {
  /** Whether authentication was successful */
  authenticated: boolean;
  /** Session ID if authenticated */
  sessionId?: string;
  /** User ID if available */
  userId?: string;
  /** Error message if failed */
  error?: string;
  /** Rate limit information */
  rateLimit?: RateLimitInfo;
}

/**
 * Rate limit information.
 */
export interface RateLimitInfo {
  /** Maximum attempts allowed */
  maxAttempts: number;
  /** Remaining attempts */
  remaining: number;
  /** Window duration in ms */
  windowMs: number;
  /** Time until reset in ms */
  resetInMs: number;
}

/**
 * Session data.
 */
export interface Session {
  /** Unique session ID */
  sessionId: string;
  /** User ID associated with the session */
  userId: string;
  /** Strategy used to authenticate */
  strategy: string;
  /** When the session was created */
  createdAt: Date;
  /** When the session expires */
  expiresAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
  /** Client IP address */
  clientIp?: string;
  /** User agent string */
  userAgent?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Authentication strategy interface.
 * Implement this interface to create custom authentication strategies.
 */
export interface AuthStrategy {
  /** Strategy name (e.g., 'jwt', 'api-key', 'oauth') */
  name: string;

  /**
   * Authenticate a client using the strategy.
   *
   * @param credentials - Authentication credentials (format depends on strategy)
   * @param options - Optional authentication options
   * @returns AuthResult with session information
   */
  authenticate(
    credentials: unknown,
    options?: AuthOptions,
  ): Promise<AuthResult>;

  /**
   * Validate a session token.
   *
   * @param sessionId - Session ID to validate
   * @returns Session if valid, null otherwise
   */
  validateSession(sessionId: string): Promise<Session | null>;

  /**
   * Refresh a session.
   *
   * @param sessionId - Session ID to refresh
   * @returns New session if successful, null otherwise
   */
  refreshSession(sessionId: string): Promise<Session | null>;

  /**
   * Revoke a session.
   *
   * @param sessionId - Session ID to revoke
   * @returns true if session was revoked
   */
  revokeSession(sessionId: string): boolean;

  /**
   * Get rate limit configuration for this strategy.
   *
   * @returns Rate limit configuration
   */
  getRateLimitConfig(): RateLimitConfig;
}

/**
 * Rate limit configuration.
 */
export interface RateLimitConfig {
  /** Maximum attempts within the window */
  maxAttempts: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

/**
 * Authentication options.
 */
export interface AuthOptions {
  /** Client IP address */
  clientIp?: string;
  /** User agent string */
  userAgent?: string;
  /** Whether to create a session */
  createSession?: boolean;
  /** Session TTL in milliseconds */
  sessionTtlMs?: number;
}

/**
 * Default rate limit configuration.
 */
const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxAttempts: 10,
  windowMs: 60_000, // 1 minute
};

/**
 * Default session TTL (24 hours).
 */
const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

// ══════════════════════════════════════════════════════════════════════
// Rate Limiter
// ══════════════════════════════════════════════════════════════════════

/**
 * Tracks authentication attempts for rate limiting.
 */
class RateLimiter {
  /** Map of identifier to attempt records */
  private attempts: Map<string, number[]> = new Map();

  /**
   * Check if an attempt is allowed.
   *
   * @param identifier - Unique identifier (e.g., IP address)
   * @param config - Rate limit configuration
   * @returns Rate limit info or null if rate limited
   */
  check(
    identifier: string,
    config: RateLimitConfig,
  ): RateLimitInfo | null {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get existing attempts
    const existingAttempts = this.attempts.get(identifier) || [];

    // Filter to only attempts within the window
    const recentAttempts = existingAttempts.filter(
      timestamp => timestamp > windowStart,
    );

    // Check if rate limited
    if (recentAttempts.length >= config.maxAttempts) {
      const oldestAttempt = recentAttempts[0];
      const resetInMs = oldestAttempt + config.windowMs - now;

      return {
        maxAttempts: config.maxAttempts,
        remaining: 0,
        windowMs: config.windowMs,
        resetInMs,
      };
    }

    // Record this attempt
    recentAttempts.push(now);
    this.attempts.set(identifier, recentAttempts);

    return {
      maxAttempts: config.maxAttempts,
      remaining: config.maxAttempts - recentAttempts.length,
      windowMs: config.windowMs,
      resetInMs: 0,
    };
  }

  /**
   * Reset rate limits for an identifier.
   *
   * @param identifier - Unique identifier to reset
   */
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Cleanup old rate limit data.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [identifier, attempts] of this.attempts) {
      // Keep only recent attempts
      const recent = attempts.filter(ts => ts > now - 5 * 60 * 1000);
      if (recent.length === 0) {
        this.attempts.delete(identifier);
      } else {
        this.attempts.set(identifier, recent);
      }
    }
  }

  /**
   * Reset all rate limit data.
   */
  resetAll(): void {
    this.attempts.clear();
  }
}

// ══════════════════════════════════════════════════════════════════════
// Session Manager
// ══════════════════════════════════════════════════════════════════════

/**
 * Manages authentication sessions.
 */
class SessionManager {
  /** Map of session IDs to sessions */
  private sessions: Map<string, Session> = new Map();

  /** Session cleanup interval */
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize session manager.
   */
  init(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Create a new session.
   *
   * @param userId - User ID
   * @param strategy - Authentication strategy name
   * @param options - Session options
   * @returns Session object
   */
  createSession(
    userId: string,
    strategy: string,
    options: {
      clientIp?: string;
      userAgent?: string;
      ttlMs?: number;
      metadata?: Record<string, unknown>;
    } = {},
  ): Session {
    const {
      sessionId,
      createdAt,
      expiresAt,
    } = this.generateSessionDetails(options.ttlMs);

    const session: Session = {
      sessionId,
      userId,
      strategy,
      createdAt,
      expiresAt,
      lastActivityAt: createdAt,
      clientIp: options.clientIp,
      userAgent: options.userAgent,
      metadata: options.metadata,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Validate a session.
   *
   * @param sessionId - Session ID to validate
   * @returns Session if valid, null otherwise
   */
  async validateSession(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivityAt = new Date();
    return session;
  }

  /**
   * Refresh a session's expiration.
   *
   * @param sessionId - Session ID to refresh
   * @returns New session if successful, null otherwise
   */
  async refreshSession(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Extend expiration
    const ttlMs = 24 * 60 * 60 * 1000; // 24 hours
    session.expiresAt = new Date(Date.now() + ttlMs);
    session.lastActivityAt = new Date();

    return session;
  }

  /**
   * Revoke a session.
   *
   * @param sessionId - Session ID to revoke
   * @returns true if session was revoked
   */
  revokeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Get session information.
   *
   * @param sessionId - Session ID
   * @returns Session if found, null otherwise
   */
  getSession(sessionId: string): Session | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions for a user.
   *
   * @param userId - User ID
   * @returns Array of sessions
   */
  getUserSessions(userId: string): Session[] {
    return Array.from(this.sessions.values()).filter(
      session => session.userId === userId,
    );
  }

  /**
   * Cleanup expired sessions.
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info({cleaned}, 'Cleaned up expired sessions');
    }
  }

  /**
   * Generate session details.
   *
   * @param ttlMs - Time to live in milliseconds
   * @returns Session ID, creation time, and expiration time
   */
  private generateSessionDetails(ttlMs = DEFAULT_SESSION_TTL_MS): {
    sessionId: string;
    createdAt: Date;
    expiresAt: Date;
  } {
    const sessionId = this.generateSessionId();
    const createdAt = new Date();
    const expiresAt = new Date(Date.now() + ttlMs);

    return {sessionId, createdAt, expiresAt};
  }

  /**
   * Generate a unique session ID.
   *
   * @returns Unique session ID
   */
  private generateSessionId(): string {
    return nanoid(32);
  }

  /**
   * Get active session count.
   *
   * @returns Number of active sessions
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Shutdown session manager.
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.sessions.clear();
  }
}

// ══════════════════════════════════════════════════════════════════════
// Default Strategies
// ══════════════════════════════════════════════════════════════════════

/**
 * Placeholder JWT authentication strategy.
 * In production, implement actual JWT validation.
 */
class JwtAuthStrategy implements AuthStrategy {
  name = 'jwt';

  private jwtSecret?: string;
  private jwtOptions?: {
    expiresIn?: string;
    algorithms?: string[];
  };

  constructor(options?: {
    secret?: string;
    expiresIn?: string;
    algorithms?: string[];
  }) {
    this.jwtSecret = options?.secret;
    this.jwtOptions = {
      expiresIn: options?.expiresIn,
      algorithms: options?.algorithms,
    };
  }

  async authenticate(
    credentials: unknown,
    options?: AuthOptions,
  ): Promise<AuthResult> {
    // For now, accept any non-empty string as a valid JWT
    // In production, verify JWT signature, expiration, etc.

    if (typeof credentials !== 'string' || credentials.length === 0) {
      return {
        authenticated: false,
        error: 'Invalid JWT token',
      };
    }

    // Validate JWT format (placeholder)
    const parts = credentials.split('.');
    if (parts.length !== 3) {
      return {
        authenticated: false,
        error: 'Invalid JWT format',
      };
    }

    // In production, verify:
    // - JWT signature using jwtSecret
    // - JWT expiration
    // - JWT issuer
    // - JWT audience

    const userId = 'user-placeholder'; // In production, extract from JWT payload

    return {
      authenticated: true,
      sessionId: `sess-${nanoid(16)}`,
      userId,
    };
  }

  async validateSession(sessionId: string): Promise<Session | null> {
    return authManager.sessionManager.getSession(sessionId);
  }

  async refreshSession(sessionId: string): Promise<Session | null> {
    return authManager.sessionManager.refreshSession(sessionId);
  }

  revokeSession(sessionId: string): boolean {
    return authManager.sessionManager.revokeSession(sessionId);
  }

  getRateLimitConfig(): RateLimitConfig {
    return DEFAULT_RATE_LIMIT_CONFIG;
  }
}

/**
 * API key authentication strategy.
 */
class ApiKeyAuthStrategy implements AuthStrategy {
  name = 'api-key';

  private validKeys: Set<string> = new Set();

  constructor(apiKeys?: string[]) {
    if (apiKeys) {
      apiKeys.forEach(key => this.validKeys.add(key));
    }
  }

  /**
   * Add a valid API key.
   *
   * @param key - API key to add
   */
  addValidKey(key: string): void {
    this.validKeys.add(key);
  }

  /**
   * Remove a valid API key.
   *
   * @param key - API key to remove
   */
  removeValidKey(key: string): void {
    this.validKeys.delete(key);
  }

  async authenticate(
    credentials: unknown,
    options?: AuthOptions,
  ): Promise<AuthResult> {
    if (typeof credentials !== 'string' || credentials.length === 0) {
      return {
        authenticated: false,
        error: 'Invalid API key',
      };
    }

    if (!this.validKeys.has(credentials)) {
      return {
        authenticated: false,
        error: 'Invalid or unauthorized API key',
      };
    }

    const userId = `api-key-${nanoid(8)}`;

    return {
      authenticated: true,
      sessionId: `sess-${nanoid(16)}`,
      userId,
    };
  }

  async validateSession(sessionId: string): Promise<Session | null> {
    return authManager.sessionManager.getSession(sessionId);
  }

  async refreshSession(sessionId: string): Promise<Session | null> {
    return authManager.sessionManager.refreshSession(sessionId);
  }

  revokeSession(sessionId: string): boolean {
    return authManager.sessionManager.revokeSession(sessionId);
  }

  getRateLimitConfig(): RateLimitConfig {
    return {
      maxAttempts: 20,
      windowMs: 60_000,
    };
  }
}

/**
 * Pass-through authentication strategy (accepts any token).
 * Use only for development/testing.
 */
class PassthroughAuthStrategy implements AuthStrategy {
  name = 'passthrough';

  async authenticate(
    _credentials: unknown,
    options?: AuthOptions,
  ): Promise<AuthResult> {
    return {
      authenticated: true,
      sessionId: `sess-${nanoid(16)}`,
      userId: 'anonymous',
    };
  }

  async validateSession(sessionId: string): Promise<Session | null> {
    return authManager.sessionManager.getSession(sessionId);
  }

  async refreshSession(sessionId: string): Promise<Session | null> {
    return authManager.sessionManager.refreshSession(sessionId);
  }

  revokeSession(sessionId: string): boolean {
    return authManager.sessionManager.revokeSession(sessionId);
  }

  getRateLimitConfig(): RateLimitConfig {
    return {
      maxAttempts: 100,
      windowMs: 60_000,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════
// Auth Manager
// ══════════════════════════════════════════════════════════════════════

/**
 * Manages authentication strategies, sessions, and rate limiting.
 */
class AuthManager {
  /** Available authentication strategies */
  private strategies: Map<string, AuthStrategy> = new Map();

  /** Rate limiter for authentication attempts */
  rateLimiter = new RateLimiter();

  /** Session manager */
  sessionManager = new SessionManager();

  /**
   * Initialize the auth manager.
   */
  init(): void {
    // Register default passthrough strategy (for development)
    this.registerStrategy('passthrough', new PassthroughAuthStrategy());

    // Register session manager
    this.sessionManager.init();
  }

  /**
   * Register an authentication strategy.
   *
   * @param name - Strategy name
   * @param strategy - Strategy instance
   */
  registerStrategy(name: string, strategy: AuthStrategy): void {
    this.strategies.set(name, strategy);
    logger.info({strategy: name}, 'Authentication strategy registered');
  }

  /**
   * Authenticate a client.
   *
   * @param strategyName - Strategy name to use
   * @param credentials - Authentication credentials
   * @param options - Authentication options
   * @returns AuthResult
   */
  async authenticate(
    strategyName: string,
    credentials: unknown,
    options: AuthOptions = {},
  ): Promise<AuthResult> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      return {
        authenticated: false,
        error: `Unknown authentication strategy: ${strategyName}`,
      };
    }

    // Check rate limit
    const identifier = options.clientIp || credentials?.toString() || 'unknown';
    const rateLimit = this.rateLimiter.check(identifier, strategy.getRateLimitConfig());
    if (!rateLimit) {
      return {
        authenticated: false,
        error: 'Too many authentication attempts. Please try again later.',
      };
    }

    // Authenticate
    const result = await strategy.authenticate(credentials, options);

    // Create session if requested and successful
    if (result.authenticated && options.createSession !== false) {
      const session = this.sessionManager.createSession(
        result.userId || 'anonymous',
        strategyName,
        {
          clientIp: options.clientIp,
          userAgent: options.userAgent,
          ttlMs: options.sessionTtlMs,
        },
      );
      result.sessionId = session.sessionId;
    }

    // Attach rate limit info
    if (rateLimit) {
      result.rateLimit = rateLimit;
    }

    return result;
  }

  /**
   * Validate a session.
   *
   * @param sessionId - Session ID to validate
   * @returns Session if valid, null otherwise
   */
  async validateSession(sessionId: string): Promise<Session | null> {
    return this.sessionManager.validateSession(sessionId);
  }

  /**
   * Refresh a session.
   *
   * @param sessionId - Session ID to refresh
   * @returns Refreshed session if successful, null otherwise
   */
  async refreshSession(sessionId: string): Promise<Session | null> {
    return this.sessionManager.refreshSession(sessionId);
  }

  /**
   * Revoke a session.
   *
   * @param sessionId - Session ID to revoke
   * @returns true if session was revoked
   */
  revokeSession(sessionId: string): boolean {
    return this.sessionManager.revokeSession(sessionId);
  }

  /**
   * Get available strategy names.
   *
   * @returns Array of strategy names
   */
  getStrategyNames(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Get rate limit info for an identifier.
   *
   * @param identifier - Identifier to check
   * @param strategyName - Strategy name
   * @returns Rate limit info or null
   */
  getRateLimit(
    identifier: string,
    strategyName?: string,
  ): RateLimitInfo | null {
    const strategy = strategyName
      ? this.strategies.get(strategyName)
      : Array.from(this.strategies.values())[0];

    if (!strategy) {
      return null;
    }

    return this.rateLimiter.check(identifier, strategy.getRateLimitConfig());
  }

  /**
   * Reset rate limits for an identifier.
   *
   * @param identifier - Identifier to reset
   */
  resetRateLimit(identifier: string): void {
    this.rateLimiter.reset(identifier);
  }

  /**
   * Get session manager statistics.
   *
   * @returns Session statistics
   */
  getSessionStats(): {
    activeSessions: number;
    totalSessionsCreated: number;
  } {
    return {
      activeSessions: this.sessionManager.getSessionCount(),
      totalSessionsCreated: 0, // Would need a counter for this
    };
  }

  /**
   * Shutdown the auth manager.
   */
  shutdown(): void {
    this.sessionManager.shutdown();
    this.rateLimiter.resetAll();
    this.strategies.clear();
  }
}

// ══════════════════════════════════════════════════════════════════════
// Singleton Export
// ══════════════════════════════════════════════════════════════════════

/** Singleton instance of the auth manager */
export const authManager = new AuthManager();

export default authManager;

// ═══════════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════════

export {
  AuthManager,
  JwtAuthStrategy,
  ApiKeyAuthStrategy,
  PassthroughAuthStrategy,
  RateLimiter,
  SessionManager,
};
