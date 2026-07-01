export interface PermissionUser {
  user_id: string;
  role_name: string;
  industry?: string;
  branch?: string;
}

function normalizeRole(role?: string) {
  return (role || "").trim().toLowerCase();
}

// ===============================
// ROLE CHECK
// ===============================

export function isAdmin(user: PermissionUser) {
  return normalizeRole(user.role_name) === "admin";
}

export function isHeadSales(user: PermissionUser) {
  return normalizeRole(user.role_name) === "head sales";
}

export function isSalesStaff(user: PermissionUser) {
  const role = normalizeRole(user.role_name);

  return role === "sales staff" || role === "sales";
}

// ===============================
// PERMISSION CHECK
// ===============================

export function canViewTicket(
  user: PermissionUser,
  assignedUserId?: string | null,
  assignedIndustry?: string,
  assignedBranch?: string
) {
  if (isAdmin(user)) {
    return true;
  }

  if (
    isHeadSales(user) &&
    user.industry === assignedIndustry &&
    user.branch === assignedBranch
  ) {
    return true;
  }

  if (
    isSalesStaff(user) &&
    user.user_id === assignedUserId
  ) {
    return true;
  }

  return false;
}

export function canEditTicket(
  user: PermissionUser,
  assignedUserId?: string | null
) {
  if (isAdmin(user)) return true;

  if (
    isSalesStaff(user) &&
    assignedUserId === user.user_id
  ) {
    return true;
  }

  return false;
}

export function canDeleteTicket(user: PermissionUser) {
  return isAdmin(user);
}

export function canAssignTicket(user: PermissionUser) {
  return isAdmin(user) || isHeadSales(user);
}

export function canCreateTicket(user: PermissionUser) {
  return isAdmin(user) || isSalesStaff(user);
}

export function canConvertERP(
  user: PermissionUser,
  assignedUserId?: string | null
) {
  return (
    isSalesStaff(user) &&
    assignedUserId === user.user_id
  );
}

export function canManageUsers(user: PermissionUser) {
  return isAdmin(user);
}