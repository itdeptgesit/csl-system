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
  Download
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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Modals & Feedback state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ContactItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

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
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-card border border-border/40 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-muted-foreground">Total Contacts</span>
              <p className="text-2xl font-black text-foreground mt-0.5">{contacts.length}</p>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
              <Phone size={20} />
            </div>
          </div>
          <div className="bg-card border border-border/40 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-muted-foreground">Lawyers & Notaries</span>
              <p className="text-2xl font-black text-purple-600 mt-0.5">{contacts.filter(c => c.category === 'Lawyer').length}</p>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600">
              <Scale size={20} />
            </div>
          </div>
          <div className="bg-card border border-border/40 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-muted-foreground">Government Agencies</span>
              <p className="text-2xl font-black text-amber-600 mt-0.5">{contacts.filter(c => c.category === 'Government').length}</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
              <Landmark size={20} />
            </div>
          </div>
          <div className="bg-card border border-border/40 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-muted-foreground">Legal Vendors</span>
              <p className="text-2xl font-black text-blue-600 mt-0.5">{contacts.filter(c => c.category === 'Vendor').length}</p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
              <Store size={20} />
            </div>
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
            onChange={(e) => setSearchTerm(e.target.value)}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredContacts.map(contact => (
            <div key={contact.id} className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 space-y-4 flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1 pr-2">
                    <h3 className="font-extrabold text-sm text-foreground tracking-tight group-hover:text-indigo-600 transition-colors">{contact.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Building2 size={13} className="text-muted-foreground/60 shrink-0" /> {contact.organization}
                    </p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg shrink-0 ${
                    contact.category === 'Lawyer' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300' :
                    contact.category === 'Government' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' :
                    contact.category === 'Vendor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' : 
                    'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}>
                    {contact.category}
                  </span>
                </div>

                {contact.licenseNo && (
                  <div className="text-[10px] font-mono font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg w-fit flex items-center gap-1">
                    <ShieldCheck size={11} /> {contact.licenseNo}
                  </div>
                )}

                {contact.notes && (
                  <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border/20 leading-relaxed font-medium">
                    {contact.notes}
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-border/20 text-xs font-medium">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-bold text-foreground">
                    <Phone size={13} className="text-indigo-600 shrink-0" /> {contact.phone}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
                    <MapPin size={11} /> {contact.city}
                  </span>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5 truncate text-muted-foreground">
                    <Mail size={13} className="text-indigo-600 shrink-0" /> {contact.email}
                  </span>
                  
                  {/* Card Actions: Edit & Delete */}
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    {contact.email && contact.email !== '-' && (
                      <a 
                        href={`mailto:${contact.email}`} 
                        title="Send Email"
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                    <button
                      onClick={() => openEditModal(contact)}
                      title="Edit Contact"
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-muted/60 rounded-lg transition-colors"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(contact)}
                      title="Delete Contact"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <div className="bg-card border border-border/40 rounded-2xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/30">
                <TableHead className="font-extrabold text-[11px] uppercase text-muted-foreground">Contact & Firm</TableHead>
                <TableHead className="font-extrabold text-[11px] uppercase text-muted-foreground">Category</TableHead>
                <TableHead className="font-extrabold text-[11px] uppercase text-muted-foreground">Phone</TableHead>
                <TableHead className="font-extrabold text-[11px] uppercase text-muted-foreground">Email</TableHead>
                <TableHead className="font-extrabold text-[11px] uppercase text-muted-foreground">City</TableHead>
                <TableHead className="font-extrabold text-[11px] uppercase text-muted-foreground">Notes / Specialization</TableHead>
                <TableHead className="font-extrabold text-[11px] uppercase text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map(contact => (
                <TableRow key={contact.id} className="border-border/20 hover:bg-muted/20 transition-colors">
                  <TableCell className="py-3">
                    <div className="font-bold text-sm text-foreground">{contact.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building2 size={11} className="text-muted-foreground/60" /> {contact.organization}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${
                      contact.category === 'Lawyer' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300' :
                      contact.category === 'Government' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' :
                      contact.category === 'Vendor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' : 
                      'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}>
                      {contact.category}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 font-mono text-xs font-bold text-foreground">
                    <div className="flex items-center gap-1.5">
                      <Phone size={12} className="text-indigo-600" /> {contact.phone}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-xs text-muted-foreground">
                    {contact.email && contact.email !== '-' ? (
                      <a href={`mailto:${contact.email}`} className="text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                        <Mail size={12} /> {contact.email}
                      </a>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin size={11} /> {contact.city}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-xs text-muted-foreground max-w-xs truncate font-medium">
                    {contact.notes || '—'}
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(contact)}
                        title="Edit Contact"
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-muted rounded-lg transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(contact)}
                        title="Delete Contact"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
