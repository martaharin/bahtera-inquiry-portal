"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation"
import { usePermissions } from "@/hooks/usePermissions";


interface UserStat {
  user_id: string;
  user_name: string;
  assigned_tickets_count: number;
  new_tickets_count: number;
  in_progress_tickets_count: number;
}

interface SalesUser {
  user_id: string;
  user_name: string;
}

interface TicketListItem {
  ticket_id: string;
  status: number;
  assigned_user_id: string | null;
  converted_to_erp: boolean | null;
  created_at: string;
  inquiry_id: string;
  name: string;
  email: string;
  company: string | null;
  location: string | null;
  industry: string | null;
  reason_for_inquiry: string;
  product_inquiry: string;
  consent_to_contact: boolean;
  assigned_to: string | null;
  type: string | null;
}

interface TicketFilters {
  type: string;
  consent: string;
  status: string;
  assigned_to: string;
  converted_to_erp: string;
  start_date: string;
  end_date: string;
}

const EMPTY_FILTERS: TicketFilters = {
  type: "",
  consent: "",
  status: "",
  assigned_to: "",
  converted_to_erp: "",
  start_date: "",
  end_date: "",
};

export default function TicketPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { loading: permissionLoading, hasPermission } = usePermissions();

  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [stats, setStats] = useState<UserStat[]>([]);
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showStatsPanel, setShowStatsPanel] = useState(false);

  const [filters, setFilters] = useState<TicketFilters>(EMPTY_FILTERS);

  const [sortConfig, setSortConfig] = useState<{
    key: keyof TicketListItem | "";
    direction: "asc" | "desc";
  }>({
    key: "",
    direction: "asc",
  });

  const roleName = session?.user.role_name ?? "";
  const industry = session?.user.industry ?? "";
  const branch = session?.user.branch ?? "";

  const canViewAllTickets = hasPermission("ticket.view_all");
  const canViewTeamTickets = hasPermission("ticket.view_team");
  const canViewOwnTickets = hasPermission("ticket.view_own");
  const canCreateTicket = hasPermission("ticket.create");

  const fetchTickets = useCallback(async (currentFilters: TicketFilters) => {
    try {
      setIsLoading(true);

      const queryParams = new URLSearchParams();

      if (currentFilters.consent) {
        queryParams.append("consent", currentFilters.consent);
      }

      if (currentFilters.status) {
        queryParams.append("status", currentFilters.status);
      }

      if (currentFilters.converted_to_erp) {
        queryParams.append("converted_to_erp", currentFilters.converted_to_erp);
      }

      if (currentFilters.assigned_to) {
        queryParams.append("assigned_to", currentFilters.assigned_to);
      }

      if (currentFilters.start_date) {
        queryParams.append("start_date", currentFilters.start_date);
      }

      if (currentFilters.end_date) {
        queryParams.append("end_date", currentFilters.end_date);
      }

      const res = await fetch(`/api/ticket?${queryParams.toString()}`);
      const result = await res.json();

      if (result.success) {
        setTickets(result.tickets || []);
        setStats(result.stats || []);
        setSalesUsers(result.salesUsers || []);
      } else {
        setTickets([]);
        setStats([]);
        setSalesUsers([]);
      }
    } catch (error) {
      console.error("Gagal mengambil data tiket:", error);
      setTickets([]);
      setStats([]);
      setSalesUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || permissionLoading) return;

    let defaultFilters: TicketFilters = {
      ...EMPTY_FILTERS,
    };

    if (canViewAllTickets) {
      defaultFilters = {
        ...defaultFilters,
        consent: "true",
        assigned_to: "null",
      };
    }

    if (!canViewAllTickets && !canViewTeamTickets && canViewOwnTickets) {
      defaultFilters = {
        ...defaultFilters,
        status: "1",
        converted_to_erp: "false",
      };
    }

    setFilters(defaultFilters);
    fetchTickets(defaultFilters);
  }, [
    status,
    permissionLoading,
    canViewAllTickets,
    canViewTeamTickets,
    canViewOwnTickets,
    fetchTickets,
  ]);

  const handleStatsFilter = (userId: string, ticketStatus: "1" | "2") => {
    const nextFilters: TicketFilters = {
      ...EMPTY_FILTERS,
      status: ticketStatus,
      assigned_to: userId,
    };

    setFilters(nextFilters);
    fetchTickets(nextFilters);
  };

  const handleSort = (key: keyof TicketListItem) => {
    let direction: "asc" | "desc" = "asc";

    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({ key, direction });

    const sorted = [...tickets].sort((a, b) => {
      const aValue = a[key] ?? "";
      const bValue = b[key] ?? "";

      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });

    setTickets(sorted);
  };

  const getSortIcon = (key: keyof TicketListItem) => {
    if (sortConfig.key !== key) {
      return "fa-solid fa-sort text-gray-300 text-[10px]";
    }

    return sortConfig.direction === "asc"
      ? "fa-solid fa-sort-up text-orange-500 text-[10px]"
      : "fa-solid fa-sort-down text-orange-500 text-[10px]";
  };

  if (status === "loading" || permissionLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm font-medium text-gray-500">Checking access...</p>
      </div>
    );
  }

  if (!canViewAllTickets && !canViewTeamTickets && !canViewOwnTickets) {
    return null;
  }

  return (
    <div className="space-y-4 pb-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Ticket Management
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Logged in as:
            <span className="text-orange-500 font-bold">
              {" "}
              {roleName}
            </span>
            {branch && ` (${industry} - ${branch})`}
          </p>
        </div>

        {canCreateTicket ? (
          <Link href="/admin/ticket/new">
            <button className="px-4 py-2 bg-orange-500 text-white hover:bg-orange-600 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer">
              New Ticket
            </button>
          </Link>
        ) : (
          <button
            disabled
            className="px-4 py-2 bg-gray-200 text-gray-400 rounded-xl font-bold text-xs opacity-50 cursor-not-allowed pointer-events-none"
          >
            New Ticket
          </button>
        )}
      </div>

      {/* SALES STAFF STATS */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowStatsPanel(!showStatsPanel)}
          className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition"
        >
          <div className="text-left">
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Staff Summary
            </h2>

            <p className="text-xs text-gray-400 mt-0.5">
              {stats.length} staff
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-500">
              Assigned Ticket • New • In Progress
            </span>

            <span className="text-orange-500 text-xs font-semibold">
              {showStatsPanel ? "Hide" : "Show"}
            </span>
          </div>
        </button>

        {showStatsPanel && (
          <div className="border-t border-gray-100 max-h-[240px] overflow-y-auto">
            <table className="w-full table-fixed text-[13px]">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-1.5 text-left text-[11px] font-semibold uppercase text-gray-500">
                    Sales Staff
                  </th>

                  <th className="px-3 py-1.5 text-center text-xs font-semibold uppercase text-gray-500">
                    Assigned Ticket
                  </th>

                  <th className="px-3 py-1.5 text-center text-xs font-semibold uppercase text-gray-500">
                    New
                  </th>

                  <th className="px-3 py-1.5 text-center text-xs font-semibold uppercase text-gray-500">
                    In Progress
                  </th>
                </tr>
              </thead>

              <tbody>
                {stats.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-6 text-center text-sm text-gray-500"
                    >
                      No sales staff stats found.
                    </td>
                  </tr>
                ) : (
                  stats.map((userStat) => (
                    <tr
                      key={userStat.user_id}
                      className="h-6 border-b border-gray-100 last:border-b-0 hover:bg-orange-50 transition"
                    >
                      <td className="px-3 py-1">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">
                          {userStat.user_name}
                        </p>
                      </td>

                      <td className="px-3 py-1 text-center">
                        <span className="text-[13px] font-bold text-gray-900">
                          {userStat.assigned_tickets_count}
                        </span>
                      </td>

                      <td className="px-3 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleStatsFilter(userStat.user_id, "1")}
                          className="inline-flex min-w-[32px] justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-200 transition cursor-pointer"
                        >
                          {userStat.new_tickets_count}
                        </button>
                      </td>

                      <td className="px-3 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleStatsFilter(userStat.user_id, "2")}
                          className="inline-flex min-w-[32px] justify-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 hover:bg-amber-200 transition cursor-pointer"
                        >
                          {userStat.in_progress_tickets_count}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FILTER */}
      <div className="bg-white border border-gray-200 rounded-xl px-3 py-2">
        <div className="flex flex-wrap items-end gap-2">

          {/* CONSENT */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-gray-500">
              Consent
            </label>
            <select
              value={filters.consent}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  consent: e.target.value,
                })
              }
              className="h-9 min-w-[115px] px-2.5 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-700 outline-none focus:ring-1 focus:ring-orange-200"
            >
              <option value="">All Consent</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          {/* STATUS */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-gray-500">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: e.target.value,
                })
              }
              className="h-9 min-w-[115px] px-2.5 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-700 outline-none focus:ring-1 focus:ring-orange-200"
            >
              <option value="">All Status</option>
              <option value="1">New</option>
              <option value="2">In Progress</option>
              <option value="3">Closed</option>
            </select>
          </div>

          {/* CONVERTED TO ERP */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-gray-500">
              Convert to ERP
            </label>

            <select
              value={filters.converted_to_erp}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  converted_to_erp: e.target.value,
                })
              }
              className="h-9 min-w-[130px] px-2.5 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-700 outline-none focus:ring-1 focus:ring-orange-200"
            >
              <option value="">All ERP</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          {/* ASSIGNED */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-gray-500">
              Assigned To
            </label>
            <select
              value={filters.assigned_to}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  assigned_to: e.target.value,
                })
              }
              className="h-9 min-w-[120px] px-2.5 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-700 outline-none focus:ring-1 focus:ring-orange-200"
            >
              <option value="">All Assigned</option>
              <option value="null">-</option>

              {salesUsers.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.user_name}
                </option>
              ))}
            </select>
          </div>

          {/* START DATE */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-gray-500">
              Start Date
            </label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  start_date: e.target.value,
                })
              }
              className="h-9 w-[145px] px-2.5 rounded-md border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-1 focus:ring-orange-200"
            />
          </div>

          <span className="h-9 flex items-center text-gray-400 text-xs px-1">
            —
          </span>

          {/* END DATE */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-gray-500">
              End Date
            </label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  end_date: e.target.value,
                })
              }
              className="h-9 w-[145px] px-2.5 rounded-md border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-1 focus:ring-orange-200"
            />
          </div>

          {/* BUTTON */}
          <button
            onClick={() => fetchTickets(filters)}
            className="h-9 px-4 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-all whitespace-nowrap"
          >
            Filter
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-500">
            Loading data...
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            No inquiries found.
          </div>
        ) : (
          <table className="w-full table-fixed text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-2 py-2 text-left">
                  <button
                    onClick={() => handleSort("reason_for_inquiry")}
                    className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500 hover:text-orange-500 transition cursor-pointer"
                  >
                    Inquiry
                    <i className={getSortIcon("reason_for_inquiry")} />
                  </button>
                </th>

                <th className="px-2 py-2 text-left">
                  <button
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500 hover:text-orange-500 transition cursor-pointer"
                  >
                    Requester
                    <i className={getSortIcon("name")} />
                  </button>
                </th>

                <th className="px-2 py-2 text-center">
                  <button
                    onClick={() => handleSort("type")}
                    className="mx-auto flex items-center gap-2 text-xs font-semibold uppercase text-gray-500 hover:text-orange-500 transition cursor-pointer"
                  >
                    Type
                    <i className={getSortIcon("type")} />
                  </button>
                </th>

                <th className="px-2 py-2 text-center">
                  <button
                    onClick={() => handleSort("status")}
                    className="mx-auto flex items-center gap-2 text-xs font-semibold uppercase text-gray-500 hover:text-orange-500 transition cursor-pointer"
                  >
                    Status
                    <i className={getSortIcon("status")} />
                  </button>
                </th>

                <th className="px-2 py-2 text-center">
                  <button
                    onClick={() => handleSort("converted_to_erp")}
                    className="mx-auto flex items-center gap-2 text-xs font-semibold uppercase text-gray-500 hover:text-orange-500 transition cursor-pointer"
                  >
                    ERP
                    <i className={getSortIcon("converted_to_erp")} />
                  </button>
                </th>

                <th className="px-2 py-2 text-center">
                  <button
                    onClick={() => handleSort("assigned_to")}
                    className="mx-auto flex items-center gap-2 text-xs font-semibold uppercase text-gray-500 hover:text-orange-500 transition cursor-pointer"
                  >
                    Assigned
                    <i className={getSortIcon("assigned_to")} />
                  </button>
                </th>

                <th className="px-2 py-2 text-center">
                  <button
                    onClick={() => handleSort("created_at")}
                    className="mx-auto flex items-center gap-2 text-xs font-semibold uppercase text-gray-500 hover:text-orange-500 transition cursor-pointer"
                  >
                    Last Updated
                    <i className={getSortIcon("created_at")} />
                  </button>
                </th>

                <th className="px-2 py-2 text-center text-xs font-semibold uppercase text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.inquiry_id}
                  className="border-b border-gray-100 hover:bg-orange-50 transition"
                >
                  <td className="px-4 py-1 max-w-[320px]">
                    <p className="font-medium text-gray-800 truncate">
                      {ticket.reason_for_inquiry?.trim() || "-"}
                    </p>
                  </td>

                  <td className="px-2 py-1">
                    <p className="text-[13px] text-gray-800 truncate">
                      {ticket.email?.trim() || "-"}
                    </p>
                  </td>

                  <td className="px-2 py-1 text-center">
                    <span className="inline-flex px-3 py-1 text-gray-800 text-xs font-medium">
                      {ticket.type || "-"}
                    </span>
                  </td>

                  <td className="px-2 py-1 text-center">
                    <span
                      className={`inline-flex px-1 py-1 rounded-full text-xs font-medium ${
                        ticket.status === 1
                          ? "text-balck-900"
                          : ticket.status === 2
                          ? "text-balck-900"
                          : "text-black-900"
                      }`}
                    >
                      {ticket.status === 1
                        ? "New"
                        : ticket.status === 2
                        ? "In Progress"
                        : "Closed"}
                    </span>
                  </td>

                  <td className="px-2 py-1 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        ticket.converted_to_erp
                          ? "text-green-700"
                          : "text-gray-600"
                      }`}
                    >
                      {ticket.converted_to_erp ? "Yes" : "No"}
                    </span>
                  </td>

                  <td className="px-2 py-1 text-center">
                    <span className="inline-flex px-2 py-1 text-gray-700 text-s font-medium">
                      {ticket.assigned_to || "-"}
                    </span>
                  </td>

                  <td className="px-2 py-1 text-center">
                    <span className="text-sm text-gray-500">
                      {new Date(ticket.created_at).toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </td>

                  <td className="px-2 py-1 text-center">
                    <Link
                      href={`/admin/ticket/${
                        ticket.ticket_id || ticket.inquiry_id
                      }`}
                    >
                      <button className="text-orange-500 hover:text-orange-700 font-medium text-sm cursor-pointer">
                        View →
                      </button>
                    </Link>
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