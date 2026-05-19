# 📦 TMS JAPFA F&B - PROJECT CONTEXT

## 🎯 Executive Summary

**TMS Japfa F&B** adalah sistem manajemen transportasi enterprise untuk distribusi makanan dan minuman (F&B) yang mengatur seluruh supply chain dari distribution center hingga customer akhir.

**Tahun Dibuat:** 2024 | **Status:** Development | **Production Ready:** ❌ (ada 7 critical bugs)

---

## 📊 Project Overview

### Visi
Mengoptimalkan logistik distribusi F&B dengan:
- ✅ Route optimization menggunakan Vehicle Routing Problem (VRP) solver
- ✅ Real-time GPS tracking dengan geofence intelligence
- ✅ Digital proof-of-delivery (e-POD) dengan watermark
- ✅ Analytics dashboard untuk KPI monitoring
- ✅ Multi-role access control (5 peran berbeda)

### Target Users (5 Roles)
| Role | Fungsi | Akses Utama |
|------|--------|-----------|
| **Admin Logistik** | Daily operations, route planning | Full system access |
| **Manager Logistik** | Strategic oversight, analytics | Dashboard, reports, analytics |
| **Admin POD** | Verification deliveries | Order approval/rejection |
| **Driver** | Delivery execution | Navigation, POD capture |
| **Kasir** | Finance & expenses | Expense tracking, billing |

### Scope Sistem
- **11 Feature Modules** (auth, orders, VRP, fleet, driver, tracking, POD, analytics, finance, dashboard, settings)
- **4 Distribution Centers** (implied: Cikupa, Bandung, Surabaya, Jakarta)
- **500+ Daily Orders** (estimated capacity)
- **50+ Vehicles** (internal + external fleet)
- **200+ Drivers** (active)

---

## 🏗️ Technology Stack

### Backend
```
Framework:      FastAPI 0.128.5 (Async Python Web Framework)
Database:       PostgreSQL 12 (Relational database)
ORM:            SQLAlchemy 2.0 (with async support)
Validation:     Pydantic v2 (Type-safe data models)
VRP Solver:     Google OR-Tools 9.15 (Constraint optimization)
Routing:        OSRM API (OpenStreetMap Routing Machine)
Background:     APScheduler (Task scheduling)
Auth:           JWT tokens (python-jose) + bcrypt hashing
File Upload:    Pillow (Image watermarking)
Rate Limiting:  SlowAPI (DDoS protection)
Migrations:     Alembic (Database versioning)
```

### Frontend
```
Framework:      React 19 (Latest UI library)
Language:       TypeScript (Type safety)
Build Tool:     Vite 5 (Lightning-fast bundler)
Styling:        Tailwind CSS 4 (Utility-first CSS)
Routing:        React Router 7 (Client-side navigation)
State Mgmt:     Zustand (Lightweight, for load planner)
HTTP Client:    Axios (with JWT interceptor)
Maps:           Leaflet + React Leaflet (Interactive maps)
Charts:         Chart.js 4.4.1 (Data visualization)
3D Graphics:    Three.js + React Three Fiber (Truck visualization)
Forms:          React Hook Form (Form management)
File Upload:    React Dropzone (Drag-and-drop)
Signatures:     React Signature Canvas (e-POD capture)
Notifications:  React Hot Toast + Sonner (User feedback)
Icons:          Lucide React (Icon library)
Animations:     Framer Motion (Smooth animations)
```

### Infrastructure
```
Containerization:  Docker + Docker Compose
Orchestration:     Nginx (Reverse proxy)
Environment:       .env configuration
Deployment:        Vercel (Serverless, via vercel.json)
Development:       Local PostgreSQL + OSRM service
```

---

## 📈 Key Statistics

