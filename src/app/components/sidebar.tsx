"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { usePermissions } from "@/hooks/usePermissions";

export default function Sidebar() {
  const pathname = usePathname();

  const { loading, hasPermission, hasAnyPermission } = usePermissions();

  const canViewTickets = hasAnyPermission([
    "ticket.view_all",
    "ticket.view_team",
    "ticket.view_own",
  ]);

  const canViewReport = hasPermission("report.view");
  const canViewProfile = hasPermission("profile.view");

  const canViewUserManagement = hasPermission("user.view");
  const canViewBranchIndustry = hasPermission("branch_industry.view");
  
  const canViewRoleManagement =
    hasPermission("role.view") ||
    hasPermission("role.create") ||
    hasPermission("role.edit") ||
    hasPermission("role.delete");

  const canViewRoleSetting = hasPermission("role.edit");

  const canViewUserManagementGroup =
    canViewUserManagement || canViewBranchIndustry ;

  const isTicketsActive = pathname === "/admin/ticket";
  const isReportActive = pathname === "/admin/report";
  const isProfileActive = pathname === "/admin/profile";

  const isUserManagementActive =
    pathname === "/admin/user-management" ||
    pathname === "/admin/branch-industry" ;

  const isBranchIndustryActive = pathname === "/admin/branch-industry";

  const isRoleManagementActive =
    pathname === "/admin/role-management" ||
    pathname === "/admin/role-setting";

  const isRoleSettingActive = pathname === "/admin/role-setting";

  const handleLogout = async () => {
    const confirmLogout = window.confirm(
      "Are you sure you want to sign out?"
    );

    if (!confirmLogout) return;

    await signOut({ callbackUrl: "/auth/login" });
  };

  return (
    <aside className="w-56 lg:w-64 bg-white border-r border-gray-100 flex flex-col h-screen shrink-0 z-30">
      <div className="p-6">
        <div className="w-full h-32 bg-white border border-gray-100 rounded-[24px] shadow-sm flex items-center justify-center p-4">
          <Image
            src="/logo bahtera.png"
            alt="Logo"
            width={180}
            height={60}
            loading="eager"
            className="object-contain"
          />
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {!loading && canViewTickets && (
          <Link href="/admin/ticket">
            <div
              className={`p-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all ${
                isTicketsActive
                  ? "bg-orange-50 text-orange-500 border border-orange-100"
                  : "text-gray-300 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              Tickets
            </div>
          </Link>
        )}

        {!loading && canViewReport && (
          <Link href="/admin/report">
            <div
              className={`p-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all ${
                isReportActive
                  ? "bg-orange-50 text-orange-500 border border-orange-100"
                  : "text-gray-300 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              Report
            </div>
          </Link>
        )}

        {!loading && canViewUserManagementGroup && (
          <div className="space-y-2">
            {canViewUserManagement && (
              <Link href="/admin/user-management">
                <div
                  className={`p-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all ${
                    isUserManagementActive
                      ? "bg-orange-50 text-orange-500 border border-orange-100"
                      : "text-gray-300 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  User Management
                </div>
              </Link>
            )}

            {isUserManagementActive && (
              <div className="ml-4 pl-4 border-l border-orange-100 space-y-2">
                {canViewBranchIndustry && (
                  <Link href="/admin/branch-industry">
                    <div
                      className={`p-3 rounded-xl font-black text-[10px] uppercase tracking-[0.18em] transition-all ${
                        isBranchIndustryActive
                          ? "bg-orange-500 text-white"
                          : "text-gray-400 hover:bg-orange-50 hover:text-orange-500"
                      }`}
                    >
                      Branch & Business Unit
                    </div>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {!loading && canViewRoleManagement && (
          <div className="space-y-2">
            <Link href="/admin/role-management">
              <div
                className={`p-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all ${
                  isRoleManagementActive
                    ? "bg-orange-50 text-orange-500 border border-orange-100"
                    : "text-gray-300 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                Role Management
              </div>
            </Link>

            {isRoleManagementActive && canViewRoleSetting && (
              <div className="ml-4 pl-4 border-l border-orange-100 space-y-2">
                <Link href="/admin/role-setting">
                  <div
                    className={`p-3 rounded-xl font-black text-[10px] uppercase tracking-[0.18em] transition-all ${
                      isRoleSettingActive
                        ? "bg-orange-500 text-white"
                        : "text-gray-400 hover:bg-orange-50 hover:text-orange-500"
                    }`}
                  >
                    Role Setting
                  </div>
                </Link>
              </div>
            )}
          </div>
        )}

        {!loading && canViewProfile && (
          <Link href="/admin/profile">
            <div
              className={`p-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all ${
                isProfileActive
                  ? "bg-orange-50 text-orange-500 border border-orange-100"
                  : "text-gray-300 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              Profile
            </div>
          </Link>
        )}
      </nav>

      <div className="p-8 border-t border-gray-50">
        <div
          onClick={handleLogout}
          className="text-[10px] font-black text-red-400 uppercase tracking-widest cursor-pointer hover:text-red-600 transition-all"
        >
          Log Out
        </div>
      </div>
    </aside>
  );
}