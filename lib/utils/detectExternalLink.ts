const EXEMPT_DOMAINS = ['twitter.com', 'x.com', 't.co', 'pic.twitter.com']

const URL_REGEX = /https?:\/\/[^\s]+/g

function isExemptUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return EXEMPT_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
  } catch {
    return false
  }
}

export function detectExternalLink(text: string): boolean {
  const matches = text.match(URL_REGEX)
  if (!matches) return false
  return matches.some((url) => !isExemptUrl(url))
}
