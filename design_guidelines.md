# Design Guidelines: Vehicle Tracking System

## Design Approach

**Selected Framework:** Material Design (Data-Heavy Application Variant)

**Justification:** This fleet management dashboard requires efficient data display, clear status indicators, real-time updates, and complex interactions (maps, alerts, forms, reports). Material Design provides robust patterns for information density while maintaining clarity.

**Core Principles:**
- Information hierarchy over decoration
- Immediate visual feedback for critical alerts
- Scan-optimized layouts for fleet managers
- Clear spatial organization for multi-panel interfaces

---

## Typography System

**Font Family:** Inter (via Google Fonts CDN)
- Primary: Inter (400, 500, 600, 700)
- Monospace: 'Roboto Mono' for numeric data (speed, coordinates, timestamps)

**Hierarchy:**
- Page Titles: text-2xl font-semibold (Fleet Dashboard, Route History)
- Section Headers: text-lg font-semibold (Vehicle List, Active Alerts)
- Card Titles: text-base font-medium
- Body Text: text-sm font-normal
- Data Labels: text-xs font-medium uppercase tracking-wide
- Numeric Values: text-base font-mono (speeds, distances, times)
- Alert Text: text-sm font-medium
- Button Labels: text-sm font-medium

---

## Layout System

**Spacing Primitives:** Tailwind units 2, 4, 6, 8, 12
- Component padding: p-4 or p-6
- Section gaps: gap-4 or gap-6
- Card spacing: space-y-4
- Dense lists: space-y-2
- Icon-text pairs: gap-2

**Grid Structure:**
- Main dashboard: Three-column layout (vehicle list sidebar 320px | map flex-1 | detail panel 360px)
- Tablet: Two-column (collapsible sidebar | main content)
- Mobile: Single column stack with bottom sheet overlays

**Container Behavior:**
- Dashboard uses full viewport height (h-screen flex flex-col)
- Map container fills available space (flex-1)
- Sidebars use fixed widths with internal scroll (overflow-y-auto)

---

## Component Library

### Navigation & Structure

**Top Header Bar:**
- Height: h-16
- Contains: Logo, main navigation tabs (Dashboard, History, Geofences, Reports, Settings), user profile menu
- Layout: justify-between items-center px-6
- Sticky: sticky top-0 z-50

**Main Dashboard Layout:**
```
┌─────────────────────────────────────────┐
│  Header (h-16)                          │
├───────────┬────────────────┬────────────┤
│  Vehicle  │                │  Details   │
│  List     │   Map Area     │  Panel     │
│  (320px)  │   (flex-1)     │  (360px)   │
│  Scroll   │   Interactive  │  Scroll    │
└───────────┴────────────────┴────────────┘
```

### Vehicle List Sidebar

**List Item Structure:**
- Card-based: Rounded corners, subtle elevation
- Compact height: min-h-20
- Layout: Grid with icon | vehicle info | status indicator
- Hover state: Elevated appearance
- Active state: Clear visual distinction
- Show: Vehicle name, license plate, current speed (monospace), last update timestamp, status badge

**Quick Filters:** 
- Chip-style buttons above list (All, Moving, Stopped, Alerts, Offline)
- Active filter has distinct visual treatment

### Map Component

**Map Controls:**
- Positioned: Top-right corner with gap-2 stack
- Buttons: Floating circular buttons (w-10 h-10) with icon only
- Include: Zoom in/out, Center on vehicle, Toggle satellite/street view, Fullscreen

**Map Overlays:**
- Vehicle markers: Directional icons showing heading
- Geofence boundaries: Semi-transparent with clear border
- Route trails: Solid line with breadcrumb markers
- Current location: Pulsing indicator

**Status Display (Bottom-left):**
- Floating card showing selected vehicle details
- Layout: Two columns (labels | values)
- Real-time speed, heading, GPS accuracy, last update time
- "Follow Mode" toggle button

### Detail Panel (Right Sidebar)

**Tabbed Interface:**
- Tabs: Details, Alerts, Activity Log
- Tab height: h-12
- Active tab has clear visual distinction

**Vehicle Details Tab:**
- Metrics grid (2 columns): Speed, Heading, Location accuracy, Ignition status, Battery level
- Recent activity list: Last 5 events with timestamps
- Quick actions: "View Full History", "Set Speed Limit", "Create Geofence"

**Alerts Tab:**
- Chronological list (most recent first)
- Alert card structure: Icon | Alert type & message | Timestamp | Action buttons
- Priority levels: Critical (prominent), Warning, Info
- Badge counters for unread alerts

### Route History Interface

