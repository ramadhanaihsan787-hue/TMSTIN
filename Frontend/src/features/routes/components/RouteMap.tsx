// src/features/routes/components/RouteMap.tsx
import React, { useState, useRef, useEffect, useMemo } from "react";
import Map, { Marker, Popup, Source, Layer } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { TrafficWarning } from "../types"; // 🌟 FIX TS: Tambahin kata 'type' di sini!

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const DEPO_LON = 106.479163;
const DEPO_LAT = -6.207356;

// ==========================================
// 1. STYLING ANIMASI (MAPBOX VERSION)
// ==========================================
const css = `
    @keyframes markerBlink { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 transparent; } 50% { transform: scale(1.15); box-shadow: 0 0 15px currentColor; } }
    .blinking-marker { animation: markerBlink 1s ease-in-out infinite; z-index: 9999 !important; position: relative; }
    
    @keyframes dangerPulse { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
    .danger-marker { animation: dangerPulse 1.5s infinite; border: 2px solid white !important; }
    
    .dimmed-marker { opacity: 0.3; filter: grayscale(80%); }
    .depo-ring { position: absolute; inset: -6px; border-radius: 50%; border: 2px dashed rgba(239,68,68,0.5); animation: depoSpin 10s linear infinite; }
    @keyframes depoSpin { 100% { transform: rotate(360deg); } }
`;

// ==========================================
// 2. BIKIN LINGKARAN GEOFENCE 2KM (NO LIBRARY)
// ==========================================
const createGeoJSONCircle = (center: [number, number], radiusInMeters: number, points = 64) => {
    const coords = [];
    const km = radiusInMeters / 1000;
    const distanceX = km / (111.320 * Math.cos(center[1] * Math.PI / 180));
    const distanceY = km / 110.574;

    for (let i = 0; i < points; i++) {
        const theta = (i / points) * (2 * Math.PI);
        const x = distanceX * Math.cos(theta);
        const y = distanceY * Math.sin(theta);
        coords.push([center[0] + x, center[1] + y]);
    }
    coords.push(coords[0]); 
    
    return {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} }]
    };
};

interface RouteMapProps {
    routesData: any[]; 
    selectedRouteId: string | null;
    truckColors: string[];
    droppedNodesData?: any[]; 
    trafficWarnings?: TrafficWarning[]; 
    onSelectRoute?: (routeId: string | null) => void;
    zonesData?: any[]; // 🌟 FIX TS: Tambahin baris ini supaya error zonesData hilang!
}

