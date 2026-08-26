import React from 'react';
import { TrendingUp, AlertTriangle, Wallet, PieChart } from 'lucide-react';

interface FinancialHealthSummaryProps {
    outflowChange: number;
    pendingCount: number;
    largestCategory: { name: string; percentage: number };
    riskLevel: 'Low' | 'Medium' | 'High';
}

export const FinancialHealthSummary: React.FC<FinancialHealthSummaryProps> = ({
    outflowChange,
    pendingCount,
    largestCategory,
    riskLevel
}) => {
    const getRiskColor = (level: string) => {
        switch (level) {
            case 'Low': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800';
            case 'Medium': return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800';
            case 'High': return 'text-rose-500 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800';
            default: return 'text-slate-500 bg-slate-50';
        }
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
            <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                    <TrendingUp size={16} />
                </div>
                <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cash Outflow</p>
                    <p className={`text-xs font-bold ${outflowChange > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {outflowChange > 0 ? '↑' : '↓'} {Math.abs(outflowChange)}% <span className="text-slate-400 font-medium text-[9px]">vs last month</span>
                    </p>
                </div>
            </div>

            <div className="h-6 w-px bg-slate-100 dark:bg-zinc-800 hidden md:block"></div>

            <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg">
                    <AlertTriangle size={16} />
                </div>
                <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pending Approvals</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {pendingCount} <span className="text-slate-400 font-medium text-[9px]">invoices</span>
                    </p>
                </div>
            </div>

            <div className="h-6 w-px bg-slate-100 dark:bg-zinc-800 hidden md:block"></div>

            <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg">
                    <PieChart size={16} />
                </div>
                <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Largest Category</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {largestCategory.name} <span className="text-slate-400 font-medium text-[9px]">({largestCategory.percentage}%)</span>
                    </p>
                </div>
            </div>

            <div className="h-6 w-px bg-slate-100 dark:bg-zinc-800 hidden md:block"></div>

            <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-400 rounded-lg">
                    <Wallet size={16} />
                </div>
                <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Risk Level</p>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${getRiskColor(riskLevel)}`}>
                        {riskLevel}
                    </span>
                </div>
            </div>
        </div>
    );
};

