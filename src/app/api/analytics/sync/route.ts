import { NextResponse, NextRequest } from "next/server";
import { syncAnalytics } from "@/lib/analytics/syncAnalytics";

export async function GET(request: NextRequest) {
  try {
    const inquiryId = request.nextUrl.searchParams.get("inquiryId");

    if (!inquiryId) {
      return NextResponse.json(
        { success: false, error: "Missing inquiryId" },
        { status: 400 }
      );
    }

    console.log("START SYNC API");

    const result = await syncAnalytics(inquiryId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}