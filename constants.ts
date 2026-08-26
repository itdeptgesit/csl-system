
export const APP_NAME = 'CSL ERP';

export const CURRENT_USER_GROUPS = ['admin'];

export const MOCK_GROUPS = [
    {
        id: 'admin',
        name: 'Administrator',
        description: 'Full Access',
        allowedMenus: [
            'dashboard',
            // Request / Ticketing
            'csl-requests', 'csl-all-requests', 'csl-my-requests',
            // Routine
            'routine', 'routine-activity', 'routine-timeline', 'routine-monitoring',
            // Documents
            'documents', 'documents-all', 'documents-agreement', 'documents-legal', 'documents-gdrive',
            // Budget & Cost
            'budget', 'budget-plan', 'budget-request', 'budget-expense', 'budget-monitoring',
            // Phone Directory
            'directory', 'directory-all', 'directory-lawyer', 'directory-vendor', 'directory-government', 'directory-other',
            // Reports
            'reports', 'reports-request', 'reports-sla', 'reports-routine', 'reports-budget', 'reports-performance',
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
            'csl-requests', 'csl-all-requests', 'csl-my-requests',
            'routine', 'routine-activity', 'routine-timeline', 'routine-monitoring',
            'documents', 'documents-all', 'documents-agreement', 'documents-legal', 'documents-gdrive',
            'budget', 'budget-plan', 'budget-request', 'budget-expense', 'budget-monitoring',
            'directory', 'directory-all', 'directory-lawyer', 'directory-vendor', 'directory-government', 'directory-other',
            'reports', 'reports-request', 'reports-sla', 'reports-routine', 'reports-budget', 'reports-performance',
        ]
    },
    {
        id: 'requester',
        name: 'Requester',
        description: 'Request submission and tracking only',
        allowedMenus: [
            'csl-requests', 'csl-my-requests',
        ]
    },
];

export const APP_MENU_STRUCTURE = [
    // ── Dashboard ──
    { id: 'dashboard', label: 'Dashboard', iconName: 'LayoutDashboard' },

    // ── Request / Ticketing ──
    { id: 'csl-requests', label: 'Request / Ticketing', iconName: 'Kanban' },
    { id: 'csl-all-requests',   label: 'All Requests',    parentId: 'csl-requests', iconName: 'Layers' },
    { id: 'csl-my-requests',    label: 'My Requests',     parentId: 'csl-requests', iconName: 'User' },


    // ── Routine Activity ──
    { id: 'routine', label: 'Routine Activity', iconName: 'Calendar' },
    { id: 'routine-activity',   label: 'Activity',   parentId: 'routine', iconName: 'Activity' },
    { id: 'routine-timeline',   label: 'Timeline',   parentId: 'routine', iconName: 'GitBranch' },
    { id: 'routine-monitoring', label: 'Monitoring', parentId: 'routine', iconName: 'Monitor' },

    // ── Documents ──
    { id: 'documents', label: 'Documents', iconName: 'FolderOpen' },
    { id: 'documents-all',       label: 'All Documents',   parentId: 'documents', iconName: 'Files' },
    { id: 'documents-agreement', label: 'Agreement',       parentId: 'documents', iconName: 'FileCheck' },
    { id: 'documents-legal',     label: 'Legal Documents', parentId: 'documents', iconName: 'Scale' },
    { id: 'documents-gdrive',    label: 'Google Drive',    parentId: 'documents', iconName: 'Cloud' },

    // ── Budget & Cost ──
    { id: 'budget', label: 'Budget & Cost', iconName: 'Wallet' },
    { id: 'budget-plan',       label: 'Budget Plan',    parentId: 'budget', iconName: 'PieChart' },
    { id: 'budget-request',    label: 'Budget Request', parentId: 'budget', iconName: 'ClipboardList' },
    { id: 'budget-expense',    label: 'Cost / Expense', parentId: 'budget', iconName: 'Receipt' },
    { id: 'budget-monitoring', label: 'Monitoring',     parentId: 'budget', iconName: 'BarChart2' },

    // ── Phone Directory ──
    { id: 'directory', label: 'Phone Directory', iconName: 'Phone' },
    { id: 'directory-all',        label: 'All Contacts', parentId: 'directory', iconName: 'BookUser' },
    { id: 'directory-lawyer',     label: 'Lawyer',       parentId: 'directory', iconName: 'Scale' },
    { id: 'directory-vendor',     label: 'Vendor',       parentId: 'directory', iconName: 'Store' },
    { id: 'directory-government', label: 'Government',   parentId: 'directory', iconName: 'Landmark' },
    { id: 'directory-other',      label: 'Other',        parentId: 'directory', iconName: 'MoreHorizontal' },

    // ── Reports ──
    { id: 'reports', label: 'Reports', iconName: 'BarChart2' },
    { id: 'reports-request',     label: 'Request Report',     parentId: 'reports', iconName: 'FileBarChart' },
    { id: 'reports-sla',         label: 'SLA Report',         parentId: 'reports', iconName: 'Timer' },
    { id: 'reports-routine',     label: 'Routine Report',     parentId: 'reports', iconName: 'CalendarCheck' },
    { id: 'reports-budget',      label: 'Budget Report',      parentId: 'reports', iconName: 'Coins' },
    { id: 'reports-performance', label: 'Performance Report', parentId: 'reports', iconName: 'TrendingUp' },

    // ── Settings ──
    { id: 'settings', label: 'Settings', iconName: 'Settings' },
    { id: 'settings-users',         label: 'User & Roles',         parentId: 'settings', iconName: 'Users' },
    { id: 'settings-companies',     label: 'Companies',            parentId: 'settings', iconName: 'Building2' },
    { id: 'settings-departments',   label: 'Departments',          parentId: 'settings', iconName: 'Network' },
    { id: 'settings-system',        label: 'System Settings',      parentId: 'settings', iconName: 'Cpu' },
];