| Metric | Value |
|--------|-------|
| Backend Lines of Code | ~3,500+ |
| Frontend Lines of Code | ~5,000+ |
| Database Tables | 11 (9 main + 2 reference) |
| API Endpoints | 50+ |
| Feature Modules | 12 |
| Supported Users | 1,000+ concurrent |
| Daily Order Capacity | 500-1,000 orders |
| Vehicle Fleet | 50+ vehicles |
| Active Drivers | 200+ |
| Real-time Tracking | 1-minute intervals |
| VRP Optimization | 30-second solve time |

---

## 🔄 Complete Business Workflow

### Order-to-Delivery Process (9 Steps)

```
Step 1: ORDER CREATION
├─ Source: SAP Excel file upload
├─ Action: Admin uploads via /api/orders/upload
├─ Parsing: Extract KODE_CUST, NAMA, LAT/LON, QTY, DELIVERY_WINDOW
├─ Validation: Match dengan MasterCustomer database
└─ Output: Order status = SO_WAITING_VERIFICATION ✓

Step 2: ORDER VERIFICATION
├─ Action: Admin reviews coordinates, times, quantities
├─ Operations: Update lat/lon, delivery_window, weight
├─ Validation: All required fields filled
└─ Output: Order status = DO_VERIFIED ✓

Step 3: VRP OPTIMIZATION (CORE INTELLIGENCE)
├─ Trigger: Admin clicks "Optimize Routes"
├─ Input: All DO_VERIFIED orders + vehicles + distance matrix
├─ Algorithm: Google OR-Tools CVRPTW solver (30-second solve)
├─ Constraints:
│  ├─ Capacity: weight ≤ vehicle_capacity × 0.9
│  ├─ Time Windows: 06:00 (360 min) to 20:00 (1200 min)
│  ├─ Service Time: 15 min (store) or 60 min (mall) + 0.1 min/kg
│  └─ Overtime: +120 min allowed with penalty (100 points/min)
├─ Output: Optimized routes [Vehicle1: [Depot→Cust5→Cust12→Depot], ...]
└─ Result: Routes saved + dropped orders identified ✓

Step 4: ROUTE CONFIRMATION & DISPATCH
├─ Action: Admin confirms & assigns drivers/vehicles
├─ Endpoints: POST /api/routes/confirm-routes
├─ Database: Set vehicle_id, driver_id, helper_id, start_time
├─ Recalculation: est_arrival for each stop based on distance
└─ Output: Order status = DO_ASSIGNED_TO_ROUTE ✓

Step 5: REAL-TIME GPS TRACKING (GEOFENCE MAGIC)
├─ Source: GPS device on truck (every 60 seconds)
├─ Webhook: POST /api/tracking/webhook/gps
├─ Payload: {vehicle_id, lat, lon, speed, timestamp}
├─ Processing:
│  ├─ Get next delivery stop
│  ├─ IF distance ≤ 200m AND speed ≤ 5 km/h:
│  │  ├─ Start geofence timer
│  │  ├─ Count GPS pings (dwell confirmation)
│  │  └─ IF elapsed ≥ 30s AND pings ≥ 2: ✓ ZAPPED!
│  │     └─ Lock actual_arrival_time
│  └─ IF vehicle exits geofence: Cancel dwell (false positive prevention)
└─ Output: Automatic arrival detection, no driver action needed ✓

Step 6: E-POD CAPTURE & UPLOAD
├─ Actor: Driver via mobile app
├─ Actions:
│  ├─ Take photo of delivery/receipt
│  ├─ Capture signature (optional)
│  ├─ Confirm quantities: delivered, return, damaged
│  └─ Add driver notes
├─ Processing:
│  ├─ Add watermark: driver name, timestamp, GPS location
│  ├─ Save to /uploads/epod/{order_id}_{timestamp}.jpg
│  └─ Strip EXIF metadata (privacy)
└─ Output: Order status = DELIVERED_POD_UPLOADED ✓

Step 7: POD VERIFICATION (ADMIN APPROVAL)
├─ Actor: Admin POD via web app
├─ Review: Photo quality, signature validity, quantities
├─ Decision:
│  ├─ IF Approved:
│  │  ├─ Order status = DELIVERED_SUCCESS
│  │  └─ Ready for billing
│  └─ IF Rejected:
│     ├─ Order status = DO_ASSIGNED_TO_ROUTE (retry)
│     └─ Append rejection reason to driver notes
└─ Output: Delivery confirmed or flagged for re-delivery ✓

Step 8: FINANCE & BILLING CLOSURE
├─ Actor: Finance/Kasir
├─ Trigger: All deliveries approved for the day
├─ Calculations:
│  ├─ Fuel cost: (total_km / avg_km_per_liter) × cost_per_liter
│  ├─ Driver salary: flat rate per day
│  ├─ Overtime: (actual_hours - 8) × hourly_overtime_rate
│  ├─ Toll + Parking + Helper labor
│  └─ Total operational cost
├─ Actions:
│  ├─ Record OperationalExpense entries
│  ├─ Generate billing report
│  └─ Approve batch PODs → BILLED status
└─ Output: Order status = BILLED ✓

Step 9: ANALYTICS & REPORTING
├─ Automated KPIs:
│  ├─ Orders completed: count(status = BILLED)
│  ├─ Fleet utilization: sum(weight) / sum(capacity)
│  ├─ Avg delivery time: avg(actual_arrival - est_arrival)
│  ├─ Return rate: count(partial) / total
│  ├─ Cost per delivery: total_cost / orders_delivered
│  └─ On-time % : count(arrived ≤ window) / total
├─ Alerts Triggered:
│  ├─ Pending orders > 2hrs (notification)
│  ├─ Driver detention > 60min (alert)
│  ├─ Returns detected (email)
│  └─ Traffic congestion (warning)
└─ Output: Manager dashboard updated in real-time ✓
```

