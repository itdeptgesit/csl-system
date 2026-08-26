'use client';

import React, { useState, useEffect } from 'react';
import { Database, Wifi, Server, HardDrive, Activity, CheckCircle2, AlertTriangle, XCircle, Zap } from 'lucide-react';
import { runAllHealthChecks, calculateOverallStatus, HealthCheckResult } from '../utils/HealthCheckUtils';

interface SystemHealthMonitorProps {
    className?: string;
}

export const SystemHealthMonitor: React.FC<SystemHealthMonitorProps> = ({ className = '' }) => {
    const [services, setServices] = useState<HealthCheckResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Run health checks on mount and periodically
    useEffect(() => {
        const performHealthChecks = async () => {
            const results = await runAllHealthChecks();
            setServices(results);
            setIsLoading(false);
        };

        // Initial check
        performHealthChecks();

        // Update every 10 seconds
        const interval = setInterval(performHealthChecks, 10000);

        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (status: HealthCheckResult['status']) => {
        switch (status) {
            case 'operational': return CheckCircle2;
            case 'degraded': return AlertTriangle;
            case 'down': return XCircle;
        }
    };

    const getStatusColor = (status: HealthCheckResult['status']) => {
        switch (status) {
            case 'operational': return {
                bg: 'bg-emerald-50 dark:bg-emerald-950/30',
                border: 'border-emerald-200 dark:border-emerald-800',
                text: 'text-emerald-600 dark:text-emerald-400',
                icon: 'text-emerald-500',
                pulse: 'bg-emerald-500'
            };
            case 'degraded': return {
                bg: 'bg-amber-50 dark:bg-amber-950/30',
                border: 'border-amber-200 dark:border-amber-800',
                text: 'text-amber-600 dark:text-amber-400',
                icon: 'text-amber-500',
                pulse: 'bg-amber-500'
            };
            case 'down': return {
                bg: 'bg-rose-50 dark:bg-rose-950/30',
                border: 'border-rose-200 dark:border-rose-800',
                text: 'text-rose-600 dark:text-rose-400',
                icon: 'text-rose-500',
                pulse: 'bg-rose-500'
            };
        }
    };

    const getServiceIcon = (name: string) => {
        switch (name) {
            case 'Database': return Database;
            case 'API Server': return Server;
            case 'Network': return Wifi;
            case 'Storage': return HardDrive;
            default: return Activity;
        }
    };

    const overallStatus = services.length > 0 ? calculateOverallStatus(services) : 'operational';
    const averageUptime = services.length > 0
        ? (services.reduce((sum, s) => sum + s.uptime, 0) / services.length).toFixed(2)
        : '0.00';

    if (isLoading) {
        return (
            <div className={`space-y-4 animate-in fade-in duration-500 ${className}`}>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-xl shadow-lg animate-pulse">
                        <Zap size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            System Health
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                            Checking system status...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-4 animate-in fade-in duration-500 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-xl shadow-lg">
                        <Zap size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            System Health
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                            Real-time infrastructure monitoring
                        </p>
                    </div>
                </div>

                {/* Overall Status Badge */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${getStatusColor(overallStatus).bg} ${getStatusColor(overallStatus).border}`}>
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(overallStatus).pulse} animate-pulse`} />
                    <span className={`text-sm font-bold ${getStatusColor(overallStatus).text}`}>
                        {overallStatus === 'operational' ? 'All Systems Operational' : overallStatus === 'degraded' ? 'Degraded Performance' : 'System Down'}
                    </span>
                </div>
            </div>

            {/* Service Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {services.map((service) => {
                    const StatusIcon = getStatusIcon(service.status);
                    const ServiceIcon = getServiceIcon(service.name);
                    const colors = getStatusColor(service.status);

                    return (
                        <div
                            key={service.name}
                            className={`${colors.bg} ${colors.border} border rounded-xl p-5 transition-all duration-300 hover:shadow-lg`}
                        >
                            {/* Service Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-2.5 rounded-xl bg-white dark:bg-zinc-800 ${colors.text} shadow-sm`}>
                                    <ServiceIcon size={20} strokeWidth={2.5} />
                                </div>
                                <StatusIcon size={18} className={colors.icon} />
                            </div>

                            {/* Service Name */}
                            <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                                {service.name}
                            </h3>

                            {/* Uptime */}
                            <div className="flex items-baseline gap-2 mb-3">
                                <span className={`text-2xl font-black ${colors.text}`}>
                                    {service.uptime.toFixed(1)}%
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Uptime
                                </span>
                            </div>

                            {/* Response Time */}
                            <div className="flex items-center justify-between text-xs mb-2">
                                <span className="text-slate-500 dark:text-zinc-400 font-medium">
                                    Response Time
                                </span>
                                <span className={`font-bold ${colors.text}`}>
                                    {Math.round(service.responseTime)}ms
                                </span>
                            </div>

                            {/* Uptime Bar */}
                            <div className="h-1 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${colors.pulse} transition-all duration-500`}
                                    style={{ width: `${service.uptime}%` }}
                                />
                            </div>

                            {/* Last Checked */}
                            <div className="mt-2 text-[9px] text-slate-400 dark:text-zinc-500">
                                Updated {service.lastChecked.toLocaleTimeString()}
                            </div>

                            {/* Error Details (if any) */}
                            {service.details && service.status !== 'operational' && (
                                <div className="mt-2 text-[9px] text-rose-500 dark:text-rose-400 truncate" title={service.details}>
                                    {service.details}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Summary Stats */}
            <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-zinc-800/50 rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                            Average Uptime
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white">
                            {averageUptime}%
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                            Services Online
                        </div>
                        <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                            {services.filter(s => s.status === 'operational').length}/{services.length}
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                            Status
                        </div>
                        <div className={`text-xl font-black ${getStatusColor(overallStatus).text}`}>
                            {overallStatus.toUpperCase()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

