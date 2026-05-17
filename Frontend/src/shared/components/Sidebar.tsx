// src/shared/components/Sidebar.tsx
import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useSidebar } from "../../context/SidebarContext";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { role } = useAuth();
    const { isCollapsed, toggleSidebar, isMobileMenuOpen, closeMobileMenu } = useSidebar();
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    // 🌟 DATA MENU DENGAN SUB-MENU 
    const menuItems = [
        // --- MENU ADMIN DISTRIBUSI ---
        { to: "/logistik", icon: "dashboard", label: "Dashboard", end: true, roles: ['admin_distribusi'] },
        { to: "/logistik/route-planning", icon: "map", label: "Route Planning", roles: ['admin_distribusi'] },
        { to: "/logistik/load-planner", icon: "conveyor_belt", label: "Load Planner", roles: ['admin_distribusi'] },
        { to: "/logistik/fleet", icon: "local_shipping", label: "Fleet Management", roles: ['admin_distribusi'] },
        { to: "/logistik/drivers", icon: "badge", label: "Driver List", roles: ['admin_distribusi'] },
        { to: "/logistik/customers", icon: "groups", label: "Customer Data", roles: ['admin_distribusi'] },
        { to: "/logistik/analytics", icon: "analytics", label: "Analytics", roles: ['admin_distribusi'] },

        // --- MENU MANAGER LOGISTIK ---
        {
            label: "Manager Logistik",
            icon: "monitoring",
            roles: ['manager_logistik'],
            submenu: [
                { to: "/manager/overview", label: "Overview", icon: "grid_view" },
                { to: "/manager/return", label: "Return Performance", icon: "assignment_return" },
                { to: "/manager/efficiency", label: "Logistics Efficiency", icon: "speed" },
            ]
        },

        // --- MENU ADMIN POD (Proof of Delivery) ---
        // 🌟 FIX CTO: Akses Manager dicabut, sekarang murni cuma buat Admin POD!
        { to: "/pod", icon: "receipt_long", label: "POD Verification", roles: ['admin_pod'] },

        // --- MENU KASIR / FINANCE ---
        // 🌟 FIX CTO: Akses Manager dicabut, sekarang murni cuma buat Kasir!
        { to: "/finance", icon: "account_balance_wallet", label: "Finance & Expense", end: true, roles: ['kasir'] },
        { to: "/finance/history", icon: "history", label: "Riwayat Cost", roles: ['kasir'] },
    ];

    return (
        <aside className={`
            fixed lg:static inset-y-0 left-0 z-30
            ${isCollapsed ? 'w-20' : 'w-72'} 
            bg-white dark:bg-sidebar text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-white/5 
            flex flex-col justify-between shrink-0 
            transition-all duration-300 ease-in-out
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
            <div className="flex flex-col overflow-hidden">
                {/* LOGO SECTION */}
                <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border-b border-slate-200 dark:border-white/5 h-20`}>
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-50 dark:bg-white p-1 rounded-lg w-16 h-10 flex items-center justify-center shrink-0">
                            <img src="/japfa-logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        {!isCollapsed && (
                            <span className="font-bold text-2xl tracking-tight text-primary font-sans whitespace-nowrap">TMS</span>
                        )}
                    </div>
                    {!isCollapsed && (
                        <button onClick={toggleSidebar} className="hidden lg:block p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-xl">menu_open</span>
                        </button>
                    )}
                    <button onClick={closeMobileMenu} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* COLLAPSED TOGGLE */}
                {isCollapsed && (
                    <div className="hidden lg:flex justify-center p-4 border-b border-slate-200 dark:border-white/5">
                        <button onClick={toggleSidebar} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all">
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                    </div>
                )}

                {/* NAVIGATION AREA */}
                <nav className="p-4 flex flex-col gap-1 overflow-y-auto custom-scrollbar flex-1">
                    {menuItems.filter(item => !item.roles || item.roles.includes(role || '')).map((item, idx) => {
                        const hasSubmenu = !!item.submenu;
                        const isAnySubActive = hasSubmenu && item.submenu?.some(sub => location.pathname === sub.to);

                        return (
                            <div key={idx} className="flex flex-col gap-1">
                                {/* MAIN MENU ITEM */}
                                {item.to ? (
                                    <NavLink
                                        to={item.to}
                                        end={item.end}
                                        onClick={closeMobileMenu}
                                        className={({ isActive }) => `
                                            flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl transition-all 
                                            ${isActive ? 'active-nav shadow-lg shadow-primary/20 font-bold text-primary' : 'hover:bg-slate-100 hover:text-slate-900 dark:hover:text-white dark:hover:bg-white/5 font-medium'}
                                        `}
                                    >
                                        <span className="material-symbols-outlined">{item.icon}</span>
                                        {!isCollapsed && <span className="text-sm tracking-tight">{item.label}</span>}
                                    </NavLink>
                                ) : (
                                    // 🌟 HEADER MENU BUAT MANAGER (YANG PUNYA SUB-MENU)
                                    <div className={`flex flex-col ${isCollapsed ? 'items-center' : ''}`}>
                                        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl transition-all ${isAnySubActive ? 'bg-primary/5 text-primary font-bold' : 'text-slate-600 dark:text-slate-400 font-medium'}`}>
                                            <span className="material-symbols-outlined">{item.icon}</span>
                                            {!isCollapsed && <span className="text-sm">{item.label}</span>}
                                        </div>

                                        {/* 🌟 RENDER SUB-MENU DENGAN GAYA CLEAN */}
                                        {!isCollapsed && item.submenu?.map((sub, sIdx) => (
                                            <NavLink
                                                key={sIdx}
                                                to={sub.to}
                                                onClick={closeMobileMenu}
                                                className={({ isActive }) => `
                                                    flex items-center gap-3 ml-4 pl-4 py-2.5 mt-1 rounded-xl transition-all
                                                    ${isActive
                                                        ? 'bg-japfa-orange/10 text-japfa-orange font-bold'
                                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 font-medium'}
                                                `}
                                            >
                                                <span className="material-symbols-outlined text-[18px]">{sub.icon}</span>
                                                <span className="text-sm">{sub.label}</span>
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <div className="my-4 border-t border-slate-200 dark:border-white/5"></div>

                    {/* SETTINGS (Role Admin Distribusi) */}
                    {role === 'admin_distribusi' && (
                        <NavLink
                            to="/logistik/settings"
                            onClick={closeMobileMenu}
                            className={({ isActive }) => `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl transition-all ${isActive ? 'active-nav shadow-lg shadow-primary/20 font-bold text-primary' : 'hover:bg-slate-100 hover:text-slate-900 dark:hover:text-white dark:hover:bg-white/5 font-medium'}`}
                        >
                            <span className="material-symbols-outlined">settings</span>
                            {!isCollapsed && <span className="text-sm tracking-tight">Settings</span>}
                        </NavLink>
                    )}
                </nav>
            </div>

            {/* PROFILE SECTION */}
            <div className="relative">
                {isProfileOpen && !isCollapsed && (
                    <div className="absolute bottom-[calc(100%+12px)] left-4 w-64 bg-white dark:bg-[#1F1F1F] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col z-50 animate-in slide-in-from-bottom-2 duration-200">
                        <div className="p-5 border-b border-slate-200 dark:border-white/5 bg-gray-50 dark:bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700 bg-cover bg-center border-2 border-primary/50 shadow-inner" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA_CoqZM_f895VVG6xXC0MfnjI98mvn3WcDUJwkb1Hv3GGpHUO2HqGmx5horSlkjjgo7VZT8jXmkKux0MWPCZ_-HDsrLO5o0twThB3MVIJzR-npaiY6dKeL0j48vcU_DvCalF7abl13097MKhMih--TbrpNZ2ztDSje7k4rVTzwhvkz4_uAXn-Ah7qYsJZDKOmrh_1DwiFmgurQFlK69gGKx0FFrylODtnN8lTk13zSVEUZQv2NchBDLLntLpHLoFkEeF3kN4BcQ6c')" }}></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">Dini Dwi</p>
                                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate uppercase tracking-tight">{role?.replace('_', ' ')}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 mb-3">Quick Switch</p>
                            <div className="space-y-1">
                                <button onClick={() => navigate('/logistik')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${role === 'admin_distribusi' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-100 dark:hover:bg-white/5 font-medium'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
                                        <span className="text-sm">Admin Logistik</span>
                                    </div>
                                    {role === 'admin_distribusi' && <span className="material-symbols-outlined text-lg">check_circle</span>}
                                </button>
                                <button onClick={() => navigate('/manager')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${role === 'manager_logistik' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-100 dark:hover:bg-white/5 font-medium'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-xl">monitoring</span>
                                        <span className="text-sm">Manager</span>
                                    </div>
                                    {role === 'manager_logistik' && <span className="material-symbols-outlined text-lg">check_circle</span>}
                                </button>
                                <button onClick={() => navigate('/pod')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${role === 'admin_pod' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-100 dark:hover:bg-white/5 font-medium'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-xl">receipt_long</span>
                                        <span className="text-sm">Admin POD</span>
                                    </div>
                                    {role === 'admin_pod' && <span className="material-symbols-outlined text-lg">check_circle</span>}
                                </button>
                                <button onClick={() => navigate('/finance')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${role === 'kasir' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-100 dark:hover:bg-white/5 font-medium'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                                        <span className="text-sm">Kasir</span>
                                    </div>
                                    {role === 'kasir' && <span className="material-symbols-outlined text-lg">check_circle</span>}
                                </button>
                            </div>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-black/20 mt-2">
                            <button onClick={() => navigate('/login')} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 font-bold transition-all text-sm">
                                <span className="material-symbols-outlined text-xl">logout</span>
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* BOTTOM PROFILE BAR */}
                <div
                    className={`${isCollapsed ? 'p-2 flex justify-center' : 'p-4 bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10'} m-4 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-all group`}
                    onClick={() => isCollapsed ? toggleSidebar() : setIsProfileOpen(!isProfileOpen)}
                >
                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                        <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 bg-cover bg-center border border-slate-300 dark:border-white/20 shrink-0" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA_CoqZM_f895VVG6xXC0MfnjI98mvn3WcDUJwkb1Hv3GGpHUO2HqGmx5horSlkjjgo7VZT8jXmkKux0MWPCZ_-HDsrLO5o0twThB3MVIJzR-npaiY6dKeL0j48vcU_DvCalF7abl13097MKhMih--TbrpNZ2ztDSje7k4rVTzwhvkz4_uAXn-Ah7qYsJZDKOmrh_1DwiFmgurQFlK69gGKx0FFrylODtnN8lTk13zSVEUZQv2NchBDLLntLpHLoFkEeF3kN4BcQ6c')" }}></div>
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">Dini Dwi</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                                </p>
                            </div>
                        )}
                        {!isCollapsed && <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-transform group-hover:rotate-180 duration-500">expand_less</span>}
                    </div>
                </div>
            </div>
        </aside>
    );
}