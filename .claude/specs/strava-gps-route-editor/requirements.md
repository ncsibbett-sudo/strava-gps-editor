# Requirements Document

## Introduction

The Strava GPS Route Editor is a seamless, athlete-first web application for correcting and refining GPS activity data. Endurance athletes frequently encounter GPS inaccuracies—missed segments from paused watches, erratic spikes from signal loss, or rough tracks that misrepresent their true effort. Currently, fixing these issues requires exporting a GPX file, editing it in a separate tool, and re-uploading manually—a fragmented experience most athletes avoid.

This application provides an integrated solution that authenticates directly with Strava, allows athletes to select any activity, provides intuitive GPS editing tools, and re-uploads corrected data without leaving the app. The platform is a web application built with React + Node.js, integrating with Strava API v3.

## Requirements

### 1. Authentication & Session Management

**User Story:** As an endurance athlete, I want to connect my Strava account with a single click, so that I can access my activities without manually handling API keys or tokens.

#### Acceptance Criteria
1. WHEN the user clicks "Connect with Strava" THEN the system SHALL redirect to Strava's OAuth 2.0 authorization page
2. WHEN Strava authorization is complete THEN the system SHALL receive an access token and refresh token
3. WHEN the access token expires THEN the system SHALL automatically refresh it using the refresh token
4. WHEN the user remains inactive for 24 hours THEN the system SHALL expire the session
5. WHEN the user refreshes the page within an active session THEN the system SHALL maintain the logged-in state using secure session storage
6. WHEN the user clicks logout THEN the system SHALL clear all tokens and cached data from the browser
7. WHEN the app displays Strava branding THEN it SHALL use the official "Connect with Strava" button and orange logo per Strava Brand Guidelines
8. IF the user is logged in THEN the system SHALL display a visible logout button

### 2. Activity Browser

**User Story:** As an endurance athlete, I want to see a list of my recent activities after logging in, so that I can quickly find the one I need to edit.

#### Acceptance Criteria
1. WHEN the user completes authentication THEN the system SHALL display the 30 most recent activities with name, date, distance, duration, and activity type icon
2. WHEN the user clicks an activity THEN the system SHALL open it in the GPS editor view
3. WHEN the activity list loads THEN it SHALL complete within 2 seconds of login

**User Story:** As an endurance athlete, I want to search and filter my activities by date, type, or name, so that I can find a specific activity without scrolling through everything.

#### Acceptance Criteria
1. WHEN the user enters a keyword THEN the system SHALL filter activities by name matching that keyword
2. WHEN the user selects a date range THEN the system SHALL filter activities within that range
3. WHEN the user selects a sport type THEN the system SHALL filter activities of that type (run, ride, hike, etc.)
4. WHEN the user clicks "Load More" THEN the system SHALL fetch the next 30 activities from the Strava API
5. IF the user hovers over an activity THEN the system SHALL show a small map thumbnail of the GPS route (P2)

### 3. GPS Editor - Map Interface

**User Story:** As an endurance athlete, I want to view my GPS route on an interactive map, so that I can see where corrections are needed.

#### Acceptance Criteria
1. WHEN an activity is opened THEN the system SHALL render the GPS track on a full-screen interactive map
2. WHEN the map is displayed THEN it SHALL support zoom, pan, and satellite/terrain tile layers
3. WHEN the GPS track renders THEN it SHALL complete within 1 second of activity selection
4. WHEN the user zooms in THEN the system SHALL display editable GPS points as draggable nodes
5. WHEN the user toggles view mode THEN the system SHALL switch between original and edited track overlay on the same map
6. WHEN the user performs an edit THEN the system SHALL support unlimited undo operations
7. WHEN the user performs undo THEN the system SHALL support unlimited redo operations
8. WHEN the user clicks "Reset" THEN the system SHALL revert all changes back to the original track
9. IF the user hovers over the elevation chart THEN the system SHALL highlight the corresponding point on the map (P2)
10. WHEN an elevation chart is displayed THEN it SHALL be synchronized with the track on the map (P2)

### 4. GPS Editing Tools - Trim

