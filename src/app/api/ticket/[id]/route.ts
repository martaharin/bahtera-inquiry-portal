import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Helper function untuk mengambil session user secara dinamis tanpa hardcode 'localhost:3000'
async function getAuthenticatedUser(req: Request) {
  try {
    const origin = new URL(req.url).origin;
    const sessionRes = await fetch(`${origin}/api/auth/me`, {
      headers: req.headers,
    });

    if (!sessionRes.ok) return null;
    
    const session = await sessionRes.json();
    return session?.success ? session.user : null;
  } catch (error) {
    console.error("Gagal mengambil session user di API:", error);
    return null;
  }
}

// ==========================================
// 1. GET: Mengambil Detail Tiket & Chat Messages History
// ==========================================
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const { id } = await params; 
    const inquiryId = id;

    if (!inquiryId) {
      return NextResponse.json(
        { success: false, error: "Ticket ID tidak ditemukan di params" },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
      SELECT 
        i.inquiry_id,
        i.name,
        i.email,
        i.phone,
        i.company,
        i.location,
        i.industry,
        i.reason_for_inquiry,
        i.product_inquiry,
        i.consent_to_contact,
        i.session_id,
        t.ticket_id,
        t.status,
        t.assigned_user_id,
        t.created_at,
        t.converted_to_erp,
        u.user_name AS assigned_to
      FROM public.inquiry i
      LEFT JOIN public.ticket t ON i.inquiry_id = t.inquiry_id
      LEFT JOIN public."users" u ON t.assigned_user_id = u.user_id
      WHERE i.inquiry_id = $1 OR t.ticket_id = $1
      LIMIT 1
      `,
      [inquiryId]
    );

    const row = result?.rows?.[0];

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Ticket tidak ditemukan" },
        { status: 404 }
      );
    }

    let chatMessages = [];
    if (row.session_id) {
      const chatResult = await db.query(
        `
        SELECT role, content 
        FROM public.chat_messages 
        WHERE session_id = $1 
        ORDER BY created_at ASC
        `,
        [row.session_id]
      );
      chatMessages = chatResult?.rows || [];
    }

    return NextResponse.json({
      success: true,
      data: row,
      chatMessages: chatMessages
    });

  } catch (error: any) {
    console.error("DETAIL TICKET ERROR:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ==========================================
// 2. PUT: Mengupdate Data Tiket & Inquiry (PROTECTED)
// ==========================================
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticketId = id;
    
    // 1. Ambil session user aktif
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (currentUser.role_name || "").trim().toLowerCase();
    const currentUserId = String(currentUser.user_id).trim();
    
    // 2. Ambil data tiket saat ini untuk dicek kepemilikannya
    const ticketCheck = await db.query(
      `SELECT inquiry_id, status, assigned_user_id FROM public.ticket WHERE ticket_id = $1 LIMIT 1`,
      [ticketId]
    );

    const existingTicket = ticketCheck?.rows?.[0];
    if (!existingTicket) {
      return NextResponse.json({ success: false, error: "Ticket tidak ditemukan" }, { status: 404 });
    }

    // 3. Validasi Otorisasi PUT: Menjaring role "sales staff" dari databasemu
    const isAdmin = role === "admin";
    const isSales = role === "sales staff" || role === "sales"; 
    const isAssignedSales = existingTicket.assigned_user_id && String(existingTicket.assigned_user_id).trim() === currentUserId;

    // 💡 FIXED LOGIC GATE: Pastikan harus Admin ATAU (Sales Staff DAN di-assigned)
    if (!isAdmin && !(isSales && isAssignedSales)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Hanya Admin atau Sales yang ditugaskan yang dapat mengedit tiket ini" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { status, assigned_user_id, name, email, phone, location, company, industry } = body;

    // FIXED ERROR INTEGER: Validasi input data status agar tidak mengirim string kosong "" ke PostgreSQL
    const finalStatus = (status !== undefined && status !== "" && !isNaN(Number(status))) 
      ? Number(status) 
      : existingTicket.status;

    const finalAssignedId = (assigned_user_id === "" || assigned_user_id === undefined) ? null : assigned_user_id;
    
    // 4. Eksekusi Update jika lolos validasi
    await db.query(
      `UPDATE public.ticket 
      SET 
      status = $1, 
      assigned_user_id = $2, 
      updated_at = NOW()
      WHERE ticket_id = $3
      `,
      [finalStatus, finalAssignedId, ticketId]
    );

    await db.query(
      `
      UPDATE public.inquiry 
      SET name = $1, email = $2, phone = $3, location = $4, company = $5, industry = $6
      WHERE inquiry_id = $7
      `,
      [
        name || "", 
        email || "", 
        phone || "", 
        location || "", 
        company || "", 
        industry || "", 
        existingTicket.inquiry_id
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Data tiket dan inquiry berhasil diperbarui",
    });

  } catch (error: any) {
    console.error("PUT TICKET ERROR:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Gagal memperbarui data" },
      { status: 500 }
    );
  }
}

// ==========================================
// 3. PATCH: Update Status Konversi ERP
// ==========================================
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticketId = id;
    const body = await req.json();
    const { converted_to_erp } = body;

    const result = await db.query(
      `
      UPDATE public.ticket
      SET 
      converted_to_erp = $1,
      updated_at = NOW()
      WHERE ticket_id = $2
      RETURNING *
      `,
      [converted_to_erp, ticketId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Ticket tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });

  } catch (error: any) {
    console.error("PATCH ERP ERROR:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Gagal update ERP conversion" },
      { status: 500 }
    );
  }
}

// ==========================================
// 4. DELETE: Menghapus Tiket & Inquiry (PROTECTED)
// ==========================================
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticketId = id;

    // 1. Ambil session user aktif
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (currentUser.role_name || "").trim().toLowerCase();

    // 2. Validasi Otorisasi DELETE: Mutlak hanya Admin
    if (role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Hanya Admin yang dapat menghapus tiket" },
        { status: 403 }
      );
    }

    const ticketCheck = await db.query(
      `SELECT inquiry_id FROM public.ticket WHERE ticket_id = $1 LIMIT 1`,
      [ticketId]
    );

    const existingTicket = ticketCheck?.rows?.[0];
    if (!existingTicket) {
      return NextResponse.json({ success: false, error: "Ticket tidak ditemukan" }, { status: 404 });
    }

    // 3. Eksekusi Hapus data
    await db.query(`DELETE FROM public.ticket WHERE ticket_id = $1`, [ticketId]);
    await db.query(`DELETE FROM public.inquiry WHERE inquiry_id = $1`, [existingTicket.inquiry_id]);

    return NextResponse.json({
      success: true,
      message: "Tiket beserta data inquiry berhasil dihapus",
    });

  } catch (error: any) {
    console.error("DELETE TICKET ERROR:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Gagal menghapus data" },
      { status: 500 }
    );
  }
}