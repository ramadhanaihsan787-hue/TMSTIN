import type { KPICardData } from '../types';

export default function KPICard({ label, value, change, trend, icon, bgColor, iconColor, subtext }: KPICardData) {
    return (
        <div className="bg-white dark:bg-card-dark p-6 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 hover:shadow-md transition-all group hover:border-japfa-orange/30">
            {/* Upper Row: Label & Animated Icon */}
            <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black text-japfa-gray dark:text-gray-400 uppercase tracking-[0.15em]">
                    {label}
                </span>
                <div className={`p-2 ${bgColor} dark:bg-opacity-10 ${iconColor} rounded-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                </div>
            </div>

            {/* Middle Row: Main Value & Percentage Badge */}
            <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-japfa-dark dark:text-white tracking-tight">
                    {value}
                </h3>
                
                {/* Visual Fix: Pake Badge Style buat Trend */}
                <span className={`text-[11px] font-black flex items-center px-2 py-0.5 rounded-md shadow-sm ${
                    trend === 'up' 
                        ? 'text-green-600 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20' 
                        : trend === 'down' 
                        ? 'text-red-600 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20' 
                        : 'text-gray-500 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10'
                }`}>
                    <span className="material-symbols-outlined text-sm mr-0.5">
                        {trend === 'up' ? 'arrow_upward' : trend === 'down' ? 'arrow_downward' : 'trending_flat'}
                    </span>
                    {change}
                </span>
            </div>

            {/* Bottom Row: Subtext with Premium Italic look */}
            <p className="mt-3 text-[11px] font-bold text-japfa-gray dark:text-gray-500 italic leading-relaxed">
                {subtext}
            </p>
        </div>
    );
}