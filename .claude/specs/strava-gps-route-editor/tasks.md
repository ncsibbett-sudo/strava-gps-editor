# Implementation Plan

## Phase 1: Project Setup and Core Data Models

- [x] 1. Initialize project structure and dependencies
  - Create React + TypeScript + Vite project with Tailwind CSS
  - Install dependencies: Leaflet.js, @we-gold/gpxjs, Zustand, React Router
  - Set up ESLint, Prettier, and TypeScript configuration
  - Configure Vite environment variables for Strava API
  - _Requirements: Technical Stack_

- [x] 2. Create GPS data models and utilities
  - [x] 2.1 Implement GPSPoint class with distance calculations
    - Write GPSPoint class with lat, lng, elevation, time, distance properties
    - Implement Haversine distance calculation between points
    - Implement speed and grade computed properties
    - Write unit tests for distance calculations and properties
    - _Requirements: 3, 4, 5, 6, 7, 8_

  - [x] 2.2 Implement GPSTrack class with statistics
    - Write GPSTrack class with points array and metadata
    - Implement computed statistics (totalDistance, totalTime, averageSpeed, etc.)
    - Implement bounds calculation for map viewport
    - Write unit tests for all statistics calculations
    - _Requirements: 3, 9_

  - [x] 2.3 Implement GPX parsing and generation
    - Integrate @we-gold/gpxjs for GPX parsing
    - Implement GPSTrack.fromGPX() static method
    - Implement GPSTrack.toGPX() serialization method
    - Write unit tests with sample GPX files
    - _Requirements: 10_

  - [x] 2.4 Implement Strava streams to GPSTrack conversion
    - Write GPSTrack.fromStravaStreams() static method
    - Handle latlng, altitude, time, and distance arrays
    - Handle missing elevation data gracefully
    - Write unit tests with mock Strava API responses
    - _Requirements: 2, 3_

## Phase 2: Authentication System

- [x] 3. Set up backend OAuth handler
  - [x] 3.1 Create Express serverless function for token exchange
    - Set up Express with CORS configuration
    - Implement POST /api/auth/exchange endpoint
    - Exchange authorization code for access/refresh tokens with Strava API
    - Return tokens and athlete profile to frontend
    - Write integration tests with mocked Strava API
    - _Requirements: 1_

  - [x] 3.2 Implement token refresh endpoint
    - Create POST /api/auth/refresh endpoint
    - Implement automatic token refresh using refresh token
    - Handle token expiration and invalid token errors
    - Write integration tests for refresh flow
    - _Requirements: 1_

- [x] 4. Build frontend authentication module
  - [x] 4.1 Create auth state management with Zustand
    - Create authStore with tokens, athlete, and auth status
    - Implement login(), logout(), and refreshAccessToken() actions
    - Implement token storage in sessionStorage with encryption
    - Write unit tests for auth store actions
    - _Requirements: 1_

  - [x] 4.2 Implement OAuth flow components
    - Create LoginButton component with Strava branding
    - Create AuthCallback component to handle OAuth redirect
    - Implement authorization URL generation with correct scopes
    - Handle OAuth errors and display user-friendly messages
    - Write component tests for login flow
    - _Requirements: 1_

  - [x] 4.3 Create useAuth hook and authentication utilities
    - Implement useAuth() hook for accessing auth state
    - Create SecureStorage class for encrypted token storage
    - Implement automatic token refresh before expiration
    - Create authenticated fetch wrapper with auto-refresh
    - Write unit tests for auth utilities
    - _Requirements: 1_

## Phase 3: Activity Browser

- [x] 5. Implement Strava API integration for activities
  - [x] 5.1 Create Strava API client service
    - Implement fetchActivities() with pagination support
    - Implement fetchActivityMetadata() for single activity
    - Implement fetchActivityStreams() for GPS data
    - Implement rate limiting with 200/15min and 2000/day limits
    - Write integration tests with MSW (Mock Service Worker)
    - _Requirements: 2, 3_

  - [x] 5.2 Create activity state management
    - Create activityStore with activities list and filters
    - Implement loadActivities() action with pagination
    - Implement selectActivity() action to load GPS streams
    - Implement filter actions (search, date range, sport type)
    - Write unit tests for activity store
    - _Requirements: 2, 3_

