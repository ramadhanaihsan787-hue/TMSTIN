// src/features/dashboard/pages/LogisticDashboard.tsx
import { useEffect } from "react";
// 🌟 KOMPONEN HEADER DIHAPUS DARI SINI

import { useDashboardData } from "../hooks/useDashboardData";
import KpiCard from "../components/KpiCard";
import VolumeChart from "../components/VolumeChart";
import FleetDonut from "../components/FleetDonut";
import RejectionList from "../components/RejectionList";
import AlertList from "../components/AlertList";
import DashboardMap from "../components/DashboardMap";

// 🌟 IMPORT KURIR JUDUL
import { useHeaderStore } from "../../../store/useHeaderStore";

export default function LogistikDashboard() {
    const { setTitle } = useHeaderStore();

    // 🌟 SET JUDUL SAAT HALAMAN DIBUKA
    useEffect(() => {
        setTitle("Daily Logistics");
    }, [setTitle]);

    const {
        kpiData,
        volumeData,
        maxVolume,
        fleetData,
        activeTrucks,
        rejections,
        alerts,
        isLoading
    } = useDashboardData();

    return (
        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-[#0A0A0A]">
            {/* 🌟 <Header /> UDAH GA ADA DI SINI BIAR GA NUMPUK */}

            {/* Content Area yang bisa di-scroll */}
            <div className="p-4 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-[1600px] mx-auto flex flex-col gap-6 md:gap-8">

                    {/* SEKSI 1: 4 KARTU KPI UTAMA */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        <KpiCard
                            title="OTIF Rate"
                            value={kpiData.otifRate}
                            subtitle="vs. last week target (95%)"
                            icon="timer"
                            iconColorClass="text-primary"
                            iconBgClass="bg-primary/10"
                            isLoading={isLoading}
                        />
                        <KpiCard
                            title="Product Rejection"
                            value={kpiData.rejectionRate}
                            subtitle="Awaiting E-POD sync"
                            icon="error"
                            iconColorClass="text-red-500 dark:text-red-400"
                            iconBgClass="bg-red-50 dark:bg-red-500/10"
                            isLoading={isLoading}
                        />
                        <KpiCard
                            title="Total Shipments"
                            value={kpiData.totalShipments}
                            unit="orders"
                            subtitle="Active routing today"
                            icon="local_shipping"
                            iconColorClass="text-blue-500 dark:text-blue-400"
                            iconBgClass="bg-blue-50 dark:bg-blue-500/10"
                            isLoading={isLoading}
                        />
                        <KpiCard
                            title="Total Weight"
                            value={kpiData.totalWeightKg}
                            unit="KG"
                            subtitle="Total capacity utilized"
                            icon="scale"
                            iconColorClass="text-purple-500 dark:text-purple-400"
                            iconBgClass="bg-purple-50 dark:bg-purple-500/10"
                            isLoading={isLoading}
                        />
                    </div>

                    {/* SEKSI 2: GRAFIK VOLUME & UTILISASI ARMADA */}
                    <div className="flex flex-col lg:flex-row gap-6">
                        <VolumeChart volumeData={volumeData} maxVolume={maxVolume} isLoading={isLoading} />
                        <FleetDonut fleetData={fleetData} isLoading={isLoading} />
                    </div>

                    {/* SEKSI 3: DAFTAR RETUR & NOTIFIKASI LIVE */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <RejectionList rejections={rejections} isLoading={isLoading} />
                        <AlertList alerts={alerts} isLoading={isLoading} />
                    </div>

                    {/* SEKSI 4: PETA LIVE TRACKING TRUK JAPFA */}
                    <DashboardMap activeTrucks={activeTrucks} isLoading={isLoading} />
                </div>
            </div>
        </div>
    );
}