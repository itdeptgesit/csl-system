'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Mail, Lock, Eye, EyeOff, User, UserPlus, LogIn, Shield, Globe } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { sendPasswordResetNotificationEmail } from '../utils/EmailSystemUtils';

interface LoginPageProps {
    onLogin: (email: string) => void;
    appName?: string;
    logoUrl?: string;
    primaryColor?: string;
    userGroups?: string[];
}

const ALLOWED_DOMAINS = ['gesit.co.id', 'gnr.co.id'];

function isAllowedDomain(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    return ALLOWED_DOMAINS.includes(domain);
}

type Mode = 'login' | 'register' | 'reset';

export const LoginPage: React.FC<LoginPageProps> = ({
    onLogin,
    appName = 'CSL System',
    logoUrl = '/image/logo.png',
}) => {
    const [mode, setMode] = useState<Mode>('login');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

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
            setSuccessMsg('Pendaftaran berhasil! Cek email Anda untuk konfirmasi.');
            switchMode('login');
            setIdentifier(email);
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

    // ─── Gold accent colour used throughout ────────────────────────────
    const GOLD = '#C9A84C';

    return (
        <div className="min-h-screen w-full flex font-sans overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* ══════════ LEFT PANEL ══════════ */}
            <div className="hidden lg:flex w-[48%] relative flex-col justify-between overflow-hidden"
                style={{ background: 'linear-gradient(160deg, #0B1A35 0%, #0D2145 50%, #0a1830 100%)' }}>

                {/* Background building image */}
                <img
                    src="/image/bg.jpeg"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-luminosity"
                />

                {/* Gold top accent */}
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

                {/* Content */}
                <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
                    {/* Logo + Brand */}
                    <div className="flex items-center gap-4 mb-auto">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-4">
                                <img src={logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
                                <div className="w-px h-10" style={{ background: GOLD }} />
                                <div className="flex flex-col text-[10px] font-bold tracking-widest uppercase leading-tight" style={{ color: `${GOLD}CC` }}>
                                    <span>Corporate</span>
                                    <span>Secretary</span>
                                    <span>Legal</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main hero copy */}
                    <div className="mt-auto mb-16">
                        <h1 className="text-5xl xl:text-6xl font-black text-white leading-tight tracking-tight mb-6">
                            Integrity.<br />
                            Compliance.<br />
                            <span style={{ color: GOLD }}>Legal Excellence.</span>
                        </h1>
                        {/* Gold underline */}
                        <div className="w-12 h-[3px] rounded-full mb-6" style={{ background: GOLD }} />
                        <p className="text-sm text-white/60 leading-relaxed max-w-sm">
                            CSL System terintegrasi untuk mendukung tata kelola perusahaan yang baik, manajemen dokumen hukum, dan kepatuhan secara berkelanjutan.
                        </p>
                    </div>

                    {/* Feature pills */}
                    <div className="grid grid-cols-3 gap-4 mb-10">
                        {[
                            { icon: '⚖️', title: 'Governance & Compliance', desc: 'Kelola kepatuhan dan kebijakan perusahaan' },
                            { icon: '📄', title: 'Legal Document Management', desc: 'Kelola dokumen hukum secara terstruktur' },
                            { icon: '🏢', title: 'Corporate Action & Disclosure', desc: 'Kelola aksi korporasi dan keterbukaan informasi' },
                        ].map((f, i) => (
                            <div key={i} className="flex flex-col items-center text-center p-3 rounded-xl gap-2"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <span className="text-2xl">{f.icon}</span>
                                <p className="text-[11px] font-bold text-white leading-tight">{f.title}</p>
                                <p className="text-[9px] text-white/40 leading-tight">{f.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Bottom security badge */}
                    <div className="flex items-center gap-2.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        <Shield size={13} />
                        <span className="text-[11px] font-medium">Keamanan data terjamin dengan standar enterprise grade</span>
                    </div>
                </div>

                {/* Gold triangle accent top-right */}
                <div className="absolute top-0 right-0 w-0 h-0"
                    style={{
                        borderTop: `80px solid ${GOLD}`,
                        borderLeft: '80px solid transparent',
                    }} />
            </div>

            {/* ══════════ RIGHT PANEL ══════════ */}
            <div className="flex-1 flex flex-col bg-white relative overflow-y-auto">

                {/* Top bar */}
                <div className="flex justify-end items-center px-8 py-5">
                    <button className="flex items-center gap-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors">
                        <Globe size={14} />
                        Bahasa Indonesia
                        <span className="text-slate-400">▾</span>
                    </button>
                </div>

                {/* Form area */}
                <div className="flex-1 flex flex-col justify-center items-center px-8 py-6">
                    <div className="w-full max-w-[420px]">

                        {/* Mobile logo */}
                        <div className="lg:hidden flex items-center gap-3 mb-8">
                            <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
                            <span className="text-xl font-black text-slate-900">CSL System</span>
                        </div>

                        {/* Heading */}
                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: GOLD }}>
                            {mode === 'login' ? 'Selamat Datang' : mode === 'register' ? 'Buat Akun Baru' : 'Reset Password'}
                        </p>
                        <h2 className="text-3xl font-black text-slate-900 mb-1 tracking-tight">
                            {mode === 'login' ? 'Login ke CSL System' : mode === 'register' ? 'Daftar Akun' : 'Lupa Password?'}
                        </h2>
                        <p className="text-sm text-slate-400 mb-8">
                            {mode === 'login'
                                ? 'Silakan masuk menggunakan akun Anda untuk mengakses sistem.'
                                : mode === 'register'
                                    ? `Hanya email domain ${ALLOWED_DOMAINS.map(d => '@' + d).join(' & ')} yang diizinkan.`
                                    : 'Masukkan email Anda untuk menerima link reset password.'}
                        </p>

                        {/* Alerts */}
                        {error && (
                            <div className="flex items-start gap-2.5 mb-5 p-3.5 rounded-xl bg-red-50 border border-red-100">
                                <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                                <p className="text-xs font-semibold text-red-700">{error}</p>
                            </div>
                        )}
                        {successMsg && (
                            <div className="flex items-start gap-2.5 mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
                                <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                                <p className="text-xs font-semibold text-emerald-700">{successMsg}</p>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleReset}
                            className="space-y-4">

                            {mode === 'register' && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Lengkap</label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all"
                                            style={{ focusRingColor: GOLD } as any}
                                            onFocus={e => e.target.style.borderColor = GOLD}
                                            onBlur={e => e.target.style.borderColor = ''}
                                            placeholder="Nama lengkap Anda"
                                            value={fullName} onChange={e => setFullName(e.target.value)} required />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    {mode === 'login' ? 'Email atau Username' : 'Email Perusahaan'}
                                </label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none transition-all"
                                        onFocus={e => e.target.style.borderColor = GOLD}
                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                        style={{ borderColor: '#e2e8f0' }}
                                        placeholder={mode === 'register' ? 'nama@gesit.co.id' : 'Masukkan email atau username'}
                                        type={mode === 'register' ? 'email' : 'text'}
                                        value={identifier} onChange={e => setIdentifier(e.target.value)} required />
                                </div>
                            </div>

                            {mode !== 'reset' && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            className="w-full h-12 pl-10 pr-11 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none transition-all"
                                            onFocus={e => e.target.style.borderColor = GOLD}
                                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                            style={{ borderColor: '#e2e8f0' }}
                                            placeholder="Masukkan password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password} onChange={e => setPassword(e.target.value)} required />
                                        <button type="button"
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                                            onClick={() => setShowPassword(!showPassword)}>
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {mode === 'register' && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Konfirmasi Password</label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none transition-all"
                                            onFocus={e => e.target.style.borderColor = GOLD}
                                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                            style={{ borderColor: '#e2e8f0' }}
                                            placeholder="Ulangi password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                                    </div>
                                </div>
                            )}

                            {/* Remember + Forgot */}
                            {mode === 'login' && (
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <div className="relative">
                                            <input type="checkbox" className="sr-only" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                                            <div className="w-4 h-4 rounded flex items-center justify-center transition-all"
                                                style={{ background: rememberMe ? '#0B1A35' : 'white', border: rememberMe ? 'none' : '1.5px solid #cbd5e1' }}>
                                                {rememberMe && <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-white"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                            </div>
                                        </div>
                                        <span className="text-xs font-semibold text-slate-600">Ingat saya</span>
                                    </label>
                                    <button type="button" onClick={() => switchMode('reset')}
                                        className="text-xs font-semibold transition-colors hover:opacity-80"
                                        style={{ color: GOLD }}>
                                        Lupa password?
                                    </button>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60 mt-2"
                                style={{ background: '#0B1A35' }}>
                                {isLoading
                                    ? <Loader2 size={18} className="animate-spin" />
                                    : mode === 'login' ? 'Masuk' : mode === 'register' ? 'Buat Akun' : 'Kirim Link Reset'}
                            </button>
                        </form>

                        {/* Mode switcher links */}
                        <div className="flex items-center justify-center gap-4 mt-5 text-[11px] font-semibold text-slate-400">
                            {mode !== 'login' && (
                                <button onClick={() => switchMode('login')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                                    <LogIn size={11} /> Login
                                </button>
                            )}
                            {mode !== 'register' && (
                                <button onClick={() => switchMode('register')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                                    <UserPlus size={11} /> Daftar Akun
                                </button>
                            )}
                        </div>

                        {/* Google login */}
                        {mode === 'login' && (
                            <div className="mt-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-px flex-1 bg-slate-100" />
                                    <span className="text-[11px] font-medium text-slate-400">atau masuk dengan</span>
                                    <div className="h-px flex-1 bg-slate-100" />
                                </div>
                                <button
                                    onClick={handleGoogleLogin}
                                    disabled={isLoading}
                                    className="w-full h-12 rounded-xl border border-slate-200 flex items-center justify-center gap-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.18l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Masuk dengan Google
                                </button>
                            </div>
                        )}

                        {/* Footer */}
                        <p className="text-center text-[11px] text-slate-400 mt-8 flex items-center justify-center gap-1.5">
                            <Shield size={11} />
                            © 2026 CSL System. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
