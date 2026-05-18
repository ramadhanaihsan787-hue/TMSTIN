// FleetTrackingMap placeholder - Live fleet tracking component
import { useState, useEffect, useMemo, useRef } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import {
    dummyFleet, DEPO_LON, DEPO_LAT,
    buildRoutesGeoJSON, buildGeofencesGeoJSON, buildZonesGeoJSON,
    zonePolygons, type TruckTracking
} from '../../dashboard/components/trackingData';

export default function FleetTrackingMap() {
    const mapRef = useRef<MapRef>(null);
    const [viewState, setViewState] = useState({ longitude: DEPO_LON, latitude: DEPO_LAT, zoom: 10 });
    const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (mapRef.current) mapRef.current.getMap().resize();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const routesGeoJSON = useMemo(() => buildRoutesGeoJSON(dummyFleet, selectedTruckId), [selectedTruckId]);
    const geofencesGeoJSON = useMemo(() => buildGeofencesGeoJSON(dummyFleet, selectedTruckId), [selectedTruckId]);
    const zonesGeoJSON = useMemo(() => buildZonesGeoJSON(), []);

    return (
        <div className="relative w-full h-full">
            <Map
                ref={mapRef}
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/dark-v11"
                mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
            >
                {/* Zone Polygons */}
                <Source id="live-zones" type="geojson" data={zonesGeoJSON}>
                    <Layer id="live-zones-fill" type="fill" paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.1 }} />
                    <Layer id="live-zones-line" type="line" paint={{ 'line-color': ['get', 'color'], 'line-width': 2, 'line-dasharray': [4, 3], 'line-opacity': 0.6 }} />
                </Source>

                {/* Route Lines */}
                <Source id="live-routes" type="geojson" data={routesGeoJSON}>
                    <Layer id="live-routes-glow" type="line" paint={{ 'line-color': ['get', 'color'], 'line-width': 12, 'line-opacity': 0.15, 'line-blur': 6 }} />
                    <Layer id="live-routes-main" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': ['get', 'color'], 'line-width': ['get', 'width'], 'line-opacity': ['get', 'opacity'], 'line-dasharray': [2, 2] }} />
                </Source>

                {/* Geofences */}
                <Source id="live-geofences" type="geojson" data={geofencesGeoJSON}>
                    <Layer id="live-geo-fill" type="fill" paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'opacity'] }} />
                    <Layer id="live-geo-line" type="line" paint={{ 'line-color': ['get', 'color'], 'line-width': 1.5, 'line-dasharray': [3, 2], 'line-opacity': ['get', 'strokeOpacity'] }} />
                </Source>

                {/* Depot */}
                <Marker longitude={DEPO_LON} latitude={DEPO_LAT} anchor="center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center border-3 border-rose-500 shadow-lg shadow-rose-500/40">
                        <span className="material-symbols-outlined text-rose-400 text-lg">warehouse</span>
                    </div>
                </Marker>

                {/* Zone Labels */}
                {zonePolygons.map((z: typeof zonePolygons[0]) => {
                    const cX = z.coordinates.reduce((s: number, c: [number, number]) => s + c[0], 0) / z.coordinates.length;
                    const cY = z.coordinates.reduce((s: number, c: [number, number]) => s + c[1], 0) / z.coordinates.length;
                    return (
                        <Marker key={z.name} longitude={cX} latitude={cY} anchor="center">
                            <div style={{ background: `${z.color}22`, border: `1px solid ${z.color}66`, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 800, color: z.color, textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>{z.name}</div>
                        </Marker>
                    );
                })}

                {/* Live Truck Positions */}
                {dummyFleet.map((truck: TruckTracking) => {
                    const isSelected = selectedTruckId === truck.id;
                    const isDimmed = selectedTruckId !== null && !isSelected;
                    return (
                        <Marker
                            key={truck.id}
                            longitude={truck.lon}
                            latitude={truck.lat}
                            anchor="center"
                            onClick={() => setSelectedTruckId(isSelected ? null : truck.id)}
                        >
                            <div className={`relative transition-all duration-500 cursor-pointer ${isDimmed ? 'opacity-30 scale-75' : isSelected ? 'scale-125 z-50' : 'z-40'}`}>
                                <div className="absolute -inset-3 bg-white/10 blur-lg rounded-full animate-pulse"></div>
                                <div className="relative bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-xl border-2" style={{ borderColor: truck.color }}>
                                    <div className="w-7 h-7 flex items-center justify-center rounded-full" style={{ backgroundColor: truck.color }}>
                                        <span className="material-symbols-outlined text-white text-sm">local_shipping</span>
                                    </div>
                                </div>
                                <div className="absolute left-1/2 -bottom-7 -translate-x-1/2 bg-slate-900/90 text-white text-[8px] font-black px-2 py-0.5 rounded-full whitespace-nowrap border border-white/20 uppercase tracking-widest">
                                    {truck.speed > 0 ? 'LIVE' : truck.status === 'delayed' ? '⚠ DELAY' : 'IDLE'} • {truck.plate}
                                </div>
                            </div>
                        </Marker>
                    );
                })}
            </Map>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-3 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 min-w-[180px]">
                <h4 className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-wider">Live Fleet Status</h4>
                <div className="space-y-1.5">
                    {dummyFleet.map((truck: TruckTracking) => (
                        <div
                            key={truck.id}
                            onClick={() => setSelectedTruckId(selectedTruckId === truck.id ? null : truck.id)}
                            className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-all text-xs ${selectedTruckId === truck.id ? 'bg-slate-100 dark:bg-slate-800 ring-1 ring-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: truck.color }}></div>
                            <span className="font-bold text-slate-700 dark:text-slate-300 truncate">{truck.plate}</span>
                            <span className={`ml-auto text-[9px] font-bold ${truck.status === 'in-transit' ? 'text-emerald-500' : truck.status === 'delayed' ? 'text-amber-500' : 'text-slate-400'}`}>
                                {truck.speed > 0 ? `${truck.speed}km/h` : truck.status.toUpperCase()}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
