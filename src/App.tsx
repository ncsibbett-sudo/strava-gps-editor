import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initializeAuth } from './stores/authStore';
import { useAuth } from './hooks/useAuth';
import { useActivities } from './hooks/useActivities';
import { useMap } from './hooks/useMap';
import { AuthCallback, LoginButton, LogoutButton } from './components/auth';
import { ActivityList, ActivityFilters } from './components/activities';
import { MapContainer } from './components/map';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ToastContainer';
import { ResumeDraftDialog } from './components/ResumeDraftDialog';
import { HelpModal } from './components/HelpModal';
import { OnboardingTour, shouldShowTour, markTourComplete } from './components/OnboardingTour';
import { loadDraft, deleteDraft } from './services/draftService';
import { createDemoTrack } from './utils/demoTrack';
import { IssuesBanner } from './components/map/IssuesBanner';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import type { GPSTrack } from './models/GPSTrack';

function HomePage() {
  const { isAuthenticated } = useAuth();
  const {
    selectActivity,
    selectedActivity,
    selectedActivityTrack,
    isLoadingTrack,
    trackError,
    clearSelection,
  } = useActivities();
  const { loadTrack, setEditedTrack, reset: resetMap, editedTrack, canUndo } = useMap();

  const [pendingDraft, setPendingDraft] = useState<{
    originalTrack: GPSTrack;
    editedTrack: GPSTrack;
    savedAt: Date;
  } | null>(null);

  const [showHelp, setShowHelp] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Show onboarding tour once per browser after first login
  useEffect(() => {
    if (isAuthenticated && shouldShowTour()) {
      setShowTour(true);
    }
  }, [isAuthenticated]);

  // Global ? key opens help modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '?') setShowHelp(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleActivitySelect = async (activityId: number) => {
    await selectActivity(activityId);
  };

  const handleLoadDemo = () => {
    const demo = createDemoTrack();
    loadTrack(demo, null);
    // Simulate selectedActivityTrack by setting it in the activity store is complex;
    // instead, load directly into map store and set a fake selectedActivityTrack via hack.
    // Simplest: manually push the demo track into the activities store selectedActivityTrack.
    // We use a workaround: dispatch directly to mapStore (loadTrack already does this).
    // To make App.tsx show the map view we also need selectedActivityTrack to be truthy —
    // we'll handle this by checking mapStore.originalTrack in the render condition.
  };

  const handleBackToList = () => {
    clearSelection();
    resetMap();
  };

  // Load track into map when selected — also check for a saved draft
  useEffect(() => {
    if (!selectedActivityTrack || !selectedActivity) return;

    loadDraft(selectedActivity.id)
      .then((draft) => {
        if (draft) {
          loadTrack(selectedActivityTrack, selectedActivity.id);
          setPendingDraft(draft);
        } else {
          loadTrack(selectedActivityTrack, selectedActivity.id);
        }
      })
      .catch(() => {
        loadTrack(selectedActivityTrack, selectedActivity.id);
      });
  }, [selectedActivityTrack, selectedActivity]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResumeDraft = () => {
    if (!pendingDraft) return;
    setEditedTrack(pendingDraft.editedTrack, false);
    setPendingDraft(null);
  };

  const handleDiscardDraft = () => {
    if (selectedActivity) {
      deleteDraft(selectedActivity.id).catch(() => {});
    }
    setPendingDraft(null);
  };

  // Warn before page unload when there are unsaved edits
  useEffect(() => {
    const hasEdits = canUndo();
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasEdits) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [editedTrack, canUndo]);

  // Show map view when either Strava activity or demo track is loaded
  const mapTrack = selectedActivityTrack ?? editedTrack;
  const inMapView = !!mapTrack;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Overlays */}
      {pendingDraft && selectedActivity && (
        <ResumeDraftDialog
          activityName={selectedActivity.name}
          savedAt={pendingDraft.savedAt}
          onResume={handleResumeDraft}
          onDiscard={handleDiscardDraft}
        />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showTour && isAuthenticated && (
        <OnboardingTour
          context={inMapView ? 'map' : 'list'}
          onDismiss={() => {
            markTourComplete();
            setShowTour(false);
          }}
        />
      )}

      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center gap-3">
          <h1 className="text-lg md:text-2xl font-bold whitespace-nowrap">
            <span className="hidden sm:inline">GPS Route Editor</span>
            <span className="sm:hidden">GPS Editor</span>
          </h1>
          <div className="flex items-center gap-2">
            {/* Help button — always visible when authenticated */}
            {isAuthenticated && (
              <button
                onClick={() => setShowHelp(true)}
                className="flex items-center gap-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg text-sm transition-colors"
                title="Help & Keyboard Shortcuts (?)"
              >
                <span>?</span>
                <span className="hidden sm:inline">Help</span>
              </button>
            )}
            {isAuthenticated && <LogoutButton />}
          </div>
        </div>
      </header>

      <main className={`container mx-auto px-4 ${inMapView ? 'py-4' : 'py-8 md:py-12'} pb-4`}>
        {!isAuthenticated ? (
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">Fix Your GPS Data with Ease</h2>
            <p className="text-xl text-gray-400 mb-8">
              Connect your Strava account to start editing your GPS tracks. Trim, smooth,
              remove spikes, and redraw sections with an intuitive interface.
            </p>
            <div className="mb-8 flex flex-col items-center gap-3">
              <LoginButton />
              <p className="text-xs text-gray-500">
                By connecting, you agree to Strava's{' '}
                <a
                  href="https://www.strava.com/legal/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-strava-orange hover:underline"
                >
                  Terms of Service
                </a>
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 text-left">
              {[
                {
                  title: 'Precise Editing',
                  body: 'Trim start/end points, remove GPS spikes, smooth rough tracks, and redraw sections with snap-to-road or freehand drawing.',
                },
                {
                  title: 'Privacy First',
                  body: 'All GPS processing happens in your browser. No data is stored on our servers.',
                },
                {
                  title: 'Seamless Upload',
                  body: 'Upload corrected activities directly to Strava or download as GPX, FIT, or TCX.',
                },
                {
                  title: 'Before/After',
                  body: 'Preview changes with side-by-side comparison and unlimited undo/redo.',
                },
              ].map(({ title, body }) => (
                <div key={title} className="bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2 text-strava-orange">{title}</h3>
                  <p className="text-gray-400">{body}</p>
                </div>
              ))}
            </div>
          </div>
        ) : inMapView ? (
          <div>
            {/* Map Editor View */}
            <div className="mb-2 flex items-center gap-3 flex-wrap">
              <button
                onClick={handleBackToList}
                className="px-3 py-2 md:px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
              >
                ← Back
              </button>
              {selectedActivity && (
                <span className="text-sm text-gray-400 truncate max-w-[200px] md:max-w-none">
                  {selectedActivity.name}
                </span>
              )}
              {!selectedActivity && editedTrack && (
                <span className="text-xs text-blue-400 font-medium">Demo mode</span>
              )}
              {canUndo() && (
                <span className="text-xs text-yellow-400 font-medium">
                  Unsaved changes — auto-saved as draft
                </span>
              )}
            </div>

            <IssuesBanner key={String(canUndo())} />

            <div className="bg-gray-800 rounded-none md:rounded-lg md:p-4 border-0 md:border md:border-gray-700 -mx-4 md:mx-0">
              <div className="h-[calc(100dvh-7.5rem)] md:h-[600px]">
                <ErrorBoundary>
                  <MapContainer />
                </ErrorBoundary>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-3xl font-bold mb-1">Your Activities</h2>
                <p className="text-gray-400">Select an activity to view and edit its GPS track</p>
              </div>

              {/* Demo track button */}
              <button
                onClick={handleLoadDemo}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 hover:text-white rounded-lg text-sm transition-colors whitespace-nowrap"
                title="Load a sample activity with GPS issues to practice editing tools"
              >
                🧪 Try Demo Track
              </button>
            </div>

            <ActivityFilters />

            {isLoadingTrack && (
              <div className="bg-blue-900/20 border border-blue-500 text-blue-200 p-4 rounded-lg mb-6">
                <div className="flex items-center gap-3">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-400" />
                  <span>Loading GPS data...</span>
                </div>
              </div>
            )}

            {trackError && (
              <div className="bg-red-900/20 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
                <p className="font-semibold">Failed to load activity GPS data</p>
                <p className="text-sm mt-1">{trackError}</p>
              </div>
            )}

            <ErrorBoundary>
              <ActivityList onActivitySelect={handleActivitySelect} />
            </ErrorBoundary>
          </div>
        )}
      </main>
      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-800 mt-8 py-4 px-4">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            {/* Strava logo mark */}
            <svg
              className="w-4 h-4 text-strava-orange flex-shrink-0"
              viewBox="0 0 384 384"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Strava"
            >
              <path d="M158.4 0L90.5 160h48l19.9-40 19.9 40h48L158.4 0zM237.6 160h-48L244 320l54.4-160h-48l-6.4 19.2L237.6 160z" />
            </svg>
            <span>
              Powered by{' '}
              <a
                href="https://www.strava.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-strava-orange font-semibold hover:underline"
              >
                Strava
              </a>
            </span>
          </div>
          <div className="flex items-center gap-3 text-center sm:text-right">
            <a href="/privacy" className="hover:text-gray-300 hover:underline transition-colors">
              Privacy Policy
            </a>
            <span>·</span>
            <span>Not affiliated with Strava, Inc.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  useEffect(() => {
    initializeAuth();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function AppWithToasts() {
  return (
    <>
      <App />
      <ToastContainer />
    </>
  );
}

export default AppWithToasts;
