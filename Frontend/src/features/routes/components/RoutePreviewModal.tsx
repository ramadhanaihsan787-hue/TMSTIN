// src/features/routes/components/RoutePreviewModal.tsx
//
// RoutePreviewModal v2 — Redesign lengkap:
//   - Garis rute per truk (glow + main layer, dari garis_aspal backend)
//   - Depot marker dengan animasi ring
//   - Stop markers dibedakan mall vs toko biasa
//   - Klik truk → focus peta + dim truk lain
//   - Panel kanan: summary stats + capacity bars
//   - Orange border sekeliling peta (JAPFA identity)
//   - Orange border panel kanan (tipis)
//   - Tombol "Lanjut" orange → on-brand
//
import { useState, useRef, useEffect, useMemo } from "react";
import Map, { Marker, Popup, Source, Layer } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { toast } from 'sonner';
import { fleetService } from '../../fleet/services/fleetService';

// ─────────────────────────────────────────────────────────────────────────────
// KONSTANTA
// ─────────────────────────────────────────────────────────────────────────────
const DEPO_LON = 106.479163;
const DEPO_LAT = -6.207356;

const MALL_KEYWORDS = ['MALL', 'PLAZA', 'SQUARE', 'SUPERMARKET', 'HYPERMART',
    'LOTTE', 'GIANT', 'ALFAMART', 'INDOMARET', 'ALFAMIDI', 'LAWSON', 'CIRCLE K'];

const isMallStore = (name: string) =>
    MALL_KEYWORDS.some(k => (name || '').toUpperCase().includes(k));

