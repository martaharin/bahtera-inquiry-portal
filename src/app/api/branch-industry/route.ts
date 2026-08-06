import { db } from "@/lib/db";
import { NextResponse } from "next/server";
<<<<<<< HEAD
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  getPermissionKeysBySessionUser,
  hasPermission,
} from "@/lib/permissions";

async function getUserPermissions() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      permissions: [],
      response: NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      ),
    };
  }

  const permissions = await getPermissionKeysBySessionUser(session.user);

  return {
    permissions,
    response: null,
  };
}

export async function GET() {
  try {
    const { permissions, response } = await getUserPermissions();

    if (response) return response;

    if (!hasPermission(permissions, "branch_industry.view")) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        { status: 403 }
      );
    }

=======

export async function GET() {
  try {
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
    const result = await db.query(`
      SELECT
        b.branch_id,
        b.branch_name,
        COALESCE(
          json_agg(
            json_build_object(
              'industry_id', i.industry_id,
              'industry_name', i.industry_name
            )
            ORDER BY i.industry_name ASC
          ) FILTER (WHERE i.industry_id IS NOT NULL),
          '[]'::json
        ) AS industries
      FROM public.branch b
      LEFT JOIN public.branch_industry bi
        ON b.branch_id = bi.branch_id
      LEFT JOIN public.industry i
        ON bi.industry_id = i.industry_id
      GROUP BY b.branch_id, b.branch_name
      ORDER BY
        CASE WHEN LOWER(b.branch_name) = 'all' THEN 0 ELSE 1 END,
        b.branch_name ASC;
    `);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error("ERROR FETCH BRANCH INDUSTRY:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data branch dan industry" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
<<<<<<< HEAD
    const { permissions, response } = await getUserPermissions();

    if (response) return response;

    if (!hasPermission(permissions, "branch_industry.create")) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        { status: 403 }
      );
    }

=======
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
    const body = await req.json();
    const { action, branch_name, branch_id, industry_name } = body;

    if (action === "add_branch") {
      if (!branch_name || !branch_name.trim()) {
        return NextResponse.json(
          { success: false, error: "Branch name wajib diisi" },
          { status: 400 }
        );
      }

      const result = await db.query(
        `
        WITH existing_branch AS (
          SELECT branch_id, branch_name
          FROM public.branch
          WHERE LOWER(TRIM(branch_name)) = LOWER(TRIM($1))
          LIMIT 1
        ),
        inserted_branch AS (
          INSERT INTO public.branch (branch_name)
          SELECT TRIM($1)
          WHERE NOT EXISTS (SELECT 1 FROM existing_branch)
          RETURNING branch_id, branch_name
        )
        SELECT branch_id, branch_name FROM existing_branch
        UNION ALL
        SELECT branch_id, branch_name FROM inserted_branch
        LIMIT 1;
        `,
        [branch_name]
      );

      return NextResponse.json({
        success: true,
        data: result.rows[0],
      });
    }

    if (action === "add_industry_to_branch") {
      if (!branch_id) {
        return NextResponse.json(
          { success: false, error: "Branch wajib dipilih" },
          { status: 400 }
        );
      }

      if (!industry_name || !industry_name.trim()) {
        return NextResponse.json(
          { success: false, error: "Industry name wajib diisi" },
          { status: 400 }
        );
      }

      const result = await db.query(
        `
        WITH existing_industry AS (
          SELECT industry_id, industry_name
          FROM public.industry
          WHERE LOWER(TRIM(industry_name)) = LOWER(TRIM($2))
          LIMIT 1
        ),
        inserted_industry AS (
          INSERT INTO public.industry (industry_name)
          SELECT TRIM($2)
          WHERE NOT EXISTS (SELECT 1 FROM existing_industry)
          RETURNING industry_id, industry_name
        ),
        final_industry AS (
          SELECT industry_id, industry_name FROM existing_industry
          UNION ALL
          SELECT industry_id, industry_name FROM inserted_industry
        ),
        inserted_relation AS (
          INSERT INTO public.branch_industry (branch_id, industry_id)
          SELECT $1, fi.industry_id
          FROM final_industry fi
          WHERE NOT EXISTS (
            SELECT 1
            FROM public.branch_industry bi
            WHERE bi.branch_id = $1
            AND bi.industry_id = fi.industry_id
          )
          RETURNING branch_id, industry_id
        )
        SELECT industry_id, industry_name
        FROM final_industry
        LIMIT 1;
        `,
        [branch_id, industry_name]
      );

      return NextResponse.json({
        success: true,
        data: result.rows[0],
      });
    }

    return NextResponse.json(
      { success: false, error: "Action tidak dikenali" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("ERROR SAVE BRANCH INDUSTRY:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan data branch dan industry" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
<<<<<<< HEAD
    const { permissions, response } = await getUserPermissions();

    if (response) return response;

    if (!hasPermission(permissions, "branch_industry.delete")) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        { status: 403 }
      );
    }

=======
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const branchId = searchParams.get("branch_id");
    const industryId = searchParams.get("industry_id");

    if (type === "branch") {
      if (!branchId) {
        return NextResponse.json(
          { success: false, error: "Branch ID wajib diisi" },
          { status: 400 }
        );
      }

      await db.query(
        `
        DELETE FROM public.branch
        WHERE branch_id = $1;
        `,
        [branchId]
      );

      return NextResponse.json({
        success: true,
        message: "Branch berhasil dihapus",
      });
    }

    if (type === "relation") {
      if (!branchId || !industryId) {
        return NextResponse.json(
          { success: false, error: "Branch ID dan Industry ID wajib diisi" },
          { status: 400 }
        );
      }

      await db.query(
        `
        DELETE FROM public.branch_industry
        WHERE branch_id = $1
        AND industry_id = $2;
        `,
        [branchId, industryId]
      );

      return NextResponse.json({
        success: true,
        message: "Industry berhasil dihapus dari branch",
      });
    }

    return NextResponse.json(
      { success: false, error: "Type delete tidak dikenali" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("ERROR DELETE BRANCH INDUSTRY:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus data branch atau industry" },
      { status: 500 }
    );
  }
}