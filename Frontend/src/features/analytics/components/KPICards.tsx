// src/features/analytics/components/KPICards.tsx
//
// 6 KPI card — 2 baris × 3 kolom di desktop.
// Semua field sekarang terhubung ke data aktual dari backend kpi_calculator.
//
// Baris 1: Total Shipments | Load Factor | Success Rate (OTIF)
// Baris 2: Fill Rate       | Return Rate | Damage Rate
//
import type { KPISummary } from '../types';

interface KPICardsProps {
    loading: boolean;
    data?: KPISummary;
}

// ─── Helper: render satu card ───────────────────────────────────────────────
interface CardProps {
    label: string;
    value: string | number;
    unit?: string;
    icon: string;
    accent: string;          // warna icon & value (Tailwind class)
    borderAccent?: string;   // warna border kiri opsional
    loading: boolean;
}

function KPICard({ label, value, unit, icon, accent, borderAccent, loading }: CardProps) {
    return (
        <div className={`
            bg-white dark:bg-[#111111] p-5 rounded-xl shadow-sm
            border border-slate-200 dark:border-[#2a2a2a]
            ${borderAccent ? `border-l-4 ${borderAccent}` : ''}
            flex flex-col gap-3
        `}>
            <div className="flex items-center justify-between">
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide">
                    {label}
                </p>
                <span className={`material-symbols-outlined text-[18px] ${accent}`}>
                    {icon}
                </span>
            </div>
            <div className="flex items-end gap-1.5">
                <h3 className={`text-2xl font-black ${accent}`}>
                    {loading ? (
                        <span className="inline-block w-16 h-7 bg-slate-200 dark:bg-slate-700
                                         rounded animate-pulse" />
                    ) : value}
                </h3>
                {unit && !loading && (
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-medium pb-1">
                        {unit}
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function KPICards({ loading, data }: KPICardsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* ── BARIS 1: Volume & Utilisasi ─────────────────────────── */}

            {/* 1. Total Shipments */}
            <KPICard
                label="Total Shipments"
                value={data?.totalShipments ?? 0}
                unit="rute aktif"
                icon="local_shipping"
                accent="text-slate-700 dark:text-white"
                borderAccent="border-l-slate-400"
                loading={loading}
            />

            {/* 2. Load Factor */}
            <KPICard
                label="Load Factor"
                value={data?.loadFactor ?? '0.0%'}
                unit="utilisasi"
                icon="inventory_2"
                accent={
                    parseFloat(data?.loadFactor ?? '0') >= 80
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : parseFloat(data?.loadFactor ?? '0') >= 60
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-600 dark:text-slate-300'
                }
                borderAccent="border-l-emerald-500"
                loading={loading}
            />

            {/* 3. Success Rate (OTIF) */}
            <KPICard
                label="Success Rate (OTIF)"
                value={data?.successRate ?? data?.otifRate ?? '0.0%'}
                unit="pengiriman berhasil"
                icon="task_alt"
                accent={
                    parseFloat(data?.successRate ?? '0') >= 90
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : parseFloat(data?.successRate ?? '0') >= 75
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-400'
                }
                borderAccent="border-l-emerald-500"
                loading={loading}
            />

            {/* ── BARIS 2: Kualitas Pengiriman ────────────────────────── */}

            {/* 4. Fill Rate */}
            <KPICard
                label="Fill Rate"
                value={data?.fillRate ?? '0.0%'}
                unit="qty terkirim"
                icon="moving"
                accent={
                    parseFloat(data?.fillRate ?? '0') >= 95
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : parseFloat(data?.fillRate ?? '0') >= 85
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-orange-600 dark:text-orange-400'
                }
                borderAccent="border-l-blue-500"
                loading={loading}
            />

            {/* 5. Return Rate */}
            <KPICard
                label="Return Rate"
                value={data?.returnRate ?? '0.0%'}
                unit="dikembalikan"
                icon="undo"
                accent={
                    parseFloat(data?.returnRate ?? '0') <= 3
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : parseFloat(data?.returnRate ?? '0') <= 8
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-400'
                }
                borderAccent="border-l-amber-500"
                loading={loading}
            />

            {/* 6. Damage Rate */}
            <KPICard
                label="Damage Rate"
                value={data?.damageRate ?? '0.0%'}
                unit="qty rusak"
                icon="report"
                accent={
                    parseFloat(data?.damageRate ?? '0') <= 1
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : parseFloat(data?.damageRate ?? '0') <= 3
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-400'
                }
                borderAccent="border-l-red-500"
                loading={loading}
            />
        </div>
    );
}