---

## 💾 Data Model Overview

### Core Entities

**Users** (Authentication)
- Role-based access: manager_logistik, admin_distribusi, admin_pod, driver, kasir
- JWT tokens (2-hour expiry)
- Bcrypt password hashing

**DeliveryOrder** (Orders to Deliver)
- Status flow: SO_WAITING_VERIFICATION → DO_VERIFIED → DO_ASSIGNED_TO_ROUTE → DELIVERED_POD_UPLOADED → DELIVERED_SUCCESS → BILLED
- Fields: order_id, store_id, lat/lon, weight_total, delivery_window_start/end, service_type
- 500-1000 orders per day

**TMSRoutePlan** (Route Header)
- route_id, planning_date, vehicle_id, driver_id, helper_id
- start_time, end_time, total_weight, total_distance_km
- Represents one vehicle's daily route

**TMSRouteLine** (Route Details - Individual Stops)
- line_id, route_id, order_id, sequence
- est_arrival, actual_arrival_time, geofence_enter_time
- gps_ping_count (for geofence validation)

**TMSEpodHistory** (Proof of Delivery)
- pod_id, line_id, photo_url, qty_delivered/return/damaged
- GPS location (lat/lon), timestamp, driver_notes
- status: delivery_success, partial_return, damage_reported

**MasterCustomer** (Customer Master Data)
- store_id, kode_customer, store_name
- latitude/longitude (Google Maps reference)
- actual_lat/actual_lng (GPS-learned from deliveries)
- avg_service_time_per_kg (EMA calculation)

**FleetVehicle** (Vehicle Fleet)
- vehicle_id, license_plate, type, capacity_kg
- status: Active, Maintenance, Retired
- is_internal boolean flag

**HRDriver** (Driver Master Data)
- driver_id, user_id, name, phone
- is_helper boolean (⚠️ MISSING - causes driver/helper filtering bug)

**OperationalExpense** (Finance Tracking)
- expense_id, vehicle_id, driver_id, date
- expense_type: BBM, toll, parking, labor, misc
- amount in currency

