# 🏗️ ARCHITECTURE.md - TMS JAPFA SYSTEM FLOW

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19 + TypeScript + Tailwind)                   │
│                                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │   Auth Flow  │  │ Order Mgmt   │  │ VRP & Routes │  │ E-POD & Driver   │    │
│  │              │  │              │  │              │  │                  │    │
│  │ • Login      │  │ • Upload     │  │ • Optimize   │  │ • Photo capture  │    │
│  │ • Logout     │  │ • Verify     │  │ • Confirm    │  │ • Signature      │    │
│  │ • JWT store  │  │ • Track      │  │ • Dispatch   │  │ • Watermark      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘    │
│                                                                                  │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │ GPS Tracking &   │  │ Finance &    │  │ Analytics &  │  │ Settings &     │   │
│  │ Geofence         │  │ Expenses     │  │ Reporting    │  │ Configuration  │   │
│  │                  │  │              │  │              │  │                │   │
│  │ • Map view       │  │ • Expenses   │  │ • Dashboard  │  │ • VRP params   │   │
│  │ • GPS tracking   │  │ • Costs      │  │ • Reports    │  │ • Thresholds   │   │
│  │ • Geofence ping  │  │ • Billing    │  │ • Alerts     │  │ • Costs        │   │
│  └──────────────────┘  └──────────────┘  └──────────────┘  └────────────────┘   │
│                                                                                  │
│  HTTP Client (Axios): JWT injection on all requests                            │
│  State Management: Zustand (load planner), Context API (auth)                  │
│  Real-time: WebSocket (optional - currently polling)                           │
└──────────────────────────────────────────────────┬────────────────────────────────┘
                                                   │ REST API
                                                   │ JSON payloads
                                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI + Python 3.11 + SQLAlchemy)                   │
