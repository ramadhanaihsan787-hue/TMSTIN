import { useState, useEffect, useRef } from 'react';
import type { ExpenseEntry } from '../types';
import { useExpenses } from './useExpenses';

const n = (v: string) => Number(v) || 0;

export const useKasirDashboardState = () => {
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

    return {
        topRef,
        entries,
        fleets,
        drivers,
        isLoading,
        isMasterLoading,
        selectedFleetIdx,
        setSelectedFleetIdx,
        isOncall,
        setIsOncall,
        oncallPlate,
        setOncallPlate,
        selectedDriver,
        setSelectedDriver,
        customDriver,
        setCustomDriver,
        selectedHelper,
        setSelectedHelper,
        customHelper,
        setCustomHelper,
        bbm,
        setBbm,
        tol,
        setTol,
        parkir,
        setParkir,
        parkirLiar,
        setParkirLiar,
        kuliAngkut,
        setKuliAngkut,
        lainLain,
        setLainLain,
        showToast,
        setShowToast,
        editingId,
        setEditingId,
        detailEntry,
        setDetailEntry,
        isUploading,
        setIsUploading,
        uploadSuccess,
        setUploadSuccess,
        fileInputRef,
        parsedPreview,
        setParsedPreview,
        showImportToast,
        setShowImportToast,
        importToastMsg,
        setImportToastMsg,
        triggerImportToast,
        fleet,
        currentPlate,
        currentDriver,
        currentHelper,
        total,
        resetForm,
        handleSubmit,
        handleDownloadTemplate,
        handleImportClick,
        handleExcelUpload,
        handleConfirmImport,
        handleCancelImport,
        handleExportExcel,
        handleEdit,
        handleDelete,
        todayEntries
    };
};
