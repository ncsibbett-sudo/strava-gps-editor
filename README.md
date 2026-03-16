# Strava GPS Route Editor

A seamless, athlete-first tool for correcting and refining GPS activity data.

## Overview

The Strava GPS Route Editor is a web application that enables endurance athletes to correct GPS inaccuracies in their Strava activities. Users can authenticate with Strava, select activities, and use intuitive editing tools to fix GPS data, then re-upload corrected activities—all without leaving the app.

## Features

- **OAuth Authentication**: Seamless Strava login without manual token handling
- **Activity Browser**: View and search your Strava activities
- **GPS Editing Tools**:
  - Trim start/end points
  - Smooth rough GPS tracks
  - Remove GPS spikes
  - Redraw sections (snap-to-road or freehand)
  - Fill gaps from paused recordings
- **Export & Upload**: Download GPX files or re-upload directly to Strava
- **Privacy-First**: All GPS processing happens client-side

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Mapping**: Leaflet.js
- **State Management**: Zustand
- **GPS Processing**: @we-gold/gpxjs
- **Testing**: Vitest + Testing Library

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Strava API credentials (Client ID and Secret)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Strava Client ID

4. Start the development server:
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate coverage report

## Project Structure

```
src/
├── components/        # React components
├── models/           # Data models (GPSPoint, GPSTrack)
├── services/         # API clients and utilities
├── stores/           # Zustand state stores
├── utils/            # Utility functions
├── hooks/            # Custom React hooks
└── test/             # Test setup and utilities

api/
├── auth/
│   ├── exchange.ts   # OAuth token exchange endpoint
│   └── refresh.ts    # Token refresh endpoint
└── tsconfig.json     # TypeScript config for API
```

## Development

This project follows a spec-driven development approach. All specifications are located in `.claude/specs/strava-gps-route-editor/`:

- `requirements.md` - User stories and acceptance criteria
- `design.md` - Architecture and technical design
- `tasks.md` - Implementation task list

## Privacy & Compliance

- All GPS processing happens client-side
- No GPS data is stored on servers
- Complies with Strava API Agreement
- 7-day maximum cache limit for metadata

## License

MIT

## Contributing

This is a personal project. Contributions are welcome via pull requests.
