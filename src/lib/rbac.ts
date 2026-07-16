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

export function isSalesManager(user: PermissionUser) {
  return normalizeRole(user.role_name) === "sales manager";
}

export function isSalesStaff(user: PermissionUser) {
  const role = normalizeRole(user.role_name);

  return role === "sales staff" || role === "sales";
}

export function isProductTeam(user: PermissionUser) {
  const role = normalizeRole(user.role_name);

  return role === "product team" || role === "product";
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
    isSalesManager(user) &&
    user.industry === assignedIndustry &&
    user.branch === assignedBranch
  ) {
    return true;
  }

  if (
    (isSalesStaff(user) || isProductTeam(user)) &&
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
    (isSalesStaff(user) || isProductTeam(user)) &&
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
  return isAdmin(user);
}

export function canCreateTicket(user: PermissionUser) {
  return isAdmin(user) || isSalesStaff(user) || isProductTeam(user);
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