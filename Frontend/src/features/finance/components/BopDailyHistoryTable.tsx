import React from 'react';
import type { ExpenseEntry } from '../types';

interface BopDailyHistoryTableProps {
    todayEntries: ExpenseEntry[];
    entries: ExpenseEntry[];
    handleExportExcel: () => void;
    setDetailEntry: (entry: ExpenseEntry) => void;
    handleEdit: (entry: ExpenseEntry) => void;
    handleDelete: (id: string) => void;
}

const formatRp = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n);

export const BopDailyHistoryTable: React.FC<BopDailyHistoryTableProps> = ({
    todayEntries,
    entries,
    handleExportExcel,
    setDetailEntry,
    handleEdit,
    handleDelete
}) => {
    return (
        <section className="mt-12 bg-white dark:bg-[#111111] rounded-xl shadow-sm dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-white/5 overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 border-b border-slate-100 dark:border-white/5">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Input Terakhir Hari Ini</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-sm">
                        {todayEntries.length} entry tercatat hari ini — Total: {formatRp(todayEntries.reduce((s, e) => s + e.total, 0))}
                    </p>
                </div>
                {/* Sleek Mini Export Button */}
                <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-sm group shrink-0"
                >
                    <span className="material-symbols-outlined text-base group-hover:translate-y-0.5 transition-transform">file_download</span>
                    Ekspor Data BOP
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                            <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Time</th>
                            <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Plate</th>
                            <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Driver</th>
                            <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Total Expense</th>
                            <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                        {entries.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-16 text-center text-slate-400 dark:text-slate-500">
                                    <span className="material-symbols-outlined text-5xl mb-4 block opacity-30">receipt_long</span>
                                    <p className="font-semibold">Belum ada data</p>
                                </td>
                            </tr>
                        ) : entries.slice(0, 10).map((e, i) => (
                            <tr key={e.id || i} className={`hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${i % 2 === 1 ? 'bg-slate-50/50 dark:bg-white/[0.02]' : ''}`}>
                                <td className="py-5 px-6 font-medium text-slate-700 dark:text-slate-300">{e.time}</td>
                                <td className="py-5 px-6 font-bold text-slate-900 dark:text-white">
                                    {e.plate}
                                    {e.isOncall && <span className="ml-2 text-[10px] bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">ONCALL</span>}
                                </td>
                                <td className="py-5 px-6 text-slate-600 dark:text-slate-400">{e.driver}</td>
                                <td
                                    className="py-5 px-6 font-bold text-slate-900 dark:text-white cursor-pointer hover:text-primary transition-colors"
                                    onClick={() => setDetailEntry(e)}
                                >
                                    <div className="flex items-center gap-2">
                                        {formatRp(e.total)}
                                        <span className="material-symbols-outlined text-[16px] text-slate-400">info</span>
                                    </div>
                                </td>
                                <td className="py-5 px-6 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => handleEdit(e)} className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-primary/10 rounded-full">
                                            <span className="material-symbols-outlined text-xl">edit_note</span>
                                        </button>
                                        <button onClick={() => e.id && handleDelete(e.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full">
                                            <span className="material-symbols-outlined text-xl">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {entries.length > 10 && (
                <div className="p-6 bg-slate-50/50 dark:bg-white/[0.02] text-center border-t border-slate-100 dark:border-white/5">
                    <button className="text-primary font-bold text-sm hover:underline tracking-tight">View All Historical Entries</button>
                </div>
            )}
        </section>
    );
};
