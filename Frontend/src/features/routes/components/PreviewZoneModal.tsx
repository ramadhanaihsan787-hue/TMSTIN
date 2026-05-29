import React, { useState, useMemo } from 'react';
import Map, { Source, Layer, Marker, Popup } from 'react-map-gl/mapbox';

const ensureValidPolygonCoords = (coords: any) => {
    if (!Array.isArray(coords)) return [];
    if (Array.isArray(coords[0]) && Array.isArray(coords[0][0]) && !Array.isArray(coords[0][0][0])) {
        return coords; 
    }
    if (Array.isArray(coords[0]) && !Array.isArray(coords[0][0])) {
        return [coords]; 
    }
    if (Array.isArray(coords[0]) && Array.isArray(coords[0][0]) && Array.isArray(coords[0][0][0])) {
        return coords[0]; 
    }
    return coords;
};

interface PreviewZoneModalProps {
    onCancel: () => void;
    onProceed: () => void;
    storesNoCoord: any[];
    zoningData: any[];
    truckColors: string[];
    fleetForPanel: any[];
    isFleetPanelOpen: boolean;
    setIsFleetPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
    handleToggleFleetStatus: (vehicleId: number, status: string) => void;
    coordEditTarget: any | null;
    setCoordEditTarget: React.Dispatch<React.SetStateAction<any | null>>;
    coordPopupPos: { x: number, y: number } | null;
    setCoordPopupPos: React.Dispatch<React.SetStateAction<{ x: number, y: number } | null>>;
    handleSaveCoordinate: (lat: number, lng: number) => Promise<void>;
    savingCoord: boolean;
}

