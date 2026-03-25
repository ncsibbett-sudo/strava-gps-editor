import { isRetryable } from './apiErrors';

interface RetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts?: number;
  /** Delay before the first retry in ms (default: 1000) */
  initialDelayMs?: number;
  /** Cap on backoff delay in ms (default: 10000) */
  maxDelayMs?: number;
  /** Override retryability check — receives the error and current attempt number */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * Call `fn` with exponential backoff + jitter, retrying on transient failures.
 *
 * Attempts: 1 (immediate), 2 (after ~1s), 3 (after ~2s), etc.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    shouldRetry = (err) => isRetryable(err),
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }

      // Exponential backoff with ±20% jitter
      const base = Math.min(initialDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      const jitter = base * 0.2 * (Math.random() * 2 - 1);
      await new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, base + jitter)));
    }
  }

  throw lastError;
}
