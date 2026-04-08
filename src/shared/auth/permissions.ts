/**
 * Role-based permission mapping for TeklifPro
 *
 * Permission format: "resource.action"
 * Wildcard: "*" = all permissions, "resource.*" = all actions on resource
 *
 * Roles (from UserRole enum in Prisma):
 *   OWNER   - Full access, tenant management
 *   ADMIN   - All except tenant deletion and owner-level settings
 *   USER    - CRUD on proposals, read customers/products, basic operations
 *   VIEWER  - Read-only access + proposal send
 */

export type UserRole = 'OWNER' | 'ADMIN' | 'USER' | 'VIEWER'

/**
 * All permission keys used in the system.
 * When adding a new feature, define the permission key here first.
 */
export const PERMISSIONS = {
  // Proposals
  PROPOSAL_CREATE: 'proposal.create',
  PROPOSAL_READ: 'proposal.read',
  PROPOSAL_UPDATE: 'proposal.update',
  PROPOSAL_DELETE: 'proposal.delete',
  PROPOSAL_SEND: 'proposal.send',
  PROPOSAL_CLONE: 'proposal.clone',

  // Customers
  CUSTOMER_CREATE: 'customer.create',
  CUSTOMER_READ: 'customer.read',
  CUSTOMER_UPDATE: 'customer.update',
  CUSTOMER_DELETE: 'customer.delete',
  CUSTOMER_SYNC: 'customer.sync',

  // Products
  PRODUCT_CREATE: 'product.create',
  PRODUCT_READ: 'product.read',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_DELETE: 'product.delete',
  PRODUCT_SYNC: 'product.sync',

  // BOM (Bill of Materials)
  BOM_CREATE: 'bom.create',
  BOM_READ: 'bom.read',
  BOM_UPDATE: 'bom.update',
  BOM_DELETE: 'bom.delete',

  // Suppliers
  SUPPLIER_CREATE: 'supplier.create',
  SUPPLIER_READ: 'supplier.read',
  SUPPLIER_UPDATE: 'supplier.update',
  SUPPLIER_DELETE: 'supplier.delete',

  // Purchases
  PURCHASE_CREATE: 'purchase.create',
  PURCHASE_READ: 'purchase.read',
  PURCHASE_UPDATE: 'purchase.update',
  PURCHASE_DELETE: 'purchase.delete',

  // Stock
  STOCK_READ: 'stock.read',
  STOCK_CREATE: 'stock.create',
  STOCK_UPDATE: 'stock.update',

  // Settings
  SETTINGS_MANAGE: 'settings.manage',

  // Integrations (Parasut, WhatsApp)
  INTEGRATION_MANAGE: 'integration.manage',
  INTEGRATION_SYNC: 'integration.sync',

  // AI features
  AI_USE: 'ai.use',

  // Audit logs
  AUDIT_READ: 'audit.read',
  AUDIT_WRITE: 'audit.write',

  // Admin
  ADMIN_USERS: 'admin.users',
  ADMIN_BILLING: 'admin.billing',
  ADMIN_ALL: 'admin.*',
} as const

/**
 * Maps each role to its granted permissions.
 * OWNER gets wildcard (*), others get explicit lists.
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  OWNER: ['*'],

  ADMIN: [
    // Proposals - full
    'proposal.*',
    // Customers - full
    'customer.*',
    // Products - full
    'product.*',
    // BOM - full
    'bom.*',
    // Suppliers - full
    'supplier.*',
    // Purchases - full
    'purchase.*',
    // Stock - full
    'stock.*',
    // Settings
    'settings.manage',
    // Integrations
    'integration.manage',
    'integration.sync',
    // AI
    'ai.use',
    // Audit
    'audit.read',
    'audit.write',
  ],

  USER: [
    // Proposals - full CRUD
    'proposal.create',
    'proposal.read',
    'proposal.update',
    'proposal.send',
    'proposal.clone',
    // Customers - read + create
    'customer.read',
    'customer.create',
    'customer.update',
    // Products - read
    'product.read',
    // BOM - read
    'bom.read',
    // Suppliers - read
    'supplier.read',
    // Purchases - read
    'purchase.read',
    // Stock - read
    'stock.read',
    // AI
    'ai.use',
  ],

  VIEWER: [
    // Read-only everywhere
    'proposal.read',
    'proposal.send',
    'customer.read',
    'product.read',
    'bom.read',
    'supplier.read',
    'purchase.read',
    'stock.read',
  ],
}

/**
 * Gets permissions for a given role.
 * Returns empty array for unknown roles.
 */
export function getPermissionsForRole(role: string): string[] {
  return ROLE_PERMISSIONS[role as UserRole] || []
}