export default function PreviewZoneModal({
    onCancel,
    onProceed,
    storesNoCoord,
    zoningData,
    truckColors,
    fleetForPanel,
    isFleetPanelOpen,
    setIsFleetPanelOpen,
    handleToggleFleetStatus,
    coordEditTarget,
    setCoordEditTarget,
    coordPopupPos,
    setCoordPopupPos,
    handleSaveCoordinate,
    savingCoord
}: PreviewZoneModalProps) {
    const [hoverInfo, setHoverInfo] = useState<any>(null);
    const [showAllLabels, setShowAllLabels] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // Koordinat Depo (Dari config.py)
    const depotLat = -6.207356;
    const depotLng = 106.479163;

    const allStores = useMemo(() => {
        const stores: any[] = [];
        zoningData?.forEach((zone: any, i: number) => {
            const color = truckColors[i % truckColors.length];
            zone.stores?.forEach((store: any) => {
                stores.push({ ...store, color, zoneName: zone.zone_name || zone.name || `Zona ${i+1}` });
            });
        });
        return stores;
    }, [zoningData, truckColors]);

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return allStores.filter(s => 
            (s.store_name || s.nama_toko || '').toLowerCase().includes(q) || 
            (s.kode_customer || s.kode || '').toLowerCase().includes(q)
        ).slice(0, 5); // Limit 5
    }, [searchQuery, allStores]);

    const zoneSummary = useMemo(() => {
        return zoningData?.map((zone: any, i: number) => {
            const storeCount = zone.stores?.length || 0;
            const totalWeight = zone.stores?.reduce((sum: number, store: any) => sum + (store.volume || store.weight || store.berat_kg || 0), 0) || 0;
            return {
                id: zone.zone_id || i,
                name: zone.zone_name || zone.name || `Zona ${i+1}`,
                color: truckColors[i % truckColors.length],
                storeCount,
                totalWeight
            };
        }) || [];
    }, [zoningData, truckColors]);

    return (
        <div className="fixed inset-0 z-[999999] bg-slate-900/90 backdrop-blur-sm flex flex-col p-4 md:p-8">
            <div className="bg-white dark:bg-[#111] flex-1 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border border-slate-800">
                <div className="p-4 md:p-6 border-b border-slate-200 dark:border-[#222] flex justify-between items-center bg-slate-50 dark:bg-[#161616]">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">map</span> PREVIEW ZONA TERITORI JAPFA
                        </h2>
                        <p className="text-xs font-bold text-slate-500 mt-1">Peta Dasar Operasional JAPFA. Pin toko akan menyesuaikan rute di dalam batas zona ini.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onCancel} className="px-4 py-2 border-2 border-slate-200 dark:border-[#444] text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-[#333] transition-colors">Batal</button>
                        <button onClick={onProceed} className="px-6 py-2 bg-gradient-to-r from-primary to-orange-500 text-white font-black rounded-xl hover:brightness-110 flex items-center gap-2 shadow-lg shadow-primary/30 transition-all hover:scale-105">
                            LANJUT HITUNG RUTE <span className="material-symbols-outlined">explore</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 relative bg-slate-100 dark:bg-[#0a0a0a]">

                    {/* ── Warning banner toko tanpa koordinat ── */}
                    {storesNoCoord.length > 0 && (
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-amber-500/95 backdrop-blur text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-bold max-w-md">
                            <span className="material-symbols-outlined text-[18px]">location_off</span>
                            <span>
                                {storesNoCoord.length} toko belum punya koordinat — klik marker
                                <span className="inline-block w-3 h-3 rounded-full bg-red-400 border border-white mx-1 animate-pulse align-middle"></span>
                                untuk pin lokasi
                            </span>
                        </div>
                    )}

                    {/* ── Control Panel (Top Left) ── */}
                    <div className="absolute top-4 left-4 z-20 flex flex-col gap-3">
                        <button 
                            onClick={() => setShowAllLabels(!showAllLabels)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-xl transition-all border w-64 justify-center ${
                                showAllLabels 
                                ? 'bg-primary/20 text-primary border-primary/50' 
                                : 'bg-[#1a1c1e]/90 text-slate-300 border-white/10 hover:bg-[#2a2c2e]'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">
                                {showAllLabels ? 'label' : 'label_off'}
                            </span>
                            {showAllLabels ? 'Sembunyikan Semua Label' : 'Tampilkan Semua Label'}
                        </button>

                        {/* Search Bar */}
                        <div className="relative w-64">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">search</span>
                                <input 
                                    type="text" 
                                    placeholder="Cari toko / ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                    className="w-full bg-[#1a1c1e]/90 backdrop-blur border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 shadow-lg"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                    </button>
                                )}
                            </div>
                            
                            {/* Search Results Dropdown */}
                            {isSearchFocused && searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1c1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1">
                                    {searchResults.map((s, i) => (
                                        <button 
                                            key={i}
                                            onClick={() => {
                                                setHoverInfo(s);
                                                setSearchQuery("");
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-white/5 border-b border-white/5 last:border-0 flex items-start gap-2"
                                        >
                                            <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: s.color }}></div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-white truncate">{s.store_name}</p>
                                                <p className="text-[10px] text-slate-400 truncate">{s.kode_customer} • {s.zoneName}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Zone Summary Panel (Bottom Left) ── */}
                    <div className="absolute bottom-4 left-4 z-20">
                        <div className="bg-[#1a1c1e]/92 backdrop-blur border border-white/10 rounded-2xl shadow-2xl overflow-hidden w-64">
                            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10 bg-white/5">
                                <span className="material-symbols-outlined text-primary text-[16px]">pie_chart</span>
                                <span className="text-xs font-bold text-white uppercase tracking-wider">Ringkasan Zona</span>
                            </div>
                            <div className="p-2 space-y-1 max-h-[30vh] overflow-y-auto">
                                {zoneSummary.map((z, i) => (
                                    <div key={i} className="bg-white/5 p-2 rounded-lg flex items-center justify-between gap-2 border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-3 h-3 rounded-full shrink-0 shadow-[0_0_5px_rgba(0,0,0,0.5)]" style={{ backgroundColor: z.color }}></div>
                                            <div className="truncate">
                                                <p className="text-[11px] font-bold text-white truncate" title={z.name}>{z.name}</p>
                                                <p className="text-[9px] text-slate-400">{z.storeCount} Toko</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 bg-black/30 px-1.5 py-1 rounded">
                                            <p className="text-[10px] font-black text-white">{z.totalWeight.toLocaleString('id-ID')} <span className="text-[8px] text-slate-400">KG</span></p>
                                        </div>
                                    </div>
                                ))}
                                {zoneSummary.length === 0 && (
                                    <p className="text-[11px] text-slate-500 text-center py-2">Belum ada zona</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Popup set koordinat ── */}
                    {coordEditTarget && (
                        <div className="absolute top-3 right-3 z-20 bg-[#1a1c1e]/95 backdrop-blur border border-amber-500/60 rounded-xl p-4 shadow-xl max-w-xs">
                            <div className="flex items-start justify-between gap-2 mb-3">
                                <div>
                                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Set Koordinat</p>
                                    <p className="text-sm font-bold text-white mt-0.5">{coordEditTarget.store_name}</p>
                                    <p className="text-xs text-slate-400">{coordEditTarget.kode_customer}</p>
                                </div>
                                <button onClick={() => { setCoordEditTarget(null); setCoordPopupPos(null); }}
                                    className="text-slate-400 hover:text-white p-0.5">
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </div>
                            <p className="text-xs text-slate-300 bg-slate-800/60 rounded-lg p-2 mb-3">
                                <span className="material-symbols-outlined text-[14px] align-middle mr-1 text-amber-400">touch_app</span>
                                Klik pada peta untuk menetapkan lokasi toko ini
                            </p>
                            {coordPopupPos && (
                                <div className="text-xs text-slate-300 font-mono bg-slate-800/40 rounded p-2 mb-3">
                                    {coordPopupPos.y.toFixed(6)}, {coordPopupPos.x.toFixed(6)}
                                </div>
                            )}
                            {coordPopupPos && (
                                <button
                                    onClick={() => handleSaveCoordinate(coordPopupPos.y, coordPopupPos.x)}
                                    disabled={savingCoord}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                                >
                                    {savingCoord ? '⏳ Menyimpan...' : '📍 Simpan Koordinat'}
                                </button>
                            )}
                        </div>
                    )}

                    <Map
                        initialViewState={{
                            longitude: depotLng,
                            latitude: depotLat,
                            zoom: 8.9,
                            pitch: 0,
                            bearing: 0
                        }}
                        style={{ width: '100%', height: '100%' }}
                        mapStyle="mapbox://styles/mapbox/navigation-night-v1"
                        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                        cursor={coordEditTarget ? 'crosshair' : 'grab'}
                        onClick={(e) => {
                            if (coordEditTarget) {
                                setCoordPopupPos({ x: e.lngLat.lng, y: e.lngLat.lat });
                            }
                        }}
                    >
                        {/* Zona warna per area */}
                        <Source id="static-zones" type="geojson" data={{
                            type: 'FeatureCollection',
                            features: zoningData?.map((zone: any, i: number) => ({
                                type: 'Feature',
                                properties: { zone_id: zone.zone_id, color: truckColors[i % truckColors.length] },
                                geometry: {
                                    type: 'Polygon',
                                    coordinates: ensureValidPolygonCoords(zone.bounding_polygon || zone.coordinates)
                                }
                            }))
                        } as any}>
                            <Layer id="static-zones-fill" type="fill"
                                paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.25 }} />
                            <Layer id="static-zones-line" type="line"
                                paint={{ 'line-color': ['get', 'color'], 'line-width': 2.5,
                                         'line-opacity': 0.8, 'line-dasharray': [2, 3] }} />
                        </Source>

                        {/* DEPOT MARKER */}
                        <Marker longitude={depotLng} latitude={depotLat} anchor="bottom">
                            <div className="relative group cursor-pointer flex flex-col items-center">
                                {/* Glow Effect */}
                                <div className="absolute inset-0 bg-primary/40 blur-md rounded-full w-12 h-12 -z-10 animate-pulse"></div>
                                {/* Icon Container */}
                                <div className="w-12 h-12 bg-[#1a1c1e] border-2 border-primary rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,165,0,0.5)]">
                                    <span className="material-symbols-outlined text-primary text-[28px]">warehouse</span>
                                </div>
                                <div className="mt-1 bg-[#1a1c1e]/90 backdrop-blur text-white text-[10px] font-black px-2 py-0.5 rounded border border-white/10 shadow-lg">
                                    DEPOT PUSAT
                                </div>
                            </div>
                        </Marker>

                        {/* Marker toko valid (dari zoning) */}
                        {zoningData?.map((zone: any, i: number) => {
                            const color = truckColors[i % truckColors.length];
                            return zone.stores?.map((store: any, j: number) => (
                                <Marker key={`z${i}-s${j}`} longitude={store.lon || store.lng} latitude={store.lat} anchor="center">
                                    <div className="relative group/pin cursor-pointer flex items-center justify-center" 
                                         onClick={(e) => { e.stopPropagation(); setHoverInfo({ ...store, color }); }}>
                                        {/* Glow effect */}
                                        <div className="absolute -inset-2 rounded-full opacity-0 group-hover/pin:opacity-40 transition-opacity blur-[4px]" style={{ backgroundColor: color }}></div>
                                        {/* Pin */}
                                        <div className="w-4 h-4 rounded-full border-2 border-white/90 shadow-[0_0_8px_rgba(255,255,255,0.8)] relative z-10 transition-transform group-hover/pin:scale-125"
                                             style={{ backgroundColor: color }}></div>
                                        
                                        {/* Show All Labels Text (Bigger Mini-Card) */}
                                        {showAllLabels && (
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-[#161616]/95 backdrop-blur-sm border border-white/10 p-2.5 rounded-lg shadow-xl z-20 pointer-events-none w-[170px]">
                                                <h3 className="font-bold text-[11px] text-white uppercase truncate mb-1" style={{ borderLeft: `3px solid ${color}`, paddingLeft: '6px' }}>{store.store_name}</h3>
                                                <div className="flex items-center justify-between pl-[9px]">
                                                    <span className="text-[9px] font-mono text-slate-400">{store.kode_customer || store.kode || store.store_code || '-'}</span>
                                                    {store.volume > 0 && <span className="text-[10px] font-black text-white bg-white/10 px-1.5 py-0.5 rounded">{store.volume} KG</span>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Marker>
                            ));
                        })}

                        {/* Marker toko TANPA koordinat — merah berkedip, bisa di-klik */}
                        {storesNoCoord.map((store: any, i: number) => {
                            return (
                                <Marker key={`nocoord-${i}`} longitude={106.65} latitude={-6.21 - i * 0.03} anchor="center">
                                    <div
                                        className="relative cursor-pointer group flex items-center"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setCoordEditTarget(store);
                                            setCoordPopupPos(null);
                                        }}
                                        title={`${store.store_name} — klik untuk set koordinat`}
                                    >
                                        <div className="absolute -inset-2 rounded-full bg-red-500/30 animate-ping"></div>
                                        <div className="w-6 h-6 rounded-full bg-red-500 border-2 border-white shadow-lg flex items-center justify-center relative z-10">
                                            <span className="material-symbols-outlined text-[12px] text-white">question_mark</span>
                                        </div>
                                        <div className="absolute left-8 whitespace-nowrap bg-red-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            {store.store_name}
                                        </div>
                                    </div>
                                </Marker>
                            );
                        })}

                        {/* INTERACTIVE POPUP FOR VALID STORES */}
                        {hoverInfo && (
                            <Popup
                                longitude={hoverInfo.lon || hoverInfo.lng}
                                latitude={hoverInfo.lat}
                                anchor="bottom"
                                closeOnClick={true}
                                onClose={() => setHoverInfo(null)}
                                className="z-50"
                                maxWidth="240px"
                            >
                                <div className="bg-[#161616] border border-white/10 rounded-xl shadow-2xl p-3 -m-[10px] relative">
                                    {/* Close Button Inside Popup Wrapper */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setHoverInfo(null); }} 
                                        className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors p-1 z-10"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                    </button>

                                    <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2 pr-6">
                                        <div className="w-3.5 h-3.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.4)] border border-white/50 shrink-0" style={{ backgroundColor: hoverInfo.color }}></div>
                                        <div className="min-w-0">
                                            <h3 className="font-black text-[12px] text-white uppercase tracking-wide truncate">{hoverInfo.store_name || hoverInfo.nama_toko}</h3>
                                            <p className="text-[9px] font-mono text-slate-400">{hoverInfo.kode_customer || hoverInfo.kode || hoverInfo.store_code || hoverInfo.order_id || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] text-slate-300 flex items-start gap-1.5 leading-tight">
                                            <span className="material-symbols-outlined text-[12px] text-primary shrink-0">location_on</span>
                                            <span className="line-clamp-2" title={hoverInfo.alamat || hoverInfo.address}>{hoverInfo.alamat || hoverInfo.address || `${hoverInfo.kode_customer || hoverInfo.kode || ''} · ${hoverInfo.zoneName || ''}`}</span>
                                        </p>
                                        <div className="flex items-center justify-between pt-1 border-t border-white/5 mt-2">
                                            <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[12px]">weight</span>
                                                Muatan:
                                            </p>
                                            <span className="text-[11px] font-black text-white bg-white/10 px-1.5 py-0.5 rounded">
                                                {(hoverInfo.volume || hoverInfo.weight || hoverInfo.berat_kg || 0) > 0 ? `${hoverInfo.volume || hoverInfo.weight || hoverInfo.berat_kg} KG` : '0 KG'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        )}

                    </Map>

                    {/* ── Fleet Status Panel (overlay kanan bawah) ── */}
                    <div className="absolute bottom-4 right-4 z-10">
                        <div className={`bg-[#1a1c1e]/92 backdrop-blur border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${isFleetPanelOpen ? 'w-72' : 'w-12'}`}>
                            {/* Header panel */}
                            <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
                                {isFleetPanelOpen && (
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-[16px]">local_shipping</span>
                                        <span className="text-xs font-bold text-white uppercase tracking-wider">Armada Hari Ini</span>
                                    </div>
                                )}
                                <button
                                    onClick={() => setIsFleetPanelOpen(p => !p)}
                                    className="ml-auto text-slate-400 hover:text-white p-0.5 rounded"
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        {isFleetPanelOpen ? 'chevron_right' : 'local_shipping'}
                                    </span>
                                </button>
                            </div>

                            {/* List armada */}
                            {isFleetPanelOpen && (
                                <div className="max-h-64 overflow-y-auto">
                                    {fleetForPanel.length === 0 ? (
                                        <p className="text-xs text-slate-500 text-center py-4">Memuat armada...</p>
                                    ) : fleetForPanel.map((truck: any) => {
                                        const vid    = truck.id || truck.vehicle_id;
                                        const plate  = truck.licensePlate || truck.license_plate || truck.plateNumber || truck.plate || '-';
                                        const driver = truck.driverName || truck.driver_name || '—';
                                        const isActive = truck.status === 'Available';
                                        return (
                                            <div key={vid} className={`flex items-center gap-2 px-3 py-2 border-b border-white/5 last:border-0 ${!isActive ? 'opacity-50' : ''}`}>
                                                {/* Status dot */}
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-slate-500'}`}></div>
                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-white truncate">{plate}</p>
                                                    <p className="text-[10px] text-slate-400 truncate">{driver}</p>
                                                </div>
                                                {/* Toggle button */}
                                                <button
                                                    onClick={() => handleToggleFleetStatus(vid, truck.status)}
                                                    className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-colors ${
                                                        isActive
                                                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-red-500/20 hover:text-red-400'
                                                            : 'bg-slate-700 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400'
                                                    }`}
                                                    title={isActive ? 'Set Maintenance' : 'Aktifkan'}
                                                >
                                                    {isActive ? 'Aktif' : 'Maint.'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}