import React from 'react';
import type { ExpenseEntry } from '../types';

interface BopImportPreviewProps {
    parsedPreview: ExpenseEntry[];
    handleCancelImport: () => void;
    handleConfirmImport: () => void;
}

const formatRp = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n);

export const BopImportPreview: React.FC<BopImportPreviewProps> = ({
    parsedPreview,
    handleCancelImport,
    handleConfirmImport
}) => {
    return (
        <div className="bg-white dark:bg-[#111111] p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 animate-[fadeIn_0.3s_ease-out] w-full">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-emerald-500 text-2xl">verified</span>
                            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Pratinjau Impor Data BOP</h2>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
                            Periksa kembali data dari Excel sebelum disimpan ke sistem. Terdapat {parsedPreview.length} baris data ditemukan.
                        </p>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={handleCancelImport}
                            className="flex-1 sm:flex-initial px-5 py-3 rounded-xl font-bold border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-sm"
                        >
                            Batal & Reset
                        </button>
                        <button
                            onClick={handleConfirmImport}
                            className="flex-1 sm:flex-initial px-5 py-3 rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 text-white shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all text-sm"
                        >
                            Konfirmasi & Simpan Semua
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-white/5">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Nopol</th>
                                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Driver</th>
                                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Helper</th>
                                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 text-right">BBM</th>
                                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 text-right">Tol</th>
                                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 text-right">Parkir (Resmi/Liar)</th>
                                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 text-right">Kuli / Helper</th>
                                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 text-right font-extrabold text-slate-900 dark:text-white">Total</th>
                                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {parsedPreview.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                    <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">{item.plate}</td>
                                    <td className="py-4 px-6 text-slate-600 dark:text-slate-400 text-sm font-medium">{item.driver}</td>
                                    <td className="py-4 px-6 text-slate-500 dark:text-slate-400 text-sm">{item.helperName || '—'}</td>
                                    <td className="py-4 px-6 text-right font-medium text-slate-700 dark:text-slate-300 text-sm">{formatRp(item.bbm)}</td>
                                    <td className="py-4 px-6 text-right font-medium text-slate-700 dark:text-slate-300 text-sm">{formatRp(item.tol)}</td>
                                    <td className="py-4 px-6 text-right font-medium text-slate-700 dark:text-slate-300 text-sm">
                                        <div>{formatRp(item.parkir)}</div>
                                        <div className="text-[10px] text-red-500 font-semibold">{item.parkirLiar > 0 ? `+ ${formatRp(item.parkirLiar)} Liar` : ''}</div>
                                    </td>
                                    <td className="py-4 px-6 text-right font-medium text-slate-700 dark:text-slate-300 text-sm">
                                        <div>{formatRp(item.kuliAngkut)}</div>
                                        <div className="text-[10px] text-slate-500">{item.lainLain > 0 ? `+ ${formatRp(item.lainLain)} Harian` : ''}</div>
                                    </td>
                                    <td className="py-4 px-6 text-right font-extrabold text-slate-900 dark:text-white text-sm">{formatRp(item.total)}</td>
                                    <td className="py-4 px-6 text-center">
                                        <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            Ready
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
