// src/features/routes/types.ts

// ================= CORE DOMAIN =================

export interface RouteProduct {
  name: string;
  quantity: number;
}

export interface RouteDetail {
  sequence: number;
  storeName: string;
  latitude: number;
  longitude: number;
  weightKg: number;
  arrivalTime: string;
  distanceFromPrevKm: number;
  items: RouteProduct[];
}

export type RouteStatus = "draft" | "optimized" | "confirmed";

export interface RouteItem {
  routeId: string;
  date: string;
  driverName: string;
  vehicle: string;
  vehicleType: string;
  destinationCount: number;
  totalWeight: number;
  totalDistanceKm: number;
  status: RouteStatus;
  zone: string;
  details: RouteDetail[];
  // geometry: garis rute asli OSRM dalam format [lon, lat][] (Mapbox native)
  // Diisi dari garis_aspal backend. polyline dipertahankan untuk backward compat.
  geometry?: [number, number][];
  polyline?: [number, number][];
}

// ================= UPLOAD =================

export interface UploadResult {
  orderId?: string;
  customerCode?: string;
  storeName: string;
  weight?: number;
  coordinates?: string;
  reason?: string;
  items?: RouteProduct[];
  maxTime?: string;
}

// ================= DROPPED =================
export interface DroppedNode {
  storeName?: string;
  nama_toko?: string; 
  weightKg?: number;
  berat_kg?: number; 
  reason?: string;
  alasan?: string;
  lat?: number;
  lon?: number;
}
// ================= SPRINT 3 & 4 (TRAFFIC & ZONING) =================

export type ValidationPhase = 'idle' | 'zoning' | 'routing' | 'validating' | 'done';

export interface SpatialZoneStore {
  nama_toko: string;
  lat: number;
  lon: number;
  berat: number;
}

export interface SpatialPreview {
  zone_id: number;
  stores: SpatialZoneStore[];
  bounding_polygon: [number, number][];
}

export interface TrafficWarning {
  stop_order: number;
  store_name: string;
  planned_eta: string;
  real_eta_traffic: string;
  delay_minutes: number;
  severity: 'HIGH' | 'LOW';
  truck_id: string;
  armada: string;
}