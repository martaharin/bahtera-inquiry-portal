"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface UserStat {
  user_id: string;
  user_name: string;
  active_tickets_count: number;
}

interface TicketListItem {
  ticket_id: string;
  status: number;
  assigned_user_id: string | null;
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
}

export default function TicketPage() {
  const [mounted, setMounted] = useState(false);
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [stats, setStats] = useState<UserStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState({
    role_name: "Admin",
    user_id: "",
    industry: "",
    branch: ""
  });

  // =========================
  // FILTER STATE
  // =========================
  const [filters, setFilters] = useState({
    consent: '',
    status: '',
    assigned_to: '',
    start_date: '',
    end_date: ''
  });

  // =========================
  // FETCH DATA
  // =========================
  const fetchTickets = async (
    role: string,
    id: string,
    ind: string,
    brc: string,
    currentFilters = filters
  ) => {
    try {
      setIsLoading(true);

      const queryParams = new URLSearchParams({
        role_name: role,
        user_id: id,
        industry: ind,
        branch: brc,
        consent: currentFilters.consent,
        status: currentFilters.status,
        assigned_to: currentFilters.assigned_to,
        start_date: currentFilters.start_date,
        end_date: currentFilters.end_date
      });

      const res = await fetch(`/api/ticket?${queryParams.toString()}`);
      const result = await res.json();

      if (result.success) {
        setTickets(result.tickets || []);
        setStats(result.stats || []);
      } else {
        setTickets([]);
        setStats([]);
      }
    } catch (error) {
      console.error("Gagal mengambil data tiket:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // =========================
  // INITIAL LOAD
  // =========================
  useEffect(() => {
    setMounted(true);

    let currentRole = "Admin";
    let currentId = "";
    let currentIndustry = "";
    let currentBranch = "";

    if (typeof window !== 'undefined') {
      const savedSession = localStorage.getItem("user");
      if (savedSession) {
        const loggedInUser = JSON.parse(savedSession);
        console.log("=== USER SESSION ACTIVE ===", loggedInUser);

        currentRole = loggedInUser.role_name || "Admin";
        currentId = loggedInUser.user_id || "";
        currentIndustry = loggedInUser.industry || "";
        currentBranch = loggedInUser.branch || "";

        setCurrentUser({
          role_name: currentRole,
          user_id: currentId,
          industry: currentIndustry,
          branch: currentBranch
        });
      }
    }

    fetchTickets(currentRole, currentId, currentIndustry, currentBranch);
  }, []);

  if (!mounted) return null;

  // =========================================================================
  // LOGIKA UTAMA ROLE-BASED ACCESS CONTROL (CREATE NEW TICKET)
  // =========================================================================
  const cleanRole = currentUser.role_name ? currentUser.role_name.toLowerCase().trim() : "";
  const isAdmin = cleanRole === "admin";
  const isSales = cleanRole === "sales staff" || cleanRole === "sales";
  const isHeadSales = cleanRole === "head sales";

  // Aturan bisnis: Admin & Sales Staff biasa boleh create, Head Sales TIDAK BOLEH
  const canCreateTicket = isAdmin || (isSales && !isHeadSales);
  // =========================================================================

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Ticket Management
          </h1>
          <p className="text-xs font-medium text-gray-400 mt-1 uppercase tracking-wider">
            Logged in as:
            <span className="text-orange-500 font-bold">
              {" "}{currentUser.role_name}
            </span>
            {currentUser.branch && ` (${currentUser.industry} - ${currentUser.branch})`}
          </p>
        </div>

        {/* TOMBOL & LINK NEW TICKET DENGAN AKSES RBAC */}
        {canCreateTicket ? (
          <Link href="/admin/ticket/new">
            <button
              className="px-4 py-2 bg-orange-500 text-white hover:bg-orange-600 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
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

      <div className="bg-white rounded-[24px] border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                Sales Staff
              </th>
              <th className="px-6 py-4 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                Total New & In Progress Ticket
              </th>
            </tr>
          </thead>

          <tbody>
            {stats.map((userStat) => (
              <tr
                key={userStat.user_id}
                className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
              >
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-user text-gray-500"></i>
                    <span className="font-bold text-gray-900">
                      {userStat.user_name}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-3 text-center">
                  <span className="text-m font-black text-gray-900">
                    {userStat.active_tickets_count}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FILTER */}
      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
        <div className="flex flex-wrap lg:flex-nowrap items-end gap-6">
          <div className="flex flex-1 gap-4 min-w-[450px]">
            {/* CONSENT */}
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Consent
              </label>
              <select
                value={filters.consent}
                onChange={(e) =>
                  setFilters({ ...filters, consent: e.target.value })
                }
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-200 transition-all"
              >
                <option value="">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* STATUS */}
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-200 transition-all"
              >
                <option value="">All</option>
                <option value="1">New</option>
                <option value="2">In Progress</option>
                <option value="3">Closed</option>
              </select>
            </div>

            {/* ASSIGNED TO */}
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Assigned To
              </label>
              <select
                value={filters.assigned_to}
                onChange={(e) =>
                  setFilters({ ...filters, assigned_to: e.target.value })
                }
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-200 transition-all"
              >
                <option value="">All</option>
                {stats.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.user_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DATE + BUTTON */}
          <div className="flex items-end gap-4 w-full lg:w-auto">
            <div className="space-y-2 flex-1 lg:flex-none">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Periode
              </label>
              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) =>
                    setFilters({ ...filters, start_date: e.target.value })
                  }
                  className="bg-transparent text-[10px] font-bold outline-none"
                />
                <span className="text-[9px] font-black text-gray-300 uppercase">
                  to
                </span>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) =>
                    setFilters({ ...filters, end_date: e.target.value })
                  }
                  className="bg-transparent text-[10px] font-bold outline-none"
                />
              </div>
            </div>

            <button
              onClick={() =>
                fetchTickets(
                  currentUser.role_name,
                  currentUser.user_id,
                  currentUser.industry,
                  currentUser.branch,
                  filters
                )
              }
              className="bg-orange-500 hover:bg-orange-600 text-white h-[48px] px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-orange-100 whitespace-nowrap"
            >
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="space-y-4">
        <div className="grid grid-cols-6 px-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
          <div>Inquiry / Company</div>
          <div className="text-center">Consent</div>
          <div className="text-center">Assigned To</div>
          <div className="text-center">Industry</div>
          <div className="text-center">Requester</div>
          <div className="text-right">Action</div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="bg-white p-10 rounded-[24px] text-center font-bold text-gray-400 italic">
              Loading data from database...
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-white p-10 rounded-[24px] text-center font-bold text-gray-400 italic">
              No inquiries found in database scope.
            </div>
          ) : (
            tickets.map((ticket: TicketListItem) => (
              <div
                key={ticket.inquiry_id}
                className="grid grid-cols-6 items-center bg-white p-6 rounded-[24px] border border-orange-50 shadow-sm text-[12px] font-medium text-gray-600 transition-all hover:shadow-md"
              >
                <div className="pr-6">
                  <div className="text-gray-900 font-bold truncate italic">
                    "{ticket.reason_for_inquiry}"
                  </div>
                  <div className="text-[9px] font-black text-orange-400 uppercase tracking-widest mt-1">
                    {ticket.company || "No Company"}
                  </div>
                </div>

                <div className={`text-center font-bold ${ticket.consent_to_contact ? 'text-green-500' : 'text-red-400'}`}>
                  {ticket.consent_to_contact ? 'YES' : 'NO'}
                </div>

                <div className="text-center font-bold text-gray-900 uppercase">
                  {ticket.assigned_to || '-'}
                </div>

                <div className="text-center font-bold text-gray-400 uppercase tracking-tighter">
                  {ticket.industry || '-'}
                </div>

                <div className="text-center">
                  <p className="font-bold text-gray-900">{ticket.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{ticket.email}</p>
                </div>
                
                <div className="text-right">
                  <Link href={
                    `/admin/ticket/${ticket.ticket_id || ticket.inquiry_id}`}>
                    <button className="text-[10px] font-black text-orange-400 hover:text-orange-600 transition-all uppercase tracking-[0.2em] cursor-pointer">
                      View Details →
                    </button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}