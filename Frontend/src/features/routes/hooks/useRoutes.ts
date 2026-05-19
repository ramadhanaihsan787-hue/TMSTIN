// src/features/routes/hooks/useRoutes.ts
import { useState, useCallback } from "react";
import { routeService } from "../services/routeService";
import type { RouteItem, DroppedNode } from "../types";

export const useRoutes = () => {
    const [routesData, setRoutesData] = useState<RouteItem[]>([]);
    const [droppedNodes, setDroppedNodes] = useState<DroppedNode[]>([]);
    const [zonesData, setZonesData] = useState<any[]>([]); 
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchRoutes = useCallback(async (date: string) => {
        setIsLoading(true);
        try {
            const data = await routeService.fetchRoutes(date);
            const rawRoutes = data?.routes || data;

            if (rawRoutes && Array.isArray(rawRoutes)) {
                const mapped: RouteItem[] = rawRoutes.map((r: any) => {
                    const mappedStops = (r.detail_rute || r.detail_perjalanan || []).map((s: any) => ({
                        sequence: s.urutan,
                        storeName: s.nama_toko,
                        weight: s.berat_kg || s.turun_barang_kg || 0,
                        arrivalTime: s.jam_tiba || s.jam || "",
                        lat: s.latitude || s.lat || 0,
                        lng: s.longitude || s.lon || 0
                    }));

                    return {
                        routeId: r.route_id || r.routeId,
                        destinationCount: r.destinasi_jumlah || r.destinationCount || mappedStops.length,
                        transportCost: r.transport_cost || r.transportCost || 0,
                        totalDistanceKm: r.total_distance_km || r.totalDistanceKm || 0,
                        driverName: r.nama_driver || r.driver_name || "",
                        plateNumber: r.plat_nomor || r.plate_number || "",
                        stops: mappedStops,
                        details: mappedStops, 
                        geometry: r.garis_aspal || r.geometry || []
                    } as unknown as RouteItem; 
                });
                
                setRoutesData(mapped);
                setDroppedNodes(data.dropped_nodes || []);
                setZonesData(data.zones || []); 
                setSelectedRouteId(mapped[0]?.routeId || null);
            }
        } catch (err) {
            console.error("Gagal mengambil data rute:", err);
            setRoutesData([]);
            setDroppedNodes([]);
            setZonesData([]); 
            setSelectedRouteId(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        routesData,
        droppedNodes,
        zonesData, 
        selectedRouteId,
        setSelectedRouteId, 
        isLoading,
        fetchRoutes
    };
};