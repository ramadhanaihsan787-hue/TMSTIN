import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { authService } from "../services/authService";

export const useLogin = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    
    // email di sini fungsinya sebagai 'username'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');
        setIsLoading(true);

        try {
            // 🌟 1. Tembak API Login kita!
            const data = await authService.login({ username: email, password });
            
            // ==========================================
            // 🌟 FIX CTO: SIMPAN KEDUA TOKEN KE LOCAL STORAGE
            // ==========================================
            localStorage.setItem('token', data.access_token);
            if (data.refresh_token) {
                localStorage.setItem('refresh_token', data.refresh_token);
            }
            // ==========================================
            
            // 🌟 2. Simpen token ke Context (otomatis decode role di dalemnya)
            login(data.access_token); 

            // 🌟 3. REDIRECT BERDASARKAN ROLE ASLI DARI DATABASE! (Bukan ketikan user)
            if (data.role === 'admin_pod') {
                navigate('/pod');
            } else if (data.role === 'manager_logistik') {
                navigate('/manager');
            } else if (data.role === 'driver') {
                navigate('/driver');
            } else if (data.role === 'admin_distribusi') {
                navigate('/logistik');
            } else if (data.role === 'kasir') { 
                navigate('/finance');
            } else {
                navigate('/'); // Kalau rolenya aneh, balikin ke root
            }

        } catch (error: any) {
            console.error("Login Error caught:", error);
            
            // 🌟 4. TANGKEP PESAN ERROR ASLI DARI FASTAPI
            // Kalo FastAPI ngirim detail error, kita tampilin itu. Kalo ngga, pake pesan default.
            const serverErrorMsg = error.response?.data?.detail;
            setErrorMessage(serverErrorMsg || 'Login gagal! Server tidak merespon atau kredensial salah.');
        } finally {
            setIsLoading(false); 
        }
    };

    return {
        email, setEmail,
        password, setPassword,
        errorMessage,
        isLoading,
        handleSignIn
    };
};