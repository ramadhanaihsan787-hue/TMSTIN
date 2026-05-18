import React, { useState, useRef, useEffect, useMemo } from "react";
import Map, { Marker, Popup, Source, Layer } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
    dummyFleet, DEPO_LON, DEPO_LAT, generateCircleCoords,
    zonePolygons, buildZonesGeoJSON, type TruckTracking, type CustomerDrop
} from '../../dashboard/components/trackingData';
import FleetTrackingMap from './FleetTrackingMap';
import UploadVerificationModal from '../components/UploadVerificationModal';
import TruckList from '../components/TruckList';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { api } from '../../../shared/services/apiClient';

// 🌟 ADVANCED CSS ANIMATIONS (Matching FleetTrackingMap)
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

interface RouteProduct { nama_barang: string; qty: string; }
interface RouteDetail { urutan: number; nama_toko: string; latitude: number; longitude: number; berat_kg: number; jam_tiba: string; distance_from_prev_km: number; items: RouteProduct[]; }
interface RouteItem { route_id: string; tanggal: string; driver_name: string; kendaraan: string; jenis: string; destinasi_jumlah: number; total_berat: number; total_distance_km: number; status: string; zone: string; detail_rute: RouteDetail[]; garis_aspal?: [number, number][]; capacity?: number; }


interface UploadResult { order_id?: string; kode_customer?: string; nama_toko: string; berat?: number; kordinat?: string; alasan?: string; items?: RouteProduct[]; jam_maks?: string; }
interface DroppedNode { nama_toko: string; berat_kg: number; alasan: string; lat?: number; lon?: number; }

const formatTimeWindow = (timeStr: string, weight: number) => {
    if (!timeStr) return "-";
    const cleanedTimeStr = timeStr.substring(0, 5);
    const parts = cleanedTimeStr.split(':');
    if (parts.length < 2) return cleanedTimeStr;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const serviceTime = 15 + (weight / 10);
    const totalMinutes = h * 60 + m + Math.round(serviceTime);
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} - ${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
};








interface MapComponentProps {
    routesData: RouteItem[];
    selectedRouteId: string | null;
    truckColors: string[];
    droppedNodesData?: DroppedNode[];
    hasDummyData?: boolean;
}

