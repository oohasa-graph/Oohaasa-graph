import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { createFortuneRepository } from "@/db/repository";
import { SOURCES, type Source } from "@/features/fortune/domain";
import { SOURCE_URLS } from "@/features/fortune/source-urls";
import { deriveEditionDate, parseSnapshotUrl } from "@/features/backfill/snapshot";
import { fetchJson, fetchText } from "@/features/ingestion/http";
import { isAuthorized } from "@/features/ingestion/request-auth";
import {
  ingestSource,
  type IngestSourceInput,
  type IngestionResult,
  type SourceClients,
} from "@/features/ingestion/service";
import { getJstDate } from "@/lib/time/jst";
import { getIngestionEnv } from "@/lib/env";

export const runtime = "nodejs";

const bodySchema = z.object({
  attempt: z.enum(["primary", "retry_1", "retry_2", "final", "manual", "backfill"]),
  source: z.enum(["all", ...SOURCES]),
  force: z.boolean(),
  sourceBody: z.union([z.string().min(1), z.array(z.unknown())]).optional(),
  snapshotUrl: z.string().max(2048).optional(),
}).refine((body) => body.sourceBody === undefined ||
  (body.source !== "all" && (body.source === "gogo") === (typeof body.sourceBody === "string")))
  .refine((body) => body.attempt === "backfill"
    ? body.source !== "all" && body.snapshotUrl !== undefined && body.sourceBody !== undefined
    : body.snapshotUrl === undefined);

type RequestBody = z.infer<typeof bodySchema>;
type HandlerIngestInput = Pick<
  IngestSourceInput,
  "source" | "targetDate" | "attempt" | "force" | "sourceResponse" | "snapshotUrl"
>;
type HandlerIngest = (input: HandlerIngestInput) => Promise<IngestionResult>;

type HandlerDependencies = {
  ingest: HandlerIngest;
  now: () => Date;
  secret: string;
};

const unresolvedFinalStatuses = new Set(["stale", "invalid", "fetch_error"]);

function selectedSources(source: RequestBody["source"]): Source[] {
  return source === "all" ? [...SOURCES] : [source];
}

async function parseBody(request: Request): Promise<RequestBody | null> {
  try {
    const text = await request.text();
    if (text.length > 1_000_000) return null;
    return bodySchema.parse(JSON.parse(text));
  } catch {
    return null;
  }
}

export function createSourceClients(userAgent: string): SourceClients {
  return {
    ohaasa: {
      fetch: () => fetchJson(SOURCE_URLS.ohaasa, userAgent),
    },
    gogo: {
      fetch: () => fetchText(SOURCE_URLS.gogo, userAgent),
    },
  };
}

export function createPostHandler(dependencies: HandlerDependencies) {
  return async function post(request: Request): Promise<Response> {
    if (!isAuthorized(request, dependencies.secret)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await parseBody(request);
    if (!body) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    let targetDate = getJstDate(dependencies.now());
    if (body.attempt === "backfill" && body.source !== "all") {
      const snapshot = parseSnapshotUrl(body.snapshotUrl ?? "");
      if (!snapshot || snapshot.originalUrl !== SOURCE_URLS[body.source]) {
        return NextResponse.json({ error: "invalid_snapshot" }, { status: 400 });
      }
      targetDate = deriveEditionDate(body.source, body.sourceBody, snapshot.capturedJstDate) ?? snapshot.capturedJstDate;
    }
    const results = await Promise.all(
      selectedSources(body.source).map((source) =>
        dependencies.ingest({
          source,
          targetDate,
          attempt: body.attempt,
          force: body.force,
          ...(body.snapshotUrl === undefined ? {} : { snapshotUrl: body.snapshotUrl }),
          ...(body.sourceBody === undefined ? {} : {
            sourceResponse: { body: body.sourceBody, httpStatus: 200 },
          }),
        }),
      ),
    );

    const unresolved =
      (body.attempt === "final" || body.attempt === "manual") &&
      results.some((result) => unresolvedFinalStatuses.has(result.status));

    return NextResponse.json(
      { targetDate, results },
      { status: unresolved ? 424 : 200 },
    );
  };
}

function createProductionIngest(clients: SourceClients): HandlerIngest {
  const repository = createFortuneRepository(getDb());
  return (input) =>
    ingestSource({
      ...input,
      repository,
      clients,
      now: () => new Date(),
    });
}

export const POST = (request: Request) => {
  const env = getIngestionEnv();
  return createPostHandler({
    ingest: createProductionIngest(createSourceClients(env.SOURCE_USER_AGENT)),
    now: () => new Date(),
    secret: env.INGEST_SECRET,
  })(request);
};
