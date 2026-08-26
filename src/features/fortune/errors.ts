export class StaleSourceError extends Error {
  readonly code = "SOURCE_STALE";

  constructor(readonly sourceDate: string) {
    super("Source date is stale");
    this.name = "StaleSourceError";
  }
}

export class InvalidEditionError extends Error {
  readonly code = "EDITION_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "InvalidEditionError";
  }
}

export class SourceFetchError extends Error {
  readonly code: string;

  constructor(code: string) {
    super("Source request failed");
    this.name = "SourceFetchError";
    this.code = code;
  }
}
