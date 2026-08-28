import { describe, expect, it } from "vitest";
import { isSourceExpected } from "@/features/ingestion/source-policy";

describe("isSourceExpected", () => {
  it("accepts Ohaasa on an ordinary weekday", () => {
    expect(isSourceExpected("ohaasa", "2026-08-12")).toBe(true);
  });

  it("rejects Ohaasa on weekends and Mountain Day", () => {
    expect(isSourceExpected("ohaasa", "2026-08-15")).toBe(false);
    expect(isSourceExpected("ohaasa", "2026-08-11")).toBe(false);
  });

  it("expects Gogo every day", () => {
    expect(isSourceExpected("gogo", "2026-08-15")).toBe(true);
    expect(isSourceExpected("gogo", "2026-08-11")).toBe(true);
  });
});