- [x] 6. Build activity browser UI components
  - [x] 6.1 Create ActivityList and ActivityCard components
    - Implement ActivityList with 30 activities per page
    - Create ActivityCard displaying name, date, distance, duration, type
    - Implement "Load More" pagination button
    - Add loading states and error handling
    - Write component tests for activity display
    - _Requirements: 2_

  - [x] 6.2 Implement activity search and filtering
    - Create ActivitySearch component with keyword filter
    - Add date range picker for filtering by date
    - Add sport type dropdown filter (Run, Ride, Hike, etc.)
    - Implement real-time filtering of activity list
    - Write component tests for filtering functionality
    - _Requirements: 3_

  - [x] 6.3 Add activity selection and navigation
    - Implement click handler to select activity and navigate to editor
    - Display activity thumbnail map preview on hover (P2)
    - Show loading indicator during GPS data fetch
    - Handle activities without GPS data gracefully
    - Write E2E tests for activity selection flow
    - _Requirements: 2, 3_

## Phase 4: Map Interface

- [x] 7. Set up Leaflet map infrastructure
  - [x] 7.1 Create MapView component with Leaflet integration
    - Initialize Leaflet map with OpenStreetMap tiles
    - Implement zoom, pan, and layer controls
    - Support satellite/terrain tile layer switching
    - Set viewport bounds to fit GPS track
    - Write component tests for map initialization
    - _Requirements: 3_

  - [x] 7.2 Implement GPS track visualization
    - Create TrackLayer component to render GPS polyline
    - Display original track as colored polyline
    - Show editable GPS points as draggable nodes on zoom
    - Implement track highlighting on hover
    - Write tests for track rendering
    - _Requirements: 3_

  - [x] 7.3 Create before/after toggle functionality
    - Implement BeforeAfterToggle component with view modes
    - Support 'original', 'edited', and 'both' view modes
    - Render both tracks with different colors in 'both' mode
    - Persist view mode preference in state
    - Write tests for toggle functionality
    - _Requirements: 9_

  - [x] 7.4 Create map state management
    - Create mapStore with originalTrack, editedTrack, viewMode
    - Implement loadTrack() action to fetch and display activity
    - Implement setViewMode() action for toggling views
    - Track selected editing tool in state
    - Write unit tests for map store
    - _Requirements: 3_

## Phase 5: GPS Editing Algorithms

- [ ] 8. Implement spike detection algorithm
  - Write detectSpikes() function with speed/distance thresholds
  - Implement configurable thresholds (default: 22 m/s, 100m)
  - Return array of spike indices
  - Optimize for performance with 50,000 point tracks
  - Write unit tests with synthetic spike data
  - Verify <500ms performance target
  - _Requirements: 5_

- [ ] 9. Implement track smoothing algorithms
  - [ ] 9.1 Create moving average smoothing
    - Write smoothMovingAverage() function with configurable window size
    - Smooth lat, lng, and elevation independently
    - Preserve timestamp data
    - Write unit tests for smoothing quality
    - _Requirements: 6_

  - [ ] 9.2 Create Gaussian smoothing
    - Implement generateGaussianKernel() function
    - Write smoothGaussian() function with sigma parameter
    - Apply kernel convolution to track points
    - Write unit tests comparing smoothing algorithms
    - _Requirements: 6_

  - [ ] 9.3 Performance optimization for large tracks
    - Optimize both algorithms for 50,000 point tracks
    - Implement Web Worker for background processing (optional)
    - Verify <500ms performance target
    - Write performance tests
    - _Requirements: 6_

- [ ] 10. Implement gap detection algorithm
  - Write detectGaps() function to find paused recordings
  - Use configurable time threshold (default: 60 seconds)
  - Return Gap objects with start/end indices and metadata
  - Write unit tests with various gap scenarios
  - _Requirements: 8_

- [ ] 11. Implement trim operation
  - Write trimTrack() function to remove start/end points
  - Update distance and time calculations after trim
  - Maintain GPS point metadata integrity
  - Write unit tests for trim operations
  - _Requirements: 4_

## Phase 6: Edit History and Undo/Redo System

