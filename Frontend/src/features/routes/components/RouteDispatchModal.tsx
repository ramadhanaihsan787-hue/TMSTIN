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
        <div className="fixed inset-0 z-[9999999] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#111] rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden animate-in zoom-in-95">
                
                <div className="p-6 border-b border-slate-200 dark:border-[#333] flex justify-between items-center bg-slate-50 dark:bg-[#1A1A1A]">
                    <div>
                        <h2 className="text-2xl font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">engineering</span> Penugasan Kru & Armada
                        </h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">Pilih Truk, Supir, dan Helper untuk setiap rute. Data sinkron dengan Fleet Management.</p>
                    </div>
                    <button onClick={onBack} className="p-2 hover:bg-slate-200 dark:hover:bg-[#333] rounded-xl text-slate-500 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[65vh] bg-slate-50 dark:bg-[#0A0A0A] space-y-4">
                    {draftData.jadwal_truk_internal.map((truk: any, idx: number) => {
                        const availableDrivers = getAvailableDrivers(idx);
                        const availableHelpers = getAvailableHelpers(idx);
                        const availableFleets = getAvailableFleets(idx);

                        return (
                            <div key={idx} className="bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#333] rounded-xl p-5 flex flex-col md:flex-row items-center gap-6 shadow-sm hover:border-primary transition-colors">
                                
                                {/* 🌟 SEKARANG TRUK BISA DIPILIH (DROPDOWN) */}
                                <div className="flex-1 w-full flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#222] border-2 border-slate-200 dark:border-[#444] flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-slate-400">local_shipping</span>
                                    </div>
                                    <div className="w-full">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Armada Truk</label>
                                        <select 
                                            value={assignments[idx]?.armada || ""} 
                                            onChange={(e) => handleAssign(idx, 'armada', e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-[#444] rounded-lg px-3 py-1.5 text-base font-black text-slate-800 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                        >
                                            <option value={truk.armada}>{truk.armada} (Bawaan Sistem)</option>
                                            {availableFleets.map(f => (
                                                <option key={f.id} value={f.plateNumber} disabled={f.disabled}>
                                                    {f.plateNumber} • {f.model} • {f.capacity} KG
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[11px] font-bold text-slate-500 mt-1">{truk.total_muatan_kg.toFixed(1)} KG • {truk.detail_perjalanan.length - 2} Titik Drop</p>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
                                    <div className="flex flex-col gap-1 w-full sm:w-48">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Supir Utama</label>
                                        <select 
                                            value={assignments[idx]?.driver_id || ""} 
                                            onChange={(e) => handleAssign(idx, 'driver_id', parseInt(e.target.value))}
                                            className="w-full bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-[#444] rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary outline-none"
                                        >
                                            <option value={0} disabled>Pilih Supir...</option>
                                            {availableDrivers.map(d => (
                                                <option key={d.id} value={d.id} disabled={d.disabled}>
                                                    {d.name} {d.disabled ? '(Dipakai)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div className="flex flex-col gap-1 w-full sm:w-48">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Helper (Knek)</label>
                                        <select 
                                            value={assignments[idx]?.helper_id || ""} 
                                            onChange={(e) => handleAssign(idx, 'helper_id', parseInt(e.target.value))}
                                            className="w-full bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-[#444] rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary outline-none"
                                        >
                                            <option value={9999}>Tanpa Helper</option>
                                            {availableHelpers.map(h => (
                                                <option key={h.id} value={h.id} disabled={h.disabled}>
                                                    {h.name} {h.disabled ? '(Dipakai)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-[#333] bg-white dark:bg-[#1A1A1A] flex justify-end gap-3">
                    <button onClick={onBack} disabled={isSaving} className="px-6 py-3 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#333] rounded-xl transition-colors">
                        Kembali ke Peta
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="px-8 py-3 bg-primary text-white font-black rounded-xl hover:brightness-110 flex items-center gap-2 shadow-lg shadow-primary/30 transition-all active:scale-95 disabled:opacity-50">
                        {isSaving ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">send</span>}
                        SIMPAN & BERANGKATKAN!
                    </button>
                </div>

            </div>
        </div>
    );
}