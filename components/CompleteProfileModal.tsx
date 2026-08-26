import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserAccount } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Loader2, Briefcase, Building2 } from 'lucide-react';
import { useLanguage } from '../translations';

interface CompleteProfileModalProps {
  user: UserAccount | null;
  onUpdateSuccess: () => void;
}

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({ user, onUpdateSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    department: '',
    company: ''
  });

  const [departmentList, setDepartmentList] = useState<{ name: string }[]>([]);
  const [companyList, setCompanyList] = useState<{ id: number, name: string }[]>([]);

  useEffect(() => {
    // Check if user needs to complete profile
    if (user && (user.department === 'Other' || !user.department || user.company === 'GESIT' || !user.company)) {
      setIsOpen(true);
      setFormData({
        department: user.department === 'Other' ? '' : (user.department || ''),
        company: user.company === 'GESIT' ? '' : (user.company || '')
      });
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      const fetchMasterData = async () => {
        const { data: depts } = await supabase.from('departments').select('name').order('name');
        if (depts) setDepartmentList(depts);

        const { data: comps } = await supabase.from('companies').select('id, name').order('name');
        if (comps) setCompanyList(comps);
      };
      fetchMasterData();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.department || !formData.company) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_accounts')
        .update({
          department: formData.department,
          company: formData.company
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setIsOpen(false);
      onUpdateSuccess();
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Prevent closing if data is not filled
      if (!open && formData.department && formData.company) {
        setIsOpen(false);
      }
    }}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-0 overflow-hidden shadow-2xl rounded-2xl">
        <div className="h-1.5 w-full bg-[#0B1A35]" />
        
        <div className="p-6">
          <DialogHeader className="mb-6 text-left">
            <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Complete Your Profile</DialogTitle>
            <DialogDescription className="text-slate-500 text-[13px] leading-relaxed mt-1">
              Please complete your department and company information to continue using CSL System.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase size={12} className="text-[#C9A84C]" /> Department
              </Label>
              <Select value={formData.department} onValueChange={(v) => setFormData({...formData, department: v})}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 font-medium">
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  {departmentList.map(d => (
                    <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={12} className="text-[#C9A84C]" /> Company
              </Label>
              <Select value={formData.company} onValueChange={(v) => setFormData({...formData, company: v})}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 font-medium">
                  <SelectValue placeholder="Select your company" />
                </SelectTrigger>
                <SelectContent>
                  {companyList.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                disabled={isSaving || !formData.department || !formData.company}
                className="w-full h-11 rounded-xl bg-[#0B1A35] hover:opacity-90 text-white font-bold"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Save & Continue"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
