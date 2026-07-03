import { db } from "@/lib/db";
import { classifyIndustry } from "./classifyIndustry";

export async function syncAnalytics(inquiryId: string) {
  // ======================================================
  // GET INQUIRY
  // ======================================================

  const inquiry = await db.query(
    `
    SELECT *
    FROM inquiry
    WHERE inquiry_id = $1
    `,
    [inquiryId]
  );

  if (inquiry.rowCount === 0) {
    return;
  }

  const row = inquiry.rows[0];

  // ======================================================
  // AI ANALYSIS
  // ======================================================

  const ai = await classifyIndustry(row);

  // ======================================================
  // INSERT / UPDATE ANALYTICS DASHBOARD
  // ======================================================

  await db.query(
    `
    INSERT INTO analytics_dashboard
    (
      inquiry_id,
      company,
      customer_industry,
      bahtera_industry,
      product_inquiry,
      reason_for_inquiry,
      location,
      inquiry_date,

      month,
      quarter,
      year,
      week,

      classification_confidence,
      classification_reason,

      sentiment,
      urgency,
      sales_priority,

      ai_summary,
      insight_category,
      product_trend,
      business_solution,

      ticket_status,
      assigned_sales,
      sales_industry,
      sales_branch,
      converted_to_erp,

      created_at,
      updated_at
    )

    VALUES
    (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,

      EXTRACT(MONTH FROM $8),
      EXTRACT(QUARTER FROM $8),
      EXTRACT(YEAR FROM $8),
      EXTRACT(WEEK FROM $8),

      $9,
      $10,

      $11,
      'Medium',
      'Warm',

      $12,
      $13,
      $14,
      $15,

      1,
      NULL,
      NULL,
      NULL,
      FALSE,

      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )

    ON CONFLICT (inquiry_id)

    DO UPDATE SET

      company = EXCLUDED.company,

      customer_industry = EXCLUDED.customer_industry,

      bahtera_industry = EXCLUDED.bahtera_industry,

      product_inquiry = EXCLUDED.product_inquiry,

      reason_for_inquiry = EXCLUDED.reason_for_inquiry,

      location = EXCLUDED.location,

      inquiry_date = EXCLUDED.inquiry_date,

      month = EXCLUDED.month,

      quarter = EXCLUDED.quarter,

      year = EXCLUDED.year,

      week = EXCLUDED.week,

      classification_confidence = EXCLUDED.classification_confidence,

      classification_reason = EXCLUDED.classification_reason,

      sentiment = EXCLUDED.sentiment,

      urgency = EXCLUDED.urgency,

      sales_priority = EXCLUDED.sales_priority,

      ai_summary = EXCLUDED.ai_summary,

      insight_category = EXCLUDED.insight_category,

      product_trend = EXCLUDED.product_trend,

      business_solution = EXCLUDED.business_solution,

      updated_at = CURRENT_TIMESTAMP
    `,
    [
      row.inquiry_id,

      row.company,

      row.industry,

      ai.bahtera_industry,

      row.product_inquiry,

      row.reason_for_inquiry,

      row.location,

      row.created_at,

      ai.classification_confidence,

      ai.classification_reason,

      ai.sentiment,

      ai.ai_summary,

      ai.insight_category,

      ai.product_trend,

      ai.business_solution,
    ]
  );
}