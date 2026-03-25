/**
 * Utilities for translating raw API/network errors into user-friendly messages.
 */

/**
 * Structured application error with a user-friendly message and retryability flag.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Translate an HTTP status code + raw message into a user-friendly AppError.
 */
export function translateHttpError(status: number, rawMessage: string): AppError {
  switch (status) {
    case 401:
      return new AppError('Session expired. Please log in again.', 'auth_expired', false);
    case 403:
      return new AppError(
        "You don't have permission to do that. Make sure the app has the right Strava permissions.",
        'forbidden',
        false
      );
    case 404:
      return new AppError(
        'Activity not found. It may have been deleted.',
        'not_found',
        false
      );
    case 429:
      return new AppError(
        'Too many requests. Try again in a few minutes.',
        'rate_limited',
        true
      );
    case 500:
    case 502:
    case 503:
    case 504:
      return new AppError(
        "Strava's servers are having issues. Try again in a moment.",
        'server_error',
        true
      );
    default:
      return new AppError(rawMessage || `Request failed (${status})`, `http_${status}`, false);
  }
}

/**
 * Convert any thrown value into a user-friendly message string.
 */
export function toUserFriendlyMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;

  const message = error instanceof Error ? error.message : String(error);

  // Network / connectivity (fetch throws TypeError when offline)
  if (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.toLowerCase().includes('network') ||
    message.includes('ECONNREFUSED')
  ) {
    return "Can't connect to Strava. Check your internet connection.";
  }

  // Timeout
  if (
    message.includes('AbortError') ||
    message.toLowerCase().includes('timeout') ||
    message.includes('timed out')
  ) {
    return 'Request timed out. Check your connection and try again.';
  }

  // Auth
  if (
    message.includes('401') ||
    message.toLowerCase().includes('unauthorized') ||
    message.includes('Not authenticated')
  ) {
    return 'Session expired. Please log in again.';
  }

  // Rate limit
  if (message.includes('429') || message.toLowerCase().includes('rate limit')) {
    return 'Too many requests. Try again in a few minutes.';
  }

  // Not found
  if (message.includes('404') || message.toLowerCase().includes('not found')) {
    return 'Activity not found. It may have been deleted.';
  }

  // Server errors
  if (message.match(/\b(500|502|503|504)\b/)) {
    return "Strava's servers are having issues. Try again in a moment.";
  }

  return message;
}

/**
 * Return true if this error is likely transient and worth retrying.
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof AppError) return error.retryable;

  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.toLowerCase().includes('network') ||
    message.match(/\b(500|502|503|504)\b/) !== null ||
    message.toLowerCase().includes('timeout')
  );
}
