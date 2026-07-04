import { db } from "@/lib/db";

export async function generateInsight() {

    // hapus insight lama
    await db.query(`
        DELETE FROM ai_insight
    `);

    // ==========================
    // TOTAL INQUIRY
    // ==========================

    await db.query(`
    INSERT INTO ai_insight
    (
        insight_type,
        title,
        value,
        created_at
    )
    SELECT
        'total_inquiry',
        'Total Inquiry',
        COUNT(*)::text,
        CURRENT_TIMESTAMP
    FROM analytics_dashboard
    `);

    // ==========================
    // POSITIVE
    // ==========================

    await db.query(`
    INSERT INTO ai_insight
    (
        insight_type,
        title,
        value,
        created_at
    )
    SELECT
        'positive',
        'Positive Inquiry',
        COUNT(*)::text,
        CURRENT_TIMESTAMP
    FROM analytics_dashboard
    WHERE sentiment='Positive'
    `);

    // ==========================
    // NEGATIVE
    // ==========================

    await db.query(`
    INSERT INTO ai_insight
    (
        insight_type,
        title,
        value,
        created_at
    )
    SELECT
        'negative',
        'Negative Inquiry',
        COUNT(*)::text,
        CURRENT_TIMESTAMP
    FROM analytics_dashboard
    WHERE sentiment='Negative'
    `);

    // ==========================
    // HOT LEAD
    // ==========================

    await db.query(`
    INSERT INTO ai_insight
    (
        insight_type,
        title,
        value,
        created_at
    )
    SELECT
        'hot',
        'Hot Lead',
        COUNT(*)::text,
        CURRENT_TIMESTAMP
    FROM analytics_dashboard
    WHERE sales_priority='Hot'
    `);

    // ==========================
    // HIGH URGENCY
    // ==========================

    await db.query(`
    INSERT INTO ai_insight
    (
        insight_type,
        title,
        value,
        created_at
    )
    SELECT
        'high_urgency',
        'High Urgency',
        COUNT(*)::text,
        CURRENT_TIMESTAMP
    FROM analytics_dashboard
    WHERE urgency='High'
    `);

    // ==========================
    // TOP INDUSTRY
    // ==========================

    await db.query(`
    INSERT INTO ai_insight
    (
        insight_type,
        title,
        value,
        created_at
    )
    SELECT
        'top_industry',
        bahtera_industry,
        COUNT(*)::text,
        CURRENT_TIMESTAMP
    FROM analytics_dashboard
    GROUP BY bahtera_industry
    ORDER BY COUNT(*) DESC
    LIMIT 1
    `);

    // ==========================
    // TOP LOCATION
    // ==========================

    await db.query(`
    INSERT INTO ai_insight
    (
        insight_type,
        title,
        value,
        created_at
    )
    SELECT
        'top_location',
        location,
        COUNT(*)::text,
        CURRENT_TIMESTAMP
    FROM analytics_dashboard
    GROUP BY location
    ORDER BY COUNT(*) DESC
    LIMIT 1
    `);

    // ==========================
    // TOP PRODUCT
    // ==========================

    await db.query(`
    INSERT INTO ai_insight
    (
        insight_type,
        title,
        value,
        created_at
    )
    SELECT
        'top_product',
        product_inquiry,
        COUNT(*)::text,
        CURRENT_TIMESTAMP
    FROM analytics_dashboard
    GROUP BY product_inquiry
    ORDER BY COUNT(*) DESC
    LIMIT 1
    `);

}