**User Story:** As an endurance athlete, I want to trim the start and end of my GPS track, so that I can remove time spent standing around before and after my actual effort.

#### Acceptance Criteria
1. WHEN the user drags the start handle THEN the system SHALL set a new start point for the track
2. WHEN the user drags the end handle THEN the system SHALL set a new end point for the track
3. WHEN trim points are set THEN the system SHALL remove all GPS points outside the selection
4. WHEN points are removed via trim THEN the system SHALL update distance calculation accordingly
5. WHEN points are removed via trim THEN the system SHALL update duration calculation accordingly

### 5. GPS Editing Tools - Remove Spikes

**User Story:** As an endurance athlete, I want to automatically detect and remove GPS spikes from my route, so that my speed, pace, and distance data are not corrupted by satellite errors.

#### Acceptance Criteria
1. WHEN the user activates spike detection THEN the system SHALL identify GPS outliers using a configurable speed/distance threshold
2. WHEN spikes are detected THEN the system SHALL highlight flagged points on the map
3. WHEN spikes are flagged THEN the system SHALL allow removal in bulk or individually
4. WHEN spike removal completes THEN it SHALL finish within 500ms for tracks up to 50,000 points
5. WHEN the user clicks an individual GPS point THEN the system SHALL allow deletion of that point (P1)

### 6. GPS Editing Tools - Smooth Track

**User Story:** As an endurance athlete, I want to smooth a rough or jagged GPS track, so that my route looks clean and my distance calculation is more accurate.

#### Acceptance Criteria
1. WHEN the user activates smoothing THEN the system SHALL apply a configurable smoothing algorithm (Gaussian or moving average)
2. WHEN smoothing is active THEN the system SHALL provide a slider to control intensity
3. WHEN the user adjusts the smoothing slider THEN the system SHALL update the track visualization in real-time
4. WHEN smoothing completes THEN it SHALL finish within 500ms for tracks up to 50,000 points

### 7. GPS Editing Tools - Redraw Section

**User Story:** As an endurance athlete, I want to manually redraw a section of my route on the map with the option to snap to roads or draw freehand, so that I can correct portions where GPS completely lost signal, including trails and paths not recognized by mapping services.

#### Acceptance Criteria
1. WHEN the user clicks "Redraw" THEN the system SHALL prompt to select a start point on the track
2. WHEN the start point is selected THEN the system SHALL prompt to select an end point on the track
3. WHEN both points are selected THEN the system SHALL provide two drawing mode options: "Snap to Road" and "Freehand"
4. WHEN "Snap to Road" mode is active THEN the system SHALL use a routing engine (OSRM or Mapbox Directions) to generate a road/path-snapped route
5. WHEN "Freehand" mode is active THEN the system SHALL allow the user to manually draw the route path
6. WHEN the user is redrawing a section THEN the system SHALL allow toggling between "Snap to Road" and "Freehand" modes at any point during the operation
7. WHEN modes are toggled during redrawing THEN the system SHALL support mixed approaches (e.g., snap to road for paved portions, freehand for trail sections)
8. WHEN a section is redrawn THEN the system SHALL replace the original points with the new route
9. IF the routing engine is unavailable THEN the system SHALL display an error message and automatically switch to freehand mode

### 8. GPS Editing Tools - Fill Gap

**User Story:** As an endurance athlete, I want to edit my route if I paused my Strava and forgot to restart it, so that the gap in my track is filled with the path I actually ran or rode.

#### Acceptance Criteria
1. WHEN the system analyzes a track THEN it SHALL detect sections where recording was paused
2. WHEN a gap is detected THEN the system SHALL offer to automatically fill it
3. WHEN the user accepts gap fill THEN the system SHALL use map routing between the two endpoints
4. WHEN gap fill completes THEN the system SHALL insert the routed points into the track

### 9. Preview & Upload - Preview

**User Story:** As an endurance athlete, I want to preview my edited route side-by-side with the original, so that I can confirm the changes are correct before uploading.

#### Acceptance Criteria
1. WHEN edits are made THEN the system SHALL maintain both original and edited track data
2. WHEN the user toggles between views THEN the system SHALL overlay original and edited tracks on the same map
3. WHEN the before/after toggle is activated THEN the map SHALL accurately reflect the changes

