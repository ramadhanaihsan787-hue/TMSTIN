# 🎨 FRONTEND_FLOW.md - React Application Flow

## Frontend Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REACT 19 + TYPESCRIPT FRONTEND                    │
│                          src/ Structure                              │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Entry Point: main.tsx → App.tsx                               │ │
│  │ Styling: Global CSS + Tailwind (utility-first)               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌──────────────────┬──────────────────┬──────────────────┬────────┐ │
│  │   /config        │   /context       │   /features      │ /share │ │
│  │   API endpoints  │   Auth context   │   Module pages   │ Utils  │ │
│  │   Constants      │   State sharing  │   Components     │ Hooks  │ │
│  └──────────────────┴──────────────────┴──────────────────┴────────┘ │
│  ┌──────────────┬──────────────────┬──────────────────┬─────────────┐│
│  │  /store      │   /types         │   /styles        │  /test      ││
│  │  Zustand     │   TypeScript     │   Tailwind       │  Unit/E2E   ││
│  │  (load plan) │   interfaces     │   customization  │  tests      ││
│  └──────────────┴──────────────────┴──────────────────┴─────────────┘│
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

### Login Process

```
┌────────────────────────────────────────────────────────────────────┐
│ STEP 1: User visits application (/)                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Frontend State:                                                   │
│    - No JWT token in localStorage                                 │
│    - User not authenticated                                       │
│  Router Decision:                                                 │
│    - Check ProtectedRoute component                               │
│    - Redirect to /login                                           │
│                                                                     │
│  Display: LoginPage component                                     │
│    └─ Form fields:                                                │
│       ├─ Username input                                           │
│       ├─ Password input                                           │
│       └─ "Sign In" button                                         │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ STEP 2: User submits login form                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Frontend Action:                                                 │
│    1. Validate form (non-empty username/password)                │
│    2. Show loading spinner                                        │
│    3. POST /api/auth/login {username, password}                   │
│                                                                     │
│  Backend Processing:                                              │
│    1. Lookup user in database by username                        │
│    2. IF not found: Return 401 "Invalid credentials"             │
│    3. Compare password hash: bcrypt.verify(password, hash)        │
│    4. IF mismatch: Return 401 "Invalid credentials"              │
│    5. Generate JWT token:                                         │
│       {                                                           │
│         "user_id": 123,                                          │
│         "username": "john",                                      │
│         "role": "admin_logistik",                               │
│         "exp": timestamp + 2 hours                              │
│       }                                                           │
│    6. Return 200 {access_token, expires_in: 7200}               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ STEP 3: Frontend stores token & redirects                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Frontend Actions:                                                │
│    1. localStorage.setItem('access_token', response.access_token)│
│    2. Update AuthContext:                                         │
│       setAuth({                                                   │
│         isAuthenticated: true,                                   │
│         user: {id, username, role},                             │
│         token: access_token                                     │
│       })                                                         │
│    3. Redirect to /dashboard                                     │
│                                                                     │
│  Axios Interceptor Setup:                                        │
│    - On every request header:                                    │
│      Authorization: Bearer {access_token}                        │
│    - Automatically added to all API calls                        │
│    - If 401 response: Clear token + redirect to /login           │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ STEP 4: Access protected routes                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ProtectedRoute Component:                                        │
│    1. Check localStorage for token                               │
│    2. Check AuthContext.isAuthenticated                          │
│    3. Check role permissions:                                    │
│       - /admin-only → role must be 'admin_logistik' or 'manager' │
│       - /driver-panel → role must be 'driver'                   │
│    4. IF all pass: Render component ✓                           │
│    5. IF token missing: Redirect to /login                      │
│    6. IF role insufficient: Redirect to /unauthorized           │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

LOGOUT:
  Frontend: Click "Logout" button
    └─ localStorage.removeItem('access_token')
    └─ Clear AuthContext
    └─ Redirect to /login
    └─ No backend call needed (JWT is stateless)

TOKEN EXPIRY:
  Frontend background job (optional):
    └─ Check token.exp vs Date.now()
    └─ If < 5 minutes remaining: Show "Session ending" warning
    └─ If expired: Force logout + redirect to /login
    └─ OR: Backend returns 401 → Axios interceptor logs out
```

