// src/features/fleet/components/FuelLogSidebar.tsx
import type { FuelLogEntry } from "../types";

interface FuelLogSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    logs: FuelLogEntry[];
    onInputFuel: () => void;
}

export default function FuelLogSidebar({ 
    isOpen, 
    onClose, 
    logs,
    onInputFuel
}: FuelLogSidebarProps) {
    return (
        <>
            {/* Backdrop / Overlay */}
            <div 
                className={`fixed inset-0 z-[99999] bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                onClick={onClose}
            />

            {/* Sidebar Panel */}
            <div 
                className={`fixed top-0 right-0 h-screen w-full sm:w-[380px] bg-white dark:bg-app-panel border-l border-slate-200 dark:border-app-border shadow-2xl z-[100000] flex flex-col transform transition-transform duration-300 ease-in-out ${
                    isOpen ? "translate-x-0" : "translate-x-full"
                }`}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-app-border/80 flex items-center justify-between bg-slate-50/50 dark:bg-[#0f1115]/50">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-app-orange text-xl">local_gas_station</span>
                        <div>
                            <h3 className="font-black text-sm uppercase text-slate-800 dark:text-white tracking-wider">
                                Fuel Expenses Log
                            </h3>
                            <p className="text-[10px] font-semibold text-slate-500 dark:text-app-muted mt-0.5">
                                Histori Pengisian Bahan Bakar
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-app-border rounded-lg text-slate-500 dark:text-app-muted hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                {/* Vertical Scrollable Logs List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {logs.length > 0 ? (
                        logs.map((log) => (
                            <div 
                                key={log.id} 
                                className="p-4 bg-slate-50 dark:bg-[#0f1115]/40 border border-slate-100 dark:border-app-border rounded-xl flex flex-col gap-2 hover:border-app-orange/30 hover:bg-slate-100/50 dark:hover:bg-[#0f1115]/80 transition-all duration-300"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-bold text-slate-800 dark:text-white">{log.date}</p>
                                        <span className="text-[10px] text-slate-500 dark:text-app-muted font-medium mt-0.5 block">
                                            {log.station}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-app-orange">
                                            Rp {log.cost.toLocaleString('id-ID')}
                                        </p>
                                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block mt-0.5">
                                            {log.id.startsWith("temp-") ? "New" : log.id}
                                        </span>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-100 dark:border-app-border/40 flex justify-between items-center text-[10px] text-slate-500 dark:text-app-muted">
                                    <span className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px]">local_gas_station</span>
                                        Volume Bensin
                                    </span>
                                    <span className="font-bold text-slate-700 dark:text-white">
                                        {log.volumeLiters} Liters
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-16 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-app-border border-dashed rounded-xl bg-slate-50 dark:bg-app-bg/10 flex flex-col items-center justify-center p-6">
                            <span className="material-symbols-outlined text-4xl mb-2 text-slate-300 dark:text-slate-700">receipt_long</span>
                            <p className="font-bold text-xs">Belum ada log bensin masuk</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-1 max-w-[200px]">
                                Log bensin otomatis disinkronkan dari riwayat transaksi kasir keuangan.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}