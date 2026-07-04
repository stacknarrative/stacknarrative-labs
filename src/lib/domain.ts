/**
 * Normalizes a user-entered URL to a root domain used as the dedup key.
 * "https://www.Acme.com/pricing/" and "acme.com" both resolve to "acme.com".
 */
export function normalizeDomain(input: string): string {
  let value = input.trim().toLowerCase();
  if (!/^[a-z]+:\/\//.test(value)) {
    value = `https://${value}`;
  }

  const url = new URL(value);
  let host = url.hostname;
  if (host.startsWith('www.')) {
    host = host.slice(4);
  }
  return host;
}

export function toWebsiteUrl(input: string): string {
  let value = input.trim();
  if (!/^[a-z]+:\/\//i.test(value)) {
    value = `https://${value}`;
  }
  return value;
}