---

## 📦 Order Management Flow

### Upload & Verification

```
┌────────────────────────────────────────────────────────────────────┐
│ ORDER UPLOAD INTERFACE (/orders/upload)                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  UI Components:                                                    │
│    ├─ React Dropzone: Drag-and-drop area (or click to select)     │
│    ├─ File type validation: .xlsx only                            │
│    └─ Progress bar: Upload progress (0-100%)                      │
│                                                                     │
│  Frontend Logic:                                                  │
│    1. User selects/drags Excel file                              │
│    2. Validate: file.type = 'application/vnd.ms-excel' ✓         │
│    3. Create FormData + append file                              │
│    4. POST /api/orders/upload (multipart/form-data)              │
│    5. Show loading spinner "Uploading..."                         │
│                                                                     │
│  Backend Processing (see BACKEND_CORE.txt):                      │
│    └─ Parse Excel → Create DeliveryOrder records                │
│                                                                     │
│  Frontend Response Handler:                                      │
│    IF success (200):                                             │
│      ├─ Show success toast: "450 orders uploaded, 50 skipped"   │
│      ├─ Refresh order list (poll /api/orders/list)              │
│      └─ Redirect to /orders/verify                              │
│    IF error (400-500):                                           │
│      ├─ Show error toast: error.message                         │
│      ├─ Log error for debugging                                 │
│      └─ Suggest user fix Excel and retry                        │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ ORDER VERIFICATION INTERFACE (/orders/verify)                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  UI Components:                                                    │
│    ├─ Paginated table: SO_WAITING_VERIFICATION orders            │
│    │  Columns: Order ID, Customer, Qty, Lat/Lon, Delivery Time  │
│    ├─ Map view: Show all order locations (Leaflet)              │
│    ├─ Edit panel: Click row to edit details                     │
│    └─ Bulk actions: "Verify All", "Delete Selected"             │
│                                                                     │
│  Frontend Interactions:                                          │
│                                                                     │
│    A. EDIT COORDINATES:                                          │
│       User action: Click marker on map or enter lat/lon         │
│       Frontend:                                                  │
│         1. Open coordinate editor modal                          │
│         2. Show current location on small map                    │
│         3. Allow drag marker or manual entry                     │
│         4. Input validation: lat [-90,90], lon [-180,180]      │
│         5. PUT /api/orders/{id}/coordinate {lat, lon}          │
│         6. Response: {success, order}                           │
│         7. Update table + map                                   │
│         8. Show notification: "Coordinate updated"              │
│                                                                     │
│    B. EDIT DELIVERY WINDOW:                                      │
│       User action: Click time cell                               │
│       Frontend:                                                  │
│         1. Show time picker (start and end)                     │
│         2. Validate: start < end, within 06:00-20:00           │
│         3. PUT /api/orders/{id}/time {start_mins, end_mins}    │
│         4. Response: {success, order}                           │
│         5. Update table                                         │
│         6. Show notification: "Time window updated"             │
│                                                                     │
│    C. EDIT WEIGHT:                                               │
│       User action: Click quantity cell                           │
│       Frontend:                                                  │
│         1. Show number input (KG)                               │
│         2. Validate: weight > 0                                 │
│         3. PUT /api/orders/{id}/weight {weight_kg}              │
│         4. Response: {success, order}                           │
│         5. Update table                                         │
│         6. Show notification: "Weight updated"                  │
│                                                                     │
│    D. MARK AS VERIFIED:                                          │
│       User action: Check checkbox or bulk "Verify All"          │
│       Frontend:                                                  │
│         1. Select one or multiple orders                         │
│         2. PUT /api/orders/{id}/verify (per order or bulk)      │
│         3. Show progress: "Verifying... 5/450"                  │
│         4. Response: {success, order}                           │
│         5. Remove from table (no longer SO_WAITING_VERIFICATION)│
│         6. Show notification: "X orders verified"               │
│         7. Enable "Optimize Routes" button                      │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🚚 VRP Optimization & Route Planning

### Load Planner Interface

```
┌────────────────────────────────────────────────────────────────────┐
│ VRP OPTIMIZATION PANEL (/vrp/optimize)                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  UI Layout:                                                        │
│  ┌──────────────────────┬──────────────────────────────────────┐  │
│  │ PARAMETERS PANEL     │ ROUTE RESULTS MAP                    │  │
│  │                      │ (Leaflet with polylines)            │  │
│  │ Date picker          │                                      │  │
│  │ Vehicle selector     │                                      │  │
│  │ Start time input     │ Color-coded routes                  │  │
│  │ Max overtime input   │ Markers for each stop               │  │
│  │                      │ Total distance display              │  │
│  │ [Optimize] button    │                                      │  │
│  └──────────────────────┴──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ ROUTES TABLE                                                 │  │
│  │ Vehicle | Orders | Weight | Distance | Time | Driver         │  │
│  │ Truck-1 | 12     | 850kg  | 42.5km   | 2h30 | (unassigned)   │  │
│  │ Truck-2 | 11     | 920kg  | 38.2km   | 2h15 | (unassigned)   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ DROPPED ORDERS                                               │  │
│  │ ORDER-456 | WEIGHT: 500kg | REASON: No capacity             │  │
│  │ ORDER-789 | WEIGHT: 300kg | REASON: Time window conflict    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