### 10. Preview & Upload - Export GPX

**User Story:** As an endurance athlete, I want to download my edited activity as a GPX file, so that I have a local backup or can upload it to other platforms.

#### Acceptance Criteria
1. WHEN the user clicks "Download GPX" THEN the system SHALL generate a .gpx file
2. WHEN GPX generation occurs THEN it SHALL complete within 1 second
3. WHEN the GPX file is created THEN it SHALL contain all edited GPS points with timestamps, elevation, and coordinates

### 11. Preview & Upload - Upload to Strava

**User Story:** As an endurance athlete, I want to re-upload my corrected activity directly to Strava from the app, so that I don't have to manually download and re-import files.

#### Acceptance Criteria
1. WHEN the user clicks "Upload to Strava" THEN the system SHALL display a warning modal
2. WHEN the warning is displayed THEN it SHALL explain that a new activity will be created and kudos/comments will not transfer
3. WHEN the user confirms upload THEN the system SHALL post the edited GPX using the Strava API upload endpoint
4. WHEN uploading to Strava THEN the system SHALL copy metadata (name, description, gear, sport type) from the original activity
5. WHEN upload is in progress THEN the system SHALL display a progress indicator
6. WHEN upload completes successfully THEN the system SHALL display a success message with a link to the new Strava activity
7. WHEN upload fails THEN the system SHALL display a failure message with error details
8. IF the user confirms deletion of the original THEN the system SHALL delete the original activity via the API (P1)

### 12. Data Privacy & Compliance

**User Story:** As an endurance athlete, I want to be able to revoke the app's access to my Strava account at any time, so that I remain in control of my data.

#### Acceptance Criteria
1. WHEN the user logs out THEN the system SHALL clear all access tokens from browser storage
2. WHEN the user clicks "Delete My Data" THEN the system SHALL clear all locally cached tokens and activity data

**User Story:** As an endurance athlete, I want to know that my activity data is not stored on any server after my session ends, so that I can trust the app with my personal location history.

#### Acceptance Criteria
1. WHEN GPS/activity data is processed THEN it SHALL be handled entirely client-side or in ephemeral server memory
2. WHEN processing completes THEN the system SHALL NOT persist GPS data to any database
3. IF server-side caching is used THEN the system SHALL expire all cached Strava data within 7 days per API Agreement
4. WHEN the app is accessed THEN all API communication SHALL use HTTPS/TLS
5. WHEN users visit the app THEN it SHALL display a privacy policy explaining data handling per Strava API Agreement
6. WHEN the app handles user data THEN it SHALL NOT log, store, or transmit data beyond what is strictly required
7. WHEN the app operates THEN it SHALL NOT violate any clause of the Strava API Agreement
8. WHEN the app displays data THEN it SHALL NOT show other athletes' data
9. WHEN the app processes data THEN it SHALL NOT use Strava data for analytics, AI training, or secondary purposes

## Edge Cases and Constraints

### Technical Constraints
- Maximum track length: Support up to 50,000 GPS points with operations completing within 500ms
- Browser compatibility: Desktop Chrome, Firefox, and Safari
- OAuth scopes: activity:read_all (read all activities including private), activity:write (upload new activities)
- API rate limits: Respect Strava API rate limiting per their agreement

### Data Handling Constraints
- No server-side persistence of GPS data
- 7-day maximum cache limit for any Strava data
- HTTPS/TLS required for all API communication
- No storage beyond single session for user preferences

### Functional Constraints
- App will NOT display or edit other athletes' data
- App will NOT replicate Strava's social features (segments, kudos, feeds)
- App will NOT support bulk editing of multiple activities at once (v1.0)
- App will NOT support mobile native apps (v1.0)
- Segment recalculation handled by Strava automatically on re-upload

### Performance Constraints
- Activity list loads within 2 seconds of login
- GPS track renders on map within 1 second of selection
- Smoothing and spike removal complete within 500ms for tracks up to 50,000 points
- GPX export generates within 1 second
