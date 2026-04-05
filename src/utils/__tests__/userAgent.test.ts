import { afterEach, describe, expect, test } from "bun:test";

const savedEnv = {
  CLAUDE_CODE_USER_AGENT: process.env.CLAUDE_CODE_USER_AGENT,
  CLAUDE_CODE_CLAUDE_USER_AGENT: process.env.CLAUDE_CODE_CLAUDE_USER_AGENT,
  CLAUDE_CODE_BING_USER_AGENT: process.env.CLAUDE_CODE_BING_USER_AGENT,
  CLAUDE_CODE_PLUGIN_MANAGER_USER_AGENT:
    process.env.CLAUDE_CODE_PLUGIN_MANAGER_USER_AGENT,
};

const {
  getBingSearchUserAgent,
  getClaudeCodeUserAgent,
  getPluginManagerUserAgent,
  resolveConfiguredUserAgent,
} = await import("src/utils/userAgent.js");

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("resolveConfiguredUserAgent", () => {
  test("returns fallback when no override is configured", () => {
    delete process.env.CLAUDE_CODE_USER_AGENT;
    expect(resolveConfiguredUserAgent("fallback-agent")).toBe("fallback-agent");
  });

  test("uses the global override when configured", () => {
    process.env.CLAUDE_CODE_USER_AGENT = "codex-tui/0.118.0";
    expect(resolveConfiguredUserAgent("fallback-agent")).toBe(
      "codex-tui/0.118.0",
    );
  });

  test("prefers a specific override over the global override", () => {
    process.env.CLAUDE_CODE_USER_AGENT = "codex-tui/global";
    process.env.CLAUDE_CODE_CLAUDE_USER_AGENT = "codex-tui/claude";

    expect(
      resolveConfiguredUserAgent(
        "fallback-agent",
        "CLAUDE_CODE_CLAUDE_USER_AGENT",
      ),
    ).toBe("codex-tui/claude");
  });
});

describe("user-agent helpers", () => {
  test("getClaudeCodeUserAgent honors the specific override", () => {
    process.env.CLAUDE_CODE_CLAUDE_USER_AGENT = "codex-tui/claude";
    expect(getClaudeCodeUserAgent()).toBe("codex-tui/claude");
  });

  test("getBingSearchUserAgent honors the global override", () => {
    process.env.CLAUDE_CODE_USER_AGENT = "codex-tui/bing";
    expect(getBingSearchUserAgent()).toBe("codex-tui/bing");
  });

  test("getPluginManagerUserAgent honors the specific override", () => {
    process.env.CLAUDE_CODE_PLUGIN_MANAGER_USER_AGENT = "codex-tui/plugin";
    expect(getPluginManagerUserAgent()).toBe("codex-tui/plugin");
  });
});