│                         Layered Architecture                                     │
│                                                                                  │
│  ┌──────────────── API ROUTERS LAYER ────────────────────────────────────┐     │
│  │                                                                        │     │
│  │  POST   /api/auth/login                 🔑 auth.py                   │     │
│  │  GET    /api/auth/validate-token        🔑 auth.py                   │     │
│  │  POST   /api/orders/upload              📦 orders.py                 │     │
│  │  PUT    /api/orders/{id}/coordinate     📦 orders.py                 │     │
│  │  PUT    /api/orders/{id}/pod/approve    📦 orders.py (POD workflow)  │     │
│  │  POST   /api/vrp/optimize               🚚 vrp_routes.py (CORE)      │     │
│  │  POST   /api/routes/confirm-routes      🚚 vrp_routes.py             │     │
│  │  POST   /api/tracking/webhook/gps       📍 tracking.py (REALTIME)    │     │
│  │  GET    /api/analytics/dashboard        📊 analytics.py              │     │
│  │  POST   /api/driver/upload-epod         📷 driver.py                 │     │
│  │  POST   /api/finance/expense            💰 finance.py                │     │
│  │  + 40+ more endpoints...                                              │     │
│  │                                                                        │     │
│  └────────────────────────────────────────────────────────────────────────┘     │
│                                                                                  │
│  ┌──────────────── SERVICE LAYER ────────────────────────────────────┐         │
│  │                                                                    │         │
│  │  ✓ AuthService            → JWT validation, role checking        │         │
│  │  ✓ OrderImportService     → Excel parsing, validation            │         │
│  │  ✓ VRPService (CORE)      → OR-Tools solver wrapper              │         │
│  │  ✓ VRPSolver             → Google OR-Tools constraint model      │         │
│  │  ✓ TrackingService        → Geofence + EMA logic                 │         │
│  │  ✓ RouteService           → Route management & sequencing        │         │
│  │  ✓ DriverService          → Driver profile & performance         │         │
│  │  ✓ EPodService            → Photo watermarking & validation      │         │
│  │  ✓ AnalyticsService       → KPI calculation                      │         │
│  │  ✓ FinanceService         → Cost calculation & billing           │         │
│  │  ✓ CronService            → Background job scheduling            │         │
│  │  + 8 more services...                                              │         │
│  │                                                                    │         │
│  └────────────────────────────────────────────────────────────────────┘         │
│                                                                                  │
│  ┌──────────────── DATABASE ORM LAYER ────────────────────────────────┐         │
│  │                                                                    │         │
│  │  SQLAlchemy ORM:                                                  │         │
│  │  • User → HRDriver (1-1)                                          │         │
│  │  • FleetVehicle → TMSRoutePlan (1-many)                           │         │
│  │  • TMSRoutePlan → TMSRouteLine (1-many)                           │         │
│  │  • TMSRouteLine → TMSEpodHistory (1-1)                            │         │
│  │  • DeliveryOrder → MasterCustomer (many-1)                        │         │
│  │  • Async queries with connection pooling                          │         │
│  │                                                                    │         │
│  └────────────────────────────────────────────────────────────────────┘         │
│                                                                                  │
│  ┌──────────────── CORE UTILITIES ────────────────────────────────────┐         │
│  │                                                                    │         │
│  │  Security:         JWT generation, bcrypt hashing, rate limiting │         │
│  │  Distance Calc:    OSRM API integration, Haversine fallback      │         │
│  │  Validators:       Order validation, coordinate validation       │         │
│  │  Formatters:       Excel export, JSON serialization              │         │
│  │  Helpers:          General utilities                              │         │
│  │                                                                    │         │
│  └────────────────────────────────────────────────────────────────────┘         │
│                                                                                  │
└──────────────────────┬──────────────────────────────┬────────────────────────────┘
                       │                              │
                       ▼                              ▼
        ┌─────────────────────────┐     ┌──────────────────────────┐
        │   PostgreSQL 12         │     │  External Services       │
        │  (Port 5432)            │     │                          │
        │                         │     │  • OSRM API (routing)    │
        │  9 Main Tables:         │     │  • Google OR-Tools       │
        │  • users                │     │  • GPS Webhook Provider  │
        │  • hr_drivers           │     │  • File Storage (S3)     │
        │  • fleet_vehicles       │     │  • Slack/Email (alerts)  │
        │  • master_customers     │     │  • VirusTotal (scan)     │
        │  • delivery_orders      │     │                          │
        │  • tms_route_plan       │     └──────────────────────────┘
        │  • tms_route_line       │
        │  • tms_epod_history     │
        │  • system_settings      │     ┌──────────────────────────┐
        │  + 2 reference tables   │     │  Background Jobs         │
        │                         │     │  (APScheduler)           │
        │  Async connection pool  │     │                          │
        │  Transaction support    │     │  ✓ Daily KPI calc        │
        │  Alembic migrations     │     │  ✓ Cron tasks            │
        │                         │     │  ✓ Cleanup jobs          │
        └─────────────────────────┘     │                          │
                                        └──────────────────────────┘