- [ ] 12. Create edit history management
  - [ ] 12.1 Implement EditHistoryManager class
    - Create immutable operation stack (past/future arrays)
    - Implement addOperation() to record edits
    - Implement undo() to reverse last operation
    - Implement redo() to reapply undone operation
    - Implement reset() to clear all edits
    - Write unit tests for history operations
    - _Requirements: 3_

  - [ ] 12.2 Create edit operation types
    - Define TypeScript interfaces for each operation type
    - Create TrimOperation, SmoothOperation, SpikeRemovalOperation
    - Create RedrawOperation and FillGapOperation types
    - Implement applyOperation() function for each type
    - Write unit tests for operation application
    - _Requirements: 4, 5, 6, 7, 8_

  - [ ] 12.3 Integrate edit history into state management
    - Create editStore with EditHistoryManager
    - Implement applyEdit() action to add operations
    - Implement undo/redo actions
    - Track current edited track from history
    - Write integration tests for edit workflow
    - _Requirements: 3_

## Phase 7: GPS Editing Tools UI

- [ ] 13. Build trim tool interface
  - Create TrimTool component with drag handles
  - Display start and end point handles on track
  - Show distance/time updates in real-time
  - Apply trim operation on confirmation
  - Write component tests for trim interactions
  - _Requirements: 4_

- [ ] 14. Build spike removal tool
  - [ ] 14.1 Create SpikeRemovalTool component
    - Display speed and distance threshold sliders
    - Show detected spikes highlighted on map
    - Display count of detected spikes
    - Provide "Remove All" and individual removal options
    - Write component tests for spike detection UI
    - _Requirements: 5_

  - [ ] 14.2 Implement spike visualization
    - Highlight spike points in red on map
    - Show tooltip with spike details on hover
    - Allow clicking individual spikes to remove
    - Update visualization after removal
    - Write tests for spike interaction
    - _Requirements: 5_

- [ ] 15. Build smoothing tool interface
  - Create SmoothTool component with algorithm selector
  - Add slider for smoothing intensity (window size/sigma)
  - Show real-time preview of smoothed track
  - Display before/after statistics comparison
  - Write component tests for smoothing controls
  - _Requirements: 6_

- [ ] 16. Build redraw tool with mode toggle
  - [ ] 16.1 Create RedrawTool component structure
    - Implement section selection (click start point, click end point)
    - Display selected section highlighted on map
    - Show mode toggle buttons: "Snap to Road" / "Freehand"
    - Track current mode in component state
    - Write component tests for section selection
    - _Requirements: 7_

  - [ ] 16.2 Implement snap-to-road mode
    - Integrate OSRM routing API for route generation
    - Display loading indicator during routing request
    - Show routed path preview before confirmation
    - Handle routing errors and fallback to freehand
    - Write integration tests with mocked OSRM API
    - _Requirements: 7_

  - [ ] 16.3 Implement freehand drawing mode
    - Integrate Leaflet.Editable for polyline drawing
    - Allow user to draw route directly on map
    - Show drawn path in real-time
    - Support click-and-drag freehand drawing
    - Write component tests for freehand drawing
    - _Requirements: 7_

  - [ ] 16.4 Implement mode toggling during redraw
    - Allow switching between modes at any point
    - Maintain multiple segments with different modes
    - Combine segments when finalizing redraw
    - Display mode indicators for each segment
    - Write integration tests for mixed-mode redrawing
    - _Requirements: 7_

  - [ ] 16.5 Implement elevation and time interpolation
    - Interpolate elevation for snap-to-road points
    - Interpolate timestamps based on distance
    - Maintain realistic pace for interpolated sections
    - Write unit tests for interpolation functions
    - _Requirements: 7_

- [ ] 17. Build fill gap tool
  - Create FillGapTool component with auto-detection
  - Display detected gaps with distance and time info
  - Show "Fill Gap" button for each detected gap
  - Use snap-to-road routing to fill gaps
  - Write component tests for gap filling
  - _Requirements: 8_

- [ ] 18. Create delete points tool
  - Implement individual point deletion on click
  - Show confirmation before deleting points
  - Update track statistics after deletion
  - Write component tests for point deletion
  - _Requirements: 5_

