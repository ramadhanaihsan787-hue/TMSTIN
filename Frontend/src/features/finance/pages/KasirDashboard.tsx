// src/features/finance/pages/KasirDashboard.tsx
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useExpenses } from '../hooks/useExpenses';
import { formatRp } from '../constants'; 
import type { ExpenseEntry } from '../types';
import { api } from '../../../shared/services/apiClient'; // 🌟 IMPORT API LU

export default function KasirDashboard() {
    const topRef = useRef<HTMLDivElement>(null);
    
    // Tarik logic bawaan
    const { entries, fleets, drivers, isLoading, isMasterLoading, fetchToday, fetchMasterData, saveEntry, deleteEntry } = useExpenses();

    // 🌟 STATE BARU: Khusus nampung Truk yang beneran jalan hari ini!
    const [activeDispatches, setActiveDispatches] = useState<any[]>([]);
    const [isLoadingDispatch, setIsLoadingDispatch] = useState(true);

    // Form states
    const [selectedPlate, setSelectedPlate] = useState('');
    const [isOncall, setIsOncall] = useState(false);
    const [oncallPlate, setOncallPlate] = useState('');
    const [selectedDriver, setSelectedDriver] = useState('');
    const [customDriver, setCustomDriver] = useState('');
    const [selectedHelper, setSelectedHelper] = useState('');
    const [customHelper, setCustomHelper] = useState('');
    const [vehicleType, setVehicleType] = useState('Unknown');
    
    const [bbm, setBbm] = useState('');
    const [tol, setTol] = useState('');
    const [parkir, setParkir] = useState('');
    const [parkirLiar, setParkirLiar] = useState('');
    const [kuliAngkut, setKuliAngkut] = useState('');
    const [lainLain, setLainLain] = useState('');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [detailEntry, setDetailEntry] = useState<ExpenseEntry | null>(null);

    // STATE BUAT FITUR EXCEL
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Fetch
    useEffect(() => {
        fetchToday();
        fetchMasterData();
        
        // 🌟 ZAP! Narik Jembatan dari Backend
        const fetchActiveRoutes = async () => {
            try {
                const res = await api.get('/api/driver/active-dispatch');
                if (res.data.status === 'success') {
                    setActiveDispatches(res.data.data);
                    // Set default ke truk pertama yang ada di list aktif
                    if (res.data.data.length > 0) {
                        const first = res.data.data[0];
                        setSelectedPlate(first.plate);
                        setSelectedDriver(first.driver);
                        setSelectedHelper(first.helper || '');
                        setVehicleType(first.vehicleType);
                    }
                }
            } catch (err) {
                console.error("Gagal narik jadwal dispatch hari ini", err);
            } finally {
                setIsLoadingDispatch(false);
            }
        };
        fetchActiveRoutes();
    }, []);

    // 🌟 LOGIC SAKTI: Kalau kasir ganti plat nomor, Supir & Helper otomatis keganti (Dari data Dispatch)!
    const handlePlateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const plate = e.target.value;
        setSelectedPlate(plate);
        
        const dispatch = activeDispatches.find(d => d.plate === plate);
        if (dispatch) {
            setSelectedDriver(dispatch.driver);
            setSelectedHelper(dispatch.helper || '');
            setVehicleType(dispatch.vehicleType);
        }
    };

    // Computed Values
    const currentPlate = isOncall ? oncallPlate : selectedPlate;
    const currentDriver = selectedDriver === '__custom__' ? customDriver : selectedDriver;
    const currentHelper = selectedHelper === '__custom__' ? customHelper : selectedHelper;

    const n = (v: string | number) => Number(v) || 0;
    const total = n(bbm) + n(tol) + n(parkir) + n(parkirLiar) + n(kuliAngkut) + n(lainLain);

    const resetForm = () => {
        setBbm(''); setTol(''); setParkir(''); setParkirLiar('');
        setKuliAngkut(''); setLainLain('');
        setIsOncall(false); setOncallPlate('');
        setCustomDriver(''); setCustomHelper('');
        setEditingId(null);
        
        if (activeDispatches.length > 0) {
            const first = activeDispatches[0];
            setSelectedPlate(first.plate);
            setSelectedDriver(first.driver);
            setSelectedHelper(first.helper || '');
        } else {
            setSelectedDriver(drivers[0] || '');
            setSelectedHelper('');
        }
    };

    const handleSubmit = async () => {
        if (n(bbm) === 0 && n(tol) === 0 && n(parkir) === 0 && total === 0) {
            toast.error('Minimal salah satu biaya wajib diisi!');
            return;
        }
        if (!currentPlate || !currentDriver) {
            toast.error('Plat nomor dan nama driver wajib diisi!');
            return;
        }

        const now = new Date();
        const originalEntry = editingId ? entries.find(e => e.id === editingId) : null;
        
        const payload: ExpenseEntry = {
            id: editingId || undefined,
            time: originalEntry ? originalEntry.time : now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            date: originalEntry ? originalEntry.date : now.toISOString().split('T')[0],
            plate: currentPlate,
            vehicleType: isOncall ? 'Oncall' : vehicleType,
            driver: currentDriver,
            isOncall,
            bbm: n(bbm), tol: n(tol), parkir: n(parkir),
            parkirLiar: n(parkirLiar), kuliAngkut: n(kuliAngkut), lainLain: n(lainLain),
            helperName: currentHelper, notes: '', total
        };

        const success = await saveEntry(payload);
        if (success) {
            resetForm();
            fetchToday(); 
        }
    };

    // FUNGSI IMPORT EXCEL (Simulasi API)
    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        if (fileInputRef.current) fileInputRef.current.value = '';

        setTimeout(async () => {
            setIsUploading(false);
            setUploadSuccess(true);
            
            const dummyEntry: ExpenseEntry = {
                time: '08:45',
                date: new Date().toISOString().split('T')[0],
                plate: fleets[0]?.plate || 'B 9514 JXS',
                vehicleType: fleets[0]?.type || 'CDD',
                driver: drivers[0] || 'Supir Import',
                isOncall: false,
                bbm: 450000, tol: 65000, parkir: 20000,
                parkirLiar: 0, kuliAngkut: 25000, lainLain: 0,
                helperName: 'Helper Import', notes: 'Diimpor dari Excel', total: 560000
            };

            await saveEntry(dummyEntry);
            fetchToday(); 

            setTimeout(() => setUploadSuccess(false), 3000);
        }, 2500);
    };

    const handleEdit = (entry: ExpenseEntry) => {
        setEditingId(entry.id!);
        
        const isFleetExist = fleets.some(f => f.plate === entry.plate) || activeDispatches.some(d => d.plate === entry.plate);
        if (isFleetExist && !entry.isOncall) { 
            setSelectedPlate(entry.plate); 
            setIsOncall(false); 
        } else { 
            setIsOncall(true); 
            setOncallPlate(entry.plate); 
        }
        
        if (drivers.includes(entry.driver) || activeDispatches.some(d => d.driver === entry.driver)) { 
            setSelectedDriver(entry.driver); 
        } else { 
            setSelectedDriver('__custom__'); setCustomDriver(entry.driver); 
        }
        
        if (!entry.helperName) { setSelectedHelper(''); }
        else if (drivers.includes(entry.helperName) || activeDispatches.some(d => d.helper === entry.helperName)) { 
            setSelectedHelper(entry.helperName); 
        } else { 
            setSelectedHelper('__custom__'); setCustomHelper(entry.helperName); 
        }
        
        setBbm(entry.bbm ? String(entry.bbm) : '');
        setTol(entry.tol ? String(entry.tol) : '');
        setParkir(entry.parkir ? String(entry.parkir) : '');
        setParkirLiar(entry.parkirLiar ? String(entry.parkirLiar) : '');
        setKuliAngkut(entry.kuliAngkut ? String(entry.kuliAngkut) : '');
        setLainLain(entry.lainLain ? String(entry.lainLain) : '');
        topRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        const success = await deleteEntry(id);
        if (success) fetchToday();
    };

    return (
        <div ref={topRef} className="p-6 lg:p-8 relative">
            
            {/* EXCEL UPLOAD LOADING OVERLAY */}
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

            {/* EXCEL UPLOAD SUCCESS TOAST */}
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

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* KIRI: Formulir Input */}
                <div className="flex-1 space-y-8 min-w-0">
                    
                    {/* PAGE TITLE & BUTTON IMPORT EXCEL */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                        <div>
                            <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                                Operational Expense Entry
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                                Input daily costs for fleet operations and deliveries.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleExcelUpload} 
                                accept=".xlsx, .xls, .csv" 
                                className="hidden" 
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-400 text-white px-5 py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-[0_4px_20px_rgba(249,115,22,0.3)] group"
                            >
                                <span className="material-symbols-outlined text-white group-hover:rotate-12 transition-transform">upload_file</span>
                                Import Excel
                            </button>
                        </div>
                    </div>

                    <section className="bg-white dark:bg-[#111111] p-6 lg:p-8 rounded-xl shadow-sm dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-white/5 relative">
                        {/* LOADING OVERLAY */}
                        {(isMasterLoading || isLoadingDispatch) && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-[#111]/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                                <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary text-3xl">local_shipping</span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active Fleet Information</h2>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer group z-20">
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
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Pilih Armada (Berangkat Hari Ini)</label>
                                    <div className="relative">
                                        <select
                                            value={selectedPlate} onChange={handlePlateChange}
                                            className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 px-4 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
                                        >
                                            {activeDispatches.length === 0 && <option value="">Tidak ada rute berjalan hari ini</option>}
                                            {activeDispatches.map(d => (
                                                <option key={d.plate} value={d.plate}>{d.plate}</option>
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
                                        disabled={!isOncall} // Kalo bukan oncall, gabisa diganti manual! (Sesuai VRP)
                                    >
                                        {!isOncall && <option value={selectedDriver}>{selectedDriver}</option>}
                                        {isOncall && drivers.map(name => <option key={name} value={name}>{name}</option>)}
                                        {isOncall && <option value="__custom__">— Driver Pengganti —</option>}
                                    </select>
                                    {isOncall && <span className="material-symbols-outlined absolute right-4 top-4 text-slate-400 pointer-events-none">expand_more</span>}
                                </div>
                                {selectedDriver === '__custom__' && isOncall && (
                                    <input type="text" placeholder="Ketik nama driver" value={customDriver} onChange={e => setCustomDriver(e.target.value)}
                                        className="w-full mt-2 bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-3 px-4 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30" />
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Helper (Optional)</label>
                                <div className="relative">
                                    <select
                                        value={selectedHelper} onChange={e => setSelectedHelper(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 px-4 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
                                        disabled={!isOncall} // Kalo bukan oncall, gabisa diganti manual! (Sesuai VRP)
                                    >
                                        {!isOncall && <option value={selectedHelper}>{selectedHelper || 'Tanpa Helper'}</option>}
                                        {isOncall && <option value="">— Tidak ada helper —</option>}
                                        {isOncall && drivers.map(name => <option key={`h-${name}`} value={name}>{name}</option>)}
                                        {isOncall && <option value="__custom__">— Helper Pengganti —</option>}
                                    </select>
                                    {isOncall && <span className="material-symbols-outlined absolute right-4 top-4 text-slate-400 pointer-events-none">expand_more</span>}
                                </div>
                                {selectedHelper === '__custom__' && isOncall && (
                                    <input type="text" placeholder="Ketik nama helper" value={customHelper} onChange={e => setCustomHelper(e.target.value)}
                                        className="w-full mt-2 bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-3 px-4 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30" />
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="bg-white dark:bg-[#111111] p-6 lg:p-8 rounded-xl shadow-sm dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-3 mb-8">
                            <span className="material-symbols-outlined text-primary text-3xl">receipt_long</span>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Operational Expenses</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                { icon: 'gas_meter', label: 'BBM (Solar)', value: bbm, set: setBbm },
                                { icon: 'add_road', label: 'Tol', value: tol, set: setTol },
                                { icon: 'local_parking', label: 'Parkir Resmi', value: parkir, set: setParkir },
                                { icon: 'error_outline', label: 'Parkir Liar', value: parkirLiar, set: setParkirLiar },
                                { icon: 'group', label: 'Kuli Angkut/DLL', value: kuliAngkut, set: setKuliAngkut },
                                { icon: 'more_horiz', label: 'Helper Harian', value: lainLain, set: setLainLain },
                            ].map(field => (
                                <div key={field.label} className="bg-slate-50 dark:bg-[#1A1A1A] p-4 rounded-xl space-y-2 transition-all hover:bg-slate-100 dark:hover:bg-white/5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="material-symbols-outlined text-primary text-xl">{field.icon}</span>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{field.label}</label>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-slate-500 text-sm">Rp</span>
                                        <input
                                            type="text" inputMode="numeric" placeholder="0" 
                                            value={field.value ? new Intl.NumberFormat('id-ID').format(Number(String(field.value).replace(/[^0-9]/g, ''))) : ''}
                                            onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); field.set(v); }}
                                            className="w-full bg-transparent border-none focus:ring-0 pl-12 font-display text-2xl font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* KANAN: Summary Breakdown */}
                <aside className="w-full lg:w-96 sticky top-28 space-y-6 shrink-0 z-20">
                    <div className="bg-white dark:bg-[#111111] rounded-xl shadow-sm dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-white/5 overflow-hidden relative">
                        <div className="bg-gradient-to-r from-[#994700] to-[#FF7A00] p-6 text-white">
                            <h3 className="font-extrabold text-xl tracking-tight">Summary Breakdown</h3>
                            <p className="text-white/80 text-sm mt-1">Review expenses before submitting</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-slate-500 dark:text-slate-400">Fleet Plate</span>
                                <span className="font-bold text-slate-900 dark:text-white">{currentPlate || '—'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-slate-500 dark:text-slate-400">Driver</span>
                                <span className="font-bold text-slate-900 dark:text-white">{currentDriver || '—'}</span>
                            </div>
                            <div className="h-px bg-slate-100 dark:bg-white/5 my-2" />

                            {[
                                ['BBM (Solar)', bbm], ['Total Tol', tol],
                                ['Parkir Resmi', parkir], ['Parkir Liar', parkirLiar],
                                ['Kuli Angkut', kuliAngkut], ['Lain-lain', lainLain]
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
                                    disabled={total === 0 || isLoading || isMasterLoading}
                                    className="w-full bg-gradient-to-r from-[#994700] to-[#FF7A00] disabled:opacity-40 disabled:cursor-not-allowed text-white py-5 rounded-lg font-extrabold text-lg shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    <span>{isLoading ? 'Menyimpan...' : (editingId ? 'Update Biaya' : 'Submit Biaya')}</span>
                                    <span className="material-symbols-outlined">send</span>
                                </button>
                                {editingId && (
                                    <button onClick={resetForm} className="w-full mt-3 py-3 rounded-lg font-bold text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                                        Batal Edit
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Overlay Detail Biaya */}
                        {detailEntry && (
                            <div className="absolute inset-0 bg-white dark:bg-[#111111] z-30 flex flex-col animate-[fadeIn_0.2s_ease-out]">
                                {/* Sleek Header */}
                                <div className="bg-gradient-to-r from-[#994700] to-[#FF7A00] p-6 text-white flex justify-between items-center border-b border-slate-100 dark:border-white/5">
                                    <div>
                                        <h3 className="font-extrabold text-lg tracking-tight">Rincian Biaya</h3>
                                        <p className="text-white/80 text-xs mt-0.5">Detail operational expenses</p>
                                    </div>
                                    <button 
                                        onClick={() => setDetailEntry(null)} 
                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white flex items-center justify-center"
                                    >
                                        <span className="material-symbols-outlined text-xl">close</span>
                                    </button>
                                </div>
                                
                                {/* Body Content */}
                                <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto space-y-4">
                                    <div className="space-y-4">
                                        {/* Meta details */}
                                        <div className="flex justify-between items-start text-sm">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Armada / Waktu</p>
                                                <p className="font-bold text-slate-950 dark:text-white">{detailEntry.plate}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{detailEntry.time} • {new Date(detailEntry.date).toLocaleDateString('id-ID')}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Driver</p>
                                                <p className="font-bold text-slate-950 dark:text-white">{detailEntry.driver}</p>
                                            </div>
                                        </div>

                                        {detailEntry.helperName && (
                                            <div className="flex justify-between items-center text-sm pb-3 border-b border-slate-100 dark:border-white/5">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Helper</span>
                                                <span className="font-bold text-slate-950 dark:text-white">{detailEntry.helperName}</span>
                                            </div>
                                        )}

                                        {/* Expenses list */}
                                        <div className="space-y-2.5 bg-slate-50 dark:bg-white/[0.02] p-4 rounded-xl border border-slate-100 dark:border-white/5">
                                            {[
                                                { label: 'BBM (Solar)', val: detailEntry.bbm },
                                                { label: 'Total Tol', val: detailEntry.tol },
                                                { label: 'Parkir Resmi', val: detailEntry.parkir },
                                                { label: 'Parkir Liar', val: detailEntry.parkirLiar },
                                                { label: 'Kuli Angkut/DLL', val: detailEntry.kuliAngkut },
                                                { label: 'Helper Harian', val: detailEntry.lainLain }
                                            ].map(item => item.val > 0 && (
                                                <div key={item.label} className="flex justify-between text-sm items-center">
                                                    <span className="font-medium text-slate-600 dark:text-slate-400">{item.label}</span>
                                                    <span className="font-bold text-slate-950 dark:text-white">{formatRp(item.val)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Bottom Section */}
                                    <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Grand Total</span>
                                            <span className="text-2xl font-black text-[#FF7A00]">{formatRp(detailEntry.total)}</span>
                                        </div>
                                        
                                        <button
                                            onClick={() => {
                                                handleEdit(detailEntry);
                                                setDetailEntry(null);
                                            }}
                                            className="w-full bg-gradient-to-r from-[#994700] to-[#FF7A00] hover:scale-[1.02] active:scale-95 text-white py-3.5 rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">edit_note</span>
                                            Edit Transaksi Ini
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* TABEL: Input Terakhir Hari Ini */}
            <section className="mt-12 bg-white dark:bg-[#111111] rounded-xl shadow-sm dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-white/5 overflow-hidden">
                <div className="p-6 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Input Terakhir Hari Ini</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                            {entries.length} entry tercatat hari ini — Total: {formatRp(entries.reduce((s, e) => s + e.total, 0))}
                        </p>
                    </div>
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
                            {isLoading && entries.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-16 text-center text-slate-400 dark:text-slate-500">
                                        <span className="material-symbols-outlined text-5xl mb-4 block animate-spin text-primary">refresh</span>
                                        <p className="font-semibold">Memuat data dari server...</p>
                                    </td>
                                </tr>
                            ) : entries.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-16 text-center text-slate-400 dark:text-slate-500">
                                        <span className="material-symbols-outlined text-5xl mb-4 block opacity-30">receipt_long</span>
                                        <p className="font-semibold">Belum ada data inputan hari ini.</p>
                                    </td>
                                </tr>
                            ) : entries.slice(0, 10).map((e, i) => (
                                <tr key={e.id} className={`hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${i % 2 === 1 ? 'bg-slate-50/50 dark:bg-white/[0.02]' : ''}`}>
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
                                            <button onClick={() => handleDelete(e.id!)} className="p-2 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full">
                                                <span className="material-symbols-outlined text-xl">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}