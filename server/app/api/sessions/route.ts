import { createClient } from "@/utils/supabase/server";
import { randomInt } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';

export async function POST() {
  const code = randomInt(1000, 10000);

  const { id } = await prisma.session.create({
    data: { code }
  })

  console.log(`Created new session with id ${id} and code ${code}`)

  return NextResponse.json({ id, code })
}
