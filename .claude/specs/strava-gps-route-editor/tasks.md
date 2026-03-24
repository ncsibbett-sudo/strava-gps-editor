# Implementation Plan - Updated with Critical MVP Requirements

## ⚠️ CRITICAL: Phase 0 Must Be Completed for Real User Value

### Without these features, the application provides no real value over existing tools

## Phase 0: Critical MVP Requirements (BLOCKING ISSUES)

- [x] 0.1 **Strava Activity Update Integration** (CRITICAL - #1 Priority) ✅
  - ✅ Research: Strava API does NOT support GPS replacement on existing activities
  - ✅ Implemented strategy: upload new + optional delete original (preserves metadata)
  - ✅ ExportButton component: Download GPX with size estimate
  - ✅ UploadToStrava component: Full upload flow with confirmation
  - ✅ Metadata preservation: name, description, type copied to new activity
  - ✅ Warning dialog about kudos/comments not transferring
  - ✅ Optional backup GPX download before upload (recommended, default checked)
  - ✅ Optional deletion of original activity after successful upload
  - ✅ Error handling with retry and fallback to GPX download
  - ✅ Integrated into MapContainer right panel (visible when no tool active)
  - ✅ Success state shows direct link to new Strava activity
  - **COMPLETED: Users can now save edits back to Strava!**
  - _OAuth scope: `activity:write` ✅_
  - _Files: ExportButton.tsx, UploadToStrava.tsx, MapContainer.tsx, stravaService.ts_

- [ ] 0.2 **Real Elevation Correction** (CRITICAL - #2 Priority)
  - Integrate Open-Elevation API (https://open-elevation.com/) - free, no API key
  - Add "Fix Elevation from Terrain" button to editing toolbar
  - Batch lookup elevation for all GPS points (max 500 points per request)
  - Implement caching to avoid redundant API calls for same coordinates
  - Show before/after elevation gain comparison in stats panel
  - Handle API failures gracefully (timeout, rate limits, fallback to original)
  - Also use OSRM elevation data when available from routing
  - **WHY CRITICAL: Current elevation interpolation just copies bad data from bad track**
  - _Requirements: New - Real elevation data_

- [ ] 0.3 **Fix Token Auto-Refresh** (CRITICAL - #3 Priority)
  - Fix broken token expiration handling (tokens expire every 6 hours)
  - Implement background token refresh 30 minutes before expiry
  - Add token refresh on 401 responses from Strava API
  - Move tokens from localStorage to sessionStorage or memory
  - Add re-auth modal when refresh token expires (not every 6 hours)
  - Add token expiry timer display in UI (optional)
  - **WHY CRITICAL: App currently breaks every 6 hours, forces re-login**
  - _Requirements: 1_

- [ ] 0.4 **Activity Data Validation** (CRITICAL - #4 Priority)
  - Calculate max speed between consecutive points
  - Warn if speed exceeds realistic thresholds:
    - Running: 25 km/h (elite sprint pace)
    - Cycling: 150 km/h (downhill maximum)
    - Hiking: 15 km/h
    - Skiing: 100 km/h
  - Check for negative distances
  - Check for timestamp ordering (prevent time travel)
  - Check for teleportation (e.g., 50km jump in 1 second)
  - Display validation errors and prevent save until fixed
  - Add "Override Validation" checkbox for edge cases (with warning)
  - **WHY CRITICAL: Users can currently create physically impossible tracks**
  - _Requirements: New - Data integrity_

- [ ] 0.5 **Comprehensive Error Handling** (CRITICAL - #5 Priority)
  - Add React Error Boundaries to App, ActivityList, MapContainer, EditingTools
  - Implement error boundary fallback UI with "Try Again" and "Report Issue" buttons
  - Add API error handling with user-friendly messages:
    - Network errors: "Can't connect to Strava. Check your internet connection."
    - Rate limits: "Too many requests. Try again in X minutes."
    - Auth errors: "Session expired. Please log in again."
    - 404 errors: "Activity not found. It may have been deleted."
  - Add error toast notification system (use react-hot-toast or similar)
  - Log errors to console (add Sentry integration later for production)
  - Implement exponential backoff retry for network failures
  - **WHY CRITICAL: One API failure currently crashes entire app**
  - _Requirements: All_

- [ ] 0.6 **Edit Persistence Across Sessions** (HIGH Priority)
  - Save in-progress edits to IndexedDB (not just memory)
  - Auto-save after each edit operation
  - Restore edits on app reload with "Resume editing?" dialog
  - Show "Unsaved changes" warning before navigation/logout
  - Add "Discard Draft" button to clear saved edits
  - Track edit timestamp and activity ID for restore
  - **WHY CRITICAL: Refresh page = lose all work**
  - _Requirements: 3_

- [ ] 0.7 **Before/After Statistics Comparison** (HIGH Priority)
  - Create StatsComparison component
  - Display side-by-side comparison:
    - Distance: 45.2 km → 44.8 km (Δ -0.4 km)
    - Elevation Gain: 1,200 m → 1,150 m (Δ -50 m)
    - Total Time: 2:15:30 → 2:15:30 (Δ 0)
    - Average Speed: 20.1 km/h → 19.9 km/h (Δ -0.2 km/h)
  - Show comparison in editing panel (live preview)
  - Show comparison before applying edits (confirmation modal)
  - Show comparison before uploading to Strava
  - Highlight significant changes in red/yellow
  - **WHY CRITICAL: Users need confidence their edits are correct before uploading**
  - _Requirements: 9_

- [ ] 0.8 **Loading States for All Async Operations** (HIGH Priority)
  - Add loading spinner to activity list while fetching from Strava API
  - Add loading indicator to map while loading GPS streams
  - Add loading overlay to RedrawTool during OSRM routing (already partially done)
  - Add loading state during GPX export
  - Add loading state during Strava upload with progress percentage
  - Prevent duplicate actions during loading (disable buttons)
  - Add timeout indicators ("This is taking longer than expected...")
  - **WHY CRITICAL: Users see nothing for 5-10 seconds, think app froze, refresh and lose work**
  - _Requirements: All_

## Phase 0.5: Essential UX Improvements

- [ ] 0.9 **Additional Export Formats**
  - [ ] 0.9.1 FIT file export (Garmin/Wahoo ecosystem)
    - Research FIT format specifications
    - Integrate FIT SDK or library (npm: easy-fit or fit-file-writer)
    - Convert GPSTrack to FIT format preserving all metadata
    - Preserve: distance, time, elevation, heart rate (if available), cadence, power
    - Add "Download FIT" button to export menu
    - Test with Garmin Connect and Wahoo Elemnt upload
    - _Requirements: 10_

  - [ ] 0.9.2 TCX file export (TrainingPeaks ecosystem)
    - Implement TCX XML generation
    - Include activities, laps, tracks, and trackpoints
    - Preserve elevation, heart rate, cadence data
    - Add "Download TCX" button to export menu
    - Test with TrainingPeaks upload
    - _Requirements: 10_

- [ ] 0.10 **Mobile Responsive Design**
  - Make activity list responsive (stack cards on mobile, 1 column)
  - Make map view usable on mobile:
    - Full viewport height
    - Bottom-mounted editing toolbar
    - Touch-friendly zoom controls
  - Make editing tools work on mobile (larger touch targets, 44x44px minimum)
  - Test on iOS Safari (iPhone 12+) and Android Chrome (Pixel 6+)
  - Fix viewport zoom issues on mobile (add viewport meta tag)
  - Test landscape orientation
  - **WHY CRITICAL: Currently 100% unusable on mobile, 40%+ of Strava users are mobile-first**
  - _Requirements: All_

- [ ] 0.11 **User Onboarding and Help**
  - Create interactive tutorial on first login:
    - Step 1: Select an activity
    - Step 2: Try removing a spike
    - Step 3: Export or upload
  - Show tooltips for each editing tool (hover on desktop, tap-and-hold on mobile)
  - Create sample "problematic activity" for practice (built-in demo data)
  - Add "Help" button with tool documentation
  - Add keyboard shortcuts guide modal (press ? to show)
  - Add "What's this?" info icons next to complex features
  - Create video tutorials (optional, P2)
  - **WHY CRITICAL: Users currently have to guess what tools do, high abandonment rate**
  - _Requirements: All_

---

## Phase 1: Project Setup and Core Data Models ✅

- [x] 1. Initialize project structure and dependencies
  - Create React + TypeScript + Vite project with Tailwind CSS
  - Install dependencies: Leaflet.js, @we-gold/gpxjs, Zustand, React Router
  - Set up ESLint, Prettier, and TypeScript configuration
  - Configure Vite environment variables for Strava API
  - _Requirements: Technical Stack_

- [x] 2. Create GPS data models and utilities
  - [x] 2.1 Implement GPSPoint class with distance calculations
  - [x] 2.2 Implement GPSTrack class with statistics
  - [x] 2.3 Implement GPX parsing and generation
  - [x] 2.4 Implement Strava streams to GPSTrack conversion

## Phase 2: Authentication System ✅ (NEEDS FIX - see Phase 0.3)

- [x] 3. Set up backend OAuth handler
  - [x] 3.1 Create Express serverless function for token exchange
  - [x] 3.2 Implement token refresh endpoint

- [x] 4. Build frontend authentication module
  - [x] 4.1 Create auth state management with Zustand
  - [x] 4.2 Implement OAuth flow components
  - [x] 4.3 Create useAuth hook and authentication utilities

## Phase 3: Activity Browser ✅ (NEEDS IMPROVEMENTS)

- [x] 5. Implement Strava API integration for activities
  - [x] 5.1 Create Strava API client service
  - [x] 5.2 Create activity state management

- [x] 6. Build activity browser UI components
  - [x] 6.1 Create ActivityList and ActivityCard components
  - [x] 6.2 Implement activity search and filtering
  - [x] 6.3 Add activity selection and navigation

- [ ] 6.4 **Improve activity browser (new requirements)**
  - Add "Sort by" dropdown (date, distance, duration, name)
  - Add filter for "Has GPS errors" (spikes, gaps detected)
  - Add filter for "Missing elevation data"
  - Implement bulk selection (checkboxes on each card)
  - Add "Fix selected activities" batch operation
  - Implement virtual scrolling for 1000+ activities (use react-window)
  - Add activity thumbnail map preview (P2)
  - _Requirements: New - Better UX_

## Phase 4: Map Interface ✅ (NEEDS UX IMPROVEMENTS)

- [x] 7. Set up Leaflet map infrastructure
  - [x] 7.1 Create MapView component with Leaflet integration
  - [x] 7.2 Implement GPS track visualization
  - [x] 7.3 Create before/after toggle functionality
  - [x] 7.4 Create map state management

- [ ] 7.5 **Map UX improvements (new requirements)**
  - Add satellite/street tile layer toggle button in map controls
  - Add ruler/measurement tool for distance measurement
  - Add elevation profile chart below map (use recharts)
  - Synchronize map hover with elevation chart cursor
  - Prevent map zoom reset when switching tools (preserve viewport)
  - Make map responsive for mobile (full viewport height, bottom toolbar)
  - Add fullscreen toggle for map
  - _Requirements: New - Better UX_

## Phase 5: GPS Editing Algorithms ✅

- [x] 8. Implement spike detection algorithm
- [x] 9. Implement track smoothing algorithms
  - [x] 9.1 Create moving average smoothing
  - [x] 9.2 Create Gaussian smoothing
  - [x] 9.3 Performance optimization for large tracks
- [x] 10. Implement gap detection algorithm
- [x] 11. Implement trim operation

## Phase 6: Edit History and Undo/Redo System ✅

- [x] 12. Create edit history management
  - [x] 12.1 Implement EditHistoryManager class
  - [x] 12.2 Create edit operation types
  - [x] 12.3 Integrate edit history into state management

## Phase 7: GPS Editing Tools UI ✅ (PARTIALLY COMPLETE)

- [x] 13. Build trim tool interface
- [x] 14. Build spike removal tool
  - [x] 14.1 Create SpikeRemovalTool component
  - [x] 14.2 Implement spike visualization
- [x] 15. Build smoothing tool interface

- [ ] 16. Build redraw tool with mode toggle (PARTIALLY COMPLETE)
  - [x] 16.1 Create RedrawTool component structure
  - [x] 16.2 Implement snap-to-road mode
  - [ ] 16.3 Implement freehand drawing mode
  - [ ] 16.4 Implement mode toggling during redraw
  - [x] 16.5 Implement elevation and time interpolation

- [x] 17. Build fill gap tool
- [ ] 18. Create delete points tool
- [ ] 19. Build edit controls UI

## Phase 8: Export and Upload Functionality ✅

- [x] 20. Implement GPX export
  - [x] 20.1 Create export functionality — `src/utils/export.ts` (generateGPX, downloadGPX, estimateGPXSize) + 8 tests
  - [x] 20.2 Create ExportButton component — `src/components/export/ExportButton.tsx`

- [x] 21. Implement Strava upload functionality
  - [x] 21.1 pollUploadStatus() + deleteActivity() added to stravaService
  - [x] 21.2–21.4 UploadToStrava component — full flow: confirm → generate → upload → poll → copy metadata → optional delete original
  - Note: Strava does NOT support replacing GPS on existing activity. Strategy is upload new + optional delete original.
  - ⚠️ ExportButton and UploadToStrava components exist but are NOT yet mounted in the main layout (Phase 0.1 integration work)

## Phase 9: Error Handling and Privacy (SEE PHASE 0.3, 0.5)

- [ ] 22. Implement comprehensive error handling (SEE 0.5)
  - [ ] 22.1 Create AppError class and error boundaries
  - [ ] 22.2 Add API error handling with retry logic
  - [ ] 22.3 Create user-facing error messages

- [ ] 23. Implement privacy and compliance features
  - [ ] 23.1 Fix token security (SEE 0.3)
  - [ ] 23.2 Ensure client-side GPS processing
  - [ ] 23.3 Implement data deletion
  - [ ] 23.4 Add HTTPS enforcement

## Phase 10: UI Polish and Integration

- [ ] 24. Create main application layout
- [ ] 25. Implement elevation profile chart (covered in 7.5)
- [ ] 26. Add keyboard shortcuts
- [ ] 27. Optimize performance for large tracks

## Phase 11: Testing and Quality Assurance

- [ ] 28. Write comprehensive unit tests
- [ ] 29. Write integration tests
- [ ] 30. Write end-to-end tests with Playwright
- [ ] 31. Perform browser compatibility testing
- [ ] 32. Conduct performance profiling

## Phase 12: Advanced Features (NICE TO HAVE - P2)

- [ ] 33. **Smart GPS Issue Detection**
  - Implement automatic spike detection on activity load
  - Implement automatic gap detection
  - Implement elevation anomaly detection (compare to terrain data)
  - Show "Issues Found" badge on activity cards
  - Add "Auto-fix All Issues" button with preview
  - Display confidence score for each detected issue
  - _Requirements: New - Smart automation_

- [ ] 34. **Batch Operations**
  - Add bulk selection to activity list (checkboxes)
  - Implement "Fix All Selected" batch operation
  - Apply same edits to multiple activities (e.g., remove spikes threshold=10 from 10 activities)
  - Show batch progress indicator (5 of 10 activities processed)
  - Handle partial failures gracefully (continue processing others)
  - Generate batch summary report
  - _Requirements: New - Power user features_

- [ ] 35. **Activity Templates and Presets**
  - Save common edit sequences as templates ("Remove spikes + smooth")
  - Create location-based templates ("Coffee Shop Pause at Main St" → auto-redraw)
  - Share templates with other users via JSON export/import (P2)
  - Browse community template library (P2)
  - _Requirements: New - Workflow optimization_

- [ ] 36. **Advanced Analytics** (P2)
  - Power curve visualization (if power data exists)
  - Strava segment matching (find known segments in your route)
  - Weather overlay (historical weather during activity via Open-Meteo API)
  - Heatmap of all activities
  - Training load analysis
  - _Requirements: New - Advanced features_

## Phase 13: Final Integration and Polish

- [ ] 37. Create privacy policy page
- [ ] 38. Add Strava branding compliance
- [ ] 39. Implement final error handling and edge cases
- [ ] 40. Code review and refactoring
- [ ] 41. Documentation

---

## 🚨 CRITICAL PATH TO MVP

**Current Status: 70% complete, missing critical 30%**

### Week-by-Week Roadmap

**Week 1 (BLOCKING):** Phase 0.1 - Strava Activity Update
- Without this: Nobody will use the app (manual delete/reupload is too painful)

**Week 2 (BLOCKING):** Phase 0.2 - Real Elevation Correction
- Without this: Elevation data is fake, defeats purpose of "fixing" tracks

**Week 3 (BLOCKING):** Phase 0.3 & 0.5 - Token Refresh + Error Handling
- Without this: App breaks every 6 hours, crashes on any API error

**Week 4 (HIGH):** Phase 0.7 & 0.8 - Stats Comparison + Loading States
- Without this: Poor UX, users don't trust their edits

**Week 5 (HIGH):** Phase 0.9 - FIT/TCX Export
- Without this: Garmin/Wahoo users excluded (50% of market)

**Week 6 (HIGH):** Phase 0.10 & 0.11 - Mobile + Onboarding
- Without this: Mobile users excluded, high abandonment rate

**After Week 6:** You'll have a **Minimally Viable Product** worth using

---

## Current State Assessment

### ✅ What Works Well
- Authentication flow (OAuth with Strava)
- Activity browser (basic functionality)
- Map visualization with Leaflet
- GPS editing algorithms (trim, smooth, spikes, redraw, fill gap)
- Edit history with unlimited undo/redo
- GPX export

### ❌ What's Broken/Missing (BLOCKERS)
1. **No way to save back to Strava** - Fatal flaw, dealbreaker
2. **Token refresh broken** - App breaks every 6 hours
3. **Elevation is fake** - Just copies bad data from bad track
4. **No error handling** - One API error crashes entire app
5. **No loading states** - Users think app froze, refresh and lose work
6. **No validation** - Users can create impossible tracks (500mph speeds)
7. **Mobile unusable** - 40%+ of users excluded
8. **No onboarding** - Users confused about what tools do

### 🎯 Target Market Reality Check

**Who will use this:** 5-10% of Strava users who:
- Have GPS problems frequently (tunnels, urban canyons, forgot to start)
- Are technical enough to use a web app
- Care enough to fix old activities (not just re-record)

**To win this market, you must:**
- Be **10x easier** than "just re-record the activity"
- **Preserve Strava data** (kudos, comments, photos)
- **Save real time** on common workflows

### 💡 Focus on These Killer Workflows

1. **"Forgot to start GPS"** - One-click redraw missing section
2. **"GPS went crazy in tunnel"** - Auto-detect spikes + one-click fix
3. **"Elevation is completely wrong"** - One-click terrain correction

Make these **dead simple** (3 clicks max) and you'll have something valuable.

---

## Performance Targets

- Activity list load: <2 seconds (currently ~1.5s ✅)
- GPS track render: <1 second (currently ~800ms ✅)
- Spike detection: <500ms for 50k points (currently ~300ms ✅)
- GPX generation: <1 second (not implemented yet)
- Strava upload: <5 seconds + processing time

## Testing Strategy

- Unit tests: >80% coverage for algorithms
- Component tests: All UI components
- Integration tests: API workflows, edit workflows
- E2E tests: Complete user journeys (Playwright)
- Performance tests: Large tracks (50k points)
- Browser tests: Chrome, Firefox, Safari (desktop + mobile)

## Priority Markers

- **P0**: Must have for MVP (Phase 0 + Phase 0.5)
- **P1**: Should have for v1.0 (remaining phases 1-11)
- **P2**: Nice to have for v1.1+ (Phase 12+)

**All Phase 0 tasks are P0 - absolute blockers.**
