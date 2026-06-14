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
          i.reason_for_inquiry,
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
    if (roleName === 'sales staff' && userId) {

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
      roleName === 'head sales' &&
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
          WHERE LOWER(industry) = LOWER($1)
          AND LOWER(branch) = LOWER($2)
          AND LOWER (role_name) = 'sales staff'
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

        INNER JOIN public.sales_person sp
        ON u.user_id = sp.user_id

        LEFT JOIN public.ticket t
        ON u.user_id = t.assigned_user_id
        AND t.status IN (1, 2)

        WHERE LOWER(sp.role_name) = 'sales staff'

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

    console.log("ROLE:", roleName);
    console.log("INDUSTRY:", industry);
    console.log("BRANCH:", branch);
    console.log("STATS:", statsResult.rows);

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

//create ticket//
export async function POST(req: Request) {

  try {

    const body = await req.json();

    console.log("BODY:", body);

    const {
      company,
      name,
      email,
      phone,
      location,
      industry,
      industryScale,
      productInquiry,
      reason,
      consent
    } = body;

    //insert inquiry//


    const inquiryResult = await db.query(
      `
      INSERT INTO public.inquiry
      (
        company,
        name,
        email,
        phone,
        location,
        industry,
        industry_scale,
        product_inquiry,
        reason_for_inquiry,
        consent_to_contact
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
      )
      RETURNING inquiry_id;
      `,
      [
        company,
        name,
        email,
        phone,
        location,
        industry,
        industryScale,
        productInquiry,
        reason,
        consent
      ]
    );

    // GET INQUIRY ID
    const inquiryId =
      inquiryResult.rows[0].inquiry_id;

    // INSERT TICKET
    await db.query(
      `
      INSERT INTO public.ticket
      (
        inquiry_id,
        status,
        created_at
      )
      VALUES
      (
        $1,
        1,
        NOW()
      );
      `,
      [inquiryId]
    );

    return NextResponse.json({
      success: true,
      inquiry_id: inquiryId
    });

  } catch (error: any) {

    console.error(
      "Database Error (CREATE Ticket):",
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