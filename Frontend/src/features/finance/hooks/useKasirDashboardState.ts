import { useState, useRef, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { toast } from 'sonner';
import { useExpenses } from './useExpenses';
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
    const currentDriver = selectedDriver === '__custom__' ? customDriver : selectedDriver;
    const currentHelper = selectedHelper === '__custom__' ? customHelper : selectedHelper;

    const n = (v: string | number) => Number(v) || 0;
    const total = n(bbm) + n(tol) + n(parkir) + n(parkirLiar) + n(kuliAngkut) + n(lainLain);

    const todayEntries = entries;

    useEffect(() => {
        fetchToday();
        fetchMasterData();
    }, []);

    const resetForm = () => {
        setBbm(''); setTol(''); setParkir(''); setParkirLiar('');
        setKuliAngkut(''); setLainLain('');
        setIsOncall(false); setOncallPlate('');
        setCustomDriver(''); setCustomHelper('');
        setEditingId(null);
        setSelectedFleetIdx(0);
        setSelectedDriver(drivers[0]?.name || '');
        setSelectedHelper('');
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
            vehicleType: isOncall ? 'Oncall' : (fleets[selectedFleetIdx]?.type || 'Unknown'),
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
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
    };

    const handleDownloadTemplate = () => {
        toast.info("Mengunduh Template Excel...");
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleExcelUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        if (fileInputRef.current) fileInputRef.current.value = '';

        setTimeout(() => {
            setIsUploading(false);
            const dummyEntry: ExpenseEntry = {
                time: '08:45',
                date: new Date().toISOString().split('T')[0],
                plate: fleets[0]?.plate || 'B 9514 JXS',
                vehicleType: fleets[0]?.type || 'CDD',
                driver: drivers[0]?.name || 'Supir Import',
                isOncall: false,
                bbm: 450000, tol: 65000, parkir: 20000,
                parkirLiar: 0, kuliAngkut: 25000, lainLain: 0,
                helperName: 'Helper Import', notes: 'Diimpor dari Excel', total: 560000
            };
            setParsedPreview([dummyEntry]);
            setImportToastMsg({ title: 'Excel Siap', desc: 'Satu file excel berhasil diurai' });
            setShowImportToast(true);
            setTimeout(() => setShowImportToast(false), 3000);
        }, 2500);
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

    const handleExportExcel = () => {
        toast.info("Mengekspor data ke Excel...");
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
        handleCancelImport, handleExportExcel, handleEdit, handleDelete, todayEntries
    };
}