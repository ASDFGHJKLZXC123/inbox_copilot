import { z } from "zod";
import { NextResponse } from "next/server";

export async function parseBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return {
        data: null,
        error: NextResponse.json(
          { error: "Validation failed", issues: result.error.issues },
          { status: 400 }
        )
      };
    }
    return { data: result.data, error: null };
  } catch {
    return {
      data: null,
      error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    };
  }
}