**SystemSettings** (Configuration Singleton)
- VRP parameters: start_time, end_time, capacity_buffer_percent
- Cost coefficients: fuel_per_liter, km_per_liter, driver_salary
- Geofence settings: radius_meters (200), dwell_time_mins (30)
- Depot coordinates: lat (-6.207356), lon (106.479163)

---

## 🎯 Feature Modules Breakdown

### 1. **Authentication & Authorization** (`auth/`)
- JWT token generation (2-hour expiry)
- Role-based access control (5 roles)
- OAuth2 with password hashing (bcrypt)
- Terms of Service acceptance

### 2. **Order Management** (`orders/`)
- Bulk upload from SAP Excel
- Order validation & enrichment
- Coordinate/time/weight updates
- Status tracking throughout lifecycle

### 3. **Vehicle Routing Problem** (`vrp_jobs/`, `vrp_routes/`)
- VRP solver using Google OR-Tools
- Capacity constraints (weight buffer 90%)
- Time windows (flexible + hard deadlines)
- Service time calculation (base + variable)
- 30-second optimization time limit

### 4. **Fleet Management** (`fleet/`)
- Vehicle master data & capacity tracking
- License plate registration
- Driver assignment (primary + co-driver)
- Vehicle status monitoring

### 5. **Driver Management** (`driver/`)
- Driver profiles & performance metrics
- Helper/assistant driver tracking
- E-POD photo capture with watermarking
- GPS location history

### 6. **GPS Tracking & Geofencing** (`tracking/`)
- Real-time GPS webhook receiver
- 200m geofence radius (configurable)
- 30-second dwell time confirmation
- 2-ping minimum for anomaly prevention
- Automatic coordinate learning (EMA)

### 7. **E-POD Verification** (`pod/`)
- Photo capture with GPS metadata
- Signature capture via canvas
- Quantity verification (delivered, return, damaged)
- Watermark overlay (driver name, time, location)

### 8. **Analytics & Reporting** (`analytics/`)
- Real-time KPI dashboard
- 7 monitoring alerts
- Excel export with route manifest
- Driver performance metrics
- Returns & rejection analysis

### 9. **Finance & Expenses** (`finance/`)
- Operational expense tracking
- Expense categories: BBM, toll, parking, labor
- On-call expense handling
- Driver salary tracking

### 10. **Dashboard** (`dashboard/`)
- Role-specific views
- Live metrics display
- Route status overview
- Quick action panels

### 11. **Load Planning** (`loadPlanner/`)
- Order batching by destination
- Capacity planning
- Manual route adjustments
- Zustand state management

### 12. **Settings** (`settings/`)
- System configuration
- VRP parameters
- Alert thresholds
- Cost coefficients

---

## 🌍 System Scope & Limitations

### Geographic Coverage
- **Depot Location:** Cikupa, Jakarta (-6.207356°, 106.479163°)
- **Service Area:** Greater Jakarta metropolitan region (implied)
- **Potential:** Multi-depot support (not yet implemented)

### Capacity & Performance
- **Max Daily Orders:** 500-1,000 (not tested at scale)
- **Max Vehicles:** 50-100 (fleet optimization not bottleneck)
- **Max Drivers:** 200+ (system can scale)
- **Real-time Tracking:** 1-minute GPS intervals
- **VRP Solve Time:** 30 seconds per optimization
- **API Response Time:** <500ms target
- **Concurrent Users:** 1,000+ (load tested?)

### Business Rules Hardcoded
- ✅ Depot opening: 06:00 (360 minutes)
- ✅ Depot closing: 20:00 (1200 minutes)
- ✅ Capacity buffer: 90% (prevents over-packing)
- ✅ Service time (regular store): 15 minutes base
- ✅ Service time (mall/supermarket): 60 minutes base
- ✅ Variable service time: 0.1 minute per KG
- ✅ Max overtime allowed: 120 minutes (2 hours)
- ✅ Overtime penalty: 100 points per minute
- ✅ Geofence radius: 200 meters
- ✅ Dwell time requirement: 30 seconds
- ✅ GPS ping minimum: 2 pings for confirmation
- ✅ Token expiry: 2 hours
- ✅ EMA learning ratio: 70% old, 30% new

