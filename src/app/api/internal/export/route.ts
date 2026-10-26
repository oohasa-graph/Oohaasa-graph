import { z } from "zod";
import { getDb } from "@/db/client";
import { createFortuneRepository, type ExportedEdition } from "@/db/repository";
import { isAuthorized } from "@/features/ingestion/request-auth";
import { getIngestionEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const windowSchema = z.object({ from: z.iso.date(), to: z.iso.date() })
  .refine(({ from, to }) => from <= to && (Date.parse(to) - Date.parse(from)) / 864e5 <= 399);

export function createGetHandler(deps: {
  listEditions: (from: string, to: string) => Promise<ExportedEdition[]>;
  secret: string;
}) {
  return async (request: Request): Promise<Response> => {
    const headers = { "Cache-Control": "no-store" };
    if (!isAuthorized(request, deps.secret)) return Response.json({ error: "unauthorized" }, { status: 401, headers });
    let params: URLSearchParams;
    try {
      params = new URL(request.url).searchParams;
    } catch {
      return Response.json({ error: "invalid_window" }, { status: 400, headers });
    }
    const parsed = windowSchema.safeParse({ from: params.get("from"), to: params.get("to") });
    if (!parsed.success) return Response.json({ error: "invalid_window" }, { status: 400, headers });
    const { from, to } = parsed.data;
    try {
      const editions = await deps.listEditions(from, to);
      return Response.json({ from, to, editions }, { headers });
    } catch {
      // Never expose database errors: they can contain fortune text.
      return Response.json({ error: "export_failed" }, { status: 500, headers });
    }
  };
}

export const GET = (request: Request) => {
  const repository = createFortuneRepository(getDb());
  return createGetHandler({ listEditions: repository.listEditions, secret: getIngestionEnv().INGEST_SECRET })(request);
};
