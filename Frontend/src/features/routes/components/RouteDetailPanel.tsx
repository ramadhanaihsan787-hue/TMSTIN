// src/features/routes/components/RouteDetailPanel.tsx
import React, { useState } from "react";
import { toast } from 'sonner'; 

// 🌟 FIX MISI 2: Format Jam "Tiba - Selesai"
const formatTimeWindow = (timeStr: string | undefined, weight: number) => {
    if (!timeStr || typeof timeStr !== 'string') return "Menghitung...";
    try {
        const cleanedTimeStr = timeStr.substring(0, 5);
        const parts = cleanedTimeStr.split(':');
        if (parts.length < 2) return cleanedTimeStr;
        
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (isNaN(h) || isNaN(m)) return "Menghitung...";

        // Bongkar muat: Base 15 menit + (1 menit tiap 10kg)
        const serviceTime = 15 + ((weight || 0) / 10);
        const totalMinutesArrival = h * 60 + m;
        const totalMinutesDeparture = totalMinutesArrival + Math.round(serviceTime);
        
        const endH = Math.floor(totalMinutesDeparture / 60) % 24;
        const endM = totalMinutesDeparture % 60;
        
        const formatNum = (num: number) => num.toString().padStart(2, '0');
        
        return `${formatNum(h)}:${formatNum(m)} - ${formatNum(endH)}:${formatNum(endM)}`;
    } catch (e) {
        return "-";
    }
};

interface RouteDetailPanelProps {
    selectedRoute: any; 
    isFocusMode: boolean;
    onToggleFocus: () => void;
    showMapView: boolean;
    onToggleMapView: () => void;
    mapComponent?: React.ReactNode; 
}

