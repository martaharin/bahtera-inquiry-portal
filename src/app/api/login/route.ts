import { dbQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const result = await dbQuery(
      `SELECT u.*, r.role_name 
       FROM users u 
       JOIN role r ON u.role_id = r.role_id 
       WHERE u.user_email = $1`, 
      [email]
    );

    const user = result.rows[0];

    if (user && user.password === password) {
      return NextResponse.json({
        message: "Login Berhasil",
        user: {
          id: user.user_id,
          name: user.user_name,
          role: user.role_name // Mengambil nama role (contoh: Admin), bukan angkanya saja
        }
      });
    }

    return NextResponse.json({ error: "Email atau Password salah" }, { status: 401 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}