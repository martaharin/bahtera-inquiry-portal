"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";

interface RoleItem {
  role_id: string;
  role_name: string;
  total_permissions?: number;
}

interface PermissionItem {
  permission_id: string;
  key: string;
  name: string;
  module: string;
  description: string | null;
}

function formatRoleName(roleName: string) {
  return roleName
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function RoleSettingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { loading: permissionLoading, hasPermission } = usePermissions();

  const canViewRole = hasPermission("role.view");
  const canEditRole = hasPermission("role.edit");

  const roleIdFromUrl = searchParams.get("roleId");

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);

  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(
    new Set()
  );
  const [savedPermissionIds, setSavedPermissionIds] = useState<Set<string>>(
    new Set()
  );

  const [loading, setLoading] = useState(true);
  const [loadingRolePermission, setLoadingRolePermission] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedRole = roles.find((role) => role.role_id === selectedRoleId);

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, PermissionItem[]>>(
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
  }, [permissions]);

  const isDirty = useMemo(() => {
    if (selectedPermissionIds.size !== savedPermissionIds.size) {
      return true;
    }

    for (const permissionId of selectedPermissionIds) {
      if (!savedPermissionIds.has(permissionId)) {
        return true;
      }
    }

    return false;
  }, [selectedPermissionIds, savedPermissionIds]);

  async function fetchInitialData() {
    try {
      setLoading(true);

      const [rolesRes, permissionsRes] = await Promise.all([
        fetch("/api/roles"),
        fetch("/api/permissions"),
      ]);

      const rolesResult = await rolesRes.json();
      const permissionsResult = await permissionsRes.json();

      const roleList: RoleItem[] = rolesResult.success
        ? rolesResult.roles || []
        : [];

      const permissionList: PermissionItem[] = permissionsResult.success
        ? permissionsResult.permissions || []
        : [];

      setRoles(roleList);
      setPermissions(permissionList);

      const firstRoleId = roleList[0]?.role_id || "";

      const urlRoleExists = roleList.some(
        (role) => role.role_id === roleIdFromUrl
      );

      const initialRoleId =
        roleIdFromUrl && urlRoleExists ? roleIdFromUrl : firstRoleId;

      setSelectedRoleId(initialRoleId);

      if (initialRoleId && initialRoleId !== roleIdFromUrl) {
        router.replace(`/admin/role-setting?roleId=${initialRoleId}`);
      }
    } catch (error) {
      console.error("Failed to fetch role setting data:", error);
      setRoles([]);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRolePermissions(roleId: string) {
  if (!roleId) return;

  try {
    setLoadingRolePermission(true);

    const url = `/api/roles/${roleId}/permissions`;

    console.log("FETCH ROLE PERMISSIONS URL:", url);

    const res = await fetch(url);
    const contentType = res.headers.get("content-type");

    if (!contentType?.includes("application/json")) {
      const text = await res.text();
      console.error("ROLE PERMISSIONS NON JSON RESPONSE:", text);
      alert(
        "Role permissions API did not return JSON. Please check the API route path."
      );
      return;
    }

    const result = await res.json();

    if (result.success) {
      const permissionSet = new Set<string>(
        (result.permissionIds || []) as string[]
      );

      setSelectedPermissionIds(permissionSet);
      setSavedPermissionIds(permissionSet);
    } else {
      setSelectedPermissionIds(new Set());
      setSavedPermissionIds(new Set());
    }
  } catch (error) {
    console.error("Failed to fetch role permissions:", error);
    setSelectedPermissionIds(new Set());
    setSavedPermissionIds(new Set());
  } finally {
    setLoadingRolePermission(false);
  }
}

  useEffect(() => {
    if (permissionLoading) return;

    if (!canViewRole) {
      router.replace("/admin/ticket");
      return;
    }

    fetchInitialData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionLoading, canViewRole]);

  useEffect(() => {
    if (!selectedRoleId) return;

    fetchRolePermissions(selectedRoleId);
  }, [selectedRoleId]);

  function handleRoleChange(roleId: string) {
    setSelectedRoleId(roleId);
    setSelectedPermissionIds(new Set());
    setSavedPermissionIds(new Set());
    router.push(`/admin/role-setting?roleId=${roleId}`);
  }

  function handleTogglePermission(permissionId: string) {
    if (!canEditRole) return;

    setSelectedPermissionIds((prev) => {
      const next = new Set(prev);

      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }

      return next;
    });
  }

  function handleCancelChanges() {
    setSelectedPermissionIds(new Set(savedPermissionIds));
  }

  async function handleSave() {
    if (!selectedRoleId) {
      alert("Please select a role first");
      return;
    }

    if (!canEditRole) {
      alert("You do not have permission to edit role access");
      return;
    }

    if (!isDirty) {
      alert("No changes to save");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`/api/roles/${selectedRoleId}/permissions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          permission_ids: Array.from(selectedPermissionIds),
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        alert(result.error || "Failed to update role access");
        return;
      }

      alert("Role access updated successfully");
      await fetchRolePermissions(selectedRoleId);
    } catch (error) {
      console.error("Save role permissions error:", error);
      alert("Failed to update role access");
    } finally {
      setSaving(false);
    }
  }

  if (permissionLoading || loading) {
    return (
      <div className="p-8 text-sm font-medium text-gray-500">
        Loading role setting...
      </div>
    );
  }

  if (!canViewRole) {
    return (
      <div className="p-8 text-sm font-medium text-gray-500">
        Redirecting...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/role-management"
            className="text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-orange-500 transition"
          >
            ← Back
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mt-3">
            Role Setting
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage access permissions for each role.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDirty && (
            <span className="text-xs font-bold text-orange-500">
              Unsaved changes
            </span>
          )}

          <button
            type="button"
            onClick={handleCancelChanges}
            disabled={!isDirty || saving || loadingRolePermission}
            className={`px-4 py-2 rounded-xl text-xs font-black transition ${
              isDirty
                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                : "bg-gray-100 text-gray-300 cursor-not-allowed"
            }`}
          >
            Cancel Changes
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!canEditRole || !isDirty || saving || loadingRolePermission}
            className={`px-5 py-2 rounded-xl text-xs font-black transition ${
              canEditRole && isDirty
                ? "bg-orange-500 text-white hover:bg-orange-600"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            } ${saving ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {saving ? "Saving..." : "Save Access"}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[280px_1fr] md:items-end">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
              Select Role
            </label>

            <select
              value={selectedRoleId}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-800 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              <option value="">Select role</option>

              {roles.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {formatRoleName(role.role_name)}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl bg-orange-50 border border-orange-100 px-4 py-2.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">
              Current Role
            </p>

            <p className="text-sm font-bold text-gray-900 mt-0.5">
              {selectedRole ? formatRoleName(selectedRole.role_name) : "-"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between gap-4">
            <div>
            <h2 className="text-sm font-black text-gray-900">
                Access Permissions
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
                Select which access this role can use.
            </p>
            </div>

            <span className="text-xs font-bold text-gray-500 bg-gray-100 rounded-full px-3 py-1 shrink-0">
            {selectedPermissionIds.size} selected
            </span>
        </div>

        {loadingRolePermission ? (
            <div className="py-16 text-center text-sm text-gray-500">
            Loading permissions...
            </div>
        ) : permissions.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">
            No permissions found.
            </div>
        ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                    <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">
                    Module
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">
                    Access Name
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">
                    Permission Key
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">
                    Description
                    </th>

                    <th className="px-5 py-3 text-center text-xs font-black uppercase tracking-wider text-gray-500">
                    Allow
                    </th>
                </tr>
                </thead>

                <tbody>
                {Object.entries(groupedPermissions).map(
                    ([moduleName, modulePermissions]) => (
                    <React.Fragment key={moduleName}>
                        <tr className="bg-orange-50/40 border-b border-orange-100">
                        <td
                            colSpan={5}
                            className="px-5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-orange-500"
                        >
                            {moduleName}
                        </td>
                        </tr>

                        {modulePermissions.map((permission) => {
                        const checked = selectedPermissionIds.has(
                            permission.permission_id
                        );

                        return (
                            <tr
                            key={permission.permission_id}
                            className={`border-b border-gray-100 last:border-b-0 transition ${
                                checked ? "bg-orange-50/30" : "hover:bg-gray-50"
                            }`}
                            >
                            <td className="px-5 py-3 text-sm font-semibold text-gray-700">
                                {permission.module}
                            </td>

                            <td className="px-5 py-3 text-sm font-bold text-gray-900">
                                {permission.name}
                            </td>

                            <td className="px-5 py-3">
                                <span className="font-mono text-xs text-orange-500">
                                {permission.key}
                                </span>
                            </td>

                            <td className="px-5 py-3 text-xs text-gray-400">
                                {permission.description || "-"}
                            </td>

                            <td className="px-5 py-3 text-center">
                                <input
                                type="checkbox"
                                checked={checked}
                                disabled={!canEditRole}
                                onChange={() =>
                                    handleTogglePermission(permission.permission_id)
                                }
                                className="h-4 w-4 accent-orange-500 cursor-pointer disabled:cursor-not-allowed"
                                />
                            </td>
                            </tr>
                        );
                        })}
                    </React.Fragment>
                    )
                )}
                </tbody>
            </table>
            </div>
        )}
        </div>
    </div>
  );
}

export default function RoleSettingPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm font-medium text-gray-500">
          Loading role setting...
        </div>
      }
    >
      <RoleSettingContent />
    </Suspense>
  );
}