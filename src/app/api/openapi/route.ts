import { createOpenApiDocument } from "@/lib/openapi";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(createOpenApiDocument(), {
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return Response.json({ error: "The API schema could not be generated from the current validators." }, {
      status: 500,
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  }
}
