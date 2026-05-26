// src/features/fleet/services/fleetService.ts
import { api } from "../../../shared/services/apiClient"; // Sesuaikan path-nya

export const fleetService = {
    // 🌟 NARIK DAFTAR ARMADA
    getFleetList: async () => {
        const res = await api.get('/api/fleet');
        return res.data;
    },

    // 🌟 DIGITAL TWIN: NARIK SUHU & GPS (Tadi ini yang kurang)
    getTelematics: async (licensePlate: string) => {
        const res = await api.get(`/api/fleet/telematics/${licensePlate}`);
        return res.data;
    },

    // FITUR ASSIGN DRIVER
    assignDriver: async (vehicleId: string | number, driverId: string) => {
        const res = await api.post(`/api/fleet/${vehicleId}/assign`, { driver_id: driverId });
        return res.data;
    },

    // LAPORAN KERUSAKAN
    reportMaintenance: async (vehicleId: string | number, issue: string) => {
        const res = await api.post(`/api/fleet/${vehicleId}/maintenance`, { issue });
        return res.data;
    },

    // TAMBAH TRUK ON-CALL (langsung daftarkan ke master armada)
    addOncallTruck: async (data: {
        plate_number: string;
        vehicle_type: string;
        capacity_kg: number;
    }) => {
        const res = await api.post('/api/fleet/oncall', data);
        return res.data;
    },

    // UPDATE STATUS TRUK
    updateStatus: async (vehicleId: string | number, status: string) => {
        const res = await api.put(`/api/fleet/${vehicleId}/status`, { status });
        return res.data;
    },

    // INPUT BENSIN
    addFuelLog: async (vehicleId: string | number, data: any) => {
        const res = await api.post(`/api/fleet/${vehicleId}/fuel`, data);
        return res.data;
    }
};