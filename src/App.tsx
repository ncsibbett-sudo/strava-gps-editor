import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initializeAuth } from './stores/authStore';
import { useAuth } from './hooks/useAuth';
import { useActivities } from './hooks/useActivities';
import { useMap } from './hooks/useMap';
import { AuthCallback, LoginButton, LogoutButton } from './components/auth';
import { ActivityList, ActivityFilters } from './components/activities';
import { MapContainer } from './components/map';

function HomePage() {
  const { isAuthenticated } = useAuth();
  const { selectActivity, selectedActivityTrack, isLoadingTrack, trackError, clearSelection } = useActivities();
  const { loadTrack, reset: resetMap } = useMap();

  const handleActivitySelect = async (activityId: number) => {
    await selectActivity(activityId);
  };

  const handleBackToList = () => {
    clearSelection();
    resetMap();
  };

  // Load track into map when selected
  useEffect(() => {
    if (selectedActivityTrack) {
      loadTrack(selectedActivityTrack);
    }
  }, [selectedActivityTrack, loadTrack]);

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
        ) : selectedActivityTrack ? (
          <div>
            {/* Map Editor View */}
            <div className="mb-4">
              <button
                onClick={handleBackToList}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                ← Back to Activities
              </button>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div style={{ height: '600px' }}>
                <MapContainer />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Your Activities</h2>
              <p className="text-gray-400">
                Select an activity to view and edit its GPS track
              </p>
            </div>

            {/* Activity Filters */}
            <ActivityFilters />

            {/* Loading state for activity selection */}
            {isLoadingTrack && (
              <div className="bg-blue-900/20 border border-blue-500 text-blue-200 p-4 rounded-lg mb-6">
                <div className="flex items-center gap-3">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-400"></div>
                  <span>Loading GPS data...</span>
                </div>
              </div>
            )}

            {/* Error state for activity selection */}
            {trackError && (
              <div className="bg-red-900/20 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
                <p className="font-semibold">Failed to load activity GPS data</p>
                <p className="text-sm mt-1">{trackError}</p>
              </div>
            )}

            {/* Activity List */}
            <ActivityList onActivitySelect={handleActivitySelect} />
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