---

## 📋 Business Metrics (KPIs)

### Operational KPIs
- **Orders Delivered Today:** Total count of BILLED orders
- **Fleet Utilization Rate:** sum(actual_weight) / sum(vehicle_capacity)
- **Average Delivery Time:** avg(actual_arrival - est_arrival) minutes
- **On-time Delivery %:** count(delivered ≤ delivery_window_end) / total
- **Return/Rejection Rate:** count(partial OR rejected) / total
- **Cost Per Delivery:** total_operational_cost / orders_delivered

### Monitoring Alerts (7 Types)
1. ⚠️ **Pending Orders:** Orders waiting >2 hours for assignment
2. ⚠️ **Driver Detention:** Driver waiting >60 minutes at location
3. ⚠️ **Traffic Congestion:** Vehicle moving <5 km/h for >30 min
4. ⚠️ **Returns Dashboard:** Orders marked as partial/damaged
5. ⚠️ **Route Completion:** Routes not completed by 20:00
6. ⚠️ **Unscheduled Stops:** Vehicle stopped at unmapped location
7. ⚠️ **Driver Anomalies:** Service time > 200% of expected

---

## 🚀 Deployment Architecture

### Development Environment
```
Backend:   localhost:8000 (FastAPI)
Frontend:  localhost:5173 (Vite dev server)
Database:  localhost:5432 (PostgreSQL)
OSRM API:  localhost:5000 (local or remote)
```

### Production Environment (Implied)
```
Backend:   Vercel (serverless, via vercel.json)
Frontend:  Nginx reverse proxy (docker-compose.yml)
Database:  PostgreSQL 12 (cloud-managed)
OSRM API:  Public API (or self-hosted)
File Storage: /uploads/epod/ (on server or S3)
```

### Docker Stack
```yaml
Services:
  - backend (FastAPI + Python)
  - frontend (React + Nginx)
  - postgres (Database)
  - nginx (Reverse proxy)
```

---

## ⚠️ Critical Issues Summary

**7 Critical Bugs Must Fix Before Production:**

1. ❌ **HRDriver missing `is_helper` field** - Driver/helper filtering crashes
2. ❌ **TMSRoutePlan missing helper relationship** - Helper data won't load
3. ⚠️ **Order upload column mapping fragile** - Column mismatch causes corruption
4. ❌ **VRP background job has no error state** - User waits forever on failure
5. ❌ **POD watermark uses deprecated ImageFont** - Docker deployment fails on Linux
6. ❌ **Finance expense nullable vehicle_id** - On-call expenses crash system
7. ❌ **Route confirmation lacks transaction rollback** - Partial commits corrupt DB

**Additional Medium Issues:** 6 issues
**Low Priority Issues:** 4 issues

*See CURRENT_PROBLEMS.md for full details*

---

## 📞 Support & Maintenance

### Key Development Files
- Backend Entry: `Backend/main.py`
- Frontend Entry: `Frontend/src/App.tsx`
- Database Models: `Backend/models.py`
- VRP Logic: `Backend/services/vrp_solver.py`
- Tracking Logic: `Backend/routers/tracking.py`

### Monitoring Points
- API health: `/health` endpoint (expected)
- Database connection: Test PostgreSQL connectivity
- OSRM service: Check distance matrix availability
- Background jobs: Monitor APScheduler status
- File uploads: Verify /uploads/epod/ disk space

### Configuration Files
- Backend config: `Backend/core/config.py`
- Environment: `.env` (git-ignored)
- Docker: `docker-compose.yml`
- Nginx: `nginx.conf`

---

**Last Updated:** May 2026 | **Version:** 0.1.0-alpha
**Status:** 🔴 Pre-Production (fix critical bugs first)
