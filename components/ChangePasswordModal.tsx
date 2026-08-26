'use client';

import React, { useState } from 'react';
import { X, Lock, Check, ShieldAlert, Loader2, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { motion, AnimatePresence } from 'framer-motion';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setNewPassword('');
                setConfirmPassword('');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to update password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} disablePointerDismissal={true}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border-slate-100 dark:border-white/5 rounded-xl p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="p-8 pb-4 relative overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <KeyRound size={80} />
                    </div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-lg flex items-center justify-center">
                            <Lock size={20} />
                        </div>
                        <DialogTitle className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Security Protocol</DialogTitle>
                    </div>
                    <DialogDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">
                        Passcode Synchronization & Reset
                    </DialogDescription>
                </DialogHeader>

                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {success ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center text-center py-6"
                            >
                                <div className="w-16 h-16 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20">
                                    <Check size={32} strokeWidth={3} />
                                </div>
                                <h3 className="text-lg font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-tight">Access Synchronized</h3>
                                <p className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-500/50 uppercase tracking-widest mt-2 leading-relaxed">
                                    Your secure passcode has been <br /> successfully updated.
                                </p>
                            </motion.div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 p-4 rounded-lg text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest flex items-center gap-3"
                                    >
                                        <ShieldAlert size={14} />
                                        <span>{error}</span>
                                    </motion.div>
                                )}

                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Passcode</Label>
                                        <Input
                                            type="password"
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="h-14 rounded-xl bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 px-5 text-sm font-bold focus:ring-2 focus:ring-blue-500/10"
                                            placeholder="••••••••"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Identity</Label>
                                        <Input
                                            type="password"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="h-14 rounded-xl bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 px-5 text-sm font-bold focus:ring-2 focus:ring-blue-500/10"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 pt-2">
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="font-black text-[10px] uppercase tracking-[0.2em] /20 transition-all active:scale-[0.98]"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 size={16} className="mr-3 animate-spin" />
                                                Synchronizing...
                                            </>
                                        ) : (
                                            'Update Secure Key'
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={onClose}
                                        className="text-[10px] font-black dark: uppercase tracking-widest dark:/5 transition-all"
                                    >
                                        Dismiss
                                    </Button>
                                </div>
                            </form>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
};

