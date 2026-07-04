import { NextResponse } from "next/server";
import { syncAnalytics } from "@/lib/analytics/syncAnalytics";

export async function GET() {
  try {
    console.log("START SYNC API");

    const result = await syncAnalytics();

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