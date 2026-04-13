/**
 * Fastify Cors Options
 * @Author: Junaid Atari junaid.attari@invozone.dev
 * @Date: 2025-02-17 13:27:04
 */

// environmental

// types
import type {CorsOptions} from 'cors';

/**
 * List of allowed origins > hostnames<br>
 * `https://example.com/` become `example.com`
 * */
const allowedOrigins = (process.env?.CORS_ALLOWED_ORIGIN?.split(',') ?? []).map(o => o.trim());
const isWildcardAllowed = allowedOrigins.includes('*');
const originHostnames = allowedOrigins.filter(o => o !== '*').map(o => {
  try {
    return new URL(o).hostname;
  } catch {
    return o;
  }
});

export default {
  maxAge: 86400,
  optionsSuccessStatus: 204,
  preflightContinue: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,

  allowedHeaders: [
    'X-Crm-Type', 'X-Type',
    'Content-Type', 'Authorization', 'Accept',
    'Origin', 'DNT', 'Keep-Alive',
    'User-Agent',
    'X-Requested-With',
    'If-Modified-Since',
    'Cache-Control',
    'Content-Range',
    'Range',
  ].concat(
    (process.env?.CORS_ALLOWED_ORIGIN_HEADERS?.split(',') ?? []),
  ),

  exposedHeaders: ['Content-Length', 'Content-Type', 'RefreshToken', 'Token'],

  origin(origin, cb) {
    // Allow all origins if wildcard is configured
    if (isWildcardAllowed) {
      cb(null, true);
      return;
    }

    // Allow requests with no origin, like mobile apps or curl requests
    if (origin === undefined || origin === null) {
      cb(null, true);
      return;
    }

    // Check if origin is in the allowed list (exact match or hostname match)
    if (allowedOrigins.includes(origin)) {
      cb(null, true);
      return;
    }

    try {
      const requestHostname = new URL(origin).hostname;
      if (originHostnames.includes(requestHostname)) {
        cb(null, true);
        return;
      }
    } catch {
      // If origin is not a valid URL, deny it
    }

    // Generate an error on other origins, disabling access
    cb(new Error('Not allowed by CORS'), false);
  },
} as CorsOptions;
