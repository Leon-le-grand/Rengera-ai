import { describe, expect, it } from 'vitest';

import {
  canAccessAdminWorkspace,
  canAccessStaffWorkspace,
  CAPABILITIES,
} from './capabilities';

describe('workspace capabilities', () => {
  it('uses the server-owned permission names', () => {
    expect(CAPABILITIES.lawDraft).toBe('law.draft');
    expect(CAPABILITIES.lawPublish).toBe('law.publish');
    expect(CAPABILITIES.staffManage).toBe('staff.manage');
  });

  it('lets staff into the staff workspace but not the admin workspace', () => {
    const staff = [CAPABILITIES.lawRead, CAPABILITIES.lawDraft];

    expect(canAccessStaffWorkspace(staff)).toBe(true);
    expect(canAccessAdminWorkspace(staff)).toBe(false);
  });

  it('lets admins into both workspaces', () => {
    const admin = [
      CAPABILITIES.lawPublish,
      CAPABILITIES.staffManage,
      CAPABILITIES.workflowManage,
    ];

    expect(canAccessStaffWorkspace(admin)).toBe(true);
    expect(canAccessAdminWorkspace(admin)).toBe(true);
  });

  it('denies unknown or empty capability snapshots', () => {
    expect(canAccessStaffWorkspace([])).toBe(false);
    expect(canAccessAdminWorkspace(['staff.access', 'admin.access'])).toBe(false);
  });
});
