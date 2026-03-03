import { NextResponse } from "next/server";

import { clearStore, sanitizeStore } from "@/lib/db";

export async function DELETE(): Promise<NextResponse> {
  const store = await clearStore();
  return NextResponse.json(sanitizeStore(store));
}
