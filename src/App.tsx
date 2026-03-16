import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initializeAuth } from './stores/authStore';
import { useAuth } from './hooks/useAuth';
import { AuthCallback, LoginButton, LogoutButton } from './components/auth';

function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            <span className="text-strava-orange">Strava</span> GPS Route Editor
          </h1>
          {isAuthenticated && <LogoutButton />}
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {!isAuthenticated ? (
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">
              Fix Your GPS Data with Ease
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Connect your Strava account to start editing your GPS tracks. Trim, smooth,
              remove spikes, and redraw sections with an intuitive interface.
            </p>
            <div className="mb-8">
              <LoginButton />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 text-left">
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-strava-orange">
                  🎯 Precise Editing
                </h3>
                <p className="text-gray-400">
                  Trim start/end points, remove GPS spikes, smooth rough tracks, and redraw
                  sections with snap-to-road or freehand drawing.
                </p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-strava-orange">
                  🔒 Privacy First
                </h3>
                <p className="text-gray-400">
                  All GPS processing happens in your browser. No data is stored on our
                  servers.
                </p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-strava-orange">
                  ⚡ Seamless Upload
                </h3>
                <p className="text-gray-400">
                  Upload corrected activities directly to Strava or download as GPX files.
                </p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-strava-orange">
                  📊 Before/After
                </h3>
                <p className="text-gray-400">
                  Preview changes with side-by-side comparison and unlimited undo/redo.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Welcome Back!</h2>
            <p className="text-xl text-gray-400">
              Select an activity from the activity browser to start editing.
            </p>
            <p className="text-gray-500 mt-4">(Activity browser coming soon...)</p>
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  useEffect(() => {
    // Initialize auth state from storage on app load
    initializeAuth();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
