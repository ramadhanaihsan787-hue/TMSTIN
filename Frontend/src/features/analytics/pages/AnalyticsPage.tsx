// src/features/analytics/pages/AnalyticsPage.tsx
import { useEffect } from 'react';
import { useAnalytics } from '../hooks';
import { useDateRange } from '../../../context/DateRangeContext';
import { toast } from 'sonner';
import { downloadFile } from '../../../shared/services/apiClient'; // [Item 4]

import {
    KPICards,
    DeliveryVolumeChart,
    FleetUtilizationChart,
    DriverPerformanceTable
} from '../components';

export default function AnalyticsPage() {
    const { startDate: globalStart, endDate: globalEnd } = useDateRange();

    const {
        setStartDate,
        setEndDate,
        kpiData,
        summaryLoading,
        fleetData,
        utilizationLoading,
        volumeData,
        maxVolume,
        volumeLoading,
        getBarHeight,
    } = useAnalytics();
    // Catatan: driversLoading dan driverData dihapus dari destructuring karena
    // DriverPerformanceTable sudah self-fetching (manage state sendiri via useEffect di dalamnya).
    // Passing props loading/drivers ke component tersebut menyebabkan ts(2322).

    useEffect(() => {
        setStartDate(globalStart);
        setEndDate(globalEnd);
    }, [globalStart, globalEnd, setStartDate, setEndDate]);

    // [Item 4] Ganti raw fetch → downloadFile() dari apiClient
    // Token ditambahkan otomatis oleh axios interceptor di apiClient.ts
    // baseURL dari VITE_API_URL, bukan hardcoded localhost
    const handleRealExport = async () => {
        toast.loading("Mempersiapkan file Excel...", { id: "export-toast" });
        try {
            await downloadFile(
                `/api/analytics/export?format=xlsx&startDate=${globalStart}&endDate=${globalEnd}`,
                `JAPFA_Logistics_Report_${globalStart}_to_${globalEnd}.xlsx`
            );
            toast.success("Excel Report berhasil diunduh!", { id: "export-toast" });
        } catch (error) {
            console.error(error);
            toast.error("Gagal membuat laporan Excel", { id: "export-toast" });
        }
    };

    return (
        <div className="flex flex-col w-full h-full"> 
            
            {/* 🌟 TOMBOL EXPORT UDAH AKTIF! */}
            <div className="px-4 md:px-8 pt-6 pb-2 flex justify-end">
                <button 
                    onClick={handleRealExport} 
                    className="flex items-center gap-2 bg-gradient-to-r from-[#994700] to-[#FF7A00] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/20 hover:scale-105 transition-all active:scale-95"
                >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    Export Excel Data
                </button>
            </div>

            {/* Content Area */}
            <div className="p-4 md:p-8 pt-4 space-y-6 max-w-[1600px] w-full mx-auto pb-12">
                <KPICards loading={summaryLoading} data={kpiData} />
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                    <DeliveryVolumeChart loading={volumeLoading} data={volumeData} maxVolume={maxVolume} getBarHeight={getBarHeight} />
                    <FleetUtilizationChart loading={utilizationLoading} data={fleetData} />
                </div>
                {/* DriverPerformanceTable tidak menerima props — self-fetching */}
                <DriverPerformanceTable />
            </div>
        </div>
    );
}