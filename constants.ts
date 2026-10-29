
export const APP_NAME = 'CSL-LINK';

export const ALLOWED_EMAIL_DOMAINS = ['gesit.co.id', 'gnr.co.id', 'gnr.id'];

export function isAllowedEmailDomain(email: string): boolean {
    if (!email || typeof email !== 'string' || !email.includes('@')) return false;
    const domain = email.split('@')[1]?.toLowerCase().trim();
    if (!domain) return false;
    return (
        ALLOWED_EMAIL_DOMAINS.includes(domain) ||
        domain === 'gesit.co.id' ||
        domain === 'gnr.co.id' ||
        domain === 'gnr.id' ||
        domain.startsWith('gnr.') ||
        domain.endsWith('.gesit.co.id') ||
        domain.endsWith('.gnr.co.id')
    );
}

export const CURRENT_USER_GROUPS = ['admin'];

export const MOCK_GROUPS = [
    {
        id: 'admin',
        name: 'Administrator',
        description: 'Full Access',
        allowedMenus: [
            'dashboard',
            // Request / Ticketing
            'csl-requests',
            // Routine
            'routine', 'routine-rups', 'routine-lkpm', 'routine-tbk', 'routine-offshore', 'routine-admgt', 'routine-task',
            // Companies & Entities
            'companies', 'settings-companies',
            // Budget & Expenses
            'budget', 'budget-expense', 'budget-report', 'budget-offshore-invoice',
            // Phone Directory
            'directory', 'directory-all', 'directory-lawyer', 'directory-vendor', 'directory-government', 'directory-other',
            // Credentials Vault
            'credentials',
            // Settings
            'settings', 'settings-users', 'settings-departments', 'settings-system',
        ]
    },
    {
        id: 'csl_staff',
        name: 'CSL Staff',
        description: 'CSL Operational Access',
        allowedMenus: [
            'dashboard',
            'csl-requests',
            'routine', 'routine-rups', 'routine-lkpm', 'routine-tbk', 'routine-offshore', 'routine-admgt', 'routine-task',
            'companies', 'settings-companies',
            // Budget & Expenses
            'budget', 'budget-expense', 'budget-report', 'budget-offshore-invoice',
            'directory', 'directory-all', 'directory-lawyer', 'directory-vendor', 'directory-government', 'directory-other',
            'credentials',
        ]
    },
    {
        id: 'requester',
        name: 'Requester',
        description: 'Request submission and tracking only',
        allowedMenus: [
            'csl-requests',
        ]
    },
];

export const APP_MENU_STRUCTURE = [
    // ── Dashboard ──
    { id: 'dashboard', label: 'Dashboard', iconName: 'LayoutDashboard' },

    // ── Request / Ticketing ──
    { id: 'csl-requests', label: 'Request / Ticketing', iconName: 'Kanban' },

    // ── Routine Activity ──
    { id: 'routine', label: 'Routine Activity', iconName: 'Calendar' },
    { id: 'routine-rups',       label: 'RUPS - AR',          parentId: 'routine', iconName: 'CalendarCheck' },
    { id: 'routine-lkpm',       label: 'Tracking LKPM',      parentId: 'routine', iconName: 'FileCheck' },
    { id: 'routine-tbk',        label: 'TBK',                parentId: 'routine', iconName: 'Landmark' },
    { id: 'routine-offshore',   label: 'Offshore Co',        parentId: 'routine', iconName: 'Globe' },
    { id: 'routine-admgt',      label: 'Ad-MGT',             parentId: 'routine', iconName: 'Layers' },

    // ── Companies & Entities ──
    { id: 'companies', label: 'Companies & Entities', iconName: 'Building2' },

    // ── Budget & Expenses ──
    { id: 'budget', label: 'Budget & Expenses', iconName: 'Wallet' },

    // ── Phone Directory ──
    { id: 'directory', label: 'Phone Directory', iconName: 'Phone' },

    // ── Credentials Vault ──
    { id: 'credentials', label: 'Credentials Vault', iconName: 'Key' },

    // ── Settings ──
    { id: 'settings', label: 'Settings', iconName: 'Settings' },
    { id: 'settings-users',         label: 'User & Roles',         parentId: 'settings', iconName: 'Users' },
    { id: 'settings-departments',   label: 'Departments',          parentId: 'settings', iconName: 'Network' },
    { id: 'settings-notifications', label: 'Notifikasi',           parentId: 'settings', iconName: 'Bell' },
    { id: 'settings-system',        label: 'System Settings',      parentId: 'settings', iconName: 'Cpu' },
];
