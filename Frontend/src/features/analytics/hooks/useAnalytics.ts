// src/features/analytics/hooks/useAnalytics.ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner'; // 🌟 SUNTIKAN SONNER!
import { analyticsService } from '../services/analyticsService';
import type { KPISummary, FleetUtilization, DeliveryVolume, DriverPerformance } from '../types';

export const useAnalytics = () => {
    // 🌟 STATE RENTANG TANGGAL
    const [startDate, setStartDate] = useState(() => {
        const today = new Date();
        const lastMonth = new Date(today);
        lastMonth.setDate(today.getDate() - 30);
        return lastMonth.toISOString().split('T')[0];
    });
    
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    // 🌟 STATE DATA (Bersih & Terkontrol)
    const [kpiData, setKpiData] = useState<KPISummary | undefined>();
    const [fleetData, setFleetData] = useState<FleetUtilization | undefined>();
    const [volumeData, setVolumeData] = useState<DeliveryVolume[]>([]);
    const [maxVolume, setMaxVolume] = useState<number>(1);
    const [driverData, setDriverData] = useState<DriverPerformance[]>([]);
    
    // 🌟 SATU LOADING UNTUK SEMUA
    const [loading, setLoading] = useState(false);

    // 🌟 ENGINE PENARIK DATA
    const fetchAllData = useCallback(async () => {
        if (!startDate || !endDate) return;

        if (new Date(startDate) > new Date(endDate)) {
            toast.error("Tanggal Mulai tidak boleh lebih besar dari Tanggal Akhir Bos!");
            return;
        }

        setLoading(true);
        try {
            const data = await analyticsService.fetchAnalyticsData(startDate, endDate);
            
            // ── Transform KPI summary ──────────────────────────────────────────
            // Backend /api/analytics/kpi-summary mengembalikan structure:
            // {
            //   status, success_rate_percent, load_factor_percent,
            //   total_weight_kg, active_fleet_count,
            //   data: { transportCost, fillRate, returnRate, damageRate },
            //   today_*, completed_*, in_transit_*
            // }
            //
            // Sebelumnya: setKpiData(data.summary?.data) — hanya ambil nested
            // .data sehingga totalShipments, loadFactor, dll selalu undefined.
            // Sekarang: flatten semua field yang dibutuhkan KPICards.
            const s = data.summary;
            const fmt = (n: number | undefined) => `${(n ?? 0).toFixed(1)}%`;
            setKpiData({
                // Field baru — data aktual dari backend
                successRate:      fmt(s?.success_rate_percent),
                loadFactor:       fmt(s?.load_factor_percent),
                fillRate:         fmt(s?.data?.fillRate),
                returnRate:       fmt(s?.data?.returnRate),
                damageRate:       fmt(s?.data?.damageRate),
                totalWeightKg:    s?.total_weight_kg   ?? 0,
                activeFleetCount: s?.active_fleet_count ?? 0,
                transportCost:    s?.data?.transportCost ?? 0,
                totalShipments:   s?.active_fleet_count ?? 0,
                // Field lama — backward compat untuk komponen yang masih pakai
                otifRate:         fmt(s?.success_rate_percent),
                avgLoadingTime:   `${(s?.total_weight_kg ?? 0).toFixed(1)} KG`,
            });
            setFleetData(data.utilization?.data);
            setVolumeData(data.volume?.data || []);
            setMaxVolume(data.volume?.max || 1);
            setDriverData(data.drivers?.data || []);
            
        } catch (error) {
            console.error("Gagal sinkronisasi Analytics:", error);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    // 🌟 EFEK TRIGGER KALO TANGGAL BERUBAH
    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]); 

    // Helper untuk ngitung tinggi balok chart
    const getBarHeight = (count: number, maxVol: number) => {
        if (count === 0) return "5%"; 
        const max = maxVol || 1; 
        return `${(count / max) * 100}%`;
    };

    // 🌟 FUNGSI EXPORT
    const handleExport = async () => {
        try {
            const blobData = await analyticsService.exportReport(startDate, endDate);
            
            const url = window.URL.createObjectURL(new Blob([blobData]));
            const link = document.createElement('a');
            link.href = url;
            
            link.setAttribute('download', `Laporan_JAPFA_${startDate}_sd_${endDate}.pdf`); 
            
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            
        } catch (error) {
            toast.error("Gagal download laporan. Pastikan Backend sudah siap ngirim file!");
        }
    };

    return {
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        handleExport,
        
        // Data & Loading States
        kpiData,
        summaryLoading: loading, 
        
        fleetData,
        utilizationLoading: loading,
        
        volumeData,
        maxVolume,
        volumeLoading: loading,
        getBarHeight,
        
        driverData,
        driversLoading: loading
    };
};