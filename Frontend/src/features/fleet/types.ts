// src/features/fleet/types.ts

export type FleetStatus = 'Available' | 'Maintenance' | 'On Trip' | 'Idle' | string;

export interface FleetVehicle {
    id: string | number;
    licensePlate: string;
    model: string;
    currentKm: number;
    status: FleetStatus;
    capacity?: number;
    currentLoad?: number;
    loadPercent?: number;
    isInternal?: boolean;
    isOncall?: boolean;

    // Crew hari ini (dari dispatch)
    driverName?: string;
    helperName?: string;
    routeIdToday?: string;
    totalStopsToday?: number;
    etaLast?: string;

    // Telematics (dari vendor / simulasi)
    speedKmH?: number;
    batteryPct?: number;
    currentTemp?: number;
    setPointTemp?: number;
    tempStatus?: 'Healthy' | 'Warning' | 'Critical';
    sparklineData?: number[];
    latitude?: number;
    longitude?: number;

    // Fuel info
    lastFuelDate?: string;
    lastFuelCost?: string;
    fuelEfficiency?: number;

    raw?: any;
}

export interface FuelLogEntry {
    id: string;
    date: string;
    volumeLiters: number;
    station: string;
    cost: number;
}

export interface TelematicsData {
    temperature: number;
    isTempWarning: boolean;
    compressorStatus: 'ON' | 'OFF';
    gpsSignal: 'STRONG' | 'WEAK' | 'LOST';
    doorLocked: boolean;
    lastUpdate?: string;
}