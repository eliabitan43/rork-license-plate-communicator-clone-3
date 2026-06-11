/**
 * Native deep-link entry: universal links (https://homi.app/...) and the
 * custom scheme land here before routing. Branch deferred deep links plug in
 * here later — keep this the single translation point.
 */
export function redirectSystemPath({
  path,
  initial: _initial,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    // homi.app/m/[token] — SMS smart landing handoff.
    const tokenMatch = path.match(/\/m\/([a-zA-Z0-9]{8,64})/);
    if (tokenMatch) {
      // DECISION: token -> message resolution needs an authenticated server
      // endpoint that doesn't exist yet; until then land recipients in the
      // inbox, which shows the message once realtime/claim delivers it.
      return `/(tabs)/messages?token=${tokenMatch[1]}`;
    }
    return path || '/';
  } catch {
    return '/';
  }
}
