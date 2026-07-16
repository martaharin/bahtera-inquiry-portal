import { getServerSession } from "next-auth"
import { NextResponse } from "next/server";;
import { db } from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getPermissionKeysBySessionUser, hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
  try {

    // GET SESSION
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const userId = session.user.user_id;
    const industry = session.user.industry;
    const branch = session.user.branch;
    const roleName = session.user.role_name;
    const cleanRole = roleName?.toLowerCase().trim();

    const userPermissions = await getPermissionKeysBySessionUser(session.user);

    const canViewAllTickets = hasPermission(userPermissions, "ticket.view_all");
    const canViewTeamTickets = hasPermission(userPermissions, "ticket.view_team");
    const canViewOwnTickets = hasPermission(userPermissions, "ticket.view_own");

    if (!canViewAllTickets && !canViewTeamTickets && !canViewOwnTickets) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    

    // FILTER PARAMS
    const { searchParams } = new URL(req.url);

    const consent = searchParams.get("consent");
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assigned_to");
    const convertedToErp = searchParams.get("converted_to_erp");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    console.log(
      `[TICKET API] User: ${userId}, Role: ${roleName}, Industry: ${industry}, Branch: ${branch}`
    );

    // ====================================================
    // MAIN TICKET QUERY
    // ====================================================

    let ticketsQuery = `
      SELECT
          t.ticket_id,
          t.status,
          t.assigned_user_id,
          t.converted_to_erp,
          t.updated_at,
          t.created_at,

          i.inquiry_id,
          i.name,
          i.email,
          i.phone,
          i.company,
          i.location,
          i.industry,
          i.product_inquiry,
          i.reason_for_inquiry,
          i.consent_to_contact,
          i.type,
          u.user_name AS assigned_to

      FROM public.inquiry i

      LEFT JOIN public.ticket t
      ON i.inquiry_id = t.inquiry_id

      LEFT JOIN public."users" u
      ON t.assigned_user_id = u.user_id
    `;

    const ticketQueryParams: any[] = [];
    const conditions: string[] = [];

    // ====================================================
    // ROLE FILTER (DYNAMIC PERMISSION)
    // ====================================================

    // VIEW TEAM
    if (!canViewAllTickets) {
      if (canViewTeamTickets && industry && branch) {
        ticketQueryParams.push(userId);
        ticketQueryParams.push(industry);
        ticketQueryParams.push(branch);

        const p = ticketQueryParams.length;

        conditions.push(`
          (
            t.assigned_user_id = $${p - 2}

            OR

            t.assigned_user_id IN (
              SELECT user_id
              FROM public.sales_person
              WHERE LOWER(industry) = LOWER($${p - 1})
              AND LOWER(branch) = LOWER($${p})
              AND LOWER(role_name) = 'sales staff'
            )
          )
        `);
      } else if (canViewOwnTickets && userId) {
        ticketQueryParams.push(userId);

        conditions.push(`
          t.assigned_user_id = $${ticketQueryParams.length}
        `);
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden",
          },
          {
            status: 403,
          }
        );
      }
    }

    // ====================================================
    // FILTER: CONSENT
    // ====================================================

    if (consent !== null && consent !== "") {
      ticketQueryParams.push(consent === "true");

      conditions.push(`
        i.consent_to_contact = $${ticketQueryParams.length}
      `);
    }

    // ====================================================
    // FILTER: STATUS
    // ====================================================

    if (convertedToErp !== null && convertedToErp !== "") {
      ticketQueryParams.push(convertedToErp === "true");

      conditions.push(`
        t.converted_to_erp = $${ticketQueryParams.length}
      `);
    }

    // FILTER: CONVERTED TO ERP
    if (convertedToErp !== null && convertedToErp !== "") {
      ticketQueryParams.push(convertedToErp === "true");

      conditions.push(`
        t.converted_to_erp = $${ticketQueryParams.length}
      `);
    }

    // FILTER: ASSIGNED TO
    // assigned_to=null berarti ticket belum di-assign

    if (assignedTo === "null") {
      conditions.push(`
        t.assigned_user_id IS NULL
      `);
    } else if (assignedTo !== null && assignedTo !== "") {
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
    } else if (startDate) {
      ticketQueryParams.push(startDate);

      conditions.push(`
        DATE(t.created_at) >= $${ticketQueryParams.length}
      `);
    } else if (endDate) {
      ticketQueryParams.push(endDate);

      conditions.push(`
        DATE(t.created_at) <= $${ticketQueryParams.length}
      `);
    }

    // ====================================================
    // APPLY CONDITIONS
    // ====================================================

    if (conditions.length > 0) {
      ticketsQuery += `
        WHERE ${conditions.join(" AND ")}
      `;
    }

    // ====================================================
    // ORDER
    // ====================================================

    ticketsQuery += `
      ORDER BY COALESCE(t.updated_at, t.created_at) DESC NULLS LAST;
    `;

    // ====================================================
    // EXECUTE TICKETS QUERY
    // ====================================================

    const ticketsResult = await db.query(ticketsQuery, ticketQueryParams);

    console.log("QUERY:");
    console.log(ticketsQuery);

    console.log("PARAMS:");
    console.log(ticketQueryParams);

    console.log("ROWS:");
    console.log(ticketsResult.rows);

    // ====================================================
    // STATS QUERY
    // Ini juga dipakai untuk list dropdown assigned sales
    // ====================================================

    let statsQuery = "";
    const statsQueryParams: any[] = [];

    // SALES STAFF
    // VIEW OWN
    if (!canViewAllTickets && !canViewTeamTickets && canViewOwnTickets && userId) {
      statsQuery = `
        SELECT
          u.user_id,
          u.user_name,
          COUNT(DISTINCT CASE WHEN t.status IN (1, 2) THEN t.ticket_id END)::int AS assigned_tickets_count,
          COUNT(DISTINCT CASE WHEN t.status = 1 THEN t.ticket_id END)::int AS new_tickets_count,
          COUNT(DISTINCT CASE WHEN t.status = 2 THEN t.ticket_id END)::int AS in_progress_tickets_count

        FROM public."users" u

        LEFT JOIN public.ticket t
        ON u.user_id = t.assigned_user_id

        WHERE u.user_id = $1

        GROUP BY u.user_id, u.user_name;
      `;

      statsQueryParams.push(userId);
    }

    // VIEW TEAM
    else if (!canViewAllTickets && canViewTeamTickets && industry && branch) {
      statsQuery = `
        SELECT
          u.user_id,
          u.user_name,
          COUNT(DISTINCT CASE WHEN t.status IN (1, 2) THEN t.ticket_id END)::int AS assigned_tickets_count,
          COUNT(DISTINCT CASE WHEN t.status = 1 THEN t.ticket_id END)::int AS new_tickets_count,
          COUNT(DISTINCT CASE WHEN t.status = 2 THEN t.ticket_id END)::int AS in_progress_tickets_count

        FROM public."users" u

        INNER JOIN public.sales_person sp
        ON u.user_id = sp.user_id

        LEFT JOIN public.ticket t
        ON u.user_id = t.assigned_user_id

        WHERE LOWER(sp.industry) = LOWER($1)
        AND LOWER(sp.branch) = LOWER($2)
        AND LOWER(sp.role_name) = 'sales staff'

        GROUP BY u.user_id, u.user_name

        ORDER BY u.user_name ASC;
      `;

      statsQueryParams.push(industry, branch);
    }

    // VIEW ALL
    else if (canViewAllTickets) {
      statsQuery = `
        SELECT
          u.user_id,
          u.user_name,
          COUNT(DISTINCT CASE WHEN t.status IN (1, 2) THEN t.ticket_id END)::int AS assigned_tickets_count,
          COUNT(DISTINCT CASE WHEN t.status = 1 THEN t.ticket_id END)::int AS new_tickets_count,
          COUNT(DISTINCT CASE WHEN t.status = 2 THEN t.ticket_id END)::int AS in_progress_tickets_count

        FROM public."users" u

        INNER JOIN public.sales_person sp
        ON u.user_id = sp.user_id

        LEFT JOIN public.ticket t
        ON u.user_id = t.assigned_user_id

        WHERE LOWER(sp.role_name) = 'sales staff'

        GROUP BY u.user_id, u.user_name

        ORDER BY u.user_name ASC;
      `;
    }

    // ====================================================
    // EXECUTE STATS
    // ====================================================

    const statsResult = await db.query(statsQuery, statsQueryParams);

    const salesUsers = statsResult.rows.map((user) => ({
      user_id: user.user_id,
      user_name: user.user_name,
    }));

    console.log("ROLE:", roleName);
    console.log("CLEAN ROLE:", cleanRole);
    console.log("INDUSTRY:", industry);
    console.log("BRANCH:", branch);
    console.log("STATS:", statsResult.rows);
    console.log("SALES USERS:", salesUsers);

    // ====================================================
    // RESPONSE
    // ====================================================

    return NextResponse.json({
      success: true,
      tickets: ticketsResult.rows,
      stats: statsResult.rows,
      salesUsers,
    });
  } catch (error: any) {
    console.error("Database Error (GET Tickets Final):", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(req: Request) {
  let transactionStarted = false;

  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const userPermissions = await getPermissionKeysBySessionUser(session.user);

    if (!hasPermission(userPermissions, "ticket.create")) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    const body = await req.json();

    const {
      company,
      name,
      email,
      phone,
      location,
      industry,
      industryScale,
      type,
      productInquiry,
      reason,
      consent,
    } = body;

    if (!company || !name || !email || !type) {
      return NextResponse.json(
        {
          success: false,
          error: "Company, requester name, email, and type are required",
        },
        {
          status: 400,
        }
      );
    }

    if (!["Lead", "Principal"].includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid ticket type",
        },
        {
          status: 400,
        }
      );
    }

    await db.query("BEGIN");
    transactionStarted = true;

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
        consent_to_contact,
        type
      )
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING inquiry_id
      `,
      [
        company,
        name,
        email,
        phone || null,
        location || null,
        industry || null,
        industryScale || null,
        productInquiry || null,
        reason || null,
        Boolean(consent),
        type,
      ]
    );

    const inquiryId = inquiryResult.rows[0].inquiry_id;

    const assignedUserId = null;

    await db.query(
      `
      INSERT INTO public.ticket
      (
        inquiry_id,
        status,
        assigned_user_id,
        converted_to_erp
      )
      VALUES
      ($1, $2, $3, $4)
      ON CONFLICT ON CONSTRAINT ticket_inquiry_id_unique
      DO NOTHING
      `,
      [
        inquiryId,
        1,
        assignedUserId,
        false,
      ]
    );

    await db.query("COMMIT");
    transactionStarted = false;

    return NextResponse.json({
      success: true,
      message: "Ticket created successfully",
      inquiry_id: inquiryId,
    });
  } catch (error: any) {
    if (transactionStarted) {
      await db.query("ROLLBACK");
    }

    console.error("Database Error (POST Ticket):", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}