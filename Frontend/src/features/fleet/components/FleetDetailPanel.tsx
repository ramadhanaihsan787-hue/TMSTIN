import { useState } from "react";
import type { FleetVehicle, TelematicsData } from "../types";
import TelematicsCard from "./TelematicsCard";

interface FleetDetailPanelProps {
    selectedTruck: FleetVehicle | null;
    telematics: TelematicsData | null;
    onAssignDriver: () => void;
    onReportIssue: () => void;
    onInputFuel?: () => void;
}

export default function FleetDetailPanel({ 
    selectedTruck, 
    telematics, 
    onAssignDriver, 
    onReportIssue,
    onInputFuel
}: FleetDetailPanelProps) {
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

    if (!selectedTruck) {
        return (
            <aside className="w-full lg:w-80 bg-white dark:bg-[#111111] border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-[#333] p-6 flex flex-col items-center justify-center text-center shrink-0">
                <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">local_shipping</span>
                <p className="text-slate-500 font-bold text-sm">Pilih truk di tabel untuk melihat detail telematics.</p>
            </aside>
        );
    }

    return (
        <aside className="w-full lg:w-80 bg-white dark:bg-[#111111] border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-[#333] p-6 overflow-y-auto shrink-0 space-y-8 flex flex-col h-full custom-scrollbar">
            
            {/* Panel Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Telematics Connected</span>
                    </div>
                    <h4 className="text-2xl font-black text-[#111] dark:text-white leading-none mb-1">
                        TRK-{String(selectedTruck.id).padStart(3, '0')}
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                        {selectedTruck.licensePlate} • {selectedTruck.model}
                    </p>
                </div>
                
                {/* Action Menu (Titik Tiga) */}
                <div className="relative inline-block text-left">
                    <button 
                        onClick={() => setIsActionMenuOpen(!isActionMenuOpen)} 
                        className="p-2 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-lg hover:text-primary transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">more_vert</span>
                    </button>
                    
                    {isActionMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] z-20 overflow-hidden">
                            <div className="py-1">
                                <button 
                                    onClick={() => { onAssignDriver(); setIsActionMenuOpen(false); }} 
                                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222] flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">person_add</span> Ganti Supir
                                </button>
                                {onInputFuel && (
                                    <button 
                                        onClick={() => { onInputFuel(); setIsActionMenuOpen(false); }} 
                                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222] flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">local_gas_station</span> Catat Bensin
                                    </button>
                                )}
                                <button 
                                    onClick={() => { onReportIssue(); setIsActionMenuOpen(false); }} 
                                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">build</span> Servis Berkala
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Komponen Telematics */}
            <TelematicsCard telematics={telematics} />
            
        </aside>
    );
}