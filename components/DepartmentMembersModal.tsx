
'use client';

import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, UserPlus, Search, Loader2, UserCheck, AlertCircle, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../translations';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Department {
    id: number;
    name: string;
}

interface UserSimple {
    id: number | string;
    fullName: string;
    email: string;
    department: string;
    jobTitle?: string;
}

interface DepartmentMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    department: Department | null;
    onUpdate?: () => void;
}

export const DepartmentMembersModal: React.FC<DepartmentMembersModalProps> = ({ isOpen, onClose, department, onUpdate }) => {
    const { t } = useLanguage();
    const [members, setMembers] = useState<UserSimple[]>([]);
    const [availableUsers, setAvailableUsers] = useState<UserSimple[]>([]);
    const [showAddMode, setShowAddMode] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<number | string | null>(null);

    useEffect(() => {
        if (isOpen && department) {
            fetchMembers();
            setShowAddMode(false);
            setSelectedUserId('');
            setError(null);
        }
    }, [isOpen, department]);

    const fetchMembers = async () => {
        if (!department) return;
        setIsLoading(true);
        setError(null);

        try {
            const { data: allUsers, error: fetchError } = await supabase
                .from('user_accounts')
                .select('id, full_name, email, department, job_title');

            if (fetchError) throw fetchError;

            if (allUsers) {
                const targetDept = department.name.trim().toLowerCase();
                const filteredMembers = allUsers
                    .filter((u: any) => {
                        const depts = (u.department || '')
                            .split(',')
                            .map((d: string) => d.trim().toLowerCase())
                            .filter(Boolean);
                        return depts.includes(targetDept);
                    })
                    .map((u: any) => ({
                        id: u.id,
                        fullName: u.full_name || 'No Name',
                        email: u.email || '',
                        department: u.department || '',
                        jobTitle: u.job_title
                    }));
                setMembers(filteredMembers);
            }
        } catch (err: any) {
            setError(t('failedFetchData') + ": " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAvailableUsers = async () => {
        if (!department) return;
        setIsLoading(true);

        try {
            const { data, error: fetchError } = await supabase
                .from('user_accounts')
                .select('id, full_name, email, department')
                .order('full_name');

            if (fetchError) throw fetchError;

            if (data) {
                const targetDept = department.name.trim().toLowerCase();
                const filtered = data
                    .filter((u: any) => {
                        const depts = (u.department || '')
                            .split(',')
                            .map((d: string) => d.trim().toLowerCase())
                            .filter(Boolean);
                        return !depts.includes(targetDept);
                    })
                    .map((u: any) => ({
                        id: u.id,
                        fullName: u.full_name || 'No Name',
                        email: u.email || '',
                        department: u.department || 'No Department'
                    }));
                setAvailableUsers(filtered);
            }
        } catch (err: any) {
            setError(t('failedFetchData') + ": " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenAdd = () => {
        fetchAvailableUsers();
        setShowAddMode(true);
    };

    const handleAddMember = async () => {
        if (!selectedUserId || !department) return;
        setIsActionLoading(true);
        setError(null);

        try {
            const userIdNumeric = !isNaN(Number(selectedUserId)) ? Number(selectedUserId) : selectedUserId;

            const { data: user, error: userError } = await supabase
                .from('user_accounts')
                .select('department')
                .eq('id', userIdNumeric)
                .single();

            if (userError || !user) throw new Error("User data not found");

            let currentDepts = (user.department || '')
                .split(',')
                .map((d: string) => d.trim())
                .filter(Boolean);

            const targetDeptName = department.name.trim();
            const alreadyExists = currentDepts.some(d => d.toLowerCase() === targetDeptName.toLowerCase());

            if (!alreadyExists) {
                currentDepts.push(targetDeptName);
            }

            const { error: updateError } = await supabase
                .from('user_accounts')
                .update({ department: currentDepts.join(', ') })
                .eq('id', userIdNumeric);

            if (updateError) throw updateError;

            await fetchMembers();
            setShowAddMode(false);
            setSelectedUserId('');
            if (onUpdate) onUpdate();
        } catch (err: any) {
            setError(t('failedSave') + ": " + err.message);
        } finally {
            setIsActionLoading(false);
        }
    };

    const confirmRemove = async () => {
        if (!department || deleteId === null) return;

        setIsActionLoading(true);
        setError(null);

        try {
            const dbUserId = typeof deleteId === 'string' && !isNaN(Number(deleteId)) ? Number(deleteId) : deleteId;

            const { data: user, error: userError } = await supabase
                .from('user_accounts')
                .select('department')
                .eq('id', dbUserId)
                .single();

            if (userError || !user) throw new Error("User record not found");

            const targetDeptNameNormalized = department.name.trim().toLowerCase();
            const currentDepts = (user.department || '').split(',');

            const updatedDepts = currentDepts
                .map((d: string) => d.trim())
                .filter(d => {
                    const isMatch = d.toLowerCase() === targetDeptNameNormalized;
                    return !isMatch && d !== '';
                });

            const newDeptString = updatedDepts.join(', ');

            const { error: updateError } = await supabase
                .from('user_accounts')
                .update({ department: newDeptString })
                .eq('id', dbUserId);

            if (updateError) throw updateError;

            setMembers(prev => prev.filter(m => String(m.id) !== String(deleteId)));
            if (onUpdate) onUpdate();

        } catch (err: any) {
            setError(t('failedDelete') + ": " + (err.message || "Unknown error"));
        } finally {
            setIsActionLoading(false);
            setDeleteId(null);
        }
    };

    if (!isOpen || !department) return null;

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-hidden">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[85vh] border border-white/20 dark:border-zinc-800">

                <div className="px-8 py-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50 rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">
                            {department.name} <span className="text-zinc-950 dark:text-zinc-50">Personnel</span>
                        </h2>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-black uppercase tracking-[0.3em] mt-1">Management Engine</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                    {error && (
                        <div className="m-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-start gap-3 text-rose-600 dark:text-rose-400 animate-in slide-in-from-top-2">
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <p className="text-xs font-bold leading-relaxed">{error}</p>
                        </div>
                    )}

                    {showAddMode ? (
                        <div className="p-8 bg-zinc-50 dark:bg-zinc-800/30 m-6 rounded-xl border border-slate-200 dark:border-zinc-800 animate-in slide-in-from-right-4 duration-300 shadow-inner">
                            <div className="flex items-center gap-2 mb-4">
                                <UserPlus size={18} className="text-zinc-900 dark:text-zinc-100" />
                                <h4 className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase tracking-widest">Assign Personnel</h4>
                            </div>

                            <div className="space-y-4">
                                <div className="relative">
                                    <select
                                        className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 appearance-none font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50 shadow-sm"
                                        value={selectedUserId}
                                        onChange={(e) => setSelectedUserId(e.target.value)}
                                        disabled={isActionLoading}
                                    >
                                        <option value="">-- Select Account --</option>
                                        {availableUsers.map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.fullName} • {u.department}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-3.5 pointer-events-none text-slate-400">
                                        <Plus size={16} />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        onClick={() => setShowAddMode(false)}
                                        disabled={isActionLoading}
                                        className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddMember}
                                        disabled={!selectedUserId || isActionLoading}
                                        className="flex items-center gap-2 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-50 bg-zinc-900 dark:text-zinc-900 dark:bg-zinc-50 rounded-xl hover:bg-zinc-900/90 dark:hover:bg-zinc-50/90 shadow disabled:opacity-50 transition-all active:scale-95"
                                    >
                                        {isActionLoading ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                                        Confirm Assignment
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="px-8 py-4 border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                            <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Personnel List : {members.length}</span>
                            <button
                                onClick={handleOpenAdd}
                                disabled={isLoading || isActionLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-900/90 dark:hover:bg-zinc-50/90 shadow transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Plus size={14} /> Assign Person
                            </button>
                        </div>
                    )}

                    <ul className="divide-y divide-slate-50 dark:divide-slate-800">
                        {isLoading && members.length === 0 ? (
                            <li className="p-12 text-center flex flex-col items-center gap-4">
                                <Loader2 size={32} className="animate-spin text-zinc-900 dark:text-zinc-100" />
                                <p className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Syncing Personnel Data...</p>
                            </li>
                        ) : (members.length === 0 && !showAddMode) ? (
                            <li className="p-20 text-center flex flex-col items-center gap-4 text-slate-300 dark:text-slate-700">
                                <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-zinc-800 flex items-center justify-center shadow-inner border border-white dark:border-zinc-700">
                                    <UserPlus size={32} className="opacity-20" />
                                </div>
                                <p className="text-xs font-bold italic">No department members registered.</p>
                            </li>
                        ) : (
                            members.map(member => (
                                <li key={member.id} className="px-8 py-5 flex justify-between items-center hover:bg-slate-50/80 dark:hover:bg-slate-800/50 group transition-all animate-in slide-in-from-bottom-2">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-sm font-black text-slate-500 dark:text-zinc-400 shadow-sm border border-white dark:border-slate-600">
                                            {member.fullName ? member.fullName.charAt(0) : '?'}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 dark:text-slate-200 text-sm tracking-tight">{member.fullName}</p>
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {(member.department || '').split(',').map((d, i) => {
                                                    const cleanDept = d.trim();
                                                    if (!cleanDept) return null;
                                                    const isCurrent = cleanDept.toLowerCase() === department.name.trim().toLowerCase();
                                                    return (
                                                        <span key={i} className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border ${isCurrent ? 'bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 border-zinc-900 dark:border-zinc-50 shadow-sm' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'}`}>
                                                            {cleanDept}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setDeleteId(member.id);
                                        }}
                                        disabled={isActionLoading}
                                        className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 rounded-xl transition-all border border-rose-100 dark:border-rose-900/30 disabled:opacity-30 flex items-center justify-center min-w-[48px] min-h-[48px] active:scale-90 relative z-[600] cursor-pointer shadow-sm"
                                        title="Remove Personnel"
                                    >
                                        {isActionLoading ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} className="pointer-events-none" />}
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                <div className="px-8 py-4 bg-slate-50 dark:bg-zinc-800/50 border-t border-slate-100 dark:border-zinc-800 text-center">
                    <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest italic">
                        Personnel changes are automatically synced to global directory
                    </p>
                </div>
            </div>

            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="z-[600]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will remove the selected personnel from the {department.name} department.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRemove} className="bg-rose-500 hover:bg-rose-600 text-white">Remove Personnel</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};


