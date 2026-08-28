import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { exportToExcel } from '../lib/excelExport';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Building2, 
  MapPin, 
  Scale, 
  Store, 
  Landmark, 
  User, 
  ExternalLink, 
  Save, 
  UserPlus, 
  ShieldCheck, 
  LayoutGrid,
  List,
  Edit3,
  Trash2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface CSLDirectoryManagerProps {
  currentUser: UserAccount | null;
  category?: 'all' | 'lawyer' | 'vendor' | 'government' | 'other';
}

export interface ContactItem {
  id: number | string;
  name: string;
  category: 'Lawyer' | 'Vendor' | 'Government' | 'Other';
  organization: string;
  phone: string;
  email: string;
  city: string;
  notes?: string;
  licenseNo?: string;
}

const MOCK_CONTACTS: ContactItem[] = [
  { id: 1, name: 'Adv. Herman Suryadi, S.H., M.H.', category: 'Lawyer', organization: 'Herman & Partners Law Firm', phone: '+62 811-2345-6789', email: 'herman@hplaw.co.id', city: 'Jakarta Selatan', notes: 'Corporate Litigation, M&A & Contract Drafting', licenseNo: 'PERADI / 98124/2012' },
  { id: 2, name: 'Kantor Notaris Dra. Linda Wijaya, S.H.', category: 'Lawyer', organization: 'Notaris & PPAT Linda Wijaya', phone: '+62 21-555-0192', email: 'notaris.linda@gmail.com', city: 'Jakarta Pusat', notes: 'Deed preparation, RUPS minutes & company incorporation', licenseNo: 'SK Kemenkumham / 2015' },
  { id: 3, name: 'Direktorat Jenderal AHU', category: 'Government', organization: 'Kementerian Hukum & HAM RI', phone: '+62 21-5255-880', email: 'ahu@kemenkumham.go.id', city: 'Jakarta Selatan', notes: 'Company legal entity approvals and statutory filings' },
  { id: 4, name: 'Layanan BKPM / OSS', category: 'Government', organization: 'Kementerian Investasi / BKPM', phone: '163', email: 'kontak@oss.go.id', city: 'Jakarta Selatan', notes: 'NIB, Business License & OSS RBA Support' },
  { id: 5, name: 'PT Solusi Terpadu Legal', category: 'Vendor', organization: 'PT Solusi Terpadu', phone: '+62 21-3890-112', email: 'info@solusilegal.co.id', city: 'Jakarta Barat', notes: 'Legal translation & document legalization services' },
  { id: 6, name: 'BPN Jakarta Pusat', category: 'Government', organization: 'Badan Pertanahan Nasional', phone: '+62 21-3844-098', email: 'kantah.jakpus@atrbpn.go.id', city: 'Jakarta Pusat', notes: 'HGB and Land title verification' },
];

