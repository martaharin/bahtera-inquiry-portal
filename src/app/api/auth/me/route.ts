import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const email = cookieStore.get("email")?.value;

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "No session",
        },
        { status: 401 }
      );
    }

    // PERBAIKAN QUERY: Menggunakan nama tabel 'public.role' (tanpa s)
    const result = await db.query(
      `
      SELECT 
        u.user_id,
        u.user_name,
        u.role_id,
        r.role_name,  -- <-- Mengambil nama role asli langsung dari tabel role
        u.user_email
      FROM public.users u
      INNER JOIN public.role r ON u.role_id = r.role_id  -- <-- Diubah dari public.roles menjadi public.role
      WHERE LOWER(u.user_email) = LOWER($1)
      LIMIT 1
      `,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User tidak ditemukan",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });

  } catch (error: any) {
    console.error("AUTH ME ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}