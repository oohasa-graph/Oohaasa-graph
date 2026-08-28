import { SourceFetchError } from "@/features/fortune/errors";

const SOURCE_REQUEST_TIMEOUT_MS = 10_000;

export type HttpResponse<T> = {
  body: T;
  httpStatus: number;
};

async function request(url: string, userAgent: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      headers: { "user-agent": userAgent },
      signal: AbortSignal.timeout(SOURCE_REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new SourceFetchError("REQUEST_FAILED");
  }

  if (!response.ok) {
    throw new SourceFetchError(`HTTP_${response.status}`);
  }

  return response;
}

export async function fetchText(
  url: string,
  userAgent: string,
): Promise<HttpResponse<string>> {
  const response = await request(url, userAgent);
  try {
    return { body: await response.text(), httpStatus: response.status };
  } catch {
    throw new SourceFetchError("RESPONSE_READ_FAILED");
  }
}

export async function fetchJson(
  url: string,
  userAgent: string,
): Promise<HttpResponse<unknown>> {
  const response = await request(url, userAgent);
  try {
    return { body: await response.json(), httpStatus: response.status };
  } catch {
    throw new SourceFetchError("INVALID_JSON");
  }
}
