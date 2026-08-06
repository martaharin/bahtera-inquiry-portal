import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});

export async function GET() {
  try {
    const res = await pool.query(`
      SELECT product_name, industry, company, inquiry_id
      FROM ml_extracted_products
      ORDER BY id DESC;
    `);

    return NextResponse.json({
      success: true,
      products: res.rows || []
    });
  } catch (error: any) {
    console.error("Extracted Products API Error:", error);
    return NextResponse.json({ success: false, products: [], error: error.message }, { status: 500 });
  }
}