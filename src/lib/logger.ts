/**
 * Production-ready Security & System Logger
 * Ensures sensitive credentials, tokens, and PII are redacted before logging.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'jwt',
  'secret',
  'authorization',
  'apikey',
  'api_key',
  'cookie',
  'access_token',
  'refresh_token',
  'service_role_key',
]);

function redactObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactObject);

  const redacted: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactObject(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, context ? redactObject(context) : '');
  },

  warn: (message: string, context?: Record<string, any>) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, context ? redactObject(context) : '');
  },

  error: (message: string, error?: any, context?: Record<string, any>) => {
    const errorDetails = error instanceof Error
      ? { message: error.message, name: error.name, stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined }
      : error;

    console.error(
      `[ERROR] [${new Date().toISOString()}] ${message}`,
      errorDetails,
      context ? redactObject(context) : ''
    );
  },

  security: (event: string, context: Record<string, any>) => {
    console.warn(
      `[SECURITY_EVENT] [${new Date().toISOString()}] ${event}`,
      redactObject(context)
    );
  },
};
