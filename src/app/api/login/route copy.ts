import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// export async function POST(request: Request) {
//   try {
//     const body = await request.json();

//     const email = body.email?.trim();
//     const password = body.password;

//     // console.log("LOGIN REQUEST RAW:", body);
//     // console.log("EMAIL AFTER TRIM:", `[${email}]`);

//     const result = await db.query(
//       `SELECT u.*
//        FROM users u 
//        WHERE LOWER(u.user_email) = LOWER('admin@company.com')`,
//       // [email]
//     );

//     console.log("QUERY RESULT ROWS:", result);

//     const user = result.rows[0];

//     console.log("USER FOUND:", user);

//     // if (!user) {
//     //   return NextResponse.json(
//     //     { error: "User tidak ditemukan" },
//     //     { status: 401 }
//     //   );
//     // }

//     // if (user.password?.trim() !== password?.trim()) {
//     //   return NextResponse.json(
//     //     { error: "Password salah" },
//     //     { status: 401 }
//     //   );
//     // }

//     // return NextResponse.json({
//     //   message: "Login Berhasil",
//     //   user: {
//     //     id: user.user_id,
//     //     name: user.user_name,
//     //     role: user.role_name || "No Role",
//     //   },
//     // });

//   } catch (error: any) {
//     console.error("LOGIN ERROR:", error);

//     return NextResponse.json(
//       { error: error.message },
//       { status: 500 }
//     );
//   };
// }
export async function GET(request: Request) {
  try {

    // console.log("LOGIN BODY:", body);
    // console.log("EMAIL:", email);

    const result = await db.query(
      `
      SELECT *
      FROM ticket
      `
    );

    // console.log("RAW RESULT:", result);

    // // 🔥 SAFE HANDLING (INI PENTING)
    // const rows = result?.rows ?? result ?? [];

    // console.log("ROWS NORMALIZED:", rows);

    // const user = rows[0];

    console.log("USER FOUND:", "user");

    return NextResponse.json({
      debug: true,
      // rawResult: result,
      // rows: rows,
      // user: user,
    });

  } catch (error: any) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = body.email?.trim();
    const password = body.password;

    // console.log("LOGIN BODY:", body);
    // console.log("EMAIL:", email);

    const result = await db.query(
      `
      SELECT u.*
      FROM users u
      WHERE u.user_email = 'admin@company.com'
      `
    );

    console.log("RAW RESULT:", result);

    // 🔥 SAFE HANDLING (INI PENTING)
    const rows = result?.rows ?? result ?? [];

    console.log("ROWS NORMALIZED:", rows);

    const user = rows[0];

    console.log("USER FOUND:", user);

    return NextResponse.json({
      debug: true,
      rawResult: result,
      rows: rows,
      user: user,
    });

  } catch (error: any) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}