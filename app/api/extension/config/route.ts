import { NextResponse } from "next/server";

// Public config consumed by the Chrome extension so it doesn't need to
// hardcode Supabase credentials. These values are the same public,
// publishable values already exposed to the browser on the website —
// nothing secret lives here.
export async function GET() {
  return NextResponse.json({
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    MEETINGS_ENDPOINT: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/meetings`,
  });
}