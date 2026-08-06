// import { db } from "@/lib/db";
// import { NextResponse, NextRequest } from "next/server";
// import { encrypt } from "@/lib/session";

export async function POST() {
  return Response.json({ error: "Not implemented" }, { status: 501 });
}

// export async function POST(request: NextRequest) {
//   try {
//     const { email, password } = await request.json();

//     const result = await db.query(
//       `
//       SELECT
//           u.user_id,
//           u.user_name,
//           u.password,
//           r.role_name AS master_role,
//           sp.role_name AS sales_role,
//           sp.industry,
//           sp.branch
//       FROM public.users u
//       JOIN public.role r
//         ON u.role_id = r.role_id
//       LEFT JOIN public.sales_person sp
//         ON u.user_id = sp.user_id
//       WHERE LOWER(u.user_email) = LOWER($1)
//       LIMIT 1
//       `,
//       [email],
//     );

//     const user = result.rows[0];

//     if (!user || user.password !== password) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: "Email atau Password salah",
//         },
//         {
//           status: 401,
//         },
//       );
//     }

//     const finalRoleName = user.sales_role || user.master_role;

//     // Encrypt session payload
//     const session = await encrypt({
//       user_id: user.user_id,
//       user_name: user.user_name,
//       role_name: finalRoleName,
//       industry: user.industry,
//       branch: user.branch,
//     });

//     const response = NextResponse.json({
//       success: true,
//       message: "Login Berhasil",
//       user: {
//         user_id: user.user_id,
//         user_name: user.user_name,
//         role_name: finalRoleName,
//         industry: user.industry,
//         branch: user.branch,
//       },
//     });

//     // Single encrypted session cookie
//     response.cookies.set("session", session, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "lax",
//       path: "/",
//       maxAge: 60 * 60 * 24, // 1 hari
//     });

//     return response;
//   } catch (error: any) {
//     console.error("LOGIN API ERROR:", error);

//     return NextResponse.json(
//       {
//         success: false,
//         error: error.message,
//       },
//       {
//         status: 500,
//       },
//     );
//   }
// }