export default function RouteDetailPanel({ selectedRoute, isFocusMode, onToggleFocus, showMapView, onToggleMapView, mapComponent }: RouteDetailPanelProps) {
    const [expandedStopIdx, setExpandedStopIdx] = useState<number | null>(null);

    let displayCounter = 1;

    return (
        <div className="space-y-4 transition-all duration-300 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400">timeline</span> 
                    Route Sequence {selectedRoute && `- ${selectedRoute.vehicle || selectedRoute.kendaraan || selectedRoute.armada}`}
                </h3>
                <div className="flex gap-2">
                    <button type="button" onClick={onToggleFocus} className={`px-3 py-1.5 border rounded-lg text-sm font-bold transition-colors flex items-center gap-1 ${isFocusMode ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:hover:bg-[#1A1A1A] dark:text-slate-300 dark:border-[#333]'}`}>
                        <span className="material-symbols-outlined text-base">{isFocusMode ? 'fullscreen_exit' : 'fullscreen'}</span>
                        {isFocusMode ? 'Normal View' : 'Focus Mode'}
                    </button>
                    <button type="button" onClick={onToggleMapView} className={`px-4 py-2 border rounded-lg text-sm font-bold transition-colors ${showMapView ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:hover:bg-[#1A1A1A] dark:text-slate-300 dark:border-[#333]'}`}>
                        {showMapView ? 'List View' : 'Map View'}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#333] rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px] flex-1">
                {showMapView ? (
                    <div className="flex-1 bg-slate-100 dark:bg-[#1A1A1A] flex flex-col relative w-full h-full min-h-[500px] z-0">
                        {mapComponent}
                    </div>
                ) : (
                    selectedRoute ? (
                        <div className="p-8 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar">
                            <div className="space-y-0 relative">
                                <div className="absolute left-[9px] top-2 bottom-6 w-0.5 bg-slate-200 dark:bg-slate-700 border-l-2 border-dashed border-slate-200 dark:border-[#333] -z-10"></div>

                                {/* GUDANG JAPFA (START POINT) */}
                                <div className="relative pl-10 pb-10">
                                    <div className="absolute left-[-11px] top-0 w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center ring-4 ring-white dark:ring-[#1F1F1F]">
                                        <span className="text-[10px] text-white font-bold">0</span>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">Main Distribution Center</h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gudang JAPFA Cikupa</p>
                                            <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 bg-slate-100 dark:bg-[#1A1A1A] text-slate-600 dark:text-slate-300 text-[11px] font-bold rounded">
                                                <span className="material-symbols-outlined text-xs">inventory</span> TOTAL MUATAN: {selectedRoute.totalWeight || selectedRoute.total_berat || selectedRoute.totalWeight || 0} KG
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">06:00 AM</span>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Berangkat</p>
                                        </div>
                                    </div>
                                </div>

                                {/* LOOPING DESTINASI */}
                                {(selectedRoute.details || selectedRoute.detail_rute || selectedRoute.detail_perjalanan || []).map((stop: any, idx: number) => {
                                    const namaToko = stop.storeName || stop.nama_toko || stop.lokasi || "Toko JAPFA";
                                    const beratKg = stop.weight || stop.weightKg || stop.berat_kg || stop.turun_barang_kg || 0;
                                    const jamTiba = stop.arrivalTime || stop.jam_tiba || stop.jam;
                                    const items = stop.items || [];
                                    
                                    if (namaToko === "📍 GUDANG JAPFA" || stop.keterangan === "Start" || stop.keterangan === "Finish") return null;

                                    const currentUrutan = displayCounter++;

                                    return (
                                        <div key={idx} className="relative pl-10 pb-10">
                                            <div
                                                className="absolute left-[-11px] top-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 ring-4 ring-white dark:ring-[#1F1F1F] cursor-pointer hover:scale-110 transition-transform"
                                                onClick={() => setExpandedStopIdx(expandedStopIdx === idx ? null : idx)}
                                            >
                                                <span className="text-[10px] text-white font-bold">{currentUrutan}</span>
                                            </div>

                                            <div className="flex justify-between items-start cursor-pointer group" onClick={() => setExpandedStopIdx(expandedStopIdx === idx ? null : idx)}>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors flex items-center gap-2">
                                                        {namaToko}
                                                        <span className={`material-symbols-outlined text-lg transition-transform ${expandedStopIdx === idx ? 'rotate-180' : ''}`}>expand_more</span>
                                                    </h4>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono text-[11px]">📍 GPS: {stop.latitude || stop.lat}, {stop.longitude || stop.lon}</p>
                                                    <div className="mt-3 flex gap-3">
                                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                            <span className="material-symbols-outlined text-xs">package_2</span> {beratKg} KG Total Turun
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">{formatTimeWindow(jamTiba, beratKg)}</span>
                                                    <p className="text-[10px] text-primary font-bold uppercase mt-2">Bongkar Muat</p>
                                                </div>
                                            </div>

                                            {expandedStopIdx === idx && (
                                                <div className="mt-4 bg-slate-50 dark:bg-[#1A1A1A] p-4 rounded-xl border border-slate-200 dark:border-[#333] animate-in slide-in-from-top-2 fade-in duration-200">
                                                    <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2 uppercase">
                                                        <span className="material-symbols-outlined text-sm">receipt_long</span> Rincian Produk Dikirim:
                                                    </h5>
                                                    {items && items.length > 0 ? (
                                                        <ul className={`grid gap-2 ${isFocusMode ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                            {items.map((product: any, prodIdx: number) => (
                                                                <li key={prodIdx} className="flex justify-between items-center text-sm border-b border-slate-200 dark:border-[#333] pb-2">
                                                                    <span className="text-slate-600 dark:text-slate-300 font-medium truncate pr-2">{product.name || product.nama}</span>
                                                                    <span className="font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-[#111] px-2 py-0.5 rounded shrink-0">{product.quantity || product.qty}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-xs italic text-slate-400">Rincian produk tidak dilampirkan atau tidak ditemukan.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 flex-1 flex flex-col items-center justify-center text-slate-500 opacity-60">
                            <span className="material-symbols-outlined text-5xl mb-3">touch_app</span>
                            <h4 className="font-bold">Pilih Truk di sebelah kiri untuk melihat urutan</h4>
                        </div>
                    )
                )}

                {/* 🌟 AREA FOOTER: SISA TOMBOL KIRIM HP SUPIR */}
                <div className="bg-slate-50 dark:bg-[#1A1A1A] p-6 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-[#333] mt-auto">
                    <button type="button" onClick={() => toast.success(`Jadwal berhasil dikirim ke HP Supir: ${selectedRoute?.driverName || selectedRoute?.driver_name || 'Supir'}!`)} disabled={!selectedRoute} className="w-full sm:w-auto px-8 py-3 bg-primary text-white font-bold rounded-lg hover:brightness-110 text-sm shadow-lg shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-lg">send_to_mobile</span> Kirim Jadwal ke HP Supir
                    </button>
                </div>
            </div>
        </div>
    );
}