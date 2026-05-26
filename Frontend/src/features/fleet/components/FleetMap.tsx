// src/features/fleet/components/FleetMap.tsx
import React, { useState, useRef, useEffect } from "react";
import Map, { Marker, Popup } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { FleetVehicle } from "../types";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const DEPO_LON = 106.479163;
const DEPO_LAT = -6.207356;

interface FleetMapProps {
    fleetList: FleetVehicle[];
    selectedTruck: FleetVehicle | null;
    onSelectTruck: (truck: FleetVehicle) => void;
}

const css = `
    @keyframes markerBlink { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 transparent; } 50% { transform: scale(1.15); box-shadow: 0 0 15px currentColor; } }
    .blinking-marker { animation: markerBlink 1s ease-in-out infinite; z-index: 9999 !important; position: relative; }
    
    @keyframes dangerPulse { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
    .danger-marker { animation: dangerPulse 1.5s infinite; border: 2px solid white !important; }
    
    .dimmed-marker { opacity: 0.4; filter: grayscale(50%); }
    .depo-ring { position: absolute; inset: -6px; border-radius: 50%; border: 2px dashed rgba(239,68,68,0.5); animation: depoSpin 10s linear infinite; }
    @keyframes depoSpin { 100% { transform: rotate(360deg); } }
`;

