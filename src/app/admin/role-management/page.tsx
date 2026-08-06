"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";

interface RoleItem {
  role_id: string;
  role_name: string;
  total_permissions: number;
}

function formatRoleName(roleName: string) {
  return roleName
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function RoleManagementPage() {
  const router = useRouter();

  const { loading: permissionLoading, hasPermission } = usePermissions();

  const canViewRole = hasPermission("role.view");
  const canCreateRole = hasPermission("role.create");
  const canEditRole = hasPermission("role.edit");
  const canDeleteRole = hasPermission("role.delete");

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  async function fetchRoles() {
    try {
      setLoading(true);

      const res = await fetch("/api/roles");
      const result = await res.json();

      if (result.success) {
        setRoles(result.roles || []);
      } else {
        setRoles([]);
      }
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (permissionLoading) return;

    if (!canViewRole) {
      router.replace("/admin/ticket");
      return;
    }

    fetchRoles();
  }, [permissionLoading, canViewRole, router]);

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();

    if (!canCreateRole) {
      alert("You do not have permission to create a role");
      return;
    }

    if (!newRoleName.trim()) {
      alert("Role name is required");
      return;
    }

    try {
      setIsCreating(true);

      const res = await fetch("/api/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role_name: newRoleName,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        alert(result.error || "Failed to create role");
        return;
      }

      setNewRoleName("");
      setShowCreateForm(false);
      await fetchRoles();
    } catch (error) {
      console.error("Create role error:", error);
      alert("Failed to create role");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteRole(roleId: string, roleName: string) {
    const confirmDelete = window.confirm(
        `Are you sure you want to delete the role "${formatRoleName(roleName)}"?`
    );

    if (!confirmDelete) return;

    try {
        const res = await fetch(`/api/roles/${roleId}`, {
        method: "DELETE",
        });

        const contentType = res.headers.get("content-type");

        let result: any = {};

        if (contentType?.includes("application/json")) {
        result = await res.json();
        } else {
        const text = await res.text();
        console.error("DELETE ROLE NON JSON RESPONSE:", text);
        alert("Delete role API did not return JSON. Please check the route path.");
        return;
        }

        console.log("DELETE ROLE RESPONSE:", result);

        if (!res.ok || !result.success) {
        alert(result.error || result.message || "Failed to delete role");
        return;
        }

        alert("Role deleted successfully");
        await fetchRoles();
    } catch (error) {
        console.error("Delete role error:", error);
        alert("Failed to delete role");
    }
    }

  if (permissionLoading || loading) {
    return (
      <div className="p-8 text-sm font-medium text-gray-500">
        Loading roles...
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Role Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage system roles and access setup.
          </p>
        </div>

        {canCreateRole && (
          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="px-5 py-3 rounded-xl bg-orange-500 text-white text-xs font-black hover:bg-orange-600 transition"
          >
            Create New Role
          </button>
        )}
      </div>

      {showCreateForm && canCreateRole && (
        <form
          onSubmit={handleCreateRole}
          className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder="e.g. marketing staff"
            className="h-11 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          />

          <button
            type="submit"
            disabled={isCreating}
            className="h-11 px-5 rounded-xl bg-orange-500 text-white text-xs font-black hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isCreating ? "Creating..." : "Save"}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowCreateForm(false);
              setNewRoleName("");
            }}
            className="h-11 px-5 rounded-xl bg-gray-100 text-gray-600 text-xs font-black hover:bg-gray-200 transition"
          >
            Cancel
          </button>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mt-2">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">
                Role Name
              </th>
              <th className="px-5 py-3 text-center text-xs font-black uppercase tracking-wider text-gray-500">
                Total Access
              </th>
              <th className="px-5 py-3 text-center text-xs font-black uppercase tracking-wider text-gray-500">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {roles.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="py-12 text-center text-sm text-gray-500"
                >
                  No roles found.
                </td>
              </tr>
            ) : (
              roles.map((role) => (
                <tr
                  key={role.role_id}
                  className="border-b border-gray-100 last:border-b-0 hover:bg-orange-50 transition"
                >
                  <td className="px-5 py-4 font-bold text-gray-900">
                    {formatRoleName(role.role_name)}
                  </td>

                  <td className="px-5 py-4 text-center text-gray-700">
                    <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                      {role.total_permissions} permissions
                    </span>
                  </td>

                  <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-4">
                            {canEditRole ? (
                            <Link href={`/admin/role-setting?roleId=${role.role_id}`}>
                                <button className="text-orange-500 hover:text-orange-700 text-sm font-bold">
                                Manage Access
                                </button>
                            </Link>
                            ) : (
                            <span className="text-gray-300 text-sm font-bold">
                                View Only
                            </span>
                            )}

                            {canDeleteRole && role.role_name.toLowerCase().trim() !== "admin" && (
                            <button
                                type="button"
                                onClick={() => handleDeleteRole(role.role_id, role.role_name)}
                                className="text-red-500 hover:text-red-700 text-sm font-bold"
                            >
                                Delete
                            </button>
                            )}
                        </div>
                    </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}