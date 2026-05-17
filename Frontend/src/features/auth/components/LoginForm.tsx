import { Link } from 'react-router-dom';
import { useLogin } from '../hooks/useLogin';

export default function LoginForm() {
    const { email, setEmail, password, setPassword, errorMessage, isLoading, handleSignIn } = useLogin();

    return (
        <div className="flex flex-col justify-center flex-1 px-8 md:px-16 lg:px-12 xl:px-20 py-12">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
                <div className="bg-white p-2 rounded-lg w-30 h-16 flex items-center justify-center shrink-0 shadow-sm border border-slate-100 dark:border-white/10">
                    <img src="/japfa-logo.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-2xl tracking-tight font-sans whitespace-nowrap">
                    <span className="text-primary">TMS</span>
                </span>
            </div>

            {/* Header */}
            <div className="mb-10">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Welcome Back</h2>
                <p className="text-slate-500 dark:text-slate-400">Please enter your credentials to access the dashboard.</p>
            </div>

            {/* ERROR MESSAGE */}
            {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-sm font-bold rounded-r-lg">
                    {errorMessage}
                </div>
            )}

            {/* Form */}
            <form className="space-y-6" onSubmit={handleSignIn}>
                {/* Username Field */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Username or Email</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[20px]">person</span>
                        </div>
                        <input
                            className="block w-full pl-11 pr-4 h-14 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#333] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
                            placeholder="manager / admin_distribusi"
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                </div>

                {/* Password Field */}
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[20px]">lock</span>
                        </div>
                        <input
                            className="block w-full pl-11 pr-12 h-14 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#333] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
                            placeholder="••••••••"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex justify-end mt-1">
                        <Link className="text-sm font-medium text-primary hover:underline" to="/forgot-password">Forgot Password?</Link>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    type="submit"
                    disabled={isLoading}
                >
                    <span>{isLoading ? 'Memeriksa...' : 'Sign In'}</span>
                    {!isLoading && <span className="material-symbols-outlined text-[20px]">login</span>}
                </button>
            </form>

            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-[#333] text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Are you a driver?
                    <span className="ml-2 py-1 px-2 bg-slate-100 dark:bg-white/5 rounded text-[11px] font-bold text-slate-600 dark:text-slate-300 inline-block">
                        Use your Driver credentials in the form above.
                    </span>
                </p>
            </div>
        </div>
    );
}