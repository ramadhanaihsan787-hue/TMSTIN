// src/features/drivers/types/types.ts
// Mirror dari drivers/types.ts — DriverData harus identik biar kompatibel

export type StopStatus = 'completed' | 'active' | 'pending';

export interface RouteStop {
    id: number;
    sequence: number;
    customerName: string;
    timeWindow: string;
    weight: string;
    status: StopStatus;
}

export type DriverStatus = 'On Route' | 'Resting' | 'Offline' | string;

export interface DriverData {
    id: string;
    name: string;
    avatar: string;
    status: DriverStatus;
    score: number;
    ontime: string;
    doSuccess: string;
    truck: string;
    distanceToday: number;
    doCompleted: number;
    doTotal: number;
    lastLocation: string;
    lastUpdate: string;
}