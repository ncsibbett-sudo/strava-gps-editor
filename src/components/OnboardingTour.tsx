import { useState } from 'react';

const TOUR_KEY = 'strava-editor-tour-v1';

export function shouldShowTour(): boolean {
  try {
    return !localStorage.getItem(TOUR_KEY);
  } catch {
    return false;
  }
}

export function markTourComplete(): void {
  try {
    localStorage.setItem(TOUR_KEY, '1');
  } catch {
    // ignore storage errors
  }
}

interface OnboardingTourProps {
  /** Which step context we're in: 'list' = activity list, 'map' = map editor */
  context: 'list' | 'map';
  onDismiss: () => void;
}

const LIST_STEPS = [
  {
    title: 'Welcome to Strava GPS Route Editor 👋',
    body: "Fix GPS spikes, fill gaps, smooth rough tracks, correct elevation — and save changes back to Strava. All processing happens in your browser; your data never leaves your device.",
    icon: '🗺️',
  },
  {
    title: 'Step 1: Pick an activity',
    body: 'Browse your Strava activities below. Click any activity to open it in the editor. Look for rides or runs where your GPS went off — spikes, tunnels, missed segments.',
    icon: '👆',
  },
  {
    title: 'Want to practice first?',
    body: 'Use the "Load Demo Track" button to open a sample activity with intentional GPS issues — a spike, a gap, and a bad elevation reading. Try the tools without touching your real data.',
    icon: '🧪',
  },
];

const MAP_STEPS = [
  {
    title: 'Step 2: Use the editing tools',
    body: 'The toolbar at the bottom contains all editing tools. Try "Remove Spikes" to auto-detect GPS errors, or "Redraw" to trace the correct path on the map.',
    icon: '🛠️',
  },
  {
    title: 'Undo / Redo freely',
    body: 'Every edit is reversible. Use Ctrl+Z to undo and Ctrl+Y to redo. The "Both" view lets you compare the original and edited track side by side.',
    icon: '↩️',
  },
  {
    title: 'Step 3: Save your work',
    body: 'When you\'re happy with the result, use "Upload to Strava" to replace the activity, or "Download GPX/FIT/TCX" for offline use. Press ? at any time for detailed help.',
    icon: '💾',
  },
];

export function OnboardingTour({ context, onDismiss }: OnboardingTourProps) {
  const steps = context === 'list' ? LIST_STEPS : MAP_STEPS;
  const [step, setStep] = useState(0);

  const isLast = step === steps.length - 1;
  const current = steps[step];

  const handleNext = () => {
    if (isLast) {
      markTourComplete();
      onDismiss();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    markTourComplete();
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[1500] flex items-end md:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? 'bg-strava-orange' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        <div className="p-6 text-center">
          <div className="text-4xl mb-3">{current.icon}</div>
          <h3 className="text-base font-bold text-white mb-2">{current.title}</h3>
          <p className="text-sm text-gray-400 leading-relaxed">{current.body}</p>
        </div>

        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
          >
            Skip tour
          </button>
          <button
            onClick={handleNext}
            className="flex-1 px-4 py-2 bg-strava-orange hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {isLast ? 'Get started' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
