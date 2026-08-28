import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Kanban, 
  CheckCircle2,
  Calendar,
  Activity,
  FolderOpen,
  Briefcase,
  Eye,
  Settings
} from 'lucide-react';
import { UserAccount } from '../types';

interface MenuPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount | null;
  onSave: (menus: string[]) => void;
}

const PRESETS = {
  'FULL ADMIN': ['dashboard', 'req_view', 'req_submit', 'req_review', 'routine_view', 'routine_create', 'doc_vault', 'budget', 'settings'],
  'LEGAL STAFF': ['dashboard', 'req_view', 'req_submit', 'req_review', 'routine_view', 'doc_vault'],
  'REQUESTER': ['dashboard', 'req_submit', 'req_view'],
  'AUDITOR': ['dashboard', 'req_view', 'routine_view', 'doc_vault', 'budget']
};

const MENU_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, title: 'Dashboard & Quick Metrics', desc: 'Access hero landing page and system overview' },
  { id: 'req_view', icon: Kanban, title: 'Request Management - View Requests', desc: 'View list of legal requests' },
  { id: 'req_submit', icon: CheckCircle2, title: 'Request Management - Submit Request', desc: 'Create new legal service requests' },
  { id: 'req_review', icon: ShieldCheck, title: 'Request Management - Review & Process', desc: 'Assign staff, update status, and review tickets' },
  { id: 'routine_view', icon: Calendar, title: 'Routine Activities - View Monitoring', desc: 'Access recurring compliance and tax schedules' },
  { id: 'routine_create', icon: Activity, title: 'Routine Activities - Create Schedules', desc: 'Define new routine schedules' },
  { id: 'doc_vault', icon: FolderOpen, title: 'Documents Vault - Access Repository', desc: 'Search and view agreements, deeds, and drive vault' },
  { id: 'budget', icon: Briefcase, title: 'Budget & Cost Management', desc: 'View and approve expense requests' },
  { id: 'settings', icon: Settings, title: 'System Settings & Users', desc: 'Manage user access, companies, and app settings' },
];

export const MenuPermissionsModal: React.FC<MenuPermissionsModalProps> = ({ isOpen, onClose, user, onSave }) => {
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  
  useEffect(() => {
    if (user && isOpen) {
      // Initialize with user's existing groups (or allowed menus)
      setSelectedMenus(user.groups || []);
    }
  }, [user, isOpen]);

  const toggleMenu = (id: string) => {
    setSelectedMenus(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const applyPreset = (presetMenus: string[]) => {
    setSelectedMenus(presetMenus);
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl">
        <DialogHeader className="p-6 bg-white dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Access Control Matrix</span>
          </div>
          <DialogTitle className="text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
            Menu Permissions - {user.fullName?.split(' ')[0]}
          </DialogTitle>
          <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-2 leading-relaxed">
            Grant or revoke menu access rights specifically<br/>for account <span className="text-slate-900 dark:text-zinc-300">{user.email}</span>.
          </p>
        </DialogHeader>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Quick Presets */}
          <div className="mb-8">
            <h3 className="text-xs font-black text-slate-900 dark:text-zinc-100 mb-3">Apply Quick Preset</h3>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => applyPreset(PRESETS['FULL ADMIN'])}
                className="text-[9px] font-black uppercase tracking-widest text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-900"
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Full Admin
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => applyPreset(PRESETS['LEGAL STAFF'])}
                className="text-[9px] font-black uppercase tracking-widest text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-950/30 dark:border-blue-900"
              >
                <Briefcase className="h-3.5 w-3.5 mr-1.5" /> Legal Staff
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => applyPreset(PRESETS['REQUESTER'])}
                className="text-[9px] font-black uppercase tracking-widest text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Requester
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => applyPreset(PRESETS['AUDITOR'])}
                className="text-[9px] font-black uppercase tracking-widest text-slate-600 border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300"
              >
                <Eye className="h-3.5 w-3.5 mr-1.5" /> Auditor
              </Button>
            </div>
          </div>

          {/* Module & Menu Toggles */}
          <div>
            <h3 className="text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Module & Menu Toggles</h3>
            <div className="space-y-3">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const isChecked = selectedMenus.includes(item.id);
                
                return (
                  <div 
                    key={item.id}
                    onClick={() => toggleMenu(item.id)}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                      isChecked 
                        ? 'bg-white border-indigo-200 shadow-sm shadow-indigo-100/50 dark:bg-zinc-900 dark:border-indigo-900/50 dark:shadow-none' 
                        : 'bg-transparent border-slate-200 hover:border-slate-300 dark:border-zinc-800 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                      isChecked 
                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400' 
                        : 'bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-zinc-500'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className={`text-sm font-bold tracking-tight transition-colors ${
                        isChecked ? 'text-slate-900 dark:text-zinc-100' : 'text-slate-600 dark:text-zinc-400'
                      }`}>
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-500 font-medium mt-0.5">
                        {item.desc}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                        isChecked 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                          : 'bg-transparent border-slate-300 dark:border-zinc-600'
                      }`}>
                        {isChecked && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-white dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-800 gap-2 sm:justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-bold rounded-xl h-10 px-5">
            Cancel
          </Button>
          <Button size="sm" onClick={() => onSave(selectedMenus)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-10 px-6 shadow-md">
            Save Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
