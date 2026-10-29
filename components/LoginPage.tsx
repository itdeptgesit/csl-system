'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { AlertCircle, CheckCircle2, Loader2, Mail, Lock, Eye, EyeOff, User, UserPlus, LogIn, Shield, Globe, MailCheck, ArrowRight, RefreshCw, Sun, Moon } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { sendPasswordResetNotificationEmail } from '../utils/EmailSystemUtils';
import { isAllowedEmailDomain, ALLOWED_EMAIL_DOMAINS } from '../constants';

interface LoginPageProps {
    onLogin: (email: string) => void;
    appName?: string;
    logoUrl?: string;
    primaryColor?: string;
    userGroups?: string[];
}

const ALLOWED_DOMAINS = ALLOWED_EMAIL_DOMAINS;
const isAllowedDomain = isAllowedEmailDomain;

type Mode = 'login' | 'register' | 'reset' | 'email-sent';

export const LoginPage: React.FC<LoginPageProps> = ({
    onLogin,
    appName = 'CSL System',
    logoUrl = '/image/logo.png',
}) => {
    const { theme, resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [mode, setMode] = useState<Mode>('login');
    const [registeredEmail, setRegisteredEmail] = useState('');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

    const toggleTheme = (e: React.MouseEvent) => {
        const nextTheme = isDark ? 'light' : 'dark';
        if (!document.startViewTransition) {
            setTheme(nextTheme);
            return;
        }
        document.documentElement.style.setProperty('--click-x', `${e.clientX}px`);
        document.documentElement.style.setProperty('--click-y', `${e.clientY}px`);
        document.startViewTransition(() => {
            setTheme(nextTheme);
        });
    };

    const switchMode = (m: Mode) => { setMode(m); setError(''); setSuccessMsg(''); };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true); setError('');
        try {
            let finalEmail = identifier.trim();
            if (!finalEmail.includes('@')) {
                // Use RPC function (SECURITY DEFINER) to bypass RLS for unauthenticated username lookup
                const { data: emailResult, error: rpcError } = await supabase
                    .rpc('get_email_by_username', { input_username: finalEmail.toLowerCase() });
                if (rpcError) throw new Error('Gagal mencari akun.');
                if (!emailResult) throw new Error('Username tidak ditemukan. Coba masukkan email Anda.');
                finalEmail = emailResult;
            }
            const { data, error: authErr } = await supabase.auth.signInWithPassword({ email: finalEmail, password });
            if (authErr) throw authErr;
            if (data.session?.user?.email) onLogin(data.session.user.email);
        } catch (err: any) { setError(err.message || 'Login gagal. Periksa email dan password Anda.'); }
        finally { setIsLoading(false); }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setSuccessMsg('');
        const email = identifier.trim().toLowerCase();
        if (!isAllowedDomain(email)) {
            setError(`Pendaftaran hanya untuk domain: ${ALLOWED_DOMAINS.map(d => '@' + d).join(' & ')}`);
            return;
        }
        if (!fullName.trim()) { setError('Nama lengkap wajib diisi.'); return; }
        if (password.length < 8) { setError('Password minimal 8 karakter.'); return; }
        if (password !== confirmPassword) { setError('Password tidak cocok.'); return; }
        setIsLoading(true);
        try {
            const { error: signUpErr } = await supabase.auth.signUp({
                email, password,
                options: { data: { full_name: fullName.trim() } }
            });
            if (signUpErr) throw signUpErr;
            setRegisteredEmail(email);
            setMode('email-sent');
            setPassword(''); setFullName(''); setConfirmPassword('');
        } catch (err: any) { setError(err.message || 'Pendaftaran gagal.'); }
        finally { setIsLoading(false); }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true); setError('');
        try {
            const { error: resetErr } = await supabase.auth.resetPasswordForEmail(identifier, { redirectTo: window.location.origin + '/login' });
            if (resetErr) throw resetErr;
            await sendPasswordResetNotificationEmail(identifier);
            setSuccessMsg('Link reset dikirim! Cek inbox Anda.');
            switchMode('login');
        } catch (err: any) { setError(err.message || 'Gagal mengirim link reset.'); }
        finally { setIsLoading(false); }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true); setError('');
        try {
            const { error: oauthErr } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin + '/login', queryParams: { prompt: 'select_account' } }
            });
            if (oauthErr) throw oauthErr;
        } catch (err: any) { setError(err.message || 'Google login gagal.'); setIsLoading(false); }
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-7 lg:p-10 font-sans selection:bg-blue-100 selection:text-blue-900 bg-[#f8fafc] dark:bg-[#09090b] transition-colors duration-300"
            style={{
                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
            }}
        >
            {/* ══════════ FLOATING THEME TOGGLE ══════════ */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
                <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label="Ubah mode tampilan"
                    className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-slate-200/80 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 text-slate-700 dark:text-zinc-200 backdrop-blur-md shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all text-xs font-semibold cursor-pointer"
                >
                    {isDark ? (
                        <>
                            <Sun size={15} className="text-amber-400" />
                            <span className="hidden sm:inline">Mode Terang</span>
                        </>
                    ) : (
                        <>
                            <Moon size={15} className="text-slate-600 dark:text-zinc-300" />
                            <span className="hidden sm:inline">Mode Gelap</span>
                        </>
                    )}
                </button>
            </div>

            {/* ══════════ MAIN FLOATING CARD ══════════ */}
            <main className="w-full max-w-[1160px] min-h-[720px] grid grid-cols-1 lg:grid-cols-12 p-3 sm:p-3.5 rounded-[32px] bg-white/95 dark:bg-[#121214] backdrop-blur-xl shadow-[0_24px_70px_rgba(16,24,40,0.14),0_4px_18px_rgba(16,24,40,0.08)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.8)] border border-white/80 dark:border-zinc-800 overflow-hidden">
                
                {/* ══════════ LEFT BRAND PANEL (7 cols) ══════════ */}
                <section className="lg:col-span-7 relative overflow-hidden rounded-[24px] p-8 sm:p-11 xl:p-12 text-white flex flex-col justify-between"
                    style={{ background: 'linear-gradient(155deg, #0a2540 0%, #123f7b 42%, #1450b4 72%, #2f6bff 100%)' }}>
                    
                    {/* Background Circles & Hexagon Pattern */}
                    <div className="absolute -right-44 -bottom-48 w-[440px] h-[440px] rounded-full bg-white/10 pointer-events-none" />
                    <div className="absolute -left-32 top-64 w-[280px] h-[280px] rounded-full border border-white/10 pointer-events-none" />
                    <svg className="absolute -right-7 top-28 w-80 h-80 text-white/[0.08] pointer-events-none" viewBox="0 0 200 200" fill="none" aria-hidden="true">
                        <g stroke="currentColor" strokeWidth="1.4">
                            <path d="M38 22 58 34v24L38 70 18 58V34Z"/><path d="M92 10 112 22v24L92 58 72 46V22Z"/><path d="M146 28 166 40v24l-20 12-20-12V40Z"/>
                            <path d="M64 72 84 84v24L64 120 44 108V84Z"/><path d="M118 62l20 12v24l-20 12-20-12V74Z"/><path d="M170 88l20 12v24l-20 12-20-12v-24Z"/>
                            <path d="M34 126l20 12v24l-20 12-20-12v-24Z"/><path d="M90 126l20 12v24l-20 12-20-12v-24Z"/><path d="M142 142l20 12v24l-20 12-20-12v-24Z"/>
                        </g>
                    </svg>

                    {/* Top: Brand Mark */}
                    <div className="relative z-10 flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                            <img src={logoUrl} alt="CSL Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <div className="text-xl font-extrabold tracking-[0.14em] leading-none text-white">CSL</div>
                            <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-white/75 mt-1.5">
                                Corporate Secretary Legal
                            </div>
                        </div>
                    </div>

                    {/* Middle: Hero Title & Clean Illustration */}
                    <div className="relative z-10 my-auto py-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/90 mb-5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.25)] animate-pulse" />
                            Sistem Internal
                        </div>

                        <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold text-white leading-[1.12] tracking-tight max-w-lg mb-4">
                            Urusan perusahaan &amp; legal,{' '}
                            <span className="text-blue-200">dalam satu akses.</span>
                        </h1>

                        <p className="text-xs sm:text-sm text-white/80 leading-relaxed max-w-md mb-6">
                            Ruang kerja digital terintegrasi untuk tim Corporate Secretary &amp; Legal: tracking tiket, arsip dokumen, kepatuhan, dan transparansi persetujuan.
                        </p>

                        {/* Visual Mock Illustration */}
                        <div className="relative w-full max-w-md mx-auto hidden sm:block pt-2">
                            <svg className="w-full h-auto drop-shadow-xl" viewBox="0 0 520 280" fill="none" aria-hidden="true">
                                <ellipse cx="260" cy="260" rx="180" ry="14" fill="rgba(4,20,42,0.22)"/>
                                <g opacity="0.45" fill="#BFD4FF">
                                    <rect x="52" y="66" width="52" height="178" rx="7"/>
                                    <rect x="116" y="38" width="62" height="206" rx="7"/>
                                    <rect x="356" y="54" width="54" height="190" rx="7"/>
                                    <rect x="420" y="86" width="44" height="158" rx="7"/>
                                </g>
                                <g transform="rotate(-3 260 150)">
                                    <rect x="142" y="42" width="238" height="216" rx="18" fill="rgba(8,34,68,0.25)"/>
                                    <rect x="132" y="32" width="238" height="216" rx="18" fill="#ffffff"/>
                                    <circle cx="153" cy="53" r="4" fill="#F97066"/>
                                    <circle cx="168" cy="53" r="4" fill="#FDB022"/>
                                    <circle cx="183" cy="53" r="4" fill="#32D583"/>
                                    <rect x="158" y="78" width="88" height="9" rx="4.5" fill="#101828"/>
                                    <rect x="158" y="100" width="176" height="7" rx="3.5" fill="#E2E8F0"/>
                                    <rect x="158" y="117" width="154" height="7" rx="3.5" fill="#E2E8F0"/>
                                    <rect x="158" y="134" width="168" height="7" rx="3.5" fill="#E2E8F0"/>
                                    <rect x="158" y="160" width="116" height="7" rx="3.5" fill="#E2E8F0"/>
                                    <path d="M158 200c20-13 31 8 48-3 13-8 24-2 36 1" stroke="#2F6BFF" strokeWidth="3" strokeLinecap="round"/>
                                    <circle cx="324" cy="188" r="24" fill="#FFF7DB" stroke="#C9A227" strokeWidth="2"/>
                                    <path d="M316 188l6 6 10-11" stroke="#B54708" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </g>
                            </svg>
                        </div>
                    </div>

                    {/* Bottom: Institutional Attribution */}
                    <div className="relative z-10 flex items-center justify-between pt-5 border-t border-white/15 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/70">
                        <span><strong className="text-white font-black">The Gesit</strong> Companies</span>
                        <span>Internal Use Only</span>
                    </div>
                </section>

                {/* ══════════ RIGHT FORM PANEL (5 cols) ══════════ */}
                <section className="lg:col-span-5 flex flex-col justify-center px-6 sm:px-10 lg:px-12 py-8 bg-white dark:bg-[#111827] transition-colors">
                    <div className="w-full max-w-sm mx-auto">
                        
                        {/* Access Pill Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 text-[10px] font-extrabold uppercase tracking-[0.12em] mb-4">
                            <Lock size={12} className="shrink-0" />
                            <span>Akses Internal</span>
                        </div>

                        {/* Title Header */}
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                            {mode === 'login' ? 'Selamat datang' : mode === 'register' ? 'Buat Akun CSL' : 'Lupa Kata Sandi'}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                            {mode === 'login'
                                ? 'Masuk dengan akun kantor untuk membuka sistem CSL.'
                                : mode === 'register'
                                    ? `Pendaftaran terbatas untuk domain: ${ALLOWED_DOMAINS.map(d => '@' + d).join(', ')}.`
                                    : 'Masukkan email akun Anda untuk mendapatkan tautan verifikasi.'}
                        </p>

                        {/* Alerts Banner */}
                        {error && (
                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs mt-4">
                                <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                                <span className="font-medium">{error}</span>
                            </div>
                        )}
                        {successMsg && (
                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs mt-4">
                                <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                                <span className="font-medium">{successMsg}</span>
                            </div>
                        )}

                        {/* Login Form */}
                        <form onSubmit={mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleReset} className="space-y-4 mt-6">
                            
                            {mode === 'register' && (
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">Nama Lengkap</label>
                                    <div className="relative">
                                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            required
                                            value={fullName}
                                            onChange={e => setFullName(e.target.value)}
                                            placeholder="Nama lengkap"
                                            className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {mode === 'login' ? 'Email Kantor atau Username' : 'Email Kantor'}
                                </label>
                                <div className="relative">
                                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type={mode === 'register' ? 'email' : 'text'}
                                        required
                                        value={identifier}
                                        onChange={e => setIdentifier(e.target.value)}
                                        placeholder="nama@gesit.co.id"
                                        className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            {mode !== 'reset' && (
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">Kata Sandi</label>
                                    <div className="relative">
                                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="Masukkan kata sandi"
                                            className="w-full h-12 pl-12 pr-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-1"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {mode === 'register' && (
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">Ulangi Kata Sandi</label>
                                    <div className="relative">
                                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            placeholder="Ulangi kata sandi"
                                            className="w-full h-12 pl-12 pr-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                        />
                                    </div>
                                </div>
                            )}

                            {mode === 'login' && (
                                <div className="flex items-center justify-between pt-0.5">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={e => setRememberMe(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 bg-transparent"
                                        />
                                        <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Ingat saya</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => switchMode('reset')}
                                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline"
                                    >
                                        Lupa kata sandi?
                                    </button>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 rounded-xl bg-blue-600 text-white font-extrabold text-sm hover:bg-blue-700 active:bg-blue-800 transition-all shadow-[0_12px_24px_rgba(47,107,255,0.22)] hover:shadow-[0_16px_30px_rgba(47,107,255,0.28)] flex items-center justify-center gap-2 disabled:opacity-50 mt-3 cursor-pointer"
                            >
                                {isLoading ? (
                                    <Loader2 size={18} className="animate-spin text-white" />
                                ) : mode === 'login' ? (
                                    <>
                                        <span>Login</span>
                                        <ArrowRight size={16} />
                                    </>
                                ) : mode === 'register' ? (
                                    'Daftar Akun Baru'
                                ) : (
                                    'Kirim Link Verifikasi'
                                )}
                            </button>
                        </form>

                        {/* Google Workspace OAuth Button (Login only) */}
                        {mode === 'login' && (
                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={handleGoogleLogin}
                                    disabled={isLoading}
                                    className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm cursor-pointer"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.18l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    <span>Login via Google</span>
                                </button>
                            </div>
                        )}

                        {/* Security Notice Box */}
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mt-5">
                            <Shield size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <span>Halaman ini hanya untuk pengguna internal yang terdaftar. Jaga kerahasiaan akun dan kata sandi Anda.</span>
                        </div>

                        {/* Mode Switchers */}
                        <div className="mt-5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {mode !== 'login' ? (
                                <p>Sudah punya akun? <button onClick={() => switchMode('login')} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Masuk</button></p>
                            ) : (
                                <p>Belum memiliki akses? <button onClick={() => switchMode('register')} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Daftar Akun</button></p>
                            )}
                        </div>

                    </div>
                </section>
            </main>

            {/* ══════════ PAGE FOOTER ══════════ */}
            <footer className="mt-6 flex items-center gap-2.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>CSL &mdash; Corporate Secretary Legal</span>
                <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600" />
                <span>&copy; 2026 The Gesit Companies</span>
            </footer>
        </div>
    );
};
