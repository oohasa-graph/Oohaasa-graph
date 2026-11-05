import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(`.github/workflows/${name}`, "utf8");

function step(name: string) {
  const block = read("ingest.yml").split(`      - name: ${name}\n`)[1]?.split("\n      - name:")[0];
  if (!block) throw new Error("Missing workflow step");
  return block.split("        run: |\n")[1].split("\n").map((line) => line.replace(/^          /, "")).join("\n");
}

const bash = (script: string, env: Record<string, string>) => spawnSync("bash", ["--noprofile", "--norc", "-e", "-o", "pipefail", "-c", script], {
  encoding: "utf8", env: { ...process.env, ...env },
});

// Mock curl as a shell function: no test path can make a network request.
const mockCurl = `
curl() {
  local output='' data='' url=''
  while (( $# )); do
    case "$1" in
      --output) output="$2"; shift ;;
      --data) data="$2"; shift ;;
      https://*) url="$1" ;;
    esac
    shift
  done
  case "$url" in
    https://www.asahi.co.jp/*)
      printf '%s' "$PREFETCH" > "$output"
      return 0 ;;
    https://www.tv-asahi.co.jp/*)
      echo 'PRIVATE_PREFETCH_ERROR_CANARY' >&2
      return 22 ;;
    "$INGEST_URL") ;;
    *) return 97 ;;
  esac
  jq -c . <<< "$data" >> "$CALLS"
  local source attempt status='stale' http='200' date="$TARGET_DATE"
  if [[ "$MODE" == 'bad_status' ]]; then status='PRIVATE_UNTRUSTED_STATUS_CANARY'; fi
  if [[ "$MODE" == 'bad_date' ]]; then date='PRIVATE_UNTRUSTED_DATE_CANARY'; fi
  source=$(jq -r .source <<< "$data")
  attempt=$(jq -r .attempt <<< "$data")
  if [[ "$MODE" == 'first_failure' && "$source" == 'gogo' ]]; then status='success'; fi
  if [[ "$MODE" == 'nonjson' ]]; then
    echo 'PRIVATE_RESPONSE_CANARY' > "$output"
    printf '502'
    echo 'PRIVATE_SECRET_URL_CANARY' >&2
    return 22
  fi
  if [[ "$attempt" == 'final' || "$attempt" == 'manual' ]]; then
    if [[ "$status" == 'stale' ]]; then http='424'; fi
  fi
  jq -n --arg date "$date" --arg source "$source" --arg status "$status" \
    '{targetDate:$date,results:[{source:$source,status:$status,diagnostic:"PRIVATE_RESPONSE_CANARY"}]}' > "$output"
  printf '%s' "$http"
  if [[ "$http" == '424' ]]; then return 22; fi
}
`;

