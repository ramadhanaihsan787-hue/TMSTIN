import type { FuelLogEntry } from "../types";

interface FuelLogProps {
    logs: FuelLogEntry[];
    onInputFuel: () => void;
}

export default function FuelLog({ logs, onInputFuel }: FuelLogProps) {
    return (
        <div className="bg-app-panel border border-app-border rounded-xl p-5 shadow-sm transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h5 className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-app-orange">local_gas_station</span>
                    Fuel Expenses Log
                </h5>
                <button 
                    onClick={onInputFuel}
                    className="text-xs font-bold text-app-orange hover:underline flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95"
                >
                    <span className="material-symbols-outlined text-sm font-bold">add</span> 
                    Isi Biaya Bensin Manual
                </button>
            </div>
            
            {/* Grid of logs */}
            {logs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {logs.map((log) => (
                        <div 
                            key={log.id} 
                            className="p-3 bg-slate-50 dark:bg-app-bg/50 border border-app-border rounded-xl flex items-center justify-between transition-all duration-300 hover:border-app-orange/30 hover:bg-slate-100 dark:hover:bg-app-bg/90"
                        >
                            <div>
                                <p className="text-xs font-bold text-slate-800 dark:text-white">{log.date}</p>
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                                    {log.volumeLiters} L • {log.station}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-black text-app-orange">
                                    Rp {log.cost.toLocaleString('id-ID')}
                                </p>
                                <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
                                    {log.id.startsWith("temp-") ? "Just Added" : log.id}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6 text-slate-500 dark:text-slate-400 border border-app-border border-dashed rounded-xl bg-slate-50 dark:bg-app-bg/20">
                    <span className="material-symbols-outlined text-3xl mb-1 text-slate-400 dark:text-slate-600 block">receipt_long</span>
                    <p className="font-semibold text-xs">Belum ada log bensin masuk</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">Silakan isi biaya bensin manual lewat tombol di kanan atas.</p>
                </div>
            )}
        </div>
    );
}