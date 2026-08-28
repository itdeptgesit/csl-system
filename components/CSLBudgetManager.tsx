import React, { useState } from 'react';
import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Receipt } from 'lucide-react';
import { CSLExpenseApproval } from './CSLExpenseApproval';

interface CSLBudgetManagerProps {
  currentUser: UserAccount | null;
  view?: 'plan' | 'request' | 'expense' | 'monitoring';
}

export const CSLBudgetManager: React.FC<CSLBudgetManagerProps> = ({ currentUser, view = 'monitoring' }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  // ── SUB-PAGE 1: BUDGET PLAN 2026 ──────────────────────────────────────────
  if (view === 'plan') {
    const plans = [
      { id: 1, code: 'BUD-2026-Q1', category: 'Litigation & Counsel', allocated: 200000000, approved: 180000000, desc: 'External counsel retainer & litigation reserves' },
      { id: 2, code: 'BUD-2026-Q2', category: 'Licensing & Permits', allocated: 50000000, approved: 50000000, desc: 'OSS RBA registration & sectoral permit fees' },
      { id: 3, code: 'BUD-2026-Q3', category: 'Notary & Statutory', allocated: 40000000, approved: 35000000, desc: 'Deed revisions, RUPS notary fees, and Kemenkumham filings' },
      { id: 4, code: 'BUD-2026-Q4', category: 'Legal Training', allocated: 25000000, approved: 20000000, desc: 'Compliance certifications & legal staff training' },
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        <PageHeader title="Annual Budget Plan 2026" description="Strategic financial planning, quarterly legal department allocations, and approval targets">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md">
            <Plus className="h-4 w-4 mr-1.5" /> Add Budget Item
          </Button>
        </PageHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Total Proposed Budget</span>
            <p className="text-2xl font-black text-foreground mt-1">{formatRupiah(315000000)}</p>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Total Approved Allocation</span>
            <p className="text-2xl font-black text-indigo-600 mt-1">{formatRupiah(285000000)}</p>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Approval Status</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">APPROVED (BOD)</p>
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Plan Code</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Category</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Proposed Budget</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Approved Budget</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map(p => (
                <TableRow key={p.id} className="hover:bg-muted/40">
                  <TableCell className="font-mono text-xs font-bold text-indigo-600">{p.code}</TableCell>
                  <TableCell className="font-bold text-sm text-foreground">{p.category}</TableCell>
                  <TableCell className="font-mono text-xs font-bold text-muted-foreground">{formatRupiah(p.allocated)}</TableCell>
                  <TableCell className="font-mono text-xs font-bold text-indigo-600">{formatRupiah(p.approved)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.desc}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // ── SUB-PAGE 2: BUDGET REQUESTS ───────────────────────────────────────────
  if (view === 'request') {
    const requests = [
      { id: 1, reqNo: 'REQ-COST-001', title: 'Notary Fee for Deed Revision No. 12', amount: 15000000, requestedBy: 'Budi Santoso', date: 'Today', status: 'PENDING_APPROVAL' },
      { id: 2, reqNo: 'REQ-COST-002', title: 'External Retainer Counsel Fee Q3', amount: 45000000, requestedBy: 'Rina Agustina', date: 'Yesterday', status: 'APPROVED' },
      { id: 3, reqNo: 'REQ-COST-003', title: 'Sworn Legal Translation Fees (5 Documents)', amount: 6500000, requestedBy: 'Legal Staff', date: '10 Aug 2026', status: 'DISBURSED' },
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        <PageHeader title="Budget Requests & Approvals" description="Submit and review fund disbursement requests for legal operational costs">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md">
            <Plus className="h-4 w-4 mr-1.5" /> Submit Budget Request
          </Button>
        </PageHeader>

        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Request No.</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Purpose / Title</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Amount Requested</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Requested By</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(r => (
                <TableRow key={r.id} className="hover:bg-muted/40">
                  <TableCell className="font-mono text-xs font-bold text-indigo-600">{r.reqNo}</TableCell>
                  <TableCell className="font-bold text-sm text-foreground">{r.title}</TableCell>
                  <TableCell className="font-mono text-xs font-bold text-indigo-600">{formatRupiah(r.amount)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.requestedBy}</TableCell>
                  <TableCell>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${
                      r.status === 'DISBURSED' ? 'bg-emerald-100 text-emerald-700' :
                      r.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // ── SUB-PAGE 3: EXPENSES APPROVAL ──────────────────────────────────────────
  if (view === 'expense') {
    return <CSLExpenseApproval currentUser={currentUser} />;
  }

  // ── SUB-PAGE 4: BUDGET MONITORING & ANALYTICS (DEFAULT) ───────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
      <PageHeader title="Budget Monitoring & Financial Gauge" description="Real-time tracking of budget utilization, remaining balances, and category burn rates">
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md">
          <Plus className="h-4 w-4 mr-1.5" /> Submit Budget Request
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase text-muted-foreground">Total Budget Allocated</span>
          <p className="text-2xl font-black text-foreground mt-1">{formatRupiah(285000000)}</p>
        </div>
        <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase text-muted-foreground">Total Realized Expense</span>
          <p className="text-2xl font-black text-indigo-600 mt-1">{formatRupiah(66500000)}</p>
          <span className="text-xs text-emerald-600 font-semibold">23.3% utilized</span>
        </div>
        <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase text-muted-foreground">Remaining Balance</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{formatRupiah(218500000)}</p>
        </div>
      </div>

      {/* Category Progress Bars */}
      <div className="bg-card border border-border/40 rounded-2xl p-6 shadow-sm space-y-5">
        <h3 className="text-sm font-extrabold text-foreground">Budget Utilization by Legal Category</h3>
        
        {[
          { category: 'Litigation & Counsel', allocated: 180000000, spent: 45000000, percent: 25 },
          { category: 'Licensing & Permits', allocated: 50000000, spent: 12000000, percent: 24 },
          { category: 'Notary & Statutory Filings', allocated: 35000000, spent: 9500000, percent: 27 },
          { category: 'Legal Staff Training', allocated: 20000000, spent: 0, percent: 0 },
        ].map((item, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-foreground">{item.category}</span>
              <span className="text-indigo-600">{formatRupiah(item.spent)} / {formatRupiah(item.allocated)} ({item.percent}%)</span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${item.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
