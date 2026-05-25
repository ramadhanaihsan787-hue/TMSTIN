// src/features/analytics/types.ts

export interface KPISummary {
    // ── Field lama — dipertahankan untuk backward compat ──────────────────
    otifRate: string;       // alias success_rate_percent (format "XX.X%")
    fillRate: string;       // qty terkirim / qty dicoba (format "XX.X%")
    loadFactor: string;     // utilisasi kapasitas truk (format "XX.X%")
    totalShipments: number; // total DO dalam periode
    avgLoadingTime: string; // dipakai untuk total weight (format "XXXX.X KG")

    // ── Field baru — dari backend kpi_calculator ───────────────────────────
    successRate: string;        // success_rate_percent — pengiriman sukses/partial
    returnRate: string;         // qty retur / qty dicoba (format "XX.X%")
    damageRate: string;         // qty rusak / qty dicoba (format "XX.X%")
    totalWeightKg: number;      // total berat dikirim dalam periode (kg)
    activeFleetCount: number;   // jumlah rute aktif dalam periode
    transportCost: number;      // total biaya operasional (Rp)
}

export interface FleetUtilization {
    totalTrucks: number;
    activeTrucks: number;
    utilizationRate: string;
}

export interface DeliveryVolume {
    time: string;
    count: number;
    hour?: string;
    orders?: number;
}

export interface DriverPerformance {
    driver_name: string;
    total_trips: number;
    on_time_rate: number;
    fuel_rating: string;
}