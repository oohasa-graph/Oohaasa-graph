import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { createFortuneRepository } from "@/db/repository";
import { SOURCES, type Source } from "@/features/fortune/domain";
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

const OHAASA_URL = "https://www.asahi.co.jp/data/ohaasa2020/horoscope.json";
const GOGO_URL = "https://www.tv-asahi.co.jp/goodmorning/uranai/";

const bodySchema = z.object({
  attempt: z.enum(["primary", "retry_1", "retry_2", "final", "manual"]),
  source: z.enum(["all", ...SOURCES]),
  force: z.boolean(),
});

type RequestBody = z.infer<typeof bodySchema>;
type HandlerIngestInput = Pick<
  IngestSourceInput,
  "source" | "targetDate" | "attempt" | "force"
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
    return bodySchema.parse(await request.json());
  } catch {
    return null;
  }
}

export function createSourceClients(userAgent: string): SourceClients {
  return {
    ohaasa: {
      fetch: () => fetchJson(OHAASA_URL, userAgent),
    },
    gogo: {
      fetch: () => fetchText(GOGO_URL, userAgent),
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

    const targetDate = getJstDate(dependencies.now());
    const results = await Promise.all(
      selectedSources(body.source).map((source) =>
        dependencies.ingest({
          source,
          targetDate,
          attempt: body.attempt,
          force: body.force,
        }),
      ),
    );

    const finalUnresolved =
      body.attempt === "final" &&
      results.some((result) => unresolvedFinalStatuses.has(result.status));

    return NextResponse.json(
      { targetDate, results },
      { status: finalUnresolved ? 424 : 200 },
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
