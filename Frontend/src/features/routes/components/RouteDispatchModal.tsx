import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "../../../shared/services/apiClient"; 

interface RouteDispatchModalProps {
    draftData: any;
    onBack: () => void;
    onConfirmSave: (finalData: any) => void;
    isSaving: boolean;
}

export default function RouteDispatchModal({ draftData, onBack, onConfirmSave, isSaving }: RouteDispatchModalProps) {
    const [driverList, setDriverList] = useState<any[]>([]);
    const [helperList, setHelperList] = useState<any[]>([]);
    const [fleetList, setFleetList] = useState<any[]>([]); // 🌟 STATE BARU BUAT TRUK
    const [isLoadingData, setIsLoadingData] = useState(true);
    
    // State assignments sekarang nyimpen armada juga!
    const [assignments, setAssignments] = useState<Record<number, { armada: string, driver_id: number, helper_id: number }>>({});

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                // 1. NEMBAK API KRU (Supir & Helper digabung)
                const crewResponse = await api.get('/api/driver/list/available');
                const drivers = crewResponse.data?.data?.drivers || [];
                const helpers = crewResponse.data?.data?.helpers || [];
                
                const allCrew = [...drivers, ...helpers];
                const uniqueCrew = Array.from(new Map(allCrew.map(c => [c.id, c])).values());

                setDriverList(uniqueCrew);
                setHelperList(uniqueCrew);

                // 2. NEMBAK API TRUK (Dari modul Fleet Management)
                const fleetResponse = await api.get('/api/fleet');
                const fleets = fleetResponse.data?.data || [];
                // Filter cuma truk yang lagi nganggur/tersedia
                const availableFleets = fleets.filter((f: any) => f.status === "Available");
                setFleetList(availableFleets);

                // 3. INIT STATE (Buang DEDICATED_MAP, ganti ke auto-assign dinamis)
                const initial: Record<number, { armada: string, driver_id: number, helper_id: number }> = {};
                const usedDrivers = new Set<number>();

                draftData.jadwal_truk_internal.forEach((truk: any, idx: number) => {
                    let assignedD = 0;
                    // Cari kru yang masih nganggur buat dijadiin supir default
                    const availableDriver = uniqueCrew.find(d => !usedDrivers.has(d.id));
                    
                    if (availableDriver) {
                        assignedD = availableDriver.id;
                        usedDrivers.add(assignedD);
                    }

                    initial[idx] = { 
                        armada: truk.armada, 
                        driver_id: assignedD, 
                        helper_id: 9999 // 🌟 AMAN! Default ke Tanpa Helper, bye-bye ID 103 gaib!
                    };
                });
                setAssignments(initial);

            } catch (error) {
                toast.error("Gagal memuat data dari server");
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchAllData();
    }, [draftData]);

    const handleAssign = (trukIdx: number, field: 'armada' | 'driver_id' | 'helper_id', val: string | number) => {
        setAssignments(prev => ({
            ...prev,
            [trukIdx]: { ...prev[trukIdx], [field]: val }
        }));
    };

    const handleSave = () => {
        const finalData = { ...draftData };
        finalData.jadwal_truk_internal = finalData.jadwal_truk_internal.map((truk: any, idx: number) => ({
            ...truk,
            armada: assignments[idx]?.armada || truk.armada, // Update plat nomor dari dropdown
            driver_id: assignments[idx]?.driver_id || 0,
            helper_id: assignments[idx]?.helper_id === 9999 ? null : assignments[idx]?.helper_id 
        }));
        onConfirmSave(finalData);
    };

    const getAvailableDrivers = (currentIdx: number) => {
        const usedIds = Object.keys(assignments).flatMap(key => {
            const idx = parseInt(key);
            if (idx === currentIdx) return [assignments[idx]?.helper_id];
            return [assignments[idx]?.driver_id, assignments[idx]?.helper_id];
        }).filter(id => id && id !== 9999);
        
        return driverList.map(d => ({ ...d, disabled: usedIds.includes(d.id) }));
    };

    const getAvailableHelpers = (currentIdx: number) => {
        const usedIds = Object.keys(assignments).flatMap(key => {
            const idx = parseInt(key);
            if (idx === currentIdx) return [assignments[idx]?.driver_id];
            return [assignments[idx]?.driver_id, assignments[idx]?.helper_id];
        }).filter(id => id && id !== 9999);
            
        return helperList.map(h => ({ ...h, disabled: usedIds.includes(h.id) && h.id !== 9999 }));
    };

    const getAvailableFleets = (currentIdx: number) => {
        // Biar 1 truk gak diplih 2 kali di rute yang berbeda
        const usedPlates = Object.keys(assignments)
            .filter(key => parseInt(key) !== currentIdx)
            .map(key => assignments[parseInt(key)]?.armada);

        return fleetList.map(f => ({
            ...f,
            disabled: usedPlates.includes(f.plateNumber)
        }));
    };

    if (isLoadingData) return <div className="fixed inset-0 z-[9999999] bg-slate-900/90 flex items-center justify-center"><div className="animate-spin text-white">Loading Data...</div></div>;

    return (
        <div className="fixed inset-0 z-[9999999] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 md:p-6 lg:p-10">
            <div className="bg-white dark:bg-[#111] rounded-[2rem] shadow-2xl w-full max-w-[1600px] h-[90vh] max-h-[900px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-[#333] relative">
                
                {/* DECORATIVE TOP BAR */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-400 via-primary to-orange-600 z-50"></div>

                <div className="px-6 md:px-10 py-6 md:py-8 border-b border-slate-200/80 dark:border-[#222] flex justify-between items-start md:items-center bg-gradient-to-br from-orange-50/50 to-white dark:from-[#1A110B] dark:to-[#111] flex-col md:flex-row gap-4 md:gap-0 relative overflow-hidden">
                    <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none"></div>

                    <div className="relative z-10">
                        <h2 className="text-2xl md:text-4xl font-black text-slate-800 dark:text-white flex items-center gap-4">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-primary to-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/40 ring-4 ring-primary/20">
                                <span className="material-symbols-outlined text-3xl md:text-4xl">engineering</span>
                            </div>
                            <span className="tracking-tight">PENUGASAN KRU & ARMADA</span>
                        </h2>
                        <p className="text-sm md:text-base font-medium text-slate-500 mt-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-lg">info</span>
                            Pilih Truk, Supir, dan Helper untuk setiap rute. Data akan otomatis disinkronisasi dengan Fleet Management.
                        </p>
                    </div>
                    <button onClick={onBack} className="p-3 bg-white dark:bg-[#222] border border-slate-200 dark:border-[#444] shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-[#333] hover:text-red-500 rounded-xl text-slate-500 transition-all active:scale-95 self-end md:self-auto relative z-10 group">
                        <span className="material-symbols-outlined group-hover:rotate-90 transition-transform duration-300">close</span>
                    </button>
                </div>

                <div className="p-6 md:p-10 flex-1 overflow-y-auto bg-slate-50/50 dark:bg-[#080808] space-y-6 relative">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

                    <div className="relative z-10 space-y-6">
                        {draftData.jadwal_truk_internal.map((truk: any, idx: number) => {
                            const availableDrivers = getAvailableDrivers(idx);
                            const availableHelpers = getAvailableHelpers(idx);
                            const availableFleets = getAvailableFleets(idx);

                            return (
                                <div key={idx} className="bg-white dark:bg-[#141414] border border-slate-200/80 dark:border-[#222] rounded-3xl p-6 md:p-8 flex flex-col shadow-sm hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/50 dark:hover:border-primary/50 transition-all duration-300 relative overflow-hidden group">
                                    {/* Accent Line */}
                                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-slate-200 dark:bg-[#2A2A2A] group-hover:bg-primary transition-colors duration-300"></div>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-center pl-2">
                                        
                                        {/* ARMADA TRUK */}
                                        <div className="lg:col-span-6 flex items-start sm:items-center gap-5 sm:gap-6 flex-col sm:flex-row">
                                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-slate-50 dark:bg-[#1C1C1C] border border-slate-100 dark:border-[#333] flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 group-hover:bg-orange-50 dark:group-hover:bg-primary/10 transition-all duration-300">
                                                <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-4xl group-hover:text-primary transition-colors duration-300">local_shipping</span>
                                            </div>
                                            <div className="w-full">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-[#444] group-hover:bg-primary transition-colors"></span> 
                                                    Armada Truk
                                                </label>
                                                <div className="relative">
                                                    <select 
                                                        value={assignments[idx]?.armada || ""} 
                                                        onChange={(e) => handleAssign(idx, 'armada', e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-[#333] rounded-xl pl-4 pr-10 py-3 md:py-3.5 text-base md:text-lg font-black text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none transition-all hover:border-primary/50 shadow-sm cursor-pointer"
                                                    >
                                                        <option value={truk.armada}>{truk.armada} (Bawaan Sistem)</option>
                                                        {availableFleets.map(f => (
                                                            <option key={f.id} value={f.plateNumber} disabled={f.disabled}>
                                                                {f.plateNumber} • {f.model} • {f.capacity} KG
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-[#222] rounded-md flex items-center justify-center pointer-events-none shadow-sm border border-slate-100 dark:border-[#444]">
                                                        <span className="material-symbols-outlined text-sm text-slate-500">expand_more</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#222] border border-slate-200 dark:border-[#333] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[14px]">weight</span>
                                                        {truk.total_muatan_kg.toFixed(1)} KG Muatan
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#222] border border-slate-200 dark:border-[#333] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[14px]">pin_drop</span>
                                                        {truk.detail_perjalanan.length - 2} Titik Drop
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* SUPIR UTAMA */}
                                        <div className="lg:col-span-3 flex flex-col gap-2 w-full">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5 block flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm text-slate-300 dark:text-[#555] group-hover:text-primary transition-colors">person</span>
                                                Supir Utama
                                            </label>
                                            <div className="relative group/select">
                                                <select 
                                                    value={assignments[idx]?.driver_id || ""} 
                                                    onChange={(e) => handleAssign(idx, 'driver_id', parseInt(e.target.value))}
                                                    className="w-full bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-[#333] rounded-xl pl-4 pr-10 py-3 md:py-3.5 text-sm md:text-base font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none transition-all hover:border-primary/50 shadow-sm cursor-pointer"
                                                >
                                                    <option value={0} disabled>Pilih Supir...</option>
                                                    {availableDrivers.map(d => (
                                                        <option key={d.id} value={d.id} disabled={d.disabled}>
                                                            {d.name} {d.disabled ? '(Dipakai)' : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover/select:text-primary transition-colors">arrow_drop_down</span>
                                            </div>
                                        </div>
                                        
                                        {/* HELPER */}
                                        <div className="lg:col-span-3 flex flex-col gap-2 w-full">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5 block flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm text-slate-300 dark:text-[#555] group-hover:text-primary transition-colors">group</span>
                                                Helper (Knek)
                                            </label>
                                            <div className="relative group/select">
                                                <select 
                                                    value={assignments[idx]?.helper_id || ""} 
                                                    onChange={(e) => handleAssign(idx, 'helper_id', parseInt(e.target.value))}
                                                    className="w-full bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-[#333] rounded-xl pl-4 pr-10 py-3 md:py-3.5 text-sm md:text-base font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none transition-all hover:border-primary/50 shadow-sm cursor-pointer"
                                                >
                                                    <option value={9999}>Tanpa Helper</option>
                                                    {availableHelpers.map(h => (
                                                        <option key={h.id} value={h.id} disabled={h.disabled}>
                                                            {h.name} {h.disabled ? '(Dipakai)' : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover/select:text-primary transition-colors">arrow_drop_down</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="px-6 md:px-10 py-5 md:py-6 border-t border-slate-200/80 dark:border-[#222] bg-white dark:bg-[#161616] flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-4 items-center relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
                    <button onClick={onBack} disabled={isSaving} className="w-full md:w-auto px-8 py-4 font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-[#222] hover:bg-slate-200 dark:hover:bg-[#333] border border-slate-200 dark:border-[#333] rounded-xl transition-all hover:-translate-y-0.5">
                        Kembali
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto px-10 py-4 bg-gradient-to-r from-primary to-orange-500 text-white font-black rounded-xl hover:brightness-110 hover:shadow-xl hover:shadow-primary/40 flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100">
                        {isSaving ? <span className="material-symbols-outlined animate-spin text-2xl">sync</span> : <span className="material-symbols-outlined text-2xl">rocket_launch</span>}
                        <span className="text-lg tracking-wide uppercase">Simpan & Berangkatkan!</span>
                    </button>
                </div>

            </div>
        </div>
    );
}