import { db } from "@/lib/db";

export interface PermissionRow {
  permission_id: string;
  key: string;
  name: string;
  module: string;
  description?: string | null;
}

export type PermissionKey = string;

function normalizeText(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

export function hasPermission(
  permissions: PermissionKey[] = [],
  permissionKey: PermissionKey
) {
  const normalizedPermissionKey = normalizeText(permissionKey);

  return permissions.some(
    (permission) => normalizeText(permission) === normalizedPermissionKey
  );
}

export function hasAnyPermission(
  permissions: PermissionKey[] = [],
  permissionKeys: PermissionKey[] = []
) {
  return permissionKeys.some((permissionKey) =>
    hasPermission(permissions, permissionKey)
  );
}

export function hasAllPermissions(
  permissions: PermissionKey[] = [],
  permissionKeys: PermissionKey[] = []
) {
  return permissionKeys.every((permissionKey) =>
    hasPermission(permissions, permissionKey)
  );
}

// Ambil full permission rows berdasarkan role_id
export async function getPermissionsByRoleId(roleId: string) {
  if (!roleId) return [];

  const result = await db.query(
    `
    SELECT
      p.permission_id,
      p."key",
      p.name,
      p.module,
      p.description
    FROM public.role_permissions rp
    INNER JOIN public.permissions p
      ON rp.permission_id = p.permission_id
    WHERE rp.role_id = $1
    ORDER BY p.module ASC, p.name ASC
    `,
    [roleId]
  );

  return result.rows as PermissionRow[];
}

// Ambil permission key saja berdasarkan role_id
export async function getPermissionKeysByRoleId(roleId: string) {
  const permissions = await getPermissionsByRoleId(roleId);

  return permissions.map((permission) => permission.key);
}

// Ambil full permission rows berdasarkan role_name
export async function getPermissionsByRoleName(roleName: string) {
  if (!roleName) return [];

  const result = await db.query(
    `
    SELECT
      p.permission_id,
      p."key",
      p.name,
      p.module,
      p.description
    FROM public."role" r
    INNER JOIN public.role_permissions rp
      ON r.role_id = rp.role_id
    INNER JOIN public.permissions p
      ON rp.permission_id = p.permission_id
    WHERE LOWER(TRIM(r.role_name)) = LOWER(TRIM($1::text))
    ORDER BY p.module ASC, p.name ASC
    `,
    [roleName]
  );

  return result.rows as PermissionRow[];
}

// Ambil permission key saja berdasarkan role_name
export async function getPermissionKeysByRoleName(roleName: string) {
  const permissions = await getPermissionsByRoleName(roleName);

  return permissions.map((permission) => permission.key);
}

// Ambil full permission rows berdasarkan user_id
// Assumption: public."users" punya column role_id
export async function getPermissionsByUserId(userId: string) {
  if (!userId) return [];

  const result = await db.query(
    `
    SELECT
      p.permission_id,
      p."key",
      p.name,
      p.module,
      p.description
    FROM public."users" u
    INNER JOIN public."role" r
      ON u.role_id = r.role_id
    INNER JOIN public.role_permissions rp
      ON r.role_id = rp.role_id
    INNER JOIN public.permissions p
      ON rp.permission_id = p.permission_id
    WHERE u.user_id = $1
    ORDER BY p.module ASC, p.name ASC
    `,
    [userId]
  );

  return result.rows as PermissionRow[];
}

// Ambil permission key saja berdasarkan user_id
export async function getPermissionKeysByUserId(userId: string) {
  const permissions = await getPermissionsByUserId(userId);

  return permissions.map((permission) => permission.key);
}

// Helper untuk session user
// Bisa dipakai di API route yang punya session.user
export async function getPermissionKeysBySessionUser(user: {
  user_id?: string | null;
  role_id?: string | null;
  role_name?: string | null;
}) {
  if (user.user_id) {
    const permissions = await getPermissionKeysByUserId(user.user_id);

    if (permissions.length > 0) {
      return permissions;
    }
  }

  if (user.role_id) {
    const permissions = await getPermissionKeysByRoleId(user.role_id);

    if (permissions.length > 0) {
      return permissions;
    }
  }

  if (user.role_name) {
    const permissions = await getPermissionKeysByRoleName(user.role_name);

    if (permissions.length > 0) {
      return permissions;
    }
  }

  return [];
}

// Buat grouping permission untuk Role Setting page nanti
export function groupPermissionsByModule(permissions: PermissionRow[]) {
  return permissions.reduce<Record<string, PermissionRow[]>>(
    (grouped, permission) => {
      const moduleName = permission.module || "Other";

      if (!grouped[moduleName]) {
        grouped[moduleName] = [];
      }

      grouped[moduleName].push(permission);

      return grouped;
    },
    {}
  );
}

export async function getPermissionsBySessionUser(user: {
  user_id?: string | null;
  role_id?: string | null;
  role_name?: string | null;
}) {
  if (user.user_id) {
    return getPermissionsByUserId(user.user_id);
  }

  if (user.role_id) {
    return getPermissionsByRoleId(user.role_id);
  }

  if (user.role_name) {
    return getPermissionsByRoleName(user.role_name);
  }

  return [];
}