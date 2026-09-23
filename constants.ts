
export const APP_NAME = 'CSL ERP';

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
            'routine', 'routine-activity', 'routine-task',
            // Budget & Cost
            'budget', 'budget-expense', 'budget-offshore-invoice',
            // Phone Directory
            'directory', 'directory-all', 'directory-lawyer', 'directory-vendor', 'directory-government', 'directory-other',
            // Credentials Vault
            'credentials',
            // Reports
            'reports', 'reports-request', 'reports-task', 'reports-budget',
            // Settings
            'settings', 'settings-users', 'settings-companies', 'settings-departments', 'settings-system',
        ]
    },
    {
        id: 'csl_staff',
        name: 'CSL Staff',
        description: 'CSL Operational Access',
        allowedMenus: [
            'dashboard',
            'csl-requests',
            'routine', 'routine-activity', 'routine-task',
            'budget', 'budget-expense', 'budget-offshore-invoice',
            'directory', 'directory-all', 'directory-lawyer', 'directory-vendor', 'directory-government', 'directory-other',
            'credentials',
            'reports', 'reports-request', 'reports-task', 'reports-budget',
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
    { id: 'routine-task',       label: 'Task',       parentId: 'routine', iconName: 'CheckSquare' },

    // ── Budget & Expenses ──
    { id: 'budget', label: 'Budget & Expenses', iconName: 'Wallet' },

    // ── Phone Directory ──
    { id: 'directory', label: 'Phone Directory', iconName: 'Phone' },

    // ── Credentials Vault ──
    { id: 'credentials', label: 'Credentials Vault', iconName: 'Key' },

    // ── Reports ──
    { id: 'reports', label: 'Reports', iconName: 'BarChart2' },
    { id: 'reports-request', label: 'Request Report', parentId: 'reports', iconName: 'FileBarChart' },
    { id: 'reports-task',    label: 'Task Report',    parentId: 'reports', iconName: 'CheckSquare' },
    { id: 'reports-budget',  label: 'Budget Report',  parentId: 'reports', iconName: 'Wallet' },

    // ── Settings ──
    { id: 'settings', label: 'Settings', iconName: 'Settings' },
    { id: 'settings-users',         label: 'User & Roles',         parentId: 'settings', iconName: 'Users' },
    { id: 'settings-companies',     label: 'Companies',            parentId: 'settings', iconName: 'Building2' },
    { id: 'settings-departments',   label: 'Departments',          parentId: 'settings', iconName: 'Network' },
    { id: 'settings-system',        label: 'System Settings',      parentId: 'settings', iconName: 'Cpu' },
];
