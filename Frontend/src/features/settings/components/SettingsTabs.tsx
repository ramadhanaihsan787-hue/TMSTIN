import type { SettingsTabId } from '../types';

interface SettingsTabsProps {
    activeTab: SettingsTabId;
    setActiveTab: (tab: SettingsTabId) => void;
}

export default function SettingsTabs({ activeTab, setActiveTab }: SettingsTabsProps) {
    const tabs: { id: SettingsTabId; label: string; icon: string }[] = [
        { id: 'vrp', label: 'VRP & Routing Engine', icon: 'route' },
        { id: 'cost', label: 'Cost & Operations', icon: 'payments' },
        { id: 'telematics', label: 'Telematics & IoT', icon: 'sensors' },
        { id: 'alerts', label: 'Alerts & Notifications', icon: 'notifications_active' },
        { id: 'team', label: 'Team Roles', icon: 'group' } 
    ];

    return (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-200 dark:border-[#333] mb-8 gap-4 pb-4 lg:pb-0">
            <div className="flex items-center overflow-x-auto hide-scrollbar">
                {tabs.map((tab) => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-4 text-sm font-bold border-b-2 flex items-center gap-2 shrink-0 transition-colors ${
                            activeTab === tab.id 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    );
}