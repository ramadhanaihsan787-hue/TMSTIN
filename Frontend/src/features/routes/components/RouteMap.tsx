// src/features/routes/components/RouteMap.tsx
import React, { useState, useRef, useEffect, useMemo } from "react";
import Map, { Marker, Popup, Source, Layer } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
    DEPO_LON, DEPO_LAT, generateCircleCoords,
    zonePolygons, buildZonesGeoJSON
} from '../../dashboard/components/trackingData';

const globalStyles = `
    @keyframes markerBlink { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 rgba(0,0,0,0); } 50% { transform: scale(1.2); box-shadow: 0 0 20px currentColor; } }
    @keyframes polylineBlink { 0%, 100% { opacity: 1; filter: drop-shadow(0 0 10px currentColor); } 50% { opacity: 0.3; filter: none; } }
    @keyframes routePulse { 0%,100% { opacity:0.7; } 50% { opacity:1; } }
    @keyframes depoSpin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
    @keyframes customerBounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-3px); } }
    .blinking-marker { animation: markerBlink 1s ease-in-out infinite; z-index: 9999 !important; position: relative; }
    .blinking-polyline { animation: polylineBlink 1s ease-in-out infinite; }
    .dropped-marker { background-color: #334155; border: 2px solid #94a3b8; filter: grayscale(100%); }
    .rp-depo-ring { animation: depoSpin 8s linear infinite; }
    .rp-customer-pin:hover { animation: customerBounce 0.4s ease; }
    .rp-zone-toggle { backdrop-filter: blur(10px); transition: all 0.2s ease; }
    .rp-zone-toggle:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
    .mapboxgl-popup-content { background: #111827 !important; border: 1px solid #374151 !important; border-radius: 12px !important; color: white !important; padding: 0 !important; box-shadow: 0 10px 40px rgba(0,0,0,0.5) !important; }
    .mapboxgl-popup-tip { border-top-color: #111827 !important; }
    .mapboxgl-popup-close-button { color: #9ca3af !important; font-size: 18px !important; padding: 4px 8px !important; }
`;

const createNumberedIcon = (number: number | string, colorHex: string, isDepo: boolean = false, isDimmed: boolean = false, isBlinking: boolean = false) => {
    if (isDepo) {
        return (
            <div style={{ position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg className="rp-depo-ring" width="48" height="48" viewBox="0 0 48 48" style={{ position: 'absolute' }}>
                    <circle cx="24" cy="24" r="22" fill="none" stroke="#e11d48" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />
                </svg>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #334155)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #e11d48', boxShadow: '0 0 20px rgba(225,29,72,0.4)', zIndex: 1 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#f43f5e' }}>warehouse</span>
                </div>
            </div>
        );
    }

    const size = 28;
    const bgColor = isDimmed ? '#4b5563' : colorHex;
    const opacity = isDimmed ? 0.35 : 1;

    return (
        <div className={`rp-customer-pin ${isBlinking ? 'blinking-marker' : ''}`} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity, transition: 'all 0.3s ease', cursor: 'pointer' }}>
            {!isDimmed && (
                <div style={{ position: 'absolute', top: 2, width: size + 8, height: size + 8, borderRadius: '50%', background: colorHex, opacity: 0.25, filter: 'blur(6px)' }} />
            )}
            <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg, ${bgColor}, ${bgColor}dd)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 12, border: '2px solid rgba(255,255,255,0.9)', boxShadow: `0 2px 10px ${bgColor}60`, zIndex: 1, position: 'relative' }}>
                {number}
            </div>
            <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `6px solid ${bgColor}`, marginTop: -1, zIndex: 0 }} />
        </div>
    );
};

interface MapComponentProps {
    routesData: any[];
    selectedRouteId: string | null;
    truckColors: string[];
    droppedNodesData?: any[];
    hasDummyData?: boolean;
}

