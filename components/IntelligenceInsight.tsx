'use client';

import React from 'react';
import {
    Lightbulb, AlertTriangle, TrendingUp, Shield, CheckCircle2,
    Info, AlertCircle, ChevronRight, Sparkles
} from 'lucide-react';
import { Insight } from '../utils/IntelligenceUtils';

interface IntelligenceInsightProps {
    insight: Insight;
}

export const IntelligenceInsight: React.FC<IntelligenceInsightProps> = ({ insight }) => {
    // Type-based styling
    const typeStyles = {
        info: {
            bg: 'bg-blue-50 dark:bg-blue-950/30',
            border: 'border-blue-200 dark:border-blue-800',
            icon: 'text-blue-600 dark:text-blue-400',
            iconBg: 'bg-blue-100 dark:bg-blue-900/40',
            text: 'text-blue-900 dark:text-blue-100'
        },
        success: {
            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
            border: 'border-emerald-200 dark:border-emerald-800',
            icon: 'text-emerald-600 dark:text-emerald-400',
            iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
            text: 'text-emerald-900 dark:text-emerald-100'
        },
        warning: {
            bg: 'bg-amber-50 dark:bg-amber-950/30',
            border: 'border-amber-200 dark:border-amber-800',
            icon: 'text-amber-600 dark:text-amber-400',
            iconBg: 'bg-amber-100 dark:bg-amber-900/40',
            text: 'text-amber-900 dark:text-amber-100'
        },
        critical: {
            bg: 'bg-rose-50 dark:bg-rose-950/30',
            border: 'border-rose-200 dark:border-rose-800',
            icon: 'text-rose-600 dark:text-rose-400',
            iconBg: 'bg-rose-100 dark:bg-rose-900/40',
            text: 'text-rose-900 dark:text-rose-100'
        }
    };

    // Category-based icons
    const categoryIcons = {
        anomaly: AlertTriangle,
        prediction: TrendingUp,
        recommendation: Lightbulb,
        risk: Shield,
        trend: Sparkles
    };

    const style = typeStyles[insight.type];
    const IconComponent = categoryIcons[insight.category];

    // Priority badge
    const priorityBadge = {
        high: { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-700 dark:text-rose-300', label: 'High' },
        medium: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', label: 'Medium' },
        low: { bg: 'bg-slate-100 dark:bg-zinc-800', text: 'text-slate-600 dark:text-zinc-400', label: 'Low' }
    }[insight.priority];

    return (
        <div
            className={`${style.bg} ${style.border} border rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${insight.action ? 'cursor-pointer' : ''} group animate-in fade-in slide-in-from-bottom-2`}
            onClick={insight.action?.onClick}
        >
            <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`${style.iconBg} ${style.icon} p-3 rounded-xl shrink-0`}>
                    <IconComponent size={20} strokeWidth={2.5} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className={`font-bold ${style.text} text-sm leading-tight`}>
                            {insight.title}
                        </h4>
                        <span className={`${priorityBadge.bg} ${priorityBadge.text} text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shrink-0`}>
                            {priorityBadge.label}
                        </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed mb-3">
                        {insight.description}
                    </p>

                    {/* Metric Display */}
                    {insight.metric && insight.value !== undefined && (
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest">
                                {insight.metric}:
                            </span>
                            <span className={`text-sm font-black ${style.text}`}>
                                {insight.value}
                            </span>
                        </div>
                    )}

                    {/* Action Button */}
                    {insight.action && (
                        <div className="flex items-center gap-2 text-xs font-bold group-hover:gap-3 transition-all">
                            <span className={style.icon}>{insight.action.label}</span>
                            <ChevronRight size={14} className={`${style.icon} group-hover:translate-x-1 transition-transform`} />
                        </div>
                    )}

                    {/* Timestamp */}
                    <div className="text-[10px] text-slate-400 dark:text-slate-600 mt-2">
                        {insight.timestamp.toLocaleTimeString()}
                    </div>
                </div>
            </div>
        </div>
    );
};

