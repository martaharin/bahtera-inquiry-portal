import { db } from "@/lib/db";

export async function updateAnalyticsFromTicket(ticketId: string) {

  const result = await db.query(
    `
    SELECT

        t.inquiry_id,
        t.status,
        t.converted_to_erp,

        u.user_name,

        sp.industry,
        sp.branch

    FROM public.ticket t

    LEFT JOIN public."users" u
        ON t.assigned_user_id = u.user_id

    LEFT JOIN public.sales_person sp
        ON u.user_id = sp.user_id

    WHERE t.ticket_id = $1

    LIMIT 1
    `,
    [ticketId]
  );

  if (result.rowCount === 0) {
    return;
  }

  const row = result.rows[0];

  await db.query(
    `
    UPDATE analytics_dashboard

    SET

        ticket_status = $2,

        assigned_sales = $3,

        sales_industry = $4,

        sales_branch = $5,

        converted_to_erp = $6,

        updated_at = CURRENT_TIMESTAMP

    WHERE inquiry_id = $1
    `,
    [
      row.inquiry_id,
      row.status,
      row.user_name,
      row.industry,
      row.branch,
      row.converted_to_erp,
    ]
  );

}