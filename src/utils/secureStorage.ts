import type { AuthTokens, AthleteProfile } from '../types/auth';

/**
 * Secure storage for authentication tokens
 * Uses sessionStorage with base64 encoding (simple encryption for demo)
 * In production, consider using Web Crypto API for stronger encryption
 */
class SecureStorage {
  private readonly TOKENS_KEY = 'strava_auth_tokens';
  private readonly ATHLETE_KEY = 'strava_athlete';

  /**
   * Simple encoding (base64) - for production, use Web Crypto API
   */
  private encrypt(data: string): string {
    return btoa(data);
  }

  /**
   * Simple decoding (base64)
   */
  private decrypt(data: string): string {
    try {
      return atob(data);
    } catch {
      return '';
    }
  }

  /**
   * Store auth tokens securely
   */
  setTokens(tokens: AuthTokens): void {
    const encrypted = this.encrypt(JSON.stringify(tokens));
    sessionStorage.setItem(this.TOKENS_KEY, encrypted);
  }

  /**
   * Retrieve auth tokens
   */
  getTokens(): AuthTokens | null {
    const encrypted = sessionStorage.getItem(this.TOKENS_KEY);
    if (!encrypted) return null;

    try {
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  /**
   * Store athlete profile
   */
  setAthlete(athlete: AthleteProfile): void {
    const encrypted = this.encrypt(JSON.stringify(athlete));
    sessionStorage.setItem(this.ATHLETE_KEY, encrypted);
  }

  /**
   * Retrieve athlete profile
   */
  getAthlete(): AthleteProfile | null {
    const encrypted = sessionStorage.getItem(this.ATHLETE_KEY);
    if (!encrypted) return null;

    try {
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  /**
   * Clear all stored auth data
   */
  clear(): void {
    sessionStorage.removeItem(this.TOKENS_KEY);
    sessionStorage.removeItem(this.ATHLETE_KEY);
  }

  /**
   * Check if tokens are expired
   */
  isTokenExpired(tokens: AuthTokens): boolean {
    return Date.now() >= tokens.expiresAt;
  }

  /**
   * Check if tokens will expire soon (within 30 minutes)
   * Triggers proactive token refresh to avoid expiration during use
   */
  willExpireSoon(tokens: AuthTokens): boolean {
    const thirtyMinutes = 30 * 60 * 1000;
    return Date.now() >= tokens.expiresAt - thirtyMinutes;
  }

  /**
   * Get milliseconds until token expiration
   */
  getTimeUntilExpiry(tokens: AuthTokens): number {
    return Math.max(0, tokens.expiresAt - Date.now());
  }
}

export const secureStorage = new SecureStorage();