// ... (Isi ke bawahnya sama persis kayak yang lu kirim tadi, ngga ada yang diubah) ...
export default function RouteMap({ routesData, selectedRouteId, truckColors = [], droppedNodesData = [], trafficWarnings = [], onSelectRoute }: RouteMapProps) {
    const mapRef = useRef<MapRef>(null);
    const [viewState, setViewState] = useState({ longitude: DEPO_LON, latitude: DEPO_LAT, zoom: 10 });
    const [popupInfo, setPopupInfo] = useState<any>(null);

    useEffect(() => {
        if (selectedRouteId && mapRef.current) {
            const selected = routesData.find(r => (r.routeId || r.route_id) === selectedRouteId);
            if (selected) {
                const details = selected.details || selected.detail_rute || selected.detail_perjalanan || [];
                const firstStop = details.find((d: any) => {
                    const lat = parseFloat(d.latitude || d.lat);
                    const lon = parseFloat(d.longitude || d.lon);
                    return !isNaN(lat) && !isNaN(lon); 
                });
                if (firstStop) {
                    mapRef.current.flyTo({ 
                        center: [parseFloat(firstStop.longitude || firstStop.lon), parseFloat(firstStop.latitude || firstStop.lat)], 
                        zoom: 11, duration: 1500 
                    });
                }
            }
        }
    }, [selectedRouteId, routesData]);

    const routesGeoJSON = useMemo(() => {
        const features = routesData.map((route, i) => {
            const routeId = route.routeId || route.route_id;
            const color = truckColors[i % truckColors.length];
            const isDimmed = selectedRouteId !== null && selectedRouteId !== routeId;
            const isBlinking = selectedRouteId === routeId;

            let coords: number[][] = [];

            // Priority 1: geometry field dari useRoutes (di-map dari garis_aspal)
            // Format: [lon, lat][] — Mapbox native, tidak perlu flip
            if (route.geometry && Array.isArray(route.geometry) && route.geometry.length >= 2) {
                coords = (route.geometry as number[][]).filter(
                    (c: number[]) => Array.isArray(c) && !isNaN(c[0]) && !isNaN(c[1])
                );
            // Priority 2: garis_aspal langsung sebagai plain array [lon,lat][]
            } else if (Array.isArray(route.garis_aspal) && route.garis_aspal.length >= 2) {
                coords = route.garis_aspal.filter((c: any) => Array.isArray(c) && !isNaN(c[0]) && !isNaN(c[1]));
            // Priority 3: Fallback straight-line antar stop (tidak ada geometry dari backend)
            } else {
                coords = [[DEPO_LON, DEPO_LAT]];
                const details = route.details || route.detail_rute || route.detail_perjalanan || [];
                details.forEach((stop: any) => {
                    const lat = parseFloat(stop.latitude || stop.lat);
                    const lon = parseFloat(stop.longitude || stop.lon);
                    if (!isNaN(lat) && !isNaN(lon)) coords.push([lon, lat]);
                });
                coords.push([DEPO_LON, DEPO_LAT]);
            }

            if (coords.length < 2) coords = [[DEPO_LON, DEPO_LAT], [DEPO_LON, DEPO_LAT]];

            return {
                type: 'Feature',
                properties: { 
                    routeId, color, 
                    opacity: isDimmed ? 0.2 : 1.0, 
                    width: isBlinking ? 6 : 4,
                    glowOpacity: isDimmed ? 0 : (isBlinking ? 0.5 : 0.2)
                },
                geometry: { type: 'LineString', coordinates: coords }
            };
        });

        return { type: 'FeatureCollection', features };
    }, [routesData, selectedRouteId, truckColors]);

    const geofenceGeoJSON = useMemo(() => createGeoJSONCircle([DEPO_LON, DEPO_LAT], 2000), []);

    const warningsMap = useMemo(() => {
        const map: any = {};
        trafficWarnings.forEach(w => {
            map[`${w.truck_id}_${w.store_name}`] = w;
        });
        return map;
    }, [trafficWarnings]);

    return (
        <div className="relative w-full h-full min-h-[500px]">
            <style>{css}</style>
            
            <Map 
                ref={mapRef} 
                {...viewState} 
                onMove={(e: any) => setViewState(e.viewState)} 
                style={{ width: '100%', height: '100%' }} 
                mapStyle="mapbox://styles/mapbox/navigation-night-v1" 
                mapboxAccessToken={MAPBOX_TOKEN}
            >
                <Source id="geofence" type="geojson" data={geofenceGeoJSON as any}>
                    <Layer id="geo-fill" type="fill" paint={{ 'fill-color': '#ef4444', 'fill-opacity': 0.05 }} />
                    <Layer id="geo-line" type="line" paint={{ 'line-color': '#ef4444', 'line-width': 1.5, 'line-dasharray': [4, 4], 'line-opacity': 0.5 }} />
                </Source>

                <Source id="routes-glow" type="geojson" data={routesGeoJSON as any}>
                    <Layer id="route-glow-layer" type="line" paint={{ 'line-color': ['get', 'color'], 'line-width': 12, 'line-opacity': ['get', 'glowOpacity'], 'line-blur': 6 }} />
                </Source>
                <Source id="routes" type="geojson" data={routesGeoJSON as any}>
                    <Layer id="route-main-layer" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': ['get', 'color'], 'line-width': ['get', 'width'], 'line-opacity': ['get', 'opacity'], 'line-dasharray': [2, 2] }} />
                </Source>

                <Marker longitude={DEPO_LON} latitude={DEPO_LAT} anchor="center" onClick={() => setPopupInfo({ type: 'depo' })}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #ef4444, #991b1b)', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, boxShadow: '0 4px 15px rgba(239,68,68,0.5)', cursor: 'pointer', position: 'relative' }}>
                        D<div className="depo-ring"></div>
                    </div>
                </Marker>

                {routesData.map((route, i) => {
                    const baseColor = truckColors[i % truckColors.length];
                    const routeId = route.routeId || route.route_id;
                    const vehicle = route.vehicle || route.kendaraan || route.armada || "-";
                    const detailsArray = route.details || route.detail_rute || route.detail_perjalanan || [];
                    
                    const isDimmed = selectedRouteId !== null && selectedRouteId !== routeId;
                    const isBlinking = selectedRouteId === routeId;

                    return (
                        <React.Fragment key={routeId}>
                            {detailsArray.map((stop: any, j: number) => {
                                const lat = parseFloat(stop.latitude || stop.lat);
                                const lon = parseFloat(stop.longitude || stop.lon);
                                const namaToko = stop.storeName || stop.nama_toko || stop.lokasi;
                                const beratKg = stop.weightKg || stop.berat_kg || stop.turun_barang_kg || 0;
                                const urutan = stop.sequence || stop.urutan || (j + 1);

                                if (isNaN(lat) || isNaN(lon) || namaToko?.includes("GUDANG JAPFA")) return null;

                                const warning = warningsMap[`${routeId}_${namaToko}`];
                                let markerColor = baseColor;
                                let isDanger = false;

                                if (warning) {
                                    if (warning.severity === 'HIGH') {
                                        markerColor = '#ef4444'; 
                                        isDanger = true;
                                    } else {
                                        markerColor = '#f59e0b'; 
                                    }
                                }

                                return (
                                    <Marker key={`${routeId}-${j}`} longitude={lon} latitude={lat} anchor="center" onClick={(e) => { e.originalEvent.stopPropagation(); setPopupInfo({ type: 'customer', stop, markerColor, vehicle, urutan, beratKg, warning }); }}>
                                        <div style={{ color: markerColor }} className={`${isBlinking ? 'blinking-marker' : ''} ${isDimmed ? 'dimmed-marker' : ''} ${isDanger ? 'danger-marker' : ''} cursor-pointer`}>
                                            <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: isDimmed ? '#334155' : markerColor, border: `2px solid ${isDimmed ? '#64748b' : 'white'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 900, boxShadow: isDimmed ? 'none' : '0 2px 8px rgba(0,0,0,0.5)' }}>
                                                {urutan}
                                            </div>
                                        </div>
                                    </Marker>
                                );
                            })}
                        </React.Fragment>
                    );
                })}

                {popupInfo && popupInfo.type === 'depo' && (
                    <Popup longitude={DEPO_LON} latitude={DEPO_LAT} onClose={() => setPopupInfo(null)} closeOnClick={false} anchor="bottom" className="custom-popup z-[9999]">
                        <div className="p-2 min-w-[200px]">
                            <div className="flex items-center gap-2 mb-2"><span className="text-xl">🏢</span><b className="text-base text-slate-800 uppercase">Depo Japfa Cikupa</b></div>
                            <div className="text-xs text-slate-500 space-y-1">
                                <div className="flex justify-between"><span>Status</span><b className="text-emerald-600">Operational</b></div>
                                <div className="flex justify-between"><span>Geofence Radius</span><b className="text-slate-800">2 KM</b></div>
                            </div>
                        </div>
                    </Popup>
                )}
                
                {popupInfo && popupInfo.type === 'customer' && (
                    <Popup longitude={parseFloat(popupInfo.stop.longitude || popupInfo.stop.lon)} latitude={parseFloat(popupInfo.stop.latitude || popupInfo.stop.lat)} onClose={() => setPopupInfo(null)} closeOnClick={false} anchor="bottom" className="custom-popup z-[9999]">
                        <div className="p-1 space-y-2 min-w-[200px]">
                            <div className="flex justify-between items-center border-b pb-1 mb-1">
                                <b style={{ color: popupInfo.markerColor }} className="text-sm uppercase truncate pr-2">🚚 {popupInfo.vehicle}</b>
                                <span style={{ backgroundColor: popupInfo.markerColor }} className="text-white font-black text-lg px-2.5 py-0.5 rounded-full shadow">{popupInfo.urutan}</span>
                            </div>
                            <b className="text-sm font-bold text-slate-800">{popupInfo.stop.storeName || popupInfo.stop.nama_toko}</b>
                            
                            <div className="text-xs text-slate-600 flex justify-between"><span className="font-medium text-slate-400">Muatan:</span> <b className="text-slate-900 font-bold">{popupInfo.beratKg} KG</b></div>
                            <div className="text-xs text-slate-600 flex justify-between"><span className="font-medium text-slate-400">Est. Tiba:</span> <b className="text-slate-900 font-bold">{popupInfo.warning?.real_eta_traffic || popupInfo.stop.arrivalTime || popupInfo.stop.jam_tiba || '-'}</b></div>
                            
                            {popupInfo.warning && (
                                <div className={`mt-2 p-1.5 rounded-md text-[10px] font-bold ${popupInfo.warning.severity === 'HIGH' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                    ⚠️ Potensi Telat {popupInfo.warning.delay_minutes} Menit (Macet)
                                </div>
                            )}
                        </div>
                    </Popup>
                )}
            </Map>

            {onSelectRoute && routesData.length > 0 && (
                <div className="absolute bottom-6 right-6 z-[1000] bg-[#111]/90 backdrop-blur-xl p-4 rounded-xl shadow-2xl border border-slate-700 max-h-[250px] overflow-y-auto min-w-[200px]">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 flex items-center justify-between border-b border-slate-700 pb-2">
                        <span>Rute Aktif</span>
                        <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded">Pilih Manual</span>
                    </h4>
                    <div className="space-y-2">
                        {routesData.map((truk, i) => {
                            const routeId = truk.routeId || truk.route_id;
                            const vehicle = truk.vehicle || truk.kendaraan || truk.armada || "-";
                            const isThisSelected = selectedRouteId === routeId;
                            const isOtherSelected = selectedRouteId !== null && !isThisSelected;
                            return (
                                <div key={i} onClick={() => onSelectRoute(isThisSelected ? null : routeId)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all select-none ${isThisSelected ? 'bg-slate-800 border border-primary scale-105' : 'hover:bg-slate-800'} ${isOtherSelected ? 'opacity-40 grayscale' : ''}`}>
                                    <div className={`w-4 h-4 rounded-full shadow-inner border border-[#111] ${isThisSelected ? 'animate-pulse' : ''}`} style={{ backgroundColor: truckColors[i % truckColors.length] }}></div>
                                    <span className="text-xs font-bold text-slate-200">{vehicle}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}