function runAttempt(attempt: string, mode = "normal", prefetch = "PRIVATE_MALFORMED_PREFETCH_CANARY") {
  const dir = mkdtempSync(join(tmpdir(), "ingest-workflow-test-"));
  try {
    const summary = join(dir, "summary");
    const calls = join(dir, "calls");
    writeFileSync(summary, "");
    writeFileSync(calls, "");
    const result = bash(mockCurl + step("Fetch sources and call protected ingestion endpoint"), {
      ATTEMPT: attempt, SOURCE_INPUT: "all", FORCE_INPUT: "false", MODE: mode, PREFETCH: prefetch,
      TARGET_DATE: "2026-11-05", INGEST_URL: "https://unused.invalid/ingest", INGEST_SECRET: "INVENTED_SECRET_CANARY",
      GITHUB_STEP_SUMMARY: summary, CALLS: calls,
    });
    return { ...result, summary: readFileSync(summary, "utf8"), calls: readFileSync(calls, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)) };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

describe("early ingestion dispatch (offline invented responses)", () => {
  it("retains cron expressions, defaults, permissions and a shared non-replacing queue", () => {
    const workflow = read("ingest.yml");
    expect([...workflow.matchAll(/cron: "([^"]+)"/g)].map((match) => match[1])).toEqual([
      "15 20 * * *", "15 21 * * *", "45 22 * * *", "50 23 * * *",
    ]);
    expect(workflow).toContain("options: [primary, retry_1, retry_2, final, manual]");
    expect(workflow).toContain("default: manual");
    expect(workflow).toContain("options: [all, ohaasa, gogo]\n        default: all");
    expect(workflow).toContain("type: boolean\n        default: false");
    expect(workflow).toContain("group: daily-ingest");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("queue: max");
    expect(workflow).not.toContain("backfill");
  });

  it.each(["primary", "retry_1", "retry_2", "final", "manual", "", "backfill", "invalid\nfinal"])("validates dispatch attempt %j without shell interpolation", (attempt) => {
    const dir = mkdtempSync(join(tmpdir(), "ingest-output-"));
    try {
      const output = join(dir, "output");
      writeFileSync(output, "");
      const result = bash(step("Derive ingestion attempt"), { SCHEDULE: "", ATTEMPT_INPUT: attempt, GITHUB_OUTPUT: output });
      const valid = ["primary", "retry_1", "retry_2", "final", "manual", ""].includes(attempt);
      expect(result.status).toBe(valid ? 0 : 1);
      expect(readFileSync(output, "utf8")).toBe(valid ? `attempt=${attempt || "manual"}\n` : "");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it.each([
    ["15 20 * * *", "primary"], ["15 21 * * *", "retry_1"],
    ["45 22 * * *", "retry_2"], ["50 23 * * *", "final"],
  ])("retains scheduled %s attempt %s rather than a dispatch override", (schedule, attempt) => {
    const dir = mkdtempSync(join(tmpdir(), "ingest-schedule-"));
    try {
      const output = join(dir, "output");
      const result = bash(step("Derive ingestion attempt"), { SCHEDULE: schedule, ATTEMPT_INPUT: "backfill", GITHUB_OUTPUT: output });
      expect(result.status).toBe(0);
      expect(readFileSync(output, "utf8")).toBe(`attempt=${attempt}\n`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it.each(["primary", "retry_1", "retry_2", "final", "manual"])("preserves %s endpoint 200/424 semantics and G5 source independence", (attempt) => {
    const result = runAttempt(attempt);
    expect(result.status).toBe(["final", "manual"].includes(attempt) ? 1 : 0);
    expect(result.calls.map((call) => call.source)).toEqual(["ohaasa", "gogo"]);
    expect(result.calls.every((call) => call.force === false && call.attempt === attempt && !("sourceBody" in call))).toBe(true);
    expect(result.summary).toContain("stale");
    expect(result.summary + result.stdout + result.stderr).not.toMatch(/PRIVATE_|INVENTED_SECRET|https:/);
  });

  it("retains aggregate failure when only the first source fails", () => {
    const result = runAttempt("final", "first_failure");
    expect(result.status).toBe(1);
    expect(result.calls).toHaveLength(2);
    expect(result.summary).toContain("success");
  });

  it("keeps non-JSON/non-200 responses text-free and continues the second source", () => {
    const result = runAttempt("primary", "nonjson");
    expect(result.status).toBe(1);
    expect(result.calls).toHaveLength(2);
    expect(result.summary).toContain("unparseable_response");
    expect(result.summary + result.stdout + result.stderr).not.toMatch(/PRIVATE_|INVENTED_SECRET|https:/);
  });

  it.each(["bad_status", "bad_date"])("rejects unallowlisted response fields (%s) without exposing them", (mode) => {
    const result = runAttempt("primary", mode);
    expect(result.status).toBe(1);
    expect(result.calls).toHaveLength(2);
    expect(result.summary).toContain("unparseable_response");
    expect(result.summary + result.stdout + result.stderr).not.toMatch(/PRIVATE_|INVENTED_SECRET|https:/);
  });

  it("still supplies valid prefetched arrays, but never sends malformed JSON objects", () => {
    expect(runAttempt("primary", "normal", "[]").calls[0].sourceBody).toEqual([]);
    expect(runAttempt("primary", "normal", '{"wrong":"shape"}').calls[0]).not.toHaveProperty("sourceBody");
  });
});

describe("secret-bearing workflow hardening", () => {
  it("grants the ingest job no GITHUB_TOKEN scopes", () => {
    expect(read("ingest.yml")).toContain("\npermissions: {}\n");
  });

  it.each(["backfill.yml", "export-data.yml"])("skips dependency install scripts in %s", (name) => {
    const workflow = read(name);
    expect(workflow).toContain("run: npm ci --ignore-scripts");
    expect(workflow).not.toMatch(/run: npm ci\s*$/m);
  });
});
