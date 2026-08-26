// Credential Manager Module

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Trash2, Pencil, RefreshCcw, Key, Globe, User, Lock, Eye, EyeOff, Tag, ExternalLink, Copy, Check, Filter, X, LayoutGrid, List } from 'lucide-react';
import { Credential, UserAccount } from '../types';
import { CredentialFormModal } from './CredentialFormModal';
import { DangerConfirmModal } from './DangerConfirmModal';
import { supabase } from '../lib/supabaseClient';
import { trackActivity } from '../lib/auditLogger';
import { useToast } from './ToastProvider';
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { cn } from "@/lib/utils";


interface CredentialManagerProps {
  currentUser: UserAccount | null;
}

const CredentialManager: React.FC<CredentialManagerProps> = ({ currentUser }) => {
  const { showToast } = useToast();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [deleteCredential, setDeleteCredential] = useState<Credential | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // NEW STATES: Layout & Pagination & QR
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedQr, setSelectedQr] = useState<Credential | null>(null);
  const itemsPerPage = 8;

  // SECURITY GATE STATES
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showGateError, setShowGateError] = useState(false);
  
  // LOGIC: Unlock Gate
  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (unlockPassword === 'Rahasia1!') {
      setIsUnlocked(true);
      showToast("Access Granted. Security Vault Unlocked.", "success");
    } else {
      setShowGateError(true);
      setTimeout(() => setShowGateError(false), 2000);
      showToast("Incorrect Security Password", "error");
    }
  };

  const categories = [
    'All', 'Provider Inet', 'Subscription', 'Account', 'WiFi', 
    'Web&Domain', 'CCTV', 'PABX', 'Database', 'Sircon71', 
    'Sircon72', 'Sircon73', 'Gesit 26', 'Gesit 27', 'AAMS'
  ];


  const fetchData = async () => {
    setIsLoading(true);
    try {
      // MENGGUNAKAN RPC UNTUK MENDEKRIPSI PASSWORD DI SISI DATABASE
      const { data, error } = await supabase
        .rpc('get_decrypted_credentials');

      if (error) throw error;
      
      // Mapping agar sinkron dengan property di Frontend (CamelCase)
      const mapped = (data || []).map((c: any) => ({
        ...c,
        serviceUrl: c.service_url // Pastikan snake_case dari DB diubah ke camelCase
      }));
      
      setCredentials(mapped);
      
      console.log("Vault synced and decrypted successfully");
    } catch (err: any) {
      console.error('Fetch Error:', err);
      showToast(err.message || 'Failed to sync with vault', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCredentials = useMemo(() => {
    return credentials.filter(c => {
      const matchesSearch = (c.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' ? true : c.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [credentials, searchTerm, categoryFilter]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast("Copied to clipboard", "success");
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAdd = () => {
    setEditingCredential(null);
    setIsModalOpen(true);
  };

  const handleEdit = (cred: Credential) => {
    setEditingCredential(cred);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteCredential) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('credentials').delete().eq('id', deleteCredential.id);
      if (error) throw error;

      await trackActivity(
        currentUser?.fullName || 'User',
        currentUser?.role || 'User',
        'Delete Credential',
        'CredentialManager',
        `Deleted credential: ${deleteCredential.title}`
      );

      showToast("Credential deleted successfully", "success");
      setDeleteCredential(null);
      fetchData();
    } catch (err: any) {
      showToast("Failed to delete: " + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (data: Partial<Credential>) => {
    setIsProcessing(true);
    const payload = {
      title: data.title,
      service_url: data.serviceUrl,
      username: data.username,
      password: data.password,
      notes: data.notes,
      category: data.category,
      metadata: data.metadata || {}, // MENYIMPAN DATA DINAMIS (Vendor, Device Type, dll)
      created_by: currentUser?.fullName || 'System',
      updated_at: new Date().toISOString()
    };

    try {
      if (editingCredential) {
        const { error } = await supabase.from('credentials').update(payload).eq('id', editingCredential.id);
        if (error) throw error;
        showToast("Credential updated", "success");
      } else {
        const { error } = await supabase.from('credentials').insert([payload]);
        if (error) throw error;
        showToast("Credential created", "success");
      }
      await trackActivity(currentUser?.fullName || 'User', currentUser?.role || 'User', editingCredential ? 'Update Credential' : 'Create Credential', 'CredentialManager', `${editingCredential ? 'Updated' : 'Created'} credential: ${payload.title}`);
      fetchData();
      setIsModalOpen(false);
      setCurrentPage(1);
    } catch (err: any) {
      showToast("Store failed: " + err.message, "error");
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-[400px] p-8 rounded-lg shadow-lg border-muted">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-md flex items-center justify-center mb-6">
              <Lock size={24} />
            </div>
            
            <div className="text-center mb-8">
              <CardTitle className="text-xl font-bold tracking-tight">Security Verification</CardTitle>
              <CardDescription className="text-sm mt-1">Enter the master password to unlock the registry.</CardDescription>
            </div>

            <form onSubmit={handleUnlock} className="w-full space-y-4">
              <div className="space-y-2">
                <Input 
                  type="password"
                  placeholder="Password"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  autoFocus
                  className={`h-11 ${showGateError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
              </div>
              
              <Button 
                type="submit"
                className="w-full dark: font-semibold"
              >
                Unlock Vault
              </Button>
            </form>
            
            <div className="mt-8 flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              AES-256 Encrypted Session
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 py-4 sm:py-6 px-0 sm:px-4 animate-in fade-in duration-700 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground uppercase">Secret Vault</h1>
          <p className="text-muted-foreground text-sm font-medium mt-0.5">Manage and secure your infrastructure credentials</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-card border rounded-lg shadow-sm shrink-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Total</p>
            <p className="text-lg font-bold">{credentials.length}</p>
          </div>
          <Button 
            size="sm"
            onClick={handleAdd}
            className="h-9 px-4 font-bold uppercase tracking-widest text-[11px] gap-1.5 shrink-0"
          >
            <Plus size={14} /> <span className="hidden sm:inline">Add New Secret</span><span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* SEARCH OR FILTERS */}
      <div className="bg-card p-3 rounded-lg border shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input 
              placeholder="Search by title, username, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 h-10 bg-muted/20 border-muted-foreground/10 focus-visible:ring-1 focus-visible:ring-primary font-medium text-sm"
            />
          </div>
          
          <Tabs value={viewLayout} onValueChange={(val) => setViewLayout(val as 'grid' | 'table')} className="w-auto shrink-0">
            <TabsList>
              <TabsTrigger value="grid">
                <LayoutGrid size={14} className="sm:mr-2" /> <span className="hidden sm:inline">GRID</span>
              </TabsTrigger>
              <TabsTrigger value="table">
                <List size={14} className="sm:mr-2" /> <span className="hidden sm:inline">TABLE</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* MODERN STANDARDIZED TABS */}
        <div className="mt-2 text-left">
          <Tabs value={categoryFilter} onValueChange={(val) => { setCategoryFilter(val); setCurrentPage(1); }} className="w-full">
            <TabsList 
                variant="line" 
                className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none no-scrollbar justify-start px-0"
            >
              {categories.map(cat => (
                <TabsTrigger
                  key={cat}
                  value={cat}
                >
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="h-[260px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredCredentials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-muted/10 rounded-lg border-2 border-dashed">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Search size={24} className="text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold">No credentials found</h3>
          <p className="text-muted-foreground text-sm">Try adjusting your search or filter to find what you're looking for.</p>
        </div>
      ) : (
        <>
          {viewLayout === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCredentials.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((cred) => (
                <div key={cred.id} className="group bg-card p-6 rounded-lg border shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center"><Key size={18} /></div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase text-xs truncate max-w-[150px]">{cred.title}</h3>
                          <div className="flex items-center gap-2 mt-0.5"><Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-tighter rounded-sm px-1.5 h-4">{cred.category}</Badge></div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(cred)} className="w-8 text-muted-foreground hover:text-primary"><Pencil size={14} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteCredential(cred)} className="w-8 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 p-3 bg-muted/30 rounded-md border">
                      {(() => {
                        const fields: Record<string, any> = { ...(cred.metadata || {}) };
                        if (cred.serviceUrl) fields.serviceUrl = cred.serviceUrl;
                        const priority = ['entity', 'type', 'speed', 'vendor', 'serviceUrl', 'address'];
                        const keys = [...priority, ...Object.keys(fields).filter(k => !priority.includes(k))];
                        return keys.map(key => {
                          const value = fields[key];
                          if (!value || value === '-') return null;

                          // CUSTOM LABELS PER CATEGORY
                          let displayLabel = key.replace(/([A-Z])/g, ' $1').trim();
                          if (key === 'serviceUrl') displayLabel = 'Link';
                          if (key === 'address' && cred.category === 'Provider Inet') displayLabel = 'IP / IP Public';
                          if (key === 'speed' && cred.category === 'Provider Inet') displayLabel = 'Plan / Speed';

                          return (
                            <div key={key} className="space-y-0.5 min-w-0">
                              <p className="text-[7px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest truncate">
                                {displayLabel}
                              </p>
                              <p className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate">{value}</p>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    <div className="space-y-2 mt-4 pt-4 border-t border-slate-50 dark:border-zinc-700">
                      <div className="flex items-center justify-between group/field">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-500">
                            {cred.category === 'Provider Inet' ? <Tag size={12}/> : <User size={12}/>}
                          </div>
                          <div className="flex flex-col">
                            {cred.category === 'Provider Inet' && <span className="text-[7px] font-black text-slate-400 dark:text-zinc-500 uppercase">ID Pelanggan</span>}
                            <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 truncate max-w-[120px]">{cred.username}</span>
                          </div>
                        </div>
                        <button onClick={() => handleCopy(cred.username, `${cred.id}-user`)} className="p-1.5 text-slate-300 hover:text-indigo-500 transition-colors">{copiedId === `${cred.id}-user` ? <Check size={12}/> : <Copy size={12}/>}</button>
                      </div>
                      {cred.category !== 'Provider Inet' && (
                        <div className="flex items-center justify-between group/field">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-500"><Lock size={12}/></div>
                            <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 font-mono tracking-widest">
                              {showPasswordMap[cred.id as string] ? cred.password : '••••••••'}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => togglePasswordVisibility(cred.id as string)} className="p-1.5 text-slate-300 hover:text-indigo-500 transition-colors">
                              {showPasswordMap[cred.id as string] ? <EyeOff size={12}/> : <Eye size={12}/>}
                            </button>
                            <button onClick={() => handleCopy(cred.password || '', `${cred.id}-pass`)} className="p-1.5 text-slate-300 hover:text-indigo-500 transition-colors">
                              {copiedId === `${cred.id}-pass` ? <Check size={12}/> : <Copy size={12}/>}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    {/* WIFI QR GENERATOR */}
                    {cred.category === 'WiFi' && (
                      <button 
                        onClick={() => setSelectedQr(cred)}
                        className="mt-4 flex items-center gap-2 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hover:text-emerald-700 transition-colors group/link w-fit"
                      >
                        <Globe size={12} className="text-emerald-500" /> Generate WiFi QR <ExternalLink size={10} className="opacity-50" />
                      </button>
                    )}

                    {(() => {
                      if (cred.category === 'Provider Inet') return null;
                      const targetUrl = cred.serviceUrl || cred.metadata?.serviceUrl || cred.metadata?.address;
                      if (!targetUrl || targetUrl === '-' || targetUrl.trim() === '') return null;
                      return <a href={targetUrl.startsWith('http') ? targetUrl : `http://${targetUrl}`} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-2 text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:text-indigo-700 transition-colors group/link w-fit"><Globe size={12} /> Visit Portal <ExternalLink size={10} className="opacity-50" /></a>;
                    })()}
                    {cred.notes && <p className="mt-4 text-[9px] text-slate-400 dark:text-zinc-500 leading-relaxed bg-slate-50 dark:bg-zinc-800/10 p-2 rounded-lg italic border-l-2 border-indigo-200 dark:border-indigo-800 line-clamp-3 overflow-hidden">{cred.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12">Secret Name</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12">Category</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12">Username</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12">Password</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12">Metadata</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCredentials.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((cred) => (
                    <TableRow key={cred.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <TableCell className="py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><Key size={14} /></div><span className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300">{cred.title}</span></div></TableCell>
                      <TableCell><Badge variant="secondary" className="text-[9px] font-black uppercase py-0">{cred.category}</Badge></TableCell>
                      <TableCell><div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">{cred.username}</span><button onClick={() => handleCopy(cred.username, `${cred.id}-user`)} className="text-slate-300 hover:text-indigo-500">{copiedId === `${cred.id}-user` ? <Check size={10}/> : <Copy size={10}/>}</button></div></TableCell>
                      <TableCell><div className="flex items-center gap-2"><span className="text-xs font-mono tracking-widest text-slate-500">{showPasswordMap[cred.id as string] ? cred.password : '••••••••'}</span><button onClick={() => togglePasswordVisibility(cred.id as string)} className="text-slate-300 hover:text-indigo-500">{showPasswordMap[cred.id as string] ? <EyeOff size={12}/> : <Eye size={12}/>}</button></div></TableCell>
                      <TableCell><div className="flex flex-wrap gap-1">{Object.entries(cred.metadata || {}).slice(0, 3).map(([key, val]) => val && val !== '-' && (<span key={key} className="px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded text-[9px] font-bold text-slate-500">{val}</span>))}</div></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {cred.category === 'WiFi' && (
                            <button onClick={() => setSelectedQr(cred)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"><RefreshCcw size={14} /></button>
                          )}
                          <button onClick={() => handleEdit(cred)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Pencil size={14} /></button>
                          <button onClick={() => setDeleteCredential(cred)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t mt-5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center sm:text-left">
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredCredentials.length)}–{Math.min(currentPage * itemsPerPage, filteredCredentials.length)} of {filteredCredentials.length}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest">Prev</Button>
              {Array.from({ length: Math.ceil(filteredCredentials.length / itemsPerPage) }).map((_, i) => (
                <Button key={i} variant={currentPage === i + 1 ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(i + 1)} className={cn("h-8 w-8 p-0 text-[10px] font-bold", currentPage === i + 1 ? "bg-primary" : "")}>{i + 1}</Button>
              ))}
              <Button variant="outline" size="sm" disabled={currentPage === Math.ceil(filteredCredentials.length / itemsPerPage)} onClick={() => setCurrentPage(prev => prev + 1)} className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest">Next</Button>
            </div>
          </div>
        </>
      )}

      <CredentialFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleSubmit} 
        initialData={editingCredential} 
      />
      
      {deleteCredential && (
        <DangerConfirmModal 
          isOpen={!!deleteCredential} 
          onClose={() => setDeleteCredential(null)} 
          onConfirm={handleDelete} 
          title="Delete Secret" 
          message={`Are you sure you want to delete "${deleteCredential?.title}"? This action is permanent and stored passwords cannot be recovered.`} 
          confirmText="Yes, Delete Permanently" 
          isLoading={isProcessing} 
        />
      )}

      {/* WIFI QR MODAL */}
      {selectedQr && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedQr(null)}>
          <div className="bg-card p-8 rounded-lg shadow-2xl w-full max-w-sm text-center border animate-in zoom-in-95 duration-500" onClick={e => e.stopPropagation()}>
            <div className="relative mb-6 flex justify-center">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 mb-2">
                <RefreshCcw size={32} />
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedQr(null)} className="absolute top-0 right-0 text-muted-foreground"><X size={20}/></Button>
            </div>
            
            <h3 className="text-xl font-bold uppercase tracking-tight mb-1">{selectedQr.title}</h3>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">Scan to Connect WiFi</p>
            
            <div className="bg-white p-4 rounded-md inline-block border-4 border-muted shadow-inner mb-6 mx-auto">
              {/* WIFI QR FORMAT: WIFI:S:<SSID>;T:WPA;P:<PASSWORD>;; */}
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`WIFI:S:${selectedQr.title};T:WPA;P:${selectedQr.password};;`)}`} 
                alt="WiFi QR Code" 
                className="w-48 h-48 rounded-sm"
              />
            </div>
            
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-md border">
                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1">PASSWORD</p>
                <p className="text-sm font-bold text-primary font-mono tracking-wider">{selectedQr.password}</p>
              </div>
              <Button onClick={() => setSelectedQr(null)} className="w-full font-bold uppercase tracking-widest">Close Vault</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CredentialManager;

