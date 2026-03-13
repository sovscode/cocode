import { createClient } from "@/utils/supabase/server";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: number }> }) {
  const supabase = await createClient(await cookies())
  const { code } = await params
}
