import type { SettingsFormData } from '../types';

interface VrpSettingsProps {
    formData: SettingsFormData;
    onChange: (field: keyof SettingsFormData, value: string | number) => void;
}

export default function VrpSettings({ formData, onChange }: VrpSettingsProps) {
    return (
        <div className="animate-fadeIn">
            <div className="mb-6">
                <h2 className="text-lg font-bold tracking-tight mb-1 text-[#111] dark:text-white">VRP & Routing Engine 2</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Configure how the OR-Tools AI algorithm thinks and constraints operational parameters.</p>
            </div>

            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#333] rounded-xl p-8 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Default Start Time (HH:MM)</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">schedule</span>
                            <input value={formData.vrp_start_time} onChange={(e) => onChange('vrp_start_time', e.target.value)} className="w-full pl-12 pr-4 py-2 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#333] rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm text-[#111] dark:text-white transition-all" type="time" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Default End Time (HH:MM)</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">update</span>
                            <input value={formData.vrp_end_time} onChange={(e) => onChange('vrp_end_time', e.target.value)} className="w-full pl-12 pr-4 py-2 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#333] rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm text-[#111] dark:text-white transition-all" type="time" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Base Drop Time (Minutes)</label>
                        <div className="relative">
                            <input value={formData.vrp_base_drop_time_mins} onChange={(e) => onChange('vrp_base_drop_time_mins', Number(e.target.value))} className="w-full px-4 py-2 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#333] rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm text-[#111] dark:text-white transition-all text-right pr-14" type="number" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">Mins</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Variable Drop Time (per 10 KG)</label>
                        <div className="relative">
                            <input value={formData.vrp_var_drop_time_mins} onChange={(e) => onChange('vrp_var_drop_time_mins', Number(e.target.value))} className="w-full px-4 py-2 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#333] rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm text-[#111] dark:text-white transition-all text-right pr-14" type="number" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">Mins</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 md:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Max Vehicle Capacity Buffer (%)</label>
                        <div className="flex items-center gap-4">
                            <input value={formData.vrp_capacity_buffer_percent} onChange={(e) => onChange('vrp_capacity_buffer_percent', Number(e.target.value))} type="range" min="50" max="100" className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                            <div className="w-16 text-center py-1 bg-primary/10 text-primary font-bold rounded-lg text-sm">{formData.vrp_capacity_buffer_percent}%</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Harga BBM */}
            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#333] rounded-xl p-8 shadow-sm mt-6">
                <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                        Harga BBM per Liter
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Dipakai untuk kalkulasi rasio km/liter di kolom BOP export Excel.
                        Perbarui saat harga Pertamina berubah.
                    </p>
                </div>
                <div className="flex flex-col gap-2 max-w-xs">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Harga per Liter (Rp)
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                        <input
                            value={formData.harga_bbm_per_liter ?? 12500}
                            onChange={(e) => onChange('harga_bbm_per_liter', Number(e.target.value))}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#333] rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm text-[#111] dark:text-white transition-all text-right"
                            type="number"
                            min="5000"
                            max="30000"
                            step="500"
                        />
                    </div>
                    <p className="text-[10px] text-slate-400">Pertalite saat ini: Rp 10.000, Pertamax: Rp 13.900</p>
                </div>
            </div>

            {/* Geofence POD */}
            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#333] rounded-xl p-8 shadow-sm mt-6">
                <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                        Geofence ePOD
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Radius dan waktu minimum yang dipakai sistem untuk validasi posisi GPS driver
                        saat submit ePOD. Driver di luar radius → delivery di-flag anomali.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Radius Geofence (Meter)
                        </label>
                        <div className="relative">
                            <input
                                value={formData.geofence_radius_meters ?? 200}
                                onChange={(e) => onChange('geofence_radius_meters', Number(e.target.value))}
                                className="w-full px-4 py-2 pr-12 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#333] rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm text-[#111] dark:text-white transition-all text-right"
                                type="number"
                                min="50"
                                max="2000"
                                step="50"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">m</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Rekomen: 200m di perkotaan, 500m di luar kota</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Dwell Time Minimum (Menit)
                        </label>
                        <div className="relative">
                            <input
                                value={formData.dwell_time_mins ?? 3}
                                onChange={(e) => onChange('dwell_time_mins', Number(e.target.value))}
                                className="w-full px-4 py-2 pr-16 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#333] rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm text-[#111] dark:text-white transition-all text-right"
                                type="number"
                                min="1"
                                max="30"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">menit</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Waktu minimum driver harus di lokasi sebelum dianggap valid</p>
                    </div>
                </div>
            </div>

            {/* Geofence Jembatan Timbang */}
            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#333] rounded-xl p-8 shadow-sm mt-6">
                <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                        Geofence Jembatan Timbang
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Koordinat jembatan timbang digunakan untuk auto-lock jam pulang driver
                        ketika truk berhenti di area ini selama ≥ 10 detik.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Latitude
                        </label>
                        <input
                            value={formData.jembatan_timbang_lat ?? ''}
                            onChange={(e) => onChange('jembatan_timbang_lat', Number(e.target.value))}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#333] rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm text-[#111] dark:text-white transition-all font-mono"
                            type="number"
                            step="0.000001"
                            placeholder="-6.206353"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Longitude
                        </label>
                        <input
                            value={formData.jembatan_timbang_lon ?? ''}
                            onChange={(e) => onChange('jembatan_timbang_lon', Number(e.target.value))}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#333] rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm text-[#111] dark:text-white transition-all font-mono"
                            type="number"
                            step="0.000001"
                            placeholder="106.480681"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Radius (Meter)
                        </label>
                        <div className="relative">
                            <input
                                value={formData.jembatan_timbang_radius_m ?? 30}
                                onChange={(e) => onChange('jembatan_timbang_radius_m', Number(e.target.value))}
                                className="w-full px-4 py-2 pr-12 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#333] rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm text-[#111] dark:text-white transition-all text-right"
                                type="number"
                                min="5"
                                max="500"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">m</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}