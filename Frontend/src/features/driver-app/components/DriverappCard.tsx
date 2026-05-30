import type { RouteStop } from '../types';

interface DriverCardProps {
    stop: RouteStop;
    onClick?: () => void;
    onNavigate?: () => void;
}

export default function DriverCard({ stop, onClick, onNavigate }: DriverCardProps) {
    // 1. KARTU STATUS SELESAI
    if (stop.status === 'completed') {
        return (
            <div className="bg-slate-100 dark:bg-[#2c2e33]/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 opacity-60">
                <div className="flex items-start gap-4">
                    <div className="text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-800 rounded-full p-2 shrink-0">
                        <span className="material-symbols-outlined text-xl">check_circle</span>
                    </div>
                    <div className="flex-1">
                        <p className="text-slate-500 dark:text-slate-400 font-bold line-through">{stop.sequence}. {stop.customerName}</p>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Completed</span>
                            <span className="text-[10px] text-slate-400 font-medium">{stop.timeWindow}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. KARTU STATUS AKTIF (SEDANG MENUJU KE SANA)
    if (stop.status === 'active') {
        return (
            <div className="bg-white dark:bg-[#2c2e33] rounded-3xl p-6 border-2 border-primary shadow-xl shadow-primary/10 relative overflow-hidden transition-all active:scale-[0.98]">
                <div className="flex items-start gap-4">
                    <div className="bg-primary text-white rounded-2xl w-12 h-12 flex items-center justify-center font-bold text-xl shadow-lg shadow-primary/30 shrink-0">
                        {stop.sequence}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-bold dark:text-white leading-tight">{stop.customerName}</h3>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary text-sm">schedule</span>
                            <span className="text-sm font-bold text-primary">{stop.timeWindow}</span>
                        </div>

                        <div className="flex items-center gap-3 mb-6">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-widest">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                                Active Route
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"
    style={{ color: stop.has_realisasi ? '#14b8a6' : undefined }}>
    {stop.weight}
    {stop.has_realisasi && (
        <span className="text-[8px] bg-teal-500/20 text-teal-400 px-1 rounded font-bold">✓</span>
    )}
</span>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onNavigate?.(); }}
                                className="flex-1 bg-primary hover:bg-primary/90 text-white h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                            >
                                <span className="material-symbols-outlined text-lg">navigation</span>
                                Navigate
                            </button>
                            <button 
                                onClick={onClick}
                                className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
                            >
                                <span className="material-symbols-outlined text-lg">info</span>
                                Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 3. KARTU STATUS PENDING (BELUM DIDATANGI)
    return (
        <div onClick={onClick} className="bg-white dark:bg-[#2c2e33] rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-[0.98] cursor-pointer">
            <div className="flex items-start gap-4">
                <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl w-10 h-10 flex items-center justify-center font-bold text-lg shrink-0">
                    {stop.sequence}
                </div>
                <div className="flex-1">
                    <h3 className="text-base font-bold dark:text-white">{stop.customerName}</h3>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">pending</span> Pending
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">scale</span>
    {stop.weight}
    {stop.has_realisasi && (
        <span className="ml-1 text-[9px] bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded font-bold">
            FINAL
        </span>
    )}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-auto bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                            {stop.timeWindow}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}