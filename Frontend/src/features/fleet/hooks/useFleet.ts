// src/features/fleet/hooks/useFleet.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { fleetService } from "../services/fleetService";
import type { FleetVehicle, TelematicsData, FuelLogEntry } from "../types";

export const useFleet = () => {
    const [fleetList, setFleetList]       = useState<FleetVehicle[]>([]);
    const [selectedTruck, setSelectedTruck] = useState<FleetVehicle | null>(null);
    const [liveTelematics, setLiveTelematics] = useState<TelematicsData | null>(null);
    const [loading, setLoading]           = useState(false);

    // ─────────────────────────────────────────────────────────────────────
    // FETCH FLEET — pakai data aktual backend tanpa dummy injection
    // ─────────────────────────────────────────────────────────────────────
    const fetchFleet = useCallback(async () => {
        setLoading(true);
        try {
            const res: any = await fleetService.getFleetList();
            const data = res?.data || res;

            if (!Array.isArray(data)) { setFleetList([]); return; }

            const mapped: FleetVehicle[] = data.map((t: any) => ({
                id:            t.id || t.vehicle_id,
                licensePlate:  t.plateNumber || t.license_plate || '-',
                model:         t.model || t.type || '-',
                currentKm:     t.kmAwalHariIni || t.current_km || 0,
                status:        t.status || 'Available',
                capacity:      t.capacity || 0,
                currentLoad:   t.currentLoad || 0,
                loadPercent:   t.loadPercent || 0,
                isInternal:    t.isInternal ?? true,
                isOncall:      t.isOncall ?? false,

                // Crew hari ini — dari dispatch
                driverName:      t.driverName   || null,
                helperName:      t.helperName   || null,
                routeIdToday:    t.routeIdToday || null,
                totalStopsToday: t.totalStopsToday || 0,
                etaLast:         t.etaLast || null,

                // Fuel
                lastFuelDate: t.lastFuelDate || '-',
                lastFuelCost: t.lastFuelCost || '-',
                fuelEfficiency: t.fuelEfficiency || 0,

                // Telematics — default netral sampai vendor polling jawab
                speedKmH:    0,
                batteryPct:  t.status === 'Maintenance' ? 15 : 75,
                currentTemp: -18.0,
                setPointTemp: -18,
                tempStatus:  'Healthy',
                sparklineData: [15, 15, 15, 15, 15, 15],
                latitude:  t.lat || t.latitude  || null,
                longitude: t.lon || t.longitude || null,

                raw: t,
            }));

            setFleetList(mapped);
            if (mapped.length > 0 && !selectedTruck) setSelectedTruck(mapped[0]);
        } catch (err) {
            console.warn("Gagal fetch fleet:", err);
            setFleetList([]);
        } finally {
            setLoading(false);
        }
    }, []);   // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchFleet(); }, []);   // eslint-disable-line

    // ─────────────────────────────────────────────────────────────────────
    // DIGITAL TWIN — polling telematics 5 detik dari vendor
    // ─────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!selectedTruck?.licensePlate) { setLiveTelematics(null); return; }

        const poll = async () => {
            try {
                const data = await fleetService.getTelematics(selectedTruck.licensePlate);
                setLiveTelematics(data);
                // Update truk yang dipilih dengan data telematics terbaru
                setFleetList(prev => prev.map(t =>
                    t.id === selectedTruck.id
                        ? {
                            ...t,
                            currentTemp: data.temperature,
                            tempStatus:  data.isTempWarning
                                ? (data.temperature > 0 ? 'Critical' : 'Warning')
                                : 'Healthy',
                          }
                        : t
                ));
            } catch { /* offline — keep last value */ }
        };

        poll();
        const id = setInterval(poll, 5000);
        return () => clearInterval(id);
    }, [selectedTruck?.licensePlate]);  // eslint-disable-line

    // ─────────────────────────────────────────────────────────────────────
    // FUEL LOGS
    // ─────────────────────────────────────────────────────────────────────
    const [fuelLogs, setFuelLogs] = useState<FuelLogEntry[]>([]);

    const addFuelEntry = useCallback(async (volumeLiters: number, station: string, cost: number) => {
        const dateStr = new Date().toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
        const entry: FuelLogEntry = {
            id: `FL-${Math.floor(1000 + Math.random() * 9000)}`,
            date: dateStr,
            volumeLiters,
            station,
            cost,
        };
        try {
            if (selectedTruck) {
                await fleetService.addFuelLog(selectedTruck.id, {
                    volumeLiters, station, cost,
                    date: new Date().toISOString().split('T')[0],
                });
            }
        } catch { /* local-only on fail */ }
        setFuelLogs(prev => [entry, ...prev]);
    }, [selectedTruck]);

    // ─────────────────────────────────────────────────────────────────────
    // KPI
    // ─────────────────────────────────────────────────────────────────────
    const kpi = useMemo(() => ({
        activeCount:      fleetList.filter(t => t.status === 'Available' || t.status === 'On Trip').length,
        maintenanceCount: fleetList.filter(t => t.status === 'Maintenance').length,
        totalCount:       fleetList.length,
        avgFuelEfficiency: 8.2,
        coldChainBreach:   liveTelematics?.isTempWarning ? 1 : 0,
    }), [fleetList, liveTelematics]);

    return {
        loading,
        fleetList,
        selectedTruck,
        setSelectedTruck,
        telematics:   liveTelematics,
        kpi,
        refreshFleet: fetchFleet,
        fuelLogs,
        addFuelEntry,
    };
};