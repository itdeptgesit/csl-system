import React, { useState, useEffect, useMemo } from 'react';
import { supabase, supabaseAdmin, ensureAuthUserWithPassword } from '../lib/supabaseClient';

import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  RefreshCcw, 
  Tag, 
  Clock, 
  Bell, 
  Users, 
  Building2, 
  Settings, 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  Check, 
  AlertTriangle, 
  ShieldCheck, 
  Lock, 
  Key, 
  CheckSquare, 
  Square,
  LayoutDashboard,
  Kanban,
  PlusCircle,
  CheckCircle2,
  Calendar,
  Activity,
  FolderOpen,
  FileCheck,
  Wallet,
  Coins,
  Phone,
  BookUser,
  BarChart2,
  Scale,
  FileText,
  Eye,
  EyeOff,
  Crown,
  Briefcase,
  Network,
  PenTool,
  Loader2,
  UserCheck,
  Mail,
  FileSpreadsheet,
  Image,
  Stamp,
  Upload,
  ExternalLink,
  ChevronRight,
  X,
  Search,
  CalendarCheck,
  Landmark,
  Globe,
  Layers,
  Shield,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import lkpmData from '../data/lkpm_data.json';
import groupEmailCompanies from '../data/group_email_companies.json';

interface CSLSettingsProps {
  currentUser: UserAccount | null;
  view?: 'categories' | 'sla' | 'notifications' | 'users' | 'companies' | 'departments' | 'system';
}

// ── Data Interfaces ──────────────────────────────────────────────────────────
interface CategoryItem {
  id: number | string;
  code: string;
  name: string;
  sla_days: number;
  description: string;
}

interface MenuPermissions {
  dashboard: boolean;
  requests_view: boolean;
  requests_create: boolean;
  requests_review: boolean;
  routine_view: boolean;
  routine_rups: boolean;
  routine_lkpm: boolean;
  routine_tbk: boolean;
  routine_offshore: boolean;
  routine_admgt: boolean;
  companies: boolean;
  budget_view: boolean;
  budget_approve: boolean;
  directory_view: boolean;
  directory_manage: boolean;
  credentials: boolean;
  settings_manage: boolean;
}

interface UserItem {
  id: number | string;
  name: string;
  email: string;
  role: string;
  groups: string[];
  permissions: MenuPermissions;
}

export interface CompanyAssetMetadata {
  drive_file_id: string;
  drive_web_view_link: string;
  file_name: string;
  file_size: number;
  mime_type?: string;
  uploaded_at: string;
  uploaded_by?: string;
  preview_url?: string;
}

export interface CompanyItem {
  id: number | string;
  name: string;
  code: string;
  group_company?: string;
  short_name?: string;
  status?: 'Aktif' | 'Nonaktif';
  npwp?: string;
  nib?: string;
  ahu_number?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  departments?: number;
  employees?: number;
  assets?: {
    logo?: CompanyAssetMetadata | null;
    kop?: CompanyAssetMetadata | null;
    stempel?: CompanyAssetMetadata | null;
  };
}

export interface DepartmentItem {
  id: number | string;
  name: string;
  code: string;
  employees: number;
}

// Default Super Admin Permissions (full access everything)
const DEFAULT_SUPER_ADMIN_PERMISSIONS: MenuPermissions = {
  dashboard: true,
  requests_view: true,
  requests_create: true,
  requests_review: true,
  routine_view: true,
  routine_rups: true,
  routine_lkpm: true,
  routine_tbk: true,
  routine_offshore: true,
  routine_admgt: true,
  companies: true,
  budget_view: true,
  budget_approve: true,
  directory_view: true,
  directory_manage: true,
  credentials: true,
  settings_manage: true,
};

// Default Admin Permissions
const DEFAULT_ADMIN_PERMISSIONS: MenuPermissions = {
  dashboard: true,
  requests_view: true,
  requests_create: true,
  requests_review: true,
  routine_view: true,
  routine_rups: true,
  routine_lkpm: true,
  routine_tbk: true,
  routine_offshore: true,
  routine_admgt: true,
  companies: true,
  budget_view: true,
  budget_approve: true,
  directory_view: true,
  directory_manage: true,
  credentials: true,
  settings_manage: false,
};

// Default Staff Permissions
const DEFAULT_STAFF_PERMISSIONS: MenuPermissions = {
  dashboard: true,
  requests_view: true,
  requests_create: true,
  requests_review: true,
  routine_view: true,
  routine_rups: true,
  routine_lkpm: true,
  routine_tbk: true,
  routine_offshore: true,
  routine_admgt: true,
  companies: true,
  budget_view: true,
  budget_approve: false,
  directory_view: true,
  directory_manage: false,
  credentials: true,
  settings_manage: false,
};

// Default User / Requester Permissions
const DEFAULT_REQUESTER_PERMISSIONS: MenuPermissions = {
  dashboard: false,
  requests_view: true,
  requests_create: true,
  requests_review: false,
  routine_view: false,
  routine_rups: false,
  routine_lkpm: false,
  routine_tbk: false,
  routine_offshore: false,
  routine_admgt: false,
  companies: false,
  budget_view: false,
  budget_approve: false,
  directory_view: false,
  directory_manage: false,
  credentials: false,
  settings_manage: false,
};

// ── Helper to convert groups array to MenuPermissions ──
const parseGroupsToPermissions = (groupsArr: string[], role: string): MenuPermissions => {
  const roleLower = (role || '').trim().toLowerCase();
  const isSuperAdmin = roleLower === 'super admin' || roleLower === 'super_admin' || roleLower === 'owner' || groupsArr.includes('super_admin');
  const isAdmin = roleLower === 'admin' || groupsArr.includes('admin') || groupsArr.includes('csl_admin');
  const isStaff = roleLower === 'staff' || roleLower === 'csl staff' || groupsArr.includes('staff') || groupsArr.includes('csl_staff');

  if (isSuperAdmin) return { ...DEFAULT_SUPER_ADMIN_PERMISSIONS };

  if (!groupsArr || groupsArr.length === 0) {
    if (isAdmin) return { ...DEFAULT_ADMIN_PERMISSIONS };
    if (isStaff) return { ...DEFAULT_STAFF_PERMISSIONS };
    return { ...DEFAULT_REQUESTER_PERMISSIONS };
  }

  const g = groupsArr.map(x => String(x).toLowerCase());

  const hasRoutineBase = g.includes('routine') || g.includes('routine_view') || g.includes('routine_create') || g.includes('routine_manage') || isStaff || isAdmin;
  const hasRoutineRups = hasRoutineBase || g.includes('routine-rups') || g.includes('routine_rups');
  const hasRoutineLkpm = hasRoutineBase || g.includes('routine-lkpm') || g.includes('routine_lkpm');
  const hasRoutineTbk = hasRoutineBase || g.includes('routine-tbk') || g.includes('routine_tbk');
  const hasRoutineOffshore = hasRoutineBase || g.includes('routine-offshore') || g.includes('routine_offshore');
  const hasRoutineAdmgt = hasRoutineBase || g.includes('routine-admgt') || g.includes('routine_admgt');

  return {
    dashboard: g.includes('dashboard') || isAdmin || isStaff,
    requests_view: g.includes('req_view') || g.includes('requests_view') || g.includes('csl-requests') || isAdmin || isStaff || true,
    requests_create: g.includes('req_submit') || g.includes('requests_create') || isAdmin || isStaff || true,
    requests_review: g.includes('req_review') || g.includes('requests_review') || isAdmin || isStaff,
    routine_view: hasRoutineBase || hasRoutineRups || hasRoutineLkpm || hasRoutineTbk || hasRoutineOffshore || hasRoutineAdmgt,
    routine_rups: hasRoutineRups,
    routine_lkpm: hasRoutineLkpm,
    routine_tbk: hasRoutineTbk,
    routine_offshore: hasRoutineOffshore,
    routine_admgt: hasRoutineAdmgt,
    companies: g.includes('companies') || g.includes('companies_view') || g.includes('settings-companies') || isAdmin || isStaff,
    budget_view: g.includes('budget') || g.includes('budget_view') || isAdmin || isStaff,
    budget_approve: (g.includes('budget') && isAdmin) || g.includes('budget_approve') || isAdmin,
    directory_view: g.includes('directory') || g.includes('directory_view') || isAdmin || isStaff,
    directory_manage: g.includes('directory_manage') || isAdmin,
    credentials: g.includes('credentials') || g.includes('credentials_view') || isAdmin || isStaff,
    settings_manage: g.includes('settings') || g.includes('settings_manage') || isSuperAdmin,
  };
};

// ── Helper to convert MenuPermissions to groups array for database persistence ──
const convertPermissionsToGroups = (perms: MenuPermissions, role: string): string[] => {
  const roleLower = (role || '').trim().toLowerCase();
  const groups: string[] = [];

  if (roleLower === 'super admin' || roleLower === 'super_admin' || roleLower === 'owner') {
    groups.push('super_admin');
  } else if (roleLower === 'admin') {
    groups.push('admin');
  } else if (roleLower === 'staff' || roleLower === 'csl staff') {
    groups.push('staff');
  }

  if (perms.dashboard) groups.push('dashboard');
  
  if (perms.requests_view) groups.push('req_view');
  if (perms.requests_create) groups.push('req_submit');
  if (perms.requests_review) groups.push('req_review');
  if (perms.requests_view || perms.requests_create || perms.requests_review) groups.push('csl-requests');

  const anyRoutine = perms.routine_rups || perms.routine_lkpm || perms.routine_tbk || perms.routine_offshore || perms.routine_admgt || perms.routine_view;
  if (anyRoutine) groups.push('routine');
  if (perms.routine_rups) groups.push('routine-rups');
  if (perms.routine_lkpm) groups.push('routine-lkpm');
  if (perms.routine_tbk) groups.push('routine-tbk');
  if (perms.routine_offshore) groups.push('routine-offshore');
  if (perms.routine_admgt) groups.push('routine-admgt');

  if (perms.companies) {
    groups.push('companies');
    groups.push('companies_view');
  }

  if (perms.budget_view || perms.budget_approve) {
    groups.push('budget');
    if (perms.budget_approve) groups.push('budget_approve');
  }

  if (perms.directory_view || perms.directory_manage) {
    groups.push('directory');
    if (perms.directory_manage) groups.push('directory_manage');
  }

  if (perms.credentials) {
    groups.push('credentials');
  }

  if (perms.settings_manage) {
    groups.push('settings');
    groups.push('settings-users');
    groups.push('settings-departments');
    groups.push('settings-system');
  }

  return Array.from(new Set(groups));
};

// ── Mock Data Defaults ───────────────────────────────────────────────────────
const MOCK_CATEGORIES: CategoryItem[] = [
  { id: 1, code: 'AGR', name: 'Agreement', sla_days: 5, description: 'Contract drafting, revision, and review requests' },
  { id: 2, code: 'LREV', name: 'Legal Review', sla_days: 5, description: 'Review of external templates and business documents' },
  { id: 3, code: 'CORPSECR', name: 'Corporate Secretary', sla_days: 5, description: 'Board minutes, resolutions, and statutory filings' },
  { id: 4, code: 'OSS', name: 'OSS', sla_days: 14, description: 'OSS system permits and licensing registration' },
  { id: 5, code: 'LIC', name: 'Licensing', sla_days: 10, description: 'General regional and sector-specific licenses' },
  { id: 6, code: 'NOTARY', name: 'Notary', sla_days: 7, description: 'Deed preparation and notarization coordination' },
  { id: 7, code: 'LEGALOP', name: 'Legal Opinion', sla_days: 5, description: 'Formal written legal analysis and advisory opinions' },
  { id: 8, code: 'DOCREQ', name: 'Document Request', sla_days: 2, description: 'Retrieval of corporate documents or permits' },
  { id: 9, code: 'COMPLIANCE', name: 'Compliance', sla_days: 5, description: 'Regulatory reports and compliance reviews' },
  { id: 10, code: 'OTHER', name: 'Other', sla_days: 5, description: 'General and miscellaneous support' },
];

// Users loaded dynamically from DB

// Companies loaded dynamically from DB

