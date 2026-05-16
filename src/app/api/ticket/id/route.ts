import { dbQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {

    const ticketId = params.id;

    // =======================
    // GET DETAIL TICKET
    // =======================

    const result = await dbQuery(
      `
      SELECT 
        t.ticket_id,
        t.status_id,
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

      LEFT JOIN public."user" u
      ON t.assigned_user_id = u.user_id

      WHERE t.ticket_id = $1

      LIMIT 1
      `,
      [ticketId]
    );

    // =======================
    // NOT FOUND
    // =======================

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Ticket tidak ditemukan"
        },
        {
          status: 404
        }
      );
    }

    // =======================
    // SUCCESS
    // =======================

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error: any) {

    console.error("DETAIL TICKET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      {
        status: 500
      }
    );
  }
}