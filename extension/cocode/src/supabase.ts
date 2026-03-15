import * as dotenv from "dotenv";
import * as path from "path";

import { createClient } from "@supabase/supabase-js";
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "";

if (!supabaseUrl) {
  console.error("No supabase url provided");
}

if (!supabaseKey) {
  console.error("No supabase key provided");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
