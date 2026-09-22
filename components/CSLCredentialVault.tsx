import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Lock,
  Unlock,
  Key,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Edit3,
  Globe,
  Sparkles,
  Database,
  ShieldCheck,
  LayoutGrid,
  List,
  AlertTriangle,
  Info,
  Loader2,
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
import {
  generateSalt,
  deriveVaultKey,
  encryptVaultData,
  decryptVaultData,
  createVerifierToken,
  verifyVaultKey,
  generateStrongPassword,
  VaultSecretPayload,
} from '../lib/cryptoVault';

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

interface VaultConfig {
  salt: string;
  verifier_cipher: string;
  verifier_iv: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_VAULT_CONFIG = 'csl_vault_offline_config';
const LS_CREDENTIALS = 'csl_vault_offline_data';

const CATEGORIES = [
  'Pemerintahan & Regulasi',
  'Perbankan & Finansial',
  'Internal CSL & Grup',
  'Notaris & Konsultan',
  'Vendor & Utilities',
  'Lainnya',
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

  // — Vault gate state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [vaultConfig, setVaultConfig] = useState<VaultConfig | null>(null);
  const [isDbConnected, setIsDbConnected] = useState(true);

  // — Lock screen form
  const [masterInput, setMasterInput] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [showMaster, setShowMaster] = useState(false);
  const [gateError, setGateError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

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
    username: '', password: '', notes: '',
  });
  const [showFormPass, setShowFormPass] = useState(false);

  // — Change master password modal
  const [isChangePwdOpen, setIsChangePwdOpen] = useState(false);
  const [oldPwdInput, setOldPwdInput] = useState('');
  const [newPwdInput, setNewPwdInput] = useState('');
  const [confirmNewPwd, setConfirmNewPwd] = useState('');