export default function FleetMap({ fleetList, selectedTruck, onSelectTruck }: FleetMapProps) {
    const mapRef = useRef<MapRef>(null);
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
    const [viewState, setViewState] = useState({
        longitude: DEPO_LON,
        latitude: DEPO_LAT,
        zoom: 10
    });
    const [popupInfo, setPopupInfo] = useState<FleetVehicle | null>(null);

    // Watch for class changes on document.documentElement for dynamic map theme updates
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Sync viewport with selected truck
    useEffect(() => {
        if (selectedTruck && selectedTruck.latitude && selectedTruck.longitude && mapRef.current) {
            mapRef.current.flyTo({
                center: [selectedTruck.longitude, selectedTruck.latitude],
                zoom: 11.5,
                duration: 1500
            });
            setPopupInfo(selectedTruck);
        }
    }, [selectedTruck]);

    const handleZoomIn = () => {
        if (mapRef.current) {
            mapRef.current.zoomIn({ duration: 300 });
        }
    };

    const handleZoomOut = () => {
        if (mapRef.current) {
            mapRef.current.zoomOut({ duration: 300 });
        }
    };

    const handleReset = () => {
        if (mapRef.current) {
            mapRef.current.flyTo({
                center: [DEPO_LON, DEPO_LAT],
                zoom: 10,
                duration: 1500
            });
        }
        setPopupInfo(null);
    };

    const healthyCount = fleetList.filter(t => t.tempStatus === 'Healthy' || !t.tempStatus).length;
    const warningCount = fleetList.filter(t => t.tempStatus === 'Warning').length;
    const criticalCount = fleetList.filter(t => t.tempStatus === 'Critical').length;

    return (
        <div className="w-full h-full min-h-[480px] relative overflow-hidden transition-all duration-300">
            <style>{css}</style>
            
            <Map
                ref={mapRef}
                {...viewState}
                onMove={(e: any) => setViewState(e.viewState)}
                style={{ width: '100%', height: '100%' }}
                mapStyle={isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11"}
                mapboxAccessToken={MAPBOX_TOKEN}
            >
                {/* Depo Marker */}
                <Marker longitude={DEPO_LON} latitude={DEPO_LAT} anchor="center">
                    <div 
                        onClick={handleReset}
                        className="cursor-pointer"
                        style={{ 
                            width: 36, 
                            height: 36, 
                            borderRadius: '50%', 
                            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', 
                            border: '3px solid white', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            color: 'white', 
                            fontSize: 16, 
                            boxShadow: '0 4px 15px rgba(59,130,246,0.5)', 
                            position: 'relative' 
                        }}
                    >
                        🏢
                        <div className="depo-ring"></div>
                    </div>
                </Marker>

                {/* Truck Markers */}
                {fleetList.map((truck) => {
                    const lat = truck.latitude || DEPO_LAT;
                    const lon = truck.longitude || DEPO_LON;
                    const isSelected = selectedTruck?.id === truck.id;
                    const isDimmed = selectedTruck !== null && !isSelected;

                    let markerColor = '#10b981'; // Healthy
                    let isDanger = false;

                    if (truck.tempStatus === 'Warning') {
                        markerColor = '#FF7A00';
                    } else if (truck.tempStatus === 'Critical') {
                        markerColor = '#ef4444';
                        isDanger = true;
                    }

                    return (
                        <Marker 
                            key={truck.id} 
                            longitude={lon} 
                            latitude={lat} 
                            anchor="center"
                        >
                            <div 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectTruck(truck);
                                    setPopupInfo(truck);
                                }}
                                className={`cursor-pointer transition-all duration-300 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-20'} ${isDimmed ? 'dimmed-marker' : ''}`}
                            >
                                <div 
                                    className={`relative flex items-center justify-center rounded-full border-2 border-white shadow-lg ${isDanger ? 'danger-marker' : ''} ${isSelected ? 'blinking-marker' : ''}`}
                                    style={{ 
                                        width: 28, 
                                        height: 28, 
                                        backgroundColor: markerColor,
                                        color: 'white'
                                    }}
                                >
                                    <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                                </div>
                            </div>
                        </Marker>
                    );
                })}

                {/* Info Popup */}
                {popupInfo && (
                    <Popup
                        longitude={popupInfo.longitude || DEPO_LON}
                        latitude={popupInfo.latitude || DEPO_LAT}
                        onClose={() => setPopupInfo(null)}
                        closeOnClick={false}
                        anchor="bottom"
                        className="custom-popup z-[9999]"
                    >
                        <div className="p-2 space-y-2 min-w-[220px]">
                            <div className="flex justify-between items-center border-b pb-1 mb-1 border-slate-200 dark:border-slate-700">
                                <b className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase truncate flex items-center gap-1">
                                    🚚 {popupInfo.licensePlate}
                                </b>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                    popupInfo.status === 'Maintenance' ? 'bg-red-500/20 text-red-500' :
                                    popupInfo.status === 'On Trip' ? 'bg-blue-500/20 text-blue-500' :
                                    'bg-emerald-500/20 text-emerald-500'
                                }`}>
                                    {popupInfo.status}
                                </span>
                            </div>
                            
                            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">Driver:</span>
                                    <b className="font-semibold">{popupInfo.driverName || '-'}</b>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">Route:</span>
                                    <b className="font-semibold truncate max-w-[120px]">{popupInfo.routeName || '-'}</b>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">Speed:</span>
                                    <b className="font-semibold">{popupInfo.speedKmH || 0} km/h</b>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">Battery:</span>
                                    <b className="font-semibold">{popupInfo.batteryPct || 0}%</b>
                                </div>
                                <div className="flex justify-between items-center mt-1 border-t border-dashed border-slate-200 dark:border-slate-700 pt-1">
                                    <span className="text-slate-500 dark:text-slate-400">Cargo Temp:</span>
                                    <span className={`font-black ${
                                        popupInfo.tempStatus === 'Critical' ? 'text-red-500' :
                                        popupInfo.tempStatus === 'Warning' ? 'text-amber-500' :
                                        'text-emerald-500'
                                    }`}>
                                        {popupInfo.currentTemp?.toFixed(1)}°C
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Popup>
                )}
            </Map>

            {/* Map Controls */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10">
                <button 
                    onClick={handleZoomIn}
                    className="w-8 h-8 bg-white dark:bg-app-panel border border-slate-200 dark:border-app-border rounded-md flex items-center justify-center text-slate-700 hover:text-slate-900 dark:text-app-muted dark:hover:text-white shadow-md cursor-pointer hover:border-app-accent hover:bg-slate-50 dark:hover:bg-[#252830] active:scale-95 transition-transform"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                </button>
                <button 
                    onClick={handleZoomOut}
                    className="w-8 h-8 bg-white dark:bg-app-panel border border-slate-200 dark:border-app-border rounded-md flex items-center justify-center text-slate-700 hover:text-slate-900 dark:text-app-muted dark:hover:text-white shadow-md cursor-pointer hover:border-app-accent hover:bg-slate-50 dark:hover:bg-[#252830] active:scale-95 transition-transform"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M20 12H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                </button>
                <button 
                    onClick={handleReset}
                    className="w-8 h-8 bg-white dark:bg-app-panel border border-slate-200 dark:border-app-border rounded-md flex items-center justify-center text-slate-700 hover:text-slate-900 dark:text-app-muted dark:hover:text-white shadow-md mt-2 cursor-pointer hover:border-app-accent hover:bg-slate-50 dark:hover:bg-[#252830] active:scale-95 transition-transform"
                    title="Reset to Depo"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                </button>
            </div>

            {/* Map Legend */}
            <div className="absolute bottom-6 left-6 bg-white/95 dark:bg-app-panel/90 backdrop-blur-md border border-slate-200 dark:border-app-border rounded-full px-4 py-2 flex items-center gap-4 shadow-lg text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-app-green"></span> 
                    <span className="text-slate-600 dark:text-app-muted">Healthy</span> 
                    <span className="text-slate-900 dark:text-white ml-0.5">{healthyCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-app-orange"></span> 
                    <span className="text-slate-600 dark:text-app-muted">Warning</span> 
                    <span className="text-slate-900 dark:text-white ml-0.5">{warningCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-app-red"></span> 
                    <span className="text-slate-600 dark:text-app-muted">Critical</span> 
                    <span className="text-slate-900 dark:text-white ml-0.5">{criticalCount}</span>
                </div>
            </div>
        </div>
    );
}