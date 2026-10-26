import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/export-data.yml", "utf8");

describe("private mirror authentication boundary", () => {
  it("mints an explicitly private-repository-scoped app token", () => {
    expect(workflow).toMatch(/actions\/create-github-app-token@[a-f0-9]{40}/);
    expect(workflow).toContain("client-id: ${{ secrets.DATA_APP_CLIENT_ID }}");
    expect(workflow).toContain("private-key: ${{ secrets.DATA_APP_PRIVATE_KEY }}");
    expect(workflow).toContain("owner: oohasa-graph");
    expect(workflow).toContain("repositories: Oohaasa-graph-data");
    expect(workflow).toContain("permission-contents: write");
    expect(workflow).toContain("token: ${{ steps.data-token.outputs.token }}");
    expect(workflow).not.toContain("DATA_REPO_DEPLOY_KEY");
    expect(workflow).not.toContain("skip-token-revoke: true");
  });

  it("verifies the minted token exposes exactly one private repository before checkout", () => {
    const verify = workflow.indexOf("name: Verify private-only token scope");
    expect(verify).toBeGreaterThan(-1);
    expect(verify).toBeLessThan(workflow.indexOf("name: Check out private data repository"));
    expect(workflow).toContain("gh api installation/repositories");
    expect(workflow).toContain(".total_count == 1");
    expect(workflow).toContain(".repositories[0].private == true");
    expect(workflow).toContain("oohasa-graph/oohaasa-graph-data");
  });

  it("allows credentials only on trusted scheduled or manual runs in the source repository", () => {
    expect(workflow).toContain("github.repository == 'oohasa-graph/Oohaasa-graph'");
    expect(workflow).toContain("github.event_name == 'schedule'");
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'");
    expect(workflow).not.toMatch(/pull_request|workflow_run/);
    expect(workflow).toContain("permissions:\n  contents: read");
    expect(workflow).toContain("persist-credentials: false");
    for (const reference of workflow.matchAll(/uses: (\S+)/g)) {
      expect(reference[1]).toMatch(/@[a-f0-9]{40}$/);
    }
  });
});