// ─────────────────────────────────────────────────────────────────────────────
// CSS — animasi marker (sama persis dengan RouteMap.tsx)
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
    @keyframes depoSpin { 100% { transform: rotate(360deg); } }
    .depo-ring {
        position: absolute; inset: -7px; border-radius: 50%;
        border: 2px dashed rgba(239,68,68,0.6);
        animation: depoSpin 10s linear infinite;
    }
    @keyframes dangerPulse {
        0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
        70%  { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
        100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
    }
    .danger-pulse { animation: dangerPulse 1.5s infinite; }
    .dimmed-marker { opacity: 0.2; filter: grayscale(90%); transition: opacity 0.3s; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// ZONA BACKGROUND (tetap seperti semula)
// ─────────────────────────────────────────────────────────────────────────────
const JAPFA_ZONES_GEOJSON = {
    type: 'FeatureCollection',
    features: [
        { type: 'Feature', properties: { name: 'BEKASI / CIKARANG', color: '#e11d48' }, geometry: { type: 'Polygon', coordinates: [[[106.95,-6.05],[107.25,-6.05],[107.25,-6.50],[106.95,-6.40],[106.95,-6.05]]] } },
        { type: 'Feature', properties: { name: 'KELAPA GADING', color: '#0284c7' }, geometry: { type: 'Polygon', coordinates: [[[106.82,-6.05],[106.95,-6.05],[106.95,-6.20],[106.82,-6.20],[106.82,-6.05]]] } },
        { type: 'Feature', properties: { name: 'JAKBAR / KEMBANGAN', color: '#16a34a' }, geometry: { type: 'Polygon', coordinates: [[[106.70,-6.05],[106.82,-6.05],[106.82,-6.20],[106.70,-6.20],[106.70,-6.05]]] } },
        { type: 'Feature', properties: { name: 'SERPONG / BSD', color: '#9333ea' }, geometry: { type: 'Polygon', coordinates: [[[106.60,-6.20],[106.75,-6.20],[106.75,-6.40],[106.60,-6.40],[106.60,-6.20]]] } },
        { type: 'Feature', properties: { name: 'PUSAT / SELATAN', color: '#d97706' }, geometry: { type: 'Polygon', coordinates: [[[106.75,-6.20],[106.82,-6.20],[106.95,-6.20],[106.95,-6.40],[106.75,-6.40],[106.75,-6.20]]] } },
        { type: 'Feature', properties: { name: 'BOGOR', color: '#0d9488' }, geometry: { type: 'Polygon', coordinates: [[[106.75,-6.40],[106.95,-6.40],[106.95,-6.75],[106.75,-6.75],[106.75,-6.40]]] } },
        { type: 'Feature', properties: { name: 'TIGARAKSA', color: '#ea580c' }, geometry: { type: 'Polygon', coordinates: [[[106.40,-6.05],[106.70,-6.05],[106.70,-6.20],[106.60,-6.20],[106.60,-6.40],[106.40,-6.40],[106.40,-6.05]]] } },
    ]
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface RoutePreviewModalProps {
    previewData: any;
    truckColors: string[];
    zoningData?: any;
    onCancel: () => void;
    onProceedDispatch: (draft: any) => void;
    onResequence?: (draftData: any) => Promise<any>;
}

interface OncallFormData {
    plate: string;
    type: string;
    capacity: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
/** Konversi garis_aspal dari backend ke [lon, lat][] untuk Mapbox */
function extractLineCoords(garis_aspal: any, stops: any[]): number[][] {
    // Backend (osrm_service.get_road_geometry) sudah mengembalikan [lon, lat][]
    // Format Mapbox native — TIDAK perlu flip lagi.
    //
    // Priority 1: plain array [lon, lat][] dari backend
    if (Array.isArray(garis_aspal) && garis_aspal.length >= 2) {
        return garis_aspal.filter(
            (c: any) => Array.isArray(c) && !isNaN(c[0]) && !isNaN(c[1])
        );
    }
    // Priority 2: GeoJSON object {type: 'LineString', coordinates: [...]}
    if (garis_aspal?.coordinates?.length >= 2) {
        return garis_aspal.coordinates.filter((c: any) => !isNaN(c[0]) && !isNaN(c[1]));
    }
    // Fallback: straight-line depot → stops → depot
    const coords: number[][] = [[DEPO_LON, DEPO_LAT]];
    stops.forEach((s: any) => {
        const lon = parseFloat(s.lon || s.longitude);
        const lat = parseFloat(s.lat || s.latitude);
        if (!isNaN(lon) && !isNaN(lat)) coords.push([lon, lat]);
    });
    coords.push([DEPO_LON, DEPO_LAT]);
    return coords;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function RoutePreviewModal({
    previewData, truckColors, onCancel, onProceedDispatch, onResequence
}: RoutePreviewModalProps) {
    const mapRef = useRef<MapRef>(null);
    const [viewState, setViewState] = useState({ longitude: DEPO_LON, latitude: DEPO_LAT, zoom: 10 });

    const [draftData, setDraftData] = useState(JSON.parse(JSON.stringify(previewData)));
    const [isDirty, setIsDirty] = useState(false);
    const [isResequencing, setIsResequencing] = useState(false);

    // Truk yang di-focus di panel (null = tampilkan semua)
    const [activeTruck, setActiveTruck] = useState<number | null>(null);
    const [selectedPopup, setSelectedPopup] = useState<{ tIdx: number; sIdx: number; stop: any } | null>(null);
    const [draggedItem, setDraggedItem] = useState<{ tIdx: number; sIdx: number } | null>(null);
    const [dragOverTruck, setDragOverTruck] = useState<number | null>(null);

    // ── ONCALL & DROPPED STORES ────────────────────────────────────────────
    const [droppedStores, setDroppedStores] = useState<any[]>(
        () => JSON.parse(JSON.stringify(previewData?.dropped_nodes_peta || []))
    );
    const [draggedDropped, setDraggedDropped] = useState<number | null>(null);
    const [showOncallForm, setShowOncallForm] = useState(false);
    const [oncallForm, setOncallForm]         = useState<OncallFormData>({ plate: '', type: 'CDD', capacity: '2500' });
    const [isAddingOncall, setIsAddingOncall] = useState(false);
    const [optimizingOncall, setOptimizingOncall] = useState<number | null>(null);

    useEffect(() => {
        setDraftData(JSON.parse(JSON.stringify(previewData)));
        setIsDirty(false);
    }, [previewData]);

    // ── Traffic warnings map ────────────────────────────────────────────────
    const trafficWarnings = useMemo(() => {
        if (!previewData?.traffic_warnings) return {};
        const m: any = {};
        previewData.traffic_warnings.forEach((w: any) => {
            m[`${w.truck_id}_${w.store_name}`] = w;
        });
        return m;
    }, [previewData]);

    // ── GeoJSON untuk garis rute (glow + main) ─────────────────────────────
    const routesGeoJSON = useMemo(() => {
        const trucks = draftData.jadwal_truk_internal || [];
        const features = trucks.map((truk: any, i: number) => {
            const color = truckColors[(truk.color_index ?? i) % truckColors.length];
            const isActive = activeTruck === null || activeTruck === i;
            const coords = extractLineCoords(
                truk.garis_aspal,
                (truk.detail_perjalanan || []).filter((s: any) =>
                    !s.nama_toko?.includes('GUDANG JAPFA') &&
                    s.keterangan !== 'Start' && s.keterangan !== 'Finish'
                )
            );
            return {
                type: 'Feature',
                properties: {
                    color,
                    opacity: isActive ? 1.0 : 0.08,
                    width: activeTruck === i ? 5 : 3,
                    glowOpacity: isActive ? (activeTruck === i ? 0.55 : 0.18) : 0,
                },
                geometry: { type: 'LineString', coordinates: coords },
            };
        });
        return { type: 'FeatureCollection', features };
    }, [draftData, activeTruck, truckColors]);

    // ── Summary stats ───────────────────────────────────────────────────────
    const summary = useMemo(() => {
        const trucks = draftData.jadwal_truk_internal || [];
        const activeTrucks = trucks.filter((t: any) =>
            (t.detail_perjalanan || []).some((s: any) =>
                !s.nama_toko?.includes('GUDANG JAPFA') &&
                s.keterangan !== 'Start' && s.keterangan !== 'Finish'
            )
        );
        const totalStops = trucks.reduce((sum: number, t: any) =>
            sum + (t.detail_perjalanan || []).filter((s: any) =>
                !s.nama_toko?.includes('GUDANG JAPFA') &&
                s.keterangan !== 'Start' && s.keterangan !== 'Finish'
            ).length, 0);
        const totalKg = trucks.reduce((sum: number, t: any) => sum + (t.total_muatan_kg || 0), 0);
        const warnings = Object.keys(trafficWarnings).length;
        return { activeTrucks: activeTrucks.length, totalStops, totalKg, warnings };
    }, [draftData, trafficWarnings]);

    // ── Focus peta ke truk yang dipilih ────────────────────────────────────
    const handleSelectTruck = (i: number) => {
        const next = activeTruck === i ? null : i;
        setActiveTruck(next);
        if (next !== null && mapRef.current) {
            const truk = draftData.jadwal_truk_internal?.[next];
            if (!truk) return;
            const validStops = (truk.detail_perjalanan || []).filter((s: any) =>
                !isNaN(parseFloat(s.lon || s.longitude)) && !isNaN(parseFloat(s.lat || s.latitude)) &&
                !s.nama_toko?.includes('GUDANG JAPFA') &&
                s.keterangan !== 'Start' && s.keterangan !== 'Finish'
            );
            if (validStops.length === 0) return;
            const lons = validStops.map((s: any) => parseFloat(s.lon || s.longitude));
            const lats = validStops.map((s: any) => parseFloat(s.lat || s.latitude));
            mapRef.current.fitBounds(
                [[Math.min(...lons) - 0.02, Math.min(...lats) - 0.02],
                 [Math.max(...lons) + 0.02, Math.max(...lats) + 0.02]],
                { duration: 1200, padding: 80 }
            );
        }
    };

    // ── Drag & drop / move stop ─────────────────────────────────────────────
    const handleMoveStop = (fromIdx: number, toIdx: number, stopIdx: number) => {
        if (fromIdx === toIdx) return;
        const newData = { ...draftData };
        const from = newData.jadwal_truk_internal[fromIdx];
        const to   = newData.jadwal_truk_internal[toIdx];
        const [moved] = from.detail_perjalanan.splice(stopIdx, 1);
        from.total_muatan_kg -= (moved.turun_barang_kg || moved.berat_kg || 0);
        const finishIdx = to.detail_perjalanan.findIndex((s: any) => s.keterangan === 'Finish');
        finishIdx !== -1
            ? to.detail_perjalanan.splice(finishIdx, 0, moved)
            : to.detail_perjalanan.push(moved);
        to.total_muatan_kg += (moved.turun_barang_kg || moved.berat_kg || 0);
        setDraftData(newData);
        setIsDirty(true);
        setSelectedPopup(null);
        toast.success(`Toko dipindah ke ${to.armada}!`);
    };

    const handleResequence = async () => {
        if (!onResequence) return;
        setIsResequencing(true);
        try {
            const updated = await onResequence(draftData);
            if (updated) {
                setDraftData(JSON.parse(JSON.stringify(updated)));
                setIsDirty(false);
            }
        } catch {} finally { setIsResequencing(false); }
    };

    // ── DROP TOKO DARI BASKET KE TRUK ─────────────────────────────────────
    const handleDropStoreToTruck = (truckIdx: number, storeIdx: number) => {
        const store = droppedStores[storeIdx];
        if (!store) return;

        const newData = JSON.parse(JSON.stringify(draftData));
        const truk    = newData.jadwal_truk_internal[truckIdx];

        // Buat stop baru dari dropped store format
        const newStop = {
            nama_toko:            store.nama_toko,
            lat:                  store.lat,
            lon:                  store.lon,
            latitude:             store.lat,
            longitude:            store.lon,
            berat_kg:             store.berat_kg,
            turun_barang_kg:      store.berat_kg,
            jam_tiba:             '--:--',
            distance_from_prev_km: 0,
            items:                store.items || [],
            keterangan:           'Stop',
            urutan:               (truk.detail_perjalanan?.length || 0),
            // Flag: butuh TSP setelah ini
        };

        // Insert sebelum 'Finish' kalau ada, atau append
        const finIdx = truk.detail_perjalanan.findLastIndex((s: any) => s.keterangan === 'Finish');
        if (finIdx >= 0) truk.detail_perjalanan.splice(finIdx, 0, newStop);
        else              truk.detail_perjalanan.push(newStop);

        truk.total_muatan_kg = (truk.total_muatan_kg || 0) + store.berat_kg;

        setDraftData(newData);
        setDroppedStores(prev => prev.filter((_, i) => i !== storeIdx));
        setIsDirty(true);
        toast.success(`${store.nama_toko} dipindahkan ke ${truk.armada}!`);
    };

    // ── TAMBAH TRUK ONCALL ────────────────────────────────────────────────
    const handleAddOncall = async () => {
        if (!oncallForm.plate.trim()) { toast.error('Nomor plat wajib diisi!'); return; }
        setIsAddingOncall(true);
        try {
            // Daftarkan ke master armada
            const res = await fleetService.addOncallTruck({
                plate_number: oncallForm.plate.trim().toUpperCase(),
                vehicle_type: oncallForm.type,
                capacity_kg:  parseInt(oncallForm.capacity) || 2500,
            });

            // Tambah ke jadwal_truk_internal di local state
            const newData = JSON.parse(JSON.stringify(draftData));
            const newTruk = {
                route_id:          `ONCALL-${Date.now()}`,
                armada:            oncallForm.plate.trim().toUpperCase(),
                vehicle_id:        res.vehicle_id || null,
                driver_id:         null,
                helper_id:         null,
                total_muatan_kg:   0,
                total_jarak_km:    0,
                is_oncall:         true,
                color_index:       newData.jadwal_truk_internal.length,
                detail_perjalanan: [
                    { urutan: 0, keterangan: 'Start', nama_toko: '📍 GUDANG JAPFA',
                      lat: -6.207356, lon: 106.479163 },
                    { urutan: 99, keterangan: 'Finish', nama_toko: '📍 GUDANG JAPFA',
                      lat: -6.207356, lon: 106.479163 },
                ],
                garis_aspal: [],
            };
            newData.jadwal_truk_internal.push(newTruk);
            setDraftData(newData);

            toast.success(`Truk On-Call ${oncallForm.plate} berhasil ditambahkan!`);
            setShowOncallForm(false);
            setOncallForm({ plate: '', type: 'CDD', capacity: '2500' });
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || 'Gagal menambahkan truk on-call');
        } finally {
            setIsAddingOncall(false);
        }
    };

    // ── TSP UNTUK TRUK ONCALL ─────────────────────────────────────────────
    const handleOptimizeOncall = async (truckIdx: number) => {
        if (!onResequence) return;
        const armada = draftData.jadwal_truk_internal[truckIdx]?.armada;
        const stops  = (draftData.jadwal_truk_internal[truckIdx]?.detail_perjalanan || [])
            .filter((s: any) => s.keterangan !== 'Start' && s.keterangan !== 'Finish');
        if (stops.length < 2) { toast.info('Minimal 2 toko untuk dioptimasi'); return; }

        setOptimizingOncall(truckIdx);
        try {
            const updated = await onResequence(draftData);
            if (updated) {
                setDraftData(JSON.parse(JSON.stringify(updated)));
                setIsDirty(false);
                toast.success(`Urutan ${armada} berhasil dioptimasi!`);
            }
        } catch { toast.error('Gagal optimasi urutan'); }
        finally { setOptimizingOncall(null); }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-sm flex flex-col p-3 md:p-5">
            <style>{CSS}</style>

            <div className="flex-1 flex flex-col overflow-hidden rounded-2xl shadow-2xl
                            ring-2 ring-primary/60 shadow-primary/10 bg-[#0f0f0f]">

                {/* ── HEADER ─────────────────────────────────────────────── */}
                <div className="shrink-0 px-5 py-3 border-b border-white/10 bg-[#111]
                                flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg md:text-xl font-black uppercase text-white flex items-center gap-2 tracking-wide">
                            <span className="material-symbols-outlined text-primary">route</span>
                            Peta Preview Rute AI
                        </h2>
                        {/* Quick stats */}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] text-primary">local_shipping</span>
                                {summary.activeTrucks} Truk Aktif
                            </span>
                            <span className="text-slate-600">·</span>
                            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] text-emerald-400">storefront</span>
                                {summary.totalStops} Toko
                            </span>
                            <span className="text-slate-600">·</span>
                            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] text-blue-400">scale</span>
                                {summary.totalKg.toFixed(0)} KG
                            </span>
                            {summary.warnings > 0 && (
                                <>
                                    <span className="text-slate-600">·</span>
                                    <span className="text-[11px] font-bold text-red-400 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[13px]">warning</span>
                                        {summary.warnings} Traffic Warning
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {isDirty && (
                            <button
                                onClick={handleResequence}
                                disabled={isResequencing}
                                className="px-4 py-2 bg-blue-600/90 text-white text-sm font-bold
                                           rounded-xl hover:bg-blue-600 flex items-center gap-1.5
                                           transition-all disabled:opacity-50"
                            >
                                <span className={`material-symbols-outlined text-[16px] ${isResequencing ? 'animate-spin' : ''}`}>sync</span>
                                {isResequencing ? 'Menghitung...' : 'Hitung Ulang Urutan'}
                            </button>
                        )}
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 border border-white/15 text-slate-300 text-sm
                                       font-bold rounded-xl hover:bg-white/10 flex items-center
                                       gap-1.5 transition-all"
                        >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                            Batal
                        </button>
                        <button
                            onClick={() => onProceedDispatch(draftData)}
                            className="px-5 py-2 text-sm font-black rounded-xl
                                       bg-gradient-to-r from-primary to-japfa-orange
                                       text-white shadow-lg shadow-primary/30
                                       hover:brightness-110 hover:scale-105
                                       flex items-center gap-1.5 transition-all"
                        >
                            LANJUT PENUGASAN KRU
                            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                    </div>
                </div>

                {/* ── BODY: PETA + PANEL ─────────────────────────────────── */}
                <div className="flex-1 flex overflow-hidden">

                    {/* PETA */}
                    <div className="flex-1 relative" style={{ minHeight: 500 }}>
                        {/* Border orange tipis sekeliling peta */}
                        <div className="absolute inset-0 pointer-events-none z-10
                                        ring-1 ring-primary/40 rounded-none" />

                        <Map
                            ref={mapRef}
                            {...viewState}
                            onMove={(e: any) => setViewState(e.viewState)}
                            style={{ width: '100%', height: '100%' }}
                            mapStyle="mapbox://styles/mapbox/dark-v11"
                            mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                        >
                            {/* Zona background polygon */}
                            <Source id="zones-preview" type="geojson" data={JAPFA_ZONES_GEOJSON as any}>
                                <Layer id="zones-fill" type="fill"
                                    paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.12 }} />
                                <Layer id="zones-line" type="line"
                                    paint={{ 'line-color': ['get', 'color'], 'line-width': 1.5,
                                             'line-opacity': 0.6, 'line-dasharray': [4, 4] }} />
                            </Source>

                            {/* Garis rute — glow layer */}
                            <Source id="routes-glow" type="geojson" data={routesGeoJSON as any}>
                                <Layer id="routes-glow-layer" type="line"
                                    paint={{ 'line-color': ['get', 'color'],
                                             'line-width': 14,
                                             'line-opacity': ['get', 'glowOpacity'],
                                             'line-blur': 8 }} />
                            </Source>

                            {/* Garis rute — main layer */}
                            <Source id="routes-main" type="geojson" data={routesGeoJSON as any}>
                                <Layer id="routes-main-layer" type="line"
                                    layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                                    paint={{ 'line-color': ['get', 'color'],
                                             'line-width': ['get', 'width'],
                                             'line-opacity': ['get', 'opacity'],
                                             'line-dasharray': [2, 1.5] }} />
                            </Source>

                            {/* Depot marker */}
                            <Marker longitude={DEPO_LON} latitude={DEPO_LAT} anchor="center">
                                <div style={{
                                    width: 38, height: 38, borderRadius: '50%',
                                    background: 'linear-gradient(135deg,#ef4444,#991b1b)',
                                    border: '3px solid white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontSize: 15, fontWeight: 900,
                                    boxShadow: '0 4px 18px rgba(239,68,68,0.55)',
                                    cursor: 'default', position: 'relative',
                                }}>
                                    🏭
                                    <div className="depo-ring" />
                                </div>
                            </Marker>

                            {/* Stop markers */}
                            {(draftData.jadwal_truk_internal || []).map((truk: any, i: number) => {
                                if (activeTruck !== null && activeTruck !== i) {
                                    // Render dimmed markers untuk truk yang tidak aktif
                                    return (draftData.jadwal_truk_internal[i].detail_perjalanan || []).map((stop: any, j: number) => {
                                        if (stop.nama_toko?.includes('GUDANG JAPFA') ||
                                            stop.keterangan === 'Start' || stop.keterangan === 'Finish') return null;
                                        const lon = parseFloat(stop.lon || stop.longitude);
                                        const lat = parseFloat(stop.lat || stop.latitude);
                                        if (isNaN(lon) || isNaN(lat)) return null;
                                        return (
                                            <Marker key={`dim-${i}-${j}`} longitude={lon} latitude={lat} anchor="center">
                                                <div className="dimmed-marker" style={{
                                                    width: 20, height: 20, borderRadius: '50%',
                                                    backgroundColor: '#334155',
                                                    border: '2px solid #475569',
                                                    display: 'flex', alignItems: 'center',
                                                    justifyContent: 'center', color: 'white',
                                                    fontSize: 9, fontWeight: 900,
                                                }}>{j}</div>
                                            </Marker>
                                        );
                                    });
                                }

                                const color = truckColors[(truk.color_index ?? i) % truckColors.length];
                                let displayNum = 0;

                                return (truk.detail_perjalanan || []).map((stop: any, j: number) => {
                                    if (stop.nama_toko?.includes('GUDANG JAPFA') ||
                                        stop.keterangan === 'Start' || stop.keterangan === 'Finish') return null;

                                    const lon = parseFloat(stop.lon || stop.longitude);
                                    const lat = parseFloat(stop.lat || stop.latitude);
                                    if (isNaN(lon) || isNaN(lat)) return null;

                                    displayNum++;
                                    const storeName = stop.nama_toko || stop.storeName || stop.lokasi || 'Toko';
                                    const warning = trafficWarnings[`${truk.route_id}_${storeName}`];
                                    const isHigh = warning?.severity === 'HIGH';
                                    const isMall = isMallStore(storeName);

                                    const markerColor = isHigh ? '#ef4444' : color;
                                    const markerSize = isMall ? 32 : 26;

                                    return (
                                        <Marker key={`${i}-${j}`} longitude={lon} latitude={lat} anchor="center">
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedPopup({ tIdx: i, sIdx: j, stop: { ...stop, nama_toko: storeName } });
                                                }}
                                                className={`cursor-pointer hover:scale-110 transition-transform
                                                    ${isHigh ? 'danger-pulse' : ''}`}
                                                style={{
                                                    width: markerSize, height: markerSize,
                                                    borderRadius: '50%',
                                                    backgroundColor: markerColor,
                                                    border: `${isMall ? '3px' : '2px'} solid white`,
                                                    display: 'flex', alignItems: 'center',
                                                    justifyContent: 'center', color: 'white',
                                                    fontSize: isMall ? 11 : 10, fontWeight: 900,
                                                    boxShadow: `0 2px 10px ${markerColor}88`,
                                                    position: 'relative',
                                                }}
                                                title={`${storeName} — Stop ${displayNum}`}
                                            >
                                                {displayNum}
                                                {/* Diamond shape untuk mall */}
                                                {isMall && (
                                                    <div style={{
                                                        position: 'absolute', top: -4, right: -4,
                                                        width: 10, height: 10,
                                                        backgroundColor: '#fbbf24',
                                                        border: '1px solid white',
                                                        borderRadius: '2px',
                                                        transform: 'rotate(45deg)',
                                                    }} title="Chain Minimarket/Mall" />
                                                )}
                                            </div>
                                        </Marker>
                                    );
                                });
                            })}

                            {/* Popup klik stop */}
                            {selectedPopup && (() => {
                                const { tIdx, sIdx, stop } = selectedPopup;
                                const truk = draftData.jadwal_truk_internal[tIdx];
                                const color = truckColors[(truk.color_index ?? tIdx) % truckColors.length];
                                const lon = parseFloat(stop.lon || stop.longitude);
                                const lat = parseFloat(stop.lat || stop.latitude);
                                const warning = trafficWarnings[`${truk.route_id}_${stop.nama_toko}`];
                                if (isNaN(lon) || isNaN(lat)) return null;
                                return (
                                    <Popup longitude={lon} latitude={lat} anchor="bottom"
                                        onClose={() => setSelectedPopup(null)} className="z-[9999]">
                                        <div className="p-2.5 min-w-[220px] text-slate-800 font-sans">
                                            {/* Header */}
                                            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
                                                <div className="w-3 h-3 rounded-full shrink-0"
                                                    style={{ backgroundColor: color }} />
                                                <span className="font-black text-sm text-slate-800 truncate">
                                                    {stop.nama_toko}
                                                </span>
                                            </div>
                                            {/* Info */}
                                            <div className="grid grid-cols-2 gap-1 text-xs mb-2.5">
                                                <span className="text-slate-400">Truk</span>
                                                <span className="font-bold text-slate-700">{truk.armada}</span>
                                                <span className="text-slate-400">Muatan</span>
                                                <span className="font-bold text-slate-700">
                                                    {stop.turun_barang_kg || stop.berat_kg} KG
                                                </span>
                                                <span className="text-slate-400">Est. Tiba</span>
                                                <span className={`font-bold ${warning ? 'text-red-600' : 'text-slate-700'}`}>
                                                    {warning?.real_eta_traffic || stop.jam_tiba || '–'}
                                                </span>
                                                <span className="text-slate-400">Tutup</span>
                                                <span className="font-bold text-slate-700">
                                                    {stop.timeWindow || stop.jam_maks || '20:00'}
                                                </span>
                                            </div>
                                            {warning && (
                                                <div className={`text-[10px] font-bold px-2 py-1 rounded mb-2
                                                    flex items-center gap-1
                                                    ${warning.severity === 'HIGH'
                                                        ? 'bg-red-100 text-red-600'
                                                        : 'bg-amber-100 text-amber-600'}`}>
                                                    <span className="material-symbols-outlined text-[12px]">warning</span>
                                                    Potensi telat {warning.delay_minutes} menit
                                                </div>
                                            )}
                                            {/* Pindah ke truk */}
                                            <div className="text-[10px] font-black text-slate-400 uppercase mb-1">
                                                Pindahkan ke:
                                            </div>
                                            <div className="space-y-1 max-h-[120px] overflow-y-auto">
                                                {(draftData.jadwal_truk_internal || []).map((t: any, ti: number) => {
                                                    if (ti === tIdx) return null;
                                                    const tc = truckColors[(t.color_index ?? ti) % truckColors.length];
                                                    return (
                                                        <button key={ti}
                                                            onClick={() => handleMoveStop(tIdx, ti, sIdx)}
                                                            className="w-full text-left px-2 py-1.5 rounded-lg
                                                                       bg-slate-50 hover:bg-slate-100
                                                                       text-xs font-bold flex items-center gap-2
                                                                       transition-colors text-slate-700"
                                                        >
                                                            <span className="w-2.5 h-2.5 rounded-full shrink-0"
                                                                style={{ backgroundColor: tc }} />
                                                            {t.armada}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </Popup>
                                );
                            })()}
                        </Map>

                        {/* Legenda marker */}
                        <div className="absolute bottom-4 left-4 z-10 bg-black/70 backdrop-blur-sm
                                        px-3 py-2 rounded-xl border border-white/10 flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-white/20 border-2 border-white
                                                flex items-center justify-center text-[9px] font-black text-white">
                                    1
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">Toko Biasa</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-7 h-7 rounded-full bg-white/20 border-[3px] border-white
                                                flex items-center justify-center text-[9px] font-black text-white relative">
                                    1
                                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5
                                                    bg-yellow-400 border border-white rounded-sm rotate-45" />
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">Mall / Minimarket</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white" />
                                <span className="text-[10px] text-slate-400 font-medium">Traffic Warning</span>
                            </div>
                        </div>
                    </div>

                    {/* ── PANEL KANAN ──────────────────────────────────────── */}
                    <div className="w-[340px] shrink-0 flex flex-col bg-[#111]
                                    border-l border-primary/25">

                        {/* Summary header panel */}
                        <div className="shrink-0 px-4 py-3 border-b border-white/10 bg-[#161616]">
                            <div className="text-[10px] font-black uppercase text-slate-500 mb-2.5 tracking-widest">
                                Armada & Rute
                            </div>
                            {/* Mini stats row */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: 'Truk', val: summary.activeTrucks, icon: 'local_shipping', color: 'text-primary' },
                                    { label: 'Toko', val: summary.totalStops, icon: 'storefront', color: 'text-emerald-400' },
                                    { label: 'Warning', val: summary.warnings, icon: 'warning', color: 'text-red-400' },
                                ].map(({ label, val, icon, color }) => (
                                    <div key={label}
                                        className="bg-white/5 rounded-lg p-2 text-center border border-white/5">
                                        <span className={`material-symbols-outlined text-[16px] ${color}`}>{icon}</span>
                                        <div className={`text-base font-black ${color}`}>{val}</div>
                                        <div className="text-[9px] text-slate-500 font-bold uppercase">{label}</div>
                                    </div>
                                ))}
                            </div>
                            {activeTruck !== null && (
                                <button
                                    onClick={() => setActiveTruck(null)}
                                    className="mt-2 w-full text-[10px] font-bold text-slate-400
                                               hover:text-white flex items-center justify-center gap-1
                                               transition-colors py-1"
                                >
                                    <span className="material-symbols-outlined text-[12px]">visibility</span>
                                    Tampilkan Semua Rute
                                </button>
                            )}
                        </div>

                        {/* List truk — scrollable */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                            {(draftData.jadwal_truk_internal || []).map((truk: any, i: number) => {
                                const color = truckColors[(truk.color_index ?? i) % truckColors.length];
                                const stops = (truk.detail_perjalanan || []).filter((s: any) =>
                                    !s.nama_toko?.includes('GUDANG JAPFA') &&
                                    s.keterangan !== 'Start' && s.keterangan !== 'Finish'
                                );
                                const isActive = activeTruck === i;

                                // Kapasitas truk — ambil dari previewData jika ada, fallback 2000
                                const allVehicles = previewData?.vehicles || [];
                                const vCap = allVehicles[i]?.capacity_kg || 2000;
                                const loadPct = Math.min((truk.total_muatan_kg / vCap) * 100, 100);

                                let displayNum = 0;

                                return (
                                    <div
                                        key={i}
                                        onDragOver={(e) => { e.preventDefault(); setDragOverTruck(i); }}
                                        onDragLeave={() => setDragOverTruck(null)}
                                        onDrop={(e) => {
                                            e.preventDefault(); setDragOverTruck(null);
                                            if (draggedDropped !== null) handleDropStoreToTruck(i, draggedDropped);
                                            else if (draggedItem) handleMoveStop(draggedItem.tIdx, i, draggedItem.sIdx);
                                        }}
                                        className={`rounded-xl border transition-all overflow-hidden
                                            ${isActive
                                                ? 'border-primary/60 bg-primary/5 shadow-md shadow-primary/10'
                                                : 'border-white/8 bg-white/3 hover:border-white/15'}
                                            ${dragOverTruck === i
                                                ? 'ring-2 ring-primary scale-[1.01]'
                                                : ''}`}
                                    >
                                        {/* Truck header — clickable */}
                                        <div
                                            className="flex items-center gap-2.5 p-3 cursor-pointer"
                                            onClick={() => handleSelectTruck(i)}
                                        >
                                            {/* Color dot */}
                                            <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow"
                                                style={{ backgroundColor: color }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className="text-sm font-black text-white truncate">
                                                        {truk.armada}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {truk.is_oncall && (
                                                            <span className="text-[8px] bg-primary/20 text-primary px-1 py-0.5 rounded font-black">ON-CALL</span>
                                                        )}
                                                        <span className="text-[10px] font-bold text-slate-500">{stops.length} toko</span>
                                                    </div>
                                                </div>
                                                {/* Capacity bar */}
                                                <div className="mt-1.5 flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${loadPct}%`,
                                                                backgroundColor: loadPct > 90
                                                                    ? '#ef4444'
                                                                    : loadPct > 70
                                                                        ? '#f59e0b'
                                                                        : color,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-bold shrink-0">
                                                        {truk.total_muatan_kg.toFixed(0)} KG
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="material-symbols-outlined text-slate-500 text-sm shrink-0">
                                                {isActive ? 'expand_less' : 'expand_more'}
                                            </span>
                                        </div>

                                        {/* Stop list — hanya tampil jika truk ini aktif */}
                                        {isActive && (
                                            <div className="border-t border-white/8 px-3 pb-3 pt-2 space-y-1.5">
                                                {stops.length === 0 ? (
                                                    <p className="text-[11px] text-slate-500 italic text-center py-2">
                                                        Tidak ada toko
                                                    </p>
                                                ) : stops.map((stop: any, j: number) => {
                                                    // Cari index asli di detail_perjalanan
                                                    const realIdx = (truk.detail_perjalanan || []).indexOf(stop);
                                                    displayNum++;
                                                    const storeName = stop.nama_toko || stop.storeName || stop.lokasi || 'Toko';
                                                    const warning = trafficWarnings[`${truk.route_id}_${storeName}`];
                                                    const isHigh = warning?.severity === 'HIGH';
                                                    const isMall = isMallStore(storeName);

                                                    return (
                                                        <div
                                                            key={j}
                                                            draggable
                                                            onDragStart={() => setDraggedItem({ tIdx: i, sIdx: realIdx })}
                                                            onDragEnd={() => setDraggedItem(null)}
                                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg
                                                                text-xs cursor-grab active:cursor-grabbing
                                                                transition-colors border
                                                                ${isHigh
                                                                    ? 'bg-red-900/20 border-red-500/40'
                                                                    : warning
                                                                        ? 'bg-amber-900/20 border-amber-500/40'
                                                                        : 'bg-white/4 border-white/8 hover:border-primary/30'}`}
                                                        >
                                                            {/* Nomor urut */}
                                                            <div
                                                                className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center
                                                                           font-black text-white text-[9px]"
                                                                style={{ backgroundColor: isHigh ? '#ef4444' : color }}
                                                            >
                                                                {displayNum}
                                                            </div>

                                                            {/* Nama toko */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="font-semibold text-slate-200 truncate" title={storeName}>
                                                                        {storeName}
                                                                    </span>
                                                                    {isMall && (
                                                                        <span className="text-[8px] font-black bg-yellow-500/20
                                                                                        text-yellow-400 px-1 rounded shrink-0">
                                                                            CHAIN
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {warning && (
                                                                    <span className={`text-[9px] font-bold flex items-center gap-0.5 mt-0.5
                                                                        ${isHigh ? 'text-red-400' : 'text-amber-400'}`}>
                                                                        <span className="material-symbols-outlined text-[9px]">warning</span>
                                                                        Telat ~{warning.delay_minutes} mnt
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* ETA + KG */}
                                                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded
                                                                    ${isHigh
                                                                        ? 'bg-red-600 text-white'
                                                                        : warning
                                                                            ? 'bg-amber-500 text-white'
                                                                            : 'bg-white/10 text-slate-300'}`}>
                                                                    {warning?.real_eta_traffic || stop.jam_tiba || '–'}
                                                                </span>
                                                                <span className="text-[9px] text-slate-500 font-bold">
                                                                    {stop.turun_barang_kg || stop.berat_kg} KG
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── ONCALL + DROPPED STORES ────────────────────── */}
                        {(droppedStores.length > 0 || draftData.jadwal_truk_internal?.some((t: any) => t.is_oncall)) && (
                            <div className="shrink-0 border-t border-white/10 bg-[#0e0e0e]">
                                {/* Tombol tambah truk oncall */}
                                <div className="px-3 pt-3 pb-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Truk On-Call
                                        </span>
                                        <button onClick={() => setShowOncallForm(v => !v)}
                                            className="text-[10px] font-black text-primary hover:text-white flex items-center gap-0.5 transition-colors">
                                            <span className="material-symbols-outlined text-[13px]">add</span>
                                            Tambah Truk
                                        </button>
                                    </div>
                                    {showOncallForm && (
                                        <div className="bg-white/5 rounded-xl border border-primary/20 p-3 mb-2 space-y-2">
                                            <input placeholder="Plat Nomor (B 1234 XYZ)"
                                                value={oncallForm.plate}
                                                onChange={e => setOncallForm(f => ({ ...f, plate: e.target.value }))}
                                                className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white placeholder-slate-500 outline-none focus:border-primary/50" />
                                            <div className="grid grid-cols-2 gap-2">
                                                <select value={oncallForm.type}
                                                    onChange={e => setOncallForm(f => ({ ...f, type: e.target.value }))}
                                                    className="bg-white/8 border border-white/10 rounded-lg px-2 py-2 text-xs font-bold text-white outline-none focus:border-primary/50">
                                                    <option value="CDD">CDD (~2.5T)</option>
                                                    <option value="CDE">CDE (~8T)</option>
                                                    <option value="Fuso">Fuso (~6T)</option>
                                                    <option value="L300">L300 (~1T)</option>
                                                </select>
                                                <input type="number" placeholder="Kapasitas KG"
                                                    value={oncallForm.capacity}
                                                    onChange={e => setOncallForm(f => ({ ...f, capacity: e.target.value }))}
                                                    className="bg-white/8 border border-white/10 rounded-lg px-2 py-2 text-xs font-bold text-white placeholder-slate-500 outline-none focus:border-primary/50" />
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={handleAddOncall} disabled={isAddingOncall}
                                                    className="flex-1 py-2 bg-primary text-white text-[10px] font-black rounded-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-1">
                                                    {isAddingOncall
                                                        ? <><span className="material-symbols-outlined text-[12px] animate-spin">sync</span>Menambahkan...</>
                                                        : <><span className="material-symbols-outlined text-[12px]">add_circle</span>Konfirmasi</>}
                                                </button>
                                                <button onClick={() => setShowOncallForm(false)}
                                                    className="px-3 py-2 bg-white/5 text-slate-400 text-[10px] font-bold rounded-lg hover:bg-white/10 transition-all">
                                                    Batal
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* Oncall truck cards dengan tombol TSP */}
                                {draftData.jadwal_truk_internal?.filter((t: any) => t.is_oncall).map((truk: any) => {
                                    const ti = draftData.jadwal_truk_internal.indexOf(truk);
                                    const col = truckColors[(truk.color_index ?? ti) % truckColors.length];
                                    const stops = (truk.detail_perjalanan || []).filter((s: any) => s.keterangan !== 'Start' && s.keterangan !== 'Finish');
                                    return (
                                        <div key={truk.route_id}
                                            onDragOver={e => { e.preventDefault(); setDragOverTruck(ti); }}
                                            onDragLeave={() => setDragOverTruck(null)}
                                            onDrop={e => {
                                                e.preventDefault(); setDragOverTruck(null);
                                                if (draggedDropped !== null) handleDropStoreToTruck(ti, draggedDropped);
                                                else if (draggedItem) handleMoveStop(draggedItem.tIdx, ti, draggedItem.sIdx);
                                            }}
                                            className={`mx-3 mb-2 rounded-xl border p-2.5 transition-all
                                                ${dragOverTruck === ti ? 'ring-2 ring-primary border-primary/60 scale-[1.01]' : 'border-primary/20 bg-primary/5'}`}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col }} />
                                                    <span className="text-[11px] font-black text-white">{truk.armada}</span>
                                                    <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">ON-CALL</span>
                                                </div>
                                                <span className="text-[10px] text-slate-400">{stops.length} toko</span>
                                            </div>
                                            {stops.length === 0 && (
                                                <p className="text-[10px] text-slate-500 italic text-center py-1.5">
                                                    Drag toko dari basket merah ke sini
                                                </p>
                                            )}
                                            {stops.length >= 2 && (
                                                <button onClick={() => handleOptimizeOncall(ti)} disabled={optimizingOncall === ti}
                                                    className="w-full mt-1.5 py-1.5 bg-primary/20 border border-primary/40 text-primary text-[10px] font-black rounded-lg hover:bg-primary/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1">
                                                    {optimizingOncall === ti
                                                        ? <><span className="material-symbols-outlined text-[12px] animate-spin">sync</span>Optimasi TSP...</>
                                                        : <><span className="material-symbols-outlined text-[12px]">route</span>Optimasi Urutan TSP</>}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                                {/* Dropped stores basket */}
                                {droppedStores.length > 0 && (
                                    <div className="px-3 pb-3">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <span className="material-symbols-outlined text-[13px] text-red-400">warning</span>
                                            <span className="text-[10px] font-black text-red-400 uppercase">
                                                {droppedStores.length} Toko Dropped
                                            </span>
                                            <span className="text-[9px] text-slate-500 ml-1">drag ke truk</span>
                                        </div>
                                        <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                                            {droppedStores.map((store, si) => (
                                                <div key={si} draggable
                                                    onDragStart={() => setDraggedDropped(si)}
                                                    onDragEnd={() => setDraggedDropped(null)}
                                                    className="flex items-center gap-2 bg-red-900/20 border border-red-500/30 rounded-lg px-2 py-1.5 cursor-grab active:cursor-grabbing hover:border-red-400/50 transition-colors">
                                                    <span className="material-symbols-outlined text-[12px] text-red-400">drag_indicator</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] font-bold text-red-200 truncate">{store.nama_toko}</p>
                                                        <p className="text-[9px] text-red-400">{store.berat_kg} KG</p>
                                                    </div>
                                                    <div className="flex gap-0.5 shrink-0">
                                                        {draftData.jadwal_truk_internal?.map((truk: any, ti: number) => {
                                                            const col = truckColors[(truk.color_index ?? ti) % truckColors.length];
                                                            return (
                                                                <button key={ti} title={`→ ${truk.armada}`}
                                                                    onClick={() => handleDropStoreToTruck(ti, si)}
                                                                    className="w-4 h-4 rounded-full border border-white/20 hover:scale-125 transition-transform"
                                                                    style={{ backgroundColor: col }} />
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer hint */}
                        <div className="shrink-0 px-4 py-2.5 border-t border-white/8 bg-[#0d0d0d]">
                            <p className="text-[9px] text-slate-600 font-bold text-center leading-relaxed">
                                Klik truk untuk focus • Drag toko dropped ke truk • Klik marker peta untuk detail
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}