```

---

## 📊 Complete Data Flow Architecture

### Flow 1: Order Lifecycle Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: ORDER INGESTION                                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  SAP System                                                                  │
│      │ Excel export (KODE_CUST, NAMA, LAT, LON, QTY, DELIVERY_WINDOW)       │
│      ▼                                                                       │
│  Frontend: Order Upload Interface                                           │
│      │ User selects file + clicks upload                                    │
│      ├─ Validation: File type check (Excel only)                           │
│      ├─ File size check (max 10MB)                                         │
│      └─ HTTPS POST: /api/orders/upload {file_binary}                       │
│           │                                                                │
│           ▼                                                                │
│  Backend: POST /api/orders/upload                                          │
│      │                                                                      │
│      ├─ Auth: Validate JWT token (must be admin_logistik OR manager)       │
│      ├─ Parse Excel:                                                       │
│      │  └─ openpyxl → read columns (fragile, assumes fixed order) ⚠️       │
│      │                                                                      │
│      ├─ For each row:                                                      │
│      │  ├─ Extract: KODE_CUST, NAMA, LAT, LON, QTY, DELIVERY_WINDOW        │
│      │  ├─ Lookup: MasterCustomer.kode_customer = extracted_kode           │
│      │  ├─ If found: Use lat/lon (or customer's stored location)           │
│      │  ├─ If not found: SKIP row (warning logged)                        │
│      │  ├─ Create: DeliveryOrder record                                   │
│      │  │  └─ order_id = auto-generated                                   │
│      │  │  └─ store_id = looked up                                        │
│      │  │  └─ latitude, longitude = provided                              │
│      │  │  └─ weight_total = QTY                                          │
│      │  │  └─ delivery_window_start/end = extracted or default            │
│      │  │  └─ status = SO_WAITING_VERIFICATION                           │
│      │  └─ Add to batch (500 orders per transaction)                       │
│      │                                                                      │
│      ├─ Batch Insert: db.add_all() + commit()                             │
│      ├─ Response: {total_uploaded: 450, total_skipped: 50, ...}            │
│      │                                                                      │
│      └─ Frontend: Show success toast + order count                         │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: ORDER VERIFICATION                                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Frontend: Order Review Table                                               │
│      │ Admin views SO_WAITING_VERIFICATION orders                          │
│      │ Can edit: latitude, longitude, delivery_window, weight, notes        │
│      ├─ Edit Coordinate: Click marker on map OR enter lat/lon             │
│      │  └─ PUT /api/orders/{order_id}/coordinate {lat, lon}               │
│      │      └─ Backend: Update order + validate in service area           │
│      │                                                                      │
│      ├─ Edit Time Window: Select time range (e.g., 06:00 - 17:00)        │
│      │  └─ PUT /api/orders/{order_id}/time {start_mins, end_mins}         │
│      │      └─ Backend: Convert time to minutes from midnight (360-1020)  │
│      │                                                                      │
│      ├─ Edit Weight: Update quantity/weight                               │
│      │  └─ PUT /api/orders/{order_id}/weight {weight_kg}                  │
│      │      └─ Backend: Recalc service time based on new weight           │
│      │                                                                      │
│      └─ Mark as Verified: Click checkbox or bulk action                    │
│         └─ PUT /api/orders/{order_id}/verify                              │
│            └─ Backend: Set status = DO_VERIFIED                           │
│                                                                               │
│  Database: All SO_WAITING_VERIFICATION orders now DO_VERIFIED              │
│           Ready for VRP optimization                                       │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: ROUTE OPTIMIZATION (VRP SOLVER - CORE LOGIC)                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Frontend: Load Planner / VRP Optimization Panel                            │
│      │ Admin clicks "Optimize Routes" button                               │
│      │                                                                      │
│      ├─ Dialog: Select planning date + parameters                          │
│      │  ├─ Planning Date: Today or future date                            │
│      │  ├─ Vehicle Pool: Select active vehicles (or auto-select)          │
│      │  ├─ Start Time: Depot opening (default 06:00)                      │
│      │  └─ Max Overtime: Allow minutes after delivery_window_end          │
│      │                                                                      │
│      └─ POST /api/vrp/optimize {planning_date, vehicle_ids, parameters}   │
│           │                                                                │
│           ▼                                                                │
│  Backend: POST /api/vrp/optimize                                           │
│      │                                                                      │
│      ├─ Auth: Check JWT token (must be admin_logistik)                    │
│      ├─ Fetch data:                                                        │
│      │  ├─ All DO_VERIFIED orders for date                               │
│      │  ├─ Selected vehicles + capacity                                   │
│      │  ├─ Depot location (from SystemSettings)                          │
│      │  ├─ Distance matrix (OSRM API calls)                              │
│      │  └─ Time matrix (distance / speed + service_time)                 │
│      │                                                                      │
│      ├─ VRP Solver (vrp_service.solve_vrp):                              │
│      │  ├─ Create nodes: 0=Depot, 1..N=Customer locations                │
│      │  ├─ Create distance matrix:                                        │
│      │  │  └─ Call OSRM API: POST /route/v1/driving/                    │
│      │  │     {lon1,lat1;lon2,lat2;...}                                  │
│      │  │  └─ If OSRM fails: Use Haversine distance fallback            │
│      │  │                                                                  │
│      │  ├─ Create time matrix:                                            │
│      │  │  └─ time[i][j] = distance[i][j] / avg_speed + service_time[j] │
│      │  │     where service_time = base_time + variable_time             │
│      │  │                                                                  │
│      │  ├─ Setup OR-Tools model:                                         │
│      │  │  ├─ RoutingIndexManager(num_nodes, num_vehicles, depot=0)     │
│      │  │  ├─ RoutingModel(manager)                                      │
│      │  │  ├─ Add 3 dimensions:                                          │
│      │  │  │  ├─ DISTANCE: track cumulative distance (not enforced)     │
│      │  │  │  ├─ CAPACITY: enforce weight ≤ vehicle_capacity * 0.9      │
│      │  │  │  └─ TIME: enforce time windows + soft penalties            │
│      │  │  │                                                              │
│      │  │  ├─ Add transit callbacks:                                     │
│      │  │  │  ├─ distance_callback: returns distance[i][j]             │
│      │  │  │  └─ time_callback: returns time[i][j] + service_time       │
│      │  │  │                                                              │
│      │  │  ├─ Add time windows for each customer:                       │
│      │  │  │  └─ if is_mall: hard constraint [start, end]              │
│      │  │  │  └─ else: soft constraint with 100 point/min penalty      │
│      │  │  │                                                              │
│      │  │  ├─ Add vehicle constraints:                                  │
│      │  │  │  ├─ Start time: depot_start (06:00)                       │
│      │  │  │  └─ End time: 24:00 (or earlier)                          │
│      │  │  │                                                              │
│      │  │  ├─ Add objective: minimize cost (distance + time penalties)  │
│      │  │  ├─ Add disjunctions: 500,000 point penalty for dropped nodes│
│      │  │  │                                                              │
│      │  │  └─ Set search parameters:                                    │
│      │  │     ├─ first_solution: PARALLEL_CHEAPEST_INSERTION           │
│      │  │     ├─ local_search: GUIDED_LOCAL_SEARCH                     │
│      │  │     └─ time_limit: 30 seconds                                │
│      │  │                                                                │
│      │  ├─ Solve: routing.SolveFromAssignmentWithParameters(initial)    │
│      │  │                                                                │
│      │  ├─ Extract solution:                                            │
│      │  │  ├─ For each vehicle i:                                       │
│      │  │  │  ├─ Get route: node_sequence = [0, 5, 12, 8, 0]          │
│      │  │  │  ├─ Convert to orders: ["ORDER-5", "ORDER-12", ...]       │
│      │  │  │  ├─ Calc total weight, distance, time                     │
│      │  │  │  └─ Create TMSRoutePlan + TMSRouteLine records            │
│      │  │  │                                                              │
│      │  │  └─ Get dropped orders:                                       │
│      │  │     └─ Orders where NextVar(node) == node (self-loop)         │
│      │  │                                                                │
│      │  └─ Response: {routes: [...], dropped_orders: [...], stats: {...}}│
│      │                                                                      │
│      └─ Backend: Save routes to DB (background job or sync)              │
│         ├─ Create TMSRoutePlan record (one per vehicle)                  │
│         ├─ Create TMSRouteLine records (one per order stop)              │
│         ├─ Update DeliveryOrder.status = DO_ASSIGNED_TO_ROUTE            │
│         └─ Return confirmation to frontend                               │
│                                                                               │
│  Frontend: Display routes:                                                 │
│      ├─ Show map with optimized stops (polyline)                         │
│      ├─ Show vehicle assignments                                         │
│      ├─ Show dropped orders (if any)                                     │
│      ├─ Show total weight per vehicle                                    │
│      ├─ Show est. completion time                                        │
│      └─ Button: "Confirm & Dispatch Routes"                             │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: DISPATCH & REAL-TIME TRACKING                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Frontend: Route Confirmation                                              │
│      │ Admin reviews optimized routes                                     │
│      ├─ Assign drivers/vehicles (if not auto-assigned)                   │
│      ├─ Adjust stops if needed (manual reordering)                       │
│      └─ Click "Confirm & Dispatch"                                       │
│         └─ POST /api/routes/confirm-routes {route_ids, ...}              │
│            └─ Backend:                                                    │
│               ├─ Set vehicle_id, driver_id, helper_id                   │
│               ├─ Set start_time = now or scheduled time                 │
│               ├─ For each stop: calc est_arrival                        │
│               ├─ Update DeliveryOrder.status = DO_ASSIGNED_TO_ROUTE     │
│               └─ Send notification to driver app                        │
│                                                                               │
│  Real-time Tracking Loop (Continuous):                                     │
│      │ GPS device on truck sends location every 60 seconds              │
│      │                                                                      │
│      ├─ GPS Device → Cloud Webhook:                                     │
│      │  └─ POST /api/tracking/webhook/gps {vehicle_id, lat, lon, ...}  │
│      │                                                                      │
│      ├─ Backend: Webhook Handler                                        │
│      │  ├─ Parse payload: {vehicle_id, lat, lon, speed, timestamp}      │
│      │  ├─ Validate: Check vehicle exists                               │
│      │  ├─ Find active route for vehicle on current date                │
│      │  ├─ Get next delivery order (DO_ASSIGNED_TO_ROUTE)               │
│      │  │                                                                │
│      │  ├─ GEOFENCE LOGIC:                                              │
│      │  │  ├─ Get next customer location (lat, lon)                     │
│      │  │  ├─ Calc distance: haversine(gps_lat/lon, customer_lat/lon)  │
│      │  │  │                                                              │
│      │  │  ├─ IF distance <= 200m AND speed <= 5 km/h:                  │
│      │  │  │  ├─ IF first_time: Set geofence_enter_time = now          │
│      │  │  │  ├─ Increment gps_ping_count++                            │
│      │  │  │  │                                                          │
│      │  │  │  ├─ elapsed_time = now - geofence_enter_time              │
│      │  │  │  ├─ IF elapsed_time >= 30s AND gps_ping_count >= 2:       │
│      │  │  │  │  ├─ ✓ ARRIVAL CONFIRMED (ZAPPED!)                     │
│      │  │  │  │  ├─ Set actual_arrival_time = now                      │
│      │  │  │  │  ├─ Update MasterCustomer.actual_lat/lon (EMA):        │
│      │  │  │  │  │  new_lat = (old_lat * 0.7) + (gps_lat * 0.3)       │
│      │  │  │  │  ├─ Update DeliveryOrder.status = DELIVERED_POD_UPLOADED│
│      │  │  │  │  ├─ (or wait for manual POD confirmation)               │
│      │  │  │  │  └─ Notify driver: "Order arrived"                      │
│      │  │  │  │                                                          │
│      │  │  │  └─ ELSE: Continue waiting (not 30s yet)                  │
│      │  │  │                                                              │
│      │  │  └─ ELSE IF distance > 200m OR speed > 5 km/h:                │
│      │  │     ├─ IF was_in_geofence:                                    │
│      │  │     │  └─ Vehicle exited! Reset: geofence_enter_time = null   │
│      │  │     │     (prevents false arrivals due to red lights)         │
│      │  │     └─ Continue driving                                        │
│      │  │                                                                │
│      │  └─ Save GPS point to tracking history (optional)                │
│      │     └─ For replay/analytics                                       │
│      │                                                                      │
│      └─ Frontend: Update map in real-time                                │
│         ├─ WebSocket or polling every 10s                               │
│         ├─ Show vehicle position (marker)                                │
│         ├─ Show route polyline                                           │
│         ├─ Show next delivery countdown                                  │
│         └─ Show arrival notifications                                    │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: E-POD CAPTURE & VERIFICATION                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Driver App: POD Capture Interface                                         │
│      │ After auto-arrival or manual "Mark Arrived"                       │
│      ├─ Show order details (customer, quantity, address)                │
│      ├─ Take photo: Launch camera → capture image                       │
│      │  └─ POST /api/driver/upload-epod                                 │
│      │     ├─ File: {line_id, photo_binary, ...}                       │
│      │     └─ Backend:                                                   │
│      │        ├─ Save original to temp                                  │
│      │        ├─ Get current GPS location (vehicle_location)            │
│      │        ├─ Get driver name (from User table)                      │
│      │        ├─ Get timestamp (now in ISO format)                      │
│      │        │                                                          │
│      │        ├─ WATERMARK PROCESSING (Pillow):                        │
│      │        │  ├─ Open image: Image.open(photo_binary)               │
│      │        │  ├─ Create overlay text:                               │
│      │        │  │  "Driver: John Smith"                                │
│      │        │  │  "Time: 14:35:22"                                    │
│      │        │  │  "Location: -6.207, 106.479"                        │
│      │        │  │  "Order: ORDER-123456"                              │
│      │        │  ├─ Draw on image (ImageDraw module)                   │
│      │        │  └─ Save to /uploads/epod/{order_id}_{timestamp}.jpg  │
│      │        │                                                          │
│      │        ├─ STRIP EXIF METADATA:                                  │
│      │        │  └─ Remove GPS coordinates from EXIF (privacy)        │
│      │        │                                                          │
│      │        ├─ Create TMSEpodHistory record:                         │
│      │        │  ├─ pod_id = auto-generated                            │
│      │        │  ├─ line_id = from request                             │
│      │        │  ├─ status = POD_UPLOADED                              │
│      │        │  ├─ photo_url = saved path                             │
│      │        │  ├─ gps_location_lat/lon = vehicle GPS                 │
│      │        │  ├─ timestamp = now                                     │
│      │        │  └─ qty_delivered = from request                        │
│      │        │                                                          │
│      │        ├─ Update DeliveryOrder.status = DELIVERED_POD_UPLOADED  │
│      │        └─ Return: {success: true, photo_url: ...}               │
│      │                                                                      │
│      ├─ Capture signature (optional):                                    │
│      │  └─ React Signature Canvas → PNG → embedded in TMSEpodHistory   │
│      │                                                                      │
│      ├─ Confirm quantities:                                             │
│      │  ├─ Qty Delivered: amount customer received                      │
│      │  ├─ Qty Return: amount not delivered (customer rejected)         │
│      │  └─ Qty Damaged: amount damaged during transit                   │
│      │     └─ POST /api/driver/update-epod-quantities                   │
│      │        └─ Update TMSEpodHistory.qty_delivered/return/damaged    │
│      │                                                                      │
│      ├─ Add driver notes:                                               │
│      │  └─ Free-text field (e.g., "Customer unavailable, left at door")│
│      │     └─ Update TMSEpodHistory.driver_notes                        │
│      │                                                                      │
│      └─ Submit POD: Click "Confirm Delivery"                           │
│         └─ POST /api/driver/confirm-delivery                            │
│            └─ Backend: Set status = DELIVERED_POD_UPLOADED              │
│                                                                               │
│  Frontend Admin: POD Verification Dashboard                              │
│      │ Admin POD reviews uploaded PODs                                  │
│      ├─ List all DELIVERED_POD_UPLOADED orders                          │
│      ├─ For each order:                                                 │
│      │  ├─ Show photo (with watermark)                                 │
│      │  ├─ Show quantity breakdown                                      │
│      │  ├─ Show driver notes                                            │
│      │  ├─ Show signature (if captured)                                │
│      │  │                                                                │
│      │  ├─ Decision: Approve or Reject                                 │
│      │  │  ├─ APPROVE:                                                 │
│      │  │  │  └─ PUT /api/orders/{id}/pod/approve                     │
│      │  │  │     └─ Backend:                                           │
│      │  │  │        ├─ Set TMSEpodHistory.status = POD_VERIFIED       │
│      │  │  │        ├─ Set DeliveryOrder.status = DELIVERED_SUCCESS   │
│      │  │  │        └─ Now ready for billing                          │
│      │  │  │                                                            │
│      │  │  └─ REJECT:                                                  │
│      │  │     └─ PUT /api/orders/{id}/pod/reject {reason}             │
│      │  │        └─ Backend:                                           │
│      │  │           ├─ Set TMSEpodHistory.status = POD_REJECTED      │
│      │  │           ├─ Set DeliveryOrder.status = DO_ASSIGNED_TO_ROUTE│
│      │  │           ├─ Append rejection reason to driver_notes        │
│      │  │           └─ Notify driver: "Re-delivery required"          │
│      │  │                                                              │
│      │  └─ Bulk actions: Approve all / Reject all                     │
│      │                                                                      │
│      └─ Export report: POD verification summary                        │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ PHASE 6: FINANCE & BILLING CLOSURE                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Frontend: Finance Dashboard                                              │
│      │ Finance/Kasir reviews daily deliveries                           │
│      ├─ Filter: Approved PODs (status = DELIVERED_SUCCESS)              │
│      ├─ Show: Order list with quantities, locations, times              │
│      │                                                                      │
│      ├─ Cost Calculation Panel:                                         │
│      │  ├─ Select vehicles/routes for billing                          │
│      │  └─ POST /api/finance/calculate-costs {route_ids, ...}          │
│      │     └─ Backend:                                                   │
│      │        ├─ For each route:                                        │
│      │        │  ├─ Get total_km = sum(TMSRouteLine.distance_from_prev) │
│      │        │  ├─ Get total_hours = (end_time - start_time)          │
│      │        │  ├─ Lookup cost coefficients from SystemSettings       │
│      │        │  │                                                       │
│      │        │  ├─ Calc FUEL_COST:                                    │
│      │        │  │  fuel_cost = (total_km / cost_avg_km_per_liter)     │
│      │        │  │            × cost_fuel_per_liter                     │
│      │        │  │                                                       │
│      │        │  ├─ Calc DRIVER_SALARY:                                │
│      │        │  │  driver_salary = cost_driver_salary_per_day         │
│      │        │  │  IF total_hours > 8:                               │
│      │        │  │    overtime_cost = (total_hours - 8)                │
│      │        │  │                  × hourly_overtime_rate             │
│      │        │  │    driver_salary += overtime_cost                   │
│      │        │  │                                                       │
│      │        │  ├─ Calc HELPER_COST (if helper_id not null):         │
│      │        │  │  helper_cost = cost_helper_salary_per_day           │
│      │        │  │                                                       │
│      │        │  └─ TOTAL_COST = fuel + driver + helper + misc         │
│      │        │                                                          │
│      │        ├─ For each order on route:                              │
│      │        │  └─ Calc cost_per_order = total_cost / order_count     │
│      │        │                                                          │
│      │        ├─ Aggregate:                                             │
│      │        │  └─ daily_total_cost = sum(route_costs)                │
│      │        │     orders_today = count(DELIVERED_SUCCESS)             │
│      │        │     cost_per_delivery = daily_total / orders_today     │
│      │        │                                                          │
│      │        └─ Response: {breakdown: {...}, total: 12345000}         │
│      │                     (in currency, e.g., IDR)                    │
│      │                                                                      │
│      ├─ Manual Expense Entry:                                           │
│      │  └─ POST /api/finance/expense                                   │
│      │     ├─ Fields: vehicle_id, driver_id, type, amount, date       │
│      │     ├─ Types: BBM, toll, parking, labor, misc                 │
│      │     └─ Backend: Create OperationalExpense record                 │
│      │                                                                      │
│      ├─ Billing Approval:                                              │
│      │  └─ Batch approve PODs → set status = BILLED                   │
│      │     └─ POST /api/finance/batch-bill                             │
│      │        └─ Backend:                                               │
│      │           ├─ Set TMSEpodHistory.status = BILLED                │
│      │           ├─ Set DeliveryOrder.status = BILLED                 │
│      │           └─ Generate billing document                          │
│      │                                                                      │
│      └─ Export Bill Report:                                            │
│         └─ GET /api/finance/bill-report?date=2026-05-19               │
│            └─ Backend: Generate PDF/Excel with:                        │
│               ├─ Order details                                         │
│               ├─ Cost breakdown                                        │
│               ├─ Driver/vehicle info                                   │
│               ├─ Expense entries                                       │
│               └─ Payment total                                         │
│                                                                               │
│  Database: Billing cycle complete                                         │
│       ├─ All orders = BILLED status                                     │
│       ├─ OperationalExpense records saved                              │
│       └─ Ready for accounting reconciliation                           │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Key Integration Points

### 1. **OSRM API Integration** (Distance Matrix)
```
Frontend: Need route map
    ↓