export default function RouteMap({ routesData, selectedRouteId, truckColors, droppedNodesData, hasDummyData }: MapComponentProps) {
    const mapRef = useRef<MapRef>(null);
    const [viewState, setViewState] = useState({ longitude: DEPO_LON, latitude: DEPO_LAT, zoom: 10 });
    const [popupInfo, setPopupInfo] = useState<any>(null);
    const [showZones, setShowZones] = useState(true);
    const [showRadius, setShowRadius] = useState(true);

    // 🌟 FORCE RESIZE ON MOUNT (Fixes blank map issue)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.getMap().resize();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (mapRef.current) {
            mapRef.current.getMap().resize();
        }
    }, [routesData, selectedRouteId]);

    // GeoJSON for all route polylines
    const routeGeoJSON = useMemo(() => ({
        type: 'FeatureCollection' as const,
        features: routesData.map((route, i) => {
            const coords: [number, number][] = [[DEPO_LON, DEPO_LAT]];
            if (route.garis_aspal && route.garis_aspal.length > 0) {
                route.garis_aspal.forEach((p: any) => coords.push([p[1], p[0]]));
            } else {
                const stops = route.detail_rute || route.detail_perjalanan || [];
                stops.forEach((stop: any) => {
                    const lat = stop.latitude || stop.lat;
                    const lon = stop.longitude || stop.lon;
                    if (lat && lon) coords.push([lon, lat]);
                });
            }
            const isDimmed = selectedRouteId !== null && selectedRouteId !== route.route_id;
            return {
                type: 'Feature' as const,
                properties: {
                    color: truckColors[i % truckColors.length],
                    opacity: isDimmed ? 0.12 : 0.85,
                    width: selectedRouteId === route.route_id ? 5 : 3
                },
                geometry: { type: 'LineString' as const, coordinates: coords }
            };
        })
    }), [routesData, selectedRouteId, truckColors]);

    // GeoJSON for geofence circles
    const geofenceGeoJSON = useMemo(() => ({
        type: 'FeatureCollection' as const,
        features: [
            {
                type: 'Feature' as const,
                properties: { color: '#e11d48', opacity: 0.06, strokeOpacity: 0.3 },
                geometry: { type: 'Polygon' as const, coordinates: [generateCircleCoords(DEPO_LON, DEPO_LAT, 5)] }
            },
            ...routesData.flatMap((route, i) => {
                const stops = route.detail_rute || route.detail_perjalanan || [];
                return stops.filter((s: any) => (s.latitude || s.lat) && (s.longitude || s.lon)).map((stop: any) => {
                    const lat = stop.latitude || stop.lat;
                    const lon = stop.longitude || stop.lon;
                    return {
                        type: 'Feature' as const,
                        properties: {
                            color: truckColors[i % truckColors.length],
                            opacity: selectedRouteId && selectedRouteId !== route.route_id ? 0.01 : 0.06,
                            strokeOpacity: selectedRouteId && selectedRouteId !== route.route_id ? 0.05 : 0.35
                        },
                        geometry: { type: 'Polygon' as const, coordinates: [generateCircleCoords(lon, lat, 1.5)] }
                    };
                });
            })
        ]
    }), [routesData, selectedRouteId, truckColors]);

    const zonesGeoJSON = useMemo(() => buildZonesGeoJSON(), []);

    const handleReset = () => {
        setViewState({ longitude: DEPO_LON, latitude: DEPO_LAT, zoom: 10 });
        setPopupInfo(null);
    };

    return (
        <div className="relative w-full h-full rounded-xl overflow-hidden bg-slate-900">
            <style>{globalStyles}</style>
            <Map
                ref={mapRef}
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/dark-v11"
                mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                onLoad={() => console.log("✅ Mapbox Loaded Successfully")}
                onError={(e) => console.error("❌ Mapbox Error:", e.error)}
            >
                {/* Zone Polygons */}
                {showZones && (
                    <Source id="rp-zones" type="geojson" data={zonesGeoJSON}>
                        <Layer id="rp-zones-fill" type="fill" paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.1 }} />
                        <Layer id="rp-zones-line" type="line" paint={{ 'line-color': ['get', 'color'], 'line-width': 2, 'line-dasharray': [4, 3], 'line-opacity': 0.6 }} />
                    </Source>
                )}

                {/* Geofence Radius Circles */}
                {showRadius && (
                    <Source id="rp-geofences" type="geojson" data={geofenceGeoJSON}>
                        <Layer id="rp-geo-fill" type="fill" paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'opacity'] }} />
                        <Layer id="rp-geo-line" type="line" paint={{ 'line-color': ['get', 'color'], 'line-width': 1.5, 'line-dasharray': [3, 2], 'line-opacity': ['get', 'strokeOpacity'] }} />
                    </Source>
                )}

                {/* Route Polylines with Glow */}
                <Source id="rp-routes" type="geojson" data={routeGeoJSON}>
                    <Layer id="rp-routes-glow" type="line" paint={{ 'line-color': ['get', 'color'], 'line-width': 12, 'line-opacity': 0.15, 'line-blur': 6 }} />
                    <Layer id="rp-routes-main" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': ['get', 'color'], 'line-width': ['get', 'width'], 'line-opacity': ['get', 'opacity'], 'line-dasharray': [2, 2] }} />
                </Source>

                {/* Zone Labels */}
                {showZones && zonePolygons.map((z: typeof zonePolygons[0]) => {
                    const cX = z.coordinates.reduce((s: number, c: [number, number]) => s + c[0], 0) / z.coordinates.length;
                    const cY = z.coordinates.reduce((s: number, c: [number, number]) => s + c[1], 0) / z.coordinates.length;
                    return (
                        <Marker key={z.name} longitude={cX} latitude={cY} anchor="center">
                            <div style={{ background: `${z.color}22`, border: `1px solid ${z.color}66`, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 800, color: z.color, textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>{z.name}</div>
                        </Marker>
                    );
                })}

                {/* Depot Marker */}
                <Marker longitude={DEPO_LON} latitude={DEPO_LAT} anchor="center" onClick={() => setPopupInfo({ type: 'depo' })}>
                    {createNumberedIcon('0', '#1e293b', true, false, false)}
                </Marker>

                {/* Route Stop Markers */}
                {routesData.map((route, i) => {
                    const color = truckColors[i % truckColors.length];
                    const isDimmed = selectedRouteId !== null && selectedRouteId !== route.route_id;
                    const isBlinking = selectedRouteId === route.route_id;
                    const stops = route.detail_rute || route.detail_perjalanan || [];

                    return (
                        <React.Fragment key={route.route_id}>
                            {stops.map((stop: any, j: number) => {
                                const lat = stop.latitude || stop.lat;
                                const lon = stop.longitude || stop.lon;
                                const urutan = stop.urutan || (j + 1);
                                if (!lat || !lon) return null;
                                return (
                                    <Marker
                                        key={`${route.route_id}-${j}`}
                                        longitude={lon}
                                        latitude={lat}
                                        anchor="bottom"
                                        onClick={(e) => {
                                            e.originalEvent.stopPropagation();
                                            setPopupInfo({ type: 'stop', data: stop, routeColor: color, routeKendaraan: route.kendaraan, routeDriver: route.driver_name });
                                        }}
                                    >
                                        {createNumberedIcon(urutan, color, false, isDimmed, isBlinking)}
                                    </Marker>
                                );
                            })}
                        </React.Fragment>
                    );
                })}

                {/* Dropped Nodes Markers (Failed Shops) */}
                {droppedNodesData?.map((node, i) => {
                    const lat = node.lat || node.latitude;
                    const lon = node.lon || node.longitude;
                    if (!lat || !lon) return null;
                    return (
                        <Marker
                            key={`dropped-${i}`}
                            longitude={lon}
                            latitude={lat}
                            anchor="bottom"
                            onClick={(e) => {
                                e.originalEvent.stopPropagation();
                                setPopupInfo({ type: 'stop', data: { ...node, latitude: lat, longitude: lon, urutan: '!' }, routeColor: '#f43f5e', routeKendaraan: 'UNASSIGNED', routeDriver: node.alasan });
                            }}
                        >
                            <div className="flex flex-col items-center group cursor-pointer">
                                <div className="bg-white dark:bg-slate-900 px-2 py-1 rounded-md shadow-lg border-2 border-rose-500 mb-1 scale-75 group-hover:scale-100 transition-transform">
                                    <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 whitespace-nowrap uppercase tracking-tighter">GAGAL AI</span>
                                </div>
                                <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center border-4 border-white shadow-xl animate-pulse">
                                    <span className="material-symbols-outlined text-white text-lg">warning</span>
                                </div>
                            </div>
                        </Marker>
                    );
                })}

                {/* Simulated Moving Trucks */}
                {routesData.map((route, i) => {
                    const stops = (route.detail_rute || route.detail_perjalanan || []).filter((s: any) => (s.latitude || s.lat) && (s.longitude || s.lon));
                    if (stops.length < 2) return null;

                    const truckPosIdx = Math.min(1, stops.length - 1);
                    const truckStop = stops[truckPosIdx];
                    const lat = truckStop.latitude || truckStop.lat;
                    const lon = truckStop.longitude || truckStop.lon;
                    const color = truckColors[i % truckColors.length];
                    const isSelected = selectedRouteId === route.route_id;

                    return (
                        <Marker
                            key={`truck-pos-${route.route_id}`}
                            longitude={lon}
                            latitude={lat}
                            anchor="center"
                        >
                            <div className={`relative transition-all duration-1000 ${isSelected ? 'scale-125 z-50' : 'z-40 scale-100'}`}>
                                <div className="absolute -inset-4 bg-white/20 dark:bg-black/20 blur-xl rounded-full animate-pulse"></div>
                                <div className="relative bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.3)] border-2" style={{ borderColor: color }}>
                                    <div className="w-7 h-7 flex items-center justify-center rounded-full" style={{ backgroundColor: color }}>
                                        <span className="material-symbols-outlined text-white text-sm">local_shipping</span>
                                    </div>
                                    <div className="absolute left-1/2 -bottom-8 -translate-x-1/2 bg-slate-900/90 text-white text-[8px] font-black px-2 py-0.5 rounded-full whitespace-nowrap border border-white/20 shadow-lg uppercase tracking-widest">
                                        LIVE • {route.kendaraan}
                                    </div>
                                </div>
                            </div>
                        </Marker>
                    );
                })}

                {/* Rich Popups */}
                {popupInfo && (
                    <Popup
                        longitude={popupInfo.type === 'depo' ? DEPO_LON : (popupInfo.data.longitude || popupInfo.data.lon)}
                        latitude={popupInfo.type === 'depo' ? DEPO_LAT : (popupInfo.data.latitude || popupInfo.data.lat)}
                        onClose={() => setPopupInfo(null)}
                        closeOnClick={false}
                        anchor="bottom"
                        maxWidth="300px"
                    >
                        {popupInfo.type === 'depo' ? (
                            <div style={{ padding: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#f43f5e' }}>warehouse</span>
                                    <div>
                                        <div style={{ fontWeight: 900, fontSize: 14, color: '#fff', textTransform: 'uppercase' }}>Depo JAPFA Cikupa</div>
                                        <div style={{ fontSize: 11, color: '#9ca3af' }}>Pusat Distribusi Utama</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    <span style={{ background: '#1e293b', border: '1px solid #374151', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#10b981' }}>⏰ Depart 06:00</span>
                                    <span style={{ background: '#1e293b', border: '1px solid #374151', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#3b82f6' }}>📍 Cikupa, TNG</span>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: 16, minWidth: 240 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #374151', paddingBottom: 10, marginBottom: 10 }}>
                                    <div>
                                        <div style={{ fontWeight: 900, fontSize: 13, color: popupInfo.routeColor, textTransform: 'uppercase' }}>🚚 {popupInfo.routeKendaraan}</div>
                                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{popupInfo.routeDriver || '-'}</div>
                                    </div>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: popupInfo.routeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 16, boxShadow: `0 0 12px ${popupInfo.routeColor}60` }}>{popupInfo.data.urutan}</div>
                                </div>
                                <div style={{ fontWeight: 800, fontSize: 13, color: '#fff', marginBottom: 8 }}>{popupInfo.data.nama_toko || popupInfo.data.storeName}</div>
                                <div style={{ background: '#1e293b', borderRadius: 8, padding: 10, border: '1px solid #374151', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#10b981' }}>route</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Segment Distance</div>
                                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Dari stop sebelumnya</div>
                                    </div>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>{popupInfo.data.distance_from_prev_km || '0.0'}<span style={{ fontSize: 14 }}> KM</span></div>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <span style={{ background: '#1e293b', border: '1px solid #374151', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#f59e0b' }}>📦 {popupInfo.data.berat_kg || popupInfo.data.weightKg} KG</span>
                                    <span style={{ background: '#1e293b', border: '1px solid #374151', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#3b82f6' }}>⏰ {popupInfo.data.jam_tiba?.substring(0, 5) || popupInfo.data.arrivalTime?.substring(0, 5) || '-'}</span>
                                </div>
                            </div>
                        )}
                    </Popup>
                )}
            </Map>

            {/* Toggle Controls - Top Right */}
            <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: 6 }}>
                {hasDummyData && (
                    <div className="rp-zone-toggle" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        ⚠ DEMO DATA
                    </div>
                )}
                <button onClick={() => setShowZones(!showZones)} className="rp-zone-toggle" style={{ background: showZones ? 'rgba(59,130,246,0.2)' : 'rgba(0,0,0,0.5)', border: showZones ? '1px solid #3b82f6' : '1px solid #4b5563', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: showZones ? '#60a5fa' : '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>layers</span> Zones
                </button>
                <button onClick={() => setShowRadius(!showRadius)} className="rp-zone-toggle" style={{ background: showRadius ? 'rgba(16,185,129,0.2)' : 'rgba(0,0,0,0.5)', border: showRadius ? '1px solid #10b981' : '1px solid #4b5563', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: showRadius ? '#34d399' : '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>track_changes</span> Radius
                </button>
                <button onClick={handleReset} className="rp-zone-toggle" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid #4b5563', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>fit_screen</span> Reset
                </button>
            </div>
        </div>
    );
}