STEP-BY-STEP FLOW:

1. USER CONFIGURES OPTIMIZATION:
   ├─ Date: Select planning date (today or future)
   ├─ Vehicles: Multi-select active vehicles
   ├─ Start time: Depot opening (default 06:00)
   └─ Max overtime: Slider 0-180 minutes (default 120)

2. USER CLICKS "OPTIMIZE ROUTES":
   └─ Frontend action:
      1. Validate parameters
      2. Show loading dialog: "Optimizing routes..."
      3. POST /api/vrp/optimize {date, vehicle_ids, parameters}
      4. Poll status (every 2 seconds) until completion
      5. GET /api/vrp/optimize/status/{job_id}

3. BACKEND PROCESSING (30 seconds):
   └─ See BACKEND_CORE.txt for VRP solver logic

4. SOLUTION RECEIVED:
   Frontend displays:
   ├─ Map with color-coded routes:
   │  ├─ Red polyline: Route 1 (Truck-1)
   │  ├─ Blue polyline: Route 2 (Truck-2)
   │  └─ Numbered markers: Stop sequence (1, 2, 3...)
   │
   ├─ Routes table:
   │  ├─ Total weight per route
   │  ├─ Total distance per route
   │  ├─ Est. completion time
   │  └─ [Assign Driver] button per route
   │
   └─ Dropped orders section:
      ├─ ORDER-456 (500kg, window 14:00-15:00)
      ├─ Reason: "No available vehicle with capacity"
      └─ [Re-optimize with more vehicles] suggestion

5. USER ASSIGNS DRIVERS:
   ├─ Click [Assign Driver] on each route
   ├─ Modal: Select driver + helper (optional)
   ├─ Validate: Driver not already assigned today
   └─ Set start time (usually 06:00)

6. USER CONFIRMS & DISPATCHES:
   ├─ Click [Confirm & Dispatch All Routes]
   ├─ Show confirmation: "Ready to dispatch X routes?"
   ├─ POST /api/routes/confirm-routes {routes, drivers, helpers}
   ├─ Backend: Update DB + send notifications to drivers
   ├─ Frontend: Redirect to /routes/active
   └─ Show success: "Routes dispatched!"

STATE MANAGEMENT (Zustand):
  export const useLoadPlannerStore = create((set) => ({
    optimizationJob: {
      job_id: "uuid",
      status: "processing",  // pending, processing, completed, failed
      routes: [],
      dropped_orders: [],
      error: null
    },
    parameters: {
      date: "2026-05-19",
      vehicle_ids: [1, 2, 3],
      start_time: 360,
      max_overtime: 120
    },
    setJobStatus: (status) => set(state => ({ 
      optimizationJob: { ...state.optimizationJob, status }
    })),
    setRoutes: (routes) => set(state => ({ 
      optimizationJob: { ...state.optimizationJob, routes }
    })),
    // ...
  }))
