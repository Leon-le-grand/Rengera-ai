/**
 * Capability names are supplied by the server capability snapshot. They are
 * presentation hints only; every request is checked again by the API.
 *
 * These are the server-owned permission names from
 * `server/app/authorization/permissions.py`. A role never authorizes itself in
 * the client: the UI only hides routes the server would reject anyway.
 */
export const CAPABILITIES = {
  lawRead: 'law.read',
  lawDraft: 'law.draft',
  lawPublish: 'law.publish',
  staffManage: 'staff.manage',
  workflowManage: 'workflow.manage',
  analyticsRead: 'analytics.read',
} as const;

export const STAFF_WORKSPACE_PERMISSIONS = [
  CAPABILITIES.lawDraft,
  CAPABILITIES.lawPublish,
  CAPABILITIES.staffManage,
  CAPABILITIES.workflowManage,
  CAPABILITIES.analyticsRead,
] as const;

export const ADMIN_WORKSPACE_PERMISSIONS = [
  CAPABILITIES.lawPublish,
  CAPABILITIES.staffManage,
  CAPABILITIES.workflowManage,
] as const;

export function hasCapability(
  capabilities: readonly string[],
  permission: string,
): boolean {
  return capabilities.includes(permission);
}

export function hasAnyCapability(
  capabilities: readonly string[],
  permissions: readonly string[],
): boolean {
  return permissions.some((permission) => capabilities.includes(permission));
}

export function canAccessStaffWorkspace(
  capabilities: readonly string[],
): boolean {
  return hasAnyCapability(capabilities, STAFF_WORKSPACE_PERMISSIONS);
}

export function canAccessAdminWorkspace(
  capabilities: readonly string[],
): boolean {
  return hasAnyCapability(capabilities, ADMIN_WORKSPACE_PERMISSIONS);
}
