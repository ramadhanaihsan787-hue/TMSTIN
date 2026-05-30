export type StopStatus = 'completed' | 'active' | 'pending';

export interface RouteStop {
    id: number;
    sequence: number;
    customerName: string;
    timeWindow: string;
    weight: string;
    weight_realisasi?: number;
    weight_routing?: number;
    has_realisasi?: boolean;
    status: StopStatus;
}