```

---

## 📍 Real-time Tracking & Geofencing

### Live Map Interface

```
┌────────────────────────────────────────────────────────────────────┐
│ TRACKING DASHBOARD (/tracking/live)                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  UI Layout:                                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ MAIN MAP (Leaflet)                                           │  │
│  │ ┌─────────────────────────────────────────────────────────┐ │  │
│  │ │                                                         │ │  │
│  │ │  📍 Vehicle markers (animated):                        │ │  │
│  │ │     ├─ Green: On schedule                              │ │  │
│  │ │     ├─ Yellow: Delayed                                 │ │  │
│  │ │     └─ Red: Stalled/Problem                            │ │  │
│  │ │                                                         │ │  │
│  │ │  ⭕ Geofence circles: 200m radius (blue)               │ │  │
│  │ │     ├─ Solid: Vehicle inside geofence                 │ │  │
│  │ │     └─ Dotted: Next delivery target                    │ │  │
│  │ │                                                         │ │  │
│  │ │  📍 Depot location (green square)                      │ │  │
│  │ │  🏪 Customer locations (blue pins)                     │ │  │
│  │ │                                                         │ │  │
│  │ │  ─── Route polyline (vehicle path)                     │ │  │
│  │ │                                                         │ │  │
│  │ └─────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  VEHICLE DETAILS PANEL (Right sidebar):                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ ACTIVE VEHICLES TODAY                                        │  │
│  │                                                              │  │
│  │ [Vehicle: Truck-1] [Status: In Transit]                    │  │
│  │ Driver: John Smith                                          │  │
│  │ Current Location: -6.205, 106.481                          │  │
│  │ Speed: 45 km/h                                             │  │
│  │ Total Orders: 12                                           │  │
│  │ Completed: 3                                               │  │
│  │ Remaining: 9                                               │  │
│  │ Est. Completion: 14:30                                     │  │
│  │                                                              │  │
│  │ NEXT DELIVERY:                                             │  │
│  │ Order: ORDER-567                                           │  │
│  │ Customer: Toko ABC                                         │  │
│  │ Address: Jl. Sudirman, Jakarta                            │  │
│  │ Distance: 2.3 km (7 min)                                   │  │
│  │ Window: 14:00-15:00 (On track)                            │  │
│  │                                                              │  │
│  │ DELIVERY HISTORY:                                          │  │
│  │ ✓ ORDER-100 (Delivered 10:45)                             │  │
│  │ ✓ ORDER-101 (Delivered 11:30)                             │  │
│  │ ✓ ORDER-102 (Delivered 12:15)                             │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ALERTS PANEL (Bottom):                                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ ⚠️ ALERTS & NOTIFICATIONS                                   │  │
│  │                                                              │  │
│  │ 🔴 [Truck-2] Driver detention >60min at Store X            │  │
│  │ 🟡 [Truck-3] Traffic detected on Sudirman route            │  │
│  │ 🟢 [Truck-1] Arrived at ORDER-567 location ✓              │  │
│  │ 🟢 [Truck-1] POD uploaded for ORDER-565                    │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

REAL-TIME UPDATE MECHANISM:

1. WEBSOCKET CONNECTION (Preferred):
   Frontend:
     ws = new WebSocket('wss://api.example.com/ws/tracking')
     ws.onmessage = (event) => {
       const data = JSON.parse(event.data)
       // {vehicle_id, lat, lon, speed, status, order_id, ...}
       updateMapMarker(data)
     }

2. POLLING FALLBACK (If WebSocket unavailable):
   Frontend:
     setInterval(() => {
       fetch('/api/tracking/vehicles/active')
         .then(r => r.json())
         .then(vehicles => {
           vehicles.forEach(v => updateMapMarker(v))
         })
     }, 10000)  // Poll every 10 seconds

