import type { RouteItem, TrafficWarning } from "../types";

// 🌟 FUNGSI WARNA PINDAH KE SINI
const getTruckColors = (loadPercent: number) => {
    if (loadPercent > 80) return { hex: '#10b981', class: 'emerald', text: `Optimal • ${loadPercent}%` };
    if (loadPercent > 50) return { hex: '#f59e0b', class: 'amber', text: `Moderate • ${loadPercent}%` };
    return { hex: '#ef4444', class: 'red', text: `Low • ${loadPercent}%` };
};

interface Truck3DProps {
    plateNumber: string;
    driverName: string;
    truckType: string;
    zone: string;
    colorHex: string;
    percent: number;
    outerText: string;
    loadKg: string;
    colorClass: string;
    isSelected: boolean;
    onClick: () => void;
    // 🌟 SPRINT 4: Tambahin props buat warning
    warningCount: number;
    criticalCount: number;
}

// 🌟 KOMPONEN TRUK KITA UMPETIN DI DALEM FILE INI BIAR RAPI
const Truck3D = ({ plateNumber, driverName, truckType, zone, colorHex, percent, outerText, loadKg, colorClass, isSelected, onClick, warningCount, criticalCount }: Truck3DProps) => {
    return (
        <div onClick={onClick} className={`bg-white dark:bg-[#1F1F1F] p-4 rounded-xl shadow-sm transition-all cursor-pointer relative overflow-visible ${isSelected ? 'border-2 border-primary ring-4 ring-primary/5 shadow-md scale-[1.02]' : 'border border-slate-200 dark:border-[#333] hover:border-primary/50'}`}>
            
            {/* 🌟 SPRINT 4: BADGE WARNING MACET */}
            {warningCount > 0 && (
                <div className={`absolute -top-3 -right-3 z-[100] flex items-center justify-center w-8 h-8 rounded-full border-2 border-white dark:border-[#1F1F1F] shadow-lg text-white text-xs font-black ${criticalCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}>
                    {warningCount}
                </div>
            )}

            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-900 dark:text-white">{plateNumber}</span>
                        {isSelected && <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">SELECTED</span>}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{driverName} | {truckType}</p>
                </div>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-300">ZONE: {zone}</span>
            </div>

            <div className="mt-4 bg-[#111111] rounded-2xl p-6 border border-[#333] shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-32 h-32 bg-${colorClass}-500/10 blur-[40px] rounded-full pointer-events-none`}></div>
                <div className="flex justify-between items-baseline mb-3 relative z-10">
                    <span className="text-sm font-black text-white uppercase tracking-wider">Load Factor</span>
                    <span className={`text-[10px] font-black text-${colorClass}-400 bg-${colorClass}-400/10 px-2 py-1 rounded border border-${colorClass}-400/20 uppercase shadow-[0_0_10px_rgba(0,0,0,0.2)]`}>{outerText}</span>
                </div>
                <div className="flex justify-between text-xs mb-1 relative z-10"><span className="text-slate-400 font-medium uppercase">Current Load</span><span className="font-bold text-white">{loadKg}</span></div>

                {/* ANIMASI TRUK FLAT DARI TMSJAPFA-MAIN */}
                <div className="relative w-full h-36 flex items-center justify-center mt-4">
                    <div className="relative flex items-end gap-[2px]">
                        {/* CONTAINER - simple box */}
                        <div className="relative w-[160px] h-[56px] rounded-md border-2 border-slate-600 overflow-hidden bg-slate-700">
                            {/* Load fill */}
                            <div className="absolute inset-0 rounded-sm" style={{ width: `${percent}%`, background: `linear-gradient(135deg, ${colorHex}, ${colorHex}dd)` }}>
                                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.5) 6px, rgba(255,255,255,0.5) 12px)' }}></div>
                            </div>
                            {/* Percent label */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-white font-black text-2xl drop-shadow-lg">{percent}%</span>
                            </div>
                            {/* Container rear door lines */}
                            <div className="absolute left-0 top-0 h-full w-[2px] bg-slate-500"></div>
                            <div className="absolute left-[3px] top-[25%] h-[50%] w-[1px] bg-slate-500/50"></div>
                        </div>
                        {/* CAB - bus head shape */}
                        <div className="relative w-[48px] h-[48px] bg-slate-300 border-2 border-slate-600 rounded-r-xl rounded-l-sm overflow-hidden flex flex-col">
                            {/* Windshield */}
                            <div className="mx-[4px] mt-[4px] h-[22px] bg-sky-900/80 rounded-tr-lg rounded-sm border border-slate-500">
                                <div className="absolute top-[5px] right-[7px] w-[14px] h-[1px] bg-sky-300/40"></div>
                            </div>
                            {/* Body */}
                            <div className="flex-1 flex items-end justify-between px-[5px] pb-[3px]">
                                {/* Headlight */}
                                <div className={`w-[6px] h-[6px] rounded-full ${isSelected ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)] animate-pulse' : 'bg-amber-600/60'}`}></div>
                                {/* Bumper line */}
                                <div className="w-[16px] h-[3px] bg-slate-500 rounded-full"></div>
                            </div>
                        </div>
                        {/* Wheels under container */}
                        <div className="absolute -bottom-[8px] left-[16px] flex gap-[6px]">
                            <div className="w-[14px] h-[14px] rounded-full bg-slate-900 border-[3px] border-slate-600 shadow-md"></div>
                            <div className="w-[14px] h-[14px] rounded-full bg-slate-900 border-[3px] border-slate-600 shadow-md"></div>
                        </div>
                        {/* Wheels under cab */}
                        <div className="absolute -bottom-[8px] right-[14px]">
                            <div className="w-[14px] h-[14px] rounded-full bg-slate-900 border-[3px] border-slate-600 shadow-md"></div>
                        </div>
                        {/* Shadow */}
                        <div className="absolute -bottom-[14px] left-0 w-full h-[6px] bg-black/30 blur-md rounded-full"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 🌟 INI KOMPONEN UTAMA YANG DI-EXPORT
interface TruckListProps {
    routesData: RouteItem[];
    selectedRouteId: string | null;
    onSelectRoute: (routeId: string) => void;
    // 🌟 SPRINT 4: Tangkep props warning dari parent
    trafficWarnings?: TrafficWarning[];
}

export default function TruckList({ routesData, selectedRouteId, onSelectRoute, trafficWarnings = [] }: TruckListProps) {
    return (
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 pb-10">
            {routesData.length > 0 ? (
                routesData.map((route) => {
                    const routeId = route.routeId || (route as any).route_id;
                    const vehicle = route.vehicle || (route as any).kendaraan;
                    const driverName = route.driverName || (route as any).driver_name;
                    const vehicleType = route.vehicleType || (route as any).jenis;
                    const zone = route.zone;
                    const totalWeight = route.totalWeight || (route as any).total_berat || 0;

                    const maxCap = (route as any).capacity || 2000;
                    const loadPercent = Math.min(Math.round((totalWeight / maxCap) * 100), 100);
                    const colors = getTruckColors(loadPercent);
                    
                    // 🌟 Hitung total warning buat truk ini
                    const routeWarnings = trafficWarnings.filter(w => w.truck_id === routeId);
                    const criticalWarnings = routeWarnings.filter(w => w.severity === 'HIGH');
                    
                    return (
                        <Truck3D
                            key={routeId}
                            plateNumber={vehicle}
                            driverName={driverName}
                            truckType={vehicleType}
                            zone={zone}
                            colorHex={colors.hex}
                            percent={loadPercent}
                            outerText={colors.text}
                            loadKg={`${totalWeight} / ${maxCap} Kg`}
                            colorClass={colors.class}
                            isSelected={selectedRouteId === routeId}
                            onClick={() => onSelectRoute(routeId)}
                            warningCount={routeWarnings.length}
                            criticalCount={criticalWarnings.length}
                        />
                    );
                })
            ) : (
                <div className="p-10 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-300 dark:border-[#333] rounded-2xl text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">manage_search</span>
                    <p className="font-bold">Belum ada rute.</p>
                </div>
            )}
        </div>
    );
}