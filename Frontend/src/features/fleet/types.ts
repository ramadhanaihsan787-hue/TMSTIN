// src/features/fleet/types.ts

export type FleetStatus = 'Available' | 'Maintenance' | 'On Trip' | string;

export interface FleetVehicle {
    id: string | number;
    licensePlate: string;
    model: string;
    currentKm: number;
    status: FleetStatus;
    // 🌟 Rich details from premium fleet monitor mockup
    driverName?: string;
    routeName?: string;
    cargoType?: string;
    eta?: string;
    speedKmH?: number;
    batteryPct?: number;
    currentTemp?: number;
    setPointTemp?: number;
    tempStatus?: 'Healthy' | 'Warning' | 'Critical';
    sparklineData?: number[];
    latitude?: number;
    longitude?: number;
    // 🌟 Buat jaga-jaga kalo backend ngirim data ekstra
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
}