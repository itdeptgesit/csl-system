import React from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    subtitle?: string; // New prop for premium all-caps subtitle
    children?: React.ReactNode;
}

export const PageHeader = ({ title, description, subtitle, children }: PageHeaderProps) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="flex flex-col">
                <h1 className="text-[30px] font-bold tracking-tight text-[#0a2540] dark:text-zinc-100 font-sans leading-tight">
                    {title}
                </h1>
                {subtitle && (
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mt-1">
                        {subtitle}
                    </div>
                )}
                {description && (
                    <p className="text-[13px] font-normal text-[#758196] dark:text-zinc-400 mt-0.5 leading-relaxed">
                        {description}
                    </p>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-3 shrink-0">
                    {children}
                </div>
            )}
        </div>
    );
};
