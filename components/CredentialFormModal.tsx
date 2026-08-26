// Credential Form Modal Component

import React, { useState, useEffect } from 'react';
import { X, Key, Globe, User, Lock, Eye, EyeOff, Tag, StickyNote, Loader2 } from 'lucide-react';
import { Credential } from '../types';
import { useToast } from './ToastProvider';

interface CredentialFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<Credential>) => void;
    initialData?: Credential | null;
}

export const CredentialFormModal: React.FC<CredentialFormModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
    const { showToast } = useToast();
    const [formData, setFormData] = useState<Partial<Credential>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const categories = [
        'Provider Inet', 'Subscription', 'Account', 'WiFi', 
        'Web&Domain', 'CCTV', 'PABX', 'Database', 'Sircon71', 
        'Sircon72', 'Sircon73', 'Gesit 26', 'Gesit 27', 'AAMS'
    ];

    // DEFINSI KOLOM DINAMIS PER KATEGORI
    const getDynamicFields = (category: string) => {
        switch(category) {
            case 'Web&Domain':
                return [
                    { key: 'vendor', label: 'Vendor', placeholder: 'e.g. JagoanHosting' },
                    { key: 'type', label: 'Type', placeholder: 'e.g. cPanel, Domain' },
                    { key: 'entity', label: 'Entities', placeholder: 'e.g. GA, AI' },
                    { key: 'serviceUrl', label: 'Link', placeholder: 'https://...' },
                ];
            case 'Provider Inet':
                return [
                    { key: 'entity', label: 'Company / Entity', placeholder: 'e.g. Gesit 26, Sircon 71' },
                    { key: 'speed', label: 'Plan / Speed', placeholder: 'e.g. 100 Mbps Dedicated' },
                    { key: 'accountNumber', label: 'ID Pelanggan', placeholder: 'Nomor Pelanggan' },
                    { key: 'address', label: 'Static IP / Address', placeholder: '103.xxx.xxx.xxx' },
                    { key: 'billingDate', label: 'Billing Date', placeholder: 'Setiap Tgl ...' },
                ];
            case 'Gesit 27':
            case 'Gesit 26':
            case 'WiFi':
            case 'CCTV':
            case 'PABX':
                return [
                    { key: 'brand', label: 'Brand', placeholder: 'e.g. Mikrotik, UniFi, Brother' },
                    { key: 'deviceType', label: 'Device Type', placeholder: 'e.g. Router, Printer, CCTV' },
                    { key: 'unitType', label: 'Unit Type', placeholder: 'e.g. RB450GX4, Pro 200' },
                    { key: 'location', label: 'Location', placeholder: 'e.g. SERVER ROOM, HRL' },
                    { key: 'jumlahPort', label: 'Jumlah Port', placeholder: 'e.g. 5, 28' },
                    { key: 'address', label: 'Address / IP', placeholder: 'e.g. 192.168.1.1' },
                ];
            case 'Subscription':
            case 'Account':
                return [
                    { key: 'provider', label: 'Provider', placeholder: 'e.g. Google Workspace, Zoom' },
                    { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
                ];
            default:
                return [
                   { key: 'address', label: 'Access / IP', placeholder: 'e.g. 192.168.1.1' },
                ];
        }
    };

    const updateMetadata = (key: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            metadata: {
                ...(prev.metadata || {}),
                [key]: value
            }
        }));
    };

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                title: '',
                username: '',
                password: '',
                category: categories[0],
                notes: '',
                metadata: {}
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (error) {
            console.error('Submit Error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClass = "w-full border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-300 mt-1 bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-100 transition-all";
    const labelClass = "block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1 ml-1";

    const dynamicFields = getDynamicFields(formData.category || '');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[95vh] border border-slate-100 dark:border-zinc-800">
                <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50 rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                            {initialData ? 'Edit Protocol' : 'Register Secret'}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 uppercase font-bold tracking-widest">GESIT Vault Registry</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-sm transition-all"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Technical Identity (Name/Title)</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        required 
                                        className={`${inputClass} pl-10 !font-bold`} 
                                        value={formData.title || ''} 
                                        onChange={e => setFormData({ ...formData, title: e.target.value })} 
                                        placeholder="e.g. gesit.co.id, MikroTik Core..." 
                                    />
                                    <Key size={16} className="absolute left-3.5 top-4 text-slate-400" />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Registry Category</label>
                                <select 
                                    className={`${inputClass} pl-4`} 
                                    value={formData.category || categories[0]} 
                                    onChange={e => {
                                        setFormData({ ...formData, category: e.target.value, metadata: {} });
                                    }}
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* DYNAMIC METADATA FIELDS SECTION */}
                        {dynamicFields.length > 0 && (
                            <div className="p-4 bg-slate-50/50 dark:bg-zinc-800/30 rounded-xl border border-slate-100 dark:border-zinc-800/50 space-y-4">
                                <p className="text-[9px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-[0.2em] mb-2 px-1">Specific Metadata Specifications</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {dynamicFields.map(field => (
                                        <div key={field.key}>
                                            <label className={labelClass}>{field.label}</label>
                                            <input 
                                                type={field.type || 'text'} 
                                                className={inputClass}
                                                value={formData.metadata?.[field.key] || ''}
                                                onChange={e => updateMetadata(field.key, e.target.value)}
                                                placeholder={field.placeholder}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Assigned User</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        required 
                                        className={`${inputClass} pl-10`} 
                                        value={formData.username || ''} 
                                        onChange={e => setFormData({ ...formData, username: e.target.value })} 
                                        placeholder="Username / IP / UID"
                                    />
                                    <User size={16} className="absolute left-3.5 top-4 text-slate-400" />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Secured Secret / Pass</label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        className={`${inputClass} pl-10 pr-10`} 
                                        value={formData.password || ''} 
                                        onChange={e => setFormData({ ...formData, password: e.target.value })} 
                                        placeholder="············"
                                    />
                                    <Lock size={16} className="absolute left-3.5 top-4 text-slate-400" />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)} 
                                        className="absolute right-3 top-4 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Detailed Protocol Notes</label>
                            <div className="relative">
                                <textarea 
                                    className={`${inputClass} pl-10 min-h-[80px] py-3`} 
                                    value={formData.notes || ''} 
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                                    placeholder="Add any additional context or remarks..."
                                />
                                <StickyNote size={16} className="absolute left-3.5 top-4 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-zinc-800">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-6 py-2.5 bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold uppercase tracking-widest transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="px-8 py-2.5 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-xl hover:bg-zinc-900/90 dark:hover:bg-zinc-50/90 shadow text-xs font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                        >
                            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                            {initialData ? 'Update Secret' : 'Store Secret'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

