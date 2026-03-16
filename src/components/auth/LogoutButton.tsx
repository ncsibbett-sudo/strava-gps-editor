import { useAuth } from '../../hooks/useAuth';

/**
 * Logout button component
 */
export function LogoutButton() {
  const { logout, athlete } = useAuth();

  return (
    <div className="flex items-center gap-4">
      {athlete && (
        <div className="flex items-center gap-2">
          <img
            src={athlete.profile}
            alt={`${athlete.firstname} ${athlete.lastname}`}
            className="w-8 h-8 rounded-full"
          />
          <span className="text-gray-300">
            {athlete.firstname} {athlete.lastname}
          </span>
        </div>
      )}
      <button
        onClick={logout}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
      >
        Logout
      </button>
    </div>
  );
}
