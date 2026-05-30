import { api } from '../../../shared/services/apiClient';

// ==========================================
// INTERFACES (Tipe Data)
// ==========================================
export interface RouteStop {
    id: string | number;
    sequence: number;
    customerName: string;
    address: string;
    timeWindow: string;
    weight: string;
    weight_realisasi?: number;
    weight_routing?: number;
    has_realisasi?: boolean;
    status: 'pending' | 'active' | 'completed' | 'failed';
    latitude?: number;
    longitude?: number;
    phone?: string;
}

export interface DriverTripResponse {
    route_id: string;       // diperlukan untuk startTrip/endTrip
    truck_id: string;
    driver_name: string;
    total_stops: number;
    completed_stops: number;
    total_distance: number;
    stops: RouteStop[];
}

// ==========================================
// API ENGINE
// ==========================================
export const driverappService = {
    // Tarik rute tugas supir
    getMyRoute: async (): Promise<DriverTripResponse> => {
        const response = await api.get<DriverTripResponse>('/api/driver/my-route');
        return response.data;
    },

    // Update status (Arrive, Start, etc)
    updateStopStatus: async (stopId: string | number, status: string) => {
        const response = await api.post(`/api/driver/stops/${stopId}/status`, { status });
        return response.data;
    },

    // Kirim bukti foto & tanda tangan
    submitEpod: async (stopId: string | number, formData: FormData) => {
        const response = await api.post(`/api/driver/stops/${stopId}/epod`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // Mulai perjalanan — rekam jam berangkat & KM awal ke backend
    startTrip: async (routeId: string, kmAwal: number) => {
        const response = await api.post('/api/driver/trip/start', {
            route_id: routeId,
            km_awal:  kmAwal,
        });
        return response.data;
    },

    // Selesai perjalanan — rekam jam pulang & KM akhir ke backend
    endTrip: async (routeId: string, kmAkhir: number, gpsLat = 0, gpsLon = 0) => {
        const response = await api.post('/api/driver/trip/end', {
            route_id: routeId,
            km_akhir: kmAkhir,
            gps_lat:  gpsLat,
            gps_lon:  gpsLon,
        });
        return response.data;
    },
};