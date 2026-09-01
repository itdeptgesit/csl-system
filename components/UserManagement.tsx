'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Trash2, Pencil, RefreshCcw, ShieldCheck, Target, Clock, ChevronLeft, ChevronRight, Users, Activity, FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '../lib/excelExport';
import { UserAccount, UserGroup } from '../types';
import { UserFormModal } from './UserFormModal';
import { MenuPermissionsModal } from './MenuPermissionsModal';
import { DangerConfirmModal } from './DangerConfirmModal';
import { supabase, supabaseAdmin } from '../lib/supabaseClient';
import { trackActivity } from '../lib/auditLogger';
import { useToast } from './ToastProvider';
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface UserManagementProps {
  onUpdateSuccess?: () => void;
  currentUser: UserAccount | null;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onUpdateSuccess, currentUser }) => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserAccount | null>(null);
  const [permissionUser, setPermissionUser] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr || dateStr === 'Never') return 'Offline';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return `Invalid: ${dateStr}`;

    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInSecs = Math.floor(diffInMs / 1000);
    const diffInMins = Math.floor(diffInSecs / 60);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSecs < 60) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.from('user_accounts').select('*').order('full_name');
      if (userError) throw userError;
      const { data: groupData, error: groupError } = await supabase.from('user_groups').select('*').order('name');
      if (groupError) throw groupError;
      if (userData) {
        const usersMapped = userData.map((u: any) => ({
          id: u.id,
          authId: u.auth_id,
          username: u.username,
          fullName: u.full_name,
          email: u.email,
          role: u.role,
          groups: u.groups || [],
          status: u.status,
          company: u.company || '',
          department: u.department || '',
          phone: u.phone,
          address: u.address,
          jobTitle: u.job_title,
          supervisorId: u.supervisor_id?.toString(),
          managerId: u.manager_id?.toString(),
          vpId: u.vp_id?.toString(),
          lastLogin: u.last_login ? u.last_login : 'Never',
          avatarUrl: u.avatar_url,
          isHelpdeskSupport: u.is_helpdesk_support
        }));
        setUsers(usersMapped);

        // Audit check
        const marchUsers = usersMapped.filter(u => u.lastLogin.includes('2026-03'));
        if (marchUsers.length > 0) {
          console.log(`UserManagement: Found ${marchUsers.length} users active in March 2026`);
        } else {
          console.warn("UserManagement: No March 2026 active users found in database!");
        }
      }
      if (groupData) {
        setGroups(groupData.map((g: any) => ({ id: g.id, name: g.name, description: g.description, allowedMenus: g.allowed_menus || [] })));
      }
    } catch (err: any) { console.warn("Fetch data error", err); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = (user.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.company || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter ? user.role === roleFilter : true;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, roleFilter]);

  const handleExportExcel = () => {
    if (filteredUsers.length === 0) return;

    const dataToExport = filteredUsers.map(u => ({
      "Username": u.username,
      "Full Name": u.fullName,
      "Email": u.email,
      "Role": u.role,
      "Department": u.department,
      "Status": u.status,
      "Last Login": u.lastLogin || "-",
      "Company": u.company || "-"
    }));

    exportToExcel(dataToExport, `GESIT-USERS-${new Date().toISOString().split('T')[0]}`);
  };

  const handleAddUser = () => { setEditingUser(null); setIsModalOpen(true); };
  const handleEditUser = (user: UserAccount) => { setEditingUser(user); setIsModalOpen(true); };

  const isSuperAdmin = currentUser?.role?.toLowerCase() === 'super admin' || currentUser?.role?.toLowerCase() === 'super_admin';
  const isAdminOrSuperAdmin = isSuperAdmin || currentUser?.role?.toLowerCase() === 'admin';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <PageHeader
        title="System Administration"
        description="Global user access control & node registry"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            className="text-xs font-bold"
          >
            <FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Export Excel
          </Button>
          {isAdminOrSuperAdmin && (
            <Button
              onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
              className="text-xs font-bold /20 whitespace-nowrap"
            >
              <Plus className="mr-2 h-3.5 w-3.5" /> Register Identity
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Input placeholder="Search user identity..." className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl font-semibold placeholder:text-slate-400 dark:text-slate-200" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={16} />
        </div>
        <div className="flex bg-slate-50 dark:bg-zinc-800 p-1 rounded-xl flex-wrap gap-1">
          {['', 'Super Admin', 'Admin', 'Staff', 'User'].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${roleFilter === r ? 'bg-white dark:bg-slate-700 text-zinc-950 dark:text-zinc-50 shadow-sm font-extrabold' : 'text-slate-400 hover:text-slate-600'}`}>{r || 'All'}</button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-white dark:bg-zinc-900 hover:bg-white dark:hover:bg-slate-900">
                <TableHead className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">User Name</TableHead>
                <TableHead className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">Email</TableHead>
                <TableHead className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">Company & Dept</TableHead>
                <TableHead className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">Role</TableHead>
                <TableHead className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">Access Scope</TableHead>
                <TableHead className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-md" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-8 w-40 rounded-lg" /></TableCell>
                    <TableCell className="px-6 py-4 text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedUsers.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20 text-slate-300 dark:text-slate-700 font-bold uppercase tracking-[0.2em] text-[10px]">Registry Empty.</TableCell></TableRow>
              ) : paginatedUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-all group">
                  <TableCell className="px-6 py-4 font-bold text-sm text-slate-900 dark:text-slate-100">
                    {user.fullName}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs font-medium text-slate-500">
                    {user.email}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 tracking-tight">{user.company || 'Unknown Entity'}</span>
                      <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500">{user.department || 'Global'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                      user.role === 'Super Admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                      user.role === 'Admin' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' :
                      user.role === 'Staff' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                      'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Button variant="outline" size="sm" onClick={() => setPermissionUser(user)} className="h-8 text-xs font-semibold text-indigo-600 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-900 dark:hover:bg-indigo-950/40">
                      <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Configure Permissions
                    </Button>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-4 text-slate-400 group-hover:text-slate-500 transition-colors">
                      <button onClick={() => handleEditUser(user)} title="Edit User" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"><Pencil size={15} /></button>
                      {isSuperAdmin && (
                        <button onClick={() => setDeleteUser(user)} title="Delete User (Super Admin Only)" className="hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="px-6 py-4 bg-slate-50/30 dark:bg-zinc-800/30 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Page {currentPage} of {totalPages || 1}</p>
          <div className="flex items-center gap-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 transition-all"><ChevronLeft size={16} /></button>
            <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 transition-all"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (userData) => {
          const payload = {
            username: userData.username,
            full_name: userData.fullName,
            email: userData.email,
            role: userData.role,
            groups: userData.groups,
            status: userData.status,
            company: userData.company,
            department: userData.department,
            phone: userData.phone,
            address: userData.address,
            job_title: userData.jobTitle,
            supervisor_id: userData.supervisorId || null,
            manager_id: userData.managerId || null,
            vp_id: userData.vpId || null,
            avatar_url: userData.avatarUrl,
            is_helpdesk_support: userData.isHelpdeskSupport
          };
          try {
            if (editingUser) {
              await supabaseAdmin.from('user_accounts').update(payload).eq('id', editingUser.id);
            } else {
              await supabaseAdmin.from('user_accounts').insert([payload]);
            }
            if (onUpdateSuccess) onUpdateSuccess();

            await trackActivity(
              currentUser?.fullName || 'User',
              currentUser?.role || 'User',
              editingUser ? 'Update User' : 'Create User',
              'UserManagement',
              `${editingUser ? 'Updated' : 'Created'} user ${payload.email} (${payload.full_name})`
            );
            fetchData();
            showToast(editingUser ? "User updated successfully" : "User created successfully", "success");
          } catch (err: any) {
            showToast("Failed to save user: " + err.message, "error");
          }
        }}
        initialData={editingUser}
        availableGroups={groups}
      />

      <DangerConfirmModal
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={async () => {
          if (!deleteUser) return;
          setIsProcessing(true);
          try {
            await supabaseAdmin.from('user_accounts').delete().eq('id', deleteUser.id);
            await trackActivity(
              currentUser?.fullName || 'User',
              currentUser?.role || 'User',
              'Delete User',
              'UserManagement',
              `Deleted user ${deleteUser.email} (${deleteUser.fullName})`
            );
            await fetchData();
            showToast("User deleted successfully", "success");
            setDeleteUser(null);
          } catch (err: any) {
            showToast("Failed to delete user: " + err.message, "error");
          } finally {
            setIsProcessing(false);
          }
        }}
        title="Revoke Node Identity"
        message={`Permanently erase protocol access for "${deleteUser?.fullName}"?`}
        isLoading={isProcessing}
      />

      <MenuPermissionsModal
        isOpen={!!permissionUser}
        onClose={() => setPermissionUser(null)}
        user={permissionUser}
        onSave={async (menus) => {
          if (!permissionUser) return;
          try {
            const { error } = await supabaseAdmin.from('user_accounts').update({ groups: menus }).eq('id', permissionUser.id);
            if (error) {
              console.error('MenuPermissions save error:', error);
              throw error;
            }
            showToast(`Permissions updated for ${permissionUser.fullName}`, "success");
            await fetchData();
            setPermissionUser(null);
          } catch (err: any) {
            console.error('MenuPermissions full error:', err);
            showToast("Gagal menyimpan permission: " + (err.message || 'Unknown error'), "error");
          }
        }}
      />
    </div>
  );
};

