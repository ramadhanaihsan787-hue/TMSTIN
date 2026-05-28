import { useState, useRef, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { toast } from 'sonner';
import { useExpenses } from './useExpenses';
import { api } from '../../../shared/services/apiClient';
import { financeService } from '../services/financeService';
import type { ExpenseEntry } from '../types';

export function useKasirDashboardState() {
    const topRef = useRef<HTMLDivElement>(null);
    const { entries, fleets, drivers, isLoading, isMasterLoading, fetchToday, fetchMasterData, saveEntry, deleteEntry } = useExpenses();

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

    // Data perjalanan — auto-fill dari driver app, editable kasir
    const [jamBerangkat, setJamBerangkat] = useState('');
    const [jamPulang,    setJamPulang]    = useState('');
    const [kmAwal,       setKmAwal]       = useState('');
    const [kmAkhir,      setKmAkhir]      = useState('');
    const [tripSource,   setTripSource]   = useState<'driver_app' | 'manual' | null>(null);

    const [showToast, setShowToast] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [detailEntry, setDetailEntry] = useState<ExpenseEntry | null>(null);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [parsedPreview, setParsedPreview] = useState<ExpenseEntry[]>([]);
    const [showImportToast, setShowImportToast] = useState(false);
    const [importToastMsg, setImportToastMsg] = useState({ title: '', desc: '' });

    const currentPlate = isOncall ? oncallPlate : (fleets[selectedFleetIdx]?.plate || '');
    // Driver: kalau __custom__ pakai teks manual, kalau dari list pakai name
    const currentDriver = selectedDriver === '__custom__' ? customDriver : selectedDriver;
    const currentHelper = selectedHelper === '__custom__' ? customHelper : selectedHelper;

    // Cari vehicle_id dan driver_id untuk FK ke master data
    const currentVehicleId = !isOncall
        ? (fleets[selectedFleetIdx]?.id ?? null)
        : null;
    const currentDriverObj  = (drivers as any[]).find(
        (d: any) => (typeof d === 'object' ? d.name : d) === currentDriver
    );
    const currentDriverId   = typeof currentDriverObj === 'object'
        ? (currentDriverObj?.id ?? null)
        : null;

    const n = (v: string | number) => Number(v) || 0;
    const total = n(bbm) + n(tol) + n(parkir) + n(parkirLiar) + n(kuliAngkut) + n(lainLain);

    const todayEntries = entries;

    useEffect(() => {
        fetchToday();
        fetchMasterData();
    }, []);

    // Auto-fill saat pilihan armada berubah
    useEffect(() => {
        const plate = isOncall ? oncallPlate : (fleets[selectedFleetIdx]?.plate || '');
        if (plate && !editingId) autoFillTripData(plate);
    }, [selectedFleetIdx, isOncall, oncallPlate, fleets.length]);   // eslint-disable-line

    const resetForm = () => {
        setBbm(''); setTol(''); setParkir(''); setParkirLiar('');
        setKuliAngkut(''); setLainLain('');
        setIsOncall(false); setOncallPlate('');
        setCustomDriver(''); setCustomHelper('');
        setEditingId(null);
        setSelectedFleetIdx(0);
        setSelectedDriver(drivers[0]?.name || '');
        setSelectedHelper('');
        setJamBerangkat(''); setJamPulang('');
        setKmAwal(''); setKmAkhir('');
        setTripSource(null);
    };

    // Auto-fill data perjalanan dari driver app
    const autoFillTripData = async (plate: string) => {
        if (!plate) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            const res = await api.get(`/api/finance/bop-autofill?plate=${encodeURIComponent(plate)}&tanggal=${today}`);
            const data = res.data?.data;
            if (!data) return;

            // Auto-fill driver & helper kalau ada dari rute
            const driverList = (drivers as any[]).map((d: any) =>
                typeof d === 'object' ? d.name : d
            );
            if (data.driver_name && driverList.includes(data.driver_name)) {
                setSelectedDriver(data.driver_name);
            }
            if (data.helper_name && driverList.includes(data.helper_name)) {
                setSelectedHelper(data.helper_name);
            }

            // Auto-fill jam & km — hanya kalau ada data dari driver app
            if (data.jam_berangkat) setJamBerangkat(data.jam_berangkat);
            if (data.jam_pulang)    setJamPulang(data.jam_pulang);
            if (data.km_awal)       setKmAwal(String(data.km_awal));
            if (data.km_akhir)      setKmAkhir(String(data.km_akhir));
            setTripSource(data.source === 'driver_app' ? 'driver_app' : 'manual');
        } catch { /* silent fail */ }
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
            plate:       currentPlate,
            vehicleType: isOncall ? 'Oncall' : (fleets[selectedFleetIdx]?.type || 'Unknown'),
            driver:      currentDriver,
            isOncall,
            // FK ke master data — wajib untuk relasi DB terbentuk
            vehicle_id: currentVehicleId  ?? undefined,
            driver_id:  currentDriverId   ?? undefined,
            bbm: n(bbm), tol: n(tol), parkir: n(parkir),
            parkirLiar: n(parkirLiar), kuliAngkut: n(kuliAngkut), lainLain: n(lainLain),
            helperName: currentHelper, notes: '', total,
            // Data perjalanan dari driver app / manual kasir
            jamBerangkat: jamBerangkat || undefined,
            jamPulang:    jamPulang    || undefined,
            kmAwal:       kmAwal       ? Number(kmAwal)  : undefined,
            kmAkhir:      kmAkhir      ? Number(kmAkhir) : undefined,
        };

        const success = await saveEntry(payload);
        if (success) {
            resetForm();
            fetchToday();
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            toast.info("Mempersiapkan template BOP...");
            const today = new Date();
            const month = today.getMonth() + 1;
            const year  = today.getFullYear();
            // Download bulan ini sebagai template berisi data aktual
            const res = await api.get(
                `/api/finance/bop-export?month=${month}&year=${year}`,
                { responseType: 'blob' }
            );
            const blob = new Blob([res.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url  = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href     = url;
            link.download = `BOP_${year}_${String(month).padStart(2,'0')}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success("Template BOP berhasil diunduh!");
        } catch {
            toast.error("Gagal mengunduh template BOP");
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleExcelUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        if (fileInputRef.current) fileInputRef.current.value = '';

        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/api/finance/bop-import-parse', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const parsed = res.data;

            // Konversi response ke ExpenseEntry[]
            const entries: ExpenseEntry[] = (parsed.data || []).map((row: any) => {
                const fleet = fleets.find(f => f.plate === row.plate);
                return {
                    time: row.jamBerangkat || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                    date: row.tanggal || new Date().toISOString().split('T')[0],
                    plate: row.plate,
                    vehicleType: fleet?.type || 'Unknown',
                    driver: row.driver,
                    isOncall: !fleet,
                    bbm: row.bbm || 0,
                    tol: row.tol || 0,
                    parkir: row.parkir || 0,
                    parkirLiar: row.parkirLiar || 0,
                    kuliAngkut: row.kuliAngkut || 0,
                    lainLain: row.lainLain || 0,
                    helperName: row.helperName || '',
                    notes: 'Diimpor dari Excel',
                    total: row.total || 0,
                    jamBerangkat: row.jamBerangkat || undefined,
                    jamPulang: row.jamPulang || undefined,
                    kmAwal: row.kmAwal || undefined,
                    kmAkhir: row.kmAkhir || undefined,
                };
            });

            setParsedPreview(entries);
            const warnTxt = parsed.warnings?.length
                ? ` (${parsed.warnings.length} peringatan)`
                : '';
            setImportToastMsg({
                title: 'Excel Berhasil Dibaca',
                desc: `${entries.length} baris ditemukan${warnTxt}`
            });
            setShowImportToast(true);
            setTimeout(() => setShowImportToast(false), 4000);
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Gagal membaca file Excel');
        } finally {
            setIsUploading(false);
        }
    };

    const handleConfirmImport = async () => {
        setIsUploading(true);
        for (const entry of parsedPreview) {
            await saveEntry(entry);
        }
        setIsUploading(false);
        setUploadSuccess(true);
        setParsedPreview([]);
        fetchToday();
        setTimeout(() => setUploadSuccess(false), 3000);
    };

    const handleCancelImport = () => {
        setParsedPreview([]);
    };

    const handleExportExcel = async () => {
        try {
            toast.info("Menyiapkan file BOP Excel...");
            const today = new Date();
            const month = today.getMonth() + 1;
            const year  = today.getFullYear();
            const res = await api.get(
                `/api/finance/bop-export?month=${month}&year=${year}`,
                { responseType: 'blob' }
            );
            const blob = new Blob([res.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url  = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href     = url;
            link.download = `BOP_${year}_${String(month).padStart(2,'0')}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success("File BOP berhasil diunduh!");
        } catch {
            toast.error("Gagal mengekspor BOP Excel");
        }
    };

    const handleEdit = (entry: ExpenseEntry) => {
        setEditingId(entry.id!);

        const isFleetExist = fleets.some(f => f.plate === entry.plate);
        if (isFleetExist && !entry.isOncall) {
            const idx = fleets.findIndex(f => f.plate === entry.plate);
            setSelectedFleetIdx(idx >= 0 ? idx : 0);
            setIsOncall(false);
        } else {
            setIsOncall(true);
            setOncallPlate(entry.plate);
        }

        if (drivers.some(d => d.name === entry.driver)) {
            setSelectedDriver(entry.driver);
        } else {
            setSelectedDriver('__custom__'); setCustomDriver(entry.driver);
        }

        if (!entry.helperName) { setSelectedHelper(''); }
        else if (drivers.some(d => d.name === entry.helperName)) {
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

    return {
        topRef, entries, fleets, drivers, selectedFleetIdx, setSelectedFleetIdx,
        isOncall, setIsOncall, oncallPlate, setOncallPlate, selectedDriver, setSelectedDriver,
        customDriver, setCustomDriver, selectedHelper, setSelectedHelper, customHelper, setCustomHelper,
        bbm, setBbm, tol, setTol, parkir, setParkir, parkirLiar, setParkirLiar,
        kuliAngkut, setKuliAngkut, lainLain, setLainLain, showToast, editingId,
        detailEntry, setDetailEntry, isUploading, uploadSuccess, fileInputRef,
        parsedPreview, showImportToast, setShowImportToast, importToastMsg,
        currentPlate, currentDriver, currentHelper, total, resetForm, handleSubmit,
        handleDownloadTemplate, handleImportClick, handleExcelUpload, handleConfirmImport,
        handleCancelImport, handleExportExcel, handleEdit, handleDelete, todayEntries,
        jamBerangkat, setJamBerangkat, jamPulang, setJamPulang,
        kmAwal, setKmAwal, kmAkhir, setKmAkhir, tripSource
    };
}