// src/features/fleet/pages/FleetManagementPage.tsx
import { useEffect, useState, useMemo } from "react";
import { toast } from 'sonner';

import { useFleet } from "../hooks/index";
import { 
    FleetKPIs,
    FleetFilters,
    FleetMap,
    FleetTruckCard,
    FuelLogSidebar
} from "../components";

import { useHeaderStore } from "../../../store/useHeaderStore";

export default function FleetManagementPage() {
    const { setTitle } = useHeaderStore();
    const [activeTab, setActiveTab] = useState('All Trucks');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFuelLogSidebar, setShowFuelLogSidebar] = useState(false);

    // Form state for manual fuel expense modal
    const [showFuelModal, setShowFuelModal] = useState(false);
    const [fuelTruckId, setFuelTruckId] = useState('');
    const [fuelStation, setFuelStation] = useState('');
    const [fuelVolume, setFuelVolume] = useState('');
    const [fuelCost, setFuelCost] = useState('');

    // Set page header title
    useEffect(() => {
        setTitle("Fleet Health & Cold Chain Tracking");
    }, [setTitle]);

    const { 
        loading, 
        fleetList, 
        selectedTruck, 
        setSelectedTruck, 
        telematics,
        fuelLogs,
        addFuelEntry
    } = useFleet();

    // Auto-select the active truck when the fuel modal is opened
    useEffect(() => {
        if (selectedTruck && showFuelModal) {
            setFuelTruckId(selectedTruck.id.toString());
        }
    }, [selectedTruck, showFuelModal]);

    // ================= DYNAMIC SEARCH AND TAB FILTER LOGIC =================
    const filteredTrucks = useMemo(() => {
        return fleetList.filter(truck => {
            // Normalize whitespaces for plate matching (e.g., "B 1234 ABC" -> "b1234abc", "b1234" -> "b1234")
            const normalizedPlate = (truck.licensePlate || "").replace(/\s+/g, "").toLowerCase();
            const normalizedQuery = searchQuery.replace(/\s+/g, "").toLowerCase();

            // Format Truck ID for searching (e.g., id: 3 -> "trk-003")
            const formattedId = `TRK-${String(truck.id).padStart(3, "0")}`.toLowerCase();

            // Search query matches Truck ID, license plate, driver name, route, or cargo type
            const matchesSearch = 
                formattedId.includes(searchQuery.toLowerCase()) ||
                String(truck.id).includes(searchQuery.toLowerCase()) ||
                normalizedPlate.includes(normalizedQuery) ||
                truck.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (truck.driverName && truck.driverName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (truck.routeName && truck.routeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (truck.cargoType && truck.cargoType.toLowerCase().includes(searchQuery.toLowerCase()));

            if (!matchesSearch) return false;

            // Tab filtering
            if (activeTab === 'All Trucks') return true;
            if (activeTab === 'Active') return truck.status === 'Available' || truck.status === 'On Trip';
            if (activeTab === 'Idle') return truck.status === 'Idle' || (truck.status === 'Available' && truck.speedKmH === 0);
            if (activeTab === 'Maintenance') return truck.status === 'Maintenance';
            if (activeTab === 'Alerts') return truck.tempStatus === 'Warning' || truck.tempStatus === 'Critical';

            return true;
        });
    }, [fleetList, activeTab, searchQuery]);

    // Calculate dynamic KPI values from our active list
    const kpiData = useMemo(() => {
        return {
            vehiclesStored: fleetList.length,
            vehiclesOnDuty: fleetList.filter(t => t.status === 'Available' || t.status === 'On Trip').length,
            vehiclesMaintenance: fleetList.filter(t => t.status === 'Maintenance').length,
            coldChainBreaches: fleetList.filter(t => t.tempStatus === 'Warning' || t.tempStatus === 'Critical').length,
            avgFuelEfficiency: 8.2
        };
    }, [fleetList]);

    // ================= HANDLERS BUAT ACTION BUTTONS =================
    const handleAssignDriver = () => {
        if (!selectedTruck) return;
        toast.info(`Menu Ganti Supir untuk truk ${selectedTruck.licensePlate} dibuka!`);
    };

    const handleReportIssue = () => {
        if (!selectedTruck) return;
        toast.warning(`Form Laporan Servis truk ${selectedTruck.licensePlate} dibuka!`);
    };

    const handleInputFuel = () => {
        setShowFuelModal(true);
    };

    const handleFuelSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fuelTruckId || !fuelStation || !fuelVolume || !fuelCost) {
            toast.error("Semua field bensin harus diisi!");
            return;
        }

        try {
            await addFuelEntry(
                parseFloat(fuelVolume),
                fuelStation,
                parseFloat(fuelCost)
            );
            toast.success("Log biaya bensin manual berhasil ditambahkan!");
            setShowFuelModal(false);
            // Reset form fields
            setFuelStation('');
            setFuelVolume('');
            setFuelCost('');
        } catch (err) {
            toast.error("Gagal menambahkan log bensin!");
        }
    };

    return (
        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-app-bg text-app-text">
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                
                {/* KONTEN KIRI/TENGAH (SCROLLABLE) */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar">
                    
                    {/* Premium Fleet KPIs */}
                    <FleetKPIs 
                        vehiclesStored={kpiData.vehiclesStored}
                        vehiclesOnDuty={kpiData.vehiclesOnDuty}
                        vehiclesMaintenance={kpiData.vehiclesMaintenance}
                        coldChainBreaches={kpiData.coldChainBreaches}
                        avgFuelEfficiency={kpiData.avgFuelEfficiency}
                        onInputFuelClick={handleInputFuel}
                        onViewFuelLogClick={() => setShowFuelLogSidebar(true)}
                    />

                    {/* Filter Tabs & Search */}
                    <FleetFilters 
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onMoreFiltersClick={() => toast.info("Filter settings panel opened")}
                    />

                    {/* Interactive Split View: Grid Cards + Premium Route Planning Map Wrapper */}
                    <div className="grid grid-cols-12 gap-6 items-start">
                        {/* Grid of Truck Cards */}
                        <div className="col-span-12 xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {loading ? (
                                <div className="col-span-2 flex flex-col items-center justify-center py-20 text-app-muted">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-app-accent mb-4"></div>
                                    <span>Retrieving telemetry...</span>
                                </div>
                            ) : filteredTrucks.length > 0 ? (
                                filteredTrucks.map(truck => (
                                    <FleetTruckCard 
                                        key={truck.id}
                                        truck={truck}
                                        isSelected={selectedTruck?.id === truck.id}
                                        onSelect={() => setSelectedTruck(truck)}
                                    />
                                ))
                            ) : (
                                <div className="col-span-2 text-center py-16 text-app-muted border border-app-border border-dashed rounded-2xl bg-app-panel">
                                    <span className="material-symbols-outlined text-4xl mb-2 text-app-muted/50 block">local_shipping</span>
                                    <p className="font-semibold text-sm">No vehicles found</p>
                                    <p className="text-xs text-app-muted/60 mt-1">Try adjusting your filters or search keywords.</p>
                                </div>
                            )}
                        </div>

                        {/* Interactive Route Tracking Map in Premium Route Planning Card Style */}
                        <div className="col-span-12 xl:col-span-5 bg-white dark:bg-app-panel border border-slate-200 dark:border-app-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
                            <div className="p-4 border-b border-slate-200 dark:border-app-border shrink-0 flex justify-between items-center bg-slate-50/70 dark:bg-[#0f1115]/50">
                                <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-app-orange text-lg">map</span>
                                    Live Fleet Monitor Map
                                </h3>
                                <span className="text-[9px] font-bold text-app-orange bg-orange-50 dark:bg-app-orangeBg px-2 py-0.5 rounded uppercase tracking-wider">
                                    Realtime Tracking
                                </span>
                            </div>
                            <div className="flex-1 relative bg-slate-50 dark:bg-[#0f1115]">
                                <FleetMap 
                                    fleetList={fleetList}
                                    selectedTruck={selectedTruck}
                                    onSelectTruck={setSelectedTruck}
                                />
                            </div>
                        </div>
                    </div>

                </div>
                
            </div>

            {/* Isi Biaya Bensin Modal (Premium Modal design matching Route Planning dispatching styles) */}
            {showFuelModal && (
                <div className="fixed inset-0 z-[9999999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-app-panel border border-app-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-app-border flex justify-between items-center bg-slate-50/50 dark:bg-[#0f1115]/50">
                            <div>
                                <h2 className="text-lg font-black uppercase text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
                                    <span className="material-symbols-outlined text-app-orange">local_gas_station</span> 
                                    Isi Biaya Bensin Manual
                                </h2>
                                <p className="text-xs font-semibold text-slate-600 dark:text-app-muted mt-1">Catat transaksi pengeluaran bahan bakar untuk armada Anda.</p>
                            </div>
                            <button onClick={() => setShowFuelModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-app-border rounded-xl text-slate-600 dark:text-app-muted transition-colors cursor-pointer">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Form Fields */}
                        <form onSubmit={handleFuelSubmit} className="p-6 space-y-4">
                            {/* Truck Select */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-slate-500 dark:text-app-muted uppercase tracking-wider">Armada Truk</label>
                                <select 
                                    value={fuelTruckId} 
                                    onChange={(e) => setFuelTruckId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-[#0f1115] border border-app-border rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-white focus:border-app-orange focus:ring-1 focus:ring-app-orange outline-none"
                                    required
                                >
                                    <option value="" className="bg-white dark:bg-[#0f1115] text-slate-800 dark:text-white">Pilih Truk (Plat Nomor)...</option>
                                    {fleetList.map(f => (
                                        <option key={f.id} value={f.id} className="bg-white dark:bg-[#0f1115] text-slate-800 dark:text-white">
                                            {f.licensePlate} • {f.driverName || 'No Driver'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Station Name */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-slate-500 dark:text-app-muted uppercase tracking-wider">Nama SPBU / Vendor</label>
                                <input 
                                    type="text" 
                                    placeholder="Contoh: Pertamina Cikarang, Shell Margonda" 
                                    value={fuelStation}
                                    onChange={(e) => setFuelStation(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-[#0f1115] border border-app-border rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-app-orange focus:ring-1 focus:ring-app-orange outline-none"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Volume (Liters) */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 dark:text-app-muted uppercase tracking-wider">Volume (Liters)</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        step="any" 
                                        placeholder="Volume (L)" 
                                        value={fuelVolume}
                                        onChange={(e) => setFuelVolume(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-[#0f1115] border border-app-border rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-app-orange focus:ring-1 focus:ring-app-orange outline-none"
                                        required
                                    />
                                </div>

                                {/* Cost (Rupiah) */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 dark:text-app-muted uppercase tracking-wider">Total Biaya (Rp)</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        placeholder="Biaya (Rp)" 
                                        value={fuelCost}
                                        onChange={(e) => setFuelCost(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-[#0f1115] border border-app-border rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-app-orange focus:ring-1 focus:ring-app-orange outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Submit Actions */}
                            <div className="pt-4 border-t border-app-border flex justify-end gap-3 bg-app-panel">
                                <button 
                                    type="button"
                                    onClick={() => setShowFuelModal(false)} 
                                    className="px-5 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252830] rounded-xl transition-colors cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-6 py-3 bg-app-orange text-white text-xs font-black rounded-xl hover:brightness-110 flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-sm font-bold">local_gas_station</span>
                                    SIMPAN LOG BENSIN
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Fuel Log Right Sidebar Drawer */}
            <FuelLogSidebar 
                isOpen={showFuelLogSidebar}
                onClose={() => setShowFuelLogSidebar(false)}
                logs={fuelLogs}
                onInputFuel={() => {
                    setShowFuelLogSidebar(false);
                    handleInputFuel();
                }}
            />
        </div>
    );
}