# View Data Page

## Overview

The View Data page provides a year-agnostic way to inspect locally stored entries under **Data Actions**.

It is designed to:
- Show stable framework fields in fixed positions
- Show game-specific `gameData` fields without hardcoding any game logic
- Stay performant on large events by limiting initial render size and progressively loading more rows

## Route

- Path: `/view-data`
- Sidebar: `Data Actions` → `View Data` (at the bottom of the section)

## Data Sources

The page supports two datasets:

1. **Match Scouting** (`MatchScoutingDB.scoutingData`)
2. **Pit Scouting** (`PitScoutingDB.pitScoutingData`)

## Rendering Model

### Fixed Fields (framework-owned)

- Match entries: `id`, `timestamp`, `eventKey`, `matchNumber`, `teamNumber`, `allianceColor`, `scoutName`, plus optional framework fields (`comments`, correction metadata)
- Pit entries: `id`, `timestamp`, `eventKey`, `teamNumber`, `scoutName`, plus core pit fields (`drivetrain`, `weight`, `programmingLanguage`, `notes`, `robotPhoto` presence)

### Dynamic Fields (`gameData`)

- `gameData` is flattened into dot-notation key paths (for example: `auto.coralL1`, `reportedEndgame.deepClimb`)
- Nested objects and arrays are supported
- No game-specific field names are assumed in core

## Entry Details Modal

Clicking/tapping an entry opens a detail modal with tabs:

- `QR Transfer` — single-entry QR for quick one-off sharing
- `Data` — full flattened `gameData` plus stable framework fields

QR behavior:

- Match entries generate a single-match QR payload on demand
- Pit entries generate a single-pit-entry QR payload on demand
- Pit QR payloads intentionally exclude `robotPhoto` to keep QR scans reliable

## Filters

MVP filters:
- Event key
- Team number
- Match number (match dataset only)
- Scout name

## Performance Strategy

- Entries are sorted newest-first
- Initial render is limited to 100 entries
- Additional entries are automatically loaded when the user reaches the bottom of the list (IntersectionObserver)

## Responsive Layout

- **Desktop**: table-first view for dense scanning
- Desktop rows include a dedicated **View** action button and row click support
- **Mobile**: expandable card-style entries for readability

## Notes

This page intentionally avoids any game-year assumptions and remains compliant with the core interface model described in `docs/FRAMEWORK_DESIGN.md`.
