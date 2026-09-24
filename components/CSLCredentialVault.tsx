import React, { useState, useEffect, useMemo } from 'react';
import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Key,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Search,
  Trash2,
  Edit3,
  Globe,
  Sparkles,
  Database,
  ShieldCheck,
  LayoutGrid,
  List,
  Loader2,
  Users,
  ChevronDown,
  Link2,
  User2,
  Lock,
  StickyNote,
  Save,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import { trackActivity } from '../lib/auditLogger';
import {
  generateSalt,
  deriveVaultKey,
  encryptVaultData,
  decryptVaultData,
  createVerifierToken,
  generateStrongPassword,
  VaultSecretPayload,
} from '../lib/cryptoVault';

// ─── Fixed Internal Key ───────────────────────────────────────────────────────
// Key material yang hardcoded di sisi aplikasi.
// Data terenkripsi di DB tetapi tidak memerlukan input password dari user.
const FIXED_VAULT_KEY_MATERIAL = 'CSL_INTERNAL_VAULT_KEY_2024_GESIT_OFFSHORE';
const FIXED_VAULT_SALT_ID = 'csl_vault_fixed_salt_v1';

// Marker string untuk mendeteksi item yang gagal didekripsi
const DECRYPT_FAIL_MARKER = '[Gagal dekripsi]';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CredentialItem {
  id: number | string;
  title: string;
  category: string;
  website_url?: string;
  encrypted_data: string;
  iv: string;
  username_preview?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  decrypted?: VaultSecretPayload;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_CREDENTIALS = 'csl_vault_offline_data';

const CATEGORIES = [
  'Government',
  'Utilities',
  'Consultant (Corporate Agent)',
  'Other',
];

// ─── Category badge styling ───────────────────────────────────────────────────

function getCategoryBadgeClass(cat: string) {
  switch (cat) {
    case 'Pemerintahan & Regulasi':
      return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300';
    case 'Perbankan & Finansial':
      return 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300';
    case 'Internal CSL & Grup':
      return 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300';
    case 'Notaris & Konsultan':
      return 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300';
    case 'Vendor & Utilities':
      return 'border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300';
    default:
      return 'border-border bg-muted/60 text-foreground';
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const CSLCredentialVault: React.FC<{ currentUser?: UserAccount | null }> = ({ currentUser }) => {

  // — Vault state
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(true);

  // — Data & view
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCat, setActiveCat] = useState('Semua');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // — Interaction state
  const [revealedMap, setRevealedMap] = useState<Record<string | number, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // — Add/Edit modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CredentialItem | null>(null);
  const [form, setForm] = useState({
    title: '', category: CATEGORIES[0], website_url: '',
    nama_pt: '', username: '', password: '', notes: '',
  });
  const [showFormPass, setShowFormPass] = useState(false);

  // — SQL migration modal
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);

  // — Auto-initialize vault on mount using fixed internal key
  useEffect(() => { initVault(); }, []);

  /**
   * Initialize vault using a fixed internal key material.
   * Salt is stored in DB / localStorage to ensure the derived key is
   * always the same across sessions and devices.
   */
  async function initVault() {
    setIsLoading(true);
    try {
      let salt: string;

      // Try to fetch existing salt from DB
      const { data, error } = await supabase
        .from('csl_vault_config')
        .select('salt')
        .eq('id', FIXED_VAULT_SALT_ID)
        .maybeSingle();

      if (!error && data?.salt) {
        salt = data.salt;
        setIsDbConnected(true);
        localStorage.setItem('csl_vault_fixed_salt', salt);
      } else {
        // Fallback: try localStorage
        const localSalt = localStorage.getItem('csl_vault_fixed_salt');
        if (localSalt) {
          salt = localSalt;
          setIsDbConnected(false);
        } else {
          // First time: generate salt and persist
          salt = generateSalt();
          localStorage.setItem('csl_vault_fixed_salt', salt);
          // Try to persist to DB
          try {
            const newVerifierKey = await deriveVaultKey(FIXED_VAULT_KEY_MATERIAL, salt);
            const verifier = await createVerifierToken(newVerifierKey);
            await supabase.from('csl_vault_config').upsert({
              id: FIXED_VAULT_SALT_ID,
              salt,
              verifier_cipher: verifier.ciphertext,
              verifier_iv: verifier.iv,
              updated_at: new Date().toISOString(),
            });
            setIsDbConnected(true);
          } catch {
            setIsDbConnected(false);
          }
        }
      }

      // Derive vault key from fixed material + salt
      const key = await deriveVaultKey(FIXED_VAULT_KEY_MATERIAL, salt);
      setVaultKey(key);
      setIsReady(true);
      await loadCredentials(key);
    } catch (err: any) {
      toast.error('Gagal menginisialisasi vault: ' + err.message);
      setIsLoading(false);
    }
  }

  // — Load and decrypt all credentials
  async function loadCredentials(key: CryptoKey) {
    setIsLoading(true);
    let raw: any[] = [];
    try {
      const { data, error } = await supabase.from('csl_credentials').select('*').order('id', { ascending: false });
      if (!error && data) { raw = data; setIsDbConnected(true); }
      else throw new Error('db');
    } catch {
      setIsDbConnected(false);
      const local = localStorage.getItem(LS_CREDENTIALS);
      if (local) { try { raw = JSON.parse(local); } catch { raw = []; } }
    }

    const result: CredentialItem[] = [];
    for (const item of raw) {
      try {
        const dec = await decryptVaultData(item.encrypted_data, item.iv, key);
        result.push({ ...item, decrypted: dec });
      } catch {
        result.push({ ...item, decrypted: { username: '[Gagal dekripsi]', password: '' } });
      }
    }
    setCredentials(result);
    setIsLoading(false);
  }

  // — Supabase Realtime synchronization across all staff and admins
  useEffect(() => {
    if (!isReady || !vaultKey) return;

    const channel = supabase
      .channel('csl_credentials_live_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'csl_credentials' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const raw = payload.new as any;
            try {
              const dec = await decryptVaultData(raw.encrypted_data, raw.iv, vaultKey);
              setCredentials(prev => {
                if (prev.some(c => c.id === raw.id)) return prev;
                return [{ ...raw, decrypted: dec }, ...prev];
              });
            } catch {
              setCredentials(prev => {
                if (prev.some(c => c.id === raw.id)) return prev;
                return [{ ...raw, decrypted: { username: raw.username_preview || '[Terenkripsi]', password: '' } }, ...prev];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const raw = payload.new as any;
            try {
              const dec = await decryptVaultData(raw.encrypted_data, raw.iv, vaultKey);
              setCredentials(prev => prev.map(c => c.id === raw.id ? { ...raw, decrypted: dec } : c));
            } catch {
              setCredentials(prev => prev.map(c => c.id === raw.id ? { ...raw } : c));
            }
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setCredentials(prev => prev.filter(c => c.id !== oldId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isReady, vaultKey]);

  // — Copy helper
  function handleCopy(text: string, key: string, label: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} disalin.`);
    setTimeout(() => setCopiedKey(p => p === key ? null : p), 2000);
  }

  // — Reveal password (auto-hide after 15 s)
  function toggleReveal(id: string | number) {
    setRevealedMap(prev => {
      const next = !prev[id];
      if (next) setTimeout(() => setRevealedMap(c => ({ ...c, [id]: false })), 15000);
      return { ...prev, [id]: next };
    });
  }

  // — Open add / edit form
  function openAdd() {
    setEditingItem(null);
    setForm({ title: '', category: CATEGORIES[0], website_url: '', nama_pt: '', username: '', password: '', notes: '' });
    setShowFormPass(false);
    setIsFormOpen(true);
  }

  function openEdit(item: CredentialItem) {
    setEditingItem(item);
    setForm({
      title: item.title, category: item.category || CATEGORIES[0],
      website_url: item.website_url || '',
      nama_pt: item.decrypted?.nama_pt || '',
      username: item.decrypted?.username || '',
      password: item.decrypted?.password || '',
      notes: item.decrypted?.notes || '',
    });
    setShowFormPass(false);
    setIsFormOpen(true);
  }

  // — Generate password
  function handleGenerate() {
    const pwd = generateStrongPassword({ length: 18, includeSymbols: true, includeNumbers: true, includeUppercase: true });
    setForm(p => ({ ...p, password: pwd }));
    setShowFormPass(true);
    toast.success('Password kuat berhasil di-generate!');
  }

  // — Save credential (add or edit)
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!vaultKey) { toast.error('Vault belum siap.'); return; }
    if (!form.title.trim()) { toast.error('Nama layanan wajib diisi.'); return; }
    if (!form.username.trim()) { toast.error('Username wajib diisi.'); return; }
    if (!form.password) { toast.error('Password wajib diisi.'); return; }

    const authorName = currentUser?.fullName || currentUser?.username || 'CSL Team';

    setIsLoading(true);
    try {
      const secret: VaultSecretPayload = { username: form.username.trim(), password: form.password, nama_pt: form.nama_pt.trim() || undefined, notes: form.notes };
      const enc = await encryptVaultData(secret, vaultKey);

      const u = form.username.trim();
      const preview = u.includes('@')
        ? u.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '***' + c)
        : u.length > 4 ? u.slice(0, 2) + '***' + u.slice(-2) : u;

      if (editingItem) {
        // UPDATE
        try {
          const { data: updateData, error: updateErr } = await supabase.from('csl_credentials').update({
            title: form.title.trim(), category: form.category,
            website_url: form.website_url.trim() || null,
            encrypted_data: enc.ciphertext, iv: enc.iv,
            username_preview: preview, updated_at: new Date().toISOString(),
          }).eq('id', editingItem.id).select();

          if (updateErr) {
            console.error('Supabase update error:', updateErr);
            toast.error('Database update: ' + updateErr.message);
          } else if (!updateData || updateData.length === 0) {
            // Row not in DB (e.g. offline-created timestamp ID). Insert it to sync to DB!
            const { data: insertData } = await supabase.from('csl_credentials').insert([{
              title: form.title.trim(), category: form.category,
              website_url: form.website_url.trim() || null,
              encrypted_data: enc.ciphertext, iv: enc.iv,
              username_preview: preview, created_by: authorName,
              created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            }]).select().single();

            if (insertData?.id) {
              editingItem.id = insertData.id;
            }
          }
        } catch (e: any) { 
          console.error('Update DB exception:', e);
        }

        await trackActivity(
          authorName,
          currentUser?.role || 'Staff',
          'Update Credential',
          'Credential Vault',
          `Memperbarui kredensial: ${form.title.trim()} (${form.category})`
        );

        const updated: CredentialItem = {
          ...editingItem, title: form.title.trim(), category: form.category,
          website_url: form.website_url.trim() || undefined,
          encrypted_data: enc.ciphertext, iv: enc.iv, username_preview: preview,
          updated_at: new Date().toISOString(), decrypted: secret,
        };
        const next = credentials.map(c => c.id === editingItem.id ? updated : c);
        setCredentials(next);
        localStorage.setItem(LS_CREDENTIALS, JSON.stringify(next.map(({ decrypted: _, ...r }) => r)));
        toast.success('Kredensial berhasil diperbarui.');
      } else {
        // INSERT
        let inserted: CredentialItem | null = null;
        try {
          const { data, error } = await supabase.from('csl_credentials').insert([{
            title: form.title.trim(), category: form.category,
            website_url: form.website_url.trim() || null,
            encrypted_data: enc.ciphertext, iv: enc.iv,
            username_preview: preview, created_by: authorName,
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          }]).select().single();
          if (!error && data) inserted = { ...data, decrypted: secret };
        } catch { /* offline */ }

        await trackActivity(
          authorName,
          currentUser?.role || 'Staff',
          'Create Credential',
          'Credential Vault',
          `Menambahkan kredensial baru: ${form.title.trim()} (${form.category})`
        );

        if (!inserted) {
          inserted = {
            id: Date.now(), title: form.title.trim(), category: form.category,
            website_url: form.website_url.trim() || undefined,
            encrypted_data: enc.ciphertext, iv: enc.iv, username_preview: preview,
            created_by: authorName,
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            decrypted: secret,
          };
        }

        const next = [inserted, ...credentials];
        setCredentials(next);
        localStorage.setItem(LS_CREDENTIALS, JSON.stringify(next.map(({ decrypted: _, ...r }) => r)));
        toast.success('Kredensial baru berhasil disimpan & terenkripsi.');
      }
      setIsFormOpen(false);
    } catch (err: any) {
      toast.error('Gagal menyimpan: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // — Delete credential
  async function handleDelete(item: CredentialItem) {
    if (!confirm(`Hapus kredensial untuk "${item.title}"?`)) return;
    try { await supabase.from('csl_credentials').delete().eq('id', item.id); } catch { /* ignore */ }
    const authorName = currentUser?.fullName || currentUser?.username || 'CSL Team';
    await trackActivity(
      authorName,
      currentUser?.role || 'Staff',
      'Delete Credential',
      'Credential Vault',
      `Menghapus kredensial: ${item.title}`
    );
    const next = credentials.filter(c => c.id !== item.id);
    setCredentials(next);
    localStorage.setItem(LS_CREDENTIALS, JSON.stringify(next.map(({ decrypted: _, ...r }) => r)));
    toast.success('Kredensial dihapus.');
  }

  // — Filtered list
  const filtered = useMemo(() => credentials.filter(item => {
    const catOk = activeCat === 'Semua' || item.category === activeCat;
    const q = searchTerm.toLowerCase();
    const searchOk = !q ||
      item.title.toLowerCase().includes(q) ||
      (item.website_url || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.decrypted?.nama_pt || '').toLowerCase().includes(q) ||
      (item.decrypted?.username || '').toLowerCase().includes(q) ||
      (item.decrypted?.notes || '').toLowerCase().includes(q);
    return catOk && searchOk;
  }), [credentials, activeCat, searchTerm]);

  // ─── LOADING STATE ────────────────────────────────────────────────────────────

  if (!isReady) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12">
        <PageHeader
          title="Credential Vault"
          description="Penyimpanan akun & password bersama untuk seluruh Staff CSL dan Admin dengan enkripsi AES-256-GCM"
        />
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm font-medium">Memuat Credential Vault...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── MAIN VAULT VIEW ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <PageHeader
        title="Credential Vault"
        description="Kelola akun & password bersama tim CSL secara terenkripsi AES-256-GCM. Akses & input bersama untuk seluruh Staff CSL dan Admin."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={openAdd} className="h-9 text-xs">
            <Plus className="h-4 w-4 mr-1.5" /> Tambah Akun
          </Button>
        </div>
      </PageHeader>

      {/* DB warning banner */}
      {!isDbConnected && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 p-4 rounded-lg text-xs font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Tabel Supabase belum dibuat di database cloud. Jalankan skrip SQL di Supabase SQL Editor agar seluruh Staff CSL & Admin dapat mengakses data bersama di cloud.</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSqlModalOpen(true)}
            className="h-7 text-xs border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200"
          >
            Lihat & Salin SQL
          </Button>
        </div>
      )}

      {/* Info banner: shared access */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex items-center gap-3">
        <Users size={15} className="text-primary shrink-0" />
        <p className="text-xs text-foreground/80">
          <strong>Akses Bersama</strong> — Data vault dapat diakses oleh seluruh Staff CSL & Admin yang sudah login ke sistem. Terenkripsi AES-256-GCM.
        </p>
        <ShieldCheck size={14} className="text-emerald-500 shrink-0 ml-auto" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Akun', value: credentials.length, icon: Key },
          { label: 'Pemerintahan', value: credentials.filter(c => c.category === 'Pemerintahan & Regulasi').length, icon: Globe },
          { label: 'Perbankan', value: credentials.filter(c => c.category === 'Perbankan & Finansial').length, icon: ShieldCheck },
          { label: 'Internal CSL', value: credentials.filter(c => c.category === 'Internal CSL & Grup').length, icon: KeyRound },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card border border-border/40 p-5 rounded-lg shadow-sm flex flex-col justify-between hover:border-border/80 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
              <Icon size={16} className="text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold font-mono text-foreground mt-2">{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar: Search + Category + View Mode */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: search + category filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama, username, website..."
              className="pl-9 h-9 text-sm rounded-md"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); }}
            />
          </div>
          <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full sm:w-auto overflow-x-auto hide-scrollbar">
            {['Semua', ...CATEGORIES].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all ${activeCat === cat ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'
                  }`}
              >
                {cat === 'Semua' ? `Semua (${credentials.length})` : cat.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Right: View mode toggle */}
        <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground self-end sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-1 text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'
              }`}
          >
            <LayoutGrid size={14} className="mr-1" /> Grid
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-1 text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'
              }`}
          >
            <List size={14} className="mr-1" /> List
          </button>
        </div>
      </div>

      {/* Warning banner: gagal dekripsi */}
      {(() => {
        const failedCount = credentials.filter(c => c.decrypted?.username === DECRYPT_FAIL_MARKER).length;
        if (!failedCount) return null;
        return (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">{failedCount} kredensial gagal didekripsi</p>
              <p className="text-[11px] mt-0.5 text-destructive/80">
                Data ini dienkripsi dengan master password lama dan tidak bisa dibaca lagi. Hapus dan input ulang data tersebut.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Content */}
      {isLoading ? (
        <div className="bg-card border border-border/40 rounded-lg p-12 text-center text-muted-foreground flex items-center justify-center gap-2 font-bold text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-foreground/60" /> Memuat dan mendekripsi data...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border/40 rounded-lg p-12 text-center">
          <Key className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold text-foreground text-sm">
            {searchTerm ? 'Tidak ada hasil ditemukan' : 'Belum ada akun tersimpan'}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {searchTerm ? 'Coba ganti kata kunci.' : 'Tambahkan akun pertama Anda. Password dienkripsi otomatis.'}
          </p>
          {!searchTerm && (
            <Button size="sm" onClick={openAdd} className="mt-4 h-9 text-xs">
              <Plus className="h-4 w-4 mr-1.5" /> Tambah Akun
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ── GRID VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => {
            const revealed = !!revealedMap[item.id];
            const username = item.decrypted?.username || '';
            const password = item.decrypted?.password || '';
            const isDecryptFailed = username === DECRYPT_FAIL_MARKER;

            // ── Card: Gagal Dekripsi ──────────────────────────────────
            if (isDecryptFailed) {
              return (
                <div key={item.id} className="rounded-lg border border-destructive/40 bg-destructive/5 shadow-sm flex flex-col">
                  {/* Header */}
                  <div className="p-5 pb-4 flex items-start gap-3 border-b border-destructive/20">
                    <div className="w-9 h-9 rounded-md border border-destructive/30 bg-destructive/10 flex items-center justify-center text-sm font-semibold text-destructive shrink-0">
                      {item.title.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm text-foreground leading-tight truncate">{item.title}</h3>
                        <span className="inline-flex items-center rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive whitespace-nowrap shrink-0">
                          Gagal Dekripsi
                        </span>
                      </div>
                      {item.website_url && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.website_url.replace(/^https?:\/\//, '')}</p>
                      )}
                    </div>
                  </div>
                  {/* Body */}
                  <div className="p-4 flex-1">
                    <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                      <AlertTriangle size={13} className="text-destructive shrink-0 mt-0.5" />
                      <p className="text-[11px] text-destructive leading-relaxed">
                        Data ini dienkripsi dengan password lama dan tidak bisa dibaca. Hapus entri ini, lalu tambahkan ulang.
                      </p>
                    </div>
                  </div>
                  {/* Footer */}
                  <div className="px-4 py-3 border-t border-destructive/20 bg-destructive/5 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Oleh: {item.created_by || 'CSL Team'}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(item)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-md border border-destructive/40 transition-colors"
                        title="Hapus data ini, lalu input ulang"
                      >
                        <Trash2 size={12} /> Hapus & Input Ulang
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // ── Card: Normal ──────────────────────────────────────────
            return (
              <div key={item.id} className="rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col group">
                {/* Card header */}
                <div className="p-5 pb-4 flex items-start gap-3 border-b">
                  <div className="w-9 h-9 rounded-md border bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
                    {item.title.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm text-foreground leading-tight truncate">{item.title}</h3>
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap shrink-0 ${getCategoryBadgeClass(item.category)}`}>
                        {item.category.split(' ')[0]}
                      </span>
                    </div>
                    {item.website_url ? (
                      <a
                        href={item.website_url.startsWith('http') ? item.website_url : `https://${item.website_url}`}
                        target="_blank" rel="noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5 truncate"
                      >
                        <Globe size={10} className="shrink-0" />
                        <span className="truncate">{item.website_url.replace(/^https?:\/\//, '')}</span>
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">Tidak ada URL</p>
                    )}
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4 space-y-2 flex-1">
                  {/* Username row */}
                  <button
                    onClick={() => handleCopy(username, `u-${item.id}`, 'Username')}
                    className="w-full flex items-center justify-between gap-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground px-2 py-1.5 rounded-md transition-colors group/copy"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="text-muted-foreground shrink-0 text-[10px] font-semibold uppercase tracking-wide">User</span>
                      <span className="truncate font-mono">{username || '—'}</span>
                    </span>
                    {copiedKey === `u-${item.id}` ? <Check size={12} /> : <Copy size={11} className="text-muted-foreground/40 group-hover/copy:text-muted-foreground transition-colors" />}
                  </button>

                  {/* Password row */}
                  <div className="w-full flex items-center justify-between gap-2 text-xs px-2 py-1.5 rounded-md bg-muted/40">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground shrink-0 text-[10px] font-semibold uppercase tracking-wide">Pass</span>
                      <span className="font-mono truncate">{revealed ? password : '••••••••••••'}</span>
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleReveal(item.id)}
                        className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                        title={revealed ? 'Sembunyikan' : 'Tampilkan'}
                      >
                        {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                      <button
                        onClick={() => handleCopy(password, `p-${item.id}`, 'Password')}
                        className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                        title="Salin Password"
                      >
                        {copiedKey === `p-${item.id}` ? <Check size={12} /> : <Copy size={11} />}
                      </button>
                    </div>
                  </div>

                  {/* Nama PT */}
                  {item.decrypted?.nama_pt && (
                    <div className="flex items-center gap-2 text-xs px-2 py-1">
                      <Building2 size={11} className="text-muted-foreground shrink-0" />
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">PT</span>
                      <span className="truncate text-foreground/80">{item.decrypted.nama_pt}</span>
                    </div>
                  )}

                  {/* Notes */}
                  {item.decrypted?.notes && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 px-2">
                      {item.decrypted.notes}
                    </p>
                  )}
                </div>

                {/* Card footer */}
                <div className="px-4 py-2.5 border-t bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5 truncate max-w-[170px]" title={`Ditambahkan oleh ${item.created_by || 'CSL Team'}`}>
                    <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
                    <span className="truncate">Oleh: <strong className="font-semibold text-foreground/90">{item.created_by || 'CSL Team'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    {item.website_url && (
                      <a
                        href={item.website_url.startsWith('http') ? item.website_url : `https://${item.website_url}`}
                        target="_blank" rel="noreferrer"
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                        title="Buka Website"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                    <button onClick={() => openEdit(item)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors" title="Edit Kredensial">
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => handleDelete(item)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Hapus Kredensial">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/40">
                <TableHead className="text-xs font-semibold text-foreground/80 pl-6">Layanan</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Kategori</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Nama PT</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Username / Email</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Password</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Catatan</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Ditambahkan Oleh</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80 text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => {
                const revealed = !!revealedMap[item.id];
                const username = item.decrypted?.username || '';
                const password = item.decrypted?.password || '';
                const isDecryptFailed = username === DECRYPT_FAIL_MARKER;
                return (
                  <TableRow key={item.id} className={`border-border/30 transition-colors group ${isDecryptFailed ? 'bg-destructive/5 hover:bg-destructive/8' : 'hover:bg-muted/30'}`}>
                    <TableCell className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-md border flex items-center justify-center text-sm font-semibold shrink-0 ${isDecryptFailed ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                          {item.title.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-foreground">{item.title}</div>
                          {item.website_url && (
                            <a
                              href={item.website_url.startsWith('http') ? item.website_url : `https://${item.website_url}`}
                              target="_blank" rel="noreferrer"
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5"
                            >
                              <Globe size={10} />
                              {item.website_url.replace(/^https?:\/\//, '').split('/')[0]}
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      {isDecryptFailed ? (
                        <span className="inline-flex items-center rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                          Gagal Dekripsi
                        </span>
                      ) : (
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getCategoryBadgeClass(item.category)}`}>
                          {item.category.split(' ')[0]}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 text-xs text-foreground/80 max-w-[180px] truncate">
                      {isDecryptFailed ? '—' : (
                        item.decrypted?.nama_pt
                          ? <span className="flex items-center gap-1"><Building2 size={11} className="shrink-0 text-muted-foreground" />{item.decrypted.nama_pt}</span>
                          : <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      {isDecryptFailed ? (
                        <span className="flex items-center gap-1.5 text-xs text-destructive italic">
                          <AlertTriangle size={11} /> Tidak dapat dibaca
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCopy(username, `tu-${item.id}`, 'Username')}
                          className="flex items-center gap-1.5 font-mono text-xs text-foreground hover:text-foreground/80 transition-colors group/cp"
                        >
                          {username}
                          {copiedKey === `tu-${item.id}` ? <Check size={12} className="text-foreground" /> : <Copy size={11} className="text-muted-foreground/60 group-hover/cp:text-foreground transition-colors" />}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-1 font-mono text-xs">
                        <span>{revealed ? password : '••••••••••'}</span>
                        <button onClick={() => toggleReveal(item.id)} className="ml-1 p-1 text-muted-foreground hover:text-foreground rounded">
                          {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        <button onClick={() => handleCopy(password, `tp-${item.id}`, 'Password')} className="p-1 text-muted-foreground hover:text-foreground rounded">
                          {copiedKey === `tp-${item.id}` ? <Check size={12} className="text-foreground" /> : <Copy size={11} />}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-xs text-muted-foreground max-w-[200px] truncate">
                      {item.decrypted?.notes || '—'}
                    </TableCell>
                    <TableCell className="py-4 text-xs text-muted-foreground whitespace-nowrap">
                      <div className="font-medium text-foreground">{item.created_by || 'CSL Team'}</div>
                      <div className="text-[10px] text-muted-foreground/70">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.website_url && (
                          <a
                            href={item.website_url.startsWith('http') ? item.website_url : `https://${item.website_url}`}
                            target="_blank" rel="noreferrer"
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                        <button onClick={() => openEdit(item)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"><Edit3 size={13} /></button>
                        <button onClick={() => handleDelete(item)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── MODAL: Add / Edit ── */}
      <Dialog open={isFormOpen} onOpenChange={v => { if (!isLoading) setIsFormOpen(v); }}>
        <DialogContent className="sm:max-w-3xl w-full p-0 gap-0 overflow-hidden dark:bg-zinc-900 dark:border-zinc-800 shadow-2xl">
          {/* Modal Header */}
          <div className="flex items-center gap-3.5 px-6 py-5 border-b border-border/60 dark:border-zinc-800 bg-muted/40 dark:bg-zinc-800/60">
            <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/25 flex items-center justify-center shrink-0">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground dark:text-zinc-100">
                {editingItem ? 'Edit Kredensial' : 'Tambah Kredensial Baru'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground dark:text-zinc-400 mt-0.5">
                Data akun dienkripsi end-to-end dengan standar militer AES-256-GCM sebelum disimpan.
              </DialogDescription>
            </div>
          </div>

          <form onSubmit={handleSave}>
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

              {/* SECTION 1: Informasi Layanan & Entitas */}
              <div className="bg-card dark:bg-zinc-900/90 border border-border/60 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border/50 dark:border-zinc-800 bg-muted/30 dark:bg-zinc-800/50">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 bg-primary/10 text-primary border border-primary/25">1</div>
                  <h3 className="text-xs font-bold text-foreground dark:text-zinc-200 uppercase tracking-wider">Informasi Layanan &amp; Perusahaan</h3>
                </div>
                <div className="p-5 space-y-4">
                  {/* Row 1: Nama Layanan & Nama PT */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground dark:text-zinc-300">
                        Nama Layanan / Akun <span className="text-destructive">*</span>
                      </label>
                      <Input
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        placeholder="cth: DJP Online, AHU Online, KlikBCA"
                        className="h-10 text-sm dark:bg-zinc-800/90 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                        autoFocus
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground dark:text-zinc-300">
                        Nama PT / Entitas <span className="text-muted-foreground dark:text-zinc-500 font-normal">(Opsional)</span>
                      </label>
                      <div className="relative">
                        <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-zinc-500 pointer-events-none" />
                        <Input
                          value={form.nama_pt}
                          onChange={e => setForm({ ...form, nama_pt: e.target.value })}
                          placeholder="cth: PT Desi Jaya / PT CSL..."
                          className="h-10 text-sm pl-9 dark:bg-zinc-800/90 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Kategori & URL */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground dark:text-zinc-300">Kategori</label>
                      <div className="relative">
                        <select
                          value={form.category}
                          onChange={e => setForm({ ...form, category: e.target.value })}
                          className="h-10 w-full rounded-md border border-input dark:border-zinc-700 bg-background dark:bg-zinc-800/90 pl-3 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground dark:text-zinc-100 appearance-none"
                        >
                          {CATEGORIES.map(c => <option key={c} value={c} className="dark:bg-zinc-800 dark:text-zinc-100">{c}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-zinc-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground dark:text-zinc-300">
                        URL Website <span className="text-muted-foreground dark:text-zinc-500 font-normal">(Opsional)</span>
                      </label>
                      <div className="relative">
                        <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-zinc-500 pointer-events-none" />
                        <Input
                          value={form.website_url}
                          onChange={e => setForm({ ...form, website_url: e.target.value })}
                          placeholder="https://..."
                          className="h-10 text-sm pl-9 dark:bg-zinc-800/90 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Kredensial Login */}
              <div className="bg-card dark:bg-zinc-900/90 border border-border/60 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border/50 dark:border-zinc-800 bg-muted/30 dark:bg-zinc-800/50">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 bg-primary/10 text-primary border border-primary/25">2</div>
                  <h3 className="text-xs font-bold text-foreground dark:text-zinc-200 uppercase tracking-wider">Kredensial Akses &amp; Akun</h3>
                </div>
                <div className="p-5 space-y-4">
                  {/* Row: Username + Password */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground dark:text-zinc-300">
                        Username / Email / ID <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <User2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-zinc-500 pointer-events-none" />
                        <Input
                          value={form.username}
                          onChange={e => setForm({ ...form, username: e.target.value })}
                          placeholder="cth: admin@gesit.co.id"
                          className="h-10 text-sm pl-9 dark:bg-zinc-800/90 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-foreground dark:text-zinc-300">
                          Password <span className="text-destructive">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleGenerate}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                          <Sparkles size={11} /> Generate Sandi
                        </button>
                      </div>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-zinc-500 pointer-events-none" />
                        <Input
                          type={showFormPass ? 'text' : 'password'}
                          value={form.password}
                          onChange={e => setForm({ ...form, password: e.target.value })}
                          placeholder="Masukkan password..."
                          className="h-10 text-sm pl-9 pr-10 font-mono tracking-wider dark:bg-zinc-800/90 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowFormPass(!showFormPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                        >
                          {showFormPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Password strength bar */}
                  {form.password && (() => {
                    const len = form.password.length;
                    const hasUpper = /[A-Z]/.test(form.password);
                    const hasNum = /[0-9]/.test(form.password);
                    const hasSym = /[^A-Za-z0-9]/.test(form.password);
                    const score = (len >= 8 ? 1 : 0) + (len >= 14 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNum ? 1 : 0) + (hasSym ? 1 : 0);
                    const label = score <= 1 ? 'Lemah' : score <= 3 ? 'Sedang' : 'Kuat';
                    const color = score <= 1 ? 'bg-destructive' : score <= 3 ? 'bg-amber-400' : 'bg-emerald-500';
                    return (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= score ? color : 'bg-muted dark:bg-zinc-800'}`} />
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground dark:text-zinc-400">
                          Kekuatan Sandi: <span className={score <= 1 ? 'text-destructive font-semibold' : score <= 3 ? 'text-amber-500 font-semibold' : 'text-emerald-500 font-semibold'}>{label}</span>
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* SECTION 3: Catatan & Token Keamanan */}
              <div className="bg-card dark:bg-zinc-900/90 border border-border/60 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border/50 dark:border-zinc-800 bg-muted/30 dark:bg-zinc-800/50">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 bg-primary/10 text-primary border border-primary/25">3</div>
                  <h3 className="text-xs font-bold text-foreground dark:text-zinc-200 uppercase tracking-wider">Catatan &amp; Token Keamanan</h3>
                </div>
                <div className="p-5 space-y-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground dark:text-zinc-300">
                      Catatan / PIN / Info Tambahan <span className="font-normal text-muted-foreground dark:text-zinc-500">(Opsional)</span>
                    </label>
                    <p className="text-[11px] text-muted-foreground dark:text-zinc-400">
                      Token 2FA, PIN ATM, pertanyaan keamanan, atau detail informasi penting lainnya.
                    </p>
                    <div className="relative mt-2">
                      <StickyNote size={14} className="absolute left-3 top-3 text-muted-foreground dark:text-zinc-500 pointer-events-none" />
                      <textarea
                        value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                        placeholder="Contoh: PIN 2FA = 123456, Pertanyaan keamanan: nama ibu..."
                        rows={3}
                        className="w-full text-sm pl-9 pr-3 py-2.5 rounded-lg border border-input dark:border-zinc-700 bg-background dark:bg-zinc-800/90 dark:text-zinc-100 dark:placeholder:text-zinc-500 resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border/60 dark:border-zinc-800 bg-muted/30 dark:bg-zinc-800/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground dark:text-zinc-400">
                <ShieldCheck size={14} className="text-emerald-500" />
                Dienkripsi AES-256-GCM (Zero-Knowledge)
              </div>
              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isLoading}
                  className="h-9 px-4 text-xs font-medium dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  Batal
                </Button>
                <Button type="submit" size="sm" disabled={isLoading} className="h-9 px-4 text-xs font-medium gap-1.5 shadow-sm">
                  {isLoading
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</>
                    : <><Save className="h-3.5 w-3.5" /> {editingItem ? 'Simpan Perubahan' : 'Enkripsi & Simpan'}</>
                  }
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: SQL Migration ── */}
      <Dialog open={isSqlModalOpen} onOpenChange={setIsSqlModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Database className="h-5 w-5" /> SQL Migrasi Supabase — Credential Vault
            </DialogTitle>
            <DialogDescription className="text-xs">
              Jalankan skrip ini di Supabase Dashboard &gt; SQL Editor agar data tersinkronisasi ke cloud.
            </DialogDescription>
          </DialogHeader>
          <pre className="bg-muted text-foreground/90 p-4 rounded-md font-mono text-[11px] overflow-x-auto max-h-64 mt-2 border border-border/40 leading-relaxed">{`-- 1. Tabel Konfigurasi Vault (Salt & Internal Key Verifier)
CREATE TABLE IF NOT EXISTS csl_vault_config (
  id text PRIMARY KEY DEFAULT 'default',
  salt text NOT NULL,
  verifier_cipher text NOT NULL,
  verifier_iv text NOT NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE csl_vault_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vault_config_all" ON csl_vault_config;
CREATE POLICY "vault_config_all" ON csl_vault_config FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE csl_vault_config TO anon, authenticated, service_role;

-- 2. Tabel Kredensial Terenkripsi (AES-256-GCM)
CREATE TABLE IF NOT EXISTS csl_credentials (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  category text DEFAULT 'General',
  website_url text,
  encrypted_data text NOT NULL,
  iv text NOT NULL,
  username_preview text,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE csl_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "credentials_all" ON csl_credentials;
CREATE POLICY "credentials_all" ON csl_credentials FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE csl_credentials TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE csl_credentials_id_seq TO anon, authenticated, service_role;

-- 3. Indexes & Supabase Realtime
CREATE INDEX IF NOT EXISTS idx_csl_credentials_category ON csl_credentials(category);
CREATE INDEX IF NOT EXISTS idx_csl_credentials_created_at ON csl_credentials(created_at DESC);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'csl_credentials') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE csl_credentials;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;`}</pre>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsSqlModalOpen(false)} className="h-9">Tutup</Button>
            <Button
              type="button"
              size="sm"
              className="h-9"
              onClick={() => {
                navigator.clipboard.writeText(`-- 1. Tabel Konfigurasi Vault\nCREATE TABLE IF NOT EXISTS csl_vault_config (id text PRIMARY KEY DEFAULT 'default', salt text NOT NULL, verifier_cipher text NOT NULL, verifier_iv text NOT NULL, updated_at timestamptz DEFAULT now());\nALTER TABLE csl_vault_config ENABLE ROW LEVEL SECURITY;\nDROP POLICY IF EXISTS "vault_config_all" ON csl_vault_config;\nCREATE POLICY "vault_config_all" ON csl_vault_config FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);\nGRANT ALL ON TABLE csl_vault_config TO anon, authenticated, service_role;\n\n-- 2. Tabel Kredensial Terenkripsi\nCREATE TABLE IF NOT EXISTS csl_credentials (id bigserial PRIMARY KEY, title text NOT NULL, category text DEFAULT 'General', website_url text, encrypted_data text NOT NULL, iv text NOT NULL, username_preview text, created_by text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());\nALTER TABLE csl_credentials ENABLE ROW LEVEL SECURITY;\nDROP POLICY IF EXISTS "credentials_all" ON csl_credentials;\nCREATE POLICY "credentials_all" ON csl_credentials FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);\nGRANT ALL ON TABLE csl_credentials TO anon, authenticated, service_role;\nGRANT ALL ON SEQUENCE csl_credentials_id_seq TO anon, authenticated, service_role;\n\n-- 3. Indexes & Supabase Realtime\nCREATE INDEX IF NOT EXISTS idx_csl_credentials_category ON csl_credentials(category);\nCREATE INDEX IF NOT EXISTS idx_csl_credentials_created_at ON csl_credentials(created_at DESC);\nDO $$\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'csl_credentials') THEN\n    ALTER PUBLICATION supabase_realtime ADD TABLE csl_credentials;\n  END IF;\nEXCEPTION WHEN OTHERS THEN NULL;\nEND $$;`);
                toast.success('SQL berhasil disalin!');
              }}
            >
              <Copy className="h-4 w-4 mr-1.5" /> Salin SQL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
