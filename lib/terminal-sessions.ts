/**
 * Owner registry for module web-terminal containers.
 *
 * Lives outside the API routes so /api/launch-terminal and /api/kill-terminal
 * share it — the previous kill endpoint accepted any sessionId from any signed-in
 * user and ran `docker rm -f` on it, so one student could tear down another's
 * session.
 *
 * In-memory, so it resets when the server restarts; a restart orphans running
 * containers rather than exposing them, which is the safe direction to fail.
 */
const owners = new Map<string, string>();

export function claimTerminal(containerId: string, userId: string) {
  owners.set(containerId, userId);
}

export function ownsTerminal(containerId: string, userId: string) {
  return owners.get(containerId) === userId;
}

export function releaseTerminal(containerId: string) {
  owners.delete(containerId);
}

/**
 * The container a user currently has open, if any.
 *
 * Exercise checks need to run somewhere, and the only container that is
 * meaningfully "theirs" is the terminal they launched from the lesson. The map
 * is keyed the other way for ownership checks, so this scans it — with one
 * session per user and a handful of users, that is cheaper than keeping a
 * second index in sync.
 */
export function findTerminalForUser(userId: string): string | null {
  for (const [containerId, owner] of owners) {
    if (owner === userId) return containerId;
  }
  return null;
}
