// src/features/finance/types.ts

export interface ExpenseEntry {
    id?: string;
    time: string;
    date: string;
    plate: string;
    vehicleType: string;
    driver: string;
    isOncall: boolean;
    // FK ke master data — wajib ada agar relasi DB terbentuk
    vehicle_id?: number;
    driver_id?:  number;
    bbm: number;
    tol: number;
    parkir: number;
    parkirLiar: number;
    kuliAngkut: number;
    lainLain: number;
    helperName: string;
    notes: string;
    total: number;
    jamBerangkat?: string;
    jamPulang?:    string;
    kmAwal?:       number;
    kmAkhir?:      number;
}