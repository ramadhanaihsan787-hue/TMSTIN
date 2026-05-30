export type StopStatus = 'completed' | 'active' | 'pending';

export interface StopItem {
    nama_barang: string;
    qty: string;
}

export interface RouteStop {
    id: number | string;
    sequence: number;
    customerName: string;
    address?: string;
    timeWindow: string;
    weight: string;
    weight_realisasi?: number;
    weight_routing?: number;
    has_realisasi?: boolean;
    status: StopStatus;
    latitude?: number;
    longitude?: number;
    items?: StopItem[];
}