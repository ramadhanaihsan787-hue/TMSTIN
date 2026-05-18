import { useSettings } from '../hooks';

// 🌟 IMPORT SEMUA KOMPONEN UI YANG UDAH KITA PECAH
import {
    SettingsTabs,
    VrpSettings,
    CostSettings,
    TelematicsSettings,
    AlertSettings,
    TeamRolesSettings
} from '../components';

export default function SettingsPage() {
    // 🌟 PANGGIL SEMUA DATA & FUNGSI DARI HOOK PUSAT
    const {
        activeTab,
        setActiveTab,
        formData,
        isLoading,
        isSaving,
        saveStatus,
        handleChange,
        handleSave
    } = useSettings();

    // Tampilan pas lagi narik data dari Backend
    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-[#0A0A0A] font-bold text-slate-400">
                <span className="material-symbols-outlined animate-spin mr-2">sync</span>
                Loading System Configuration...
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-[#0A0A0A] flex flex-col h-screen relative custom-scrollbar">
            
            {/* 🌟 NOTIFIKASI TOAST (MUNCUL PAS DI SAVE) */}
            {saveStatus === 'success' && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-xl font-bold flex items-center gap-2 z-50 animate-bounce">
                    <span className="material-symbols-outlined">check_circle</span>
                    Configuration Saved Successfully!
                </div>
            )}
            {saveStatus === 'error' && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-6 py-3 rounded-lg shadow-xl font-bold flex items-center gap-2 z-50">
                    <span className="material-symbols-outlined">error</span>
                    Failed to save configuration.
                </div>
            )}

            {/* Content Area */}
            <div className="p-4 md:p-8 w-full flex-1 flex flex-col">
                
                {/* Komponen Tab Navigasi */}
                <SettingsTabs activeTab={activeTab} setActiveTab={setActiveTab} />

                <div className="flex-1 relative">
                    {/* Render Konten Tab Sesuai Pilihan */}
                    {activeTab === 'vrp' && <VrpSettings formData={formData} onChange={handleChange} />}
                    {activeTab === 'cost' && <CostSettings formData={formData} onChange={handleChange} />}
                    {activeTab === 'telematics' && <TelematicsSettings formData={formData} onChange={handleChange} />}
                    {activeTab === 'alerts' && <AlertSettings formData={formData} onChange={handleChange} />}
                    {activeTab === 'team' && <TeamRolesSettings />}
                    
                    {/* 🌟 GLOBAL SAVE BUTTON (Sembunyiin kalau lagi di tab Team Roles) */}
                    {activeTab !== 'team' && (
                        <div className="mt-8 flex justify-end gap-3 sticky bottom-4">
                            <button className="px-6 py-2.5 bg-slate-100 dark:bg-[#1A1A1A] hover:bg-slate-200 dark:hover:bg-[#222] text-[#111] dark:text-white rounded-lg text-sm font-bold transition-colors shadow-sm border border-slate-200 dark:border-[#333]">
                                Discard Changes
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className={`px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2 active:scale-95 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <span className="material-symbols-outlined text-sm">{isSaving ? 'sync' : 'save'}</span> 
                                {isSaving ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    )} 
                </div> 
            </div> 

            {/* Footer Stats Sub-Bar */}
            <footer className="border-t border-slate-200 dark:border-[#333] bg-white dark:bg-[#111111] px-4 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 hover:bg-slate-50 dark:hover:bg-[#0a0a0a] transition-colors mt-8">
                <div className="flex items-center gap-8 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-slate-500 dark:text-slate-400">System Status: <span className="text-slate-900 dark:text-white font-bold">Optimal</span></span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 hidden sm:block">Last configuration sync: <span className="text-slate-900 dark:text-white font-medium">Just now</span></div>
                </div>
                <div className="text-xs text-slate-400 font-medium">
                    TMS JAPFA Cold Chain V2.4.1
                </div>
            </footer>
        </div>
    );
}