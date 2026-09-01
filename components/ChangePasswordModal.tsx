'use client';

import React, { useState } from 'react';
import { Lock, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Dialog, DialogContent } from './ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setNewPassword('');
            setConfirmPassword('');
            setError('');
            setSuccess(false);
        }, 300);
    };

    const passwordStrength = (() => {
        if (!newPassword) return 0;
        let score = 0;
        if (newPassword.length >= 8) score++;
        if (/[A-Z]/.test(newPassword)) score++;
        if (/[0-9]/.test(newPassword)) score++;
        if (/[^A-Za-z0-9]/.test(newPassword)) score++;
        return score;
    })();

    const strengthLabel = ['', 'Lemah', 'Cukup', 'Kuat', 'Sangat Kuat'][passwordStrength];
    const strengthColor = ['', '#ef4444', '#f59e0b', '#22c55e', '#059669'][passwordStrength];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Password tidak cocok. Periksa kembali.');
            return;
        }
        if (newPassword.length < 8) {
            setError('Password minimal 8 karakter.');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            setSuccess(true);
            setTimeout(() => handleClose(), 2500);
        } catch (err: any) {
            setError(err.message || 'Gagal mengubah password. Coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

    const GOLD = '#C9A84C';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="p-0 overflow-hidden border-0 shadow-2xl rounded-2xl max-w-[420px]"
                style={{ fontFamily: "'Inter', sans-serif" }}>

                {/* Gold top bar */}
                <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${GOLD}, #e8c97a, ${GOLD})` }} />

                {/* Header */}
                <div className="relative px-7 pt-6 pb-5 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #0B1A35 0%, #0D2145 100%)' }}>
                    <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-10" style={{ background: GOLD }} />
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(201,168,76,0.15)', border: '1.5px solid rgba(201,168,76,0.3)' }}>
                            <Lock size={18} style={{ color: GOLD }} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `${GOLD}AA` }}>Keamanan Akun</p>
                            <h2 className="text-lg font-black text-white leading-tight">Ubah Password</h2>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-7 py-6 bg-white dark:bg-zinc-900">
                    <AnimatePresence mode="wait">
                        {success ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center text-center py-6 gap-4"
                            >
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', border: '2px solid #a7f3d0' }}>
                                    <CheckCircle2 size={32} className="text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Password Berhasil Diubah!</h3>
                                    <p className="text-sm text-slate-500 mt-1">Gunakan password baru Anda saat login berikutnya.</p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.form
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                onSubmit={handleSubmit}
                                className="space-y-4"
                            >
                                {/* Error */}
                                {error && (
                                    <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-100">
                                        <AlertCircle size={14} className="text-rose-500 shrink-0" />
                                        <p className="text-sm font-semibold text-rose-700">{error}</p>
                                    </div>
                                )}

                                {/* New Password */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Password Baru</label>
                                    <div className="relative">
                                        <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type={showNew ? 'text' : 'password'}
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Minimal 8 karakter"
                                            className="w-full h-12 pl-10 pr-11 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-medium text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none transition-all"
                                            onFocus={e => e.target.style.borderColor = GOLD}
                                            onBlur={e => e.target.style.borderColor = ''}
                                        />
                                        <button type="button"
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            onClick={() => setShowNew(!showNew)}>
                                            {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>

                                    {/* Strength bar */}
                                    {newPassword && (
                                        <div className="space-y-1 pt-1">
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4].map(i => (
                                                    <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                                                        style={{ background: i <= passwordStrength ? strengthColor : '#e2e8f0' }} />
                                                ))}
                                            </div>
                                            <p className="text-[11px] font-semibold" style={{ color: strengthColor }}>
                                                Kekuatan: {strengthLabel}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Konfirmasi Password</label>
                                    <div className="relative">
                                        <ShieldCheck size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Ulangi password baru"
                                            className="w-full h-12 pl-10 pr-11 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-medium text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none transition-all"
                                            onFocus={e => e.target.style.borderColor = GOLD}
                                            onBlur={e => e.target.style.borderColor = ''}
                                            style={{
                                                borderColor: confirmPassword && confirmPassword !== newPassword ? '#ef4444' : ''
                                            }}
                                        />
                                        <button type="button"
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            onClick={() => setShowConfirm(!showConfirm)}>
                                            {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                    {confirmPassword && confirmPassword !== newPassword && (
                                        <p className="text-[11px] font-semibold text-rose-500">Password tidak cocok</p>
                                    )}
                                    {confirmPassword && confirmPassword === newPassword && (
                                        <p className="text-[11px] font-semibold text-emerald-600">✓ Password cocok</p>
                                    )}
                                </div>

                                {/* Buttons */}
                                <div className="flex flex-col gap-2 pt-2">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60 bg-slate-800 dark:bg-slate-600"
                                    >
                                        {isLoading ? (
                                            <><Loader2 size={16} className="animate-spin" /> Menyimpan...</>
                                        ) : (
                                            <><Lock size={15} /> Simpan Password Baru</>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="w-full h-10 rounded-xl font-semibold text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all"
                                    >
                                        Batal
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
};