3. GEOFENCE TRIGGER:
   Backend GPS webhook receives: {vehicle_id, lat, lon, speed, timestamp}
   Backend logic:
     └─ Detects geofence entry (distance ≤ 200m, speed ≤ 5 km/h)
     └─ Sends event: {event: "geofence_enter", vehicle_id, order_id}
   Frontend:
     └─ Receives event
     └─ Updates map: Circle becomes solid blue
     └─ Shows notification: "Vehicle arrived at [Customer Name]"
     └─ Countdown timer: "Waiting for POD upload..."

4. ARRIVAL CONFIRMATION (After 30-second dwell):
   Backend:
     └─ After 30s + 2 GPS pings → confirm arrival
     └─ Sends event: {event: "arrival_confirmed", vehicle_id, order_id}
   Frontend:
     └─ Receives event
     └─ Updates status to green checkmark
     └─ Shows notification: "Order [ORDER-XXX] arrived!"
     └─ Prompts driver: "Capture POD now"

5. TRAFFIC DETECTION:
   Backend:
     └─ If speed < 5 km/h for > 10 minutes → traffic alert
     └─ Sends event: {event: "traffic_alert", vehicle_id, duration}
   Frontend:
     └─ Receives event
     └─ Route polyline turns orange
     └─ Shows notification: "Traffic detected on Truck-2 route"

INTERACTIVITY:

Click on vehicle marker:
  └─ Show expanded details in sidebar
  └─ Show delivery history
  └─ Show next stops

Click on geofence circle:
  └─ Show customer details
  └─ Show delivery window
  └─ Show expected/actual arrival time

Click on "Call Driver" button:
  └─ Open phone app (mobile) or show number (web)

Click on "Message Driver" button:
  └─ Open SMS or WhatsApp

Filter options:
  ├─ Show: All vehicles / On-time / Delayed / Problem
  └─ Group: By vehicle / By delivery window / By area
