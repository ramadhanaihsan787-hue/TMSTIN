import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode'; // Alat buat ngebelah token

export type Role = 'admin_distribusi' | 'manager_logistik' | 'admin_pod' | 'driver' | 'kasir' | null;

interface UserData {
  username: string;
  role: Role;
}

export interface AuthContextType {
  role: Role;
  user: UserData | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // 🌟 JANGAN DI-BYPASS LAGI! Default-nya harus null (Belum Login)
  const [role, setRole] = useState<Role>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Restore session via API refresh (mengirim refresh_token dari localStorage ke body)
  useEffect(() => {
    const tryRestoreSession = async () => {
      try {
        // 🌟 FIX CTO 1: Ambil token dari localStorage yang disimpen pas Login
        const storedRefreshToken = localStorage.getItem('refresh_token');
        
        // 🌟 GEMBOK CTO: Kalau nggak ada token, berhenti di sini! (Selamat tinggal error 422)
        if (!storedRefreshToken) {
            return; 
        }

        const base = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${base}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // 🌟 FIX CTO 2: Kirim tokennya ke backend lewat body!
          body: JSON.stringify({ refresh_token: storedRefreshToken }),
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.access_token) {
            const decoded: any = jwtDecode(data.access_token);
            setToken(data.access_token);
            setRole(decoded.role);
            setUser({ username: decoded.sub, role: decoded.role });
            
            // Simpan refresh_token baru kalau dikasih ulang sama backend
            if (data.refresh_token) {
                localStorage.setItem('refresh_token', data.refresh_token);
            }
          }
        } else {
            // Kalau refresh token udah expired/ditolak backend, bersihkan penyimpanan
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('token');
        }
      } catch (error) {
        console.error("Gagal restore session:", error);
      }
    };
    tryRestoreSession();
  }, []);

  const login = (newToken: string) => {
    try {
      const decodedToken: any = jwtDecode(newToken);
      
      // Access token hanya di memory React
      setToken(newToken);
      setRole(decodedToken.role);
      setUser({ username: decodedToken.sub, role: decodedToken.role });
    } catch (error) {
      console.error("Gagal membaca token JWT:", error);
    }
  };

  const logout = () => {
    // Hapus semua jejak dari localStorage
    try { 
        localStorage.removeItem('token'); 
        localStorage.removeItem('auth_token'); 
        localStorage.removeItem('refresh_token'); // 🌟 FIX CTO 3: Bersihin token refresh!
    } catch {}

    // Redirect ke login (reset semua React state otomatis)
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ role, user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};