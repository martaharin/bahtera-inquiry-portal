"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TicketData {
  ticket_id: string;
  status: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  location: string;
  industry: string;
  product_inquiry: string;
  created_at: string;
  assigned_user_id: string | null;
  assigned_to: string | null;
  converted_to_erp: boolean;
}

interface UserList {
  user_id: string;
  user_name: string;
}

interface ChatMessage {
  role: string;
  content: string;
}

const STATUS_MAPPING: Record<number, { label: string; color: string }> = {
  1: {
    label: "New",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  2: {
    label: "In Progress",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  3: {
    label: "Closed",
    color: "bg-gray-50 text-gray-700 border-gray-200",
  },
  4: {
    label: "Invalid",
    color: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

export default function DetailTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const unpackedParams = use(params);
  const ticketId = unpackedParams.id;

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [users, setUsers] = useState<UserList[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    status: 1,
    assigned_user_id: "",
    name: "",
    email: "",
    phone: "",
    location: "",
    company: "",
    industry: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError("");

        // Ambil data secara paralel untuk performa loading yang lebih cepat
        const [resTicket, resUsers, sessionRes] = await Promise.all([
          fetch(`/api/ticket/${ticketId}`),
          fetch("/api/users").catch((e) => {
            console.error("Gagal memuat API users:", e);
            return null;
          }),
          fetch("/api/auth/me").catch((e) => {
            console.error("Gagal ambil session user:", e);
            return null;
          }),
        ]);

        if (!isMounted) return;

        // Proses data user list
        if (resUsers?.ok) {
          const resultUsers = await resUsers.json();
          if (Array.isArray(resultUsers)) {
            setUsers(resultUsers);
          }
        }

        // Proses data sesi aktif
        if (sessionRes?.ok) {
          const sessionData = await sessionRes.json();
          setCurrentUserId(sessionData.user?.user_id || null);
          setCurrentUserRole(sessionData.user?.role_name || "");
        }

        // Proses data detail tiket
        if (resTicket.ok) {
          const resultTicket = await resTicket.json();
          if (resultTicket.success) {
            const ticketData = resultTicket.data;
            setTicket(ticketData);
            setChatMessages(resultTicket.chatMessages || []);

            setEditForm({
              status: ticketData.status || 1,
              assigned_user_id: ticketData.assigned_user_id ?? "",
              name: ticketData.name || "",
              email: ticketData.email || "",
              phone: ticketData.phone || "",
              location: ticketData.location || "",
              company: ticketData.company || "",
              industry: ticketData.industry || "",
            });
          } else {
            setError(resultTicket.error || "Gagal mengambil data tiket");
          }
        } else {
          setError("Gagal mengambil data dari server");
        }
      } catch (err) {
        if (isMounted) setError("Terjadi kesalahan koneksi ke server");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [ticketId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: name === "status" ? Number(value) : value,
    }));
  };

  const handleCancel = () => {
    if (ticket) {
      setEditForm({
        status: ticket.status,
        assigned_user_id: ticket.assigned_user_id || "",
        name: ticket.name || "",
        email: ticket.email || "",
        phone: ticket.phone || "",
        location: ticket.location || "",
        company: ticket.company || "",
        industry: ticket.industry || "",
      });
    }
    setIsEditing(false);
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      
      // Amankan payload sebelum dikirim ke API
      const payload = {
        ...editForm,
        assigned_user_id: editForm.assigned_user_id === "" ? null : editForm.assigned_user_id,
      };

      const res = await fetch(`/api/ticket/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const selectedUserObj = users.find(
          (u) => String(u.user_id) === String(payload.assigned_user_id)
        );

        setTicket((prev) =>
          prev
            ? {
                ...prev,
                ...payload,
                assigned_to: selectedUserObj ? selectedUserObj.user_name : null,
              }
            : null
        );
        setIsEditing(false);
      } else {
        alert("Gagal mengupdate data tiket");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!isAdmin) {
      alert("Anda tidak memiliki izin untuk menghapus tiket ini");
      return;
    }
    const confirmDelete = window.confirm(
      "Apakah Anda yakin ingin menghapus tiket ini?"
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/ticket/${ticketId}`, {
        method: "DELETE",
      });

      const result = await res.json();
      console.log("DELETE RESPONSE:", result);

      if (res.ok) {
        alert("Tiket berhasil dihapus!");
        router.push("/admin/ticket");
      } else {
        alert("Gagal menghapus tiket");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat menghapus data");
    }
  };

  const handleConvertToERP = async () => {
    if (ticket?.converted_to_erp) return;

    const confirmConvert = window.confirm(
      "Mark this ticket as converted to ERP?"
    );
    if (!confirmConvert) return;

    try {
      const res = await fetch(`/api/ticket/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ converted_to_erp: true }),
      });

      const result = await res.json();

      if (result.success) {
        setTicket((prev) =>
          prev ? { ...prev, converted_to_erp: true } : null
        );
      } else {
        alert("Failed to convert ticket to ERP");
      }
    } catch (error) {
      console.error(error);
      alert("Server error while converting ticket");
    }
  };

  // Parser teks aman untuk format markdown dasar ke HTML
  const formatMessage = (content: string) => {
    if (!content) return "";
    return content
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline font-bold">$1</a>'
      )
      .replace(
        /(^|[\s>])(https?:\/\/[^\s<]+)/g,
        '$1<a href="$2" target="_blank" rel="noopener noreferrer" class="underline font-bold break-all">$2</a>'
      )
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<i>$1</i>")
      .replace(/\n/g, "<br>");
  };

  if (loading) return <div className="p-8 text-gray-500 font-medium">Memuat detail tiket...</div>;
  if (error) return <div className="p-8 text-red-500 font-medium">Error: {error}</div>;
  if (!ticket) return <div className="p-8 text-gray-500 font-medium">Tiket tidak ditemukan</div>;

  const currentStatusInfo = STATUS_MAPPING[ticket.status] || {
    label: "Unknown",
    color: "bg-gray-100 text-gray-800 border-gray-200",
  };

  // Normalisasi pengecekan role terpusat
  const isAssignedSales =
    currentUserId &&
    ticket.assigned_user_id &&
    String(currentUserId) === String(ticket.assigned_user_id);

  const cleanRole = currentUserRole?.toLowerCase()?.trim() || "";

  const isAdmin = cleanRole === "admin";
  const isHeadSales = cleanRole === "head sales";
  const isSales = cleanRole === "sales staff" || cleanRole === "sales";

  const canEditTicket = isAdmin || (isSales && !isHeadSales && isAssignedSales);
  const canDeleteTicket = isAdmin;

  const canConvertERP = isAssignedSales;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* BACK BUTTON */}
      <Link
        href="/admin/ticket"
        className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-600 transition-all mb-6"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={3}
          stroke="currentColor"
          className="w-3.5 h-3.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
          />
        </svg>
        Back
      </Link>

      {/* MAIN CONTAINER */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 space-y-8">
        {/* HEADER */}
        <div className="flex flex-wrap justify-between items-start border-b border-gray-100 pb-6 gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono text-gray-400">
              ID TIKET: {ticket.ticket_id}
            </span>

            <h1 className="text-2xl font-black text-gray-900">
              Inquiry: {ticket.product_inquiry}
            </h1>

            {/* ASSIGNED TO */}
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 h-8">
              <span>Assigned to:</span>
              {isEditing ? (
                <select
                  name="assigned_user_id"
                  value={editForm.assigned_user_id}
                  onChange={handleInputChange}
                  className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-orange-200 normal-case"
                >
                  <option value="">Belum ditugaskan (-)</option>
                  {users.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.user_name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-orange-500 font-extrabold normal-case">
                  {ticket.assigned_to || "-"}
                </span>
              )}
            </div>

            {/* ERP CONVERT */}
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-3 h-8">
              <span>Converted to ERP:</span>
              {ticket.converted_to_erp ? (
                <button
                  disabled
                  className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase cursor-not-allowed"
                >
                  Converted
                </button>
              ) : (
                <button
                  onClick={handleConvertToERP}
                  disabled={!canConvertERP}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                    canConvertERP
                      ? "bg-orange-500 text-white hover:bg-orange-600 cursor-pointer"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Converted
                </button>
              )}
            </div>
          </div>

          {/* STATUS + ACTION */}
          <div className="flex items-center gap-3">
            {isEditing ? (
              <select
                name="status"
                value={editForm.status}
                onChange={handleInputChange}
                className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-200"
              >
                <option value={1}>New</option>
                <option value={2}>In Progress</option>
                <option value={3}>Closed</option>
                <option value={4}>Invalid</option>
              </select>
            ) : (
              <span
                className={`px-4 py-1.5 border rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${currentStatusInfo.color}`}
              >
                {currentStatusInfo.label}
              </span>
            )}

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-sm hover:bg-emerald-600 transition-all cursor-pointer"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>

                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-200 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    disabled={!canEditTicket} 
                    className={`px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-all ${
                      canEditTicket
                        ? "bg-orange-500 text-white hover:bg-orange-600 cursor-pointer"
                        : "bg-gray-200 text-gray-400 opacity-50 pointer-events-none cursor-not-allowed" 
                        
                    }`}
                  >
                    Edit
                  </button>

                  <button
                    onClick={handleDeleteTicket}
                    disabled={!isAdmin}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                      isAdmin
                        ? "bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 cursor-pointer"
                        : "bg-gray-100 text-gray-300 cursor-not-allowed"
                    }`}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* CONTACT + COMPANY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* CONTACT */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
              Contact Information
            </h3>

            <div className="space-y-3 text-sm font-medium text-gray-600">
              <div className="flex items-center">
                <span className="text-gray-400 inline-block w-20">Name:</span>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={editForm.name}
                    onChange={handleInputChange}
                    className="flex-1 p-1.5 bg-gray-50 border rounded-lg text-sm font-bold outline-none border-gray-200 focus:ring-2 focus:ring-orange-200"
                  />
                ) : (
                  <span className="text-gray-900 font-bold">{ticket.name}</span>
                )}
              </div>

              <div className="flex items-center">
                <span className="text-gray-400 inline-block w-20">Email:</span>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={editForm.email}
                    onChange={handleInputChange}
                    className="flex-1 p-1.5 bg-gray-50 border rounded-lg text-sm font-bold outline-none border-gray-200 focus:ring-2 focus:ring-orange-200"
                  />
                ) : (
                  <span className="text-gray-900 font-bold">
                    {ticket.email}
                  </span>
                )}
              </div>

              <div className="flex items-center">
                <span className="text-gray-400 inline-block w-20">Phone:</span>
                {isEditing ? (
                  <input
                    type="text"
                    name="phone"
                    value={editForm.phone}
                    onChange={handleInputChange}
                    className="flex-1 p-1.5 bg-gray-50 border rounded-lg text-sm font-bold outline-none border-gray-200 focus:ring-2 focus:ring-orange-200"
                  />
                ) : (
                  <span className="text-gray-900 font-bold">
                    {ticket.phone}
                  </span>
                )}
              </div>

              <div className="flex items-center">
                <span className="text-gray-400 inline-block w-20">
                  Location:
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    name="location"
                    value={editForm.location}
                    onChange={handleInputChange}
                    className="flex-1 p-1.5 bg-gray-50 border rounded-lg text-sm font-bold outline-none border-gray-200 focus:ring-2 focus:ring-orange-200"
                  />
                ) : (
                  <span className="text-gray-900 font-bold">
                    {ticket.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* COMPANY */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
              Company Details
            </h3>

            <div className="space-y-3 text-sm font-medium text-gray-600">
              <div className="flex items-center">
                <span className="text-gray-400 inline-block w-24">
                  Company:
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    name="company"
                    value={editForm.company}
                    onChange={handleInputChange}
                    className="flex-1 p-1.5 bg-gray-50 border rounded-lg text-sm font-bold outline-none border-gray-200 focus:ring-2 focus:ring-orange-200"
                  />
                ) : (
                  <span className="text-gray-900 font-bold">
                    {ticket.company || "No Company"}
                  </span>
                )}
              </div>

              <div className="flex items-center">
                <span className="text-gray-400 inline-block w-24">
                  Industry:
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    name="industry"
                    value={editForm.industry}
                    onChange={handleInputChange}
                    className="flex-1 p-1.5 bg-gray-50 border rounded-lg text-sm font-bold outline-none border-gray-200 focus:ring-2 focus:ring-orange-200"
                  />
                ) : (
                  <span className="text-gray-900 font-bold">
                    {ticket.industry || "-"}
                  </span>
                )}
              </div>

              <div className="flex items-center py-1.5">
                <span className="text-gray-400 inline-block w-24">
                  Created at:
                </span>
                <span className="text-gray-900 font-bold">
                  {new Date(ticket.created_at).toLocaleDateString("id-ID")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CHAT HISTORY */}
        <div className="border-t border-gray-100 pt-8 space-y-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
            Chat History
          </h3>

          <div className="bg-gray-50 border border-gray-100 rounded-[24px] p-6 max-h-[420px] overflow-y-auto space-y-4 flex flex-col">
            {chatMessages.length === 0 ? (
              <div className="text-center text-xs text-gray-400 italic py-12">
                Tidak ada riwayat percakapan untuk sesi tiket ini.
              </div>
            ) : (
              chatMessages.map((msg, index) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={`${msg.role}-${index}`}
                    className={`flex flex-col max-w-[75%] ${
                      isUser ? "self-start items-start" : "self-end items-end"
                    }`}
                  >
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 px-1">
                      {isUser ? ticket.name || "Customer" : "Chatbot / Assistant"}
                    </span>

                    <div
                      className={`p-4 rounded-[20px] text-sm font-medium leading-relaxed shadow-sm ${
                        isUser
                          ? "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                          : "bg-orange-500 text-white rounded-tr-none"
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: formatMessage(msg.content),
                      }}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}