```

---

## 📷 E-POD Capture & Verification

### Driver POD Interface (Mobile App)

```
┌────────────────────────────────────────────────────────────────────┐
│ DRIVER APP - POD CAPTURE (/driver/pod-capture)                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SCREEN 1: ORDER DETAILS (After arrival)                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ TMS JAPFA DRIVER                                             │  │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │  │
│  │                                                              │  │
│  │ ORDER DETAILS                                               │  │
│  │ ─────────────────────────────────────────────────────────   │  │
│  │ Order: ORDER-567                                           │  │
│  │ Customer: Toko ABC                                         │  │
│  │ Address: Jl. Sudirman No. 123                             │  │
│  │ Phone: 0812-xxxx-xxxx                                     │  │
│  │ Quantity: 500 kg                                          │  │
│  │ Expected: 1 box, 10 pcs                                   │  │
│  │                                                              │  │
│  │ DELIVERY STATUS                                            │  │
│  │ ─────────────────────────────────────────────────────────   │  │
│  │ ⏱️ Arrival: 14:35 (On time)                               │  │
│  │ 📍 Location: -6.205, 106.481                             │  │
│  │ ✓ Geofence confirmed                                      │  │
│  │                                                              │  │
│  │ [Next: Take Photo] ▶                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                     │
│  SCREEN 2: PHOTO CAPTURE                                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │ ┌────────────────────────────────────────────────────────┐ │  │
│  │ │ 📷 [CAMERA PREVIEW]                                   │ │  │
│  │ │ (Live camera feed)                                    │ │  │
│  │ │                                                        │ │  │
│  │ │ ┌────────────────────────────────────────────────────┤ │  │
│  │ │ │ Toko ABC                                           │ │  │
│  │ │ │ 14:35:22                                           │ │  │
│  │ │ │ -6.205, 106.481                                    │ │  │
│  │ │ │ John Smith                                         │ │  │
│  │ │ │ ORDER-567                                          │ │  │
│  │ │ └────────────────────────────────────────────────────┤ │  │
│  │ │ (Watermark preview)                                  │ │  │
│  │ │                                                        │ │  │
│  │ └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │ [📷 Capture] [🖼️ Gallery] [❌ Cancel]                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                     │
│  SCREEN 3: PHOTO CONFIRMATION                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ ┌────────────────────────────────────────────────────────┐ │  │
│  │ │ 🖼️ [CAPTURED PHOTO WITH WATERMARK]                   │ │  │
│  │ │                                                        │ │  │
│  │ │ Toko ABC                                             │ │  │
│  │ │ 14:35:22                                             │ │  │
│  │ │ -6.205, 106.481                                      │ │  │
│  │ │ John Smith                                           │ │  │
│  │ │ ORDER-567                                            │ │  │
│  │ │                                                        │ │  │
│  │ └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │ [✓ Use This] [📷 Retake] [❌ Cancel]                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                     │
│  SCREEN 4: QUANTITY VERIFICATION                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ DELIVERY CONFIRMATION                                       │  │
│  │ ─────────────────────────────────────────────────────────   │  │
│  │                                                              │  │
│  │ Expected quantity: 1 box, 10 pcs                           │  │
│  │                                                              │  │
│  │ ACTUAL DELIVERED:                                          │  │
│  │ ┌──────────────────────────────────────────────────────┐   │  │
│  │ │ Qty Delivered: [10] pcs                              │   │  │
│  │ │ Qty Return: [0] pcs (damage, reject, etc)           │   │  │
│  │ │ Qty Damaged: [0] pcs (broken during transit)        │   │  │
│  │ └──────────────────────────────────────────────────────┘   │  │
│  │                                                              │  │
│  │ DELIVERY STATUS:                                           │  │
│  │ ◯ Delivered successfully (all items OK)                   │  │
│  │ ◯ Partial delivery (some items returned)                  │  │
│  │ ◯ Return (customer rejected entire order)                 │  │
│  │                                                              │  │
│  │ NOTES:                                                      │  │
│  │ ┌──────────────────────────────────────────────────────┐   │  │
│  │ │ "Customer received all items in good condition"      │   │  │
│  │ │                                                       │   │  │
│  │ │ [Clear] [Character count: 50/500]                  │   │  │
│  │ └──────────────────────────────────────────────────────┘   │  │
│  │                                                              │  │
│  │ [✓ Confirm Delivery]                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                     │
│  SCREEN 5: SIGNATURE (Optional)                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ CUSTOMER SIGNATURE                                          │  │
│  │                                                              │  │
│  │ ┌────────────────────────────────────────────────────────┐ │  │
│  │ │ Please have customer sign below:                       │ │  │
│  │ │                                                        │ │  │
│  │ │ ┌──────────────────────────────────────────────────┐  │ │  │
│  │ │ │ [SIGNATURE PAD]                                  │  │ │  │
│  │ │ │ (React Signature Canvas)                         │  │ │  │
│  │ │ │                                                  │  │ │  │
│  │ │ └──────────────────────────────────────────────────┘  │ │  │
│  │ │                                                        │ │  │
│  │ │ [✓ Confirm] [❌ Clear] [Skip]                       │ │  │
│  │ └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                     │
│  SCREEN 6: UPLOAD PROGRESS                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ UPLOADING POD...                                            │  │
│  │                                                              │  │
│  │ Photo upload: ████████░░░░░░░░░░ 50%                       │  │
│  │ Signature upload: ████████████████░░ 90%                   │  │
│  │                                                              │  │
│  │ Please wait... (do not close app)                          │  │
│  │                                                              │  │
│  │ [⏸️ Pause]                                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  SCREEN 7: SUCCESS                                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ ✅ POD UPLOADED SUCCESSFULLY                                │  │
│  │                                                              │  │
│  │ Order: ORDER-567                                           │  │
│  │ Status: ✓ Delivered (POD pending admin verification)      │  │
│  │                                                              │  │
│  │ Next delivery: ORDER-568                                   │  │
│  │ Distance: 1.5 km                                           │  │
│  │ Time: 15:10 (7 min away)                                  │  │
│  │                                                              │  │
│  │ [Next Delivery] ▶                                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

FRONTEND CODE FLOW:

1. Navigate to POD screen
   └─ useEffect: Fetch current order details
   └─ Display order info

2. User clicks "Take Photo"
   └─ Request camera permission (if first time)
   └─ Open native camera component
   └─ Show watermark preview overlay