export const CSLDirectoryManager: React.FC<CSLDirectoryManagerProps> = ({ currentUser, category = 'all' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [contacts, setContacts] = useState<ContactItem[]>(MOCK_CONTACTS);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  
  // Modals & Feedback state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ContactItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  
  // Pagination state
  const ITEMS_PER_PAGE = 9;
  const [currentPage, setCurrentPage] = useState(1);

  // Copy-to-clipboard state: stores the id+field that was just copied
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    category: 'Lawyer' | 'Vendor' | 'Government' | 'Other';
    organization: string;
    phone: string;
    email: string;
    city: string;
    notes: string;
  }>({
    name: '',
    category: (category === 'all' ? 'Lawyer' : category.charAt(0).toUpperCase() + category.slice(1)) as any,
    organization: '',
    phone: '',
    email: '',
    city: '',
    notes: '',
  });

  const showFeedback = (msg: string) => {
    setFeedbackBanner(msg);
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('csl_contacts').select('*').order('name');
      if (!error && data && data.length > 0) {
        const formatted: ContactItem[] = data.map(item => ({
          id: item.id,
          name: item.name || '',
          category: item.category || 'Other',
          organization: item.organization || '-',
          phone: item.phone || '',
          email: item.email || '-',
          city: item.city || 'Jakarta',
          notes: item.notes || '',
          licenseNo: item.license_no || item.licenseNo
        }));
        setContacts(formatted);
      } else if (data && data.length === 0) {
        setContacts([]);
      }
    } catch (err) {
      console.warn('Using local fallback for contacts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchContacts(); 
  }, []);

  const openAddModal = () => {
    setEditingContact(null);
    let defaultCat: 'Lawyer' | 'Vendor' | 'Government' | 'Other' = 'Lawyer';
    if (category === 'vendor') defaultCat = 'Vendor';
    if (category === 'government') defaultCat = 'Government';
    if (category === 'other') defaultCat = 'Other';

    setFormData({
      name: '',
      category: defaultCat,
      organization: '',
      phone: '',
      email: '',
      city: 'Jakarta',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (contact: ContactItem) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      category: contact.category,
      organization: contact.organization === '-' ? '' : contact.organization,
      phone: contact.phone,
      email: contact.email === '-' ? '' : contact.email,
      city: contact.city,
      notes: contact.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) return;

    setIsSubmitting(true);
    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      organization: formData.organization.trim() || '-',
      phone: formData.phone.trim(),
      email: formData.email.trim() || '-',
      city: formData.city.trim() || 'Jakarta',
      notes: formData.notes.trim(),
    };

    try {
      if (editingContact) {
        // UPDATE
        const { error } = await supabase
          .from('csl_contacts')
          .update(payload)
          .eq('id', editingContact.id);

        if (error) throw error;
        showFeedback(`Kontak "${payload.name}" berhasil diperbarui!`);
      } else {
        // CREATE
        const { data, error } = await supabase
          .from('csl_contacts')
          .insert([payload])
          .select();

        if (error) throw error;
        showFeedback(`Kontak baru "${payload.name}" berhasil ditambahkan!`);
      }
      setIsModalOpen(false);
      fetchContacts();
    } catch (err) {
      console.error('Failed to save contact:', err);
      // Fallback local update
      if (editingContact) {
        setContacts(prev => prev.map(c => c.id === editingContact.id ? { ...c, ...payload } : c));
      } else {
        setContacts(prev => [{ id: Date.now(), ...payload }, ...prev]);
      }
      showFeedback(`Kontak "${payload.name}" tersimpan!`);
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const target = deleteConfirm;

    try {
      await supabase.from('csl_contacts').delete().eq('id', target.id);
      showFeedback(`Kontak "${target.name}" telah dihapus.`);
      fetchContacts();
    } catch (err) {
      console.error('Delete failed:', err);
      setContacts(prev => prev.filter(c => c.id !== target.id));
      showFeedback(`Kontak "${target.name}" telah dihapus.`);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleExportExcel = () => {
    if (filteredContacts.length === 0) {
      showFeedback('Tidak ada data kontak untuk diexport.');
      return;
    }

    const exportData = filteredContacts.map((c, index) => ({
      'No': index + 1,
      'Nama Lengkap / Gelar': c.name,
      'Kategori': c.category,
      'Firma / Instansi': c.organization,
      'No. Telepon': c.phone,
      'Email': c.email,
      'Kota': c.city,
      'Catatan / Spesialisasi': c.notes || '-'
    }));

    const categorySuffix = category === 'all' ? 'All' : category.toUpperCase();
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Phone_Directory_CSL_${categorySuffix}_${dateStr}`;

    exportToExcel(exportData, fileName, 'Phone Directory');
    showFeedback(`Berhasil mengekspor ${exportData.length} kontak ke file Excel (.xlsx)!`);
  };

  const filteredContacts = contacts.filter(c => {
    const matchesCategory = 
      category === 'all' ? true :
      c.category.toLowerCase() === category.toLowerCase();
    
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // Reset to page 1 whenever search/filter changes
  const totalPages = Math.ceil(filteredContacts.length / ITEMS_PER_PAGE);
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Helper: go to page 1 on search change
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const getPageMeta = () => {
    switch (category) {
      case 'lawyer': return { title: 'Lawyers & Notaries Directory', desc: 'Retainer legal counsel, litigation attorneys, PPAT, and notary offices', icon: Scale };
      case 'vendor': return { title: 'Legal Vendors & Sworn Translators', desc: 'Certified legal translation agencies, document legalization, and IP attorneys', icon: Store };
      case 'government': return { title: 'Government Agencies & Ministries', desc: 'Kemenkumham, OSS BKPM, BPN, Tax Office, and provincial authority contacts', icon: Landmark };
      case 'other': return { title: 'Other External Contacts', desc: 'External advisors, consultants, and emergency legal escalations', icon: User };
      default: return { title: 'All Phone Directory Contacts', desc: 'Centralized phone directory for legal counsel, partners, vendors, and statutory agencies', icon: Phone };
    }
  };

  const meta = getPageMeta();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
      <PageHeader title={meta.title} description={meta.desc}>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleExportExcel} 
            variant="outline" 
            size="sm" 
            className="border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-bold text-xs h-9 px-4 rounded-xl shadow-sm"
          >
            <Download className="h-4 w-4 mr-1.5" /> Export Excel
          </Button>
          <Button 
            onClick={openAddModal} 
            size="sm" 
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Contact
          </Button>
        </div>
      </PageHeader>

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>{feedbackBanner}</span>
          </div>
          <button onClick={() => setFeedbackBanner(null)} className="text-emerald-600 hover:text-emerald-900 font-black">✕</button>
        </div>
      )}

      {/* KPI Cards when in All View */}
      {category === 'all' && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 dark:from-indigo-600 dark:to-indigo-900 border-none p-5 rounded-3xl shadow-lg shadow-indigo-200 dark:shadow-none flex flex-col justify-between relative overflow-hidden text-white">
            <Phone size={100} className="absolute -right-6 -bottom-6 opacity-10 rotate-12" />
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-indigo-100">Total Directory</span>
              <p className="text-4xl font-black mt-1">{contacts.length}</p>
            </div>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-3xl shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lawyers & Notaries</span>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 group-hover:scale-110 transition-transform">
                <Scale size={18} />
              </div>
            </div>
            <p className="text-3xl font-black text-purple-600 mt-4">{contacts.filter(c => c.category === 'Lawyer').length}</p>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-3xl shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Govt Agencies</span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 group-hover:scale-110 transition-transform">
                <Landmark size={18} />
              </div>
            </div>
            <p className="text-3xl font-black text-amber-600 mt-4">{contacts.filter(c => c.category === 'Government').length}</p>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-3xl shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Legal Vendors</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 group-hover:scale-110 transition-transform">
                <Store size={18} />
              </div>
            </div>
            <p className="text-3xl font-black text-blue-600 mt-4">{contacts.filter(c => c.category === 'Vendor').length}</p>
          </div>
        </div>
      )}

      {/* Search & View Switcher Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border/40 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input 
            placeholder={`Search ${meta.title.toLowerCase()} by name, firm, agency, or notes...`} 
            className="pl-10 text-sm bg-muted/30 border-border/20 rounded-xl h-10 w-full"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* View Mode Toggle: Grid / Card vs Table */}
        <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border/30 shrink-0 self-end sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'grid' 
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid size={14} /> Card View
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'table' 
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List size={14} /> Table View
          </button>
        </div>
      </div>

      {/* Content Rendering: Grid vs Table */}
      {loading ? (
        <div className="bg-card border border-border/40 rounded-2xl p-12 text-center text-muted-foreground flex items-center justify-center gap-2 font-bold text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" /> Loading contacts directory...
        </div>
      ) : viewMode === 'grid' ? (
        /* ── GRID / CARD VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedContacts.map(contact => {
            const getInitials = (name: string) => name.replace(/(Adv\.|S\.H\.|M\.H\.|Dra\.|PT|Kantor Notaris)/gi, '').trim().substring(0, 2).toUpperCase();
            const catColors = { Lawyer: 'from-purple-500 to-fuchsia-600 text-white', Government: 'from-amber-500 to-orange-600 text-white', Vendor: 'from-blue-500 to-cyan-600 text-white', Other: 'from-slate-500 to-slate-700 text-white' };
            const catBg = catColors[contact.category] || catColors['Other'];
            return (
              <div key={contact.id} className="bg-card border border-border/40 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group">
                <div className={`h-16 bg-gradient-to-r ${catBg} opacity-90 relative`}>
                  <div className="absolute right-3 top-3 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-sm">{contact.category}</div>
                </div>
                <div className="px-5 pb-5 flex-1 flex flex-col">
                  <div className="-mt-8 mb-3">
                    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-900 border-4 border-card shadow-sm flex items-center justify-center text-xl font-black text-indigo-900 dark:text-indigo-100 overflow-hidden relative">
                      <div className={`absolute inset-0 bg-gradient-to-br ${catBg} opacity-10`}></div>
                      {getInitials(contact.name)}
                    </div>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    <h3 className="font-black text-base text-foreground tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">{contact.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium"><Building2 size={13} className="text-muted-foreground/60 shrink-0" /> {contact.organization}</p>
                  </div>
                  {contact.licenseNo && (
                    <div className="mb-3 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-zinc-800/50 px-2.5 py-1.5 rounded-lg w-fit flex items-center gap-1.5 border border-slate-200/50 dark:border-zinc-700/50">
                      <ShieldCheck size={12} className="text-indigo-500" /> {contact.licenseNo}
                    </div>
                  )}
                  {contact.notes && <p className="text-xs text-muted-foreground/80 leading-relaxed font-medium line-clamp-2 mb-4 flex-1">{contact.notes}</p>}
                  <div className="space-y-2 pt-4 border-t border-border/40 mt-auto">
                    <button onClick={() => copyToClipboard(contact.phone, `${contact.id}-phone`)} className="w-full flex items-center justify-between gap-2 text-xs font-bold text-foreground hover:bg-indigo-50 dark:hover:bg-indigo-950/20 px-2 py-1.5 rounded-lg transition-colors group/copy">
                      <span className="flex items-center gap-2"><div className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600"><Phone size={10} /></div>{contact.phone}</span>
                      {copiedKey === `${contact.id}-phone` ? <Check size={12} className="text-emerald-500" /> : <Copy size={11} className="text-slate-300 group-hover/copy:text-indigo-400 transition-colors" />}
                    </button>
                    {contact.email && contact.email !== '-' && (
                      <button onClick={() => copyToClipboard(contact.email, `${contact.id}-email`)} className="w-full flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground hover:bg-slate-50 dark:hover:bg-zinc-800/50 px-2 py-1.5 rounded-lg transition-colors group/copy">
                        <span className="flex items-center gap-2 truncate"><div className="w-5 h-5 rounded-md bg-slate-50 dark:bg-zinc-800/50 flex items-center justify-center text-slate-400 shrink-0"><Mail size={10} /></div><span className="truncate">{contact.email}</span></span>
                        {copiedKey === `${contact.id}-email` ? <Check size={12} className="text-emerald-500 shrink-0" /> : <Copy size={11} className="text-slate-300 group-hover/copy:text-slate-400 transition-colors shrink-0" />}
                      </button>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest"><MapPin size={11} /> {contact.city}</div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(contact)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 dark:bg-zinc-800 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"><Edit3 size={13} /></button>
                        <button onClick={() => setDeleteConfirm(contact)} className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 dark:bg-zinc-800 dark:hover:bg-red-950/40 rounded-lg transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <div className="bg-card border border-border/40 rounded-3xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/30">
                <TableHead className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-widest pl-6">Contact Details</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-widest">Category</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-widest">Phone</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-widest">Email</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-widest">City</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-widest text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedContacts.map(contact => {
                const getInitials = (name: string) => name.replace(/(Adv\.|S\.H\.|M\.H\.|Dra\.|PT|Kantor Notaris)/gi, '').trim().substring(0, 2).toUpperCase();
                const catColors = { Lawyer: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30', Government: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30', Vendor: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30', Other: 'text-slate-600 bg-slate-50 dark:bg-zinc-800' };
                return (
                <TableRow key={contact.id} className="border-border/20 hover:bg-muted/30 transition-colors group">
                  <TableCell className="py-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border border-white/50 ${catColors[contact.category] || catColors['Other']}`}>{getInitials(contact.name)}</div>
                      <div>
                        <div className="font-bold text-sm text-foreground tracking-tight group-hover:text-indigo-600 transition-colors">{contact.name}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 font-medium"><Building2 size={11} className="text-muted-foreground/60" /> {contact.organization}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${ contact.category === 'Lawyer' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300' : contact.category === 'Government' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : contact.category === 'Vendor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'}`}>{contact.category}</span>
                  </TableCell>
                  <TableCell className="py-4">
                    <button onClick={() => copyToClipboard(contact.phone, `${contact.id}-phone`)} className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground hover:text-indigo-600 transition-colors group/cp">
                      {contact.phone}
                      {copiedKey === `${contact.id}-phone` ? <Check size={12} className="text-emerald-500" /> : <Copy size={11} className="text-slate-300 group-hover/cp:text-indigo-400 transition-colors" />}
                    </button>
                  </TableCell>
                  <TableCell className="py-4 text-xs">
                    {contact.email && contact.email !== '-' ? (
                      <button onClick={() => copyToClipboard(contact.email, `${contact.id}-email`)} className="flex items-center gap-1.5 text-muted-foreground hover:text-indigo-600 transition-colors group/ce font-medium">
                        {contact.email}
                        {copiedKey === `${contact.id}-email` ? <Check size={12} className="text-emerald-500" /> : <Copy size={11} className="text-slate-300 group-hover/ce:text-indigo-400 transition-colors" />}
                      </button>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{contact.city}</TableCell>
                  <TableCell className="py-4 text-right pr-6">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(contact)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"><Edit3 size={15} /></button>
                      <button onClick={() => setDeleteConfirm(contact)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between bg-card border border-border/40 rounded-2xl px-5 py-3 shadow-sm">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredContacts.length)} of {filteredContacts.length} contacts
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-2 rounded-xl border border-border/40 bg-white dark:bg-zinc-800 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                  page === currentPage
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                    : 'border border-border/40 bg-white dark:bg-zinc-800 text-muted-foreground hover:text-foreground'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-2 rounded-xl border border-border/40 bg-white dark:bg-zinc-800 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {!loading && filteredContacts.length === 0 && (
        <div className="bg-card border border-border/40 rounded-2xl p-12 text-center text-muted-foreground space-y-2">
          <Phone className="h-10 w-10 mx-auto opacity-20" />
          <p className="font-bold text-sm text-foreground">No contacts found</p>
          <p className="text-xs opacity-70">Try adjusting your search query or add a new contact</p>
        </div>
      )}

      {/* ── ADD / EDIT CONTACT MODAL ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden font-sans border border-border/60 shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <UserPlus size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest">Phone Directory</span>
            </div>
            <DialogTitle className="text-xl font-black text-foreground">
              {editingContact ? 'Edit Contact' : 'Add New Contact'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {editingContact ? 'Update contact details in the directory.' : 'Add legal counsel, notary, vendor, or government contact.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div>
              <label className="text-[11px] font-bold text-foreground mb-1 block">Category *</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full h-10 px-3 text-sm bg-muted/30 border border-border/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value="Lawyer">Lawyer / Notary</option>
                <option value="Government">Government Agency</option>
                <option value="Vendor">Legal Vendor / Translator</option>
                <option value="Other">Other Contact</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground mb-1 block">Full Name / Title *</label>
              <Input
                required
                placeholder="e.g. Adv. Herman Suryadi, S.H., M.H."
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="h-10 text-sm bg-muted/30"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground mb-1 block">Organization / Law Firm</label>
              <Input
                placeholder="e.g. Herman & Partners Law Firm / Kemenkumham"
                value={formData.organization}
                onChange={e => setFormData({ ...formData, organization: e.target.value })}
                className="h-10 text-sm bg-muted/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">Phone Number *</label>
                <Input
                  required
                  placeholder="+62 811-xxx-xxx"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="h-10 text-sm bg-muted/30 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">City</label>
                <Input
                  placeholder="e.g. Jakarta Selatan"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="h-10 text-sm bg-muted/30"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground mb-1 block">Email Address</label>
              <Input
                type="email"
                placeholder="info@firm.co.id"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="h-10 text-sm bg-muted/30"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground mb-1 block">Notes / Specialization</label>
              <textarea
                rows={3}
                placeholder="Specialization, deed services, OSS permits..."
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-3 text-xs bg-muted/30 border border-border/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium resize-none"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)} className="text-xs font-bold rounded-xl h-9">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">
                <Save size={14} className="mr-1.5" /> {isSubmitting ? 'Saving...' : 'Save Contact'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRMATION DIALOG ── */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md font-sans border border-border/60 shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
            <div className="flex items-center gap-2 text-red-500 mb-1">
              <AlertTriangle size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Delete Confirmation</span>
            </div>
            <DialogTitle className="text-xl font-black text-foreground">Delete Contact?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Are you sure you want to delete <strong>{deleteConfirm?.name}</strong> from the directory?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-6 pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)} className="text-xs font-bold rounded-xl h-9">Cancel</Button>
            <Button onClick={handleConfirmDelete} size="sm" className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl h-9 px-5">Confirm Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
