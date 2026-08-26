'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Mail, Lock, Eye, EyeOff, Sun, Moon, User, UserPlus, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../translations';
import { sendPasswordResetNotificationEmail } from '../utils/EmailSystemUtils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    appName = 'CSL-LINK',
    logoUrl = '/image/logo.png',
    primaryColor = '#0a2558'
}) => {
    const { t } = useLanguage();
    const [mode, setMode] = useState<Mode>('login');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') { setIsDark(true); document.documentElement.classList.add('dark'); }
    }, []);

    const toggleTheme = () => {
        const next = !isDark;
        setIsDark(next);
        if (next) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
        else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
    };

    const switchMode = (m: Mode) => { setMode(m); setError(''); setSuccessMsg(''); };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true); setError('');
        try {
            let finalEmail = identifier.trim();
            if (!finalEmail.includes('@')) {
                const { data: ud } = await supabase.from('user_accounts').select('email').eq('username', finalEmail.toLowerCase()).maybeSingle();
                if (!ud) throw new Error('Identity not recognized.');
                finalEmail = ud.email;
            }
            const { data, error: authErr } = await supabase.auth.signInWithPassword({ email: finalEmail, password });
            if (authErr) throw authErr;
            if (data.session?.user?.email) onLogin(data.session.user.email);
        } catch (err: any) { setError(err.message || 'Access denied.'); }
        finally { setIsLoading(false); }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setSuccessMsg('');
        const email = identifier.trim().toLowerCase();
        if (!isAllowedDomain(email)) {
            setError(`Pendaftaran hanya untuk domain perusahaan: ${ALLOWED_DOMAINS.map(d => '@' + d).join(' & ')}`);
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
            setSuccessMsg('Pendaftaran berhasil! Cek email Anda untuk konfirmasi, lalu silakan login.');
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

    const titles: Record<Mode, string> = { login: 'Sign In', register: 'Buat Akun', reset: 'Reset Password' };
    const descs: Record<Mode, string> = {
        login: 'Selamat datang! Masukkan kredensial untuk mengakses sistem.',
        register: `Hanya email domain ${ALLOWED_DOMAINS.map(d => '@' + d).join(' & ')} yang diizinkan.`,
        reset: 'Masukkan email Anda untuk menerima link reset password.',
    };

    return (
        <div className="h-screen w-full bg-background text-foreground flex font-sans overflow-hidden">
            {/* Left Hero */}
            <div className="hidden lg:flex w-[45%] relative overflow-hidden flex-col justify-between p-24">
                <div className="absolute inset-0" style={{ backgroundColor: primaryColor }}>
                    <motion.img initial={{ scale: 1.1, opacity: 0 }} animate={{ scale: 1, opacity: 0.6 }} transition={{ duration: 2 }}
                        src="/image/bg.jpeg" alt="" className="w-full h-full object-cover mix-blend-multiply" />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom right, ${primaryColor}66, ${primaryColor}E6)` }} />
                    <motion.div animate={{ opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 10, repeat: Infinity }}
                        className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px]" />
                </div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="mb-16">
                            <img src={logoUrl} alt="Logo" className="w-28 h-28 object-contain filter drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]" />
                        </motion.div>
                        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2 }}
                            className="text-5xl lg:text-6xl font-black text-white tracking-tighter mb-4">
                            <span className="block opacity-40 text-xl tracking-widest font-medium mb-1 uppercase">Welcome to</span>
                            <span className="bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-white/60 uppercase">{appName}</span>
                        </motion.h1>
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ duration: 1, delay: 0.7 }}
                            className="text-white text-base leading-relaxed font-medium max-w-lg mt-6">
                            Empowering your professional workflow with integrated management tools — designed for growth and operational excellence.
                        </motion.p>
                        <div className="flex gap-6 mt-10">
                            {[{ e: '⚡', l: 'Performance', v: 'High Speed' }, { e: '🛡️', l: 'Protection', v: 'Deep Security' }].map((b, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + i * 0.1 }}
                                    className="bg-white/[0.03] backdrop-blur-3xl px-5 py-4 rounded-xl border border-white/10 flex items-center gap-3">
                                    <span className="text-2xl">{b.e}</span>
                                    <div>
                                        <div className="text-[9px] text-white/40 font-medium">{b.l}</div>
                                        <div className="text-[11px] font-bold text-white">{b.v}</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                    <div className="opacity-20">
                        <p className="text-[9px] font-medium text-white">© 2026 CSL-LINK — Create IT Dev Gesit</p>
                    </div>
                </div>
            </div>

            {/* Right Form */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-20 bg-background/50 relative overflow-y-auto">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div animate={{ x: [0, 40, 0], y: [0, 20, 0] }} transition={{ duration: 20, repeat: Infinity }}
                        className="absolute top-20 -right-20 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
                </div>

                <Button variant="ghost" size="icon" onClick={toggleTheme} className="absolute top-6 right-6 z-50 border border-slate-200/50 dark:border-white/10">
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </Button>

                <div className="w-full max-w-[440px] z-10">
                    <AnimatePresence mode="wait">
                        <motion.div key={mode} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
                            <Card className="border border-slate-200 dark:border-white/5 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-3xl shadow-2xl rounded-2xl overflow-hidden">
                                <CardHeader className="pt-8 px-8 pb-5">
                                    {/* Mobile logo */}
                                    <div className="lg:hidden flex flex-col items-center mb-6 gap-3">
                                        <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">{appName}</h2>
                                    </div>
                                    <CardTitle className="text-2xl font-black tracking-tighter">
                                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
                                            {titles[mode]}
                                        </span>
                                    </CardTitle>
                                    <CardDescription className="text-xs font-medium text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                        {descs[mode]}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="px-8 pb-5">
                                    {error && (
                                        <Alert variant="destructive" className="mb-5 bg-rose-500/10 border-rose-500/20 rounded-xl">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription className="text-[11px] font-semibold ml-1">{error}</AlertDescription>
                                        </Alert>
                                    )}
                                    {successMsg && (
                                        <Alert className="mb-5 bg-emerald-500/10 border-emerald-500/20 rounded-xl">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            <AlertDescription className="text-[11px] font-semibold ml-1 text-emerald-700 dark:text-emerald-400">{successMsg}</AlertDescription>
                                        </Alert>
                                    )}

                                    <form onSubmit={mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleReset} className="space-y-4">
                                        {mode === 'register' && (
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-semibold text-slate-400 ml-1">Nama Lengkap</Label>
                                                <div className="relative">
                                                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <Input className="h-11 pl-10 rounded-xl text-sm font-medium bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                                                        placeholder="Nama lengkap Anda" value={fullName} onChange={e => setFullName(e.target.value)} required />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-semibold text-slate-400 ml-1">
                                                {mode === 'login' ? 'Email atau Username' : 'Email Perusahaan'}
                                            </Label>
                                            <div className="relative">
                                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <Input className="h-11 pl-10 rounded-xl text-sm font-medium bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                                                    placeholder={mode === 'register' ? 'nama@gesit.co.id' : 'Email atau username'}
                                                    type={mode === 'register' ? 'email' : 'text'}
                                                    value={identifier} onChange={e => setIdentifier(e.target.value)} required />
                                            </div>
                                            {mode === 'register' && (
                                                <p className="text-[10px] text-slate-400 ml-1">Domain yang diizinkan: {ALLOWED_DOMAINS.map(d => '@' + d).join(', ')}</p>
                                            )}
                                        </div>

                                        {mode !== 'reset' && (
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-semibold text-slate-400 ml-1">Password</Label>
                                                <div className="relative">
                                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <Input className="h-11 pl-10 pr-11 rounded-xl text-sm font-medium bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                                                        placeholder={mode === 'register' ? 'Min. 8 karakter' : 'Password'}
                                                        type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required />
                                                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                                                        onClick={() => setShowPassword(!showPassword)}>
                                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {mode === 'register' && (
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-semibold text-slate-400 ml-1">Konfirmasi Password</Label>
                                                <div className="relative">
                                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <Input className="h-11 pl-10 rounded-xl text-sm font-medium bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                                                        placeholder="Ulangi password" type={showPassword ? 'text' : 'password'}
                                                        value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                                                </div>
                                            </div>
                                        )}

                                        <Button type="submit" disabled={isLoading} className="w-full h-11 font-bold text-sm tracking-tight mt-2" style={{ backgroundColor: primaryColor }}>
                                            {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> :
                                                mode === 'login' ? 'Sign In' : mode === 'register' ? 'Buat Akun' : 'Kirim Link Reset'}
                                        </Button>
                                    </form>

                                    {/* Mode switcher */}
                                    <div className="mt-5 flex items-center justify-center gap-4 text-[11px] font-semibold">
                                        {mode !== 'login' && (
                                            <button onClick={() => switchMode('login')} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                                <LogIn size={12} /> Sign In
                                            </button>
                                        )}
                                        {mode !== 'register' && (
                                            <button onClick={() => switchMode('register')} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                                <UserPlus size={12} /> Daftar Akun
                                            </button>
                                        )}
                                        {mode !== 'reset' && (
                                            <button onClick={() => switchMode('reset')} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                                Lupa password?
                                            </button>
                                        )}
                                    </div>

                                    {/* Google login only shown on login mode */}
                                    {mode === 'login' && (
                                        <div className="mt-5">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="h-px flex-1 bg-slate-100 dark:bg-white/5" />
                                                <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">atau</span>
                                                <div className="h-px flex-1 bg-slate-100 dark:bg-white/5" />
                                            </div>
                                            <Button variant="outline" onClick={handleGoogleLogin} disabled={isLoading}
                                                className="w-full h-11 border-slate-200 dark:border-white/10 gap-2 text-[11px] font-bold uppercase tracking-wider">
                                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05" />
                                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.18l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                                </svg>
                                                Masuk dengan Google
                                            </Button>
                                            <p className="text-center text-[9px] text-slate-400 mt-2">Login Google dibatasi hanya untuk domain perusahaan</p>
                                        </div>
                                    )}
                                </CardContent>

                                <CardFooter className="px-8 pb-8 pt-0 flex flex-col gap-3">
                                    <div className="w-full h-px bg-slate-100 dark:bg-white/5" />
                                    <div className="flex items-center gap-4 text-slate-400/60 text-[9px] font-bold uppercase tracking-widest">
                                        <button onClick={() => window.location.href = 'mailto:it@gesit.co.id'} className="hover:text-slate-700 dark:hover:text-white transition-colors">Support</button>
                                        <span>·</span>
                                        <a href="/privacy" className="hover:text-primary transition-colors">Privacy</a>
                                        <span>·</span>
                                        <a href="/terms" className="hover:text-primary transition-colors">Terms</a>
                                    </div>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