3. Photo captured
   └─ Get current GPS location (via HTML5 Geolocation API)
   └─ Get driver name from AuthContext
   └─ Create watermark text
   └─ Apply watermark using Canvas API
   └─ Save edited image

4. User confirms photo
   └─ Store image in component state
   └─ Move to quantity verification screen

5. User enters quantities & status
   └─ Validate: qty_delivered > 0 (at least something delivered)
   └─ Optional: Get signature (React Signature Canvas → PNG)
   └─ Optional: Add driver notes

6. User clicks "Confirm Delivery"
   └─ Create FormData:
      {
        line_id,
        photo_binary (image blob),
        qty_delivered,
        qty_return,
        qty_damaged,
        status,
        signature_png (if captured),
        notes
      }
   └─ POST /api/driver/upload-epod
   └─ Show progress bar

7. Backend processing
   └─ Save photo to /uploads/epod/
   └─ Strip EXIF metadata
   └─ Create TMSEpodHistory record
   └─ Update DeliveryOrder.status = DELIVERED_POD_UPLOADED

8. Frontend receives success
   └─ Show success message
   └─ Update local cache
   └─ Move to next delivery
```

---

## 📊 Analytics Dashboard

### Manager Dashboard Interface

```
┌────────────────────────────────────────────────────────────────────┐
│ MANAGER DASHBOARD (/dashboard/manager)                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ HEADER:                                                            │
│ [Today: May 19, 2026] [Week] [Month] [Custom Range]              │
│ [Export Report] [Settings]                                        │
│                                                                     │
│ KPI CARDS (Real-time):                                            │
│ ┌────────────────┬────────────────┬────────────────┬────────────┐ │
│ │ 📦 Orders      │ 🚚 Fleet       │ ⏱️ Avg Time    │ 💰 Cost    │ │
│ │ Today          │ Utilization    │ Delivery       │ Per Order  │ │
│ │ ────────────── │ ────────────── │ ────────────── │ ──────────  │ │
│ │ 487 / 500      │ 78.5%          │ 22.3 minutes   │ $12.50     │ │
│ │ ↑ 5% vs avg    │ ↑ 3% vs target │ ↓ 8% vs target │ ↓ 2% good │ │
│ │                │                │                │            │ │
│ │ [More Info]    │ [More Info]    │ [More Info]    │ [More Info]│ │
│ └────────────────┴────────────────┴────────────────┴────────────┘ │
│                                                                     │
│ CHARTS (Recharts or Chart.js):                                    │
│ ┌──────────────────────────┬──────────────────────────────────┐   │
│ │ DELIVERY VOLUME (Bar)    │ ON-TIME %, RETURN %, COST (Line)│   │
│ │ Hours 06-22              │ Trends over last 7 days        │   │
│ │ ├─ 06:00-08:00: 45       │ ├─ On-time: 94% (good)        │   │
│ │ ├─ 08:00-10:00: 62       │ ├─ Return: 2.1% (warning)     │   │
│ │ ├─ 10:00-12:00: 78 ▲     │ ├─ Cost/order: $12.50         │   │
│ │ ├─ 12:00-14:00: 85 (peak)│ └─ Trend: Stable              │   │
│ │ ├─ 14:00-16:00: 91       │                                │   │
│ │ ├─ 16:00-18:00: 72       │                                │   │
│ │ └─ 18:00-20:00: 31       │                                │   │
│ └──────────────────────────┴──────────────────────────────────┘   │
│                                                                     │
│ ALERTS (Active Issues):                                           │
│ ┌──────────────────────────────────────────────────────────────┐  │
│ │ 🔴 [CRITICAL] Truck-2: Driver detention >60min at Store X   │  │
│ │    Action: Call driver / Re-route remaining orders           │  │
│ │                                                              │  │
│ │ 🟡 [WARNING] 15 pending orders waiting assignment           │  │
│ │    Recommend: Optimize more routes / Use reserve vehicles   │  │
│ │                                                              │  │
│ │ 🟡 [WARNING] Return rate 3.2% (above 2.5% target)          │  │
│ │    Recommend: Review driver training / Quality control      │  │
│ │                                                              │  │
│ └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ FLEET OVERVIEW TABLE:                                             │
│ ┌──────────────────────────────────────────────────────────────┐  │
│ │ Vehicle │ Driver   │ Status  │ Orders │ Weight │ Time    │   │  │
│ │ ─────── │ ──────── │ ─────── │ ────── │ ────── │ ─────── │   │  │
│ │ Truck-1 │ John     │ Running │ 12/12  │ 850kg  │ 2h 15m  │   │  │
│ │ Truck-2 │ Ahmad    │ Stalled │ 9/11   │ 680kg  │ 3h+ 🔴  │   │  │
│ │ Truck-3 │ Budi     │ Running │ 11/11  │ 920kg  │ 2h 35m  │   │  │
│ │ Van-1   │ Available│ Ready   │ 0/0    │ 0kg    │ -       │   │  │
│ │ Van-2   │ Available│ Ready   │ 0/0    │ 0kg    │ -       │   │  │
│ └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ACTIONS:                                                           │
│ [📞 Call Driver] [🗺️ Track Vehicle] [⚠️ Divert Order] [🔄 Retry]│
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 State Management (Zustand + Context)

