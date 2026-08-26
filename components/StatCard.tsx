import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Minus, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Sparkline } from './Sparkline';

interface StatCardProps {
    label: string;
    value: string | number;
    subValue?: string;
    icon: any;
    color?: string; // Legacy prop (e.g. "blue", "rose")
    colorClass?: string; // New prop for full Tailwind classes
    subtext?: string; // Alias for subValue to match ExtensionDirectory usage
    trend?: number;
    onClick?: () => void;
    children?: React.ReactNode;
    // New props for advanced features
    trendData?: number[]; // For sparkline
    percentageChange?: number; // +5.2 or -3.1
    target?: number; // For progress bar
    comparisonPeriod?: 'MTD' | 'QTD' | 'YTD' | 'vs Last Month' | 'vs Last Week';
    previousValue?: number;
    showSparkline?: boolean;
    status?: 'on-track' | 'at-risk' | 'delayed';
}

export const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    subValue,
    subtext,
    icon: Icon,
    color = "indigo",
    colorClass,
    trend,
    onClick,
    children,
    trendData,
    percentageChange,
    target,
    comparisonPeriod,
    previousValue,
    showSparkline = true,
    status
}) => {
    // Horizon UI Color Mapping - Refined for High Contrast
    const colorMap: any = {
        indigo: { iconBg: 'bg-[#111827]', text: 'text-white' },
        blue: { iconBg: 'bg-blue-600', text: 'text-white' },
        emerald: { iconBg: 'bg-emerald-600', text: 'text-white' },
        rose: { iconBg: 'bg-rose-600', text: 'text-white' },
        amber: { iconBg: 'bg-amber-500', text: 'text-white' },
        purple: { iconBg: 'bg-purple-600', text: 'text-white' },
        sky: { iconBg: 'bg-sky-500', text: 'text-white' },
        orange: { iconBg: 'bg-orange-500', text: 'text-white' },
    };

    const c = colorMap[color] || colorMap.indigo;
    const finalSubText = subValue || subtext;

    const calculatedChange = percentageChange !== undefined
        ? percentageChange
        : (previousValue && typeof value === 'number')
            ? ((value - previousValue) / previousValue) * 100
            : undefined;

    const trendDirection = calculatedChange !== undefined
        ? calculatedChange > 0 ? 'up' : calculatedChange < 0 ? 'down' : 'neutral'
        : undefined;

    return (
        <motion.div
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={onClick}
            className={`
                relative flex flex-col justify-between p-6
                bg-card text-card-foreground border shadow-sm
                rounded-xl min-h-[140px]
                transition-all duration-200 cursor-pointer group hover:bg-muted/50
                dark:border-white/10
            `}
        >
            <div className="flex justify-between items-center mb-4">
                <p className="text-xs font-semibold text-muted-foreground tracking-wide">
                    {label}
                </p>
                <div className="transition-all duration-300 group-hover:scale-105">
                    {typeof Icon === 'string' ? (
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-700 border border-slate-100 dark:border-zinc-600 flex items-center justify-center shadow-[0_2px_8px_-3px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_-3px_rgba(0,0,0,0.5)] p-1.5 shrink-0">
                            <img src={Icon} className="w-full h-full object-contain" alt="" />
                        </div>
                    ) : (
                        Icon && (
                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-zinc-700 border border-slate-100/50 dark:border-zinc-600 flex items-center justify-center text-slate-500 dark:text-zinc-300 opacity-80 group-hover:opacity-100 transition-opacity">
                                <Icon size={14} strokeWidth={2.5} />
                            </div>
                        )
                    )}
                </div>
            </div>

            <div className="mt-auto">
                <div className="flex items-center justify-between min-w-0 gap-1">
                    <div className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-foreground truncate" title={String(value)}>
                        {value}
                    </div>
                    {calculatedChange !== undefined && (
                        <div className={`flex items-center gap-0.5 font-bold text-xs ${trendDirection === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {trendDirection === 'up' ? <ArrowUpRight size={14} strokeWidth={2.5} /> : <ArrowDownRight size={14} strokeWidth={2.5} />}
                            {Math.abs(calculatedChange).toFixed(0)}%
                        </div>
                    )}
                </div>
                {finalSubText && (
                    <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                        {finalSubText}
                    </p>
                )}
            </div>
        </motion.div>
    );
};

