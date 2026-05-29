// src/features/settings/components/TeamRolesSettings.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../../../shared/services/apiClient';

interface Member {
    id: number;
    name: string;
    email: string;
    role: string;
    status: 'Active' | 'Inactive';
    lastLogin: string;
    avatar: string;
}

export default function TeamRolesSettings() {
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const response = await api.get('/auth/users');
                if (response.data?.status === 'success') {
                    const mapped = response.data.data.map((u: any) => ({
                        id: u.user_id,
                        name: u.full_name || u.username,
                        email: `${u.username}@japfalogix.com`,
                        role: u.role.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
                        status: 'Active',
                        lastLogin: 'Recently',
                        avatar: ''
                    }));
                    setMembers(mapped);
                }
            } catch (error) {
                console.error("Gagal load users:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMembers();
    }, []);

    return (
        <div className={`animate-fadeIn space-y-8 pb-10 transition-opacity duration-500 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                <div>
                    <h3 className="text-2xl md:text-3xl font-black tracking-tighter text-on-surface">Manage Team</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-lg text-sm">
                        Control access levels and manage permissions for all logistics personnel across the global supply chain.
                    </p>
                </div>
                <button className="flex items-center gap-2 bg-gradient-to-r from-[#994700] to-[#FF7A00] text-white px-6 py-2.5 rounded-lg font-bold text-sm tracking-tight shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all shrink-0">
                    <span className="material-symbols-outlined text-sm">person_add</span>
                    Add Member
                </button>
            </div>

            {/* Stats Bento */}
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 md:col-span-4 bg-white dark:bg-[#111111] p-6 rounded-xl border border-slate-200 dark:border-[#333] shadow-sm">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Total Personnel</p>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-black text-on-surface">128</span>
                        <span className="text-xs font-bold text-blue-500 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-sm">trending_up</span>
                            +4 this month
                        </span>
                    </div>
                </div>
                <div className="col-span-12 md:col-span-4 bg-white dark:bg-[#111111] p-6 rounded-xl border border-slate-200 dark:border-[#333] shadow-sm">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Active Drivers</p>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-black text-on-surface">84</span>
                        <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden self-center">
                            <div className="w-3/4 h-full bg-primary rounded-full"></div>
                        </div>
                    </div>
                </div>
                <div className="col-span-12 md:col-span-4 bg-white dark:bg-[#111111] p-6 rounded-xl border border-slate-200 dark:border-[#333] shadow-sm">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">System Roles</p>
                    <div className="flex gap-1.5 mt-2">
                        {['LA', 'DR', 'PA'].map((label) => (
                            <span key={label} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#1A1A1A] border-2 border-white dark:border-[#111] flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-white">
                                {label}
                            </span>
                        ))}
                        <span className="w-8 h-8 rounded-full bg-primary text-white border-2 border-white dark:border-[#111] flex items-center justify-center text-[10px] font-bold">
                            +5
                        </span>
                    </div>
                </div>
            </div>

            {/* Members Table */}
            <div className="bg-white dark:bg-[#111111] rounded-2xl overflow-hidden border border-slate-200 dark:border-[#333] shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[640px]">
                        <thead className="bg-slate-50 dark:bg-[#0a0a0a] border-b border-slate-200 dark:border-[#333]">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Name</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Role</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Last Login</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#222]">
                            {members.map((member) => (
                                <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center overflow-hidden shrink-0 font-bold text-xs">
                                                {/* Fallback kalau image error, pakai inisial */}
                                                {member.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-on-surface">{member.name}</p>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400">{member.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{member.role}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {member.status === 'Active' ? (
                                            <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase rounded-full">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[10px] font-bold uppercase rounded-full">
                                                Inactive
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                                        {member.lastLogin}
                                    </td>
                                    <td className="px-6 py-4 text-right relative">
                                        <button
                                            onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                                            className="text-slate-400 hover:text-primary transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
                                        >
                                            <span className="material-symbols-outlined text-sm">more_horiz</span>
                                        </button>
                                        {openMenuId === member.id && (
                                            <div className="absolute right-8 top-full mt-1 bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#333] rounded-xl shadow-xl z-20 w-40 overflow-hidden text-left">
                                                <button className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                    <span className="material-symbols-outlined text-sm">edit</span> Edit
                                                </button>
                                                <div className="border-t border-slate-100 dark:border-[#333]"></div>
                                                <button className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                                                    <span className="material-symbols-outlined text-sm">delete</span> Remove
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}