```
ZUSTAND STORES:

1. useLoadPlannerStore
   ├─ optimizationJob: {job_id, status, routes, dropped_orders}
   ├─ parameters: {date, vehicle_ids, start_time, max_overtime}
   └─ Actions: setJobStatus, setRoutes, setParameters

2. useAuthStore (or AuthContext)
   ├─ user: {id, username, role}
   ├─ token: JWT
   ├─ isAuthenticated: boolean
   └─ Actions: login, logout, validateToken

3. useTrackingStore
   ├─ vehicles: [{id, lat, lon, status, currentOrder}]
   ├─ selectedVehicle: id
   └─ Actions: updateVehicles, selectVehicle, subscribeUpdates

CONTEXT API:

1. AuthContext
   ├─ Wraps: App component
   ├─ Provides: User info, role, token validation
   └─ Uses: ProtectedRoute for authorization

2. ThemeContext (Optional)
   ├─ darkMode: boolean
   ├─ sidebarCollapsed: boolean
   └─ Actions: toggleDarkMode, toggleSidebar
```

---

## 🎯 Navigation Flow (React Router)

```
Routes:
/login → LoginPage
/unauthorized → UnauthorizedPage
/dashboard → Dashboard (role-specific)
  ├─ /dashboard/manager → Manager dashboard
  ├─ /dashboard/admin → Admin dashboard
  └─ /dashboard/driver → Driver app

/orders → Orders management
  ├─ /orders/upload → Upload Excel
  ├─ /orders/verify → Verify coordinates/times
  └─ /orders/:id → Order detail

/vrp → VRP optimization
  ├─ /vrp/optimize → Load planner
  └─ /vrp/routes → Route list

/routes → Route management
  ├─ /routes/active → Live tracking
  ├─ /routes/:id → Route detail
  └─ /routes/history → Completed routes

/tracking → Real-time tracking
  ├─ /tracking/live → Live map
  └─ /tracking/:vehicle_id → Vehicle detail

/driver → Driver app
  ├─ /driver/route → Current route
  ├─ /driver/delivery/:id → Delivery details
  ├─ /driver/pod-capture → POD capture interface
  └─ /driver/profile → Driver profile

/finance → Finance
  ├─ /finance/expenses → Expense tracking
  ├─ /finance/billing → Billing
  └─ /finance/reports → Reports

/settings → System settings
  ├─ /settings/vrp → VRP parameters
  ├─ /settings/costs → Cost coefficients
  └─ /settings/alerts → Alert configuration
```

---

## 📱 Mobile Responsiveness

- **Desktop:** Full sidebar + content area
- **Tablet:** Collapsible sidebar + responsive grid
- **Mobile:** Bottom navigation bar + full-width content
  - Map: Touch gestures (pinch-zoom, pan)
  - Forms: Touch-optimized inputs
  - POD: Camera integration

---

**Last Updated:** May 2026
