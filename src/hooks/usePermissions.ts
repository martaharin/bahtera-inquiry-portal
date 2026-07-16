"use client";

import { useEffect, useState } from "react";

export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [permissionDetails, setPermissionDetails] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      try {
        const res = await fetch("/api/me/permissions");
        const result = await res.json();

        if (result.success) {
          setPermissions(result.permissions || []);
          setPermissionDetails(result.permissionDetails || []);
        } else {
          setPermissions([]);
          setPermissionDetails([]);
        }
      } catch (error) {
        console.error("Failed to fetch permissions:", error);
        setPermissions([]);
        setPermissionDetails([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPermissions();
  }, []);

  const hasPermission = (permissionKey: string) => {
    return permissions.includes(permissionKey);
  };

  const hasAnyPermission = (permissionKeys: string[]) => {
    return permissionKeys.some((permissionKey) =>
      permissions.includes(permissionKey)
    );
  };

  const hasAllPermissions = (permissionKeys: string[]) => {
    return permissionKeys.every((permissionKey) =>
      permissions.includes(permissionKey)
    );
  };

  return {
    permissions,
    permissionDetails,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}