// src/features/finance/services/financeService.ts
import { api } from '../../../shared/services/apiClient';
import type { ExpenseEntry } from '../types';

export const financeService = {
    // 🌟 SUNTIKAN BARU: Tarik Master Data Truk & Driver
    getMasterData: async () => {
        // Pakai endpoint /api/finance/master-data yang return {id, plate, type}
        // sehingga vehicle_id dan driver_id tersedia di state (fix BUG #1)
        const res = await api.get('/api/finance/master-data')
            .catch(() => ({ data: { data: { fleets: [], drivers: [] } } }));

        const raw = res.data?.data || res.data || {};

        const fleets = (raw.fleets || []).map((v: any) => ({
            id:    v.id   ?? v.vehicle_id,
            plate: v.plate ?? v.license_plate,
            type:  v.type  ?? v.vehicle_type ?? 'CDD',
        }));

        const drivers = (raw.drivers || []).map((d: any) => ({
            id:   d.id   ?? d.driver_id,
            name: d.name ?? d.driver_name ?? '',
        }));

        return { fleets, drivers };
    },

    getTodayExpenses: async () => {
        // 🌟 FIX CTO: Tambah /api/
        const res = await api.get('/api/finance/expenses/today');
        return res.data.data;
    },

    getExpenseHistory: async (startDate: string, endDate: string) => {
        // 🌟 FIX CTO: Tambah /api/
        const res = await api.get('/api/finance/expenses', { 
            params: { start_date: startDate, end_date: endDate } 
        });
        return res.data.data;
    },

    saveExpense: async (payload: ExpenseEntry) => {
        if (payload.id) {
            // 🌟 FIX CTO: Tambah /api/
            const res = await api.put(`/api/finance/expenses/${payload.id}`, payload);
            return res.data;
        } else {
            // 🌟 FIX CTO: Tambah /api/
            const res = await api.post('/api/finance/expenses', payload);
            return res.data;
        }
    },

    deleteExpense: async (id: string) => {
        // 🌟 FIX CTO: Tambah /api/
        const res = await api.delete(`/api/finance/expenses/${id}`);
        return res.data;
    }
};