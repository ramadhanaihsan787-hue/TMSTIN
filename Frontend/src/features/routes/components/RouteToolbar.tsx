// src/features/routes/components/RouteToolbar.tsx
import React, { useRef, useState } from "react";
import { toast } from 'sonner';
import { downloadFile } from '../../../shared/services/apiClient'; // [Item 4]

interface RouteToolbarProps {
    selectedDate: string;
    onDateChange: (date: string) => void;
    isUploading: boolean;
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    hasRoutes?: boolean; // Penanda kalau hari itu ada rute hasil VRP atau kosong
}

export default function RouteToolbar({ selectedDate, onDateChange, isUploading, onFileUpload, hasRoutes }: RouteToolbarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    // [Item 4] Ganti raw fetch → downloadFile() dari apiClient
    // Token ditambahkan otomatis oleh axios interceptor di apiClient.ts
    // baseURL dari VITE_API_URL, bukan hardcoded localhost
    const handleDownloadExcelManifest = async () => {
        setIsExporting(true);
        toast.loading("Sedang menyiapkan Surat Jalan JAPFA...", { id: "export-sj" });
        try {
            await downloadFile(
                `/api/routes/export-excel?date=${selectedDate}`,
                `Surat_Jalan_JAPFA_${selectedDate}.xlsx`
            );
            toast.success("Excel Surat Jalan Berhasil Diunduh!", { id: "export-sj" });
        } catch (error) {
            console.error(error);
            toast.error("Gagal membuat laporan Excel perusahaan", { id: "export-sj" });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex justify-between items-center bg-white dark:bg-[#1F1F1F] p-4 rounded-xl border border-slate-200 dark:border-[#333] shadow-sm">
            <div className="flex items-center gap-4">
                <h3 className="font-bold text-slate-800 dark:text-white">Filter Jadwal:</h3>
                <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => onDateChange(e.target.value)} 
                    className="px-3 py-2 bg-slate-50 dark:bg-[#111] border border-slate-300 dark:border-[#444] rounded-lg text-sm text-slate-700 dark:text-white tracking-tight outline-none focus:border-primary" 
                />
            </div>
            <div className="flex items-center gap-3">
                <button type="button" className="px-5 py-2.5 bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-[#333] text-slate-700 dark:text-white font-bold rounded-lg hover:bg-slate-50 transition-all text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-emerald-600">download</span> Download Delivery Order
                </button>
                
                {/* 🌟 TOMBOL CETAK ASLI EXCEL JAPFA */}
                <button 
                    type="button" 
                    onClick={handleDownloadExcelManifest} 
                    disabled={isExporting || hasRoutes === false}
                    className="px-5 py-2.5 bg-amber-500 text-white font-bold rounded-lg hover:brightness-110 transition-all text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                    <span className="material-symbols-outlined text-lg">print</span> 
                    {isExporting ? 'Generating Excel...' : 'Cetak Surat Jalan'}
                </button>

                <button type="button" onClick={handleUploadClick} disabled={isUploading} className="px-5 py-2.5 bg-primary text-white font-bold rounded-lg hover:brightness-110 transition-all text-sm flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95">
                    <span className="material-symbols-outlined text-lg">upload_file</span> Upload SAP Excel
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx" onChange={onFileUpload} />
            </div>
        </div>
    );
}