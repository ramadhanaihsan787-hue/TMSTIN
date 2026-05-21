// src/features/drivers/hooks/useDriverPerformance.ts
import { useState, useEffect, useCallback } from "react";
import { driverService } from "../services/driverService"; // 🌟 PAKAI SERVICE SEKARANG
import type { DriverData } from "../types/types";

export const useDriverPerformance = () => {
    const [drivers, setDrivers] = useState<DriverData[]>([]);
    const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState(""); 
    const [loading, setLoading] = useState(false); // 🌟 State loading mandiri

    // Tanggal dinamis 30 hari terakhir
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];

    const fetchDrivers = useCallback(async () => {
        setLoading(true);
        try {
            // 🌟 TEMBAK PAKE SERVICE
            const resData: any = await driverService.getDriverPerformance(thirtyDaysAgo, today);
            const actualData = resData?.data?.data || resData?.data || resData;
            
            if (Array.isArray(actualData)) {
                const mappedDrivers: DriverData[] = actualData.map((d: any) => ({
                    id: d.id ?? '', 
                    name: d.name ?? '',
                    avatar: d.avatar ?? '',
                    status: d.status ?? 'Offline',
                    score: typeof d.score === 'number' ? d.score : 0,
                    ontime: d.ontime != null ? String(d.ontime) : '0%',
                    doSuccess: d.doSuccess != null ? String(d.doSuccess) : '0/0',
                    truck: d.truck ?? '-',
                    distanceToday: typeof d.distanceToday === 'number' ? d.distanceToday : 0,
                    doCompleted: typeof d.doCompleted === 'number' ? d.doCompleted : 0,
                    doTotal: typeof d.doTotal === 'number' ? d.doTotal : 0,
                    lastLocation: d.lastLocation ?? '-',
                    lastUpdate: d.lastUpdate
                }));
                
                setDrivers(mappedDrivers);
                if (mappedDrivers.length > 0 && !expandedDriverId) {
                    setExpandedDriverId(mappedDrivers[0].id);
                }
            } else {
                setDrivers([]);
            }
        } catch (error) {
            console.error("Gagal menarik data supir:", error);
            setDrivers([]);
        } finally {
            setLoading(false);
        }
    }, [thirtyDaysAgo, today, expandedDriverId]);

    useEffect(() => {
        fetchDrivers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    const toggleExpand = (id: string) => {
        setExpandedDriverId(prev => prev === id ? null : id);
    };

    return {
        loading,
        drivers,
        expandedDriverId,
        toggleExpand,
        searchQuery,
        setSearchQuery,
        refreshData: fetchDrivers
    };
};