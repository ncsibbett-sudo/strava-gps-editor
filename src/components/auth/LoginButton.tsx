import { useAuth } from '../../hooks/useAuth';

/**
 * Strava OAuth login button
 * Displays official "Connect with Strava" button per brand guidelines
 */
export function LoginButton() {
  const { login, isLoading } = useAuth();

  return (
    <button
      onClick={login}
      disabled={isLoading}
      className="inline-flex items-center px-6 py-3 bg-strava-orange hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg
        className="w-6 h-6 mr-2"
        viewBox="0 0 384 384"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M158.4 0L90.5 160h48l19.9-40 19.9 40h48L158.4 0zM237.6 160h-48L244 320l54.4-160h-48l-6.4 19.2L237.6 160z" />
      </svg>
      {isLoading ? 'Connecting...' : 'Connect with Strava'}
    </button>
  );
}
