import React from 'react';

interface FleetItem {
    id: number;
    plate: string;
    type: string;
}

interface DriverItem {
    id: number;
    name: string;
}

interface BopInputFormProps {
    isOncall: boolean;
    setIsOncall: (val: boolean) => void;
    oncallPlate: string;
    setOncallPlate: (val: string) => void;
    selectedFleetIdx: number;
    setSelectedFleetIdx: (idx: number) => void;
    fleets: FleetItem[];
    drivers: DriverItem[];
    selectedDriver: string;
    setSelectedDriver: (val: string) => void;
    customDriver: string;
    setCustomDriver: (val: string) => void;
    selectedHelper: string;
    setSelectedHelper: (val: string) => void;
    customHelper: string;
    setCustomHelper: (val: string) => void;
    bbm: string;
    setBbm: (val: string) => void;
    tol: string;
    setTol: (val: string) => void;
    parkir: string;
    setParkir: (val: string) => void;
    parkirLiar: string;
    setParkirLiar: (val: string) => void;
    kuliAngkut: string;
    setKuliAngkut: (val: string) => void;
    lainLain: string;
    setLainLain: (val: string) => void;
}

export const BopInputForm: React.FC<BopInputFormProps> = ({
    isOncall,
    setIsOncall,
    oncallPlate,
    setOncallPlate,
    selectedFleetIdx,
    setSelectedFleetIdx,
    fleets,
    drivers,
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
}) => {
    return (
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
                            type="checkbox"
                            checked={isOncall}
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
                                type="text"
                                placeholder="Contoh: B 1234 XYZ"
                                value={oncallPlate}
                                onChange={e => setOncallPlate(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 px-4 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30"
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Nopol Armada</label>
                            <div className="relative">
                                <select
                                    value={selectedFleetIdx}
                                    onChange={e => setSelectedFleetIdx(Number(e.target.value))}
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
                                value={selectedDriver}
                                onChange={e => setSelectedDriver(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 px-4 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
                            >
                                {drivers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                <option value="__custom__">— Driver Pengganti —</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-4 top-4 text-slate-400 pointer-events-none">expand_more</span>
                        </div>
                        {selectedDriver === '__custom__' && (
                            <input
                                type="text"
                                placeholder="Ketik nama driver pengganti"
                                value={customDriver}
                                onChange={e => setCustomDriver(e.target.value)}
                                className="w-full mt-2 bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-3 px-4 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30"
                            />
                        )}
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Helper</label>
                        <div className="relative">
                            <select
                                value={selectedHelper}
                                onChange={e => setSelectedHelper(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 px-4 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
                            >
                                <option value="">— Tanpa Helper —</option>
                                {drivers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                <option value="__custom__">— Helper Pengganti —</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-4 top-4 text-slate-400 pointer-events-none">expand_more</span>
                        </div>
                        {selectedHelper === '__custom__' && (
                            <input
                                type="text"
                                placeholder="Ketik nama helper pengganti"
                                value={customHelper}
                                onChange={e => setCustomHelper(e.target.value)}
                                className="w-full mt-2 bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-3 px-4 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30"
                            />
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
                                type="text"
                                placeholder="0"
                                value={bbm}
                                onChange={e => setBbm(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 pl-10 pr-4 font-extrabold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 text-right"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Total Tol</label>
                        <div className="relative">
                            <span className="absolute left-4 top-4 text-slate-400 font-bold text-sm">Rp</span>
                            <input
                                type="text"
                                placeholder="0"
                                value={tol}
                                onChange={e => setTol(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 pl-10 pr-4 font-extrabold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 text-right"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Parkir Resmi</label>
                        <div className="relative">
                            <span className="absolute left-4 top-4 text-slate-400 font-bold text-sm">Rp</span>
                            <input
                                type="text"
                                placeholder="0"
                                value={parkir}
                                onChange={e => setParkir(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 pl-10 pr-4 font-extrabold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 text-right"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Parkir Liar</label>
                        <div className="relative">
                            <span className="absolute left-4 top-4 text-slate-400 font-bold text-sm">Rp</span>
                            <input
                                type="text"
                                placeholder="0"
                                value={parkirLiar}
                                onChange={e => setParkirLiar(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 pl-10 pr-4 font-extrabold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 text-right"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Kuli Angkut / DLL</label>
                        <div className="relative">
                            <span className="absolute left-4 top-4 text-slate-400 font-bold text-sm">Rp</span>
                            <input
                                type="text"
                                placeholder="0"
                                value={kuliAngkut}
                                onChange={e => setKuliAngkut(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 pl-10 pr-4 font-extrabold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 text-right"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Helper Harian</label>
                        <div className="relative">
                            <span className="absolute left-4 top-4 text-slate-400 font-bold text-sm">Rp</span>
                            <input
                                type="text"
                                placeholder="0"
                                value={lainLain}
                                onChange={e => setLainLain(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full bg-slate-50 dark:bg-[#1A1A1A] border-none rounded-lg py-4 pl-10 pr-4 font-extrabold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 text-right"
                            />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};