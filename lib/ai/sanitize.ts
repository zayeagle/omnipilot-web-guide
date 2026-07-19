/** Never include secrets in thrown/returned messages. */
export function sanitizeErrorMessage(
  raw: string,
  ...secrets: Array<string | undefined | null>
): string {
  let msg = raw;
  for (const secret of secrets) {
    const token = (secret ?? '').trim();
    if (token && msg.includes(token)) {
      msg = msg.split(token).join('[REDACTED]');
    }
  }
  return msg;
}