const MapComponent = ({ routesData, selectedRouteId, truckColors, droppedNodesData, hasDummyData }: MapComponentProps) => {
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
                route.garis_aspal.forEach(p => coords.push([p[1], p[0]]));
            } else {
                route.detail_rute.forEach(stop => {
                    if (stop.latitude && stop.longitude) coords.push([stop.longitude, stop.latitude]);
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
            ...routesData.flatMap((route, i) =>
                route.detail_rute.filter(s => s.latitude && s.longitude).map((stop) => ({
                    type: 'Feature' as const,
                    properties: {
                        color: truckColors[i % truckColors.length],
                        opacity: selectedRouteId && selectedRouteId !== route.route_id ? 0.01 : 0.06,
                        strokeOpacity: selectedRouteId && selectedRouteId !== route.route_id ? 0.05 : 0.35
                    },
                    geometry: { type: 'Polygon' as const, coordinates: [generateCircleCoords(stop.longitude, stop.latitude, 1.5)] }
                }))
            )
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

                    return (
                        <React.Fragment key={route.route_id}>
                            {route.detail_rute.map((stop, j) => {
                                if (!stop.latitude || !stop.longitude) return null;
                                return (
                                    <Marker
                                        key={`${route.route_id}-${j}`}
                                        longitude={stop.longitude}
                                        latitude={stop.latitude}
                                        anchor="bottom"
                                        onClick={(e) => {
                                            e.originalEvent.stopPropagation();
                                            setPopupInfo({ type: 'stop', data: stop, routeColor: color, routeKendaraan: route.kendaraan, routeDriver: route.driver_name });
                                        }}
                                    >
                                        {createNumberedIcon(stop.urutan, color, false, isDimmed, isBlinking)}
                                    </Marker>
                                );
                            })}
                        </React.Fragment>
                    );
                })}

                {/* Dropped Nodes Markers (Failed Shops) */}
                {droppedNodesData?.map((node, i) => {
                    if (!node.lat || !node.lon) return null;
                    return (
                        <Marker
                            key={`dropped-${i}`}
                            longitude={node.lon}
                            latitude={node.lat}
                            anchor="bottom"
                            onClick={(e) => {
                                e.originalEvent.stopPropagation();
                                setPopupInfo({ type: 'stop', data: { ...node, latitude: node.lat, longitude: node.lon, urutan: '!' }, routeColor: '#f43f5e', routeKendaraan: 'UNASSIGNED', routeDriver: node.alasan });
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
                    // Simple logic to place truck at roughly 30-70% of the route for demo
                    const stops = route.detail_rute.filter(s => s.latitude && s.longitude);
                    if (stops.length < 2) return null;

                    // Use a deterministic "current position" based on route_id hash or just pick index 1
                    const truckPosIdx = Math.min(1, stops.length - 1);
                    const truckStop = stops[truckPosIdx];
                    const color = truckColors[i % truckColors.length];
                    const isSelected = selectedRouteId === route.route_id;

                    return (
                        <Marker
                            key={`truck-pos-${route.route_id}`}
                            longitude={truckStop.longitude}
                            latitude={truckStop.latitude}
                            anchor="center"
                        >
                            <div className={`relative transition-all duration-1000 ${isSelected ? 'scale-125 z-50' : 'z-40 scale-100'}`}>
                                <div className="absolute -inset-4 bg-white/20 dark:bg-black/20 blur-xl rounded-full animate-pulse"></div>
                                <div className="relative bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.3)] border-2" style={{ borderColor: color }}>
                                    <div className="w-7 h-7 flex items-center justify-center rounded-full" style={{ backgroundColor: color }}>
                                        <span className="material-symbols-outlined text-white text-sm">local_shipping</span>
                                    </div>
                                    {/* Moving Indicator Label */}
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
                        longitude={popupInfo.type === 'depo' ? DEPO_LON : popupInfo.data.longitude}
                        latitude={popupInfo.type === 'depo' ? DEPO_LAT : popupInfo.data.latitude}
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
                                <div style={{ fontWeight: 800, fontSize: 13, color: '#fff', marginBottom: 8 }}>{popupInfo.data.nama_toko}</div>
                                <div style={{ background: '#1e293b', borderRadius: 8, padding: 10, border: '1px solid #374151', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#10b981' }}>route</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Segment Distance</div>
                                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Dari stop sebelumnya</div>
                                    </div>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>{popupInfo.data.distance_from_prev_km || '0.0'}<span style={{ fontSize: 14 }}> KM</span></div>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <span style={{ background: '#1e293b', border: '1px solid #374151', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#f59e0b' }}>📦 {popupInfo.data.berat_kg} KG</span>
                                    <span style={{ background: '#1e293b', border: '1px solid #374151', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#3b82f6' }}>⏰ {popupInfo.data.jam_tiba?.substring(0, 5) || '-'}</span>
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
};


export default function RoutePlanning() {
    const [isUploading, setIsUploading] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'map' | 'live'>('list');
    const [routeMessage, setRouteMessage] = useState('');

    const [isReassignMode, setIsReassignMode] = useState(false);
    const [editedRoutes, setEditedRoutes] = useState<RouteItem[] | null>(null);
    const [transferStop, setTransferStop] = useState<{ routeId: string; stopIdx: number; stop: RouteDetail } | null>(null);
    const [reassignHistory, setReassignHistory] = useState<string[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [routesData, setRoutesData] = useState<RouteItem[]>([]);
    const [droppedNodes, setDroppedNodes] = useState<DroppedNode[]>([]);

    const baseRoutes: RouteItem[] = useMemo(() => {
        if (routesData.length > 0) return routesData;
        return dummyFleet.map((truck: TruckTracking, i: number) => ({
            route_id: truck.id,
            tanggal: new Date().toISOString().split('T')[0],
            driver_name: truck.driver,
            kendaraan: truck.plate,
            jenis: 'CDD',
            destinasi_jumlah: truck.customers.length,
            total_berat: truck.loadKg,
            capacity: truck.capacityKg,
            total_distance_km: 15 + i * 5,
            status: truck.status === 'in-transit' ? 'aktif' : truck.status,
            zone: truck.zone,
            detail_rute: truck.customers.map((c: CustomerDrop, j: number) => ({
                urutan: j + 1,
                nama_toko: c.name,
                latitude: c.lat,
                longitude: c.lon,
                berat_kg: c.weightKg,
                jam_tiba: c.timeWindow.split(' - ')[0] + ':00',
                distance_from_prev_km: 3 + j * 1.5,
                items: []
            }))
        }));
    }, [routesData]);

    const displayRoutes = editedRoutes ?? baseRoutes;

    const generateSuratJalanPDF = (selectedRoute: RouteItem) => {
        const doc = new (jsPDF as any)();
        doc.setFontSize(18);
        doc.text('SURAT JALAN', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`No. Kendaraan: ${selectedRoute.kendaraan}`, 14, 30);
        doc.text(`Driver: ${selectedRoute.driver_name}`, 14, 36);
        doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 42);

        const tableData = selectedRoute.detail_rute.map((stop, index) => [
            index + 1,
            stop.nama_toko,
            `${stop.berat_kg} KG`,
            stop.jam_tiba || '-'
        ]);

        doc.autoTable({
            startY: 50,
            head: [['No', 'Nama Toko', 'Berat', 'Jam Tiba']],
            body: tableData,
        });

        doc.save(`Surat_Jalan_${selectedRoute.kendaraan}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const enterReassignMode = () => {
        const deepCopy: RouteItem[] = JSON.parse(JSON.stringify(baseRoutes));
        setEditedRoutes(deepCopy);
        setIsReassignMode(true);
        setReassignHistory([]);
    };
    const exitReassignMode = (save: boolean) => {
        if (save && editedRoutes) {
            setRoutesData(editedRoutes);
            setRouteMessage('✅ Perubahan reassign berhasil disimpan!');
        }
        setEditedRoutes(null);
        setIsReassignMode(false);
        setTransferStop(null);
        setReassignHistory([]);
    };
    const handleTransferStop = (toRouteId: string) => {
        if (!editedRoutes || !transferStop) return;
        const newRoutes: RouteItem[] = JSON.parse(JSON.stringify(editedRoutes));
        const fromRoute = newRoutes.find(r => r.route_id === transferStop.routeId);
        const toRoute = newRoutes.find(r => r.route_id === toRouteId);
        if (!fromRoute || !toRoute) return;
        const [movedStop] = fromRoute.detail_rute.splice(transferStop.stopIdx, 1);
        toRoute.detail_rute.push(movedStop);
        fromRoute.detail_rute.forEach((s, i) => { s.urutan = i + 1; s.distance_from_prev_km = 3 + i * 1.5; });
        toRoute.detail_rute.forEach((s, i) => { s.urutan = i + 1; s.distance_from_prev_km = 3 + i * 1.5; });
        fromRoute.total_berat = fromRoute.detail_rute.reduce((s, d) => s + d.berat_kg, 0);
        fromRoute.destinasi_jumlah = fromRoute.detail_rute.length;
        fromRoute.total_distance_km = fromRoute.detail_rute.reduce((s, d) => s + d.distance_from_prev_km, 0);
        toRoute.total_berat = toRoute.detail_rute.reduce((s, d) => s + d.berat_kg, 0);
        toRoute.destinasi_jumlah = toRoute.detail_rute.length;
        toRoute.total_distance_km = toRoute.detail_rute.reduce((s, d) => s + d.distance_from_prev_km, 0);
        setEditedRoutes(newRoutes);
        setReassignHistory(prev => [...prev, `${movedStop.nama_toko} → ${toRoute.kendaraan}`]);
        setTransferStop(null);
        setSelectedRouteId(toRouteId);
    };

    const hasDummyData = routesData.length === 0;

    const [previewData, setPreviewData] = useState<any>(null);
    const [activePreviewTruck, setActivePreviewTruck] = useState<number | null>(null);

    const truckColors = ['#e11d48', '#0284c7', '#16a34a', '#d97706', '#9333ea', '#0d9488', '#0891b2'];

    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedRouteId && displayRoutes.length > 0) {
            setSelectedRouteId(displayRoutes[0].route_id);
        }
    }, [displayRoutes, selectedRouteId]);

    const selectedRoute = useMemo(() =>
        displayRoutes.find(r => r.route_id === selectedRouteId) || null
        , [displayRoutes, selectedRouteId]);

    const totalCost = useMemo(() =>
        displayRoutes.reduce((sum, r) => sum + (r.total_distance_km * 3500), 0).toLocaleString('id-ID')
        , [displayRoutes]);

    const totalRealDistance = useMemo(() =>
        displayRoutes.reduce((sum, r) => sum + r.total_distance_km, 0).toFixed(1)
        , [displayRoutes]);

    const totalFleet = displayRoutes.length;
    const totalOrders = displayRoutes.reduce((sum, r) => sum + r.destinasi_jumlah, 0);

    const [activeModal, setActiveModal] = useState<'cost' | 'distance' | 'fleet' | 'stops' | null>(null);
    const [expandedStopIdx, setExpandedStopIdx] = useState<number | null>(null);
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [uploadReport, setUploadReport] = useState<{ success: UploadResult[], failed: UploadResult[] } | null>(null);
    const [failedCoords, setFailedCoords] = useState<Record<number, { lat: string, lon: string }>>({});
    const [popupInfo, setPopupInfo] = useState<any>(null);
    const [trafficWarnings, setTrafficWarnings] = useState<any[]>([]);

    const fetchRoutes = async (date: string) => {
        try {
            const res = await api.get(`/api/routes?date=${date}`);
            const data = res.data;
            if (data.routes) {
                setRoutesData(data.routes);
                setDroppedNodes(data.dropped_nodes || []);
                if (data.routes.length > 0) setSelectedRouteId(data.routes[0].route_id);
                else setSelectedRouteId(null);
            } else if (Array.isArray(data)) {
                setRoutesData(data);
                if (data.length > 0) setSelectedRouteId(data[0].route_id);
                else setSelectedRouteId(null);
            }
        } catch (error) { console.error("Gagal fetch routes:", error); }
    };

    useEffect(() => { fetchRoutes(selectedDate); }, [selectedDate]);

    const handleUploadClick = () => fileInputRef.current?.click();

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        setIsUploading(true);

        try {
            const res = await api.post('/api/orders/upload', formData, {
                headers: { 'Content-Type': undefined }
            });
            const data = res.data;
            setUploadReport({ success: data.success_list || [], failed: data.failed_list || [] });
            setFailedCoords({});
            setShowVerificationModal(true);
        } catch (error: any) {
            console.error("Upload gagal:", error);
            alert(`Upload gagal: ${error.response?.data?.detail || error.message || 'Server error'}`);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
            setIsUploading(false);
        }
    };

    const handleTimeChange = async (orderId: string | undefined, newTime: string) => {
        if (!orderId) return;
        try {
            await api.put(`/api/orders/${orderId}/time`, { jam_maksimal: newTime });
        } catch (error) { console.error("Error API Time Update:", error); }
    };



    const [loadingProgress, setLoadingProgress] = useState(0);

    const handleOptimizeRoute = async () => {
        setShowVerificationModal(false);
        setIsOptimizing(true);
        setLoadingProgress(1);

        const progressInterval = setInterval(() => {
            setLoadingProgress((oldProgress) => {
                if (oldProgress >= 90) return 90;
                return oldProgress + 2;
            });
        }, 800);

        try {
            // 🌟 STEP 1: Mulai optimisasi AI (endpoint yang benar!)
            const startRes = await api.post('/api/routes/optimize/start?preview=true');
            const jobId = startRes.data.job_id;

            // 🌟 STEP 2: Polling status sampai selesai
            const checkVrpStatus = async () => {
                try {
                    const statusRes = await api.get(`/api/routes/optimize/status/${jobId}`);
                    const jobInfo = statusRes.data;

                    if (jobInfo.status === 'completed') {
                        clearInterval(progressInterval);
                        setLoadingProgress(95);

                        // 🌟 STEP 3: Validasi traffic (opsional)
                        try {
                            await api.post(`/api/routes/validate-traffic/${jobId}`);
                            const checkTraffic = async () => {
                                const tRes = await api.get(`/api/routes/validate-traffic/${jobId}/status`);
                                if (tRes.data.status === 'completed') {
                                    const finalData = { ...jobInfo.data, traffic_warnings: tRes.data.warnings };
                                    setLoadingProgress(100);
                                    setTimeout(() => {
                                        setPreviewData(finalData);
                                        setActivePreviewTruck(null);
                                        setIsOptimizing(false);
                                        setLoadingProgress(0);
                                    }, 800);
                                } else if (tRes.data.status === 'failed') {
                                    throw new Error('Traffic validation failed');
                                } else {
                                    setTimeout(checkTraffic, 1500);
                                }
                            };
                            setTimeout(checkTraffic, 1500);
                        } catch {
                            // Traffic gagal → tetap tampilkan hasil tanpa traffic
                            setLoadingProgress(100);
                            setTimeout(() => {
                                setPreviewData(jobInfo.data);
                                setActivePreviewTruck(null);
                                setIsOptimizing(false);
                                setLoadingProgress(0);
                            }, 800);
                        }
                    } else if (jobInfo.status === 'failed') {
                        clearInterval(progressInterval);
                        setIsOptimizing(false);
                        setLoadingProgress(0);
                        alert(jobInfo.message || 'AI gagal menghitung rute.');
                    } else {
                        // Masih processing → cek lagi
                        setTimeout(checkVrpStatus, 2000);
                    }
                } catch (error) {
                    clearInterval(progressInterval);
                    setIsOptimizing(false);
                    setLoadingProgress(0);
                    alert('Gagal mengecek status optimisasi AI.');
                }
            };

            setTimeout(checkVrpStatus, 2000);
        } catch (error: any) {
            clearInterval(progressInterval);
            setIsOptimizing(false);
            setLoadingProgress(0);
            alert(`Gagal memulai AI: ${error.response?.data?.detail || error.message || 'Server error'}`);
        }
    };

    const handleConfirmSaveRoute = async () => {
        try {
            await api.post('/api/routes/confirm', previewData);
            setPreviewData(null);
            setActivePreviewTruck(null);
            setRouteMessage('Rute berhasil dikunci & disimpan ke Database!');
            const todayStr = new Date().toISOString().split('T')[0];
            setSelectedDate(todayStr);
            await fetchRoutes(todayStr);
        } catch (error: any) {
            console.error('Gagal confirm route:', error);
            alert(`Gagal menyimpan ke database: ${error.response?.data?.detail || error.message || 'Server error'}`);
        }
    };

    return (
        <div className="p-4 md:p-8">
            {previewData && (
                <div className="fixed inset-0 z-[999999] bg-slate-900/90 backdrop-blur-sm flex flex-col p-4 md:p-8">
                    <div className="bg-white dark:bg-[#111] flex-1 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">

                        <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#1A1A1A]">
                            <div>
                                <h2 className="text-xl md:text-2xl font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">route</span> Peta Preview Rute AI
                                </h2>
                                <p className="text-slate-500 text-sm mt-1">Review jalur pengiriman setiap truk sebelum disimpan permanen.</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => { setPreviewData(null); setActivePreviewTruck(null); setShowVerificationModal(true); }} className="px-4 py-2 border-2 border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">edit</span> Batal & Edit Waktu
                                </button>
                                <button onClick={handleConfirmSaveRoute} className="px-6 py-2 bg-primary text-white font-black rounded-xl hover:brightness-110 flex items-center gap-2 shadow-lg shadow-primary/30 transition-all">
                                    <span className="material-symbols-outlined">save</span> SIMPAN RUTE PERMANEN
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 relative bg-slate-100 dark:bg-slate-900" style={{ minHeight: '600px' }}>
                            <style>{globalStyles}</style>

                            <Map
                                initialViewState={{ longitude: DEPO_LON, latitude: DEPO_LAT, zoom: 10 }}
                                style={{ width: '100%', height: '100%' }}
                                mapStyle="mapbox://styles/mapbox/dark-v11"
                                mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                                onLoad={() => console.log("✅ Preview Map Loaded Successfully")}
                                onError={(e) => console.error("❌ Preview Map Error:", e.error)}
                            >
                                <Source id="preview-routes" type="geojson" data={{
                                    type: 'FeatureCollection',
                                    features: previewData.jadwal_truk_internal.map((truk: any, i: number) => {
                                        const coords: [number, number][] = [[DEPO_LON, DEPO_LAT]];
                                        if (truk.garis_aspal && truk.garis_aspal.length > 0) {
                                            truk.garis_aspal.forEach((p: any) => coords.push([p[1], p[0]]));
                                        } else {
                                            truk.detail_perjalanan.forEach((stop: any) => {
                                                if (stop.lat && stop.lon) coords.push([stop.lon, stop.lat]);
                                            });
                                        }
                                        const isDimmed = activePreviewTruck !== null && activePreviewTruck !== i;
                                        return {
                                            type: 'Feature' as const,
                                            properties: {
                                                color: truckColors[i % truckColors.length],
                                                opacity: isDimmed ? 0.12 : 0.85,
                                                width: activePreviewTruck === i ? 5 : 3
                                            },
                                            geometry: { type: 'LineString' as const, coordinates: coords }
                                        };
                                    })
                                }}>
                                    <Layer id="preview-routes-glow" type="line" paint={{ 'line-color': ['get', 'color'], 'line-width': 12, 'line-opacity': 0.15, 'line-blur': 6 }} />
                                    <Layer id="preview-routes-main" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': ['get', 'color'], 'line-width': ['get', 'width'], 'line-opacity': ['get', 'opacity'], 'line-dasharray': [2, 2] }} />
                                </Source>

                                <Source id="preview-geofences" type="geojson" data={{
                                    type: 'FeatureCollection',
                                    features: [
                                        {
                                            type: 'Feature' as const,
                                            properties: { color: '#e11d48', opacity: 0.06, strokeOpacity: 0.3 },
                                            geometry: { type: 'Polygon' as const, coordinates: [generateCircleCoords(DEPO_LON, DEPO_LAT, 5)] }
                                        },
                                        ...previewData.jadwal_truk_internal.flatMap((truk: any, i: number) =>
                                            truk.detail_perjalanan.filter((s: any) => s.urutan !== 0 && s.lat && s.lon).map((stop: any) => ({
                                                type: 'Feature' as const,
                                                properties: {
                                                    color: truckColors[i % truckColors.length],
                                                    opacity: activePreviewTruck !== null && activePreviewTruck !== i ? 0.01 : 0.06,
                                                    strokeOpacity: activePreviewTruck !== null && activePreviewTruck !== i ? 0.05 : 0.35
                                                },
                                                geometry: { type: 'Polygon' as const, coordinates: [generateCircleCoords(stop.lon, stop.lat, 1.5)] }
                                            }))
                                        )
                                    ]
                                }}>
                                    <Layer id="preview-geo-fill" type="fill" paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'opacity'] }} />
                                    <Layer id="preview-geo-line" type="line" paint={{ 'line-color': ['get', 'color'], 'line-width': 1.5, 'line-dasharray': [3, 2], 'line-opacity': ['get', 'strokeOpacity'] }} />
                                </Source>

                                <Source id="preview-zones" type="geojson" data={buildZonesGeoJSON()}>
                                    <Layer id="preview-zones-fill" type="fill" paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.08 }} />
                                    <Layer id="preview-zones-line" type="line" paint={{ 'line-color': ['get', 'color'], 'line-width': 1.5, 'line-dasharray': [4, 3], 'line-opacity': 0.4 }} />
                                </Source>

                                {zonePolygons.map((z: typeof zonePolygons[0]) => {
                                    const cX = z.coordinates.reduce((s: number, c: [number, number]) => s + c[0], 0) / z.coordinates.length;
                                    const cY = z.coordinates.reduce((s: number, c: [number, number]) => s + c[1], 0) / z.coordinates.length;
                                    return (
                                        <Marker key={`pz-${z.name}`} longitude={cX} latitude={cY} anchor="center">
                                            <div style={{ background: `${z.color}22`, border: `1px solid ${z.color}66`, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 800, color: z.color, textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>{z.name}</div>
                                        </Marker>
                                    );
                                })}

                                <Marker longitude={DEPO_LON} latitude={DEPO_LAT} anchor="center" onClick={() => setPopupInfo({ type: 'depo' })}>
                                    {createNumberedIcon('0', '#1e293b', true, false, false)}
                                </Marker>

                                {previewData.jadwal_truk_internal.map((truk: any, i: number) => {
                                    const color = truckColors[i % truckColors.length];
                                    const isDimmed = activePreviewTruck !== null && activePreviewTruck !== i;
                                    const isBlinking = activePreviewTruck === i;

                                    return (
                                        <React.Fragment key={i}>
                                            {truk.detail_perjalanan.map((stop: any, j: number) => {
                                                if (stop.urutan === 0) return null;
                                                return (
                                                    <Marker
                                                        key={`${i}-${j}`}
                                                        longitude={stop.lon}
                                                        latitude={stop.lat}
                                                        anchor="bottom"
                                                        onClick={(e) => {
                                                            e.originalEvent.stopPropagation();
                                                            setPopupInfo({ type: 'stop', data: { ...stop, longitude: stop.lon, latitude: stop.lat, nama_toko: stop.nama_toko || stop.lokasi }, routeColor: color, routeKendaraan: truk.armada, routeDriver: truk.supir || '-' });
                                                        }}
                                                    >
                                                        {createNumberedIcon(stop.urutan, color, false, isDimmed, isBlinking)}
                                                    </Marker>
                                                )
                                            })}
                                        </React.Fragment>
                                    )
                                })}

                                {previewData.dropped_nodes_peta && previewData.dropped_nodes_peta.map((drop: any, k: number) => {
                                    if (!drop.lat || !drop.lon) return null;
                                    return (
                                        <Marker
                                            key={`drop-${k}`}
                                            longitude={drop.lon}
                                            latitude={drop.lat}
                                            anchor="bottom"
                                            onClick={(e) => {
                                                e.originalEvent.stopPropagation();
                                                setPopupInfo({ type: 'dropped', data: drop });
                                            }}
                                        >
                                            {createNumberedIcon('✖', '#334155')}
                                        </Marker>
                                    )
                                })}

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
                                        ) : popupInfo.type === 'dropped' ? (
                                            <div style={{ padding: 16, minWidth: 220 }}>
                                                <div style={{ background: '#991b1b', borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 900, color: '#fecaca', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 10 }}>⚠ Toko Terbuang AI</div>
                                                <div style={{ fontWeight: 800, fontSize: 13, color: '#fff', marginBottom: 6 }}>{popupInfo.data.nama_toko}</div>
                                                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                                                    <span style={{ background: '#1e293b', border: '1px solid #374151', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#f59e0b' }}>📦 {popupInfo.data.berat_kg} KG</span>
                                                </div>
                                                <div style={{ background: '#1e293b', borderRadius: 8, padding: 8, border: '1px solid #374151', fontSize: 11, color: '#f87171', fontStyle: 'italic' }}>"{popupInfo.data.alasan}"</div>
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
                                                <div style={{ fontWeight: 800, fontSize: 13, color: '#fff', marginBottom: 8 }}>{popupInfo.data.nama_toko}</div>
                                                <div style={{ background: '#1e293b', borderRadius: 8, padding: 10, border: '1px solid #374151', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#10b981' }}>distance</span>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Segment Distance</div>
                                                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Dari stop sebelumnya</div>
                                                    </div>
                                                    <div style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>{popupInfo.data.distance_from_prev_km || popupInfo.data.seg_km || '0.0'}<span style={{ fontSize: 14 }}> KM</span></div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <span style={{ background: '#1e293b', border: '1px solid #374151', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#f59e0b' }}>📦 {popupInfo.data.berat_kg || '-'} KG</span>
                                                    <span style={{ background: '#1e293b', border: '1px solid #374151', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#3b82f6' }}>⏰ {popupInfo.data.jam_tiba?.substring(0, 5) || popupInfo.data.jam?.substring(0, 5) || '-'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </Popup>
                                )}
                            </Map>

                            <div className="absolute bottom-8 right-8 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] border-2 border-slate-200 dark:border-slate-700 max-h-[400px] overflow-y-auto w-[320px] transition-all">
                                <h4 className="text-xs font-black uppercase text-slate-500 mb-4 tracking-wider flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                                    <span className="flex items-center gap-2"><span className="material-symbols-outlined text-base">local_shipping</span> Rute Truk</span>
                                    <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded animate-pulse">Klik untuk Fokus</span>
                                </h4>
                                <div className="space-y-3">
                                    {previewData.jadwal_truk_internal.map((truk: any, i: number) => {
                                        const isThisSelected = activePreviewTruck === i;
                                        const isOtherSelected = activePreviewTruck !== null && !isThisSelected;

                                        return (
                                            <div
                                                key={i}
                                                onClick={() => setActivePreviewTruck(isThisSelected ? null : i)}
                                                className={`flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer select-none
                                                    ${isThisSelected ? 'bg-slate-100 dark:bg-slate-800 border-primary ring-2 ring-primary/20 scale-[1.02] shadow-md' : ''}
                                                    ${isOtherSelected ? 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-primary/50'}
                                                `}
                                            >
                                                <div className={`w-6 h-6 rounded-full shadow-md border-2 border-white shrink-0 ${isThisSelected ? 'animate-pulse' : ''}`} style={{ backgroundColor: truckColors[i % truckColors.length] }}></div>
                                                <div className="flex-1">
                                                    <span className="text-sm font-black text-slate-800 dark:text-white block leading-tight mb-1.5">{truk.armada}</span>
                                                    <div className="flex gap-2 text-[10px] font-bold">
                                                        <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[10px]">inventory_2</span> {truk.total_muatan_kg} KG
                                                        </span>
                                                        <span className="bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[10px]">route</span> {truk.total_jarak_km} KM
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showVerificationModal && uploadReport && (
                <UploadVerificationModal
                    uploadReport={uploadReport as any}
                    onClose={() => setShowVerificationModal(false)}
                    onUpdateTime={handleTimeChange}
                    onUpdateWeight={async (id, w) => { await api.put(`/api/orders/${id}/weight`, { weight: w }).catch(console.error); }}
                    onUpdateSuccessCoord={async (id, lat, lon) => { 
                        await api.put(`/api/orders/${id}/coordinate`, { latitude: lat, longitude: lon }).catch(console.error);
                    }}
                    onSaveCoord={async (idx, code, name, lat, lon) => { 
                        // Simulate setting failed coords state since it's handled inside the modal or we can adapt
                        // We will just call the API directly here to simplify for the imported modal
                        try {
                            const payload = { latitude: lat, longitude: lon, kode_customer: code, nama_customer: name };
                            await api.put(`/api/orders/DRAFT-${idx}/coordinate`, payload);
                            return true;
                        } catch (error) {
                            console.error(error);
                            alert("Gagal save koordinat");
                            return false;
                        }
                    }}
                    onOptimize={handleOptimizeRoute}
                />
            )}

            {activeModal && (
                <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActiveModal(null)}>
                    <div className="bg-white dark:bg-[#1F1F1F] rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-[#333] overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-200 dark:border-[#333] flex justify-between items-center bg-slate-50 dark:bg-[#1A1A1A]">
                            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                {activeModal === 'cost' && <><span className="material-symbols-outlined text-primary">payments</span> Rincian Cost Estimation</>}
                                {activeModal === 'distance' && <><span className="material-symbols-outlined text-primary">route</span> Rincian Total Distance</>}
                                {activeModal === 'fleet' && <><span className="material-symbols-outlined text-primary">local_shipping</span> Rincian Active Fleet</>}
                                {activeModal === 'stops' && <><span className="material-symbols-outlined text-primary">inventory_2</span> Rincian Total Stops</>}
                            </h3>
                            <button onClick={() => setActiveModal(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-[#333] rounded-lg text-slate-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-[#333] text-slate-500 text-sm">
                                        <th className="pb-3 font-semibold">Truk (Nopol)</th>
                                        <th className="pb-3 font-semibold">Driver</th>
                                        {activeModal === 'cost' && <th className="pb-3 font-semibold text-right">Estimasi Biaya</th>}
                                        {activeModal === 'distance' && <th className="pb-3 font-semibold text-right">Jarak Tempuh</th>}
                                        {activeModal === 'fleet' && <th className="pb-3 font-semibold text-right">Tipe Armada</th>}
                                        {activeModal === 'stops' && <th className="pb-3 font-semibold text-right">Jumlah Toko</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayRoutes.map((route, i) => (
                                        <tr key={i} className="border-b border-slate-100 dark:border-[#222] last:border-0 hover:bg-slate-50 dark:hover:bg-[#2A2A2A]">
                                            <td className="py-3 font-bold dark:text-white">{route.kendaraan}</td>
                                            <td className="py-3 text-slate-600 dark:text-slate-300">{route.driver_name}</td>
                                            {activeModal === 'cost' && <td className="py-3 text-right font-mono text-emerald-600">Rp {(route.total_distance_km * 3500).toLocaleString('id-ID')}</td>}
                                            {activeModal === 'distance' && <td className="py-3 text-right font-mono text-blue-500">{route.total_distance_km || '0'} KM</td>}
                                            {activeModal === 'fleet' && <td className="py-3 text-right text-slate-500">{route.jenis}</td>}
                                            {activeModal === 'stops' && <td className="py-3 text-right font-bold text-primary">{route.destinasi_jumlah} Toko</td>}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50 dark:bg-[#1A1A1A] border-t-2 border-slate-300 dark:border-[#444]">
                                        <td colSpan={2} className="py-3 font-black text-slate-900 dark:text-white uppercase text-sm">TOTAL</td>
                                        {activeModal === 'cost' && <td className="py-3 text-right font-black text-emerald-600 text-lg">Rp {totalCost}</td>}
                                        {activeModal === 'distance' && <td className="py-3 text-right font-black text-blue-500 text-lg">{totalRealDistance} KM</td>}
                                        {activeModal === 'fleet' && <td className="py-3 text-right font-black text-primary text-lg">{totalFleet} Unit</td>}
                                        {activeModal === 'stops' && <td className="py-3 text-right font-black text-primary text-lg">{totalOrders} Toko</td>}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {(isUploading || isOptimizing) && (
                <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                    {isUploading ? (
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mb-6"></div>
                    ) : (
                        <div className="text-6xl animate-bounce mb-6">🚚</div>
                    )}
                    <h3 className="text-xl font-bold text-white tracking-widest uppercase mb-2 text-center">
                        {isUploading ? 'Sedang melakukan routing...' : 'AI SEDANG MENGHITUNG RUTE TERBAIK...'}
                    </h3>
                    {isOptimizing && (
                        <p className="text-slate-400 mb-8 text-sm animate-pulse">
                            Memproses matriks jalan dan menyeimbangkan beban JAPFA
                        </p>
                    )}
                    {isOptimizing && (
                        <div className="w-full max-w-md bg-slate-800 rounded-full h-6 overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.3)] border border-slate-700">
                            <div className="bg-primary h-full transition-all duration-300 ease-out flex items-center justify-end relative" style={{ width: `${loadingProgress}%` }}>
                                <div className="absolute right-0 top-0 bottom-0 w-10 bg-white/20 blur-sm"></div>
                                <span className="text-[10px] text-white font-black mr-3 drop-shadow-md">
                                    {loadingProgress}%
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {routeMessage && (
                    <div className={`px-5 py-3 rounded-xl text-sm font-bold border flex items-center gap-3 shadow-sm ${String(routeMessage).includes('PERHATIAN') ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-emerald-50 text-emerald-700 border-emerald-300'}`}>
                        <span className="material-symbols-outlined text-xl">{String(routeMessage).includes('PERHATIAN') ? 'warning' : 'check_circle'}</span>
                        {String(routeMessage)}
                    </div>
                )}
                <div className="flex justify-between items-center bg-white dark:bg-[#1F1F1F] p-4 rounded-xl border border-slate-200 dark:border-[#333] shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">hub</span>
                        <h3 className="font-bold text-slate-800 dark:text-white">Route Management</h3>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-[#111] px-2 py-1 rounded">{new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => {
                            if (displayRoutes.length === 0) { alert('Belum ada data rute untuk di-download.'); return; }
                            const header = 'Nopol,Driver,Tipe,Zone,Jumlah Toko,Total Berat (KG),Jarak (KM)\n';
                            const rows = displayRoutes.map(r => `${r.kendaraan},${r.driver_name},${r.jenis},${r.zone},${r.destinasi_jumlah},${r.total_berat},${r.total_distance_km}`).join('\n');
                            const blob = new Blob([header + rows], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a'); a.href = url; a.download = `DO_${selectedDate}.csv`; a.click(); URL.revokeObjectURL(url);
                        }} className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-bold rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">download</span> Download DO
                        </button>
                        <button type="button" onClick={handleUploadClick} disabled={isUploading} className="px-5 py-2.5 bg-primary text-white font-bold rounded-lg hover:brightness-110 transition-all text-sm flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50">
                            <span className="material-symbols-outlined text-lg">upload_file</span> Upload SAP Excel
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx" onChange={handleFileUpload} />
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-6">
                    <div onClick={() => setActiveModal('cost')} className="bg-white dark:bg-[#1F1F1F] p-5 rounded-xl border border-slate-200 dark:border-[#333] shadow-sm cursor-pointer hover:border-primary transition-all">
                        <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cost Estimation</span><span className="material-symbols-outlined text-slate-300">payments</span></div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">Rp {totalCost}</div><div className="mt-2 text-[10px] text-primary">Klik rincian ↗</div>
                    </div>
                    <div onClick={() => setActiveModal('distance')} className="bg-white dark:bg-[#1F1F1F] p-5 rounded-xl border border-slate-200 dark:border-[#333] shadow-sm cursor-pointer hover:border-primary transition-all">
                        <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Distance</span><span className="material-symbols-outlined text-slate-300">route</span></div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{totalRealDistance} <span className="text-lg">KM</span></div><div className="mt-2 text-[10px] text-primary">Klik rincian ↗</div>
                    </div>
                    <div onClick={() => setActiveModal('fleet')} className="bg-white dark:bg-[#1F1F1F] p-5 rounded-xl border border-slate-200 dark:border-[#333] shadow-sm cursor-pointer hover:border-primary transition-all">
                        <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Fleet</span><span className="material-symbols-outlined text-slate-300">local_shipping</span></div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalFleet} Trucks</div><div className="mt-2 text-[10px] text-primary">Klik rincian ↗</div>
                    </div>
                    <div onClick={() => setActiveModal('stops')} className="bg-white dark:bg-[#1F1F1F] p-5 rounded-xl border border-slate-200 dark:border-[#333] shadow-sm cursor-pointer hover:border-primary transition-all">
                        <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Stops</span><span className="material-symbols-outlined text-slate-300">inventory_2</span></div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalOrders} Destinations</div><div className="mt-2 text-[10px] text-primary">Klik rincian ↗</div>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-8 items-start pb-4">
                    {!isFocusMode && (
                        <div className="col-span-3 space-y-4 transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><span className="material-symbols-outlined text-slate-400">local_shipping</span> Today's Fleet</h3>
                            </div>
                            <TruckList 
                                routesData={displayRoutes as any} 
                                selectedRouteId={selectedRouteId} 
                                onSelectRoute={(id) => { setSelectedRouteId(id); setExpandedStopIdx(null); }}
                                trafficWarnings={trafficWarnings as any}
                            />
                        </div>
                    )}

                    <div className={`${isFocusMode ? 'col-span-12' : 'col-span-9'} space-y-4 transition-all duration-300`}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><span className="material-symbols-outlined text-slate-400">timeline</span> Route Sequence {selectedRoute && `- ${selectedRoute.kendaraan}`}</h3>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => isReassignMode ? exitReassignMode(false) : enterReassignMode()} className={`px-3 py-1.5 border rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${isReassignMode ? 'bg-violet-500 text-white border-violet-500 shadow-md shadow-violet-500/20 animate-pulse' : 'border-violet-200 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800'}`}>
                                    <span className="material-symbols-outlined text-base">swap_horiz</span>
                                    {isReassignMode ? 'Exit Reassign' : 'Reassign Stops'}
                                </button>
                                <button type="button" onClick={() => setIsFocusMode(!isFocusMode)} className={`px-3 py-1.5 border rounded-lg text-sm font-bold transition-colors flex items-center gap-1 ${isFocusMode ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:hover:bg-[#1A1A1A] dark:text-slate-300 dark:border-[#333]'}`}>
                                    <span className="material-symbols-outlined text-base">{isFocusMode ? 'fullscreen_exit' : 'fullscreen'}</span>
                                    {isFocusMode ? 'Normal View' : 'Focus Mode'}
                                </button>
                                <div className="flex bg-slate-100 dark:bg-[#1A1A1A] p-1 rounded-lg">
                                    <button type="button" onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>List View</button>
                                    <button type="button" onClick={() => setViewMode('map')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${viewMode === 'map' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Route Map</button>
                                    <button type="button" onClick={() => setViewMode('live')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors flex items-center gap-1 ${viewMode === 'live' ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20' : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'}`}><span className="w-2 h-2 rounded-full bg-current animate-pulse"></span> Live Fleet</button>
                                </div>
                            </div>
                        </div>

                        {isReassignMode && (
                            <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                                            <span className="material-symbols-outlined text-white text-xl">swap_horiz</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-violet-800 dark:text-violet-300 text-sm">Reassign Mode Active</h4>
                                            <p className="text-xs text-violet-500">Klik tombol <strong>↗ Transfer</strong> pada stop untuk pindahkan ke truk lain</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {reassignHistory.length > 0 && (
                                            <span className="text-xs font-bold text-violet-600 bg-violet-100 dark:bg-violet-900/40 px-3 py-1.5 rounded-lg">
                                                {reassignHistory.length} perubahan
                                            </span>
                                        )}
                                        <button onClick={() => exitReassignMode(false)} className="px-4 py-2 text-sm font-bold border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                                        <button onClick={() => exitReassignMode(true)} disabled={reassignHistory.length === 0} className="px-4 py-2 text-sm font-bold bg-violet-500 text-white rounded-lg hover:bg-violet-600 shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-base">save</span> Simpan
                                        </button>
                                    </div>
                                </div>
                                {reassignHistory.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {reassignHistory.map((h, i) => (
                                            <span key={i} className="text-[11px] font-mono font-bold bg-white dark:bg-[#1A1A1A] border border-violet-200 dark:border-violet-700 text-violet-700 dark:text-violet-300 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                                <span className="material-symbols-outlined text-xs">swap_horiz</span>{h}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#333] rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                            {viewMode === 'map' ? (
                                <div className="flex-1 bg-slate-100 dark:bg-[#1A1A1A] flex flex-col relative w-full h-[500px] z-0">
                                    <MapComponent
                                        key="map-toggle-view"
                                        routesData={displayRoutes}
                                        selectedRouteId={selectedRouteId}
                                        truckColors={truckColors}
                                        droppedNodesData={droppedNodes}
                                        hasDummyData={hasDummyData}
                                    />
                                    {displayRoutes.length > 0 && (
                                        <div className="absolute bottom-6 right-6 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-4 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[250px] overflow-y-auto min-w-[200px] transition-all">
                                            <h4 className="text-[10px] font-black uppercase text-slate-500 mb-3 tracking-wider flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">local_shipping</span> Rute Aktif</span>
                                                <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded">Pilih Manual</span>
                                            </h4>
                                            <div className="space-y-2">
                                                {displayRoutes.map((truk, i) => {
                                                    const isThisSelected = selectedRouteId === truk.route_id;
                                                    return (
                                                        <div key={i} onClick={() => setSelectedRouteId(isThisSelected ? null : truk.route_id)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${isThisSelected ? 'bg-slate-100 dark:bg-slate-800 border border-primary scale-105 shadow-sm' : ''}`}>
                                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: truckColors[i % truckColors.length] }}></div>
                                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{truk.kendaraan}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : viewMode === 'live' ? (
                                <div className="flex-1 bg-slate-100 dark:bg-[#1A1A1A] flex flex-col relative w-full h-[500px] z-0">
                                    <FleetTrackingMap />
                                </div>
                            ) : (
                                selectedRoute ? (
                                    <div className="p-8 flex-1 overflow-y-auto max-h-[600px]">
                                        <div className="space-y-0 relative">
                                            <div className="absolute left-[9px] top-2 bottom-6 w-0.5 bg-slate-200 dark:bg-slate-700 border-l-2 border-dashed border-slate-200 dark:border-[#333] -z-10"></div>
                                            <div className="relative pl-10 pb-10">
                                                <div className="absolute left-[-11px] top-0 w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center ring-4 ring-white dark:ring-[#1F1F1F]"><span className="text-[10px] text-white font-bold">0</span></div>
                                                <div className="flex justify-between items-start">
                                                    <div><h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">Main Distribution Center</h4><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gudang JAPFA Cikupa</p>
                                                        <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 bg-slate-100 dark:bg-[#1A1A1A] text-slate-600 dark:text-slate-300 text-[11px] font-bold rounded"><span className="material-symbols-outlined text-xs">inventory</span> TOTAL MUATAN: {selectedRoute.total_berat} KG</div></div>
                                                    <div className="text-right"><span className="text-sm font-bold text-slate-900 dark:text-white">06:00 AM</span><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Berangkat</p></div>
                                                </div>
                                            </div>
                                            {selectedRoute.detail_rute.map((stop, idx) => (
                                                <div key={idx} className="relative pl-10 pb-10">
                                                    <div className="absolute left-[-11px] top-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 ring-4 ring-white dark:ring-[#1F1F1F] cursor-pointer hover:scale-110 transition-transform" onClick={() => setExpandedStopIdx(expandedStopIdx === idx ? null : idx)}>
                                                        <span className="text-[10px] text-white font-bold">{idx + 1}</span>
                                                    </div>
                                                    <div className="flex justify-between items-start cursor-pointer group" onClick={() => setExpandedStopIdx(expandedStopIdx === idx ? null : idx)}>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors flex items-center gap-2">
                                                                {stop.nama_toko}
                                                                <span className={`material-symbols-outlined text-lg transition-transform ${expandedStopIdx === idx ? 'rotate-180' : ''}`}>expand_more</span>
                                                            </h4>
                                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono text-[11px]">📍 GPS: {stop.latitude}, {stop.longitude}</p>
                                                            <div className="mt-3 flex gap-3">
                                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                                    <span className="material-symbols-outlined text-xs">package_2</span> {stop.berat_kg} KG Total Turun
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-sm font-bold text-primary">{formatTimeWindow(stop.jam_tiba, stop.berat_kg)}</span>
                                                            <p className="text-[10px] text-primary font-bold uppercase mt-1">Est. Time Window</p>
                                                            {isReassignMode && (
                                                                <button onClick={(e) => { e.stopPropagation(); setTransferStop({ routeId: selectedRoute!.route_id, stopIdx: idx, stop }); }} className="mt-2 px-3 py-1.5 bg-violet-500 text-white text-[11px] font-bold rounded-lg hover:bg-violet-600 shadow-lg shadow-violet-500/25 flex items-center gap-1 transition-all hover:scale-105">
                                                                    <span className="material-symbols-outlined text-sm">north_east</span> Transfer
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {expandedStopIdx === idx && stop.items && stop.items.length > 0 && (
                                                        <div className="mt-4 bg-slate-50 dark:bg-[#1A1A1A] rounded-xl border border-slate-200 dark:border-[#333] p-4 animate-in slide-in-from-top-2 fade-in duration-200">
                                                            <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2 uppercase">
                                                                <span className="material-symbols-outlined text-sm">receipt_long</span> Rincian Produk Dikirim:
                                                            </h5>
                                                            <ul className={`grid gap-2 ${isFocusMode ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                                {stop.items.map((product, prodIdx) => (
                                                                    <li key={prodIdx} className="flex justify-between items-center text-sm border-b border-slate-200 dark:border-[#333] pb-2">
                                                                        <span className="text-slate-600 dark:text-slate-300 font-medium">{String(product.nama_barang)}</span>
                                                                        <span className="font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-[#111] px-2 py-1 rounded">{String(product.qty)}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 flex-1 flex flex-col items-center justify-center text-slate-500 opacity-60">
                                        <span className="material-symbols-outlined text-5xl mb-3">touch_app</span>
                                        <h4 className="font-bold">Pilih Truk di sebelah kiri untuk melihat urutan</h4>
                                    </div>
                                )
                            )}
                            <div className="bg-slate-50 dark:bg-[#1A1A1A] p-6 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-[#333]">
                                <button type="button" onClick={() => selectedRoute && generateSuratJalanPDF(selectedRoute)} disabled={!selectedRoute} className="px-6 py-2.5 bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-[#333] text-slate-700 dark:text-white font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-[#2A2A2A] text-sm flex items-center gap-2 disabled:opacity-50 transition-colors">
                                    <span className="material-symbols-outlined text-lg">picture_as_pdf</span> Cetak Surat Jalan (PDF)
                                </button>
                                <button type="button" onClick={() => { if (!selectedRoute) return; alert(`Jadwal BERHASIL dikirim ke aplikasi driver ${selectedRoute.driver_name}!`); }} disabled={!selectedRoute} className="px-8 py-2.5 bg-primary text-white font-bold rounded-lg hover:brightness-110 text-sm shadow-lg shadow-primary/25 flex items-center gap-2 disabled:opacity-50 transition-all hover:scale-105 active:scale-95">
                                    <span className="material-symbols-outlined text-lg">done_all</span> Kirim ke HP Supir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {droppedNodes.length > 0 && (
                    <div className="mt-8 bg-white dark:bg-[#1F1F1F] rounded-2xl border border-rose-200 dark:border-rose-900/30 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-rose-500">warning</span> Gagal AI Routing
                                <span className="text-xs font-bold bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full ml-2">{droppedNodes.length} Toko</span>
                            </h3>
                            <button className="px-4 py-2 bg-slate-100 dark:bg-[#1A1A1A] text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-[#2A2A2A] transition-all flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">print</span> Cetak List
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {droppedNodes.map((node, i) => (
                                <div key={i} className="p-3 bg-slate-50 dark:bg-[#1A1A1A] rounded-xl border border-slate-200 dark:border-[#333] hover:border-rose-300 dark:hover:border-rose-800 transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-sm font-bold text-slate-800 dark:text-white">{node.nama_toko}</span>
                                        <span className="text-[10px] font-bold bg-slate-200 dark:bg-[#333] px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">{node.berat_kg} KG</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium bg-white dark:bg-[#111] p-2 rounded-lg border border-slate-100 dark:border-slate-800 italic">
                                        <span className="material-symbols-outlined text-xs text-rose-500">info</span>
                                        "{node.alasan}"
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* 🔀 TRANSFER MODAL */}
            {transferStop && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setTransferStop(null)}>
                    <div className="bg-white dark:bg-[#1F1F1F] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#333] w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-5 text-white">
                            <h3 className="font-bold text-lg flex items-center gap-2"><span className="material-symbols-outlined">swap_horiz</span> Transfer Stop</h3>
                            <p className="text-violet-100 text-sm mt-1">Pindahkan <strong>{transferStop.stop.nama_toko}</strong> ({transferStop.stop.berat_kg} KG) ke truk lain</p>
                        </div>
                        <div className="p-5 space-y-3 max-h-[400px] overflow-y-auto">
                            {displayRoutes.filter(r => r.route_id !== transferStop.routeId).map((route) => {
                                const newLoad = route.total_berat + transferStop.stop.berat_kg;
                                const maxCap = route.capacity || 2000;
                                const loadPct = Math.round((newLoad / maxCap) * 100);
                                const isOver = loadPct > 100;
                                return (
                                    <button key={route.route_id} onClick={() => handleTransferStop(route.route_id)} disabled={isOver}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all group ${isOver ? 'border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-900/10 opacity-60 cursor-not-allowed' : 'border-slate-200 dark:border-[#333] hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-lg hover:shadow-violet-500/10 hover:scale-[1.02]'}`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${isOver ? 'bg-rose-500' : 'bg-slate-800 dark:bg-slate-700'}`}>
                                                    <span className="material-symbols-outlined">local_shipping</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-800 dark:text-white text-sm">{route.kendaraan}</span>
                                                    <p className="text-xs text-slate-400">{route.driver_name} · {route.destinasi_jumlah} stops</p>
                                                </div>
                                            </div>
                                            {isOver ? (
                                                <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-600 px-2 py-1 rounded-lg">OVERLOAD</span>
                                            ) : (
                                                <span className="material-symbols-outlined text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-[11px] font-bold">
                                                <span className="text-slate-500">Load setelah transfer</span>
                                                <span className={isOver ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}>{newLoad} / {maxCap} KG ({loadPct}%)</span>
                                            </div>
                                            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all ${isOver ? 'bg-rose-500' : loadPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(loadPct, 100)}%` }}></div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-[#333] flex justify-end">
                            <button onClick={() => setTransferStop(null)} className="px-5 py-2 text-sm font-bold border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">Batal</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}