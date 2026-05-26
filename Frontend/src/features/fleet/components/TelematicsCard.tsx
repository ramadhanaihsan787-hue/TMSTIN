import type { TelematicsData } from "../types";

interface TelematicsCardProps {
    telematics: TelematicsData | null;
}

export default function TelematicsCard({ telematics }: TelematicsCardProps) {
    if (!telematics) return null;

    const isWarning = telematics.isTempWarning;

    return (
        <div className="space-y-4">
            {/* 🌟 HEADER DENGAN INDIKATOR LIVE */}
            <div className="flex items-center justify-between">
                <h5 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">dashboard</span>
                    Digital Twin Telematics
                </h5>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 tracking-widest uppercase">Live</span>
                </div>
            </div>
            
            {/* 🌟 KARTU SUHU FREEZER - HIGH TECH STYLE */}
            <div className={`relative overflow-hidden p-6 rounded-3xl border-2 transition-all duration-500 shadow-xl ${
                isWarning 
                    ? 'bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/40 dark:to-[#1a1a1a] border-rose-400 shadow-rose-500/20' 
                    : 'bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/40 dark:to-[#1a1a1a] border-blue-400 shadow-blue-500/20'
            }`}>
                {/* Background glow effect */}
                <div className={`absolute -top-10 -right-10 w-40 h-40 blur-3xl rounded-full opacity-40 pointer-events-none transition-colors duration-500 ${isWarning ? 'bg-rose-500' : 'bg-blue-500'}`}></div>

                <div className="relative z-10 flex items-start justify-between mb-4">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-md border ${isWarning ? 'border-rose-200 text-rose-600 dark:border-rose-800 dark:text-rose-400' : 'border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400'}`}>
                        <span className="material-symbols-outlined text-[16px]">ac_unit</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">Chiller Temp</span>
                    </div>
                    {isWarning && (
                        <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/50 px-2 py-1 rounded shadow-sm animate-pulse">
                            <span className="material-symbols-outlined text-sm">warning</span>
                            <span className="text-[10px] font-bold tracking-wider uppercase">Critical</span>
                        </div>
                    )}
                </div>

                <div className="relative z-10 flex items-baseline gap-2">
                    <span className={`text-6xl font-black tracking-tighter ${isWarning ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {telematics.temperature.toFixed(1)}
                    </span>
                    <span className="text-2xl font-bold text-slate-500 dark:text-slate-400">°C</span>
                </div>

                <div className="relative z-10 mt-4 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-4">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Target</span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">&lt; 4.0 °C</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Variance</span>
                        <span className={`text-xs font-black ${telematics.temperature > 4.0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {telematics.temperature > 4.0 ? '+' : ''}{(telematics.temperature - 4.0).toFixed(1)} °C
                        </span>
                    </div>
                </div>
            </div>

            {/* 🌟 GRID SENSOR (COMPRESSOR & GPS) */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-2xl flex items-center gap-3 shadow-sm hover:shadow-md transition-all">
                    <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${telematics.compressorStatus === 'ON' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                        <span className={`material-symbols-outlined text-xl ${telematics.compressorStatus === 'ON' ? 'animate-[spin_3s_linear_infinite]' : ''}`}>mode_fan</span>
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Compressor</p>
                        <p className={`text-sm font-black ${telematics.compressorStatus === 'ON' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600'}`}>
                            {telematics.compressorStatus}
                        </p>
                    </div>
                </div>

                <div className="p-4 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-2xl flex items-center gap-3 shadow-sm hover:shadow-md transition-all">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-xl">satellite_alt</span>
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">GPS Signal</p>
                        <p className="text-sm font-black text-blue-600 dark:text-blue-400">{telematics.gpsSignal}</p>
                    </div>
                </div>

                {/* 🌟 STATUS PINTU BOX */}
                <div className="col-span-2 p-4 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${telematics.doorLocked ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                            <span className="material-symbols-outlined text-xl">door_back</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Box Door Status</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Physical security lock</p>
                        </div>
                    </div>
                    <span className={`px-3 py-1.5 text-[10px] font-black rounded-xl flex items-center gap-1.5 tracking-wider uppercase ${telematics.doorLocked ? 'bg-slate-100 text-slate-700 dark:bg-[#222] dark:text-slate-300' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse'}`}>
                        <span className="material-symbols-outlined text-[14px]">
                            {telematics.doorLocked ? 'lock' : 'lock_open'}
                        </span> 
                        {telematics.doorLocked ? 'Locked' : 'Opened'}
                    </span>
                </div>
            </div>
        </div>
    );
}