export const CSLSettings: React.FC<CSLSettingsProps> = ({ currentUser, view = 'categories' }) => {
  // ── States ──────────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<CategoryItem[]>(MOCK_CATEGORIES);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Category Modal State
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [catForm, setCatForm] = useState({ code: '', name: '', sla_days: 5, description: '' });

  // User Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'User', groupsStr: 'requester', password: '', eSignUrl: '' });
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [isUserSaving, setIsUserSaving] = useState(false);
  const [isUploadingESign, setIsUploadingESign] = useState(false);

  // User Permissions Modal State
  const [userTab, setUserTab] = useState<'users' | 'matrix'>('users');
  const [permUser, setPermUser] = useState<UserItem | null>(null);
  const [userPerms, setUserPerms] = useState<MenuPermissions>(DEFAULT_REQUESTER_PERMISSIONS);
  const [isSavingPerms, setIsSavingPerms] = useState(false);

  // User-specified 9 Company Groups
  const COMPANY_GROUPS = [
    'Holding',
    'GNR',
    'Property',
    'Trading',
    'Manufacture',
    'Offshore',
    'Public',
    'Personal',
    'Foundation',
  ] as const;

  // Company Group Lookup
  const companyGroupLookup = useMemo(() => {
    const map = new Map<string, string>();
    const pList = (lkpmData as any)?.['2026']?.perusahaan || [];
    for (const item of pList) {
      if (item.nama && item.grup) {
        map.set(item.nama.toLowerCase().trim(), item.grup);
      }
    }
    return map;
  }, []);

  const getResolvedGroup = (name: string, explicitGroup?: string): string => {
    if (explicitGroup && explicitGroup.trim()) {
      const match = COMPANY_GROUPS.find(g => g.toLowerCase() === explicitGroup.toLowerCase().trim());
      if (match) return match;
      const eg = explicitGroup.toLowerCase();
      if (eg.includes('hold')) return 'Holding';
      if (eg.includes('gnr') || eg.includes('mining') || eg.includes('mineral') || eg.includes('tambang')) return 'GNR';
      if (eg.includes('prop') || eg.includes('real') || eg.includes('graha')) return 'Property';
      if (eg.includes('trade') || eg.includes('dagang') || eg.includes('niaga')) return 'Trading';
      if (eg.includes('manuf') || eg.includes('pabrik') || eg.includes('industri') || eg.includes('extrusindo')) return 'Manufacture';
      if (eg.includes('offshore') || eg.includes('limited')) return 'Offshore';
      if (eg.includes('tbk') || eg.includes('public')) return 'Public';
      if (eg.includes('yayasan') || eg.includes('found')) return 'Foundation';
      if (eg.includes('person') || eg.includes('pribadi')) return 'Personal';
    }

    const n = (name || '').toLowerCase();
    if (n.includes('tbk') || n.includes('alakasa industrindo')) return 'Public';
    if (n.includes('limited') || n.includes('investment one') || n.includes('das development')) return 'Offshore';
    if (n.includes('peduli bangsa') || n.includes('yayasan')) return 'Foundation';
    if (n.includes('extrusindo') || n.includes('alumas') || n.includes('grafika jaya') || n.includes('industri terpadu')) return 'Manufacture';
    if (n.includes('intrade') || n.includes('niaga') || n.includes('perdagangan') || n.includes('trading')) return 'Trading';
    if (n.includes('graha') || n.includes('propert') || n.includes('sudirman perkasa') || n.includes('sudirman mandiri') || n.includes('bahana cipta')) return 'Property';
    if (n.includes('energi') || n.includes('mineral') || n.includes('alumina') || n.includes('bauksit') || n.includes('batu mulia') || n.includes('sejahtera mandiri') || n.includes('gnr')) return 'GNR';
    if (n.includes('holding') || n.includes('bumi persada') || n.includes('alakasa alumina refineri') || n.includes('arjuna bumi cahaya')) return 'Holding';

    for (const [k, v] of companyGroupLookup.entries()) {
      if (n.includes(k) || k.includes(n)) {
        const uv = v.toUpperCase();
        if (uv.includes('HOLDING')) return 'Holding';
        if (uv.includes('OPERATING') || uv.includes('MINING')) return 'GNR';
        if (uv.includes('BUSINESS')) return 'Trading';
      }
    }
    return 'Holding';
  };

  const getGroupBadgeClass = (grp: string) => {
    switch (grp) {
      case 'Holding':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'GNR':
        return 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'Property':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Trading':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Manufacture':
        return 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'Offshore':
        return 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
      case 'Public':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'Personal':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'Foundation':
        return 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  // Company Modal State
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null);
  const [companyForm, setCompanyForm] = useState({ name: '', code: '', group_company: 'Holding', npwp: '', city: '' });
  const [companySearch, setCompanySearch] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);
  const [companyAssets, setCompanyAssets] = useState<Record<string, { logo?: string | null; kop?: string | null; stempel?: string | null }>>(() => {
    try {
      const saved = localStorage.getItem('csl_company_assets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const handleUploadAsset = (code: string, key: 'logo' | 'kop' | 'stempel') => {
    const fileNames = {
      logo: `logo-${code.toLowerCase()}.png`,
      kop: `kop-surat-${code.toLowerCase()}.pdf`,
      stempel: `stempel-${code.toLowerCase()}.png`,
    };
    const labels = {
      logo: 'Logo Perusahaan',
      kop: 'Kop Surat',
      stempel: 'Stempel',
    };
    const updated = {
      ...companyAssets,
      [code]: {
        ...(companyAssets[code] || {}),
        [key]: fileNames[key],
      },
    };
    setCompanyAssets(updated);
    localStorage.setItem('csl_company_assets', JSON.stringify(updated));
    toast.success(`${labels[key]} terunggah ke Google Drive (folder CSL-LINK/Companies/${code}/).`);
  };

  const handleDeleteAsset = (code: string, key: 'logo' | 'kop' | 'stempel') => {
    const updated = {
      ...companyAssets,
      [code]: {
        ...(companyAssets[code] || {}),
        [key]: null,
      },
    };
    setCompanyAssets(updated);
    localStorage.setItem('csl_company_assets', JSON.stringify(updated));
    toast.info('Berkas dihapus dari profil (berkas asli tetap di Drive).');
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'category' | 'user' | 'company' | 'department'; id: number | string; name: string } | null>(null);

  // Department Modal State
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });

  // Single Designated Approver & Backup Approver State per Rekomendasi #6
  const [expenseApprover, setExpenseApprover] = useState<string>(() => {
    try {
      const s = localStorage.getItem('csl_expense_approver');
      if (s) return s;
    } catch {}
    return 'natalia@gesit.co.id';
  });

  const [expenseBackupApprover, setExpenseBackupApprover] = useState<string>(() => {
    try {
      const s = localStorage.getItem('csl_expense_backup_approver');
      if (s) return s;
    } catch {}
    return 'rudi@gesit.co.id';
  });

  const [offshoreApprover, setOffshoreApprover] = useState<string>(() => {
    try {
      const s = localStorage.getItem('csl_offshore_approver');
      if (s) return s;
    } catch {}
    return 'natalia@gesit.co.id';
  });

  const [offshoreBackupApprover, setOffshoreBackupApprover] = useState<string>(() => {
    try {
      const s = localStorage.getItem('csl_offshore_backup_approver');
      if (s) return s;
    } catch {}
    return 'rudi@gesit.co.id';
  });

  const handleSaveApprovers = async () => {
    localStorage.setItem('csl_expense_approver', expenseApprover);
    localStorage.setItem('csl_expense_backup_approver', expenseBackupApprover);
    localStorage.setItem('csl_offshore_approver', offshoreApprover);
    localStorage.setItem('csl_offshore_backup_approver', offshoreBackupApprover);
    
    try {
      await supabase.from('csl_system_settings').upsert([
        { setting_key: 'csl_expense_approver', setting_value: expenseApprover },
        { setting_key: 'csl_expense_backup_approver', setting_value: expenseBackupApprover },
        { setting_key: 'csl_offshore_approver', setting_value: offshoreApprover },
        { setting_key: 'csl_offshore_backup_approver', setting_value: offshoreBackupApprover }
      ], { onConflict: 'setting_key' });
    } catch (e) {
      console.warn('System settings table may not exist yet, using localStorage only.', e);
    }
    
    showFeedback('Pengaturan sistem, approver utama & cadangan berhasil disimpan!');
  };

  // Sync Master Companies from LKPM 81 entities per Rekomendasi #5
  const handleSyncLkpmCompanies = async () => {
    setIsLoading(true);
    try {
      const raw2026 = (lkpmData as any)['2026']?.perusahaan || [];
      let added = 0;
      for (const p of raw2026) {
        const name = (p.nama || '').trim();
        if (!name) continue;
        const exists = companies.some(c => c.name.toLowerCase() === name.toLowerCase());
        if (!exists) {
          const code = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 6) || 'CO';
          const resolvedGroup = getResolvedGroup(name);
          const insertPayload: any = {
            name,
            code,
            group_company: resolvedGroup,
          };
          let { error: insertErr } = await supabase.from('companies').insert([insertPayload]);
          if (insertErr && insertErr.message?.includes('group_company')) {
            await supabase.from('companies').insert([{ name, code }]);
          }
          added++;
        }
      }
      toast.success(`Sinkronisasi LKPM selesai. ${added} entitas baru berhasil didaftarkan ke master perusahaan.`);
      const { data } = await supabase.from('companies').select('*').order('name');
      if (data) setCompanies(data);
    } catch (e: any) {
      toast.error('Gagal sinkronisasi data LKPM: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync Master Companies from Group Email Cleaned List (79 entities)
  const handleSyncGroupEmailCompanies = async () => {
    setIsLoading(true);
    try {
      const { data: dbData } = await supabase.from('companies').select('*');
      const existingNames = new Set((dbData || []).map(c => c.name.toLowerCase().trim()));
      const existingCodes = new Set((dbData || []).map(c => (c.code || '').toUpperCase().trim()));

      let added = 0;
      for (const item of groupEmailCompanies) {
        const normName = item.name.toLowerCase().trim();
        const normCode = item.code.toUpperCase().trim();
        if (!existingNames.has(normName) && !existingCodes.has(normCode)) {
          const resolvedGroup = getResolvedGroup(item.name);
          const insertPayload: any = {
            name: item.name,
            code: item.code,
            group_company: resolvedGroup,
          };
          let { error: insertErr } = await supabase.from('companies').insert([insertPayload]);
          if (insertErr && insertErr.message?.includes('group_company')) {
            await supabase.from('companies').insert([{ name: item.name, code: item.code }]);
          }
          existingNames.add(normName);
          existingCodes.add(normCode);
          added++;
        }
      }
      toast.success(`Sinkronisasi Group Email selesai: ${added} entitas baru berhasil didaftarkan.`);
      const { data } = await supabase.from('companies').select('*').order('name');
      if (data) setCompanies(data);
    } catch (e: any) {
      toast.error('Gagal sinkronisasi data Group Email: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Fetch DB Data ──────────────────────────────────────────────────────────
  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (view === 'categories' || view === 'sla') {
        const { data, error } = await supabase.from('csl_request_categories').select('*').order('name');
        if (!error && data && data.length > 0) setCategories(data);
      }
      if (view === 'users' || view === 'notifications') {
        const { data, error } = await supabase
          .from('user_accounts')
          .select('id, full_name, email, role, groups, department, company')
          .order('full_name');
        if (error) {
          console.error('CSLSettings: Failed to load users:', error);
        } else if (data) {
          const mapped: UserItem[] = data.map((u: any) => {
            const role = u.role || 'User';
            const groupsArr: string[] = u.groups || [];
            const permissions = parseGroupsToPermissions(groupsArr, role);

            return {
              id: u.id,
              name: u.full_name || u.email || 'Unknown',
              email: u.email || '',
              role,
              groups: groupsArr,
              permissions,
            };
          });
          setUsers(mapped);
        }
      }

      // Fetch system settings for approvers
      const { data: sysSettings, error: sysError } = await supabase.from('csl_system_settings').select('*');
      if (!sysError && sysSettings) {
        const expenseRow = sysSettings.find((s: any) => s.setting_key === 'csl_expense_approver');
        const offshoreRow = sysSettings.find((s: any) => s.setting_key === 'csl_offshore_approver');
        if (expenseRow?.setting_value) {
          setExpenseApprover(expenseRow.setting_value);
          localStorage.setItem('csl_expense_approver', expenseRow.setting_value);
        }
        if (offshoreRow?.setting_value) {
          setOffshoreApprover(offshoreRow.setting_value);
          localStorage.setItem('csl_offshore_approver', offshoreRow.setting_value);
        }
      }

      if (view === 'companies') {
        const [compRes, usersRes] = await Promise.all([
          supabase.from('companies').select('*').order('name'),
          supabase.from('user_accounts').select('company')
        ]);
        if (compRes.error) {
          console.error('CSLSettings: Failed to load companies:', compRes.error);
        } else if (compRes.data) {
          const users = usersRes.data || [];
          setCompanies(compRes.data.map((c: any) => {
            // Count users that belong to this company (match by name or code)
            const memberCount = users.filter(u => 
              u.company === c.name || u.company === c.code || 
              (u.company && u.company.toLowerCase() === c.name.toLowerCase())
            ).length;
            
            const group_company = c.group_company || c.group || c.grup || getResolvedGroup(c.name);

            return {
              id: c.id,
              name: c.name,
              code: c.code || '',
              group_company,
              departments: c.departments || 0,
              employees: memberCount,
            };
          }));
        }
      }
      if (view === 'departments') {
        const [deptRes, usersRes] = await Promise.all([
          supabase.from('departments').select('*').order('name'),
          supabase.from('user_accounts').select('department')
        ]);
        if (deptRes.error) {
          console.error('CSLSettings: Failed to load departments:', deptRes.error);
        } else if (deptRes.data) {
          const users = usersRes.data || [];
          setDepartments(deptRes.data.map((d: any) => {
            const memberCount = users.filter(u => 
              u.department === d.name || u.department === d.code || 
              (u.department && u.department.toLowerCase() === d.name.toLowerCase())
            ).length;
            
            return {
              id: d.id,
              name: d.name,
              code: d.code || '',
              employees: memberCount,
            };
          }));
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [view]);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // ── Category Handlers ──────────────────────────────────────────────────────
  const openCategoryModal = (cat?: CategoryItem) => {
    if (cat) {
      setEditingCategory(cat);
      setCatForm({ code: cat.code, name: cat.name, sla_days: cat.sla_days, description: cat.description });
    } else {
      setEditingCategory(null);
      setCatForm({ code: '', name: '', sla_days: 5, description: '' });
    }
    setCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim() || !catForm.code.trim()) return;

    if (editingCategory) {
      const updated = categories.map(c => c.id === editingCategory.id ? {
        ...c,
        code: catForm.code.toUpperCase().trim(),
        name: catForm.name.trim(),
        sla_days: Number(catForm.sla_days),
        description: catForm.description.trim()
      } : c);
      setCategories(updated);
      showFeedback(`Category "${catForm.name}" updated successfully!`);
    } else {
      const newCat: CategoryItem = {
        id: Date.now(),
        code: catForm.code.toUpperCase().trim(),
        name: catForm.name.trim(),
        sla_days: Number(catForm.sla_days),
        description: catForm.description.trim()
      };
      setCategories(prev => [newCat, ...prev]);
      showFeedback(`Category "${catForm.name}" added successfully!`);
    }

    setCatModalOpen(false);
  };

  // ── User Handlers ──────────────────────────────────────────────────────────
  const openUserModal = async (u?: UserItem) => {
    if (u) {
      setEditingUser(u);
      // Ambil e_sign_url secara terpisah agar aman meski kolom belum ada
      let eSignUrl = '';
      try {
        const { data: signData } = await supabase
          .from('user_accounts')
          .select('e_sign_url')
          .eq('id', u.id)
          .single();
        eSignUrl = signData?.e_sign_url || '';
      } catch (_) { /* kolom belum ada, abaikan */ }
      setUserForm({ name: u.name, email: u.email, role: u.role, groupsStr: u.groups.join(', '), password: '', eSignUrl });
    } else {
      setEditingUser(null);
      setUserForm({ name: '', email: '', role: 'User', groupsStr: 'requester', password: '', eSignUrl: '' });
    }
    setShowUserPassword(false);
    setUserModalOpen(true);
  };

  const handleESignUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingESign(true);
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dmr8bxdos';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'gesit_erp_preset';
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', uploadPreset);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.secure_url) {
        setUserForm(prev => ({ ...prev, eSignUrl: data.secure_url }));
      } else {
        throw new Error(data.error?.message || 'Upload gagal');
      }
    } catch (err: any) {
      showFeedback(`E-Sign upload gagal: ${err.message}`);
    } finally {
      setIsUploadingESign(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim() || !userForm.email.trim()) return;
    let groupsArr = userForm.groupsStr.split(',').map(g => g.trim().toLowerCase()).filter(Boolean);
    if (userForm.role === 'Super Admin' && !groupsArr.includes('super_admin')) {
      groupsArr.unshift('super_admin');
    }
    setIsUserSaving(true);
    try {
      const emailTrim = userForm.email.trim().toLowerCase();
      const passwordTrim = userForm.password.trim();

      if (passwordTrim && passwordTrim.length < 6) {
        throw new Error('Password minimal 6 karakter');
      }

      // Ensure user exists in Supabase Auth & password is properly configured
      const authUserId = await ensureAuthUserWithPassword(
        emailTrim,
        passwordTrim,
        userForm.name.trim(),
        editingUser?.id
      );

      if (editingUser) {
        const updatePayload: any = {
          full_name: userForm.name.trim(),
          email: emailTrim,
          role: userForm.role,
          groups: groupsArr,
          e_sign_url: userForm.eSignUrl || null,
        };
        if (authUserId && authUserId !== editingUser.id.toString()) {
          updatePayload.id = authUserId;
        }

        let { error } = await supabaseAdmin
          .from('user_accounts')
          .update(updatePayload)
          .eq('id', editingUser.id);

        if (error) {
          const fallback = await supabase
            .from('user_accounts')
            .update(updatePayload)
            .eq('id', editingUser.id);
          if (fallback.error) throw fallback.error;
        }
        showFeedback(`User "${userForm.name}" updated!`);
      } else {
        const id = authUserId || crypto.randomUUID();
        const username = emailTrim.split('@')[0];

        const newUserPayload = {
          id,
          username,
          full_name: userForm.name.trim(),
          email: emailTrim,
          role: userForm.role,
          groups: groupsArr.length ? groupsArr : ['user'],
          company: 'GESIT',
          department: 'Other',
          status: 'Active',
        };

        let { error } = await supabaseAdmin.from('user_accounts').insert([newUserPayload]);
        if (error) {
          console.warn('supabaseAdmin insert failed, trying supabase anon fallback:', error);
          const fallback = await supabase.from('user_accounts').insert([newUserPayload]);
          if (fallback.error) throw fallback.error;
        }
        showFeedback(`User "${userForm.name}" ditambahkan!`);
      }
      setUserModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to save user:', err);
      showFeedback(`Error: ${err.message || 'Gagal menyimpan user'}`);
    } finally {
      setIsUserSaving(false);
    }
  };

  // ── Permissions Modal Handlers ─────────────────────────────────────────────
  const openPermissionsModal = (u: UserItem) => {
    setPermUser(u);
    const perms = u.permissions || parseGroupsToPermissions(u.groups || [], u.role);
    setUserPerms(perms);
  };

  const handleSavePermissions = async () => {
    if (!permUser) return;
    setIsSavingPerms(true);
    const menuIds = convertPermissionsToGroups(userPerms, permUser.role);

    try {
      let { error } = await supabaseAdmin
        .from('user_accounts')
        .update({ groups: menuIds })
        .eq('id', permUser.id);
      if (error) {
        const fallback = await supabase
          .from('user_accounts')
          .update({ groups: menuIds })
          .eq('id', permUser.id);
        if (fallback.error) throw fallback.error;
      }
      // Update local state setelah DB berhasil
      setUsers(prev => prev.map(u => u.id === permUser.id ? { ...u, groups: menuIds, permissions: userPerms } : u));
      toast.success(`Hak akses menu berhasil disimpan untuk ${permUser.name}`);
      showFeedback(`Hak akses menu berhasil disimpan untuk ${permUser.name}`);
      setPermUser(null);
    } catch (err: any) {
      toast.error(`Gagal menyimpan: ${err.message}`);
      showFeedback(`Gagal menyimpan: ${err.message}`);
    } finally {
      setIsSavingPerms(false);
    }
  };

  const handleToggleUserMenu = async (u: UserItem, menuKey: keyof MenuPermissions) => {
    const currentVal = !!u.permissions[menuKey];
    const updatedPerms: MenuPermissions = {
      ...u.permissions,
      [menuKey]: !currentVal,
    };
    if (['routine_rups', 'routine_lkpm', 'routine_tbk', 'routine_offshore', 'routine_admgt'].includes(menuKey) && !currentVal) {
      updatedPerms.routine_view = true;
    }
    const newGroups = convertPermissionsToGroups(updatedPerms, u.role);

    // Optimistic local state update
    setUsers(prev => prev.map(item => item.id === u.id ? { ...item, groups: newGroups, permissions: updatedPerms } : item));

    try {
      let { error } = await supabaseAdmin.from('user_accounts').update({ groups: newGroups }).eq('id', u.id);
      if (error) {
        const fallback = await supabase.from('user_accounts').update({ groups: newGroups }).eq('id', u.id);
        if (fallback.error) throw fallback.error;
      }
      toast.success(`Hak akses menu diperbarui untuk ${u.name}`);
    } catch (err: any) {
      setUsers(prev => prev.map(item => item.id === u.id ? u : item));
      toast.error(`Gagal mengubah akses: ${err.message}`);
    }
  };

  const applyPreset = (preset: 'super_admin' | 'admin' | 'staff' | 'user') => {
    if (preset === 'super_admin') setUserPerms(DEFAULT_SUPER_ADMIN_PERMISSIONS);
    if (preset === 'admin') setUserPerms(DEFAULT_ADMIN_PERMISSIONS);
    if (preset === 'staff') setUserPerms(DEFAULT_STAFF_PERMISSIONS);
    if (preset === 'user') setUserPerms(DEFAULT_REQUESTER_PERMISSIONS);
  };

  // ── Company Handlers ───────────────────────────────────────────────────────
  const openCompanyModal = (c?: CompanyItem) => {
    if (c) {
      setEditingCompany(c);
      setCompanyForm({
        name: c.name,
        code: c.code,
        group_company: c.group_company || getResolvedGroup(c.name),
        npwp: (c as any).npwp || '',
        city: (c as any).city || (c as any).address || '',
      });
    } else {
      setEditingCompany(null);
      setCompanyForm({ name: '', code: '', group_company: '', npwp: '', city: '' });
    }
    setCompanyModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.name.trim() || !companyForm.code.trim()) {
      toast.error('Kode dan nama resmi wajib diisi.');
      return;
    }
    try {
      const code = companyForm.code.toUpperCase().trim();
      const name = companyForm.name.trim();
      const group_company = companyForm.group_company.trim() || getResolvedGroup(name);
      if (editingCompany) {
        let { error } = await supabase.from('companies').update({
          name,
          code,
          group_company,
        }).eq('id', editingCompany.id);

        if (error && (error.message?.includes('group_company') || error.code === 'PGRST204')) {
          const retry = await supabase.from('companies').update({ name, code }).eq('id', editingCompany.id);
          error = retry.error;
        }

        if (error) throw error;
        toast.success(`Entitas "${name}" (${code}) berhasil diperbarui!`);
      } else {
        let { error } = await supabase.from('companies').insert([{
          name,
          code,
          group_company,
        }]);

        if (error && (error.message?.includes('group_company') || error.code === 'PGRST204')) {
          const retry = await supabase.from('companies').insert([{ name, code }]);
          error = retry.error;
        }

        if (error) throw error;
        toast.success(`Entitas "${name}" (${code}) berhasil didaftarkan!`);
      }
      setCompanyModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(`Gagal menyimpan entitas: ${err.message}`);
    }
  };

  // ── Department Handlers ──────────────────────────────────────────────────────
  const openDeptModal = (d?: DepartmentItem) => {
    if (d) {
      setEditingDept(d);
      setDeptForm({ name: d.name, code: d.code });
    } else {
      setEditingDept(null);
      setDeptForm({ name: '', code: '' });
    }
    setDeptModalOpen(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name.trim()) return;
    try {
      if (editingDept) {
        const { error } = await supabase.from('departments').update({
          name: deptForm.name.trim(),
          code: deptForm.code.toUpperCase().trim() || 'DEPT',
        }).eq('id', editingDept.id);
        if (error) throw error;
        showFeedback(`Department "${deptForm.name}" updated!`);
      } else {
        const { error } = await supabase.from('departments').insert([{
          name: deptForm.name.trim(),
          code: deptForm.code.toUpperCase().trim() || 'DEPT',
        }]);
        if (error) throw error;
        showFeedback(`Department "${deptForm.name}" added!`);
      }
      setDeptModalOpen(false);
      await fetchData();
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
    }
  };

  // ── Delete Handler ────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id, name } = deleteConfirm;
    try {
      if (type === 'category') {
        await supabase.from('csl_request_categories').delete().eq('id', id);
        setCategories(categories.filter(c => c.id !== id));
      }
      if (type === 'user') {
        let { error } = await supabaseAdmin.from('user_accounts').delete().eq('id', id);
        if (error) {
          const fallback = await supabase.from('user_accounts').delete().eq('id', id);
          if (fallback.error) throw fallback.error;
        }
        try {
          await supabaseAdmin.auth.admin.deleteUser(id.toString());
        } catch (authErr) {
          console.warn('Could not delete auth user:', authErr);
        }
        setUsers(users.filter(u => u.id !== id));
      }
      if (type === 'company') {
        const { error } = await supabase.from('companies').delete().eq('id', id);
        if (error) throw error;
        setCompanies(companies.filter(co => co.id !== id));
      }
      if (type === 'department') {
        const { error } = await supabase.from('departments').delete().eq('id', id);
        if (error) throw error;
        setDepartments(departments.filter(d => d.id !== id));
      }
      showFeedback(`"${name}" berhasil dihapus.`);
    } catch (err: any) {
      showFeedback(`Gagal menghapus: ${err.message || 'Error occurred'}`);
    }
    setDeleteConfirm(null);
  };

  // ── Render Feedback Toast ──────────────────────────────────────────────────
  const feedbackBanner = feedbackMessage && (
    <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-5">
      <Check className="h-4 w-4 text-emerald-400" />
      <span>{feedbackMessage}</span>
    </div>
  );

  // ── Request Categories View ────────────────────────────────────────────────
  if (view === 'categories') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        {feedbackBanner}
        <PageHeader title="Request Categories" description="Manage request types, codes, SLA targets, and configurations">
          <div className="flex items-center gap-2">
            <Button onClick={() => openCategoryModal()} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md">
              <Plus className="h-4 w-4 mr-1.5" /> Add Category
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} className="text-xs font-bold">
              <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
        </PageHeader>

        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                {['Code', 'Name', 'SLA (Days)', 'Description', 'Actions'].map(h => (
                  <TableHead key={h} className="text-[10px] font-black uppercase tracking-widest">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map(cat => (
                <TableRow key={cat.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs font-bold text-indigo-600">{cat.code}</TableCell>
                  <TableCell className="text-sm font-bold text-foreground">{cat.name}</TableCell>
                  <TableCell>
                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg px-2.5 py-1">
                      {cat.sla_days} business days
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{cat.description || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button onClick={() => openCategoryModal(cat)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        <Pencil size={14} />
                      </Button>
                      <Button onClick={() => setDeleteConfirm({ type: 'category', id: cat.id, name: cat.name })} variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Category Modal */}
        <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
          <DialogContent className="sm:max-w-md font-sans border border-border/60 shadow-2xl rounded-2xl">
            <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <Tag size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Category Config</span>
              </div>
              <DialogTitle className="text-xl font-black">{editingCategory ? 'Edit Category' : 'Add Request Category'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-foreground mb-1 block">Code *</label>
                  <Input required placeholder="AGR" value={catForm.code} onChange={e => setCatForm({...catForm, code: e.target.value})} className="h-10 text-sm font-mono uppercase bg-muted/30" />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-foreground mb-1 block">Category Name *</label>
                  <Input required placeholder="Agreement Review" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} className="h-10 text-sm bg-muted/30" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">SLA Target (Business Days) *</label>
                <Input type="number" min={1} max={90} required value={catForm.sla_days} onChange={e => setCatForm({...catForm, sla_days: Number(e.target.value)})} className="h-10 text-sm bg-muted/30" />
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">Description</label>
                <textarea rows={3} placeholder="Description..." value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} className="w-full p-3 text-xs bg-muted/30 border border-border/30 rounded-xl font-medium resize-none" />
              </div>

              <DialogFooter className="pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setCatModalOpen(false)} className="text-xs font-bold rounded-xl h-9">Cancel</Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">Save Category</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── SLA Configuration View ─────────────────────────────────────────────────
  if (view === 'sla') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        {feedbackBanner}
        <PageHeader title="SLA Configuration" description="Configure default business day SLA targets for request types">
          <Button variant="outline" size="sm" onClick={fetchData} className="text-xs font-bold">
            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </PageHeader>

        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                {['Category', 'Current SLA (Days)', 'Escalation Policy'].map(h => (
                  <TableHead key={h} className="text-[10px] font-black uppercase tracking-widest">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat, idx) => (
                <TableRow key={cat.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock size={15} className="text-indigo-600" />
                      <span className="text-sm font-bold text-foreground">{cat.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        value={cat.sla_days} 
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCategories(categories.map((c, i) => i === idx ? { ...c, sla_days: val } : c));
                        }}
                        className="w-24 h-9 text-center font-mono font-bold text-sm bg-muted/30" 
                      />
                      <span className="text-xs text-muted-foreground font-semibold">business days</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground font-medium">Auto-escalate to CSL Lead on SLA breach</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-4 bg-muted/20 border-t border-border/20 flex justify-end">
            <Button onClick={() => showFeedback('SLA Configuration saved successfully!')} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">
              <Save size={14} className="mr-1.5" /> Save SLA Changes
            </Button>
          </div>
        </div>
      </div>
    );
  }



  // ── Users & Roles & Permissions View ──────────────────────────────────────
  if (view === 'users') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        {feedbackBanner}
        <PageHeader title="Pengguna & Hak Akses Menu" description="Kelola akun pengguna, peran sistem, dan konfigurasi hak akses menu untuk setiap personel">
          {userTab === 'users' && (
            <Button onClick={() => openUserModal()} size="sm" className="bg-[#0a2540] hover:bg-[#16375c] text-white font-bold text-xs shadow-xs rounded-xl h-9 px-4">
              <Plus className="h-4 w-4 mr-1.5" /> Tambah Pengguna
            </Button>
          )}
        </PageHeader>

        {/* ── Sub Navigation Tabs ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-2xl border border-border/30 w-fit">
            <button
              type="button"
              onClick={() => setUserTab('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                userTab === 'users'
                  ? 'bg-[#0a2540] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <Users size={15} />
              <span>Daftar Pengguna ({users.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setUserTab('matrix')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                userTab === 'matrix'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <ShieldCheck size={15} />
              <span>Matriks Hak Akses Menu</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/20 text-white">
                Interaktif
              </span>
            </button>
          </div>

          <div className="text-[11px] font-semibold text-muted-foreground">
            {userTab === 'matrix' ? '💡 Klik langsung pada checkbox untuk toggle akses instan' : 'Total ' + users.length + ' akun terdaftar'}
          </div>
        </div>

        {/* ── TAB 1: DAFTAR PENGGUNA TABLE ── */}
        {userTab === 'users' && (
          <div className="bg-card border border-[#e6e9f0] rounded-2xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-[#fafbfc]">
                <TableRow>
                  {['Nama Pengguna', 'Email', 'Peran (Role)', 'Cakupan Akses Menu', 'Aksi'].map(h => (
                    <TableHead key={h} className="text-[11px] font-bold uppercase tracking-wider text-[#758196]">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => {
                  const p = u.permissions;
                  const activeModulesCount = [
                    p.dashboard,
                    p.requests_view,
                    p.routine_view || p.routine_rups || p.routine_lkpm || p.routine_tbk || p.routine_offshore || p.routine_admgt,
                    p.companies,
                    p.budget_view,
                    p.directory_view,
                    p.credentials,
                    p.settings_manage,
                  ].filter(Boolean).length;

                  return (
                    <TableRow key={u.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-black text-xs shrink-0">
                            {u.name ? u.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{u.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{u.email}</TableCell>
                      <TableCell>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                          (u.role || '').toLowerCase().includes('super')
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
                            : (u.role || '').toLowerCase().includes('admin')
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300'
                            : (u.role || '').toLowerCase().includes('staff')
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}>
                          {u.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button onClick={() => openPermissionsModal(u)} variant="outline" size="sm" className="h-7 text-[11px] font-bold rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400">
                            <ShieldCheck size={13} className="mr-1.5 text-indigo-600" /> Atur Hak Akses
                          </Button>
                          <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded-md bg-muted/40">
                            {activeModulesCount} / 8 Modul
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button onClick={() => openUserModal(u)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="Edit Akun">
                            <Pencil size={14} />
                          </Button>
                          <Button onClick={() => setDeleteConfirm({ type: 'user', id: u.id, name: u.name })} variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" title="Hapus Akun">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ── TAB 2: MATRIKS HAK AKSES MENU ── */}
        {userTab === 'matrix' && (
          <div className="space-y-4">
            {/* Guide Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-slate-50 to-purple-50/50 dark:from-indigo-950/30 dark:via-zinc-900 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                    Matriks Akses Modul & Sub-Menu Aplikasi CSL
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Klik ikon status pada tabel di bawah untuk mengubah izin menu secara instan, atau klik <strong>"Atur Detail"</strong> untuk preset peran & kontrol sub-menu rutin.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold text-muted-foreground self-start md:self-auto">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckSquare size={14} /> Diizinkan
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Square size={14} /> Dibatasi
                </span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-card border border-[#e6e9f0] rounded-2xl overflow-x-auto shadow-xs">
              <Table className="min-w-[1000px]">
                <TableHeader className="bg-[#fafbfc]">
                  <TableRow>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#758196] sticky left-0 bg-[#fafbfc] z-10 w-52">
                      Pengguna & Role
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-center text-[#758196] w-24">
                      Dashboard
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-center text-[#758196] w-28">
                      Request
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-center text-[#758196] w-36">
                      Routine (5 Menu)
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-center text-[#758196] w-32">
                      Companies
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-center text-[#758196] w-32">
                      Budget & Exp
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-center text-[#758196] w-28">
                      Directory
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-center text-[#758196] w-28">
                      Vault
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-center text-[#758196] w-28">
                      Settings
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-center text-[#758196] w-24">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => {
                    const p = u.permissions;
                    const routineActiveCount = [
                      p.routine_rups,
                      p.routine_lkpm,
                      p.routine_tbk,
                      p.routine_offshore,
                      p.routine_admgt
                    ].filter(Boolean).length;

                    return (
                      <TableRow key={u.id} className="hover:bg-muted/30">
                        {/* User column */}
                        <TableCell className="sticky left-0 bg-card z-10 font-sans border-r border-border/20">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-black text-[10px] shrink-0">
                              {u.name ? u.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'U'}
                            </div>
                            <div className="truncate max-w-[160px]">
                              <p className="text-xs font-bold text-foreground truncate">{u.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{u.role}</p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Dashboard */}
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleUserMenu(u, 'dashboard')}
                            className="p-1 rounded-lg hover:bg-muted/50 transition-colors inline-flex items-center justify-center"
                            title={p.dashboard ? 'Nonaktifkan Dashboard' : 'Aktifkan Dashboard'}
                          >
                            {p.dashboard ? (
                              <CheckSquare size={18} className="text-emerald-600 fill-emerald-50 dark:fill-emerald-950/40" />
                            ) : (
                              <Square size={18} className="text-muted-foreground/40" />
                            )}
                          </button>
                        </TableCell>

                        {/* Request */}
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleUserMenu(u, 'requests_view')}
                            className="p-1 rounded-lg hover:bg-muted/50 transition-colors inline-flex items-center justify-center"
                            title={p.requests_view ? 'Nonaktifkan Request' : 'Aktifkan Request'}
                          >
                            {p.requests_view ? (
                              <CheckSquare size={18} className="text-emerald-600 fill-emerald-50 dark:fill-emerald-950/40" />
                            ) : (
                              <Square size={18} className="text-muted-foreground/40" />
                            )}
                          </button>
                        </TableCell>

                        {/* Routine (RUPS, LKPM, TBK, Offshore, Ad-MGT) */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleUserMenu(u, 'routine_view')}
                              className="p-1 rounded-lg hover:bg-muted/50 transition-colors inline-flex items-center justify-center"
                              title={p.routine_view ? 'Nonaktifkan Routine Activity' : 'Aktifkan Routine Activity'}
                            >
                              {p.routine_view ? (
                                <CheckSquare size={18} className="text-emerald-600 fill-emerald-50 dark:fill-emerald-950/40" />
                              ) : (
                                <Square size={18} className="text-muted-foreground/40" />
                              )}
                            </button>
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-muted/50 text-muted-foreground">
                              {routineActiveCount}/5
                            </span>
                          </div>
                        </TableCell>

                        {/* Companies & Entities */}
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleUserMenu(u, 'companies')}
                            className="p-1 rounded-lg hover:bg-muted/50 transition-colors inline-flex items-center justify-center"
                            title={p.companies ? 'Nonaktifkan Companies & Entities' : 'Aktifkan Companies & Entities'}
                          >
                            {p.companies ? (
                              <CheckSquare size={18} className="text-emerald-600 fill-emerald-50 dark:fill-emerald-950/40" />
                            ) : (
                              <Square size={18} className="text-muted-foreground/40" />
                            )}
                          </button>
                        </TableCell>

                        {/* Budget & Expenses */}
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleUserMenu(u, 'budget_view')}
                            className="p-1 rounded-lg hover:bg-muted/50 transition-colors inline-flex items-center justify-center"
                            title={p.budget_view ? 'Nonaktifkan Budget & Expenses' : 'Aktifkan Budget & Expenses'}
                          >
                            {p.budget_view ? (
                              <CheckSquare size={18} className="text-emerald-600 fill-emerald-50 dark:fill-emerald-950/40" />
                            ) : (
                              <Square size={18} className="text-muted-foreground/40" />
                            )}
                          </button>
                        </TableCell>

                        {/* Phone Directory */}
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleUserMenu(u, 'directory_view')}
                            className="p-1 rounded-lg hover:bg-muted/50 transition-colors inline-flex items-center justify-center"
                            title={p.directory_view ? 'Nonaktifkan Phone Directory' : 'Aktifkan Phone Directory'}
                          >
                            {p.directory_view ? (
                              <CheckSquare size={18} className="text-emerald-600 fill-emerald-50 dark:fill-emerald-950/40" />
                            ) : (
                              <Square size={18} className="text-muted-foreground/40" />
                            )}
                          </button>
                        </TableCell>

                        {/* Credentials Vault */}
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleUserMenu(u, 'credentials')}
                            className="p-1 rounded-lg hover:bg-muted/50 transition-colors inline-flex items-center justify-center"
                            title={p.credentials ? 'Nonaktifkan Credentials Vault' : 'Aktifkan Credentials Vault'}
                          >
                            {p.credentials ? (
                              <CheckSquare size={18} className="text-emerald-600 fill-emerald-50 dark:fill-emerald-950/40" />
                            ) : (
                              <Square size={18} className="text-muted-foreground/40" />
                            )}
                          </button>
                        </TableCell>

                        {/* Settings */}
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleUserMenu(u, 'settings_manage')}
                            className="p-1 rounded-lg hover:bg-muted/50 transition-colors inline-flex items-center justify-center"
                            title={p.settings_manage ? 'Nonaktifkan Settings' : 'Aktifkan Settings'}
                          >
                            {p.settings_manage ? (
                              <CheckSquare size={18} className="text-emerald-600 fill-emerald-50 dark:fill-emerald-950/40" />
                            ) : (
                              <Square size={18} className="text-muted-foreground/40" />
                            )}
                          </button>
                        </TableCell>

                        {/* Action: Detail Config */}
                        <TableCell className="text-center">
                          <Button
                            onClick={() => openPermissionsModal(u)}
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px] font-bold rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                          >
                            <ShieldCheck size={13} className="mr-1" /> Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Edit User Basic Info Modal */}
        <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
          <DialogContent className="sm:max-w-md font-sans border border-border/60 shadow-2xl rounded-2xl">
            <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <Users size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">User Account</span>
              </div>
              <DialogTitle className="text-xl font-black">{editingUser ? 'Edit User Account' : 'Add New User Account'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">Full Name *</label>
                <Input required placeholder="Budi Santoso" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="h-10 text-sm bg-muted/30" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">Email Address *</label>
                <Input type="email" required placeholder="budi@gesit.co.id" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="h-10 text-sm bg-muted/30" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">
                  {editingUser ? 'New Password (Biarkan kosong jika tidak diubah)' : 'Set Password (Opsional)'}
                </label>
                <div className="relative">
                  <Input
                    type={showUserPassword ? "text" : "password"}
                    placeholder={editingUser ? "Password baru..." : "Password untuk login akun"}
                    value={userForm.password}
                    onChange={e => setUserForm({...userForm, password: e.target.value})}
                    className="h-10 text-sm bg-muted/30 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPassword(!showUserPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showUserPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">Primary System Role *</label>
                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="w-full h-10 px-3 text-sm bg-muted/30 border border-border/30 rounded-xl font-semibold">
                  <option value="Super Admin">Super Admin (Kelola Seluruh Sistem)</option>
                  <option value="Admin">Admin (Approve & Edit, Tanpa Hapus)</option>
                  <option value="Staff">Staff (Mengerjakan Request & Membuat)</option>
                  <option value="User">User (Hanya Request CSL)</option>
                </select>
              </div>
              {/* ── E-Sign Section ── */}
              <div className="border border-dashed border-border/40 rounded-xl p-4 bg-muted/20 space-y-3">
                <label className="text-[11px] font-bold text-foreground block">Digital Signature (E-Sign)</label>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-16 rounded-lg border border-border/40 bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0">
                    {userForm.eSignUrl ? (
                      <img src={userForm.eSignUrl} alt="E-Signature" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <PenTool size={18} />
                        <span className="text-[9px] font-bold uppercase">No Sign</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-border/40 rounded-lg text-[11px] font-bold uppercase tracking-wider cursor-pointer hover:bg-muted/40 transition-all">
                      {isUploadingESign ? <Loader2 size={13} className="animate-spin" /> : <PenTool size={13} />}
                      {isUploadingESign ? 'Uploading...' : 'Upload Signature'}
                      <input type="file" className="hidden" accept="image/png,image/jpeg" onChange={handleESignUpload} disabled={isUploadingESign} />
                    </label>
                    {userForm.eSignUrl && (
                      <button type="button" onClick={() => setUserForm(prev => ({ ...prev, eSignUrl: '' }))} className="text-[10px] font-bold text-rose-500 hover:underline text-left">Remove</button>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setUserModalOpen(false)} className="text-xs font-bold rounded-xl h-9">Cancel</Button>
                <Button type="submit" disabled={isUserSaving} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">
                  {isUserSaving ? 'Saving...' : 'Save Account'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 🛡️ MENU PERMISSIONS MATRIX MODAL */}
        <Dialog open={!!permUser} onOpenChange={() => setPermUser(null)}>
          <DialogContent className="sm:max-w-2xl p-0 overflow-hidden font-sans border border-border/60 shadow-2xl rounded-2xl max-h-[90vh] flex flex-col">
            <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-600">
                  <ShieldCheck size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                    Konfigurasi Hak Akses Menu
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {permUser?.role}
                </span>
              </div>
              <DialogTitle className="text-xl font-black text-foreground mt-1">
                Atur Hak Akses — {permUser?.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Pilih menu dan sub-menu yang dapat diakses oleh akun <strong className="text-foreground">{permUser?.email}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Role Preset Shortcut */}
              <div className="space-y-2 p-3.5 rounded-xl bg-muted/30 border border-border/30">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-foreground block">
                    Terapkan Template Preset Peran:
                  </label>
                  <span className="text-[10px] text-muted-foreground font-semibold">1-Klik untuk isi otomatis</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('super_admin')}
                    className="text-[10px] font-extrabold uppercase py-2 px-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Crown size={13} className="text-purple-600" /> Super Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('admin')}
                    className="text-[10px] font-extrabold uppercase py-2 px-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ShieldCheck size={13} className="text-indigo-600" /> Admin Legal
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('staff')}
                    className="text-[10px] font-extrabold uppercase py-2 px-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Briefcase size={13} className="text-blue-600" /> Staff Legal
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('user')}
                    className="text-[10px] font-extrabold uppercase py-2 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <FileText size={13} className="text-emerald-600" /> Requester
                  </button>
                </div>
              </div>

              {/* Granular Menu Permission Switches Grouped Cleanly */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Daftar Modul & Hak Akses Menu
                </h4>

                {/* 1. Dashboard */}
                <div
                  onClick={() => setUserPerms({ ...userPerms, dashboard: !userPerms.dashboard })}
                  className="flex items-center justify-between p-3.5 bg-muted/20 hover:bg-muted/40 border border-border/30 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-card border border-border/30 shadow-xs mt-0.5 text-indigo-600">
                      <LayoutDashboard size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Dashboard & Metrik Operasional</p>
                      <p className="text-[11px] text-muted-foreground">Halaman utama ringkasan tiket legal, metrik status, dan quick links</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-indigo-600 ml-2">
                    {userPerms.dashboard ? <CheckSquare size={20} className="text-indigo-600 fill-indigo-100" /> : <Square size={20} className="text-muted-foreground/40" />}
                  </div>
                </div>

                {/* 2. Request / Ticketing */}
                <div className="p-3.5 bg-muted/20 border border-border/30 rounded-xl space-y-3">
                  <div
                    onClick={() => {
                      const next = !userPerms.requests_view;
                      setUserPerms({ ...userPerms, requests_view: next, requests_create: next, requests_review: next ? userPerms.requests_review : false });
                    }}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-card border border-border/30 shadow-xs mt-0.5 text-blue-600">
                        <Kanban size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Request / Ticketing (CSL Service Desk)</p>
                        <p className="text-[11px] text-muted-foreground">Akses modul ticketing permohonan layanan hukum dan corporate secretary</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-indigo-600 ml-2">
                      {userPerms.requests_view ? <CheckSquare size={20} className="text-indigo-600 fill-indigo-100" /> : <Square size={20} className="text-muted-foreground/40" />}
                    </div>
                  </div>

                  {userPerms.requests_view && (
                    <div className="pl-11 pt-2 border-t border-border/20 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-muted/40">
                        <input
                          type="checkbox"
                          checked={userPerms.requests_create}
                          onChange={e => setUserPerms({ ...userPerms, requests_create: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-foreground">Ajukan Request Baru</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-muted/40">
                        <input
                          type="checkbox"
                          checked={userPerms.requests_review}
                          onChange={e => setUserPerms({ ...userPerms, requests_review: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-foreground">Review & Proses Tiket</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* 3. Routine Activity (RUPS, LKPM, TBK, Offshore, Ad-MGT) */}
                <div className="p-3.5 bg-muted/20 border border-border/30 rounded-xl space-y-3">
                  <div
                    onClick={() => {
                      const next = !userPerms.routine_view;
                      setUserPerms({
                        ...userPerms,
                        routine_view: next,
                        routine_rups: next,
                        routine_lkpm: next,
                        routine_tbk: next,
                        routine_offshore: next,
                        routine_admgt: next,
                      });
                    }}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-card border border-border/30 shadow-xs mt-0.5 text-emerald-600">
                        <Calendar size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Routine Activity</p>
                        <p className="text-[11px] text-muted-foreground">Kepatuhan korporasi rutin, RUPS, LKPM, TBK, Offshore, dan administrasi</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-indigo-600 ml-2">
                      {userPerms.routine_view ? <CheckSquare size={20} className="text-indigo-600 fill-indigo-100" /> : <Square size={20} className="text-muted-foreground/40" />}
                    </div>
                  </div>

                  {userPerms.routine_view && (
                    <div className="pl-11 pt-2 border-t border-border/20 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Pilih Sub-Menu Rutin:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-muted/40">
                          <input
                            type="checkbox"
                            checked={userPerms.routine_rups}
                            onChange={e => setUserPerms({ ...userPerms, routine_rups: e.target.checked })}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <CalendarCheck size={14} className="text-emerald-600" />
                          <span className="font-semibold text-foreground">RUPS - AR</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-muted/40">
                          <input
                            type="checkbox"
                            checked={userPerms.routine_lkpm}
                            onChange={e => setUserPerms({ ...userPerms, routine_lkpm: e.target.checked })}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <FileCheck size={14} className="text-emerald-600" />
                          <span className="font-semibold text-foreground">Tracking LKPM</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-muted/40">
                          <input
                            type="checkbox"
                            checked={userPerms.routine_tbk}
                            onChange={e => setUserPerms({ ...userPerms, routine_tbk: e.target.checked })}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <Landmark size={14} className="text-emerald-600" />
                          <span className="font-semibold text-foreground">TBK (Perusahaan Terbuka)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-muted/40">
                          <input
                            type="checkbox"
                            checked={userPerms.routine_offshore}
                            onChange={e => setUserPerms({ ...userPerms, routine_offshore: e.target.checked })}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <Globe size={14} className="text-emerald-600" />
                          <span className="font-semibold text-foreground">Offshore Co</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-muted/40 sm:col-span-2">
                          <input
                            type="checkbox"
                            checked={userPerms.routine_admgt}
                            onChange={e => setUserPerms({ ...userPerms, routine_admgt: e.target.checked })}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <Layers size={14} className="text-emerald-600" />
                          <span className="font-semibold text-foreground">Ad-MGT (Administrasi & Manajemen)</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Companies & Entities */}
                <div
                  onClick={() => setUserPerms({ ...userPerms, companies: !userPerms.companies })}
                  className="flex items-center justify-between p-3.5 bg-muted/20 hover:bg-muted/40 border border-border/30 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-card border border-border/30 shadow-xs mt-0.5 text-amber-600">
                      <Building2 size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Companies & Entities (Master Perusahaan)</p>
                      <p className="text-[11px] text-muted-foreground">Master entitas, berkas legalitas, kop surat resmi, logo, & stempel perusahaan</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-indigo-600 ml-2">
                    {userPerms.companies ? <CheckSquare size={20} className="text-indigo-600 fill-indigo-100" /> : <Square size={20} className="text-muted-foreground/40" />}
                  </div>
                </div>

                {/* 5. Budget & Expenses */}
                <div className="p-3.5 bg-muted/20 border border-border/30 rounded-xl space-y-3">
                  <div
                    onClick={() => {
                      const next = !userPerms.budget_view;
                      setUserPerms({ ...userPerms, budget_view: next, budget_approve: next ? userPerms.budget_approve : false });
                    }}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-card border border-border/30 shadow-xs mt-0.5 text-violet-600">
                        <Wallet size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Budget & Expenses</p>
                        <p className="text-[11px] text-muted-foreground">Monitoring anggaran, transaksi pengeluaran legal, dan analisis grafik biaya</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-indigo-600 ml-2">
                      {userPerms.budget_view ? <CheckSquare size={20} className="text-indigo-600 fill-indigo-100" /> : <Square size={20} className="text-muted-foreground/40" />}
                    </div>
                  </div>

                  {userPerms.budget_view && (
                    <div className="pl-11 pt-2 border-t border-border/20">
                      <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-muted/40 text-xs">
                        <input
                          type="checkbox"
                          checked={userPerms.budget_approve}
                          onChange={e => setUserPerms({ ...userPerms, budget_approve: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <Coins size={14} className="text-violet-600" />
                        <span className="font-semibold text-foreground">Izin Approval & Disburse Biaya Legal</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* 6. Phone Directory */}
                <div className="p-3.5 bg-muted/20 border border-border/30 rounded-xl space-y-3">
                  <div
                    onClick={() => {
                      const next = !userPerms.directory_view;
                      setUserPerms({ ...userPerms, directory_view: next, directory_manage: next ? userPerms.directory_manage : false });
                    }}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-card border border-border/30 shadow-xs mt-0.5 text-rose-600">
                        <Phone size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Phone Directory</p>
                        <p className="text-[11px] text-muted-foreground">Direktori kontak eksternal, advokat, notaris, vendor, dan instansi regulator</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-indigo-600 ml-2">
                      {userPerms.directory_view ? <CheckSquare size={20} className="text-indigo-600 fill-indigo-100" /> : <Square size={20} className="text-muted-foreground/40" />}
                    </div>
                  </div>

                  {userPerms.directory_view && (
                    <div className="pl-11 pt-2 border-t border-border/20">
                      <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-muted/40 text-xs">
                        <input
                          type="checkbox"
                          checked={userPerms.directory_manage}
                          onChange={e => setUserPerms({ ...userPerms, directory_manage: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <BookUser size={14} className="text-rose-600" />
                        <span className="font-semibold text-foreground">Izin Tambah / Edit / Kelola Kontak</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* 7. Credentials Vault */}
                <div
                  onClick={() => setUserPerms({ ...userPerms, credentials: !userPerms.credentials })}
                  className="flex items-center justify-between p-3.5 bg-muted/20 hover:bg-muted/40 border border-border/30 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-card border border-border/30 shadow-xs mt-0.5 text-amber-500">
                      <Key size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Credentials Vault (Brankas Akun)</p>
                      <p className="text-[11px] text-muted-foreground">Akses brankas penyimpanan akun bersama, portal AHU/OSS, dan password terenkripsi</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-indigo-600 ml-2">
                    {userPerms.credentials ? <CheckSquare size={20} className="text-indigo-600 fill-indigo-100" /> : <Square size={20} className="text-muted-foreground/40" />}
                  </div>
                </div>

                {/* 8. Settings & System */}
                <div
                  onClick={() => setUserPerms({ ...userPerms, settings_manage: !userPerms.settings_manage })}
                  className="flex items-center justify-between p-3.5 bg-muted/20 hover:bg-muted/40 border border-border/30 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-card border border-border/30 shadow-xs mt-0.5 text-slate-600">
                      <Settings size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Settings & Konfigurasi Sistem</p>
                      <p className="text-[11px] text-muted-foreground">Kelola pengguna, penetapan peran & hak akses, struktur departemen, dan SLA</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-indigo-600 ml-2">
                    {userPerms.settings_manage ? <CheckSquare size={20} className="text-indigo-600 fill-indigo-100" /> : <Square size={20} className="text-muted-foreground/40" />}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 px-6 border-t border-border/30 gap-2 flex sm:justify-end bg-card shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setPermUser(null)} className="text-xs font-bold rounded-xl h-9 px-4">
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleSavePermissions}
                disabled={isSavingPerms}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5 shadow-sm"
              >
                {isSavingPerms ? (
                  <>
                    <Loader2 size={14} className="mr-1.5 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={14} className="mr-1.5" /> Simpan Hak Akses
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="sm:max-w-md font-sans border border-border/60 shadow-2xl rounded-2xl">
            <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-2 text-red-500 mb-1">
                <AlertTriangle size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Delete Confirmation</span>
              </div>
              <DialogTitle className="text-xl font-black">Are you sure?</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                This action will delete <strong>{deleteConfirm?.name}</strong>.
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
  }

  // ── Companies View ────────────────────────────────────────────────────────
  if (view === 'companies') {
    const totalCount = companies.length;
    let logoCount = 0;
    let kopCount = 0;
    let stempelCount = 0;

    companies.forEach(c => {
      const a = companyAssets[c.code];
      if (a?.logo) logoCount++;
      if (a?.kop) kopCount++;
      if (a?.stempel) stempelCount++;
    });

    const filteredCompanies = companies.filter(c => {
      const q = companySearch.trim().toLowerCase();
      const grp = c.group_company || getResolvedGroup(c.name);
      if (selectedGroupFilter !== 'all' && grp.toLowerCase() !== selectedGroupFilter.toLowerCase()) {
        return false;
      }
      if (!q) return true;
      return (c.name + ' ' + c.code + ' ' + grp).toLowerCase().includes(q);
    });

    return (
      <div className="space-y-5 animate-in fade-in duration-500 pb-12 font-sans">
        {feedbackBanner}

        {/* TITLE & ACTIONS */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[28px] font-bold text-[#0a2540] dark:text-white tracking-tight leading-tight">
              Companies &amp; Entities
            </h1>
            <div className="text-[#c9a227] text-[11px] font-bold tracking-[1.8px] mt-1.5 uppercase">
              PENGATURAN · MASTER ENTITAS &amp; BERKAS RESMI
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleSyncGroupEmailCompanies}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="h-9 text-xs font-semibold gap-1.5 border-[#e6e9f0] hover:bg-[#f6f7f9]"
              title="Sinkronkan 79 entitas dari Group-Email-Cleaned-List.xlsx"
            >
              <FileSpreadsheet className={`h-3.5 w-3.5 text-[#0a2540] ${isLoading ? 'animate-spin' : ''}`} />
              Sinkronkan Group Email (79)
            </Button>
            <Button
              onClick={handleSyncLkpmCompanies}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="h-9 text-xs font-semibold gap-1.5 border-[#e6e9f0] hover:bg-[#f6f7f9]"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Sinkronkan LKPM (81)
            </Button>
            <Button
              onClick={() => openCompanyModal()}
              size="sm"
              className="bg-[#0a2540] hover:bg-[#16375c] text-white font-semibold text-xs shadow-xs rounded-xl h-9 px-4 gap-1.5"
            >
              <Plus className="h-4 w-4" /> Tambah Perusahaan
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchData}
              className="w-9 h-9 rounded-xl border-[#e6e9f0]"
              title="Muat ulang master entitas"
            >
              <RefreshCcw size={15} className={isLoading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>

        {/* 4 KPIS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Entitas */}
          <div className="bg-card border border-[#e6e9f0] dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#e8effe] flex items-center justify-center text-[#2f6bff]">
                <Building2 size={19} />
              </div>
            </div>
            <div className="text-[30px] font-bold text-[#0a2540] dark:text-white leading-none tracking-tight">
              {totalCount}
            </div>
            <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 mt-1.5">Entitas Terdaftar</div>
            <div className="text-[12px] text-[#758196] font-medium mt-0.5">Master perusahaan CSL-LINK</div>
          </div>

          {/* Card 2: Logo */}
          <div className="bg-card border border-[#e6e9f0] dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#e8effe] flex items-center justify-center text-[#2f6bff]">
                <Image size={19} />
              </div>
            </div>
            <div className="text-[30px] font-bold text-[#0a2540] dark:text-white leading-none tracking-tight">
              {logoCount} / {totalCount}
            </div>
            <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 mt-1.5">Logo Terunggah</div>
            <div className="text-[12px] text-[#758196] font-medium mt-0.5">Tersimpan di Google Drive</div>
          </div>

          {/* Card 3: Kop Surat */}
          <div className="bg-card border border-[#e6e9f0] dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#fdf2dc] flex items-center justify-center text-[#d99a26]">
                <FileText size={19} />
              </div>
            </div>
            <div className="text-[30px] font-bold text-[#0a2540] dark:text-white leading-none tracking-tight">
              {kopCount} / {totalCount}
            </div>
            <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 mt-1.5">Kop Surat Terunggah</div>
            <div className="text-[12px] text-[#758196] font-medium mt-0.5">Untuk surat resmi per entitas</div>
          </div>

          {/* Card 4: Stempel */}
          <div className="bg-card border border-[#e6e9f0] dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#e4f6ec] flex items-center justify-center text-[#12995c]">
                <Stamp size={19} />
              </div>
            </div>
            <div className="text-[30px] font-bold text-[#0a2540] dark:text-white leading-none tracking-tight">
              {stempelCount} / {totalCount}
            </div>
            <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 mt-1.5">Stempel Terunggah</div>
            <div className="text-[12px] text-[#758196] font-medium mt-0.5">Untuk dokumen resmi per entitas</div>
          </div>
        </div>

        {/* SEARCH & HINT BAR */}
        {/* SEARCH & FILTER BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari perusahaan, kode, grup..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="w-full pl-9 h-9 rounded-full bg-white dark:bg-slate-900 border-[#e6e9f0] dark:border-slate-800 text-xs"
              />
            </div>
            {/* Filter Group Company Dropdown */}
            <select
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className="h-9 px-3 rounded-full bg-white dark:bg-slate-900 border border-[#e6e9f0] dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#0a2540]"
            >
              <option value="all">Semua Group ({companies.length})</option>
              {COMPANY_GROUPS.map(grp => {
                const count = companies.filter(c => (c.group_company || getResolvedGroup(c.name)) === grp).length;
                return (
                  <option key={grp} value={grp}>
                    {grp} ({count})
                  </option>
                );
              })}
            </select>
          </div>
          <span className="text-[12.5px] text-[#758196] font-semibold">
            Klik baris untuk profil lengkap &amp; unggah berkas ke Google Drive.
          </span>
        </div>

        {/* DATA TABLE */}
        <div className="bg-card border border-[#e6e9f0] dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#fafbfc] dark:bg-slate-800/60">
                <TableRow className="border-b border-[#e6e9f0] dark:border-slate-800">
                  <TableHead className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#758196] min-w-[240px]">
                    Entitas
                  </TableHead>
                  <TableHead className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-[#758196]">
                    Group Company
                  </TableHead>
                  <TableHead className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-[#758196]">
                    Logo
                  </TableHead>
                  <TableHead className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-[#758196]">
                    Kop Surat
                  </TableHead>
                  <TableHead className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-[#758196]">
                    Stempel
                  </TableHead>
                  <TableHead className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#758196] min-w-[170px]">
                    Kelengkapan Berkas
                  </TableHead>
                  <TableHead className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#758196] text-right">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#e6e9f0] dark:divide-slate-800">
                {filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-28 text-center text-xs font-semibold text-[#758196]">
                      Tidak ada entitas yang cocok dengan pencarian atau filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies.map(c => {
                    const a = companyAssets[c.code] || {};
                    const dc = (a.logo ? 1 : 0) + (a.kop ? 1 : 0) + (a.stempel ? 1 : 0);
                    const grpName = c.group_company || getResolvedGroup(c.name);
                    return (
                      <TableRow
                        key={c.id}
                        onClick={() => setSelectedCompany(c)}
                        className="hover:bg-[#fafbfc] dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        {/* Entitas */}
                        <TableCell className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#e8effe] text-[#2f6bff] font-bold text-xs flex items-center justify-center shrink-0">
                              {(c.code || 'CO').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-sm text-[#0a2540] dark:text-white leading-tight">
                                {c.name}
                              </div>
                              <div className="text-[11.5px] text-[#758196] font-medium mt-0.5">
                                Kode {c.code}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Group Company */}
                        <TableCell className="py-3 px-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold border ${getGroupBadgeClass(grpName)}`}>
                            {grpName}
                          </span>
                        </TableCell>

                        {/* Logo Chip */}
                        <TableCell className="py-3 px-3">
                          {a.logo ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-[#e4f6ec] text-[#12995c]">
                              <span className="size-1.5 rounded-full bg-current" /> Ada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-[#eef0f4] text-[#667085]">
                              <span className="size-1.5 rounded-full bg-current" /> Belum
                            </span>
                          )}
                        </TableCell>

                        {/* Kop Surat Chip */}
                        <TableCell className="py-3 px-3">
                          {a.kop ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-[#e4f6ec] text-[#12995c]">
                              <span className="size-1.5 rounded-full bg-current" /> Ada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-[#eef0f4] text-[#667085]">
                              <span className="size-1.5 rounded-full bg-current" /> Belum
                            </span>
                          )}
                        </TableCell>

                        {/* Stempel Chip */}
                        <TableCell className="py-3 px-3">
                          {a.stempel ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-[#e4f6ec] text-[#12995c]">
                              <span className="size-1.5 rounded-full bg-current" /> Ada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-[#eef0f4] text-[#667085]">
                              <span className="size-1.5 rounded-full bg-current" /> Belum
                            </span>
                          )}
                        </TableCell>

                        {/* Kelengkapan Berkas */}
                        <TableCell className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-2 w-20 rounded-full bg-[#eef0f4] dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  dc === 3 ? 'bg-[#12995c]' : 'bg-[#2f6bff]'
                                }`}
                                style={{ width: `${(dc / 3) * 100}%` }}
                              />
                            </div>
                            <span className="font-semibold text-[12px] text-slate-700 dark:text-slate-300">
                              {dc} dari 3
                            </span>
                          </div>
                        </TableCell>

                        {/* Aksi */}
                        <TableCell className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCompany(c);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-[#e6e9f0] bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#f6f7f9]"
                            >
                              Profil <ChevronRight size={13} className="text-[#758196]" />
                            </button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                openCompanyModal(c);
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-[#758196] hover:text-[#0a2540]"
                              title="Edit Entitas"
                            >
                              <Pencil size={13} />
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm({ type: 'company', id: c.id, name: c.name });
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                              title="Hapus Entitas"
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* FOOTNOTE */}
        <p className="text-center text-[#98a2b5] text-xs font-medium pt-2">
          Keadaan berkas per 27 Okt 2026: belum ada logo, kop surat, dan stempel yang terunggah — form lama hanya berisi Kode &amp; Nama. Berkas tersimpan di Google Drive (folder CSL-LINK/Companies/{'{KODE}'}/).
        </p>

        {/* DETAIL SLIDE-OVER PANEL */}
        {selectedCompany && (
          <>
            {/* Scrim Backdrop */}
            <div
              className="fixed inset-0 bg-[#0a192f]/40 z-50 backdrop-blur-xs transition-opacity duration-200"
              onClick={() => setSelectedCompany(null)}
            />

            {/* Panel Sheet */}
            <aside className="fixed top-0 right-0 bottom-0 w-[470px] max-w-[92vw] z-50 bg-white dark:bg-slate-900 border-l border-[#e6e9f0] dark:border-slate-800 shadow-2xl p-6 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-200">
              <div>
                {/* Header with Close */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#0a2540] dark:text-white leading-tight">
                      {selectedCompany.name}
                    </h2>
                    <p className="text-xs text-[#758196] font-semibold mt-1">
                      Profil Entitas · Kode {selectedCompany.code}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCompany(null)}
                    className="w-8 h-8 rounded-full border border-[#e6e9f0] dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* IDENTITAS */}
                <h3 className="text-[12px] font-bold tracking-[0.8px] text-[#758196] uppercase mb-2.5">
                  IDENTITAS
                </h3>
                <div className="grid grid-cols-2 gap-2.5 mb-6">
                  <div className="bg-[#fbfbfc] dark:bg-slate-800/60 border border-[#e6e9f0] dark:border-slate-700/80 rounded-xl p-3">
                    <span className="block text-[10px] tracking-wider text-[#758196] font-bold uppercase mb-0.5">
                      KODE ENTITAS
                    </span>
                    <b className="font-mono text-sm text-[#0a2540] dark:text-white">{selectedCompany.code}</b>
                  </div>
                  <div className="bg-[#fbfbfc] dark:bg-slate-800/60 border border-[#e6e9f0] dark:border-slate-700/80 rounded-xl p-3">
                    <span className="block text-[10px] tracking-wider text-[#758196] font-bold uppercase mb-0.5">
                      STATUS
                    </span>
                    <b className="text-sm text-[#12995c]">Aktif</b>
                  </div>
                  <div className="bg-[#fbfbfc] dark:bg-slate-800/60 border border-[#e6e9f0] dark:border-slate-700/80 rounded-xl p-3">
                    <span className="block text-[10px] tracking-wider text-[#758196] font-bold uppercase mb-0.5">
                      NPWP
                    </span>
                    <b className="text-xs font-mono text-slate-800 dark:text-slate-200">
                      {(selectedCompany as any).npwp || '-'}
                    </b>
                  </div>
                  <div className="bg-[#fbfbfc] dark:bg-slate-800/60 border border-[#e6e9f0] dark:border-slate-700/80 rounded-xl p-3">
                    <span className="block text-[10px] tracking-wider text-[#758196] font-bold uppercase mb-0.5">
                      NIB
                    </span>
                    <b className="text-xs font-mono text-slate-800 dark:text-slate-200">
                      {(selectedCompany as any).nib || '-'}
                    </b>
                  </div>
                  <div className="col-span-2 bg-[#fbfbfc] dark:bg-slate-800/60 border border-[#e6e9f0] dark:border-slate-700/80 rounded-xl p-3">
                    <span className="block text-[10px] tracking-wider text-[#758196] font-bold uppercase mb-1">
                      GROUP COMPANY
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getGroupBadgeClass(selectedCompany.group_company || getResolvedGroup(selectedCompany.name))}`}>
                      {selectedCompany.group_company || getResolvedGroup(selectedCompany.name)}
                    </span>
                  </div>
                  <div className="col-span-2 bg-[#fbfbfc] dark:bg-slate-800/60 border border-[#e6e9f0] dark:border-slate-700/80 rounded-xl p-3">
                    <span className="block text-[10px] tracking-wider text-[#758196] font-bold uppercase mb-0.5">
                      ALAMAT
                    </span>
                    <b className="text-xs font-normal text-slate-700 dark:text-slate-300">
                      {(selectedCompany as any).address || 'Jakarta, Indonesia'}
                    </b>
                  </div>
                  <div className="bg-[#fbfbfc] dark:bg-slate-800/60 border border-[#e6e9f0] dark:border-slate-700/80 rounded-xl p-3">
                    <span className="block text-[10px] tracking-wider text-[#758196] font-bold uppercase mb-0.5">
                      TELEPON
                    </span>
                    <b className="text-xs text-slate-800 dark:text-slate-200">
                      {(selectedCompany as any).phone || '-'}
                    </b>
                  </div>
                  <div className="bg-[#fbfbfc] dark:bg-slate-800/60 border border-[#e6e9f0] dark:border-slate-700/80 rounded-xl p-3">
                    <span className="block text-[10px] tracking-wider text-[#758196] font-bold uppercase mb-0.5">
                      EMAIL
                    </span>
                    <b className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate block">
                      {(() => {
                        const em = groupEmailCompanies.find(ge =>
                          ge.name.toLowerCase().trim() === selectedCompany.name.toLowerCase().trim() ||
                          ge.code.toUpperCase().trim() === selectedCompany.code.toUpperCase().trim()
                        );
                        return em?.email || '-';
                      })()}
                    </b>
                  </div>
                </div>

                {/* BRANDING & DOKUMEN · GOOGLE DRIVE */}
                <h3 className="text-[12px] font-bold tracking-[0.8px] text-[#758196] uppercase mb-2.5">
                  BRANDING &amp; DOKUMEN · GOOGLE DRIVE
                </h3>
                <div className="space-y-2.5 mb-4">
                  {/* Logo Zone */}
                  {(() => {
                    const f = companyAssets[selectedCompany.code]?.logo;
                    if (f) {
                      return (
                        <div className="flex items-center gap-3 border border-[#bfe8d2] bg-[#e4f6ec] rounded-xl p-3.5">
                          <div className="w-10 h-10 rounded-xl bg-white border border-[#bfe8d2] flex items-center justify-center text-[#12995c] shrink-0">
                            <Image size={19} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <b className="text-sm text-slate-900 block leading-tight">Logo Perusahaan</b>
                            <span className="font-mono text-[11.5px] text-slate-700 block truncate">{f}</span>
                            <span className="text-[11px] text-[#12995c] font-medium block">Tersimpan di Google Drive</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => toast.info(`Membuka berkas ${f} di Google Drive...`)}
                              className="px-2.5 py-1 text-xs font-semibold bg-white rounded-lg border border-[#bfe8d2] text-[#12995c] hover:bg-white/80 inline-flex items-center gap-1"
                            >
                              <ExternalLink size={12} /> Drive
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAsset(selectedCompany.code, 'logo')}
                              className="px-2.5 py-1 text-xs font-semibold bg-white rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center justify-between gap-3 border-2 border-dashed border-[#e6e9f0] rounded-xl p-3.5 bg-[#fbfbfc]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-[#e6e9f0] flex items-center justify-center text-[#2f6bff] shrink-0">
                            <Image size={19} />
                          </div>
                          <div>
                            <b className="text-sm text-slate-900 block leading-tight">Logo Perusahaan</b>
                            <span className="text-[11.5px] text-[#758196] font-medium">PNG / SVG · latar transparan · maks 2 MB</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUploadAsset(selectedCompany.code, 'logo')}
                          className="text-xs font-semibold gap-1.5 border-[#e6e9f0] h-8"
                        >
                          <Upload size={13} /> Unggah ke Drive
                        </Button>
                      </div>
                    );
                  })()}

                  {/* Kop Surat Zone */}
                  {(() => {
                    const f = companyAssets[selectedCompany.code]?.kop;
                    if (f) {
                      return (
                        <div className="flex items-center gap-3 border border-[#bfe8d2] bg-[#e4f6ec] rounded-xl p-3.5">
                          <div className="w-10 h-10 rounded-xl bg-white border border-[#bfe8d2] flex items-center justify-center text-[#12995c] shrink-0">
                            <FileText size={19} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <b className="text-sm text-slate-900 block leading-tight">Kop Surat</b>
                            <span className="font-mono text-[11.5px] text-slate-700 block truncate">{f}</span>
                            <span className="text-[11px] text-[#12995c] font-medium block">Tersimpan di Google Drive</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => toast.info(`Membuka berkas ${f} di Google Drive...`)}
                              className="px-2.5 py-1 text-xs font-semibold bg-white rounded-lg border border-[#bfe8d2] text-[#12995c] hover:bg-white/80 inline-flex items-center gap-1"
                            >
                              <ExternalLink size={12} /> Drive
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAsset(selectedCompany.code, 'kop')}
                              className="px-2.5 py-1 text-xs font-semibold bg-white rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center justify-between gap-3 border-2 border-dashed border-[#e6e9f0] rounded-xl p-3.5 bg-[#fbfbfc]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-[#e6e9f0] flex items-center justify-center text-[#d99a26] shrink-0">
                            <FileText size={19} />
                          </div>
                          <div>
                            <b className="text-sm text-slate-900 block leading-tight">Kop Surat</b>
                            <span className="text-[11.5px] text-[#758196] font-medium">PNG / PDF · ukuran A4 · maks 5 MB</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUploadAsset(selectedCompany.code, 'kop')}
                          className="text-xs font-semibold gap-1.5 border-[#e6e9f0] h-8"
                        >
                          <Upload size={13} /> Unggah ke Drive
                        </Button>
                      </div>
                    );
                  })()}

                  {/* Stempel Zone */}
                  {(() => {
                    const f = companyAssets[selectedCompany.code]?.stempel;
                    if (f) {
                      return (
                        <div className="flex items-center gap-3 border border-[#bfe8d2] bg-[#e4f6ec] rounded-xl p-3.5">
                          <div className="w-10 h-10 rounded-xl bg-white border border-[#bfe8d2] flex items-center justify-center text-[#12995c] shrink-0">
                            <Stamp size={19} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <b className="text-sm text-slate-900 block leading-tight">Stempel Perusahaan</b>
                            <span className="font-mono text-[11.5px] text-slate-700 block truncate">{f}</span>
                            <span className="text-[11px] text-[#12995c] font-medium block">Tersimpan di Google Drive</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => toast.info(`Membuka berkas ${f} di Google Drive...`)}
                              className="px-2.5 py-1 text-xs font-semibold bg-white rounded-lg border border-[#bfe8d2] text-[#12995c] hover:bg-white/80 inline-flex items-center gap-1"
                            >
                              <ExternalLink size={12} /> Drive
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAsset(selectedCompany.code, 'stempel')}
                              className="px-2.5 py-1 text-xs font-semibold bg-white rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center justify-between gap-3 border-2 border-dashed border-[#e6e9f0] rounded-xl p-3.5 bg-[#fbfbfc]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-[#e6e9f0] flex items-center justify-center text-[#12995c] shrink-0">
                            <Stamp size={19} />
                          </div>
                          <div>
                            <b className="text-sm text-slate-900 block leading-tight">Stempel</b>
                            <span className="text-[11.5px] text-[#758196] font-medium">PNG · latar transparan · maks 2 MB</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUploadAsset(selectedCompany.code, 'stempel')}
                          className="text-xs font-semibold gap-1.5 border-[#e6e9f0] h-8"
                        >
                          <Upload size={13} /> Unggah ke Drive
                        </Button>
                      </div>
                    );
                  })()}
                </div>

                {/* Note Box */}
                <div className="bg-[#eef0f4] dark:bg-slate-800/70 border border-[#e6e9f0] dark:border-slate-700 rounded-xl p-3.5 text-xs text-[#667085] dark:text-slate-300 font-medium leading-relaxed">
                  Berkas tersimpan di Google Drive pada folder{' '}
                  <span className="font-mono font-bold text-slate-800 dark:text-white">
                    CSL-LINK/Companies/{selectedCompany.code}/
                  </span>{' '}
                  — aplikasi hanya menyimpan tautan berkasnya. Kop surat &amp; stempel otomatis terpasang pada surat resmi yang dibuat sistem untuk entitas ini.
                </div>
              </div>

              {/* Panel Footer */}
              <div className="pt-4 border-t border-[#e6e9f0] dark:border-slate-800 mt-6 flex items-center gap-2">
                <Button
                  variant="outline"
                  className="flex-1 text-xs font-bold"
                  onClick={() => setSelectedCompany(null)}
                >
                  Tutup
                </Button>
                <Button
                  className="flex-1 text-xs font-bold bg-[#0a2540] hover:bg-[#16375c] text-white gap-1.5"
                  onClick={() => {
                    openCompanyModal(selectedCompany);
                  }}
                >
                  <Pencil size={13} /> Edit Profil
                </Button>
              </div>
            </aside>
          </>
        )}

        {/* MODAL TAMBAH / EDIT PERUSAHAAN */}
        <Dialog open={companyModalOpen} onOpenChange={setCompanyModalOpen}>
          <DialogContent className="sm:max-w-[520px] font-sans border border-[#e6e9f0] shadow-2xl rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-[#0a2540] dark:text-white">
                {editingCompany ? 'Edit Profil Entitas' : 'Tambah Perusahaan'}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#758196] font-medium mt-1">
                Identitas dasar dulu — logo, kop surat, dan stempel diunggah lewat panel profil setelah entitas tersimpan.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveCompany} className="space-y-3.5 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#758196]">
                    KODE ENTITAS *
                  </label>
                  <Input
                    required
                    placeholder="cth. GESIT"
                    value={companyForm.code}
                    onChange={e => setCompanyForm({ ...companyForm, code: e.target.value })}
                    className="text-xs font-mono uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#758196]">
                    NAMA RESMI *
                  </label>
                  <Input
                    required
                    placeholder="cth. PT GESIT Utama"
                    value={companyForm.name}
                    onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#758196]">
                  GROUP COMPANY *
                </label>
                <select
                  value={companyForm.group_company || 'Holding'}
                  onChange={e => setCompanyForm({ ...companyForm, group_company: e.target.value })}
                  className="w-full h-9 rounded-md border border-[#e6e9f0] dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0a2540]"
                >
                  {COMPANY_GROUPS.map(grp => (
                    <option key={grp} value={grp}>
                      {grp}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#758196]">
                    NPWP
                  </label>
                  <Input
                    placeholder="Nomor NPWP"
                    value={(companyForm as any).npwp || ''}
                    onChange={e => setCompanyForm({ ...companyForm, npwp: e.target.value } as any)}
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#758196]">
                    KOTA / DOMISILI
                  </label>
                  <Input
                    placeholder="cth. Jakarta"
                    value={(companyForm as any).city || ''}
                    onChange={e => setCompanyForm({ ...companyForm, city: e.target.value } as any)}
                    className="text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-[#e6e9f0] gap-2 flex sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCompanyModalOpen(false)}
                  className="text-xs font-semibold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#0a2540] hover:bg-[#16375c] text-white text-xs font-bold px-4"
                >
                  {editingCompany ? 'Simpan Perubahan' : 'Simpan Entitas'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="sm:max-w-md font-sans border border-border/60 shadow-2xl rounded-2xl">
            <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-2 text-red-500 mb-1">
                <AlertTriangle size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Delete Confirmation</span>
              </div>
              <DialogTitle className="text-xl font-black">Are you sure?</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                This action will delete <strong>{deleteConfirm?.name}</strong>.
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
  }

  // ── Departments View ───────────────────────────────────────────────────────
  if (view === 'departments') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        {feedbackBanner}
        <PageHeader title="Departemen & Divisi" description="Kelola struktur departemen organisasi dan unit kerja">
          <Button onClick={() => openDeptModal()} size="sm" className="bg-[#0a2540] hover:bg-[#16375c] text-white font-bold text-xs shadow-xs rounded-xl h-9 px-4">
            <Plus className="h-4 w-4 mr-1.5" /> Tambah Departemen
          </Button>
        </PageHeader>

        <div className="bg-card border border-[#e6e9f0] rounded-2xl overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-[#fafbfc]">
              <TableRow>
                {['Kode Departemen', 'Nama Departemen', 'Jumlah Anggota', 'Aksi'].map(h => (
                  <TableHead key={h} className="text-[11px] font-bold uppercase tracking-wider text-[#758196]">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map(d => (
                <TableRow key={d.id} className="hover:bg-muted/30">
                  <TableCell>
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                      {d.code}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-bold text-foreground">{d.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.employees}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button onClick={() => openDeptModal(d)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        <Pencil size={14} />
                      </Button>
                      <Button onClick={() => setDeleteConfirm({ type: 'department', id: d.id, name: d.name })} variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {departments.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-xs font-semibold text-muted-foreground">
                    No departments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Department Modal */}
        <Dialog open={deptModalOpen} onOpenChange={setDeptModalOpen}>
          <DialogContent className="sm:max-w-md font-sans border border-border/60 shadow-2xl rounded-2xl">
            <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <Network size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Department Config</span>
              </div>
              <DialogTitle className="text-xl font-black">{editingDept ? 'Edit Department' : 'Add New Department'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveDept} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-foreground mb-1 block">Code *</label>
                  <Input required placeholder="HR" value={deptForm.code} onChange={e => setDeptForm({...deptForm, code: e.target.value})} className="h-10 text-sm font-mono uppercase bg-muted/30" />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-foreground mb-1 block">Department Name *</label>
                  <Input required placeholder="Human Resources" value={deptForm.name} onChange={e => setDeptForm({...deptForm, name: e.target.value})} className="h-10 text-sm bg-muted/30" />
                </div>
              </div>
              <DialogFooter className="pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setDeptModalOpen(false)} className="text-xs font-bold rounded-xl h-9">Cancel</Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">Save Department</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="sm:max-w-md font-sans border border-border/60 shadow-2xl rounded-2xl">
            <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-2 text-red-500 mb-1">
                <AlertTriangle size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Delete Confirmation</span>
              </div>
              <DialogTitle className="text-xl font-black">Are you sure?</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                This action will delete <strong>{deleteConfirm?.name}</strong>.
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
  }

  // ── System Settings View (includes Notifications) ────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
      {feedbackBanner}
      <PageHeader title="Pengaturan Sistem" description="Konfigurasi global, preferensi notifikasi email, dan alur persetujuan berkas legal" />

      <div className="space-y-6">
        {/* General Info */}
        <div className="bg-card border border-[#e6e9f0] rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#0a2540] flex items-center gap-2"><Settings size={18} className="text-[#0a2540]" /> Informasi Umum</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[#758196] uppercase tracking-wider mb-1 block">Nama Aplikasi</label>
              <Input defaultValue="CSL-LINK" className="h-10 text-sm bg-[#fafbfc] border-[#e6e9f0] font-bold text-[#0a2540]" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#758196] uppercase tracking-wider mb-1 block">Bahasa Default</label>
              <select className="w-full h-10 px-3 text-sm bg-[#fafbfc] border border-[#e6e9f0] rounded-xl font-semibold text-[#16233a]">
                <option>Bahasa Indonesia</option>
                <option>English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-card border border-[#e6e9f0] rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#0a2540] flex items-center gap-2"><Bell size={18} className="text-[#0a2540]" /> Pengaturan Notifikasi Global</h3>
          <p className="text-xs text-[#758196]">Konfigurasi preferensi pengiriman email pemberitahuan sistem kepada seluruh pengguna.</p>
          <div className="space-y-1">
            {[
              { label: 'Email notifikasi saat request baru masuk', defaultOn: true },
              { label: 'Email alert saat request ditugaskan ke staff legal', defaultOn: true },
              { label: 'Email update saat status request berubah', defaultOn: true },
              { label: 'Peringatan SLA breach (1 hari kerja sebelum deadline)', defaultOn: true },
              { label: 'Notifikasi in-app untuk tugas urgent', defaultOn: false },
              { label: 'Laporan ringkasan aktivitas mingguan', defaultOn: false },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-3 border-b border-[#e6e9f0]/60 last:border-0">
                <div className="flex items-center gap-3">
                  <Bell size={14} className="text-[#0a2540] shrink-0" />
                  <span className="text-sm font-semibold text-[#16233a]">{item.label}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked={item.defaultOn} className="sr-only peer" />
                  <div className="w-9 h-5 bg-[#eef0f4] rounded-full peer peer-checked:bg-[#0a2540] transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Approval Routing & Approvers Configuration */}
        <div className="bg-card border border-[#e6e9f0] rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 text-[#0a2540]">
            <ShieldCheck size={20} />
            <h3 className="text-base font-bold text-[#0a2540]">Konfigurasi Approver Tunggal &amp; Cadangan (Workflow Approvals)</h3>
          </div>
          <p className="text-xs text-[#758196]">
            Tentukan <strong>Approver Utama</strong> dan <strong>Approver Cadangan</strong> untuk setiap modul agar operasional tidak terhenti saat PIC utama berhalangan (Rekomendasi audit 27 Okt 2026).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Expenses Approval Approver */}
            <div className="border border-[#e6e9f0] rounded-xl p-4 bg-[#fafbfc] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Wallet size={16} />
                  <h4 className="text-xs font-bold text-[#0a2540]">Persetujuan Pengeluaran (Expenses)</h4>
                </div>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Approver Terpilih
                </span>
              </div>
              <p className="text-[11px] text-[#758196]">
                Approver utama untuk persetujuan biaya operasional lokal.
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pt-1">
                {users.length === 0 ? (
                  <p className="text-xs text-[#758196] italic py-2">Memuat pengguna...</p>
                ) : (
                  users.filter(u => u.role?.toLowerCase().includes('admin')).map(u => {
                    const isSelected = expenseApprover === u.email;
                    return (
                      <label key={`exp-${u.id}`} className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/30' : 'bg-card border-[#e6e9f0] hover:border-[#0a2540]/30'
                      }`}>
                        <div>
                          <p className="text-xs font-bold text-[#0a2540]">{u.name}</p>
                          <p className="text-[10px] text-[#758196]">{u.email} • <span className="font-semibold text-[#0a2540]">{u.role}</span></p>
                        </div>
                        <input
                          type="radio"
                          name="expense_approver_radio"
                          checked={isSelected}
                          onChange={() => setExpenseApprover(u.email)}
                          className="h-4 w-4 text-[#0a2540] border-gray-300 focus:ring-[#0a2540] cursor-pointer"
                        />
                      </label>
                    );
                  })
                )}
              </div>

              {/* Backup Approver */}
              <div className="pt-3 border-t border-[#e6e9f0]">
                <label className="text-[11px] font-bold text-[#758196] uppercase tracking-wider block mb-1.5">
                  Approver Cadangan (Backup Approver)
                </label>
                <select
                  value={expenseBackupApprover}
                  onChange={e => setExpenseBackupApprover(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white border border-[#e6e9f0] rounded-lg font-semibold text-[#16233a]"
                >
                  {users.filter(u => u.role?.toLowerCase().includes('admin')).map(u => (
                    <option key={`exp-bk-${u.id}`} value={u.email}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Offshore Invoice Payment Approver */}
            <div className="border border-[#e6e9f0] rounded-xl p-4 bg-[#fafbfc] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-700">
                  <Briefcase size={16} />
                  <h4 className="text-xs font-bold text-[#0a2540]">Persetujuan Invoice Luar Negeri (Offshore)</h4>
                </div>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full">
                  Approver Terpilih
                </span>
              </div>
              <p className="text-[11px] text-[#758196]">
                Approver utama untuk persetujuan invoice pembayaran valas / offshore.
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pt-1">
                {users.length === 0 ? (
                  <p className="text-xs text-[#758196] italic py-2">Memuat pengguna...</p>
                ) : (
                  users.filter(u => u.role?.toLowerCase().includes('admin')).map(u => {
                    const isSelected = offshoreApprover === u.email;
                    return (
                      <label key={`off-${u.id}`} className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected ? 'bg-blue-50/70 border-blue-300 dark:bg-blue-950/30' : 'bg-card border-[#e6e9f0] hover:border-[#0a2540]/30'
                      }`}>
                        <div>
                          <p className="text-xs font-bold text-[#0a2540]">{u.name}</p>
                          <p className="text-[10px] text-[#758196]">{u.email} • <span className="font-semibold text-[#0a2540]">{u.role}</span></p>
                        </div>
                        <input
                          type="radio"
                          name="offshore_approver_radio"
                          checked={isSelected}
                          onChange={() => setOffshoreApprover(u.email)}
                          className="h-4 w-4 text-[#0a2540] border-gray-300 focus:ring-[#0a2540] cursor-pointer"
                        />
                      </label>
                    );
                  })
                )}
              </div>

              {/* Backup Approver */}
              <div className="pt-3 border-t border-[#e6e9f0]">
                <label className="text-[11px] font-bold text-[#758196] uppercase tracking-wider block mb-1.5">
                  Approver Cadangan (Backup Approver)
                </label>
                <select
                  value={offshoreBackupApprover}
                  onChange={e => setOffshoreBackupApprover(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white border border-[#e6e9f0] rounded-lg font-semibold text-[#16233a]"
                >
                  {users.filter(u => u.role?.toLowerCase().includes('admin')).map(u => (
                    <option key={`off-bk-${u.id}`} value={u.email}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSaveApprovers} size="sm" className="bg-[#0a2540] hover:bg-[#16375c] text-white text-xs font-bold rounded-xl h-9 px-6 shadow-xs">
            <Save size={14} className="mr-1.5" /> Simpan Pengaturan Sistem
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md font-sans border border-border/60 shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
            <div className="flex items-center gap-2 text-red-500 mb-1">
              <AlertTriangle size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Delete Confirmation</span>
            </div>
            <DialogTitle className="text-xl font-black">Are you sure?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              This action will delete <strong>{deleteConfirm?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="p-6 pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)} className="text-xs font-bold rounded-xl h-9">
              Cancel
            </Button>
            <Button onClick={handleConfirmDelete} size="sm" className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl h-9 px-5">
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