- [ ] 19. Build edit controls UI
  - Create EditControls component with tool selection
  - Display active tool indicator
  - Add undo/redo buttons with keyboard shortcuts
  - Add "Reset to Original" button
  - Write component tests for control interactions
  - _Requirements: 3_

## Phase 8: Export and Upload Functionality

- [ ] 20. Implement GPX export
  - [ ] 20.1 Create export functionality
    - Implement generateGPX() function using edited track
    - Include elevation and timestamp data in GPX
    - Create downloadable Blob and trigger download
    - Verify GPX generation completes within 1 second
    - Write unit tests for GPX generation
    - _Requirements: 10_

  - [ ] 20.2 Create ExportButton component
    - Display "Download GPX" button
    - Show file size estimate before download
    - Implement click handler for GPX download
    - Display success confirmation after download
    - Write component tests for export flow
    - _Requirements: 10_

- [ ] 21. Implement Strava upload functionality
  - [ ] 21.1 Create upload API integration
    - Implement uploadGPX() function with FormData
    - Copy metadata from original activity (name, description, gear, sport type)
    - Poll upload status until processing complete
    - Return activity ID and URL on success
    - Write integration tests with mocked Strava API
    - _Requirements: 11_

  - [ ] 21.2 Build UploadToStrava component
    - Create upload button and modal dialog
    - Display warning about new activity creation and lost kudos/comments
    - Show upload progress indicator during processing
    - Display success message with link to new Strava activity
    - Handle upload errors with user-friendly messages
    - Write component tests for upload workflow
    - _Requirements: 11, 12_

  - [ ] 21.3 Implement optional original activity deletion
    - Add checkbox for "Delete original activity"
    - Require explicit confirmation before deletion
    - Call Strava DELETE /activities/{id} API
    - Handle deletion errors gracefully
    - Write integration tests for deletion flow
    - _Requirements: 11_

## Phase 9: Error Handling and Privacy

- [ ] 22. Implement comprehensive error handling
  - [ ] 22.1 Create AppError class and error boundaries
    - Define AppError with code, recoverable flag, and user message
    - Create React ErrorBoundary component
    - Implement error logging (console/service)
    - Display user-friendly error fallback UI
    - Write tests for error boundary
    - _Requirements: All_

  - [ ] 22.2 Add API error handling with retry logic
    - Implement apiCallWithRetry() wrapper function
    - Add exponential backoff for failed requests
    - Handle rate limit errors with wait time
    - Display appropriate error messages for each error type
    - Write tests for retry logic
    - _Requirements: 1, 2, 3_

  - [ ] 22.3 Create user-facing error messages
    - Define ERROR_MESSAGES map with friendly descriptions
    - Implement error toast/notification system
    - Show specific guidance for recoverable errors
    - Write tests for error message display
    - _Requirements: All_

- [ ] 23. Implement privacy and compliance features
  - [ ] 23.1 Create SecureStorage for token encryption
    - Implement encrypt/decrypt using Web Crypto API (or btoa/atob for simplicity)
    - Store tokens in sessionStorage only
    - Clear tokens on logout
    - Write unit tests for secure storage
    - _Requirements: 12_

  - [ ] 23.2 Ensure client-side GPS processing
    - Verify all GPS operations run in browser only
    - Ensure backend never receives GPS coordinates
    - Implement 7-day cache expiry for activity metadata (if cached)
    - Write tests to verify no GPS data transmission to backend
    - _Requirements: 12_

  - [ ] 23.3 Implement data deletion
    - Create "Delete My Data" button in settings
    - Clear all sessionStorage and localStorage on deletion
    - Clear cached activity metadata
    - Write tests for data deletion
    - _Requirements: 12_

  - [ ] 23.4 Add HTTPS enforcement
    - Configure Vercel/hosting for HTTPS only
    - Add Strict-Transport-Security headers
    - Verify all API calls use HTTPS
    - _Requirements: 12_

## Phase 10: UI Polish and Integration

- [ ] 24. Create main application layout
  - Build App component with routing
  - Create navigation header with logout button
  - Implement responsive layout with Tailwind CSS
  - Add loading states for route transitions
  - Write component tests for layout
  - _Requirements: 1, 2, 3_

