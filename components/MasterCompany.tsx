
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Building2, MapPin, Phone, Globe, Pencil, Trash2, RefreshCcw, Mail, FileSpreadsheet } from 'lucide-react';
import { CompanyFormModal } from './CompanyFormModal';
import { DangerConfirmModal } from './DangerConfirmModal';
import { Company, UserAccount } from '../types';
import { supabase } from '../lib/supabaseClient';
import { trackActivity } from '../lib/auditLogger';
import { useToast } from './ToastProvider';
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import groupEmailCompanies from '../data/group_email_companies.json';

interface MasterCompanyProps {
    currentUser: UserAccount | null;
}

export const MasterCompany: React.FC<MasterCompanyProps> = ({ currentUser }) => {
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [deleteCompany, setDeleteCompany] = useState<Company | null>(null);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Map for group email lookups
    const emailLookup = useMemo(() => {
        const byName = new Map<string, typeof groupEmailCompanies[0]>();
        const byCode = new Map<string, typeof groupEmailCompanies[0]>();
        for (const item of groupEmailCompanies) {
            byName.set(item.name.toLowerCase().trim(), item);
            byCode.set(item.code.toUpperCase().trim(), item);
        }
        return { byName, byCode };
    }, []);

    const fetchCompanies = async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('companies').select('*').order('id', { ascending: true });
        if (!error && data) {
            setCompanies(data as Company[]);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const filteredCompanies = companies.filter(c => {
        const q = searchTerm.toLowerCase();
        const emailInfo = emailLookup.byName.get(c.name.toLowerCase()) || (c.code ? emailLookup.byCode.get(c.code.toUpperCase()) : undefined);
        return (
            c.name.toLowerCase().includes(q) ||
            (c.code && c.code.toLowerCase().includes(q)) ||
            (c.address && c.address.toLowerCase().includes(q)) ||
            (emailInfo && emailInfo.email.toLowerCase().includes(q))
        );
    });

    const handleAdd = () => {
        setEditingCompany(null);
        setIsModalOpen(true);
    };

    const handleEdit = (company: Company) => {
        setEditingCompany(company);
        setIsModalOpen(true);
    };

    const executeDelete = async () => {
        if (!deleteCompany) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase.from('companies').delete().eq('id', deleteCompany.id);
            if (error) throw error;

            await trackActivity(
                currentUser?.fullName || 'User',
                currentUser?.role || 'User',
                'Delete Company',
                'Master',
                `Deleted company ${deleteCompany.name} (${deleteCompany.code})`
            );

            await fetchCompanies();
            setDeleteCompany(null);
            showToast("Perusahaan berhasil dihapus", 'success');
        } catch (err: any) {
            showToast("Failed to delete record: " + err.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSubmit = async (data: Partial<Company>) => {
        try {
            if (editingCompany) {
                await supabase.from('companies').update(data).eq('id', editingCompany.id);
            } else {
                await supabase.from('companies').insert([data]);
            }

            await trackActivity(
                currentUser?.fullName || 'User',
                currentUser?.role || 'User',
                editingCompany ? 'Update Company' : 'Create Company',
                'Master',
                `${editingCompany ? 'Updated' : 'Created'} company ${data.name} (${data.code})`
            );

            fetchCompanies();
            showToast(`Perusahaan berhasil ${editingCompany ? 'diperbarui' : 'ditambahkan'}`, 'success');
        } catch (err: any) {
            showToast("Gagal menyimpan data: " + err.message, 'error');
        }
    };

    // Synchronize 79 corporate entities from the cleaned Group Email Excel list
    const handleSyncGroupEmail = async () => {
        setIsSyncing(true);
        try {
            const { data: dbData } = await supabase.from('companies').select('*');
            const existingNames = new Set((dbData || []).map(c => c.name.toLowerCase().trim()));
            const existingCodes = new Set((dbData || []).map(c => (c.code || '').toUpperCase().trim()));

            let addedCount = 0;
            const toInsert: { name: string; code: string; departments: number; employees: number }[] = [];

            for (const item of groupEmailCompanies) {
                const normName = item.name.toLowerCase().trim();
                const normCode = item.code.toUpperCase().trim();
                if (!existingNames.has(normName) && !existingCodes.has(normCode)) {
                    toInsert.push({
                        name: item.name,
                        code: item.code,
                        departments: 1,
                        employees: 1
                    });
                    existingNames.add(normName);
                    existingCodes.add(normCode);
                }
            }

            if (toInsert.length > 0) {
                const { error } = await supabase.from('companies').insert(toInsert);
                if (error) throw error;
                addedCount = toInsert.length;
            }

            await trackActivity(
                currentUser?.fullName || 'User',
                currentUser?.role || 'User',
                'Sync Group Email Companies',
                'Master',
                `Synced ${addedCount} corporate entities from Group-Email-Cleaned-List.xlsx`
            );

            showToast(`Sinkronisasi sukses: ${addedCount} entitas baru berhasil didaftarkan.`, 'success');
            await fetchCompanies();
        } catch (err: any) {
            showToast('Gagal sinkronisasi: ' + (err.message || 'Periksa koneksi'), 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="animate-in fade-in duration-300 pb-10">
            <PageHeader
                title="Master Company"
                description="Manage your enterprise entities, group emails & organizational structure"
            >
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSyncGroupEmail}
                        disabled={isSyncing}
                        className="h-9 text-xs font-semibold gap-1.5 border-[#e6e9f0] hover:bg-[#f6f7f9]"
                        title="Sinkronkan 79 entitas resmi dari Group-Email-Cleaned-List.xlsx"
                    >
                        <FileSpreadsheet className={`h-3.5 w-3.5 text-[#0a2540] ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Group Email (79)'}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchCompanies}
                        className="w-9 hover:bg-muted"
                        title="Muat ulang data"
                    >
                        <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </Button>
                    <Button
                        onClick={handleAdd}
                        size="sm"
                        className="bg-[#0a2540] hover:bg-[#16375c] text-white font-semibold text-xs rounded-xl h-9 px-4 gap-1.5"
                    >
                        <Plus size={14} /> New Entity
                    </Button>
                </div>
            </PageHeader>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-800/30 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Input
                            placeholder="Cari nama perusahaan, kode, email group..."
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 rounded-lg text-xs"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                    </div>
                    <div className="text-xs text-[#758196] font-medium">
                        Total: <span className="font-bold text-[#0a2540] dark:text-white">{filteredCompanies.length}</span> entitas
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table className="w-full">
                        <TableHeader>
                            <TableRow className="bg-slate-50/60 dark:bg-zinc-800/50">
                                <TableHead className="w-16 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">ID</TableHead>
                                <TableHead className="w-24 text-[10px] font-bold uppercase tracking-wider text-slate-400">Kode</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nama Perusahaan / Entitas</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alamat Email Group</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alamat Kantor</TableHead>
                                <TableHead className="w-20 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-20"><RefreshCcw className="animate-spin text-[#0a2540] mx-auto" size={24} /></TableCell></TableRow>
                            ) : filteredCompanies.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-20 text-slate-500 font-medium">Tidak ada data perusahaan yang sesuai.</TableCell></TableRow>
                            ) : filteredCompanies.map((company) => {
                                const emailInfo = emailLookup.byName.get(company.name.toLowerCase().trim()) || (company.code ? emailLookup.byCode.get(company.code.toUpperCase().trim()) : undefined);
                                return (
                                    <TableRow key={company.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                        <TableCell className="text-slate-400 font-mono text-xs text-center">{company.id}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono font-semibold text-[11px] bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-200">
                                                {company.code || 'N/A'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#0a2540] dark:text-blue-300 flex items-center justify-center border border-blue-100 dark:border-blue-900/50 shrink-0">
                                                    <Building2 size={15} />
                                                </div>
                                                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">{company.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {emailInfo?.email ? (
                                                <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                                    <Mail size={13} className="text-slate-400 shrink-0" />
                                                    <span className="truncate max-w-[220px]" title={emailInfo.email}>{emailInfo.email}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-xs">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-xs font-normal text-slate-500 leading-relaxed truncate max-w-xs">{company.address || '-'}</p>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(company)} className="w-7 h-7"><Pencil size={13} /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => setDeleteCompany(company)} className="w-7 h-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50"><Trash2 size={13} /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <CompanyFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSubmit} initialData={editingCompany} />
            <DangerConfirmModal isOpen={!!deleteCompany} onClose={() => setDeleteCompany(null)} onConfirm={executeDelete} title="Delete Company" message={`Permanently erase registry for "${deleteCompany?.name}"?`} isLoading={isProcessing} />
        </div>
    );
};

