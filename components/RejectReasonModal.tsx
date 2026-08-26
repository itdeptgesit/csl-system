
'use client';

import React, { useState } from 'react';
import { useToast } from './ToastProvider';
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => void;
    itemName?: string;
}

export const RejectReasonModal: React.FC<Props> = ({
    isOpen,
    onClose,
    onSubmit,
    itemName
}) => {
    const { showToast } = useToast();
    const [reason, setReason] = useState('');

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent showCloseButton={false} className="sm:max-w-md p-8 bg-white dark:bg-zinc-900 rounded-xl border border-white/20 dark:border-zinc-800 shadow-2xl">
                <div className="flex flex-col items-center text-center space-y-2">
                    <h2 className="text-xl font-black text-rose-600 dark:text-rose-500 uppercase tracking-tight">
                        Deny Request
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Procurement Audit Protocol</p>
                </div>

                <div className="p-5 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-inner mt-6">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Hardware Target</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-tight">
                        {itemName || 'Unknown Item'}
                    </p>
                </div>

                <div className="space-y-3 mt-6">
                    <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">Reason for Rejection</label>
                    <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Briefly explain why this procurement node is being rejected (required for registry sync)..."
                        className="w-full min-h-[120px] bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-4 text-sm font-medium focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 outline-none transition-all resize-none dark:text-zinc-200 shadow-inner"
                    />
                </div>

                <div className="flex flex-col gap-2 pt-4">
                    <button
                        onClick={() => {
                            if (!reason.trim()) {
                                showToast('A technical or administrative reason is required to finalize the rejection.', 'error');
                                return;
                            }
                            onSubmit(reason.trim());
                            setReason('');
                        }}
                        className="w-full py-3.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20 active:scale-95"
                    >
                        Confirm Denial
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-slate-600 dark:hover:text-zinc-300 transition-all"
                    >
                        Cancel Protocol
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};