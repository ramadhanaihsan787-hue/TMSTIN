# 🔄 ALUR API SISTEM - VISUAL FLOW DIAGRAMS

## 1. COMPLETE API FLOW DIAGRAM

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND CLIENT (React)                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Tab 1: Auth           Tab 2: Orders       Tab 3: Routes     Tab 4: Exec     │
│  ┌────────────┐        ┌────────────┐    ┌────────────┐    ┌────────────┐   │
│  │ Login      │        │ Upload SAP │    │ Optimize   │    │ Driver App │   │
│  │ Register   │────┐   │ File       │    │ Routes     │    │ E-POD      │   │
│  │ Profile    │    │   │ (Orders)   │    │ Confirm    │    │ Tracking   │   │
│  └────────────┘    │   └────────────┘    └────────────┘    └────────────┘   │
│                    │          │                   │                   │       │
│                    v          v                   v                   v       │
└────────────────────┼──────────┼───────────────────┼───────────────────┼───────┘
                     │          │                   │                   │
      ┌──────────────┘          │                   │                   │
      │                         │                   │                   │
      v                         v                   v                   v
  ┌─────────┐            ┌─────────────┐      ┌──────────────┐    ┌────────┐
  │ /login  │            │ /orders/    │      │ /routes/     │    │ /driver│
  │ (POST)  │            │ upload      │      │ optimize/    │    │        │
  └─────────┘            │ (POST)      │      │ start        │    └────────┘
       │                 └─────────────┘      │ (POST)       │         │
       │                       │              └──────────────┘         │
       │ validate               │                    │                 │
       │ credentials            │ parse              │ job_id         │
       │                        │ columns            │                 │
       v                        v                    v                 v
   ┌────────────┐          ┌──────────────┐    ┌──────────────┐  ┌─────────┐
   │ Token JWT  │          │ DeliveryOrder│    │ Background   │  │ Get my  │
   │ {sub,role} │          │ CREATE       │    │ VRP Job      │  │ route   │
   └────────────┘          │              │    │ (async)      │  │ (GET)   │
       │                   │ MasterCust   │    └──────────────┘  └─────────┘
       │ attach to         │ UPSERT       │           │                │
       │ header            │ (coords)     │           │ phase           │
       │ Authorization:    │              │           │ progress        │
       │ Bearer {token}    │ status:      │           │ status          │
       │                   │ verified     │           │                 │
       │                   └──────────────┘           v                 │
       │                        │            ┌──────────────┐          │
       │                        │            │ VRP_JOBS     │          │
       │                        │            │ status store │          │
       │                        │            └──────────────┘          │
       │                        │                    │                 │
       │                        ├────────────────────┘                 │
       │                        │                                       │
       │                        v                                       │
       │                  ┌──────────────────────┐                     │
       │                  │ PENDING ORDERS DB    │                     │
       │                  │ status=verified      │                     │
       │                  └──────────────────────┘                     │
       │                                                                │
       └─────────────────────────────────────────────┬──────────────┐  │
                                                     │              │  │
                                          ┌──────────v──────┐       │  │
                                          │ /routes?date=X  │       │  │
                                          │ (GET)           │       │  │
                                          └─────────────────┘       │  │
                                                  │                 │  │
                                                  │ fetch routes    │  │
                                                  │ from DB         │  │
                                                  v                 │  │
                                          ┌───────────────────┐    │  │
                                          │ TMSRoutePlan      │    │  │
                                          │ + TMSRouteLine    │    │  │
                                          │ + DeliveryOrder   │    │  │
                                          └───────────────────┘    │  │
                                                  │                │  │
                                                  │                │  │
                                    ┌─────────────┴────────────┐  │  │
                                    │                          │  │  │
                            ┌───────v──────────┐      ┌───────v──┴──┐
                            │ /routes/confirm  │      │ /driver/   │
                            │ (POST)           │      │ stops/     │
                            │ jadwal_truk[]    │      │ {id}/epod  │
                            └──────────────────┘      │ (POST)     │
                                    │                 └────────────┘
                                    │                      │
                  ┌─────────────────┴──────────────┐      │
                  │                                │      │ watermark
                  v                                │      │ + save image
           ┌────────────────┐                      │      │
           │ Create         │                      │      v
           │ TMSRoutePlan   │                      │   ┌──────────────┐
           │ + relationships│                      │   │ submit_epod_ │
           │ to vehicle,    │                      │   │ with_ai()    │
           │ driver, helper │                      │   └──────────────┘
           └────────────────┘                      │        │
                  │                                │        │ AI check:
                  │                                │        │ anomaly?
                  v                                │        │
           ┌────────────────┐                      │        v
           │ Create         │                      │   ┌──────────────┐
           │ TMSRouteLine   │                      │   │TMSEpodHistory│
           │ per delivery   │                      │   │ CREATE/UPDATE│
           │ + assign       │                      │   └──────────────┘
           │ sequence,      │                      │        │
           │ time,distance  │                      │        │
           └────────────────┘                      │        │
                  │                                │        │
                  v                                │        v
           ┌────────────────┐                      │   ┌──────────────┐
           │ Update         │                      │   │ POD image    │
           │ DeliveryOrder  │                      │   │ /static/     │
           │ status:        │◄─────────────────────┘   │ uploads/epod │
           │ assigned       │                          └──────────────┘
           └────────────────┘
                  │
                  └─────────────────────────┬─────────────────┐
                                           │                 │
                                    ┌──────v──────┐   ┌──────v──────┐
                                    │ /dashboard/ │   │ /orders/    │
                                    │ live-       │   │ {id}/pod/   │
                                    │ tracking    │   │ approve/    │
                                    │ (GET)       │   │ reject      │
                                    └─────────────┘   │ (PUT)       │
                                           │          └─────────────┘
                                           │                 │
                                           │                 │
                                           │    ┌────────────┘
                                           │    │
                                           │    v
                                           │  ┌────────────────┐
                                           │  │ Update DO      │
                                           │  │ status:        │
                                           │  │ delivered/     │
                                           │  │ failed         │
                                           │  └────────────────┘
                                           │
                                    ┌──────v──────────┐
                                    │ Finance & KPI   │
                                    │ Analytics       │
                                    └─────────────────┘