Backend: VRP needs distance matrix
    ↓
Call OSRM: POST /route/v1/driving/lon1,lat1;lon2,lat2;...
    ↓
Response: {routes: [{distance, duration, geometry}]}
    ↓
Extract distances → Create distance matrix
    ↓
Fallback to Haversine if OSRM fails
```

### 2. **GPS Webhook Integration** (Real-time Tracking)
```
GPS Device: Every 60 seconds
    ↓
POST /api/tracking/webhook/gps {vehicle_id, lat, lon, speed, time}
    ↓
Backend: Async webhook handler
    ↓
Check geofence → EMA update → Status change
    ↓
Database: Update route + customer location
    ↓
Frontend: Pull latest status (polling or WebSocket)
```

### 3. **JWT Authentication Flow**
```
Frontend: Login form
    ↓
POST /api/auth/login {username, password}
    ↓
Backend: Validate credentials (bcrypt hash comparison)
    ↓
Generate JWT token: {user_id, role, exp_time}
    ↓
Response: {access_token, expires_in}
    ↓
Frontend: Store in localStorage + Axios interceptor
    ↓
All subsequent requests: Authorization: Bearer {token}
    ↓
Backend: Validate token → Check role → Process request
```

### 4. **Background Job Scheduling** (APScheduler)
```
Daily at 00:00:
    ├─ Calculate yesterday's KPIs
    ├─ Generate analytics report
    ├─ Archive completed routes
    └─ Send notifications to managers

