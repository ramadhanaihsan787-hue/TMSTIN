// src/features/finance/types.ts

export interface ExpenseEntry {
    id?: string;
    vehicle_id?: number | null;
    driver_id?: number | null;
    time: string;
    date: string;
    plate: string;
    vehicleType: string;
    driver: string;
    isOncall: boolean;
    bbm: number;
    tol: number;
    parkir: number;
    parkirLiar: number;
    kuliAngkut: number;
    lainLain: number;
    helperName: string;
    notes: string;
    total: number;
}