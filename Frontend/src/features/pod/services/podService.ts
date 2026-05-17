import { api } from '../../../shared/services/apiClient';

// ==========================================
// TYPES
// ==========================================
export interface PodOrderItem {
    nama_barang: string;
    qty: string;
}

export interface PodRecord {
    order_id: string;
    customer_name: string;
    customer_address: string;
    driver_name: string;
    driver_phone: string;
    vehicle_plate: string;
    vehicle_type: string;
    photo_url: string;
    gps_lat: number | null;
    gps_lon: number | null;
    qty_delivered: number;
    qty_return: number;
    qty_damaged: number;
    return_reason: string;
    driver_notes: string;
    timestamp: string;
    items: PodOrderItem[];
    status?: string; // Hanya ada di riwayat/history
}

export interface PodVerificationsResponse {
    status: string;
    total: number;
    data: PodRecord[];
}

export interface PodHistoryResponse {
    status: string;
    total: number;
    data: PodRecord[];
}

export interface PodActionResponse {
    status: string;
    message: string;
    order_id: string;
    new_status: string;
}

// ==========================================
// API SERVICE
// ==========================================
export const podService = {
    // 🌟 1. Ambil antrian verifikasi e-POD yang masuk dari supir
    getPodVerifications: async (): Promise<PodVerificationsResponse> => {
        const response = await api.get<PodVerificationsResponse>('/api/pod/verifications');
        return response.data;
    },

    // 🌟 2. Ambil riwayat / arsip dokumen e-POD yang sudah diproses
    getPodHistory: async (statusFilter?: string, search?: string): Promise<PodHistoryResponse> => {
        const response = await api.get<PodHistoryResponse>('/api/pod/history', {
            params: { 
                status: statusFilter,
                search: search 
            }
        });
        return response.data;
    },

    // 🌟 3. Setujui POD (Verifikasi Cocok)
    approvePod: async (orderId: string, notes?: string): Promise<PodActionResponse> => {
        const response = await api.put<PodActionResponse>(`/api/orders/${orderId}/pod/approve`, {
            notes: notes || ""
        });
        return response.data;
    },
    
    // 🌟 4. Tolak POD (Verifikasi Manual / Gagal Cocok)
    rejectPod: async (orderId: string, reason: string, notes?: string): Promise<PodActionResponse> => {
        const response = await api.put<PodActionResponse>(`/api/orders/${orderId}/pod/reject`, {
            reason,
            notes: notes || ""
        });
        return response.data;
    }
};