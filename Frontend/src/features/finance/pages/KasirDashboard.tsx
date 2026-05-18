import { useState, useEffect, useRef } from 'react';
import type { ExpenseEntry } from '../types';
import { useExpenses } from '../hooks/useExpenses';

const formatRp = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n);

export default function KasirDashboard() {
    const topRef = useRef<HTMLDivElement>(null);
    
    const {
        entries,
        fleets,
        drivers,
        isLoading,
        isMasterLoading,
        fetchMasterData,
        fetchToday,
        saveEntry,
        deleteEntry
    } = useExpenses();

    // Form state
    const [selectedFleetIdx, setSelectedFleetIdx] = useState(0);
    const [isOncall, setIsOncall] = useState(false);
    const [oncallPlate, setOncallPlate] = useState('');
    const [selectedDriver, setSelectedDriver] = useState('');
    const [customDriver, setCustomDriver] = useState('');
    const [selectedHelper, setSelectedHelper] = useState('');
    const [customHelper, setCustomHelper] = useState('');
    const [bbm, setBbm] = useState('');
    const [tol, setTol] = useState('');
    const [parkir, setParkir] = useState('');
    const [parkirLiar, setParkirLiar] = useState('');
    const [kuliAngkut, setKuliAngkut] = useState('');
    const [lainLain, setLainLain] = useState('');

    const [showToast, setShowToast] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [detailEntry, setDetailEntry] = useState<ExpenseEntry | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedPreview, setParsedPreview] = useState<ExpenseEntry[]>([]);

    const [showImportToast, setShowImportToast] = useState(false);
    const [importToastMsg, setImportToastMsg] = useState({ title: '', desc: '' });

    const triggerImportToast = (title: string, desc: string) => {
        setImportToastMsg({ title, desc });
        setShowImportToast(true);
        setTimeout(() => setShowImportToast(false), 5000);
    };

    const fleet = fleets[selectedFleetIdx] || null;
    const currentPlate = isOncall ? oncallPlate : (fleet?.plate || '');
    const currentDriver = selectedDriver === '__custom__' ? customDriver : selectedDriver;
    const currentHelper = selectedHelper === '__custom__' ? customHelper : selectedHelper;

    const n = (v: string) => Number(v) || 0;
    const total = n(bbm) + n(tol) + n(parkir) + n(parkirLiar) + n(kuliAngkut) + n(lainLain);

    // Fetch master data & today's entries on mount
    useEffect(() => {
        fetchMasterData();
        fetchToday();
    }, []);

    // Set default driver when list is loaded
    useEffect(() => {
        if (drivers.length > 0 && !selectedDriver) {
            setSelectedDriver(drivers[0].name);
        }
    }, [drivers]);

    const resetForm = () => {
        setBbm(''); setTol(''); setParkir(''); setParkirLiar('');
        setKuliAngkut(''); setLainLain('');
        if (drivers.length > 0) {
            setSelectedDriver(drivers[0].name);
        } else {
            setSelectedDriver('');
        }
        setCustomDriver('');
        setSelectedHelper(''); setCustomHelper('');
        setEditingId(null);
    };

    const handleSubmit = async () => {
        if (n(bbm) === 0 || n(tol) === 0 || n(parkir) === 0) {
            alert('BBM, Tol, dan Parkir Resmi wajib diisi!');
            return;
        }
        if (total === 0) return;
        
        const now = new Date();
        const originalEntry = editingId ? entries.find(e => e.id === editingId) : null;
        
        // Find DB IDs if standard
        const fleetObj = fleets[selectedFleetIdx];
        const vehicle_id = isOncall ? null : (fleetObj?.id || null);
        
        const dbDriver = drivers.find(d => d.name === selectedDriver);
        const driver_id = selectedDriver === '__custom__' ? null : (dbDriver?.id || null);
        
        // JSON serialization fallback for temporary/on-call vehicles, drivers, and helpers
        let noteString = '';
        if (isOncall || selectedDriver === '__custom__' || selectedHelper === '__custom__') {
            const fallbackJson = {
                plate: currentPlate,
                vehicleType: isOncall ? 'Oncall' : (fleetObj?.type || 'CDD'),
                driver: currentDriver,
                helper: currentHelper,
                notes: ''
            };
            noteString = JSON.stringify(fallbackJson);
        }

        const entry: ExpenseEntry = {
            id: editingId || undefined,
            vehicle_id,
            driver_id,
            time: originalEntry ? originalEntry.time : now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            date: originalEntry ? originalEntry.date : now.toISOString().split('T')[0],
            plate: currentPlate,
            vehicleType: isOncall ? 'Oncall' : (fleetObj?.type || 'CDD'),
            driver: currentDriver,
            isOncall,
            bbm: n(bbm), tol: n(tol), parkir: n(parkir),
            parkirLiar: n(parkirLiar), kuliAngkut: n(kuliAngkut), lainLain: n(lainLain),
            helperName: currentHelper, 
            notes: noteString, 
            total
        };

        const success = await saveEntry(entry);
        if (success) {
            resetForm();
            fetchToday();
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
    };

    const handleDownloadTemplate = () => {
        const headers = ['Tanggal', 'Waktu', 'No. Polisi', 'Jenis Kendaraan', 'Driver', 'Helper', 'BBM (Solar)', 'Tol', 'Parkir Resmi', 'Parkir Liar', 'Kuli Angkut/DLL', 'Helper Harian', 'Catatan'];

        const todayStr = new Date().toISOString().split('T')[0];
        const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');

        // Find today's entries
        const todayEntries = entries.filter(e => e.date === todayStr);
        const hasTodayEntries = todayEntries.length > 0;

        // Map of plate -> entry
        const entryMap = new Map<string, ExpenseEntry>();
        todayEntries.forEach(e => {
            entryMap.set(e.plate, e);
        });

        const rows: string[][] = [];

        // Process standard fleets
        fleets.forEach(f => {
            const entry = entryMap.get(f.plate);
            if (entry) {
                rows.push([
                    entry.date,
                    entry.time,
                    entry.plate,
                    entry.vehicleType,
                    entry.driver,
                    entry.helperName || '',
                    String(entry.bbm),
                    String(entry.tol),
                    String(entry.parkir),
                    String(entry.parkirLiar),
                    String(entry.kuliAngkut),
                    String(entry.lainLain),
                    entry.notes || 'Diisi di Sistem'
                ]);
                entryMap.delete(f.plate);
            } else {
                const defaultDriver = drivers.length > 0 ? drivers[0].name : '';
                rows.push([
                    todayStr,
                    nowStr,
                    f.plate,
                    f.type,
                    defaultDriver,
                    '', // Helper
                    '0', // BBM
                    '0', // Tol
                    '0', // Parkir Resmi
                    '0', // Parkir Liar
                    '0', // Kuli Angkut
                    '0', // Helper Harian
                    'Template BOP'
                ]);
            }
        });

        // Process remaining oncall or other entries entered today
        entryMap.forEach(entry => {
            rows.push([
                entry.date,
                entry.time,
                entry.plate,
                entry.vehicleType,
                entry.driver,
                entry.helperName || '',
                String(entry.bbm),
                String(entry.tol),
                String(entry.parkir),
                String(entry.parkirLiar),
                String(entry.kuliAngkut),
                String(entry.lainLain),
                entry.notes || 'Diisi di Sistem (Oncall)'
            ]);
        });

        const csvContent = "\uFEFF" + [ // UTF-8 BOM for Microsoft Excel compatibility
            headers.join(','),
            ...rows.map(r => r.map(v => `"${v}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Set filename based on whether data was merged or not
        const filename = hasTodayEntries
            ? `BOP_Offline_Synced_${todayStr}.csv`
            : `Template_BOP_Offline_${todayStr}.csv`;

        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Trigger visual toast confirmation
        if (hasTodayEntries) {
            triggerImportToast(
                'File BOP Terpopulasi Diunduh!',
                `Berhasil menggabungkan ${todayEntries.length} data biaya sistem Anda hari ini ke dalam berkas CSV.`
            );
        } else {
            triggerImportToast(
                'Template BOP Diunduh!',
                'Berkas CSV kosong dengan plat aktif hari ini siap diisi secara offline.'
            );
        }
    };

    const handleImportClick = () => {
        handleDownloadTemplate();
        fileInputRef.current?.click();
    };

    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();

        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) {
                setIsUploading(false);
                alert('File kosong atau tidak dapat dibaca!');
                return;
            }

            try {
                const lines = text.split(/\r?\n/);
                if (lines.length < 2) {
                    setIsUploading(false);
                    alert('Format file tidak valid (baris data tidak ditemukan)!');
                    return;
                }

                const headers = lines[0].split(',').map(h => h.replace(/^["'\uFEFF]|["']$/g, '').trim().toLowerCase());
                const parsedData: ExpenseEntry[] = [];

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
                    const cols = matches.map(c => c.replace(/^["']|["']$/g, '').trim());

                    if (cols.length < 5) continue;

                    const getVal = (headerKeywords: string[], fallbackIdx: number) => {
                        const idx = headers.findIndex(h => headerKeywords.some(kw => h.includes(kw)));
                        const realIdx = idx >= 0 ? idx : fallbackIdx;
                        return cols[realIdx] || '';
                    };

                    const plate = getVal(['no. polisi', 'nopol', 'plat', 'plate'], 2);
                    const vehicleType = getVal(['jenis kendaraan', 'vehicle', 'tipe'], 3) || 'CDD';
                    const driver = getVal(['driver', 'sopir', 'pengemudi'], 4) || 'Sopir';
                    const helperName = getVal(['helper', 'kenek'], 5) || '';

                    const parseNumber = (val: string) => {
                        const clean = val.replace(/[^0-9]/g, '');
                        return Number(clean) || 0;
                    };

                    const bbm = parseNumber(getVal(['bbm', 'bensin', 'solar'], 6));
                    const tol = parseNumber(getVal(['tol'], 7));
                    const parkir = parseNumber(getVal(['parkir resmi', 'parkir_resmi'], 8));
                    const parkirLiar = parseNumber(getVal(['parkir liar', 'parkir_liar'], 9));
                    const kuliAngkut = parseNumber(getVal(['kuli', 'angkut', 'lain-lain', 'lain'], 10));
                    const lainLain = parseNumber(getVal(['helper harian', 'helper_harian', 'harian'], 11));
                    const notes = getVal(['catatan', 'notes', 'keterangan'], 12) || 'Imported via Excel';

                    const date = getVal(['tanggal', 'date'], 0) || new Date().toISOString().split('T')[0];
                    const time = getVal(['waktu', 'time', 'jam'], 1) || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');

                    const total = bbm + tol + parkir + parkirLiar + kuliAngkut + lainLain;

                    // Match dynamic DB structures
                    const dbFleet = fleets.find(f => f.plate === plate);
                    const vehicle_id = dbFleet?.id || null;
                    const isOncallVal = !dbFleet;

                    const dbDriverObj = drivers.find(d => d.name === driver);
                    const driver_id = dbDriverObj?.id || null;

                    let noteString = notes;
                    if (isOncallVal || !dbDriverObj || (helperName && !drivers.some(d => d.name === helperName))) {
                        const fallbackJson = {
                            plate,
                            vehicleType: isOncallVal ? 'Oncall' : (dbFleet?.type || 'CDD'),
                            driver,
                            helper: helperName,
                            notes: notes
                        };
                        noteString = JSON.stringify(fallbackJson);
                    }

                    parsedData.push({
                        id: undefined,
                        vehicle_id,
                        driver_id,
                        time,
                        date,
                        plate,
                        vehicleType: isOncallVal ? 'Oncall' : (dbFleet?.type || 'CDD'),
                        driver,
                        isOncall: isOncallVal,
                        bbm,
                        tol,
                        parkir,
                        parkirLiar,
                        kuliAngkut,
                        lainLain,
                        helperName,
                        notes: noteString,
                        total
                    });
                }

                setIsUploading(false);
                if (parsedData.length === 0) {
                    alert('Tidak ada data valid yang berhasil dibaca dari file.');
                } else {
                    setParsedPreview(parsedData);
                }
            } catch (err) {
                setIsUploading(false);
                console.error(err);
                alert('Terjadi kesalahan saat membaca file. Pastikan format file sesuai.');
            }
        };

        reader.onerror = () => {
            setIsUploading(false);
            alert('Gagal membaca file!');
        };

        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleConfirmImport = async () => {
        if (parsedPreview.length === 0) return;
        
        setIsUploading(true);
        try {
            await Promise.all(parsedPreview.map(item => saveEntry(item)));
            setParsedPreview([]);
            setUploadSuccess(true);
            fetchToday();
            setTimeout(() => setUploadSuccess(false), 3000);
        } catch (error) {
            console.error(error);
            alert('Beberapa data gagal disimpan ke server!');
        } finally {
            setIsUploading(false);
        }
    };

    const handleCancelImport = () => {
        setParsedPreview([]);
    };

    const handleExportExcel = () => {
        const headers = ['Tanggal', 'Waktu', 'No. Polisi', 'Jenis Kendaraan', 'Driver', 'Helper', 'BBM', 'Tol', 'Parkir Resmi', 'Parkir Liar', 'Kuli Angkut/DLL', 'Helper Harian', 'Total', 'Catatan'];
        const rows = entries.map(e => [
            e.date,
            e.time,
            e.plate,
            e.vehicleType,
            e.driver,
            e.helperName || '-',
            e.bbm,
            e.tol,
            e.parkir,
            e.parkirLiar,
            e.kuliAngkut,
            e.lainLain,
            e.total,
            e.notes || '-'
        ]);

        const csvContent = [
            headers.map(h => `"${h}"`).join(','),
            ...rows.map(r => r.map(v => `"${v}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Histori_Biaya_BOP_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleEdit = (entry: ExpenseEntry) => {
        setEditingId(entry.id || null);
        const idx = fleets.findIndex(f => f.plate === entry.plate);
        if (idx >= 0) { setSelectedFleetIdx(idx); setIsOncall(false); }
        else { setIsOncall(true); setOncallPlate(entry.plate); }
        // Set driver
        const hasDriver = drivers.some(d => d.name === entry.driver);
        if (hasDriver) { setSelectedDriver(entry.driver); }
        else { setSelectedDriver('__custom__'); setCustomDriver(entry.driver); }
        // Set helper
        if (!entry.helperName) { setSelectedHelper(''); }
        else if (drivers.some(d => d.name === entry.helperName)) { setSelectedHelper(entry.helperName); }
        else { setSelectedHelper('__custom__'); setCustomHelper(entry.helperName); }
        setBbm(entry.bbm ? String(entry.bbm) : '');
        setTol(entry.tol ? String(entry.tol) : '');
        setParkir(entry.parkir ? String(entry.parkir) : '');
        setParkirLiar(entry.parkirLiar ? String(entry.parkirLiar) : '');
        setKuliAngkut(entry.kuliAngkut ? String(entry.kuliAngkut) : '');
        setLainLain(entry.lainLain ? String(entry.lainLain) : '');
        topRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (confirm('Hapus entry ini?')) {
            const success = await deleteEntry(id);
            if (success) {
                fetchToday();
            }
        }
    };

    const todayEntries = entries.filter(e => e.date === new Date().toISOString().split('T')[0]);

    return (
        <div ref={topRef} className="p-6 lg:p-8">
            {/* Toast */}
            {showToast && (
                <div className="fixed top-6 right-6 z-50 bg-emerald-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-[slideIn_0.3s_ease-out]">
                    <span className="material-symbols-outlined">check_circle</span>
                    <span className="font-semibold">Biaya untuk {currentPlate} berhasil {editingId ? 'diupdate' : 'dicatat'}!</span>
                </div>
            )}

            {/* Excel Upload Loading Overlay */}
            {isUploading && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary text-2xl">description</span>
                    </div>
                    <p className="mt-4 font-bold text-slate-900 dark:text-white text-lg tracking-tight">Processing Excel Data...</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Please wait a moment</p>
                </div>
            )}

            {/* Excel Upload Success Toast */}
            {uploadSuccess && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-[slideDown_0.4s_ease-out]">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-xl">check</span>
                    </div>
                    <div>
                        <p className="font-bold text-lg leading-none">Upload Berhasil!</p>
                        <p className="text-white/80 text-xs mt-1 font-medium tracking-wide uppercase">Data Excel telah berhasil diimpor</p>
                    </div>
                </div>
            )}

            {/* Sync-Import Dynamic Notification Toast */}
            {showImportToast && (
                <div className="fixed top-6 right-6 z-[200] bg-gradient-to-r from-slate-900 to-slate-800 dark:from-[#222] dark:to-[#1a1a1a] text-white border border-slate-700/50 dark:border-slate-800 p-5 rounded-2xl shadow-2xl flex items-start gap-4 animate-[slideIn_0.3s_ease-out] max-w-md">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-2xl text-orange-500">sync_saved_locally</span>
                    </div>
                    <div className="space-y-1">
                        <p className="font-extrabold text-slate-100 leading-tight">{importToastMsg.title}</p>
                        <p className="text-slate-400 text-xs leading-relaxed font-medium">{importToastMsg.desc}</p>
                    </div>
                    <button onClick={() => setShowImportToast(false)} className="text-slate-400 hover:text-slate-200 transition-colors shrink-0">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            )}


            {/* Page Title & Excel Integration Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-100 dark:border-white/5">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                        Operational Expense Entry
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-sm">
                        Input daily costs for fleet operations and deliveries.
                    </p>
                </div>

                {/* Minimalist Premium 2-Button Toolbar - Highlighting Import & Upload/Template directly */}
                <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-white/[0.02] p-2 rounded-2xl border border-slate-200/40 dark:border-white/5">
                    {/* Tombol 1: Unduh Template BOP */}
                    <button
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-extrabold text-sm border-2 border-amber-500/40 text-amber-600 dark:text-amber-500 hover:bg-amber-500/5 hover:border-amber-500/60 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-sm group"
                    >
                        <span className="material-symbols-outlined text-lg group-hover:animate-bounce">download</span>
                        Unduh Template BOP
                    </button>

                    {/* Tombol 2: Unggah / Impor BOP */}
                    <button
                        onClick={handleImportClick}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-extrabold text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer group"
                    >
                        <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">publish</span>
                        Unggah / Impor BOP
                    </button>
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleExcelUpload}
                accept=".xlsx, .xls, .csv"
                className="hidden"
            />

            {parsedPreview.length === 0 ? (
                <div className="flex flex-col lg:flex-row gap-8 items-start animate-[fadeIn_0.3s_ease-out] w-full">
                    {/* Left Column: Input Forms */}
                    <div className="flex-1 space-y-8 min-w-0">
                        {/* Section 1: Fleet Information */}
                        <section className="bg-white dark:bg-[#111111] p-6 lg:p-8 rounded-xl shadow-sm dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-white/5">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary text-3xl">local_shipping</span>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Fleet Information</h2>
                                </div>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox" checked={isOncall}
                                        onChange={e => setIsOncall(e.target.checked)}
                                        className="w-5 h-5 rounded text-primary focus:ring-primary/30 border-slate-300 dark:border-white/20 bg-white dark:bg-[#1A1A1A] transition-all"
                                    />
                                    <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white group-hover:text-primary transition-colors">TRUK ONCALL</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {isOncall ? (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Nopol Truk Oncall</label>
                                        <input
                                            type="text" placeholder="Contoh: B 1234 XYZ"
                                            value={oncallPlate} onChange={e => setOncallPlate(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 px-4 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Nopol Armada</label>
                                        <div className="relative">
                                            <select
                                                value={selectedFleetIdx} onChange={e => setSelectedFleetIdx(Number(e.target.value))}
                                                className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 px-4 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
                                            >
                                                {fleets.map((f, i) => (
                                                    <option key={f.plate} value={i}>{f.plate} — {f.type}</option>
                                                ))}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-4 top-4 text-slate-400 pointer-events-none">expand_more</span>
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Driver</label>
                                    <div className="relative">
                                        <select
                                            value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 px-4 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
                                        >
                                            {drivers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                            <option value="__custom__">— Driver Pengganti —</option>
                                        </select>
                                        <span className="material-symbols-outlined absolute right-4 top-4 text-slate-400 pointer-events-none">expand_more</span>
                                    </div>
                                    {selectedDriver === '__custom__' && (
                                        <input type="text" placeholder="Ketik nama driver pengganti" value={customDriver} onChange={e => setCustomDriver(e.target.value)}
                                            className="w-full mt-2 bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-3 px-4 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30" />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Helper</label>
                                    <div className="relative">
                                        <select
                                            value={selectedHelper} onChange={e => setSelectedHelper(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 px-4 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
                                        >
                                            <option value="">— Tanpa Helper —</option>
                                            {drivers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                            <option value="__custom__">— Helper Pengganti —</option>
                                        </select>
                                        <span className="material-symbols-outlined absolute right-4 top-4 text-slate-400 pointer-events-none">expand_more</span>
                                    </div>
                                    {selectedHelper === '__custom__' && (
                                        <input type="text" placeholder="Ketik nama helper pengganti" value={customHelper} onChange={e => setCustomHelper(e.target.value)}
                                            className="w-full mt-2 bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-3 px-4 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30" />
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Section 2: Cost Details */}
                        <section className="bg-white dark:bg-[#111111] p-6 lg:p-8 rounded-xl shadow-sm dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-3 mb-8">
                                <span className="material-symbols-outlined text-primary text-3xl">payments</span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Cost Details</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">BBM (Solar)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-4 text-slate-400 font-bold text-sm">Rp</span>
                                        <input
                                            type="text" placeholder="0"
                                            value={bbm} onChange={e => setBbm(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 pl-10 pr-4 font-extrabold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 text-right"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Total Tol</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-4 text-slate-400 font-bold text-sm">Rp</span>
                                        <input
                                            type="text" placeholder="0"
                                            value={tol} onChange={e => setTol(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 pl-10 pr-4 font-extrabold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 text-right"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Parkir Resmi</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-4 text-slate-400 font-bold text-sm">Rp</span>
                                        <input
                                            type="text" placeholder="0"
                                            value={parkir} onChange={e => setParkir(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 pl-10 pr-4 font-extrabold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 text-right"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Parkir Liar</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-4 text-slate-400 font-bold text-sm">Rp</span>
                                        <input
                                            type="text" placeholder="0"
                                            value={parkirLiar} onChange={e => setParkirLiar(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 pl-10 pr-4 font-extrabold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 text-right"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Kuli Angkut / DLL</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-4 text-slate-400 font-bold text-sm">Rp</span>
                                        <input
                                            type="text" placeholder="0"
                                            value={kuliAngkut} onChange={e => setKuliAngkut(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 pl-10 pr-4 font-extrabold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 text-right"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Helper Harian</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-4 text-slate-400 font-bold text-sm">Rp</span>
                                        <input
                                            type="text" placeholder="0"
                                            value={lainLain} onChange={e => setLainLain(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 pl-10 pr-4 font-extrabold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 text-right"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Cost Summary Sticky Panel */}
                    <aside className="w-full lg:w-96 shrink-0 lg:sticky lg:top-8">
                        <div className="bg-white dark:bg-[#111111] p-6 lg:p-8 rounded-xl shadow-sm dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-white/5 space-y-6">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Cost Summary</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-0.5">Rincian pengeluaran operasional.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-slate-50 dark:bg-[#1A1A1A] p-4 rounded-xl space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 dark:text-slate-400">Armada</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{currentPlate}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 dark:text-slate-400">Driver</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{currentDriver || '—'}</span>
                                    </div>
                                    {currentHelper && (
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-500 dark:text-slate-400">Helper</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{currentHelper}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="h-px bg-slate-100 dark:bg-white/5 my-2" />

                                {[
                                    ['BBM (Solar)', bbm], ['Total Tol', tol],
                                    ['Parkir Resmi', parkir], ['Parkir Liar', parkirLiar],
                                    ['Kuli Angkut/DLL', kuliAngkut], ['Helper Harian', lainLain]
                                ].map(([label, val]) => (
                                    <div key={label as string} className="flex justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">{label}</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{formatRp(n(val as string))}</span>
                                    </div>
                                ))}

                                <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                                    <div className="flex justify-between items-end mb-8">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Grand Total</span>
                                        <span className="text-3xl font-black text-primary">{formatRp(total)}</span>
                                    </div>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={total === 0}
                                        className="w-full bg-gradient-to-r from-[#994700] to-[#FF7A00] disabled:opacity-40 disabled:cursor-not-allowed text-white py-5 rounded-lg font-extrabold text-lg shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        <span>{editingId ? 'Update Biaya' : 'Submit Biaya'}</span>
                                        <span className="material-symbols-outlined">send</span>
                                    </button>
                                    {editingId && (
                                        <button onClick={resetForm} className="w-full mt-3 py-3 rounded-lg font-bold text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                                            Batal Edit
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            ) : (
                /* Gorgeous Imported Data Preview Workspace */
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
            )}

            {/* Section 3: Daily History Table */}
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
                                <tr><td colSpan={5} className="py-16 text-center text-slate-400 dark:text-slate-500">
                                    <span className="material-symbols-outlined text-5xl mb-4 block opacity-30">receipt_long</span>
                                    <p className="font-semibold">Belum ada data</p>
                                </td></tr>
                            ) : entries.slice(0, 10).map((e, i) => (
                                <tr key={e.id || i} className={`hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${i % 2 === 1 ? 'bg-slate-50/50 dark:bg-white/[0.02]' : ''}`}>
                                    <td className="py-5 px-6 font-medium text-slate-700 dark:text-slate-300">{e.time}</td>
                                    <td className="py-5 px-6 font-bold text-slate-900 dark:text-white">
                                        {e.plate}
                                        {e.isOncall && <span className="ml-2 text-[10px] bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">ONCALL</span>}
                                    </td>
                                    <td className="py-5 px-6 text-slate-600 dark:text-slate-400">{e.driver}</td>
                                    <td className="py-5 px-6 font-bold text-slate-900 dark:text-white cursor-pointer hover:text-primary transition-colors" onClick={() => setDetailEntry(e)}>
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
            {/* Detail Modal */}
            {detailEntry && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-[slideUp_0.3s_ease-out]">
                        <div className="bg-slate-50 dark:bg-white/5 px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-white/5">
                            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Rincian Biaya</h3>
                            <button onClick={() => setDetailEntry(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors">
                                <span className="material-symbols-outlined text-slate-500">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center text-sm mb-4">
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">Armada / Waktu</p>
                                    <p className="font-bold text-slate-900 dark:text-white mt-1">{detailEntry.plate} • {detailEntry.time}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">Driver</p>
                                    <p className="font-bold text-slate-900 dark:text-white mt-1">{detailEntry.driver}</p>
                                </div>
                            </div>
                            {detailEntry.helperName && (
                                <div className="flex justify-between items-center text-sm mb-4 pb-4 border-b border-slate-100 dark:border-white/5">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Helper</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{detailEntry.helperName}</span>
                                </div>
                            )}
                            {!detailEntry.helperName && <div className="pb-4 border-b border-slate-100 dark:border-white/5" />}

                            <div className="space-y-3">
                                {[
                                    { label: 'BBM (Solar)', val: detailEntry.bbm },
                                    { label: 'Total Tol', val: detailEntry.tol },
                                    { label: 'Parkir Resmi', val: detailEntry.parkir },
                                    { label: 'Parkir Liar', val: detailEntry.parkirLiar },
                                    { label: 'Kuli Angkut/DLL', val: detailEntry.kuliAngkut },
                                    { label: 'Helper Harian', val: detailEntry.lainLain }
                                ].map(item => item.val > 0 && (
                                    <div key={item.label} className="flex justify-between text-sm items-center">
                                        <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{formatRp(item.val)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                                <span className="font-bold text-slate-500 dark:text-slate-400">Grand Total</span>
                                <span className="text-2xl font-black text-primary">{formatRp(detailEntry.total)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
