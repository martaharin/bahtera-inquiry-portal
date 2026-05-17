import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {

  try {

    const { searchParams } = new URL(req.url);

    // =========================
    // USER SESSION PARAMS
    // =========================

    const roleName = searchParams.get('role_name');
    const userId = searchParams.get('user_id');
    const industry = searchParams.get('industry');
    const branch = searchParams.get('branch');

    // =========================
    // FILTER PARAMS
    // =========================

    const consent = searchParams.get('consent');
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assigned_to');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    console.log(
      `[TICKET API] CONNECTED TO DB - Role: ${roleName}, Industry: ${industry}, Branch: ${branch}`
    );

    // ====================================================
    // MAIN TICKET QUERY
    // ====================================================

    let ticketsQuery = `
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
          i.consent_to_contact,

          u.user_name AS assigned_to 

      FROM public.inquiry i

      LEFT JOIN public.ticket t
      ON i.inquiry_id = t.inquiry_id

      LEFT JOIN public."users" u
      ON t.assigned_user_id = u.user_id
    `;

    let ticketQueryParams: any[] = [];
    let conditions: string[] = [];

    // ====================================================
    // ROLE FILTER
    // ====================================================

    // SALES STAFF
    if (roleName === 'Sales Staff' && userId) {

      ticketQueryParams.push(userId);

      conditions.push(`
        t.assigned_user_id = $${ticketQueryParams.length}
      `);
    }

    // HEAD SALES
    else if (
      roleName === 'Head Sales' &&
      industry &&
      branch
    ) {

      ticketQueryParams.push(userId);
      ticketQueryParams.push(industry);
      ticketQueryParams.push(branch);

      conditions.push(`
        (
          t.assigned_user_id = $1

          OR

          t.assigned_user_id IN (
            SELECT user_id
            FROM public.sales_person
            WHERE industry = $2
            AND branch = $3
            AND role_name = 'Sales Staff'
          )
        )
      `);
    }

    // ====================================================
    // FILTER: CONSENT
    // ====================================================

    if (consent !== null && consent !== '') {

      ticketQueryParams.push(consent === 'true');

      conditions.push(`
        i.consent_to_contact = $${ticketQueryParams.length}
      `);
    }

    // ====================================================
    // FILTER: STATUS
    // ====================================================

    if (status) {

      ticketQueryParams.push(status);

      conditions.push(`
        t.status = $${ticketQueryParams.length}
      `);
    }

    // ====================================================
    // FILTER: ASSIGNED TO
    // ====================================================

    if (assignedTo) {

      ticketQueryParams.push(assignedTo);

      conditions.push(`
        t.assigned_user_id = $${ticketQueryParams.length}
      `);
    }

    // ====================================================
    // FILTER: DATE RANGE
    // ====================================================

    if (startDate && endDate) {

      ticketQueryParams.push(startDate);
      ticketQueryParams.push(endDate);

      conditions.push(`
        DATE(t.created_at)
        BETWEEN $${ticketQueryParams.length - 1}
        AND $${ticketQueryParams.length}
      `);
    }

    // ====================================================
    // APPLY CONDITIONS
    // ====================================================

    if (conditions.length > 0) {

      ticketsQuery += `
        WHERE ${conditions.join(' AND ')}
      `;
    }

    // ====================================================
    // ORDER
    // ====================================================

    ticketsQuery += `
      ORDER BY t.created_at DESC;
    `;

    // ====================================================
    // EXECUTE QUERY
    // ====================================================

    const ticketsResult = await db.query(
      ticketsQuery,
      ticketQueryParams
    );

    // ====================================================
    // STATS QUERY
    // ====================================================

    let statsQuery = '';
    let statsQueryParams: any[] = [];

    // SALES STAFF
    if (roleName === 'Sales Staff' && userId) {

      statsQuery = `
        SELECT
          u.user_id,
          u.user_name,
          COUNT(t.ticket_id)::int AS active_tickets_count

        FROM public."users" u

        LEFT JOIN public.ticket t
        ON u.user_id = t.assigned_user_id
        AND t.status IN (1, 2)

        WHERE u.user_id = $1

        GROUP BY u.user_id, u.user_name;
      `;

      statsQueryParams.push(userId);
    }

    // HEAD SALES
    else if (
      roleName === 'Head Sales' &&
      industry &&
      branch
    ) {

      statsQuery = `
        SELECT
          u.user_id,
          u.user_name,
          COUNT(t.ticket_id)::int AS active_tickets_count

        FROM public."users" u

        LEFT JOIN public.ticket t
        ON u.user_id = t.assigned_user_id
        AND t.status IN (1, 2)

        WHERE u.user_id IN (
          SELECT user_id
          FROM public.sales_person
          WHERE industry = $1
          AND branch = $2
          AND role_name = 'Sales Staff'
        )

        GROUP BY u.user_id, u.user_name

        ORDER BY u.user_name ASC;
      `;

      statsQueryParams.push(industry, branch);
    }

    // ADMIN
    else {

      statsQuery = `
        SELECT
          u.user_id,
          u.user_name,
          COUNT(t.ticket_id)::int AS active_tickets_count

        FROM public."users" u

        LEFT JOIN public.ticket t
        ON u.user_id = t.assigned_user_id
        AND t.status IN (1, 2)

        GROUP BY u.user_id, u.user_name

        ORDER BY u.user_name ASC;
      `;
    }

    // ====================================================
    // EXECUTE STATS
    // ====================================================

    const statsResult = await db.query(
      statsQuery,
      statsQueryParams
    );

    // ====================================================
    // RESPONSE
    // ====================================================

    return NextResponse.json({
      success: true,
      tickets: ticketsResult.rows,
      stats: statsResult.rows
    });

  } catch (error: any) {

    console.error(
      "Database Error (GET Tickets Final):",
      error
    );

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