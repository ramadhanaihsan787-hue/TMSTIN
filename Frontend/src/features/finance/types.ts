// src/features/finance/types.ts

export interface ExpenseEntry {
    id?: string;
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
    jamBerangkat?: string;
    jamPulang?:    string;
    kmAwal?:       number;
    kmAkhir?:      number;
}