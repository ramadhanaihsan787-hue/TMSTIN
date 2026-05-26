// src/features/customers/components/CustomerMapPreview.tsx
//
// Peta Mapbox interaktif untuk set koordinat toko.
// User klik/drag marker → koordinat otomatis update ke form parent.
//
import { useRef, useCallback } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import type { MapRef, MapMouseEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const DEPO_LAT = -6.207356;
const DEPO_LON = 106.479163;

// Bounding box Indonesia untuk validasi klik
const INDONESIA_BOUNDS = {
    minLat: -12.0, maxLat: 7.0,
    minLon: 94.0,  maxLon: 142.0,
};

interface CustomerMapPreviewProps {
    lat: string;
    lon: string;
    onCoordinateChange: (lat: string, lon: string) => void;
}

export default function CustomerMapPreview({
    lat, lon, onCoordinateChange
}: CustomerMapPreviewProps) {
    const mapRef = useRef<MapRef>(null);

    // Parse koordinat — fallback ke depo kalau kosong/invalid
    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    const hasValidCoord = !isNaN(parsedLat) && !isNaN(parsedLon)
        && parsedLat !== 0 && parsedLon !== 0;

    const markerLat = hasValidCoord ? parsedLat : DEPO_LAT;
    const markerLon = hasValidCoord ? parsedLon : DEPO_LON;

    // Klik di peta → update koordinat
    const handleMapClick = useCallback((e: MapMouseEvent) => {
        const { lng, lat: clickLat } = e.lngLat;
        // Validasi dalam bounding box Indonesia
        if (
            clickLat >= INDONESIA_BOUNDS.minLat && clickLat <= INDONESIA_BOUNDS.maxLat &&
            lng     >= INDONESIA_BOUNDS.minLon  && lng     <= INDONESIA_BOUNDS.maxLon
        ) {
            onCoordinateChange(clickLat.toFixed(8), lng.toFixed(8));
        }
    }, [onCoordinateChange]);

    return (
        <div className="space-y-2">
            {/* Instruksi */}
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="material-symbols-outlined text-[14px] text-primary">touch_app</span>
                Klik di peta untuk set koordinat toko, atau isi manual di kolom di atas.
            </div>

            {/* Map container */}
            <div className="relative h-64 rounded-xl overflow-hidden border-2 border-primary/30
                            ring-1 ring-primary/10 shadow-md">
                <Map
                    ref={mapRef}
                    initialViewState={{
                        longitude: markerLon,
                        latitude:  markerLat,
                        zoom:      hasValidCoord ? 14 : 10,
                    }}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/streets-v12"
                    mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                    onClick={handleMapClick}
                    cursor="crosshair"
                >
                    <NavigationControl position="top-right" />

                    {/* Marker lokasi toko */}
                    <Marker
                        longitude={markerLon}
                        latitude={markerLat}
                        anchor="bottom"
                        draggable
                        onDragEnd={(e) => {
                            const { lng, lat: dLat } = e.lngLat;
                            onCoordinateChange(dLat.toFixed(8), lng.toFixed(8));
                        }}
                    >
                        <div className="flex flex-col items-center cursor-grab active:cursor-grabbing">
                            <div className="w-8 h-8 rounded-full bg-primary border-2 border-white
                                            shadow-lg shadow-primary/40 flex items-center justify-center
                                            text-white text-[14px]"
                                 style={{ boxShadow: '0 0 0 4px rgba(213,75,0,0.2)' }}>
                                <span className="material-symbols-outlined text-[18px]"
                                      style={{ fontVariationSettings: "'FILL' 1" }}>
                                    storefront
                                </span>
                            </div>
                            <div className="w-0.5 h-3 bg-primary" />
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        </div>
                    </Marker>
                </Map>

                {/* Badge koordinat aktif */}
                {hasValidCoord && (
                    <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm
                                    text-white text-[10px] font-mono px-2 py-1 rounded-lg
                                    border border-white/10">
                        {parsedLat.toFixed(6)}, {parsedLon.toFixed(6)}
                    </div>
                )}

                {!hasValidCoord && (
                    <div className="absolute bottom-2 left-2 bg-amber-500/80 backdrop-blur-sm
                                    text-white text-[10px] font-bold px-2 py-1 rounded-lg
                                    flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">warning</span>
                        Koordinat belum diset — klik peta untuk menandai lokasi toko
                    </div>
                )}
            </div>
        </div>
    );
}