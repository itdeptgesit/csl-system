import React from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    subtitle?: string; // New prop for premium all-caps subtitle
    children?: React.ReactNode;
}

export const PageHeader = ({ title, description, subtitle, children }: PageHeaderProps) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="flex flex-col">
                <h1 className="text-3xl font-black tracking-tight mb-1 text-[#0B1A35] dark:text-slate-100">{title}</h1>
                {subtitle && (
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#C9A84C' }}>{subtitle}</p>
                )}
                {description && !subtitle && (
                    <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400">{description}</p>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-3">
                    {children}
                </div>
            )}
        </div>
    );
};