- [ ] 25. Implement elevation profile chart (P2)
  - Create ElevationChart component using chart library
  - Synchronize chart hover with map position
  - Display elevation, distance, and grade
  - Write component tests for chart interactions
  - _Requirements: 3_

- [ ] 26. Add keyboard shortcuts
  - Implement Ctrl+Z for undo
  - Implement Ctrl+Y for redo
  - Implement Escape to cancel current tool
  - Write tests for keyboard shortcuts
  - _Requirements: 3_

- [ ] 27. Optimize performance for large tracks
  - Implement point decimation for map rendering (show subset of points)
  - Add Web Worker for smoothing/spike detection (optional)
  - Implement virtualization for activity list
  - Verify all performance targets met (<2s, <1s, <500ms, <1s)
  - Write performance tests
  - _Requirements: All_

## Phase 11: Testing and Quality Assurance

- [ ] 28. Write comprehensive unit tests
  - Achieve >80% code coverage for GPS algorithms
  - Test all data models and utilities
  - Test state management stores
  - Run tests in CI pipeline
  - _Requirements: All_

- [ ] 29. Write integration tests
  - Test complete OAuth flow with mocked Strava API
  - Test activity loading and selection
  - Test GPS editing workflows
  - Test export and upload flows
  - _Requirements: All_

- [ ] 30. Write end-to-end tests with Playwright
  - Test complete user journey from login to upload
  - Test each editing tool (trim, smooth, spike removal, redraw, fill gap)
  - Test error scenarios and edge cases
  - Run E2E tests in CI pipeline
  - _Requirements: All_

- [ ] 31. Perform browser compatibility testing
  - Test on Chrome 100+ (Windows, macOS)
  - Test on Firefox 100+ (Windows, macOS)
  - Test on Safari 15+ (macOS)
  - Fix browser-specific issues
  - _Requirements: All_

- [ ] 32. Conduct performance profiling
  - Profile activity list loading (<2s target)
  - Profile GPS track rendering (<1s target)
  - Profile smoothing/spike removal (<500ms for 50k points target)
  - Profile GPX generation (<1s target)
  - Optimize bottlenecks
  - _Requirements: All_

## Phase 12: Final Integration and Polish

- [ ] 33. Create privacy policy page
  - Write privacy policy covering data collection, usage, storage
  - Include Strava API Agreement compliance statements
  - Add user rights section (logout, delete data, revoke access)
  - Link privacy policy from footer
  - _Requirements: 12_

- [ ] 34. Add Strava branding compliance
  - Use official "Connect with Strava" button
  - Display orange Strava logo per brand guidelines
  - Add "Powered by Strava" attribution
  - Review Strava brand guidelines compliance
  - _Requirements: 1_

- [ ] 35. Implement final error handling and edge cases
  - Handle activities without GPS data
  - Handle extremely large tracks (>50k points)
  - Handle network disconnections gracefully
  - Test and fix edge cases
  - _Requirements: All_

- [ ] 36. Code review and refactoring
  - Review all code for best practices
  - Refactor duplicated code
  - Optimize bundle size
  - Add code comments for complex algorithms
  - _Requirements: All_

---

## Notes

### Implementation Order
The tasks are ordered to build incrementally:
1. **Foundation**: Data models and utilities first
2. **Authentication**: Enable Strava access
3. **Data Access**: Load activities and GPS data
4. **Visualization**: Display tracks on map
5. **Editing**: Core GPS manipulation algorithms
6. **Tools**: User-facing editing interfaces
7. **Export**: Save and upload results
8. **Polish**: Error handling, performance, testing

### Testing Approach
- Write unit tests alongside each algorithm/utility
- Write component tests for each UI component
- Write integration tests for API interactions
- Write E2E tests for complete user workflows
- Run all tests in CI pipeline before deployment

### Performance Targets
- Activity list: <2 seconds
- GPS track render: <1 second
- Smoothing/spike removal: <500ms for 50k points
- GPX generation: <1 second

### Priority Markers
- P0: Must have for v1.0
- P1: Should have for v1.0
- P2: Nice to have, can defer to v1.1

All unmarked tasks are P0.
