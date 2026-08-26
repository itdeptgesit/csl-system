import React from 'react';
import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  BarChart2, 
  Download, 
  Filter, 
  TrendingUp, 
  Clock, 
  CalendarCheck, 
  Coins, 
  Award, 
  CheckCircle2, 
  Users, 
  PieChart, 
  Star 
} from 'lucide-react';

interface CSLReportsManagerProps {
  currentUser: UserAccount | null;
  view?: 'request' | 'sla' | 'routine' | 'budget' | 'performance';
}

export const CSLReportsManager: React.FC<CSLReportsManagerProps> = ({ currentUser, view = 'request' }) => {

  // ── SUB-PAGE 1: SLA PERFORMANCE REPORT ──────────────────────────────────
  if (view === 'sla') {
    const slaData = [
      { category: 'Agreement', total: 18, avgDays: '3.4 days', target: '5 days', breach: 0, compliance: '100%' },
      { category: 'Corporate Secretary', total: 8, avgDays: '4.1 days', target: '5 days', breach: 0, compliance: '100%' },
      { category: 'OSS & Licensing', total: 6, avgDays: '11.8 days', target: '14 days', breach: 1, compliance: '83.3%' },
      { category: 'Legal Opinion', total: 5, avgDays: '4.8 days', target: '5 days', breach: 0, compliance: '100%' },
      { category: 'Document Request', total: 5, avgDays: '1.2 days', target: '2 days', breach: 0, compliance: '100%' },
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        <PageHeader title="SLA Performance & Fulfillment Analytics" description="Analysis of request resolution speed, target compliance rate, and bottleneck categories">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs font-bold rounded-xl h-9">
              <Filter size={13} className="mr-1.5" /> Filter Period
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-9 px-4 shadow-md">
              <Download size={13} className="mr-1.5" /> Export Report
            </Button>
          </div>
        </PageHeader>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Overall SLA Fulfillment</span>
            <p className="text-3xl font-black text-emerald-600 mt-1">96.4%</p>
            <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">+2.1% vs last month</span>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Avg Resolution Time</span>
            <p className="text-3xl font-black text-indigo-600 mt-1">3.2 Days</p>
            <span className="text-xs text-muted-foreground mt-1 inline-block">Target SLA: &lt; 5.0 Days</span>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Total SLA Breaches</span>
            <p className="text-3xl font-black text-red-600 mt-1">1</p>
            <span className="text-xs text-muted-foreground mt-1 inline-block">Out of 42 requests</span>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Fastest Category</span>
            <p className="text-3xl font-black text-foreground mt-1">Doc Request</p>
            <span className="text-xs text-indigo-600 font-semibold mt-1 inline-block">Avg 1.2 Days</span>
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Category</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Processed Volume</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Avg Handling Time</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">SLA Target</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Breach Count</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Compliance Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slaData.map((s, idx) => (
                <TableRow key={idx} className="hover:bg-muted/40">
                  <TableCell className="font-bold text-sm text-foreground">{s.category}</TableCell>
                  <TableCell className="font-mono text-xs font-bold text-indigo-600">{s.total} requests</TableCell>
                  <TableCell className="font-mono text-xs font-bold text-foreground">{s.avgDays}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{s.target}</TableCell>
                  <TableCell className="font-mono text-xs font-bold text-red-600">{s.breach}</TableCell>
                  <TableCell>
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                      {s.compliance}
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

  // ── SUB-PAGE 2: ROUTINE COMPLIANCE REPORT ─────────────────────────────────
  if (view === 'routine') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        <PageHeader title="Routine Activity Compliance Scorecard" description="Tracking statutory tax filings, quarterly compliance audits, and OSS renewals">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-9 px-4 shadow-md">
            <Download size={13} className="mr-1.5" /> Export Compliance PDF
          </Button>
        </PageHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Compliance Completion Rate</span>
            <p className="text-3xl font-black text-emerald-600 mt-1">100%</p>
            <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">All Q2 routines completed</span>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Active Schedules</span>
            <p className="text-3xl font-black text-indigo-600 mt-1">12 Routines</p>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Upcoming Deadlines (This Month)</span>
            <p className="text-3xl font-black text-amber-600 mt-1">3 Tasks</p>
          </div>
        </div>
      </div>
    );
  }

  // ── SUB-PAGE 3: TEAM PERFORMANCE & PRODUCTIVITY ───────────────────────────
  if (view === 'performance') {
    const team = [
      { name: 'Budi Santoso, S.H.', role: 'Senior Legal Specialist', handled: 18, resolved: 17, avgDays: '2.8 days', rating: '4.9 / 5.0' },
      { name: 'Rina Agustina, S.H.', role: 'Corporate Secretary Specialist', handled: 14, resolved: 14, avgDays: '3.1 days', rating: '5.0 / 5.0' },
      { name: 'Legal Team Pool', role: 'General Support', handled: 10, resolved: 9, avgDays: '3.8 days', rating: '4.8 / 5.0' },
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        <PageHeader title="Team Productivity & Leaderboard" description="Individual legal staff ticket handling volume, resolution times, and user ratings">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-9 px-4 shadow-md">
            <Award className="h-4 w-4 mr-1.5" /> Performance Review
          </Button>
        </PageHeader>

        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Legal Staff Member</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Role</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Assigned Tickets</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Completed</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Avg Handling Time</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">User Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((t, idx) => (
                <TableRow key={idx} className="hover:bg-muted/40">
                  <TableCell className="font-bold text-sm text-foreground">{t.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.role}</TableCell>
                  <TableCell className="font-mono text-xs font-bold text-indigo-600">{t.handled} tickets</TableCell>
                  <TableCell className="font-mono text-xs font-bold text-emerald-600">{t.resolved}</TableCell>
                  <TableCell className="font-mono text-xs text-foreground">{t.avgDays}</TableCell>
                  <TableCell>
                    <span className="text-xs font-black text-amber-600 flex items-center gap-1">
                      <Star size={12} className="fill-amber-400 text-amber-400" /> {t.rating}
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

  // ── SUB-PAGE 4: REQUEST VOLUME REPORT (DEFAULT) ───────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
      <PageHeader title="Request Volume & Category Distribution" description="Comprehensive analysis of incoming legal and corporate secretary requests">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs font-bold rounded-xl h-9">
            <Filter size={13} className="mr-1.5" /> Filter Period
          </Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-9 px-4 shadow-md">
            <Download size={13} className="mr-1.5" /> Export PDF
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase text-muted-foreground">Total Requests Received</span>
          <p className="text-3xl font-black text-foreground mt-1">42</p>
          <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">+12% vs last month</span>
        </div>
        <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase text-muted-foreground">Completed Requests</span>
          <p className="text-3xl font-black text-emerald-600 mt-1">30</p>
        </div>
        <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase text-muted-foreground">In Progress</span>
          <p className="text-3xl font-black text-indigo-600 mt-1">8</p>
        </div>
        <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase text-muted-foreground">Top Category</span>
          <p className="text-3xl font-black text-foreground mt-1">Agreement</p>
          <span className="text-xs text-indigo-600 font-semibold mt-1 inline-block">42.8% of volume</span>
        </div>
      </div>
    </div>
  );
};
