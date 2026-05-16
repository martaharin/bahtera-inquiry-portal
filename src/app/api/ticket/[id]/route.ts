import { dbQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// 1. Ubah tipe data params menjadi Promise
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // 👈 Diubah menjadi Promise
) {
  try {
    // 2. Wajib gunakan await untuk mengambil datanya
    const { id } = await params; 
    const ticketId = id;

    // ======================
    // DEBUG LOG
    // ======================
    console.log("📌 TICKET ID PARAM:", ticketId);

    if (!ticketId) {
      return NextResponse.json(
        {
          success: false,
          error: "Ticket ID tidak ditemukan di params",
        },
        { status: 400 }
      );
    }

    // ======================
    // QUERY DB (Kode ke bawah tetap sama)
    // ======================
    const result = await dbQuery(
      `
      SELECT 
        t.ticket_id,
        t.status,
        t.assigned_user_id,
        t.created_at,
        i.inquiry_id,
        i.name,
        i.email,
        i.phone,
        i.company,
        i.location,
        i.industry,
        i.product_inquiry,
        i.consent_to_contact,
        u.user_name AS assigned_to
      FROM public.ticket t
      LEFT JOIN public.inquiry i
        ON t.inquiry_id = i.inquiry_id
      LEFT JOIN public."users" u
        ON t.assigned_user_id = u.user_id
      WHERE t.ticket_id = $1
      LIMIT 1
      `,
      [ticketId]
    );

    console.log("📦 DB RESULT:", result);
    const row = result?.rows?.[0];

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Ticket tidak ditemukan", ticketId },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: row,
    });

  } catch (error: any) {
    console.error("🔥 DETAIL TICKET ERROR:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}