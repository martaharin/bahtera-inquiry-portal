"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import StatCard from '@/app/components/statcard';

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  // Dashboard states
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    inProgress: 0,
  });

  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Current month label
  const monthName = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  useEffect(() => {
    setMounted(true);

    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/dashboard');
        const data = await response.json();

        console.log("DASHBOARD DATA:", data);

        if (response.ok) {
          setStats({
            total: data.stats?.total || 0,
            new: data.stats?.new || 0,
            inProgress: data.stats?.inProgress || 0,
          });

          setRecentTickets(data.recent || []);
        }

      } catch (error) {
        console.error("Gagal mengambil data dashboard:", error);

      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (!mounted || loading) {
    return (
      <div className="p-10 text-gray-400 font-black animate-pulse uppercase tracking-widest">
        Loading Dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-12">

      {/* TICKET OVERVIEW */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 bg-orange-500 rounded-full"></div>

          <div className="flex flex-col">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">
              Ticket Overview
            </h3>

            <span className="text-xs text-orange-500 font-bold uppercase">
              {monthName}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StatCard
            title="Total Tickets"
            value={stats.total}
            color="text-gray-900"
          />

          <StatCard
            title="New Tickets"
            value={stats.new}
            color="text-blue-600"
          />

          <StatCard
            title="In Progress"
            value={stats.inProgress}
            color="text-orange-600"
          />
        </div>
      </section>

      {/* RECENT TICKETS */}
      <section className="space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-orange-500 rounded-full"></div>

            <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">
              Recent Tickets
            </h3>
          </div>

          <Link href="/admin/ticket">
            <button className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-500 hover:text-orange-600 transition-all">
              View All →
            </button>
          </Link>
        </div>

        {/* TABLE HEADER */}
        <div className="grid grid-cols-6 px-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
          <div>Inquiry / Company</div>
          <div className="text-center">Consent</div>
          <div className="text-center">Assigned To</div>
          <div className="text-center">Industry</div>
          <div className="text-center">Requester</div>
          <div className="text-right">Action</div>
        </div>

        {/* TABLE CONTENT */}
        <div className="space-y-3">

          {recentTickets.length === 0 ? (

            <div className="bg-white p-10 rounded-[24px] text-center font-bold text-gray-400 italic">
              No recent tickets found.
            </div>

          ) : (

            recentTickets.map((ticket: any) => (
              <div
                key={ticket.ticket_id}
                className="grid grid-cols-6 items-center bg-white p-6 rounded-[24px] border border-orange-50 shadow-sm text-[12px] font-medium text-gray-600 transition-all hover:shadow-md"
              >

                {/* Inquiry */}
                <div className="pr-6">
                  <div className="text-gray-900 font-bold truncate italic">
                    "{ticket.reason_for_inquiry}"
                  </div>

                  <div className="text-[9px] font-black text-orange-400 uppercase tracking-widest mt-1">
                    {ticket.company || "No Company"}
                  </div>
                </div>

                {/* Consent */}
                <div
                  className={`text-center font-bold ${
                    ticket.consent_to_contact
                      ? 'text-green-500'
                      : 'text-red-400'
                  }`}
                >
                  {ticket.consent_to_contact ? 'YES' : 'NO'}
                </div>

                {/* Assigned To */}
                <div className="text-center font-bold">
                  {ticket.assigned_to ? (
                    <span className="text-gray-900">
                      {ticket.assigned_to}
                    </span>
                  ) : (
                    <span className="text-orange-400">
                      Unassigned
                    </span>
                  )}
                </div>

                {/* Industry */}
                <div className="text-center font-bold text-gray-400 uppercase tracking-tighter">
                  {ticket.industry || '-'}
                </div>

                {/* Requester */}
                <div className="text-center">
                  <p className="font-bold text-gray-900">
                    {ticket.name}
                  </p>

                  <p className="text-[10px] text-gray-400 truncate">
                    {ticket.email}
                  </p>
                </div>

                {/* Action */}
                <div className="text-right">
                  <Link href={`/admin/ticket/${ticket.ticket_id }`}>
                    <button className="text-[10px] font-black text-orange-400 hover:text-orange-600 transition-all uppercase tracking-[0.2em]">
                      View Details →
                    </button>
                  </Link>
                </div>

              </div>
            ))

          )}
        </div>
      </section>
    </div>
  );
}