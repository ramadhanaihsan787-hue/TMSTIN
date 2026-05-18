// src/features/settings/components/TeamRolesSettings.tsx
import { useState } from 'react';

// Data Dummy Temen Lu (Nanti kita ganti narik dari API kalau udah siap)
interface Member {
    id: number;
    name: string;
    email: string;
    role: string;
    status: 'Active' | 'Inactive';
    lastLogin: string;
    avatar: string;
}

const members: Member[] = [
    { id: 1, name: 'Alex Thompson', email: 'alex.t@japfalogix.com', role: 'Logistics Admin', status: 'Active', lastLogin: '2 mins ago', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDzBK1dj32GiR9dVI74_Jt3_gZ25myA61Mdr9ICIpMe_so3EJlxwSj1wg1SDZjJGl3oERSn2udSprfTxz7qEiu5Cs9ty1DnK138Cwl4OoeL9NJdhH882Lqs6CN9VR1_xlmYZ763QpPLFHJ6b9aeErS5BQR_E5XC70pwYIURGoCt36IWWPVDvQyFfHHUArfAd16E_-1nIqfGK63VGY35_DCF8KD9E-rP-BRi4Wbe1Ef--igNpLHxhB5tpNhrxi6xukI4OgMhYsTtQp8' },
    { id: 2, name: 'Sarah Jenkins', email: 's.jenkins@japfalogix.com', role: 'POD Admin', status: 'Active', lastLogin: 'Yesterday, 4:20 PM', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAUflcqMWXvJHd7uV7aHWjzjSEaW-Vo9xLTtZWmL6G4GSXcdXDPzZF3_eQ-xS0o8jOk2OKY9idN7UkU7f8OR2RyIKV9t0LgV3LMb9YwuKcvGp5QGTA3VxGW9pb6zAqpc_yIdnDKzs1mteLPLVrfG60GUlSrAYIDyebGGpEdxinDuAxnlmvw5vL-OGbwDJEoFdX40JXwE2Eu4aPdRnoDn2KqnVEDR73IuRvBDSlWLPdsGv2jQ0PHnistNsVYBQgbGS6mnas0kxZlCU8' },
    { id: 3, name: 'Marcus Vane', email: 'm.vane@japfalogix.com', role: 'Driver (Tier 1)', status: 'Inactive', lastLogin: '3 days ago', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMwAHSiqJbN0qfk_cUudQboUcoEoCS--lH4nwHF99BF8FSDB2CWvtt6kFyqyss3jzpUfeLImsB8sGbI1YLpYN3vQE58Xwr13dqbvtfzJLzpRn_CNHgvsE90pIp-atvTjfT8EtdhQ2TamakwX26nWsTMGG0Dwt6IZeeNfGqRvzDTrJv2kD5957FAHZEBpijfOz7K76xn6OeSQ9131xjJqWmx4mMnq_bz-BqXaRT83JdyijiTghHdzZlUyFME' },
    { id: 4, name: 'David Chen', email: 'd.chen@japfalogix.com', role: 'Dispatcher', status: 'Active', lastLogin: '1 hour ago', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtOelL6SnN4mx0F3pELrOqyhCIUl8BIPEt1cKnSpyr_CMo3Wp6XMu2CVD5j29k-SHjuE6S-ppL-BDHIy1gMxMYkj98-LZGpTlkYLl611HmNJPIElDXJ5SUdrzfJLUDfpgnBwyfUQOvKW_ntYxpUspQEWbY43qk2n9QYgXe24cqE3YfG6B7T9Tjw6FvxXCyOj9W8YdNB7jA8hBM9SGgX3Hvu_l88UHpAOXMcaElqV4ixY9JiMqLbm0-0t9h75bdjZTqzd3dBR9IB_E' },
];

export default function TeamRolesSettings() {
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    return (
        <div className="animate-fadeIn space-y-8 pb-10">
            {/* Stats Bento */}
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 md:col-span-6 bg-white dark:bg-[#111111] p-6 rounded-xl border border-slate-200 dark:border-[#333] shadow-sm">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Active Drivers</p>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-black text-on-surface">84</span>
                        <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden self-center">
                            <div className="w-3/4 h-full bg-primary rounded-full"></div>
                        </div>
                    </div>
                </div>
                <div className="col-span-12 md:col-span-6 bg-white dark:bg-[#111111] p-6 rounded-xl border border-slate-200 dark:border-[#333] shadow-sm">
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