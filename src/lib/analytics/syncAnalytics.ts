import { db } from "@/lib/db";
import { classifyIndustry } from "./classifyIndustry";

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

export async function syncAnalytics() {
  try {
    // ===========================
    // Ambil inquiry yang belum diproses
    // ===========================

    const result = await db.query(`
      SELECT
        inquiry_id,
        company,
        industry,
        product_inquiry,
        reason_for_inquiry,
        location,
        created_at
      FROM inquiry
WHERE inquiry_id NOT IN (
    SELECT inquiry_id
    FROM analytics_dashboard
)
ORDER BY created_at ASC
LIMIT 5
    `);

    const inquiries = result.rows;

    console.log(`Found ${inquiries.length} inquiry(s) to process`);

    let successCount = 0;
    let failedCount = 0;

    // ===========================
    // Loop seluruh inquiry
    // ===========================

    for (const inquiry of inquiries) {
      try {
        console.log(
          `Processing Inquiry : ${inquiry.inquiry_id}`
        );

        // ===========================
        // AI Classification
        // ===========================

        const aiResult = await classifyIndustry({
          product_inquiry: inquiry.product_inquiry,
          reason_for_inquiry: inquiry.reason_for_inquiry,
        });

        console.log(aiResult);

        // ===========================
        // Date Dimension
        // ===========================

        const inquiryDate = new Date(inquiry.created_at);

        const month = inquiryDate.getMonth() + 1;
        const quarter = Math.ceil(month / 3);
        const year = inquiryDate.getFullYear();
        const week = Math.ceil(inquiryDate.getDate() / 7);

        const monthName = inquiryDate.toLocaleString("en-US", {
          month: "long",
        });

        const dayName = inquiryDate.toLocaleString("en-US", {
          weekday: "long",
        });

        const hour = inquiryDate.getHours();

        const createdDate = inquiryDate
          .toISOString()
          .split("T")[0];

        // ===========================
        // Insert Analytics Dashboard
        // ===========================

        await db.query(
          `
          INSERT INTO analytics_dashboard (

            inquiry_id,
            company,
            customer_industry,
            bahtera_industry,
            product_inquiry,
            reason_for_inquiry,
            location,
            inquiry_date,
            month,
            inquiry_month_name,
            quarter,
            year,
            week,
            inquiry_day_name,
            inquiry_hour,
            created_date,
            classification_confidence,
            classification_reason,
            sentiment,
            urgency,
            sales_priority

          )

          VALUES (

            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
            $11,$12,$13,$14,$15,$16,$17,$18,
            $19,$20,$21

          )
          `,
          [
            inquiry.inquiry_id,
            inquiry.company,
            inquiry.industry,
            aiResult.bahtera_industry,
            inquiry.product_inquiry,
            inquiry.reason_for_inquiry,
            inquiry.location,
            inquiry.created_at,
            month,
            monthName,
            quarter,
            year,
            week,
            dayName,
            hour,
            createdDate,
            aiResult.classification_confidence,
            aiResult.classification_reason,
            aiResult.sentiment,
            aiResult.urgency,
            aiResult.sales_priority,
          ]
        );

        successCount++;

console.log(
  `✅ Inquiry ${inquiry.inquiry_id} synchronized`
);

await sleep(3000);

      } catch (error) {

        failedCount++;

        console.error(
          `❌ Failed Inquiry ${inquiry.inquiry_id}`,
          error
        );

      }
    }

    // ===========================
    // Result
    // ===========================

    return {
      success: true,
      total: inquiries.length,
      success_count: successCount,
      failed_count: failedCount,
    };

  } catch (error) {

    console.error("SYNC ERROR :", error);

    throw error;

  }
}