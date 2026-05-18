import { useState, useEffect } from 'react';
import { podService, type PodRecord } from '../services/podService';

export const usePod = () => {
    // 🌟 UBAH: order_id dari backend itu String (misal "DO-123"), bukan Number!
    const [openActionId, setOpenActionId] = useState<string | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // 🌟 STATE BARU BUAT NYIMPEN DATA DARI DATABASE
    const [orders, setOrders] = useState<PodRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fungsi utama buat narik data
    const fetchOrders = async (statusFilter?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await podService.getPodVerifications();
            setOrders(response.data); // 🌟 Masukin data asli ke dalam state React!
        } catch (err: any) {
            console.error("Gagal menarik data DO:", err);
            setError('Gagal terhubung ke server. Silakan coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

    // Otomatis sedot data pas halaman pertama kali dibuka
    useEffect(() => {
        fetchOrders(); 
        
        // Catatan CTO: Kalo lu cuma mau nampilin yang udah diverifikasi, 
        // lu bisa ganti jadi: fetchOrders('do_verified');
    }, []);

    return {
        // UI States
        openActionId, setOpenActionId,
        isFilterOpen, setIsFilterOpen,
        
        // Data States
        orders, 
        isLoading, 
        error, 
        
        // Actions
        fetchOrders 
    };
};