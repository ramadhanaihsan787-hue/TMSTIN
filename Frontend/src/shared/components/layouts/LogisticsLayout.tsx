// src/shared/components/layouts/LogisticsLayout.tsx
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar';
import Header from '../Header'; 
import { useSidebar } from '../../../context/SidebarContext';
import { useHeaderStore } from '../../../store/useHeaderStore'; // 🌟 IMPORT STORE

export default function LogisticsLayout() {
    const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useSidebar();
    const { title } = useHeaderStore(); // 🌟 TARIK TITLE DARI STORE

    return (
        <div className="flex h-screen overflow-hidden relative bg-main-bg dark:bg-[#0a0a0a] text-slate-900 dark:text-slate-100 antialiased font-display transition-colors">
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={closeMobileMenu}
                />
            )}

            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Top Header */}
                <header className="lg:hidden h-16 bg-white dark:bg-sidebar border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-4 shrink-0 z-10 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-100 dark:bg-white p-1 rounded-lg w-8 h-8 flex items-center justify-center shrink-0">
                            <img src="/japfa-logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="font-bold text-lg tracking-tight font-sans">
                            <span className="text-slate-900 dark:text-white">TMS </span>
                            <span className="text-[#FF7A00]">Japfa</span>
                        </span>
                    </div>
                    <button
                        onClick={toggleMobileMenu}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 transition-colors"
                    >
                        <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
                    </button>
                </header>

                {/* 🌟 HEADER GLOBAL (Ngambil title dari Zustand) */}
                <div className="hidden lg:block relative z-40">
                    <Header title={title} />
                </div>

                {/* MAIN CONTENT */}
                <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#111111] transition-all duration-300 ease-in-out">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}