'use client';

import React, { useState, useEffect } from 'react';
import {
    X, Shield, Package, HardDrive, Settings, History,
    ExternalLink, Camera, Cloud, AlertCircle, CheckCircle2,
    Calendar, Tag, MapPin, Layers, Server, Activity,
    ChevronRight, Info
} from 'lucide-react';
import { NetworkSwitch, ITAsset, ActivityLog, PortStatus } from '../types';
import { supabase } from '../lib/supabaseClient';
import { UserAvatar } from './UserAvatar';

interface DeviceProfileDrawerProps {
    device: NetworkSwitch | null;
    isOpen: boolean;
    onClose: () => void;
}

export const DeviceProfileDrawer: React.FC<DeviceProfileDrawerProps> = ({ device, isOpen, onClose }) => {
    const [assetData, setAssetData] = useState<ITAsset | null>(null);
    const [maintenanceLogs, setMaintenanceLogs] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'technical' | 'maintenance'>('overview');

    useEffect(() => {
        if (isOpen && device) {
            fetchLinkedData();
        }
    }, [isOpen, device]);

    const fetchLinkedData = async () => {
        if (!device) return;
        setIsLoading(true);
        try {
            // 1. Fetch Asset Data via Serial Number
            if (device.serialNumber) {
                const { data: asset } = await supabase
                    .from('it_assets')
                    .select('*')
                    .eq('serial_number', device.serialNumber)
                    .single();

                if (asset) {
                    setAssetData({
                        id: asset.id,
                        assetId: asset.asset_id,
                        item: asset.item_name,
                        category: asset.category,
                        brand: asset.brand,
                        serialNumber: asset.serial_number,
                        status: asset.status,
                        location: asset.location,
                        user: asset.user_assigned,
                        remarks: asset.remarks,
                        company: asset.company,
                        department: asset.department,
                        purchaseDate: asset.purchase_date,
                        warrantyExp: asset.warranty_exp,
                        image_url: asset.image_url,
                        specs: asset.specs || {}
                    } as ITAsset);
                }
            }

            // 2. Fetch Maintenance Logs (Searching by device name in remarks or activity name)
            const { data: logs } = await supabase
                .from('activity_logs')
                .select('*')
                .or(`activity_name.ilike.%${device.name}%,remarks.ilike.%${device.name}%`)
                .order('created_at', { ascending: false })
                .limit(5);

            if (logs) {
                setMaintenanceLogs(logs.map((l: any) => ({
                    id: l.id,
                    activityName: l.activity_name,
                    category: l.category,
                    status: l.status,
                    createdAt: l.created_at,
                    itPersonnel: l.it_personnel,
                    remarks: l.remarks
                } as any)));
            }
        } catch (err) {
            console.error('Error fetching linked device data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!device) return null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active':
            case 'Used':
            case 'Online': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'Broken': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
            case 'Repair': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        }
    };

    return (
        <div className={`fixed inset-y-0 right-0 w-full md:w-[450px] z-[200] transition-all duration-500 ease-in-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10 md:hidden"
                    onClick={onClose}
                />
            )}

            <div className="h-full bg-white dark:bg-[#0b1120] shadow-[-20px_0_50px_rgba(0,0,0,0.2)] border-l border-slate-200 dark:border-zinc-800 flex flex-col overflow-hidden">
                {/* Header Section */}
                <div className="relative p-8 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-all active:scale-95"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-xl bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center text-zinc-50 dark:text-zinc-900 shadow shadow-zinc-950/10">
                            <Server size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-[0.3em] block mb-1">Network Identity</span>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">{device.name}</h2>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${getStatusColor(device.status || assetData?.status || 'Online')}`}>
                            <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                            {device.status || assetData?.status || 'Operational'}
                        </div>
                        <div className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                            ID: {assetData?.assetId || 'Virtual'}
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex p-2 gap-1 bg-slate-100 dark:bg-zinc-900/80 mx-8 mt-6 rounded-xl border border-slate-200 dark:border-zinc-800">
                    {[
                        { id: 'overview', icon: Info, label: 'Overview' },
                        { id: 'technical', icon: Settings, label: 'Specs' },
                        { id: 'maintenance', icon: History, label: 'Logs' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm border border-slate-200 dark:border-zinc-700 font-extrabold' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-48 space-y-4">
                            <Activity className="animate-spin text-zinc-900 dark:text-zinc-100" size={32} />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resending digital pulses...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'overview' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    {/* Asset Image */}
                                    <div className="relative group">
                                        <div className="w-full h-48 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center">
                                            {assetData?.image_url ? (
                                                <img src={assetData.image_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 opacity-20">
                                                    <Camera size={32} />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">No Physical Image</span>
                                                </div>
                                            )}
                                        </div>
                                        <button className="absolute bottom-4 right-4 p-3 bg-slate-900/80 backdrop-blur-md text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all border border-white/10">
                                            <Camera size={16} />
                                        </button>
                                    </div>

                                    {/* Core Stats */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-slate-200 dark:border-zinc-850">
                                            <span className="text-[8px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-[0.2em] block mb-1">Logic IP</span>
                                            <span className="text-sm font-mono font-bold text-slate-900 dark:text-zinc-200 tracking-tight">{device.ip || 'DHCP'}</span>
                                        </div>
                                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Uptime</span>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{device.uptime || 'Stable'}</span>
                                        </div>
                                    </div>

                                    {/* Location & Ownership */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-zinc-800">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500">
                                                <MapPin size={18} />
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Deployment Zone</span>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">{device.location} • {device.rack}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-zinc-800">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500">
                                                <Shield size={18} />
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Custodian / Dept</span>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">{assetData?.user || 'IT Infrastructure'} • {assetData?.department || 'Global'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Documentation Notes */}
                                    {device.notes && (
                                        <div className="p-6 rounded-xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Documentation Notes</span>
                                            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed italic">"{device.notes}"</p>
                                        </div>
                                    )}

                                    {/* Audit Trail Section */}
                                    <div className="p-6 rounded-xl bg-slate-900 border border-white/5 space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <History size={14} className="text-zinc-400" />
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Digital Audit Trail</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Provisioned By</span>
                                                <p className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 leading-tight">{device.createdBy || 'System'}</p>
                                                <p className="text-[8px] text-slate-500 font-mono">{device.createdAt ? new Date(device.createdAt).toLocaleString() : 'Historical'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Last Synchronized</span>
                                                <p className="text-[10px] font-bold text-emerald-400 leading-tight">{device.updatedBy || 'Automatic'}</p>
                                                <p className="text-[8px] text-slate-500 font-mono">{device.updatedAt ? new Date(device.updatedAt).toLocaleString() : 'Live'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button className="flex items-center justify-between p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 group hover:bg-emerald-500 hover:text-white transition-all">
                                            <div className="text-left">
                                                <span className="text-[8px] font-black uppercase text-emerald-500 group-hover:text-white/80 block">Config</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest">Backup</span>
                                            </div>
                                            <Cloud size={18} className="text-emerald-500 group-hover:text-white" />
                                        </button>
                                        <button className="flex items-center justify-between p-4 rounded-xl border border-zinc-500/20 bg-zinc-500/5 group hover:bg-zinc-900 dark:hover:bg-zinc-50 hover:text-white dark:hover:text-zinc-950 transition-all">
                                            <div className="text-left">
                                                <span className="text-[8px] font-black uppercase text-zinc-500 group-hover:text-white/85 dark:group-hover:text-zinc-950/85 block">Specs</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest">Datasheet</span>
                                            </div>
                                            <ExternalLink size={18} className="text-zinc-500 group-hover:text-white dark:group-hover:text-zinc-950" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'technical' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Hardware Specifications</h3>
                                    <div className="space-y-3">
                                        {[
                                            { label: 'Manufacturer', value: assetData?.brand || 'Generic' },
                                            { label: 'Model Series', value: device.model },
                                            { label: 'Logical VLAN', value: device.vlan || 'Hybrid' },
                                            { label: 'Physical Interface', value: `${device.totalPorts} Ports RJ45` },
                                            { label: 'Serial Identity', value: device.serialNumber || 'N/A' },
                                            { label: 'Current Load', value: `${device.ports.filter(p => p.status === PortStatus.ACTIVE).length} / ${device.totalPorts} Active` }
                                        ].map((spec, i) => (
                                            <div key={i} className="flex justify-between items-center p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{spec.label}</span>
                                                <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">{spec.value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-8 mb-4">Lifecycle & Warranty</h3>
                                    <div className="bg-slate-900 rounded-xl p-6 border border-white/5 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-10">
                                            <Shield size={64} className="text-zinc-500" />
                                        </div>
                                        <div className="relative z-10 space-y-4">
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                                <span className="text-slate-500">Purchase Date</span>
                                                <span className="text-white">{assetData?.purchaseDate ? new Date(assetData.purchaseDate).toLocaleDateString() : 'Historical'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                                <span className="text-slate-500">Warranty Expires</span>
                                                <span className={new Date(assetData?.warrantyExp || '') < new Date() ? 'text-rose-500' : 'text-emerald-500'}>
                                                    {assetData?.warrantyExp ? new Date(assetData.warrantyExp).toLocaleDateString() : 'Indefinite'}
                                                </span>
                                            </div>
                                            <div className="pt-4 mt-2 border-t border-white/5 flex gap-2">
                                                <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">Claim Support</button>
                                                <button className="flex-1 py-3 bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-900/90 dark:hover:bg-zinc-50/90 text-zinc-50 dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow">Renew Logic</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'maintenance' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Operational Logs</h3>
                                        <button className="text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest hover:underline">+ New Entry</button>
                                    </div>

                                    {maintenanceLogs.length === 0 ? (
                                        <div className="p-10 text-center border-2 border-dashed border-slate-100 dark:border-zinc-800 rounded-xl">
                                            <AlertCircle size={32} className="text-slate-300 mx-auto mb-4" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zero maintenance records found for this frequency.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {maintenanceLogs.map((log, i) => (
                                                <div key={i} className="relative pl-6 pb-6 border-l border-slate-100 dark:border-zinc-800 last:pb-0">
                                                    <div className="absolute top-0 -left-1.5 w-3 h-3 rounded-full bg-zinc-900 dark:bg-zinc-100 shadow-[0_0_10px_rgba(0,0,0,0.1)] border-2 border-white dark:border-[#0b1120]" />
                                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase leading-none">{log.activityName}</h4>
                                                            <span className="text-[8px] font-mono font-bold text-slate-400">{new Date(log.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed line-clamp-2 italic mb-3">"{log.remarks || 'No technical notes recorded.'}"</p>
                                                        <div className="flex items-center gap-2">
                                                            <UserAvatar name={log.itPersonnel} size="xs" />
                                                            <span className="text-[10px] font-black uppercase text-zinc-900 dark:text-zinc-100">{log.itPersonnel}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer / External Search */}
                <div className="p-8 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                    <button className="w-full flex items-center justify-center gap-3 py-4 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 shadow">
                        <Activity size={16} />
                        Live Network Probe
                    </button>
                </div>
            </div>
        </div>
    );
};

