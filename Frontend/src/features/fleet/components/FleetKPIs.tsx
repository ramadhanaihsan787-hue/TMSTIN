// src/features/fleet/components/FleetKPIs.tsx

interface FleetKPIsProps {
    vehiclesStored?: number; // Total Fleet
    vehiclesOnDuty?: number; // Active Vehicles
    vehiclesMaintenance?: number; // In Maintenance
    coldChainBreaches?: number; // Cold Chain Alerts
    avgFuelEfficiency?: number; // Avg Fuel Efficiency
    onViewFuelLogClick?: () => void;
    onInputFuelClick: () => void;
}

export default function FleetKPIs({
    vehiclesStored = 0,
    vehiclesOnDuty = 0,
    vehiclesMaintenance = 0,
    coldChainBreaches = 0,
    avgFuelEfficiency = 8.2,
    onViewFuelLogClick,
    onInputFuelClick
}: FleetKPIsProps) {
    return (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {/* Card 1: Total Fleet */}
            <div className="bg-app-panel border border-app-border rounded-xl p-5 shadow-sm col-span-1 transition-all duration-300 hover:border-app-accent/40 group">
                <div className="flex items-center gap-2 text-app-accent mb-4">
                    <span className="material-symbols-outlined text-[20px] transition-transform group-hover:scale-110">local_shipping</span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-app-muted">Total Fleet</span>
                </div>
                <div className="flex items-end justify-between">
                    <span className="text-4xl font-bold text-slate-800 dark:text-white tracking-tight">{vehiclesStored}</span>
                    <div className="text-right">
                        <span className="text-sm font-semibold text-app-green">+3.8%</span>
                        <p className="text-[10px] text-slate-700 dark:text-app-muted mt-0.5">vs yesterday</p>
                    </div>
                </div>
            </div>

            {/* Card 2: Active Vehicles */}
            <div className="bg-app-panel border border-app-border rounded-xl p-5 shadow-sm col-span-1 transition-all duration-300 hover:border-app-green/40 group">
                <div className="flex items-center gap-2 text-app-green mb-4">
                    <span className="material-symbols-outlined text-[20px] transition-transform group-hover:scale-110">sensors</span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-app-muted">Active Vehicles</span>
                </div>
                <div className="flex items-end justify-between">
                    <span className="text-4xl font-bold text-slate-800 dark:text-white tracking-tight">{vehiclesOnDuty}</span>
                    <div className="text-right">
                        <span className="text-sm font-semibold text-app-green">Optimal</span>
                        <p className="text-[10px] text-slate-700 dark:text-app-muted mt-0.5">status</p>
                    </div>
                </div>
            </div>

            {/* Card 3: In Maintenance */}
            <div className="bg-app-panel border border-app-border rounded-xl p-5 shadow-sm col-span-1 transition-all duration-300 hover:border-red-500/40 group">
                <div className="flex items-center gap-2 text-red-500 mb-4">
                    <span className="material-symbols-outlined text-[20px] transition-transform group-hover:scale-110">build</span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-app-muted">In Maintenance</span>
                </div>
                <div className="flex items-end justify-between">
                    <span className="text-4xl font-bold text-slate-800 dark:text-white tracking-tight">{vehiclesMaintenance}</span>
                    <div className="text-right">
                        <span className="text-sm font-bold text-slate-700 dark:text-app-muted">Workshop</span>
                        <p className="text-[10px] text-slate-700 dark:text-app-muted mt-0.5">repairing</p>
                    </div>
                </div>
            </div>

            {/* Card 4: Cold Chain Alerts */}
            <div className="bg-app-panel border border-app-border rounded-xl p-5 shadow-sm col-span-1 transition-all duration-300 hover:border-app-orange/40 group">
                <div className="flex items-center gap-2 text-app-orange mb-4">
                    <span className="material-symbols-outlined text-[20px] transition-transform group-hover:scale-110">thermostat</span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-app-muted">Cold Chain Alerts</span>
                </div>
                <div className="flex items-end justify-between">
                    <span className="text-4xl font-bold text-slate-800 dark:text-white tracking-tight">{coldChainBreaches}</span>
                    <div className="text-right">
                        <span className={`text-sm font-semibold ${coldChainBreaches > 0 ? 'text-app-orange animate-pulse' : 'text-app-green'}`}>
                            {coldChainBreaches > 0 ? 'Warning' : 'All Safe'}
                        </span>
                        <p className="text-[10px] text-slate-700 dark:text-app-muted mt-0.5">temp breaches</p>
                    </div>
                </div>
            </div>

            {/* Card 5: Action (Lihat Log Bensin) & Avg. Fuel Efficiency */}
            <div className="col-span-1 flex flex-col gap-3">
                <button 
                    onClick={onViewFuelLogClick}
                    className="w-full bg-app-orange hover:bg-app-orange/90 text-white font-bold py-3 rounded-xl shadow-md shadow-app-orange/10 hover:shadow-app-orange/30 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs shrink-0"
                >
                    <span className="material-symbols-outlined text-sm font-bold">receipt_long</span>
                    Lihat Log Bensin
                </button>
                
                <div className="bg-app-panel border border-app-border rounded-xl p-4 flex-1 shadow-sm flex flex-col justify-center transition-all duration-300 hover:border-teal-500/40 group min-h-[70px]">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2 text-teal-500">
                            <span className="material-symbols-outlined text-sm transition-transform group-hover:rotate-12">trending_up</span>
                            <span className="text-[10px] font-bold text-slate-700 dark:text-app-muted uppercase tracking-wider">Avg. Efficiency</span>
                        </div>
                    </div>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-slate-800 dark:text-white">
                            {avgFuelEfficiency} <span className="text-[10px] font-normal text-slate-700 dark:text-app-muted">km/L</span>
                        </span>
                        <div className="text-right">
                            <span className="text-xs font-semibold text-app-green">+0.5%</span>
                            <p className="text-[9px] text-slate-700 dark:text-app-muted mt-0.5">vs last week</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}