Every hour:
    ├─ Check pending orders > 2 hours
    ├─ Check driver detention > 60 min
    └─ Send alert emails
```

---

## 📡 Communication Protocols

| Channel | Protocol | Frequency | Use Case |
|---------|----------|-----------|----------|
| **REST API** | HTTP/HTTPS, JSON | On-demand | All frontend-backend communication |
| **GPS Webhook** | HTTP POST, JSON | Every 60s | Vehicle tracking updates |
| **Real-time Updates** | WebSocket (optional) | Realtime | Live map tracking |
| **Email Alerts** | SMTP | Event-based | Manager notifications |
| **File Upload** | Multipart FormData | On-demand | Excel imports, POD photos |
| **OSRM API** | HTTP GET | Per-optimization | Distance matrix requests |

---

## 🛡️ Security Layers

1. **Authentication**: JWT tokens (2-hour expiry) + bcrypt password hashing
2. **Authorization**: Role-based access control (5 roles per endpoint)
3. **Rate Limiting**: SlowAPI (DDoS protection)
4. **Input Validation**: Pydantic models (type checking + constraints)
5. **HTTPS**: All production endpoints (enforced)
6. **Database**: Parameterized queries (SQLAlchemy ORM)
7. **File Upload**: Type validation (Excel/image only) + virus scan (optional)
8. **EXIF Stripping**: Remove GPS from uploaded photos (privacy)
9. **Transaction Rollback**: Database transactions (atomicity)

---

**Last Updated:** May 2026