  // — SQL migration modal
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);

  // — Auto-lock (15 min inactivity)
  const lockTimer = useRef<NodeJS.Timeout | null>(null);

  const resetLockTimer = () => {
    if (lockTimer.current) clearTimeout(lockTimer.current);
    if (isUnlocked) {
      lockTimer.current = setTimeout(() => {
        handleLock();
        toast.info('Vault otomatis terkunci karena tidak ada aktivitas.');
      }, 15 * 60 * 1000);
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', resetLockTimer);
    window.addEventListener('keydown', resetLockTimer);
    return () => {
      window.removeEventListener('mousemove', resetLockTimer);
      window.removeEventListener('keydown', resetLockTimer);
      if (lockTimer.current) clearTimeout(lockTimer.current);
    };
  }, [isUnlocked]);

  // — Check vault config on mount
  useEffect(() => { loadConfig(); }, []);

  async function loadConfig() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('csl_vault_config').select('*').eq('id', 'default').maybeSingle();

      if (!error && data?.salt && data?.verifier_cipher) {
        setVaultConfig({ salt: data.salt, verifier_cipher: data.verifier_cipher, verifier_iv: data.verifier_iv });
        setIsConfigured(true);
        setIsDbConnected(true);
      } else {
        throw new Error('db_error');
      }
    } catch {
      setIsDbConnected(false);
      const local = localStorage.getItem(LS_VAULT_CONFIG);
      if (local) {
        try { setVaultConfig(JSON.parse(local)); setIsConfigured(true); } catch { setIsConfigured(false); }
      } else {
        setIsConfigured(false);
      }
    } finally {
      setIsLoading(false);
    }
  }

  // — Lock
  function handleLock() {
    setIsUnlocked(false);
    setVaultKey(null);
    setCredentials([]);
    setRevealedMap({});
    setMasterInput('');
    setGateError('');
    toast.success('Vault berhasil dikunci.');
  }

  // — Setup master password
  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setGateError('');
    if (masterInput.length < 6) { setGateError('Master password minimal 6 karakter.'); return; }
    if (masterInput !== confirmInput) { setGateError('Konfirmasi password tidak cocok.'); return; }
    setIsUnlocking(true);
    try {
      const salt = generateSalt();
      const key = await deriveVaultKey(masterInput, salt);
      const verifier = await createVerifierToken(key);
      const cfg: VaultConfig = { salt, verifier_cipher: verifier.ciphertext, verifier_iv: verifier.iv };

      try {
        await supabase.from('csl_vault_config').upsert({ id: 'default', ...cfg, updated_at: new Date().toISOString() });
      } catch { /* offline fallback */ }
      localStorage.setItem(LS_VAULT_CONFIG, JSON.stringify(cfg));

      setVaultConfig(cfg);
      setVaultKey(key);
      setIsConfigured(true);
      setIsUnlocked(true);
      setMasterInput(''); setConfirmInput('');
      toast.success('Master Password berhasil dibuat. Vault terbuka.');
      await loadCredentials(key);
    } catch (err: any) {
      setGateError('Gagal membuat vault: ' + err.message);
    } finally {
      setIsUnlocking(false);
    }
  }

  // — Unlock
  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setGateError('');
    if (!masterInput) { setGateError('Masukkan master password.'); return; }
    if (!vaultConfig) { setGateError('Konfigurasi vault tidak ditemukan.'); return; }
    setIsUnlocking(true);
    try {
      const key = await deriveVaultKey(masterInput, vaultConfig.salt);
      const valid = await verifyVaultKey(key, vaultConfig.verifier_cipher, vaultConfig.verifier_iv);
      if (!valid) { setGateError('Master password salah.'); setIsUnlocking(false); return; }
      setVaultKey(key);
      setIsUnlocked(true);
      setMasterInput('');
      toast.success('Vault berhasil dibuka.');
      await loadCredentials(key);
    } catch (err: any) {
      setGateError('Gagal membuka vault: ' + err.message);
    } finally {
      setIsUnlocking(false);
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
    setForm({ title: '', category: CATEGORIES[0], website_url: '', username: '', password: '', notes: '' });
    setShowFormPass(false);
    setIsFormOpen(true);
  }

  function openEdit(item: CredentialItem) {
    setEditingItem(item);
    setForm({
      title: item.title, category: item.category || CATEGORIES[0],
      website_url: item.website_url || '',
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
    if (!vaultKey) { toast.error('Vault terkunci.'); return; }
    if (!form.title.trim()) { toast.error('Nama layanan wajib diisi.'); return; }
    if (!form.username.trim()) { toast.error('Username wajib diisi.'); return; }
    if (!form.password) { toast.error('Password wajib diisi.'); return; }

    setIsLoading(true);
    try {
      const secret: VaultSecretPayload = { username: form.username.trim(), password: form.password, notes: form.notes };
      const enc = await encryptVaultData(secret, vaultKey);

      const u = form.username.trim();
      const preview = u.includes('@')
        ? u.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '***' + c)
        : u.length > 4 ? u.slice(0, 2) + '***' + u.slice(-2) : u;

      if (editingItem) {
        // UPDATE
        try {
          await supabase.from('csl_credentials').update({
            title: form.title.trim(), category: form.category,
            website_url: form.website_url.trim() || null,
            encrypted_data: enc.ciphertext, iv: enc.iv,
            username_preview: preview, updated_at: new Date().toISOString(),
          }).eq('id', editingItem.id);
        } catch { /* offline */ }

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
            username_preview: preview, created_by: currentUser?.fullName || 'Admin',
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          }]).select().single();
          if (!error && data) inserted = { ...data, decrypted: secret };
        } catch { /* offline */ }

        if (!inserted) {
          inserted = {
            id: Date.now(), title: form.title.trim(), category: form.category,
            website_url: form.website_url.trim() || undefined,
            encrypted_data: enc.ciphertext, iv: enc.iv, username_preview: preview,
            created_by: currentUser?.fullName || 'Admin',
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
    const next = credentials.filter(c => c.id !== item.id);
    setCredentials(next);
    localStorage.setItem(LS_CREDENTIALS, JSON.stringify(next.map(({ decrypted: _, ...r }) => r)));
    toast.success('Kredensial dihapus.');
  }

  // — Change master password
  async function handleChangePwd(e: React.FormEvent) {
    e.preventDefault();
    if (!vaultKey || !vaultConfig) return;
    if (newPwdInput.length < 6) { toast.error('Password baru minimal 6 karakter.'); return; }
    if (newPwdInput !== confirmNewPwd) { toast.error('Konfirmasi password tidak cocok.'); return; }

    const checkKey = await deriveVaultKey(oldPwdInput, vaultConfig.salt);
    const valid = await verifyVaultKey(checkKey, vaultConfig.verifier_cipher, vaultConfig.verifier_iv);
    if (!valid) { toast.error('Password saat ini salah.'); return; }

    setIsLoading(true);
    try {
      const newSalt = generateSalt();
      const newKey = await deriveVaultKey(newPwdInput, newSalt);
      const newVerifier = await createVerifierToken(newKey);
      const newCfg: VaultConfig = { salt: newSalt, verifier_cipher: newVerifier.ciphertext, verifier_iv: newVerifier.iv };

      const reEncrypted: CredentialItem[] = [];
      for (const item of credentials) {
        if (!item.decrypted) continue;
        const reEnc = await encryptVaultData(item.decrypted, newKey);
        reEncrypted.push({ ...item, encrypted_data: reEnc.ciphertext, iv: reEnc.iv });
        try {
          await supabase.from('csl_credentials').update({ encrypted_data: reEnc.ciphertext, iv: reEnc.iv, updated_at: new Date().toISOString() }).eq('id', item.id);
        } catch { /* ignore */ }
      }

      try { await supabase.from('csl_vault_config').upsert({ id: 'default', ...newCfg, updated_at: new Date().toISOString() }); } catch { /* ignore */ }
      localStorage.setItem(LS_VAULT_CONFIG, JSON.stringify(newCfg));
      localStorage.setItem(LS_CREDENTIALS, JSON.stringify(reEncrypted.map(({ decrypted: _, ...r }) => r)));

      setVaultConfig(newCfg);
      setVaultKey(newKey);
      setCredentials(reEncrypted);
      setIsChangePwdOpen(false);
      setOldPwdInput(''); setNewPwdInput(''); setConfirmNewPwd('');
      toast.success('Master Password berhasil diperbarui. Semua data di-enkripsi ulang.');
    } catch (err: any) {
      toast.error('Gagal mengganti password: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // — Filtered list
  const filtered = useMemo(() => credentials.filter(item => {
    const catOk = activeCat === 'Semua' || item.category === activeCat;
    const q = searchTerm.toLowerCase();
    const searchOk = !q ||
      item.title.toLowerCase().includes(q) ||
      (item.website_url || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.decrypted?.username || '').toLowerCase().includes(q) ||
      (item.decrypted?.notes || '').toLowerCase().includes(q);
    return catOk && searchOk;
  }), [credentials, activeCat, searchTerm]);

  // ─── LOCK SCREEN ─────────────────────────────────────────────────────────────

  if (!isUnlocked) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12">
        <PageHeader
          title="Credential Vault"
          description="Penyimpanan aman akun & password website dengan enkripsi AES-256-GCM end-to-end"
        />

        <div className="flex items-center justify-center min-h-[440px]">
          <div className="w-full max-w-md bg-card border border-border/40 rounded-lg shadow-sm p-8">

            {/* Icon + title */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="h-12 w-12 rounded-md border bg-muted flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-foreground/60" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {isConfigured ? 'Vault Terkunci' : 'Buat Master Password'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                {isConfigured
                  ? 'Masukkan Master Password untuk membuka dan mendekripsi kredensial.'
                  : 'Buat Master Password sebagai kunci enkripsi utama vault Anda.'}
              </p>
            </div>

            {/* Error */}
            {gateError && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{gateError}</span>
              </div>
            )}

            {isConfigured ? (
              /* UNLOCK */
              <form onSubmit={handleUnlock} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Master Password</label>
                  <div className="relative">
                    <Input
                      type={showMaster ? 'text' : 'password'}
                      value={masterInput}
                      onChange={e => setMasterInput(e.target.value)}
                      placeholder="Masukkan master password..."
                      className="pr-10 h-9 text-sm"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowMaster(!showMaster)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showMaster ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={isUnlocking} className="w-full h-9">
                  {isUnlocking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
                  {isUnlocking ? 'Mendekripsi...' : 'Buka Vault'}
                </Button>
              </form>
            ) : (
              /* SETUP */
              <form onSubmit={handleSetup} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Master Password Baru</label>
                  <div className="relative">
                    <Input
                      type={showMaster ? 'text' : 'password'}
                      value={masterInput}
                      onChange={e => setMasterInput(e.target.value)}
                      placeholder="Minimal 6 karakter..."
                      className="pr-10 h-9 text-sm"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowMaster(!showMaster)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showMaster ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Ulangi Master Password</label>
                  <Input
                    type="password"
                    value={confirmInput}
                    onChange={e => setConfirmInput(e.target.value)}
                    placeholder="Ketik ulang..."
                    className="h-9 text-sm"
                  />
                </div>
                <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Master password tidak tersimpan dalam teks biasa. Jika lupa, data tidak dapat dipulihkan.</span>
                </div>
                <Button type="submit" disabled={isUnlocking} className="w-full h-9">
                  {isUnlocking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  {isUnlocking ? 'Membuat Vault...' : 'Simpan & Buka Vault'}
                </Button>
              </form>
            )}

            {/* Privacy note */}
            <p className="mt-5 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Zero-Knowledge — password tidak terekspos di database
            </p>
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
        description="Kelola akun login website secara aman dengan enkripsi AES-256-GCM end-to-end"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsChangePwdOpen(true)}
            className="h-9 text-xs"
          >
            <KeyRound className="h-4 w-4 mr-1.5" /> Ganti Password
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLock}
            className="h-9 text-xs"
          >
            <Lock className="h-4 w-4 mr-1.5" /> Kunci Vault
          </Button>
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
            <span>Tabel Supabase belum dibuat. Data tersimpan terenkripsi di browser.</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSqlModalOpen(true)}
            className="h-7 text-xs border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200"
          >
            Lihat SQL
          </Button>
        </div>
      )}

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
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  activeCat === cat ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'
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
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-1 text-sm font-medium transition-all ${
              viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'
            }`}
          >
            <LayoutGrid size={14} className="mr-1" /> Grid
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-1 text-sm font-medium transition-all ${
              viewMode === 'table' ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'
            }`}
          >
            <List size={14} className="mr-1" /> List
          </button>
        </div>
      </div>

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

                  {/* Notes */}
                  {item.decrypted?.notes && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 px-2">
                      {item.decrypted.notes}
                    </p>
                  )}
                </div>

                {/* Card footer */}
                <div className="px-4 py-3 border-t flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ShieldCheck size={11} className="text-emerald-500" /> AES-256
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    <button onClick={() => openEdit(item)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => handleDelete(item)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors">
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
                <TableHead className="text-xs font-semibold text-foreground/80">Username / Email</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Password</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Catatan</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80 text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => {
                const revealed = !!revealedMap[item.id];
                const username = item.decrypted?.username || '';
                const password = item.decrypted?.password || '';
                return (
                  <TableRow key={item.id} className="border-border/30 hover:bg-muted/30 transition-colors group">
                    <TableCell className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md border bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
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
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getCategoryBadgeClass(item.category)}`}>
                        {item.category.split(' ')[0]}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <button
                        onClick={() => handleCopy(username, `tu-${item.id}`, 'Username')}
                        className="flex items-center gap-1.5 font-mono text-xs text-foreground hover:text-foreground/80 transition-colors group/cp"
                      >
                        {username}
                        {copiedKey === `tu-${item.id}` ? <Check size={12} className="text-foreground" /> : <Copy size={11} className="text-muted-foreground/60 group-hover/cp:text-foreground transition-colors" />}
                      </button>
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
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {editingItem ? 'Edit Kredensial' : 'Tambah Kredensial Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Username dan password dienkripsi AES-256-GCM sebelum disimpan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Nama Layanan / Website *</label>
              <Input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="cth: DJP Online, AHU, KlikBCA"
                className="h-9 text-sm mt-1"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Kategori</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full h-9 text-sm mt-1 px-3 rounded-md border border-input bg-background"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">URL Website</label>
                <Input
                  value={form.website_url}
                  onChange={e => setForm({ ...form, website_url: e.target.value })}
                  placeholder="https://..."
                  className="h-9 text-sm mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Username / Email *</label>
              <Input
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                placeholder="cth: admin@gesit.co.id"
                className="h-9 text-sm mt-1"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-muted-foreground">Password *</label>
                <button type="button" onClick={handleGenerate} className="text-xs text-foreground/70 hover:text-foreground flex items-center gap-1">
                  <Sparkles size={12} /> Generate
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showFormPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Password..."
                  className="h-9 text-sm pr-10 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowFormPass(!showFormPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showFormPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Catatan / PIN / Info Tambahan</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Token 2FA, PIN, pertanyaan keamanan..."
                rows={2}
                className="w-full text-sm mt-1 px-3 py-2 rounded-md border border-input bg-background resize-none"
              />
            </div>
            <DialogFooter className="gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsFormOpen(false)} className="h-9">Batal</Button>
              <Button type="submit" size="sm" disabled={isLoading} className="h-9">
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                {editingItem ? 'Simpan Perubahan' : 'Enkripsi & Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Change Master Password ── */}
      <Dialog open={isChangePwdOpen} onOpenChange={setIsChangePwdOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Ganti Master Password
            </DialogTitle>
            <DialogDescription className="text-xs">
              Seluruh kredensial akan di-enkripsi ulang secara otomatis.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePwd} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Password Saat Ini</label>
              <Input type="password" value={oldPwdInput} onChange={e => setOldPwdInput(e.target.value)} placeholder="Password lama..." className="h-9 text-sm mt-1" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Password Baru</label>
              <Input type="password" value={newPwdInput} onChange={e => setNewPwdInput(e.target.value)} placeholder="Minimal 6 karakter..." className="h-9 text-sm mt-1" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Ulangi Password Baru</label>
              <Input type="password" value={confirmNewPwd} onChange={e => setConfirmNewPwd(e.target.value)} placeholder="Ketik ulang..." className="h-9 text-sm mt-1" required />
            </div>
            <DialogFooter className="gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsChangePwdOpen(false)} className="h-9">Batal</Button>
              <Button type="submit" size="sm" disabled={isLoading} className="h-9">
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Update & Re-encrypt
              </Button>
            </DialogFooter>
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
          <pre className="bg-muted text-foreground/90 p-4 rounded-md font-mono text-[11px] overflow-x-auto max-h-64 mt-2 border border-border/40 leading-relaxed">{`-- 1. Tabel Konfigurasi Vault
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

-- 2. Tabel Kredensial Terenkripsi
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
GRANT ALL ON SEQUENCE csl_credentials_id_seq TO anon, authenticated, service_role;`}</pre>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsSqlModalOpen(false)} className="h-9">Tutup</Button>
            <Button
              type="button"
              size="sm"
              className="h-9"
              onClick={() => {
                navigator.clipboard.writeText(`-- 1. Tabel Konfigurasi Vault\nCREATE TABLE IF NOT EXISTS csl_vault_config (id text PRIMARY KEY DEFAULT 'default', salt text NOT NULL, verifier_cipher text NOT NULL, verifier_iv text NOT NULL, updated_at timestamptz DEFAULT now());\nALTER TABLE csl_vault_config ENABLE ROW LEVEL SECURITY;\nDROP POLICY IF EXISTS "vault_config_all" ON csl_vault_config;\nCREATE POLICY "vault_config_all" ON csl_vault_config FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);\nGRANT ALL ON TABLE csl_vault_config TO anon, authenticated, service_role;\n\n-- 2. Tabel Kredensial Terenkripsi\nCREATE TABLE IF NOT EXISTS csl_credentials (id bigserial PRIMARY KEY, title text NOT NULL, category text DEFAULT 'General', website_url text, encrypted_data text NOT NULL, iv text NOT NULL, username_preview text, created_by text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());\nALTER TABLE csl_credentials ENABLE ROW LEVEL SECURITY;\nDROP POLICY IF EXISTS "credentials_all" ON csl_credentials;\nCREATE POLICY "credentials_all" ON csl_credentials FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);\nGRANT ALL ON TABLE csl_credentials TO anon, authenticated, service_role;\nGRANT ALL ON SEQUENCE csl_credentials_id_seq TO anon, authenticated, service_role;`);
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
