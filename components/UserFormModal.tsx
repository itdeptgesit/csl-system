
'use client';

import React, { useState, useEffect } from 'react';
import { X, Shield, Users, Building2, UserCheck, Layers, Briefcase, MapPin, Loader2, Image as ImageIcon, Camera, LifeBuoy } from 'lucide-react';
import { UserAccount, UserGroup, Company } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useToast } from './ToastProvider';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface UserFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<UserAccount>) => void;
    initialData?: UserAccount | null;
    availableGroups: UserGroup[];
}

export const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSubmit, initialData, availableGroups }) => {
    const { showToast } = useToast();
    const [formData, setFormData] = useState<Partial<UserAccount>>({});
    const [userOptions, setUserOptions] = useState<{ id: string, name: string }[]>([]);
    const [companyList, setCompanyList] = useState<Company[]>([]);
    const [departmentList, setDepartmentList] = useState<{ name: string }[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        const fetchResources = async () => {
            const { data: users } = await supabase.from('user_accounts').select('id, full_name').order('full_name');
            if (users) setUserOptions(users.map((u: any) => ({ id: u.id.toString(), name: u.full_name })));

            const { data: companies } = await supabase.from('companies').select('*').order('name');
            if (companies) setCompanyList(companies);

            const { data: depts } = await supabase.from('departments').select('name').order('name');
            if (depts) setDepartmentList(depts);
        };
        if (isOpen) fetchResources();
    }, [isOpen]);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else if (isOpen) {
            setFormData({
                username: '',
                fullName: '',
                email: '',
                role: 'User',
                groups: [],
                status: 'Active',
                company: '',
                department: '',
                jobTitle: '',
                supervisorId: '',
                managerId: '',
                vpId: '',
                isHelpdeskSupport: false
            });
        }
    }, [initialData, isOpen]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME || 'dmr8bxdos';
        const uploadPreset = process.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'gesit_erp_preset';

        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('upload_preset', uploadPreset);

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: uploadData
            });
            const data = await response.json();
            if (data.secure_url) {
                setFormData(prev => ({ ...prev, avatarUrl: data.secure_url }));
            }
        } catch (error) {
            console.error('Upload Error:', error);
            showToast('Upload failed', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
        onClose();
    };

    const toggleGroup = (groupId: string) => {
        setFormData(prev => {
            const currentGroups = prev.groups || [];
            if (currentGroups.includes(groupId)) {
                return { ...prev, groups: currentGroups.filter(g => g !== groupId) };
            } else {
                return { ...prev, groups: [...currentGroups, groupId] };
            }
        });
    };

    const inputClass = "w-full border border-slate-200 dark:border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 mt-1 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 transition-all";
    const labelClass = "block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1 ml-1";

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} disablePointerDismissal={true}>
            <DialogContent showCloseButton={false} className="sm:max-w-2xl p-0 overflow-hidden rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[92vh]">
                <div className="flex justify-between items-center px-9 py-7 border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                    <div>
                        <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                            {initialData ? 'Edit User Identity' : 'Register New User'}
                        </DialogTitle>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-2">Identity & Corporate Hierarchy Management</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-all"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-9 space-y-9 custom-scrollbar">
                     <form id="userForm" onSubmit={handleSubmit} className="space-y-9">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="md:col-span-2 p-7 rounded-lg bg-zinc-100/50 dark:bg-zinc-800/30 border border-slate-200 dark:border-zinc-800">
                                <label className={labelClass}>Full Identity Name</label>
                                <input type="text" required className={`${inputClass} !bg-white dark:!bg-zinc-900 !text-xl !font-black !py-3.5 focus:ring-primary/10 !border-slate-200 dark:!border-zinc-700`} value={formData.fullName || ''} onChange={e => setFormData({ ...formData, fullName: e.target.value })} placeholder="e.g. John Doe" />
                            </div>

                            <div>
                                <label className={labelClass}>Username</label>
                                <input type="text" required className={inputClass} value={formData.username || ''} onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase() })} />
                            </div>

                            <div>
                                <label className={labelClass}>Official Email</label>
                                <input type="email" required className={inputClass} value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className={labelClass}>User Avatar</label>
                                <div className="flex items-center gap-6 mt-2 p-6 bg-slate-50 dark:bg-zinc-800/30 rounded-lg border border-dashed border-slate-200 dark:border-zinc-700">
                                    <div className="w-20 h-20 rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center text-slate-300 shadow-sm">
                                        {formData.avatarUrl ? (
                                            <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon size={28} />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-3">Cloudinary Secured Upload</p>
                                        <div className="flex gap-3">
                                            <label className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 cursor-pointer transition-all shadow-sm">
                                                {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} strokeWidth={2.5} />}
                                                {isUploading ? 'Uploading...' : 'Choose Photo'}
                                                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={isUploading} />
                                            </label>
                                            {formData.avatarUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, avatarUrl: '' }))}
                                                    className="px-5 py-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-md text-[11px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-zinc-800/30 p-7 rounded-lg border border-slate-200 dark:border-zinc-800 space-y-8">
                            <div className="flex items-center gap-3 mb-2 border-b border-slate-200 dark:border-zinc-700 pb-4">
                                <Building2 size={20} className="text-zinc-900 dark:text-zinc-100" />
                                <h3 className="font-black text-slate-800 dark:text-zinc-200 uppercase text-[11px] tracking-[0.2em]">Corporate Assignment</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className={labelClass}>Company Entity</label>
                                    <select className={`${inputClass} !bg-white dark:!bg-zinc-900`} value={formData.company || ''} onChange={e => setFormData({ ...formData, company: e.target.value })} required>
                                        <option value="">-- Select Company --</option>
                                        {companyList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className={labelClass}>Department Cluster</label>
                                    <select className={`${inputClass} !bg-white dark:!bg-zinc-900`} value={formData.department || ''} onChange={e => setFormData({ ...formData, department: e.target.value })} required>
                                        <option value="">-- Select Dept --</option>
                                        {departmentList.map((d, i) => <option key={i} value={d.name}>{d.name}</option>)}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className={labelClass}>Job Title / Position</label>
                                    <div className="relative">
                                        <input type="text" className={`${inputClass} !bg-white dark:!bg-zinc-900 pl-11`} value={formData.jobTitle || ''} onChange={e => setFormData({ ...formData, jobTitle: e.target.value })} placeholder="e.g. Senior Network Engineer" />
                                        <Briefcase size={16} className="absolute left-4 top-4 text-slate-400" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <label className={labelClass}>Access Role</label>
                                <select className={inputClass} value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as any })}>
                                    <option value="Admin">Administrator</option>
                                    <option value="Staff">Operations Staff</option>
                                    <option value="User">Standard User</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Terminal Status</label>
                                <select className={inputClass} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                                    <option value="Active">Active</option>
                                    <option value="Disabled">Disabled</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-zinc-800/30 p-7 rounded-lg border border-slate-200 dark:border-zinc-800 space-y-5">
                            <div className="flex items-center justify-between mb-2 border-b border-slate-200 dark:border-zinc-700 pb-4">
                                <div className="flex items-center gap-3">
                                    <LifeBuoy size={20} className="text-indigo-600 dark:text-indigo-400" />
                                    <h3 className="font-black text-slate-800 dark:text-zinc-200 uppercase text-[11px] tracking-[0.2em]">Helpdesk Access</h3>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.isHelpdeskSupport || false}
                                        onChange={(e) => setFormData({ ...formData, isHelpdeskSupport: e.target.checked })}
                                    />
                                    <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-500 shadow-inner"></div>
                                </label>
                            </div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                Support staff status grants access to ticket management protocols.
                            </p>
                        </div>

                        <div className="bg-slate-50 dark:bg-zinc-800/30 p-7 rounded-lg border border-slate-200 dark:border-zinc-800 space-y-6">
                            <div className="flex items-center gap-3 mb-2 border-b border-slate-200 dark:border-zinc-700 pb-4">
                                <Layers size={20} className="text-zinc-900 dark:text-zinc-100" />
                                <h3 className="font-black text-slate-800 dark:text-zinc-200 uppercase text-[11px] tracking-[0.2em]">Group Membership</h3>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                {availableGroups.map(group => (
                                    <label key={group.id} className={`flex items-center gap-3 cursor-pointer bg-white dark:bg-zinc-900 px-4 py-3 rounded-md border transition-all ${formData.groups?.includes(group.id) ? 'border-zinc-900 dark:border-zinc-50 bg-zinc-900/5 dark:bg-zinc-50/5 ring-1 ring-zinc-900 dark:ring-zinc-50 shadow-sm' : 'border-slate-100 dark:border-zinc-800 hover:border-slate-200 dark:hover:border-zinc-700'}`}>
                                        <input type="checkbox" checked={formData.groups?.includes(group.id)} onChange={() => toggleGroup(group.id)} className="w-4 h-4 rounded text-zinc-900 dark:text-zinc-100 border-slate-300 focus:ring-zinc-900 dark:focus:ring-zinc-100" />
                                        <span className="text-[13px] font-bold text-slate-900 dark:text-zinc-100 tracking-tight">{group.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="bg-zinc-50 dark:bg-zinc-800/30 p-7 rounded-lg border border-slate-200 dark:border-zinc-800 space-y-6">
                            <div className="flex items-center gap-3 mb-2 border-b border-slate-200 dark:border-zinc-800 pb-4">
                                <UserCheck size={20} className="text-zinc-900 dark:text-zinc-100" />
                                <h3 className="font-black text-slate-800 dark:text-zinc-200 uppercase text-[11px] tracking-[0.2em]">Approval Hierarchy</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="flex flex-col justify-end">
                                    <label className={labelClass}>Direct Supervisor (SPV)</label>
                                    <select className={`${inputClass} !bg-white dark:!bg-zinc-900`} value={formData.supervisorId || ''} onChange={e => setFormData({ ...formData, supervisorId: e.target.value })}>
                                        <option value="">- No SPV -</option>
                                        {userOptions.filter(u => u.id !== initialData?.id?.toString()).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col justify-end">
                                    <label className={labelClass}>Department Manager</label>
                                    <select className={`${inputClass} !bg-white dark:!bg-zinc-900`} value={formData.managerId || ''} onChange={e => setFormData({ ...formData, managerId: e.target.value })}>
                                        <option value="">- No Manager -</option>
                                        {userOptions.filter(u => u.id !== initialData?.id?.toString()).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col justify-end">
                                    <label className={labelClass}>VP HR & Logistic</label>
                                    <select className={`${inputClass} !bg-white dark:!bg-zinc-900`} value={formData.vpId || ''} onChange={e => setFormData({ ...formData, vpId: e.target.value })}>
                                        <option value="">- No VP -</option>
                                        {userOptions.filter(u => u.id !== initialData?.id?.toString()).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="px-9 py-7 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 flex justify-end gap-4 shrink-0">
                    <button type="button" onClick={onClose} className="px-8 py-3 text-[12px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all">Cancel</button>
                    <button type="submit" form="userForm" className="px-12 py-3 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-md text-[12px] font-black uppercase tracking-widest hover:bg-zinc-900/90 dark:hover:bg-zinc-50/90 shadow-xl active:scale-[0.98]">Save</button>
                </div>
            </DialogContent>
        </Dialog>
    );
};