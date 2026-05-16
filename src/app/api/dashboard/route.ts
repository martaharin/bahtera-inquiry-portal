import { dbQuery } from '../../../src/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {

    // =======================
    // STATS
    // =======================

    const totalRes = await dbQuery(`
      SELECT COUNT(*)::int AS total
      FROM public.ticket
    `);

    const newRes = await dbQuery(`
      SELECT COUNT(*)::int AS total
      FROM public.ticket
      WHERE status_id = 1
    `);

    const progressRes = await dbQuery(`
      SELECT COUNT(*)::int AS total
      FROM public.ticket
      WHERE status_id = 2
    `);

    // =======================
    // RECENT TICKETS
    // =======================

    const recentRes = await dbQuery(`
      SELECT 
        t.ticket_id,
        t.status_id,
        t.created_at,

        i.inquiry_id,
        i.product_inquiry,
        i.company,
        i.consent_to_contact,
        i.industry,
        i.name,
        i.email,

        u.user_name AS assigned_to

      FROM public.ticket t

      LEFT JOIN public.inquiry i
      ON t.inquiry_id = i.inquiry_id

      LEFT JOIN public."user" u
      ON t.assigned_user_id = u.user_id

      ORDER BY t.created_at DESC
      LIMIT 4
    `);

    // =======================
    // RESPONSE
    // =======================

    return NextResponse.json({
      success: true,

      stats: {
        total: totalRes.rows[0]?.total || 0,
        new: newRes.rows[0]?.total || 0,
        inProgress: progressRes.rows[0]?.total || 0,
      },

      recent: recentRes.rows || []
    });

  } catch (error: any) {

    console.error("DASHBOARD ERROR:", error);

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