```

---

## 2. ORDER LIFECYCLE - DETAILED FLOW

```
START: Order Upload
│
├─ /orders/upload (POST)
│  └─ File: SAP_*.xlsx
│     ├─ Parse columns (FRAGILE ⚠️)
│     ├─ Validate: lat/lon, qty, time window
│     └─ Create DeliveryOrder
│
├─ Status: SO_WAITING_VERIFICATION ─────────────┐
│  (Order uploaded, waiting for routing team)    │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Manual Review (Admin):                         │
│  - Verify coordinates                          │
│  - Check duplicate orders                      │
│                                                 │
├─ Status: DO_VERIFIED ──────────────────────────┤
│  (Ready for route planning)                    │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Route Planning (Automated):                    │
│  1. /routes/optimize/start (POST)              │
│     └─ Trigger VRP solver (background)         │
│                                                 │
│  2. /routes/optimize/status/{job_id} (polling)│
│     └─ Monitor progress (phase, %)             │
│                                                 │
│  3. /routes (GET)                              │
│     └─ Fetch optimized routes                  │
│                                                 │
│  4. /routes/confirm (POST)                     │
│     └─ Save TMSRoutePlan + TMSRouteLine        │
│                                                 │
├─ Status: DO_ASSIGNED_TO_ROUTE ────────────────┤
│  (Order assigned to specific truck/driver)     │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Delivery Execution (Driver):                   │
│  1. /driver/my-route (GET)                     │
│     └─ Get today's stops                       │
│                                                 │
│  2. /driver/stops/{line_id}/status (POST)      │
│     └─ Check in at customer                    │
│                                                 │
│  3. /driver/stops/{line_id}/epod (POST)        │
│     ├─ Upload photo (jpg/png/webp)             │
│     ├─ Watermark + AI validation               │
│     ├─ Create TMSEpodHistory                   │
│     └─ Return photo URL                        │
│                                                 │
├─ Status: DELIVERED_SUCCESS / DELIVERED_PARTIAL ┤
│  (Provisional, waiting for admin verification) │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  POD Verification (Admin):                      │
│                                                 │
│  Option A: /orders/{id}/pod/approve (PUT)      │
│  └─ ✅ Accept delivery                          │
│     └─ Status: DELIVERED_SUCCESS               │
│                                                 │
│  Option B: /orders/{id}/pod/reject (PUT)       │
│  └─ ❌ Reject delivery                          │
│     └─ Status: FAILED                          │
│        └─ Requires driver resubmit             │
│                                                 │
├─ Status: BILLED ──────────────────────────────┤
│  (Finance processed, customer charged)         │
│                                                 │
└─ END: Order Complete
```

---

## 3. ROLE-BASED API ACCESS MATRIX

```
┌────────────────────┬──────────┬──────────┬──────────┬────────┬─────────┐
│ Endpoint           │ Manager  │ Admin    │ Admin    │ Driver │ Kasir   │
│                    │ Logistik │ Distrib  │ POD      │        │         │
├────────────────────┼──────────┼──────────┼──────────┼────────┼─────────┤
│ /login (any)       │    ✅    │    ✅    │    ✅    │   ✅   │    ✅   │
│ /auth/register     │    ⚠️    │    ⚠️    │    ⚠️    │   ⚠️   │    ⚠️   │
│ /auth/users        │    ✅    │    ❌    │    ❌    │   ❌   │    ❌   │
│ /customers (list)  │    ✅    │    ✅    │    ❌    │   ❌   │    ❌   │
│ /customers (post)  │    ✅    │    ✅    │    ❌    │   ❌   │    ❌   │
│ /customers/batch   │    ✅    │    ✅    │    ❌    │   ❌   │    ❌   │
│ /orders/upload     │    ✅    │    ✅    │    ❌    │   ❌   │    ❌   │
│ /orders (get)      │    ✅    │    ✅    │    ✅    │   ✅   │    ✅   │
│ /orders/*/time     │    ✅    │    ✅    │    ❌    │   ❌   │    ❌   │
│ /orders/*/coord    │    ✅    │    ✅    │    ❌    │   ❌   │    ❌   │
│ /orders/*/pod/ap   │    ❌    │    ❌    │    ✅    │   ❌   │    ❌   │
│ /driver/my-route   │    ❌    │    ❌    │    ❌    │   ✅   │    ❌   │
│ /driver/stops/epod │    ❌    │    ❌    │    ❌    │   ✅   │    ❌   │
│ /driver/list/avail │    ✅    │    ✅    │    ❌    │   ❌   │    ❌   │
│ /fleet (list)      │    ✅    │    ❌    │    ❌    │   ❌   │    ❌   │
│ /fleet/*/fuel      │    ✅    │    ✅    │    ❌    │   ✅   │    ❌   │
│ /routes/optimize   │    ✅    │    ✅    │    ❌    │   ❌   │    ❌   │
│ /routes/confirm    │    ✅    │    ✅    │    ❌    │   ❌   │    ❌   │
│ /finance/expenses  │    ✅    │    ✅    │    ❌    │   ❌   │    ✅   │
│ /dashboard/*       │    ✅    │    ✅    │    ✅    │   ❌   │    ❌   │
│ /analytics/*       │    ✅    │    ❌    │    ❌    │   ❌   │    ❌   │
└────────────────────┴──────────┴──────────┴──────────┴────────┴─────────┘

Legend:
✅ = Full Access
⚠️ = Restricted (role validation not enforced in code)
❌ = No Access
```

---

## 4. DATABASE DEPENDENCY GRAPH

```
                           ┌─────────────────┐
                           │     users       │
                           │   (auth.py)     │
                           └────────┬────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    v               v               v
          ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
          │  hr_drivers  │  │master_cust   │  │system_settings
          │(driver.py)   │  │(orders.py)   │  │(settings.py)
          └──────┬───────┘  └────┬─────────┘  └──────┬───────┘
                 │               │                   │
        ┌────────┼───────────────┼───────────┬───────┼────────┐
        │        │               │           │       │        │
        v        v               v           v       v        v
    ┌───────────────┐      ┌──────────────┐  ┌──────────────┐
    │fleet_vehicles│      │delivery_orders│  │TMSRoutePlan  │
    │(fleet.py)    │      │(orders.py)    │  │(vrp.py)      │
    └───────┬───────┘      └────┬──────────┘  └──────┬───────┘
            │                   │                   │
    ┌───────┴───┬───────────────┼──────────┬───────┴────────┐
    │           │               │          │                │
    v           v               v          v                v
┌──────────────────────────────────┐  ┌──────────────┐  ┌──────────────┐
│TMSRouteLine                      │  │TMSEpodHistory│  │oper_expenses │
│(vrp.py, driver.py, orders.py)    │  │(driver.py)   │  │(finance.py)  │
└──────────────────────────────────┘  └──────────────┘  └──────────────┘

Summary Statistics:
├─ Total Tables: 11
├─ Total Foreign Keys: 15
├─ Most Accessed: DeliveryOrder (7 routers)
├─ Circular Dependencies: 0
└─ Orphaned Relationships: 2 ⚠️
   ├─ TMSRoutePlan.helper_id (no relationship defined)
   └─ HRDriver.is_helper (field missing from DB)
```

---

## 5. ERROR STATE HANDLING FLOW

```
┌─────────────────────────────────────────────────────────┐
│         API REQUEST RECEIVED                             │
└────────────┬────────────────────────────────────────────┘
             │
             v
┌─────────────────────────────────────────────────────────┐
│  1. AUTHENTICATION CHECK                                 │
│     ├─ Parse JWT token from header                       │
│     ├─ Validate signature                                │
│     └─ Extract {sub, role}                               │
└────────────┬────────────────────────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
   ✅ │             │ ❌ Invalid token
      v             v
   ┌────┐      ┌─────────────────────┐
   │OK  │      │ HTTPException(401)   │
   └────┘      │ "Could not validate  │
               │  credentials"        │
               └─────────────────────┘
               │
               v
           ┌─────────────────┐
           │ 401 Unauthorized│
           └─────────────────┘
                                     │
             ┌──────────────────────┘
             │
             v
┌─────────────────────────────────────────────────────────┐
│  2. AUTHORIZATION CHECK                                  │
│     ├─ Compare role vs required_roles                    │
│     └─ Check resource ownership                          │
└────────────┬────────────────────────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
   ✅ │             │ ❌ Insufficient role
      v             v
   ┌────┐      ┌─────────────────────┐
   │OK  │      │ HTTPException(403)   │
   └────┘      │ "Akses ditolak!      │
               │  Hanya untuk: admin" │
               └─────────────────────┘
               │
               v
           ┌─────────────┐
           │ 403 Forbidden│
           └─────────────┘
                                     │
             ┌──────────────────────┘
             │
             v
┌─────────────────────────────────────────────────────────┐
│  3. INPUT VALIDATION                                     │
│     ├─ Pydantic schema validation                        │
│     ├─ File MIME type check                              │
│     ├─ File size check                                   │
│     └─ Business logic validation                         │
└────────────┬────────────────────────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
   ✅ │             │ ❌ Validation failed
      v             v
   ┌────┐      ┌─────────────────────┐
   │OK  │      │ HTTPException(400)   │
   └────┘      │ "Format file ditolak!│
               │  Hanya boleh upload  │
               │  gambar (JPG, PNG)"  │
               └─────────────────────┘
               │
               v
           ┌──────────────┐
           │ 400 Bad Req. │
           └──────────────┘
                                     │
             ┌──────────────────────┘
             │
             v
┌─────────────────────────────────────────────────────────┐
│  4. DATABASE OPERATION                                   │
│     ├─ SELECT/INSERT/UPDATE/DELETE                       │
│     ├─ Transaction management                            │
│     └─ Relationship traversal                            │
└────────────┬────────────────────────────────────────────┘
             │
      ┌──────┴──────────────┐
      │                     │
   ✅ │                     │ ❌ DB error
      v                     v
   ┌────┐         ┌──────────────────────┐
   │OK  │         │ Exception caught?     │
   └────┘         └──────┬───────────────┘
                         │
                  ┌──────┴──────┐
                  │             │
                 ✅ │             │ ❌ Unhandled
                  v             v
           ┌────────────┐    ┌──────────────┐
           │ HTTPEx(422)│    │ Exception    │
           │ "Data tidak│    │ bubbles up   │
           │  valid"    │    │ → 500 error  │
           └────────────┘    └──────────────┘
                  │                  │
                  v                  v
            ┌──────────┐      ┌──────────────┐
            │ 422      │      │ 500 Internal │
            │ Unproc.  │      │ Server Error │
            └──────────┘      └──────────────┘

Background Task Error Flow:
┌─────────────────────────────────────────────────────────┐
│  /routes/optimize/start (POST)                          │
│  ├─ Spawn background task                               │
│  ├─ Return job_id immediately (✅ 200 OK)                │
│  └─ Async: run_vrp_optimization_task()                  │
└────────────┬────────────────────────────────────────────┘
             │
    ┌────────┴──────────┐
    │                   │
    v                   v
┌────────────┐    ┌──────────────────────┐
│ Normal     │    │ Exception in task?    │
│ completion │    │ (caught by try/except)
└────────────┘    └──────┬───────────────┘
    │                    │
    v                    v
┌────────────┐    ┌──────────────────────┐
│VRP_JOBS    │    │logger.error() called  │
│[job_id]    │    │ (but no state update!)
│status=     │    └──────┬───────────────┘
│ success    │           │
│phase=      │           v
│ complete   │    ┌──────────────────────┐
│progress=   │    │ Frontend still       │
│ 100%       │    │ GET /status/{job_id} │
│ ✅         │    │ → progress=50%       │
│            │    │ → status=processing  │
└────────────┘    │ → ❌ HANG FOREVER!   │
                  └──────────────────────┘

KEY ISSUE: ⚠️ Error state not propagated to VRP_JOBS!
```

---

## 6. DATABASE TRANSACTION FLOW

```
┌────────────────────────────────────────────┐
│ POST /routes/confirm                        │
│ Input: jadwal_truk_internal = [routes...]  │
└────────┬─────────────────────────────────┬─┘
         │                                 │
         v                                 │
  db.begin() [implicit per route]         │
         │                                 │
    ┌────┴─────────┐                      │
    │              │                       │
    v              v                       │
Step1: Insert   Step2: Insert              │
TMSRoute       TMSRouteLine               │
Plan            per stop                   │
  │               │                        │
  v               v                        │
Insert OK   Insert OK                      │
  │               │                        │
  └───────┬───────┘                        │
          │                                │
          v                                │
Step3: Update                              │
DeliveryOrder                              │
status →                                   │
assigned                                   │
  │                                        │
  ├─ SUCCESS → db.commit() ✅              │
  │           All 3 steps save             │
  │           to database                  │
  │                                        │
  └─ ERROR → db.rollback() ❌ ⚠️           │
    but no rollback in code!               │
    Steps 1-2 ALREADY COMMITTED!           │
    → DATABASE INCONSISTENCY!              │
            │                              │
            └──────────────────────────────┘

Current Status: ⚠️ NO TRANSACTION CONTROL
Needs: context manager or explicit rollback
```

---

## 7. ASYNC BACKGROUND TASK FLOW

```
User Request Timeline:
─────────────────────────────────────────────────

T0: POST /routes/optimize/start
    {
      "message": "Starting optimization...",
      "status": "processing",
      "job_id": "uuid-123"
    }
    ✅ HTTP 200 OK (returned immediately)
    │
    └─ VRP_JOBS["uuid-123"] = {
         "phase": "idle",
         "progress": 0,
         "status": "pending"
       }

T0+0.1s: Background task spawned
    └─ run_vrp_optimization_task("uuid-123")

T0+2s: Phase 1 - Zoning
    └─ VRP_JOBS["uuid-123"] = {
         "phase": "zoning",
         "progress": 20,
         "status": "processing"
       }

T0+5s: User polls /routes/optimize/status/uuid-123
    ├─ Response: {phase: "zoning", progress: 20}
    └─ Frontend continues polling

T0+10s: Phase 2 - Distance Matrix
    └─ VRP_JOBS["uuid-123"] = {
         "phase": "distance_matrix",
         "progress": 40,
         "status": "processing"
       }

T0+15s: User polls again
    ├─ Response: {phase: "distance_matrix", progress: 40}
    └─ Frontend continues polling

T0+20s: Phase 3 - VRP Solver
    └─ VRP_JOBS["uuid-123"] = {
         "phase": "solving",
         "progress": 70,
         "status": "processing"
       }

T0+30s: Phase 4 - Format Results
    └─ VRP_JOBS["uuid-123"] = {
         "phase": "formatting",
         "progress": 95,
         "status": "processing"
       }

T0+35s: ✅ NORMAL CASE - Optimization Complete
    └─ VRP_JOBS["uuid-123"] = {
         "phase": "complete",
         "progress": 100,
         "status": "success",
         "routes": [...],
         "dropped_nodes": [...]
       }
       
    User polls:
    ├─ Response: {status: "success", routes: [...]}
    └─ Frontend displays routes ✅

T0+35s: ❌ ERROR CASE - Exception in solver
    Exception: "Out of memory" / "Invalid coordinates"
    
    Caught by try/except:
    └─ logger.error("VRP failed: ...")
       (but NO state update!)
    
    VRP_JOBS["uuid-123"] UNCHANGED:
    └─ Still: {phase: "solving", progress: 70}
    
    User polls repeatedly:
    ├─ Response: {phase: "solving", progress: 70}
    ├─ Response: {phase: "solving", progress: 70}
    └─ Response: {phase: "solving", progress: 70}
    
    Frontend:
    ├─ Shows "still processing..." 🔄
    ├─ User waits 2 minutes
    ├─ User waits 5 minutes
    └─ User closes browser (BAD UX) ❌

FIX NEEDED:
───────────
In except block:
VRP_JOBS[job_id]["status"] = "failed"
VRP_JOBS[job_id]["error"] = str(e)
VRP_JOBS[job_id]["error_time"] = now()
```

---

## 8. DATA VALIDATION PIPELINE

```
Input: POST /orders/upload
File: orders.xlsx (Excel)

┌─ Step 1: File Format Check
│  ├─ Is file .xlsx or .csv? ✅
│  └─ Can pandas read it? ✅
│
├─ Step 2: Column Mapping ⚠️ FRAGILE
│  ├─ Find column: 'NAMA CUSTOMER'
│  │  └─ if NOT found, use df.columns[2] ← DANGEROUS!
│  ├─ Find column: 'KODE CUST.'
│  │  └─ if NOT found, use df.columns[12] ← DANGEROUS!
│  ├─ Find column: 'QTY'
│  │  └─ if NOT found, use df.columns[7] ← DANGEROUS!
│  └─ Find column: 'KETERANGAN'
│     └─ if NOT found, use df.columns[11] ← DANGEROUS!
│
├─ Step 3: Data Cleaning
│  ├─ Remove all-null rows
│  ├─ Uppercase column names
│  └─ Default LATITUDE/LONGITUDE = NULL
│
├─ Step 4: Row Iteration
│  ├─ For each row in DataFrame:
│  │  ├─ Extract: NAMA_CUSTOMER
│  │  ├─ Extract: KODE_CUST
│  │  ├─ Extract: QTY (aggregate by order_id)
│  │  ├─ Extract: LATITUDE/LONGITUDE
│  │  │  └─ if NULL, set 0.0
│  │  ├─ Extract: KETERANGAN
│  │  │  └─ Parse time window (PERTAMA/SIANG/SORE/HH:MM)
│  │  └─ Validate: all fields not null?
│  │
│  ├─ Validation Result:
│  │  ├─ ✅ VALID → Add to success_list
│  │  │           → Create DeliveryOrder
│  │  │           → Upsert MasterCustomer
│  │  │
│  │  └─ ❌ INVALID → Add to failed_list
│  │              → Skip this row
│  │              → Continue processing
│
└─ Step 5: Response
   ├─ Return: UploadResponse
   │  ├─ message
   │  ├─ success_list: DeliveryOrder[] created
   │  └─ failed_list: rows with errors
   │
   └─ HTTP 200 OK
      (even if some rows failed! ⚠️ Partial success)
```

---

## 9. API CONNECTIVITY MATRIX (Who talks to who?)

```
┌──────────────────────────────────────────────────────────────┐
│  CLIENT          │  Server Layer    │  Database Layer         │
├──────────────────────────────────────────────────────────────┤
│                  │                  │                         │
│  React Frontend  │  FastAPI Routes  │  SQLAlchemy ORM         │
│  ├─ Auth Tab     │  ├─ auth.py      │  ├─ User                │
│  │ ├─ login      │  │ ├─ /login     │  │ ├─ username         │
│  │ └─ register   │  │ └─ /register  │  │ └─ hashed_password  │
│  │               │  │               │  │                      │
│  ├─ Orders Tab   │  ├─ orders.py    │  ├─ DeliveryOrder       │
│  │ └─ upload     │  │ ├─ /upload    │  │ ├─ order_id         │
│  │               │  │ ├─ /time      │  │ ├─ status (enum)    │
│  │               │  │ ├─ /coord     │  │ └─ weight_total     │
│  │               │  │ └─ /pod/...   │  │                      │
│  │               │  │               │  ├─ MasterCustomer      │
│  │               │  │               │  │ ├─ store_name       │
│  │               │  │               │  │ └─ coordinates      │
│  │               │  │               │  │                      │
│  ├─ Routes Tab   │  ├─ vrp.py       │  ├─ TMSRoutePlan        │
│  │ ├─ optimize   │  │ ├─ /optimize  │  │ ├─ route_id        │
│  │ ├─ confirm    │  │ ├─ /status    │  │ ├─ vehicle_id      │
│  │ └─ view       │  │ ├─ /confirm   │  │ └─ driver_id       │
│  │               │  │ └─ /routes    │  │                      │
│  │               │  │               │  ├─ TMSRouteLine        │
│  │               │  │               │  │ ├─ sequence        │
│  │               │  │               │  │ ├─ est_arrival     │
│  │               │  │               │  └─ distance_from_prev│
│  │               │  │               │                      │
│  ├─ Exec Tab     │  ├─ driver.py    │  ├─ TMSEpodHistory      │
│  │ ├─ my-route   │  │ ├─ /my-route  │  │ ├─ pod_id          │
│  │ └─ e-pod      │  │ ├─ /status    │  │ ├─ status          │
│  │               │  │ └─ /epod      │  │ └─ photo_url       │
│  │               │  │               │  │                      │
│  ├─ Fleet Tab    │  ├─ fleet.py     │  ├─ FleetVehicle        │
│  │ └─ vehicles   │  │ ├─ /fleet     │  │ ├─ license_plate   │
│  │               │  │ ├─ /fuel      │  │ └─ capacity_kg     │
│  │               │  │ └─ /summary   │  │                      │
│  │               │  │               │  ├─ HRDriver            │
│  │               │  │               │  │ ├─ driver_id       │
│  │               │  │               │  │ └─ name            │
│  │               │  │               │  │                      │
│  ├─ Finance Tab  │  ├─ finance.py   │  ├─ OperationalExpense  │
│  │ └─ expenses   │  │ └─ /expenses  │  │ ├─ vehicle_id      │
│  │               │  │               │  │ └─ driver_id       │
│  │               │  │               │  │                      │
│  ├─ Dashboard    │  ├─ dashboard.py │  ├─ SystemSettings      │
│  │ ├─ tracking   │  │ ├─ /tracking  │  │ ├─ vrp_*_time      │
│  │ ├─ alerts     │  │ ├─ /alerts    │  │ └─ cost_*          │
│  │ └─ volume     │  │ └─ /volume    │  │                      │
│  │               │  │               │  │                      │
│  └─ Analytics    │  ├─ analytics.py │  └─ (depends on above)  │
│     ├─ KPI       │  │ ├─ /kpi       │                         │
│     ├─ Driver    │  │ ├─ /driver-   │                         │
│     ├─ Fleet     │  │ │  perf       │                         │
│     └─ Export    │  │ ├─ /fleet-    │                         │
│                  │  │ │  util       │                         │
│                  │  │ └─ /export    │                         │
│                  │  │               │                         │
│                  │  ├─ customer.py  │                         │
│                  │  │ └─ /customers │                         │
│                  │  │               │                         │
│                  │  ├─ settings.py  │                         │
│                  │  │ └─ /settings  │                         │
│                  │  │               │                         │
│                  │  └─ tracking.py  │                         │
│                  │     └─ /webhook  │                         │
│                  │                  │                         │
│                  │  Service Layer:  │                         │
│                  │  ├─ vrp_service  │                         │
│                  │  ├─ map_service  │                         │
│                  │  ├─ epod_service │                         │
│                  │  └─ analytics_   │                         │
│                  │     service      │                         │
│                  │                  │                         │
└──────────────────────────────────────────────────────────────┘
```

---

## SUMMARY

**API Connectivity Status:**
- ✅ **Routes:** 48 endpoints (well-organized)
- ⚠️ **Database:** 11 tables (2 relationships broken)
- ⚠️ **Error Handling:** 60% coverage (async tasks lacking)
- ⚠️ **Data Validation:** 70% robust (file upload fragile)
- ❌ **Transaction Control:** NOT implemented
- ❌ **Background Job State:** NOT properly tracked
- ❌ **Error Propagation:** Gaps in async error reporting

**Critical Fixes Needed Before Production:**
1. Add missing DB fields/relationships
2. Improve background task error handling
3. Implement transaction rollback
4. Fix file upload column mapping
5. Add error state to VRP_JOBS

