// Available permissions in the system
export const PERMISSIONS = {
  // Inventory permissions
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_EDIT: 'inventory:edit',

  // Invoice permissions
  INVOICE_CREATE: 'invoice:create',
  INVOICE_VIEW: 'invoice:view',

  // Stock count permissions
  STOCK_COUNT_CREATE: 'stock_count:create',
  STOCK_COUNT_PERFORM: 'stock_count:perform',

  // Waste logging
  WASTE_LOG: 'waste:log',

  // Reports
  REPORTS_VIEW: 'reports:view',

  // Admin permissions
  USERS_MANAGE: 'users:manage',
  STORES_MANAGE: 'stores:manage',
  ROLES_MANAGE: 'roles:manage',
  CATEGORIES_MANAGE: 'categories:manage',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Permission groups for UI
export const PERMISSION_GROUPS = [
  {
    name: 'Inventory',
    permissions: [
      { key: PERMISSIONS.INVENTORY_VIEW, label: 'View Inventory', description: 'View stock levels and item details' },
      { key: PERMISSIONS.INVENTORY_EDIT, label: 'Edit Inventory', description: 'Add, edit, and delete inventory items' },
    ],
  },
  {
    name: 'Invoices & Purchases',
    permissions: [
      { key: PERMISSIONS.INVOICE_VIEW, label: 'View Invoices', description: 'View purchase invoices and history' },
      { key: PERMISSIONS.INVOICE_CREATE, label: 'Create/Edit Invoices', description: 'Enter and edit purchase invoices' },
    ],
  },
  {
    name: 'Stock Counting',
    permissions: [
      { key: PERMISSIONS.STOCK_COUNT_CREATE, label: 'Create Stock Count Tasks', description: 'Create and assign stock counting tasks' },
      { key: PERMISSIONS.STOCK_COUNT_PERFORM, label: 'Perform Stock Counts', description: 'Complete assigned stock counting tasks' },
    ],
  },
  {
    name: 'Waste & Loss',
    permissions: [
      { key: PERMISSIONS.WASTE_LOG, label: 'Log Waste/Loss', description: 'Record spoiled, damaged, or wasted items' },
    ],
  },
  {
    name: 'Reports & Analytics',
    permissions: [
      { key: PERMISSIONS.REPORTS_VIEW, label: 'View Reports', description: 'Access financial reports and analytics' },
    ],
  },
  {
    name: 'Administration',
    permissions: [
      { key: PERMISSIONS.CATEGORIES_MANAGE, label: 'Manage Categories', description: 'Create, edit, and delete categories' },
      { key: PERMISSIONS.STORES_MANAGE, label: 'Manage Venues', description: 'Add, edit, and delete venue locations' },
      { key: PERMISSIONS.USERS_MANAGE, label: 'Manage Users', description: 'Invite, edit, and remove team members' },
      { key: PERMISSIONS.ROLES_MANAGE, label: 'Manage Roles', description: 'Create and edit custom roles and permissions' },
    ],
  },
];

// Default role templates
export const DEFAULT_ROLES = {
  OWNER: {
    name: 'Owner',
    permissions: Object.values(PERMISSIONS),
  },
  MANAGER: {
    name: 'Manager',
    permissions: [
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_EDIT,
      PERMISSIONS.INVOICE_VIEW,
      PERMISSIONS.INVOICE_CREATE,
      PERMISSIONS.STOCK_COUNT_CREATE,
      PERMISSIONS.STOCK_COUNT_PERFORM,
      PERMISSIONS.WASTE_LOG,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.CATEGORIES_MANAGE,
    ],
  },
  STAFF: {
    name: 'Staff',
    permissions: [
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.STOCK_COUNT_PERFORM,
      PERMISSIONS.WASTE_LOG,
    ],
  },
};

// Helper function to check if user has permission
export function hasPermission(userPermissions: string[], permission: Permission): boolean {
  return userPermissions.includes(permission);
}

// Helper function to check if user has any of the permissions
export function hasAnyPermission(userPermissions: string[], permissions: Permission[]): boolean {
  return permissions.some(p => userPermissions.includes(p));
}

// Helper function to check if user has all permissions
export function hasAllPermissions(userPermissions: string[], permissions: Permission[]): boolean {
  return permissions.every(p => userPermissions.includes(p));
}
