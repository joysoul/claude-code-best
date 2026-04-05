/**
 * User-Agent string helpers.
 *
 * Kept dependency-free so SDK-bundled code (bridge, cli/transports) can
 * import without pulling in auth.ts and its transitive dependency tree.
 */

function readUserAgentOverride(envKey?: string): string | undefined {
  const candidates = [
    envKey ? process.env[envKey] : undefined,
    process.env.CLAUDE_CODE_USER_AGENT,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim()
      if (trimmed) {
        return trimmed
      }
    }
  }

  return undefined
}

export function resolveConfiguredUserAgent(
  fallback: string | (() => string),
  envKey?: string,
): string {
  const override = readUserAgentOverride(envKey)
  if (override !== undefined) {
    return override
  }
  return typeof fallback === 'function' ? fallback() : fallback
}

export function getClaudeCodeUserAgent(): string {
  return resolveConfiguredUserAgent(
    () => `claude-code/${MACRO.VERSION}`,
    'CLAUDE_CODE_CLAUDE_USER_AGENT',
  )
}

export function getBingSearchUserAgent(): string {
  return resolveConfiguredUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    'CLAUDE_CODE_BING_USER_AGENT',
  )
}

export function getPluginManagerUserAgent(): string {
  return resolveConfiguredUserAgent(
    'Claude-Code-Plugin-Manager',
    'CLAUDE_CODE_PLUGIN_MANAGER_USER_AGENT',
  )
}
