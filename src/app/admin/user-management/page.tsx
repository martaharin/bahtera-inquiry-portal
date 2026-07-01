"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface UserItem {
  user_id: string;
  user_name: string;
  user_email: string;
  role_name: string;
  industry: string | null;
  branch: string | null;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/user-management");
      const result = await res.json();

      if (result.success) {
        const rawUsers = result.users || [];

        const uniqueUsers = rawUsers.filter(
          (user: UserItem, index: number, self: UserItem[]) =>
            index === self.findIndex((u) => u.user_id === user.user_id)
        );

        setUsers(uniqueUsers);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (userId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this user?"
    );

    if (!confirmDelete) return;

    try {
      const res = await fetch("/api/user-management/" + userId, {
        method: "DELETE",
      });

      const result = await res.json();

      if (result.success) {
        alert("User deleted successfully");
        fetchUsers();
      } else {
        alert(result.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete user.");
    }
  };

  const getRoleBadgeClass = (roleName?: string | null) => {
    const cleanRole = (roleName || "").toLowerCase().trim();

    if (cleanRole === "admin") {
      return "text-gray-700";
    }

    if (cleanRole === "head sales") {
      return " text-gray-700";
    }

    if (cleanRole === "sales staff" || cleanRole === "sales") {
      return " text-gray-700";
    }

    return " text-gray-700";
  };

  return (
    <div className="space-y-4 pb-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            User Management
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage all system users
          </p>
        </div>

        <Link href="/admin/user-management/create-account">
          <button className="px-4 py-2 bg-orange-500 text-white hover:bg-orange-600 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer">
            Create Account
          </button>
        </Link>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-500">
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            No users found.
          </div>
        ) : (
          <table className="w-full table-fixed text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">
                  Username
                </th>

                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">
                  Email
                </th>

                <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-gray-500">
                  Role
                </th>

                <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-gray-500">
                  Industry
                </th>

                <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-gray-500">
                  Branch
                </th>

                <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr
                  key={user.user_id}
                  className="h-10 border-b border-gray-100 last:border-b-0 hover:bg-orange-50 transition"
                >
                  {/* USERNAME */}
                  <td className="px-3 py-1.5">
                    <p className="text-[13px] font-medium text-gray-900 truncate">
                      {user.user_name || "-"}
                    </p>
                  </td>

                  {/* EMAIL */}
                  <td className="px-3 py-1.5">
                    <p className="text-[13px] text-gray-500 truncate">
                      {user.user_email || "-"}
                    </p>
                  </td>

                  {/* ROLE */}
                  <td className="px-3 py-1.5 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(
                        user.role_name
                      )}`}
                    >
                      {user.role_name || "-"}
                    </span>
                  </td>

                  {/* INDUSTRY */}
                  <td className="px-3 py-1.5 text-center">
                    <span className="text-[13px] text-gray-600">
                      {user.industry || "-"}
                    </span>
                  </td>

                  {/* BRANCH */}
                  <td className="px-3 py-1.5 text-center">
                    <span className="text-[13px] text-gray-600">
                      {user.branch || "-"}
                    </span>
                  </td>

                  {/* ACTION */}
                  <td className="px-3 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-4">
                      <Link href={`/admin/user-management/${user.user_id}/edit`}>
                        <button className="text-orange-500 hover:text-orange-700 font-medium text-[13px] cursor-pointer">
                          Edit
                        </button>
                      </Link>

                      <button
                        onClick={() => handleDelete(user.user_id)}
                        className="text-red-500 hover:text-red-700 font-medium text-[13px] cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