**Date/Time Selector:**
- Calendar picker + time range inputs
- Preset buttons: Today, Yesterday, Last 7 days, Last 30 days
- Layout: Horizontal inline with "Apply" button

**Route Visualization:**
- Map shows complete trail with markers
- Markers: Start (green flag), End (checkered flag), Stops (numbered pins)
- Timeline sidebar: Vertical list of events with timestamps

**Trip Summary Card:**
- Positioned above timeline
- Grid layout (2x3): Total Distance, Travel Time, Stopped Time, Average Speed, Max Speed, Stops Count
- Monospace for numeric values

**Event List:**
- Scrollable with search/filter
- Event types: Departure, Arrival, Stop, Speed violation, Geofence trigger
- Each event: Icon, description, location, timestamp, duration (if applicable)
- Expandable for address details

### Geofence Management

**Geofence List View:**
- Table format: Name, Type (circle/polygon), Status (active/inactive), Vehicles assigned, Last triggered
- Action column: Edit, Delete, View on map icons
- "Create New Geofence" prominent button (top-right)

**Geofence Creation Modal:**
- Full-screen overlay with map
- Tool palette (left): Draw circle, Draw polygon, Name field, Description textarea
- Rules section: Checkboxes for Entry/Exit/Dwell alerts, Time restrictions, Tolerance settings
- Footer: Cancel, Save buttons

**Geofence Rules Panel:**
- Form layout with clear sections
- Toggle switches for alert types
- Number inputs for thresholds (dwell time, tolerance)
- Multi-select for notification channels

### Alerts & Notifications

**Alert Feed:**
- Card-based list with priority sorting
- Filter chips: All, Speed, Geofence, System, Unread
- Alert card: Icon (left) | Alert title, message, vehicle, timestamp (center) | Actions (right)
- Critical alerts: Distinctive border treatment
- Batch actions: Mark all read, Clear

**In-App Notification Toast:**
- Appears top-right corner
- Auto-dismiss after 5s (or persist for critical)
- Icon | Message | Dismiss button
- Stacks vertically with gap-2

### Speed Monitoring Dashboard

**Violation Summary:**
- KPI cards row: Total violations this month, Vehicles with violations, Average excess speed
- Each card: Large number (text-3xl font-bold), Label, Trend indicator

**Violations Chart:**
- Bar chart showing violations over time (last 30 days)
- Responsive height: h-64
- Clear axis labels and gridlines

**Top Violators Table:**
- Sortable columns: Rank, Vehicle, Total violations, Avg excess speed, Last violation
- Row hover effect
- Top 3 rows have subtle visual emphasis
- "Export Report" button above table

### Forms & Inputs

**Text Inputs:**
- Height: h-10
- Padding: px-3
- Border radius: rounded-md
- Labels: text-sm font-medium mb-1

**Select Dropdowns:**
- Consistent with text inputs
- Icon indicator on right

**Buttons:**
- Primary action: px-4 py-2 rounded-md font-medium
- Secondary: Outlined variant
- Icon-only: Square (w-9 h-9) with centered icon

**Speed Limit Input:**
- Number input with unit label (km/h)
- Stepper controls (+/-)
- Preset chips: 30, 50, 60, 80, 100 km/h

---

## Icons

**Library:** Heroicons (outline for most, solid for active states)
**CDN:** Via Heroicons CDN

**Key Icons:**
- Vehicle: truck-icon
- Speed: gauge-icon / speedometer
- Location: map-pin-icon
- Geofence: shield-check-icon
- Alert: exclamation-triangle-icon (critical), bell-icon
- History: clock-icon
- Route: arrows-pointing-out-icon

---

## Responsive Behavior

**Desktop (1280px+):** Three-column layout as described
**Tablet (768px - 1279px):** Collapsible left sidebar, map + detail panel
**Mobile (<768px):** 
- Full-screen map
- Bottom sheet for vehicle list (swipe up to expand)
- Detail panel as full-screen overlay
- Hamburger menu for navigation

---

## Critical UX Patterns

**Real-time Updates:**
- Subtle pulse animation on live data values when updating
- Timestamp shows "Just now", "12s ago", "2m ago" format
- Loading skeleton for initial data fetch

**Empty States:**
- Centered icon + message for "No vehicles", "No alerts", "No history data"
- Actionable suggestion ("Add your first vehicle")

**Error States:**
- Inline error messages below inputs
- Toast for system errors
- "Weak signal" indicator with estimated location note

**Status Badges:**
- Small rounded pill: px-2 py-1 text-xs font-medium rounded-full
- States: Online, Offline, Moving, Stopped, Alert