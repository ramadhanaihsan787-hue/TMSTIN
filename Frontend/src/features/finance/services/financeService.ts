// src/features/finance/services/financeService.ts
import { api } from '../../../shared/services/apiClient';
import type { ExpenseEntry } from '../types';

export const financeService = {
    // 🌟 SUNTIKAN BARU: Tarik Master Data Truk & Driver
    getMasterData: async () => {
        const res = await api.get('/api/finance/master-data').catch(() => ({ data: { data: { fleets: [], drivers: [] } } }));
        const fleets = res.data?.data?.fleets || [];
        const drivers = res.data?.data?.drivers || [];
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