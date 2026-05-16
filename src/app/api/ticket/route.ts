import { dbQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

// =======================
// GET ALL TICKETS
// =======================
export async function GET() {
  try {
    // Gunakan LEFT JOIN supaya kalau tabel ticket kosong, data inquiry tetap muncul
    // Atau sebaliknya. Ini lebih aman untuk debugging.
    const result = await dbQuery(`
      SELECT
          t.ticket_id,
          t.status,
          t.assigned_user_id,
          t.created_at,
          i.inquiry_id,
          i.name,
          i.email,
          i.company,
          i.location,
          i.industry,
          i.product_inquiry,
          i.consent_to_contact
      FROM public.inquiry i
      LEFT JOIN public.ticket t ON i.inquiry_id = t.inquiry_id
      ORDER BY i.created_at DESC;
    `);

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("Database Error (GET):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// =======================
// CREATE NEW TICKET
// =======================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      company,
      name,
      email,
      phone,
      location,
      industry,
      industryScale,
      productInquiry,
      consent // Ini isinya "Yes" atau "No" dari form
    } = body;

    // VALIDASI BOOLEAN: Database butuh true/false, bukan "Yes"/"No"
    const isConsent = consent?.toLowerCase() === 'yes';

    // 1. INSERT INTO INQUIRY
    const inquiryResult = await dbQuery(
      `
      INSERT INTO public.inquiry (
        company,
        name,
        email,
        phone,
        location,
        industry,
        industry_scale,
        product_inquiry,
        consent_to_contact
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING inquiry_id;
      `,
      [company, name, email, phone, location, industry, industryScale, productInquiry, isConsent]
    );

    const inquiryId = inquiryResult.rows[0].inquiry_id;

    // 2. INSERT INTO TICKET
    // Pastikan status 1 memang ada di tabel 'status' kamu
    const ticketResult = await dbQuery(
      `
      INSERT INTO public.ticket (
        inquiry_id,
        status,
        created_at
      )
      VALUES ($1, 1, NOW())
      RETURNING *;
      `,
      [inquiryId]
    );

    return NextResponse.json({ 
      success: true, 
      ticket: ticketResult.rows[0] 
    }, { status: 201 });

  } catch (error: any) {
    console.error("POST Ticket Error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}