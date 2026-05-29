// src/features/fleet/components/FleetTableRow.tsx
import type { FleetVehicle } from "../types";

interface FleetTableRowProps {
    truck: FleetVehicle;
    idx: number;
    isSelected: boolean;
    onSelect: () => void;
}

export default function FleetTableRow({ truck, idx, isSelected, onSelect }: FleetTableRowProps) {
    return (
        <tr 
            onClick={onSelect}
            className={`hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer ${isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
        >
            <td className={`px-6 py-4 font-bold ${isSelected ? 'text-primary' : 'text-[#111] dark:text-slate-300'}`}>
                {truck.licensePlate && truck.licensePlate !== '-' ? truck.licensePlate : `TRK-${String(truck.id).padStart(3, '0')}`}
            </td>
            <td className="px-6 py-4 text-sm font-bold text-[#111] dark:text-white">{truck.model}</td>
            <td className="px-6 py-4 text-sm font-bold text-[#111] dark:text-white">{truck.licensePlate}</td>
            <td className="px-6 py-4 text-sm text-slate-500">{truck.currentKm.toLocaleString()}</td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-slate-200 dark:bg-[#333] rounded-full overflow-hidden">
                        <div className="bg-primary h-full" style={{ width: `${10 + ((idx * 15) % 60)}%` }}></div>
                    </div>
                    {/* Simulasi efisiensi bahan bakar bawaan asli kodingan lu */}
                    <span className="text-xs font-bold text-[#111] dark:text-white">{12.0 + (idx % 4)}</span>
                </div>
            </td>
            <td className="px-6 py-4">
                <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full tracking-wide border ${
                    truck.status === 'Available' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 
                    truck.status === 'Maintenance' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800' : 
                    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                }`}>
                    {truck.status}
                </span>
            </td>
        </tr>
    );
}