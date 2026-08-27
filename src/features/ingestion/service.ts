import { createHash } from "node:crypto";

import type {
  FortuneRepository,
  IngestionErrorCode,
  RunResult,
} from "@/db/repository";
import type {
  IngestionAttempt,
  IngestionStatus,
  ParsedEdition,
  Source,
} from "@/features/fortune/domain";
import {
  InvalidEditionError,
  SourceFetchError,
  StaleSourceError,
} from "@/features/fortune/errors";
import { parseGogo } from "@/features/fortune/parsers/gogo";
import { parseOhaasa } from "@/features/fortune/parsers/ohaasa";
import { validateEdition } from "@/features/fortune/validate-edition";
import { isSourceExpected } from "@/features/ingestion/source-policy";

export type SourceResponse = { body: unknown; httpStatus: number };
export type SourceClient = {
  fetch(targetDate: string): Promise<SourceResponse>;
};
export type SourceClients = Record<Source, SourceClient>;

export type IngestSourceInput = {
  source: Source;
  targetDate: string;
  attempt: IngestionAttempt;
  force: boolean;
  repository: FortuneRepository;
  clients: SourceClients;
  now: () => Date;
};

export type IngestionResult = {
  source: Source;
  targetDate: string;
  status: IngestionStatus;
  sourceDate: string | null;
  runId: string;
  errorCode: IngestionErrorCode | null;
};

type ResultWithoutRunId = Omit<IngestionResult, "runId">;
type FinishMetadata = Pick<
  RunResult,
  "httpStatus" | "contentHash" | "finishedAt"
>;

function requireHtml(body: unknown): string {
  if (typeof body !== "string") {
    throw new InvalidEditionError("Gogo response is not HTML text");
  }
  return body;
}

function stableEditionJson(edition: ParsedEdition): string {
  return JSON.stringify({
    ...edition,
    fortunes: [...edition.fortunes].sort((a, b) =>
      a.zodiacCode.localeCompare(b.zodiacCode),
    ),
  });
}

function classifyIngestionError(error: unknown): {
  status: "stale" | "invalid" | "fetch_error";
  sourceDate: string | null;
  code: IngestionErrorCode;
} {
  if (error instanceof StaleSourceError) {
    return {
      status: "stale",
      sourceDate: error.sourceDate,
      code: "SOURCE_STALE",
    };
  }
  if (error instanceof SourceFetchError) {
    return {
      status: "fetch_error",
      sourceDate: null,
      code: "SOURCE_FETCH_FAILED",
    };
  }
  return {
    status: "invalid",
    sourceDate: null,
    code: "EDITION_INVALID",
  };
}

async function finishAndReturn(
  repository: FortuneRepository,
  runId: string,
  result: ResultWithoutRunId,
  metadata: FinishMetadata,
): Promise<IngestionResult> {
  await repository.finishRun(runId, {
    status: result.status,
    sourceDate: result.sourceDate,
    httpStatus: metadata.httpStatus ?? null,
    contentHash: metadata.contentHash ?? null,
    errorCode: result.errorCode,
    finishedAt: metadata.finishedAt,
  });
  return { ...result, runId };
}

export async function ingestSource(
  input: IngestSourceInput,
): Promise<IngestionResult> {
  const { source, targetDate, attempt, force, repository, clients, now } = input;
  const runId = await repository.startRun({
    source,
    targetDate,
    attempt,
    startedAt: now(),
  });

  if (!isSourceExpected(source, targetDate)) {
    return finishAndReturn(
      repository,
      runId,
      {
        source,
        targetDate,
        status: "not_expected",
        sourceDate: null,
        errorCode: null,
      },
      {
        httpStatus: null,
        contentHash: null,
        finishedAt: now(),
      },
    );
  }

  if (!force && (await repository.hasEdition(source, targetDate))) {
    return finishAndReturn(
      repository,
      runId,
      {
        source,
        targetDate,
        status: "already_complete",
        sourceDate: targetDate,
        errorCode: null,
      },
      {
        httpStatus: null,
        contentHash: null,
        finishedAt: now(),
      },
    );
  }

  let httpStatus: number | null = null;
  try {
    const response = await clients[source].fetch(targetDate);
    httpStatus = response.httpStatus;
    const edition =
      source === "ohaasa"
        ? parseOhaasa(response.body, targetDate)
        : parseGogo(requireHtml(response.body), targetDate);
    validateEdition(edition, targetDate);

    const contentHash = createHash("sha256")
      .update(stableEditionJson(edition))
      .digest("hex");
    await repository.saveEdition(edition, {
      contentHash,
      parserVersion: 1,
      fetchedAt: now(),
    });

    return finishAndReturn(
      repository,
      runId,
      {
        source,
        targetDate,
        status: "success",
        sourceDate: edition.editionDate,
        errorCode: null,
      },
      {
        httpStatus,
        contentHash,
        finishedAt: now(),
      },
    );
  } catch (error) {
    const failure = classifyIngestionError(error);
    return finishAndReturn(
      repository,
      runId,
      {
        source,
        targetDate,
        status: failure.status,
        sourceDate: failure.sourceDate,
        errorCode: failure.code,
      },
      {
        httpStatus,
        contentHash: null,
        finishedAt: now(),
      },
    );
  }
}
