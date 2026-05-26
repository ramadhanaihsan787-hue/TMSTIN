// src/features/fleet/components/FleetTruckCard.tsx
import type { FleetVehicle } from "../types";

interface FleetTruckCardProps {
    truck: FleetVehicle;
    isSelected: boolean;
    onSelect: () => void;
}

export default function FleetTruckCard({ truck, isSelected, onSelect }: FleetTruckCardProps) {
    const {
        id,
        licensePlate,
        driverName = "Maria Chen",
        routeName = "Yard A → Yard B",
        cargoType = "Frozen Chicken",
        eta = "04:20 PM",
        speedKmH = 43,
        batteryPct = 62,
        currentTemp = -18.2,
        setPointTemp = -18,
        tempStatus = "Healthy",
        sparklineData = [20, 25, 15, 20, 10, 15]
    } = truck;

    // Determine status badge classes
    let badgeBg = "bg-app-green-bg text-app-green border-app-green/20";
    let badgeDot = "bg-app-green shadow-[0_0_5px_#10b981]";
    let statusText = "Healthy";
    let tempTextColor = "text-app-green";
    let progressBg = "bg-app-green shadow-[0_0_8px_#10b981]";
    let progressWidth = "70%";
    let batteryOverlayBg = "bg-app-green/20 border-app-green/50";
    let sparklineStroke = "#10b981";
    let tempLabel = "SAFE FROZEN";
    let gradientFrom = "from-app-green/5";

    if (tempStatus === "Warning") {
        badgeBg = "bg-app-orange-bg text-app-orange border-app-orange/20";
        badgeDot = "bg-app-orange shadow-[0_0_5px_#FF7A00]";
        statusText = "Warning";
        tempTextColor = "text-app-orange";
        progressBg = "bg-app-orange shadow-[0_0_8px_#FF7A00]";
        progressWidth = "50%";
        batteryOverlayBg = "bg-app-orange/20 border-app-orange/50";
        sparklineStroke = "#FF7A00";
        tempLabel = "TEMP WARNING";
        gradientFrom = "from-app-orange/5";
    } else if (tempStatus === "Critical") {
        badgeBg = "bg-app-red-bg text-app-red border-app-red/20";
        badgeDot = "bg-app-red shadow-[0_0_5px_#ef4444]";
        statusText = "Critical";
        tempTextColor = "text-app-red";
        progressBg = "bg-app-red shadow-[0_0_8px_#ef4444]";
        progressWidth = "25%";
        batteryOverlayBg = "bg-app-red/20 border-app-red/50";
        sparklineStroke = "#ef4444";
        tempLabel = "CRITICAL TEMP";
        gradientFrom = "from-app-red/5";
    }

    // Render sparkline SVG points
    const sparklinePoints = sparklineData
        .map((val, index) => `${(index * 100) / (sparklineData.length - 1)},${30 - (val / 30) * 25}`)
        .join(" ");

    const lastSparklinePointX = 100;
    const lastSparklinePointY = 30 - (sparklineData[sparklineData.length - 1] / 30) * 25;

    return (
        <div 
            onClick={onSelect}
            className={`bg-app-panel rounded-2xl border p-5 flex flex-col gap-4 shadow-sm hover:bg-app-panel-hover hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300 cursor-pointer ${
                isSelected ? 'border-app-accent ring-2 ring-app-accent/20 scale-[0.99] bg-app-panel-hover' : 'border-app-border'
            }`}
        >
            {/* Header */}
            <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800 dark:text-white text-lg tracking-tight">TRK-{String(id).padStart(3, '0')}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${badgeBg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${badgeDot}`}></span> {statusText}
                </span>
            </div>

            {/* Temperature Area */}
            <div className="bg-slate-100/50 dark:bg-[#121418] rounded-xl p-4 border border-slate-200 dark:border-[#25272c]/40 relative overflow-hidden group">
                {/* Subtle gradient bg */}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} to-transparent opacity-50`}></div>
                
                <div className="flex justify-between items-start mb-2 relative z-10">
                    <div className={`flex items-center gap-2 ${tempTextColor}`}>
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M12 3v18m0-18l-4 4m4-4l4 4M12 21l-4-4m4 4l4-4M3 12h18M3 12l4-4m-4 4l4 4m14-4l-4-4m4 4l-4 4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                        </svg>
                        <span className="text-3xl font-bold tracking-tight">{currentTemp.toFixed(1)}°C</span>
                    </div>
                    
                    {/* Sparkline */}
                    <div className="w-24 h-8 flex items-end">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30">
                            <polyline fill="none" points={sparklinePoints} stroke={sparklineStroke} strokeWidth="2"></polyline>
                            <circle cx={lastSparklinePointX} cy={lastSparklinePointY} fill={sparklineStroke} r="3"></circle>
                        </svg>
                    </div>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500 dark:text-app-muted mb-4 relative z-10">
                    <span className={`font-semibold tracking-wide ${tempTextColor}`}>{tempLabel}</span>
                    <div className="flex flex-col items-end">
                        <span className="text-slate-800 dark:text-white font-medium">{setPointTemp}°C</span>
                        <span className="text-[9px] uppercase tracking-wider">set point</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="relative z-10">
                    <div className="flex justify-between text-[10px] text-slate-500 dark:text-app-muted mb-1 font-medium">
                        <span>-25°C</span><span>0°C</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-[#25272c] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${progressBg}`} style={{ width: progressWidth }}></div>
                    </div>
                </div>
            </div>

            {/* Truck Graphic & Details */}
            <div className="flex gap-4 items-center mt-1">
                {/* Battery Visual Graphic */}
                <div className="relative w-28 h-[72px] bg-slate-100/50 dark:bg-[#121418] border border-app-border rounded-lg flex items-center justify-center p-2 overflow-hidden shrink-0">
                    {/* Battery Fill Bar */}
                    <div className={`absolute top-0 left-0 h-full border-r ${batteryOverlayBg} transition-all duration-500`} style={{ width: `${batteryPct}%` }}></div>
                    <span className="absolute text-xs font-black text-slate-800 dark:text-white z-10 drop-shadow">{batteryPct}%</span>
                    
                    {/* Truck Silhouette Icon */}
                    <svg className="w-12 h-12 text-slate-400 dark:text-app-muted z-0 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                    </svg>
                </div>

                {/* Details List */}
                <div className="flex-1 grid grid-cols-1 gap-1 text-xs">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-700 dark:text-app-muted flex items-center gap-1.5 font-medium">
                            <span className="material-symbols-outlined text-sm">person</span>
                            Driver
                        </span>
                        <span className="text-slate-800 dark:text-white font-medium text-right truncate max-w-[110px]" title={driverName}>{driverName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-700 dark:text-app-muted flex items-center gap-1.5 font-medium">
                            <span className="material-symbols-outlined text-sm">navigation</span>
                            Route
                        </span>
                        <span className="text-slate-800 dark:text-white font-medium text-right truncate max-w-[110px]" title={routeName}>{routeName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-700 dark:text-app-muted flex items-center gap-1.5 font-medium">
                            <span className="material-symbols-outlined text-sm">inventory_2</span>
                            Cargo
                        </span>
                        <span className="text-slate-800 dark:text-white font-medium text-right truncate max-w-[110px]" title={cargoType}>{cargoType}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-700 dark:text-app-muted flex items-center gap-1.5 font-medium">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            ETA
                        </span>
                        <span className="text-slate-800 dark:text-white font-medium text-right">{eta}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-700 dark:text-app-muted flex items-center gap-1.5 font-medium">
                            <span className="material-symbols-outlined text-sm">speed</span>
                            Speed
                        </span>
                        <span className="text-slate-800 dark:text-white font-medium text-right">{speedKmH} km/h</span>
                    </div>
            </div>
        </div>
    </div>
    );
}