import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await db.query(
      `
      SELECT DISTINCT
        u.user_id,
        u.user_name,
        sp.role_name,
        sp.branch,
        sp.industry

      FROM public."users" u

      LEFT JOIN public.sales_person sp
      ON u.user_id = sp.user_id

      WHERE LOWER(sp.role_name) IN (
        'sales staff',
        'sales',
<<<<<<< HEAD
        'product team'
=======
        'product'
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
      )

      ORDER BY u.user_name ASC;
      `
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("ERROR FETCH USERS:", error);

    return NextResponse.json(
      { error: "Gagal mengambil data user" },
      { status: 500 }
    );
  }
}