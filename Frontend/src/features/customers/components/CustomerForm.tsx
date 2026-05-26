// src/features/customers/components/CustomerForm.tsx
import React from 'react';
import type { CustomerFormData } from '../types';
import CustomerMapPreview from './CustomerMapPreview';

interface CustomerFormProps {
    isEdit: boolean;
    isSaving: boolean;
    formData: CustomerFormData;
    setFormData: (data: CustomerFormData) => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
}

export default function CustomerForm({ isEdit, isSaving, formData, setFormData, onSubmit, onCancel }: CustomerFormProps) {
    return (
        <div className="p-4 md:p-10 max-w-5xl mx-auto w-full relative">
            <div className="mb-10">
                <h1 className="text-3xl font-bold">{isEdit ? 'Edit Customer Profile' : 'Create New Customer Profile'}</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                    {isEdit ? 'Update the logistic node details in the JAPFA industrial network.' : 'Initialize a new logistic node in the JAPFA industrial network.'}
                </p>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#FF7A00]"></div>
                <form className="p-8 space-y-12" onSubmit={onSubmit}>
                    {/* Section: General Identity */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Entity Identity</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Basic identification for the industrial catalog.</p>
                        </div>
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Customer Code</label>
                                <input required value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} className="w-full bg-slate-50 dark:bg-[#222] border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-orange-500/20 text-sm py-3 px-4 font-medium transition-all dark:text-white outline-none" placeholder="JAP-XXXX" type="text" disabled={isEdit} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Store Name</label>
                                <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 dark:bg-[#222] border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-orange-500/20 text-sm py-3 px-4 font-medium transition-all dark:text-white outline-none" placeholder="Official Commercial Name" type="text" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Status</label>
                                <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-50 dark:bg-[#222] border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-orange-500/20 text-sm py-3 px-4 font-medium transition-all dark:text-white outline-none">
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Admin Name</label>
                                <input value={formData.admin} onChange={(e) => setFormData({...formData, admin: e.target.value})} className="w-full bg-slate-50 dark:bg-[#222] border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-orange-500/20 text-sm py-3 px-4 font-medium transition-all dark:text-white outline-none" placeholder="Primary Contact Person" type="text" />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-200 dark:bg-slate-800"></div>

                    {/* Section: Geographic Positioning */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Geospatial Data</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Precise location for kinetic route optimization.</p>
                        </div>
                        <div className="md:col-span-2 space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Full Address</label>
                                <textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 dark:bg-[#222] border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-orange-500/20 text-sm py-3 px-4 font-medium transition-all dark:text-white outline-none resize-none" placeholder="Street, Building, Landmark..." rows={3}></textarea>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">District / RT / RW</label>
                                    <input value={formData.district} onChange={(e) => setFormData({...formData, district: e.target.value})} className="w-full bg-slate-50 dark:bg-[#222] border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-orange-500/20 text-sm py-3 px-4 font-medium transition-all dark:text-white outline-none" placeholder="e.g. Kebayoran, 004/012" type="text" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">City / Regency</label>
                                    <input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full bg-slate-50 dark:bg-[#222] border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-orange-500/20 text-sm py-3 px-4 font-medium transition-all dark:text-white outline-none" placeholder="Central Jakarta" type="text" />
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 dark:bg-[#222] border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-orange-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Coordinates Mapping</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Latitude</label>
                                        <input required value={formData.lat} onChange={(e) => setFormData({...formData, lat: e.target.value})} className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-orange-500/20 text-sm py-3 px-4 font-medium transition-all dark:text-white outline-none" placeholder="-6.1754" type="text" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Longitude</label>
                                        <input required value={formData.lon} onChange={(e) => setFormData({...formData, lon: e.target.value})} className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-orange-500/20 text-sm py-3 px-4 font-medium transition-all dark:text-white outline-none" placeholder="106.8272" type="text" />
                                    </div>
                                </div>
                                <CustomerMapPreview
                                    lat={formData.lat}
                                    lon={formData.lon}
                                    onCoordinateChange={(newLat, newLon) =>
                                        setFormData({ ...formData, lat: newLat, lon: newLon })
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200 dark:border-slate-800 mt-8">
                        <button type="button" onClick={onCancel} className="px-8 py-4 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors tracking-tight">
                            Cancel
                        </button>
                        <button disabled={isSaving} className="px-10 py-4 bg-[#FF7A00] hover:opacity-90 text-white rounded-xl font-bold tracking-tight shadow-lg shadow-orange-500/20 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" type="submit">
                            {isSaving && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                            {isEdit ? 'Update Customer' : 'Save Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}