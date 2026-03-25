/**
 * Privacy Policy page
 * Route: /privacy
 */
export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <a
            href="/"
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Back
          </a>
          <h1 className="text-lg font-bold">Privacy Policy</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="prose prose-invert space-y-8 text-gray-300 text-sm leading-relaxed">

          <section>
            <p className="text-gray-500 text-xs mb-6">Last updated: March 2026</p>
            <p>
              This privacy policy explains what data GPS Route Editor accesses, how it is
              used, and how you can control or delete it. We are committed to processing
              as little data as possible and keeping everything in your browser.
            </p>
          </section>

          {/* 1 */}
          <section>
            <h2 className="text-white font-semibold text-base mb-3">1. Who operates this app</h2>
            <p>
              GPS Route Editor is an independent, third-party application. It is not
              developed by, affiliated with, or sponsored by Strava, Inc. It uses the
              Strava API to access your activity data on your behalf.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-white font-semibold text-base mb-3">2. What data we access</h2>
            <p>When you connect your Strava account, we request the following OAuth scopes:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li>
                <strong className="text-gray-200">activity:read_all</strong> — to list and load
                your activities and GPS streams.
              </li>
              <li>
                <strong className="text-gray-200">activity:write</strong> — to upload corrected
                activities and optionally delete the originals.
              </li>
            </ul>
            <p className="mt-3">
              We access only the data required to perform the GPS editing functions you
              request. We do not access your profile, followers, segments, or any other
              Strava data.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-white font-semibold text-base mb-3">3. How your data is processed</h2>
            <p>
              <strong className="text-gray-200">All GPS processing happens entirely in your
              browser.</strong> Your GPS track data is never sent to our servers — it is
              fetched directly from Strava's API into your browser, edited locally, and
              re-uploaded to Strava from your browser.
            </p>
            <p className="mt-3">
              The only external service your GPS data touches is:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li>
                <strong className="text-gray-200">Strava API</strong> — to fetch and upload
                your activities.
              </li>
              <li>
                <strong className="text-gray-200">Open-Elevation API</strong> — if you use
                the Fix Elevation tool, your GPS coordinates (lat/lng only, no personal data)
                are sent to the Open-Elevation API to retrieve terrain elevation.
              </li>
              <li>
                <strong className="text-gray-200">OSRM (OpenStreetMap Routing)</strong> — if
                you use the Redraw tool with snap-to-road, your waypoints are sent to the
                public OSRM demo server for routing.
              </li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-white font-semibold text-base mb-3">4. What is stored locally</h2>
            <p>This app stores the following data in your browser only:</p>
            <div className="mt-3 space-y-3">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <p className="font-medium text-gray-200 mb-1">Session storage</p>
                <p className="text-gray-400">
                  Your Strava OAuth access token and athlete profile are stored in{' '}
                  <code className="text-xs bg-gray-700 px-1 rounded">sessionStorage</code>.
                  This data is automatically cleared when you close the browser tab.
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <p className="font-medium text-gray-200 mb-1">Edit drafts (IndexedDB)</p>
                <p className="text-gray-400">
                  In-progress GPS edits are saved as drafts in your browser's IndexedDB so
                  you can resume editing after a page reload. Drafts are cleared when you
                  log out or discard them manually.
                </p>
              </div>
            </div>
            <p className="mt-3">
              No personal data, GPS tracks, or authentication tokens are ever transmitted
              to or stored on any servers operated by this application.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-white font-semibold text-base mb-3">5. Cookies and tracking</h2>
            <p>
              This app does not use cookies, analytics, or any third-party tracking scripts.
              No advertising networks or data brokers receive any information from this app.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-white font-semibold text-base mb-3">6. How to revoke access</h2>
            <p>You can revoke this app's access to your Strava account at any time:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-400">
              <li>
                Go to your{' '}
                <a
                  href="https://www.strava.com/settings/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-strava-orange hover:underline"
                >
                  Strava Connected Apps settings
                </a>
                .
              </li>
              <li>Find GPS Route Editor and click Revoke Access.</li>
            </ol>
            <p className="mt-3">
              Clicking <strong className="text-gray-200">Log out</strong> in the app also
              clears all locally stored tokens and edit drafts from your browser immediately.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-white font-semibold text-base mb-3">7. Changes to this policy</h2>
            <p>
              If this policy changes materially, the "Last updated" date at the top will be
              updated. Continued use of the app after changes constitutes acceptance of the
              updated policy.
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-gray-800 mt-12 py-4 px-4">
        <div className="container mx-auto text-xs text-gray-500 text-center">
          Powered by{' '}
          <a
            href="https://www.strava.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-strava-orange hover:underline font-semibold"
          >
            Strava
          </a>
          {' '}— This app is not developed by or affiliated with Strava, Inc.
        </div>
      </footer>
    </div>
  );
}
