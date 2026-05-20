// src/features/routes/components/TruckList.tsx
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

// 🌟 KOMPONEN TRUK 3D KITA UMPETIN DI DALEM FILE INI BIAR RAPI
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

                {/* ANIMASI 3D TRUK */}
                <div className="relative w-full h-48 flex items-center justify-center mt-6 overflow-visible scale-110" style={{ perspective: '1200px' }}>
                    <div style={{ transform: 'rotateX(60deg) rotateZ(45deg)', transformStyle: 'preserve-3d' }} className="w-[240px] h-[72px] relative flex transition-all duration-700 hover:scale-105 cursor-pointer">
                        <div className="absolute right-0 top-0 w-[180px] h-[72px]" style={{ transformStyle: 'preserve-3d' }}>
                            <div className="absolute inset-0 bg-slate-900 border-[2px] border-slate-700" style={{ transform: 'translateZ(10px)' }}></div>
                            <div className="absolute inset-0 border-[3px] border-slate-200" style={{ transform: 'translateZ(80px)', background: `linear-gradient(to right, ${colorHex} 0%, ${colorHex} ${percent}%, #f1f5f9 ${percent}%, #f1f5f9 100%)` }}>
                                <div className="absolute inset-x-0 top-0 h-full opacity-30" style={{ width: `${percent}%`, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.7) 10px, rgba(255,255,255,0.7) 20px)' }}></div>
                            </div>
                            <div className="absolute bottom-0 left-0 w-full h-[70px] origin-bottom border-[3px] border-r-0 border-slate-200 flex items-center shadow-[-5px_5px_20px_rgba(0,0,0,0.5)]" style={{ transform: 'translateZ(10px) rotateX(-90deg)', background: `linear-gradient(to right, ${colorHex} 0%, ${colorHex} ${percent}%, #e2e8f0 ${percent}%, #e2e8f0 100%)` }}>
                                <div className="absolute inset-y-0 left-0 opacity-30" style={{ width: `${percent}%`, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.7) 10px, rgba(255,255,255,0.7) 20px)' }}></div>
                                <span className="text-white font-black text-4xl drop-shadow-md absolute" style={{ left: `calc(${percent}% / 2)`, transform: 'translate(-50%, 0)' }}>{percent}%</span>
                            </div>
                            <div className="absolute top-0 left-0 w-full h-[70px] origin-top bg-slate-300 border-[3px] border-l-0 border-slate-400" style={{ transform: 'translateZ(10px) rotateX(90deg)' }}></div>
                            <div className="absolute top-0 right-0 w-[70px] h-[72px] origin-right bg-slate-200 border-[3px] border-slate-300 flex flex-col p-[2px] gap-[2px]" style={{ transform: 'translateZ(10px) rotateY(-90deg)' }}>
                                <div className="flex-1 border-2 border-slate-400 bg-slate-100 flex items-center justify-center"><div className="w-1/2 h-full border-b-[2px] border-slate-300"></div></div>
                                <div className="flex-1 border-2 border-slate-400 bg-slate-100 flex items-center justify-center"><div className="w-1/2 h-full border-b-[2px] border-slate-300"></div></div>
                            </div>
                            <div className="absolute right-[20px] bottom-[-2px] w-[30px] h-[30px] origin-bottom bg-slate-900 rounded-full border-[6px] border-[#222] shadow-xl" style={{ transform: 'rotateX(-90deg) translateZ(-15px)' }}><div className="absolute inset-[2px] bg-slate-400 rounded-full"></div></div>
                            <div className="absolute right-[70px] bottom-[-2px] w-[30px] h-[30px] origin-bottom bg-slate-900 rounded-full border-[6px] border-[#222] shadow-xl" style={{ transform: 'rotateX(-90deg) translateZ(-15px)' }}><div className="absolute inset-[2px] bg-slate-400 rounded-full"></div></div>
                        </div>
                        <div className="absolute left-[10px] top-[4px] w-[40px] h-[64px]" style={{ transformStyle: 'preserve-3d' }}>
                            <div className="absolute inset-0 bg-slate-800" style={{ transform: 'translateZ(10px)' }}></div>
                            <div className="absolute inset-0 bg-slate-100 border-[3px] border-slate-300 shadow-inner" style={{ transform: 'translateZ(60px)' }}></div>
                            <div className="absolute bottom-0 left-0 w-full h-[50px] origin-bottom bg-slate-100 border-[3px] border-slate-300 flex items-start" style={{ transform: 'translateZ(10px) rotateX(-90deg)' }}>
                                <div className="w-full h-[30px] mt-2 ml-[2px] bg-slate-200 border-[2px] border-slate-400 rounded-sm overflow-hidden relative">
                                    <div className="w-full h-2/3 bg-slate-800/90 absolute top-0 border-b-2 border-slate-400"></div>
                                    <div className="w-2 h-[2px] bg-slate-500 absolute bottom-1 right-1"></div>
                                </div>
                            </div>
                            <div className="absolute top-0 left-0 w-full h-[50px] origin-top bg-slate-300 border-[3px] border-slate-400" style={{ transform: 'translateZ(10px) rotateX(90deg)' }}></div>
                            <div className="absolute top-0 left-0 w-[50px] h-[64px] origin-left bg-slate-200 border-[3px] border-slate-300" style={{ transform: 'translateZ(10px) rotateY(90deg)' }}>
                                <div className="absolute right-[2px] top-[4px] w-[26px] h-[50px] bg-slate-800/90 rounded-sm border-2 border-slate-700 shadow-inner"></div>
                            </div>
                            <div className="absolute left-[5px] bottom-[-2px] w-[30px] h-[30px] origin-bottom bg-slate-900 rounded-full border-[6px] border-[#222] shadow-xl" style={{ transform: 'rotateX(-90deg) translateZ(-15px)' }}><div className="absolute inset-[2px] bg-slate-400 rounded-full"></div></div>
                        </div>
                        <div className="absolute -bottom-8 -left-4 w-[110%] h-16 bg-black/40 blur-xl rounded-full" style={{ transform: 'rotateX(80deg) translateZ(-20px)' }}></div>
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
                    const maxCap = 2000;
                    
                    const currentWeight = route.totalWeight ?? (route as any).total_weight ?? (route as any).total_berat ?? 0;
                    const loadPercent = Math.min(Math.round((currentWeight / maxCap) * 100), 100) || 0;
                    const colors = getTruckColors(loadPercent);
                    
                    const currentRouteId = route.routeId ?? (route as any).route_id ?? "unknown_id";
                    
                    // 🌟 Hitung total warning buat truk ini
                    const routeWarnings = trafficWarnings.filter(w => w.truck_id === currentRouteId);
                    const criticalWarnings = routeWarnings.filter(w => w.severity === 'HIGH');
                    
                    return (
                        <Truck3D
                            key={currentRouteId}
                            plateNumber={route.vehicle ?? (route as any).kendaraan ?? "-"}
                            driverName={route.driverName ?? (route as any).driver_name ?? "-"}
                            truckType={route.vehicleType ?? (route as any).jenis ?? "-"}
                            zone={route.zone ?? "-"}
                            colorHex={colors.hex}
                            percent={loadPercent}
                            outerText={colors.text}
                            loadKg={`${currentWeight} / ${maxCap} Kg`}
                            colorClass={colors.class}
                            isSelected={selectedRouteId === currentRouteId}
                            onClick={() => onSelectRoute(currentRouteId)}
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