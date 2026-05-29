// src/features/routes/components/RouteLoadingOverlay.tsx
import React, { useMemo } from 'react';
import Map, { Source, Layer } from 'react-map-gl/mapbox';

interface RouteLoadingOverlayProps {
    isUploading: boolean;
    isOptimizing: boolean;
    loadingProgress: number;
    // 🌟 FIX TS ERROR: Tambahin 'preview_zone' di sini biar TypeScript ga ngamuk!
    optimizationPhase?: 'idle' | 'zoning' | 'preview_zone' | 'balancing' | 'routing' | 'matching' | 'validating' | 'done';
    zoningData?: any; 
    truckColors?: string[];
}

export default function RouteLoadingOverlay({ 
    isUploading, isOptimizing, loadingProgress, 
    optimizationPhase = 'routing', zoningData, truckColors = [] 
}: RouteLoadingOverlayProps) {
    // 🌟 FIX LOGIC: Jangan nampilin overlay ini kalau lagi di fase 'preview_zone', 
    // karena di fase itu kita nampilin Modal Map yang beda (di RoutePlanningPage.tsx)
    if (!isUploading && !isOptimizing && optimizationPhase !== 'zoning') return null;

    const geoJsonData = useMemo(() => {
        if (!zoningData || zoningData.length === 0) return null;

        const features: any[] = [];
        zoningData.forEach((zone: any, i: number) => {
            const color = truckColors[i % truckColors.length] || '#3b82f6';
            zone.stores.forEach((store: any) => {
                features.push({
                    type: 'Feature',
                    properties: { color, type: 'point' },
                    geometry: { type: 'Point', coordinates: [store.lon, store.lat] }
                });
            });
            if (zone.bounding_polygon && zone.bounding_polygon.length >= 3) {
                const polyCoords = [...zone.bounding_polygon, zone.bounding_polygon[0]];
                features.push({
                    type: 'Feature',
                    properties: { color, type: 'polygon' },
                    geometry: { type: 'Polygon', coordinates: [polyCoords] }
                });
            }
        });
        return { type: 'FeatureCollection', features };
    }, [zoningData, truckColors]);

    // Mapbox cuma muncul kalau udah fase zoning dan datanya ada
    const isShowingMap = optimizationPhase === 'zoning' && geoJsonData !== null && !isUploading;

    return (
        <div className={`fixed inset-0 z-[99999] transition-all duration-700 ease-in-out ${isShowingMap ? 'bg-slate-900/60' : 'bg-slate-900/90'} flex flex-col items-center justify-center p-4 backdrop-blur-md overflow-hidden`}>
            
            {isShowingMap && (
                <div className="absolute inset-0 z-0 opacity-80 animate-in fade-in duration-1000">
                    <Map 
                        initialViewState={{ longitude: 106.82, latitude: -6.20, zoom: 10 }}
                        style={{ width: '100%', height: '100%' }}
                        mapStyle="mapbox://styles/mapbox/navigation-night-v1"
                        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                        interactive={false} 
                    >
                        <Source id="zoning" type="geojson" data={geoJsonData as any}>
                            <Layer id="zone-fill" type="fill" filter={['==', 'type', 'polygon']} paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.15 }} />
                            <Layer id="zone-line" type="line" filter={['==', 'type', 'polygon']} paint={{ 'line-color': ['get', 'color'], 'line-width': 2, 'line-dasharray': [4, 4] }} />
                            <Layer id="zone-point" type="circle" filter={['==', 'type', 'point']} paint={{ 'circle-radius': 4, 'circle-color': ['get', 'color'], 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' }} />
                        </Source>
                    </Map>
                </div>
            )}

            <div className={`relative z-10 flex flex-col items-center justify-center transition-all duration-500 ${isShowingMap ? 'translate-y-[20vh] bg-slate-900/80 p-6 rounded-2xl border border-slate-700 shadow-2xl' : ''}`}>
                {isUploading ? (
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mb-6"></div>
                ) : optimizationPhase === 'zoning' ? (
                    <div className="text-6xl mb-6 animate-pulse">🗺️</div>
                ) : optimizationPhase === 'balancing' ? (
                    <div className="text-6xl mb-6 animate-bounce">⚖️</div>
                ) : optimizationPhase === 'matching' ? (
                    <div className="text-6xl mb-6 animate-pulse">🤝</div>
                ) : optimizationPhase === 'validating' ? (
                    <div className="text-6xl mb-6 animate-ping">🛰️</div>
                ) : (
                    <div className="text-6xl animate-bounce mb-6">🚚</div>
                )}

                <h3 className="text-xl font-bold text-white tracking-widest uppercase mb-2 text-center drop-shadow-lg">
                    {isUploading 
                        ? 'MENGUNGGAH SAP KE DATABASE...' 
                        : optimizationPhase === 'zoning'
                            ? 'FASE 1: MEMETAAN ZONA PENGIRIMAN...'
                        : optimizationPhase === 'balancing'
                            ? 'FASE 2: MENYEIMBANGKAN BEBAN ZONA...'
                        : optimizationPhase === 'routing'
                            ? 'FASE 3: MENGHITUNG RUTE PER ZONA...'
                        : optimizationPhase === 'matching'
                            ? 'FASE 4: MENJODOHKAN ARMADA INTERNAL...'
                        : optimizationPhase === 'validating'
                            ? 'FASE 5: MEMVALIDASI KEMACETAN TOMTOM...'
                            : 'MENYIAPKAN MANIFEST...'}
                </h3>

                {isOptimizing && (
                    <p className="text-slate-300 mb-8 text-sm animate-pulse drop-shadow-md bg-slate-900/50 px-4 py-1 rounded-full">
                        {optimizationPhase === 'zoning'
                            ? 'Menganalisis persebaran order di Jabodetabek...'
                        : optimizationPhase === 'balancing'
                            ? 'Menggeser toko perbatasan agar kapasitas truk muat...'
                        : optimizationPhase === 'routing'
                            ? 'OR-Tools mencari jarak terpendek per wilayah...'
                        : optimizationPhase === 'matching'
                            ? 'Mencocokkan rute terberat dengan fuso kapasitas terbesar...'
                        : optimizationPhase === 'validating'
                            ? 'Mendeteksi potensi keterlambatan di jalan raya...'
                            : 'Memproses matriks jalan dan menyeimbangkan beban...'}
                    </p>
                )}

                {isOptimizing && (
                    <div className="w-full max-w-md bg-slate-800/80 rounded-full h-6 overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-slate-600 backdrop-blur-md">
                        <div
                            className="bg-primary h-full transition-all duration-300 ease-out flex items-center justify-end relative"
                            style={{ width: `${loadingProgress}%` }}
                        >
                            <div className="absolute right-0 top-0 bottom-0 w-10 bg-white/30 blur-sm"></div>
                            <span className="text-[10px] text-white font-black mr-3 drop-shadow-md">
                                {loadingProgress}%
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}