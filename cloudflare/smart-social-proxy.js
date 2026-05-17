const UPSTREAM = 'https://smart-sns.vercel.app'

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const upstreamUrl = new URL(url.pathname + url.search, UPSTREAM)

    const headers = new Headers(request.headers)
    headers.set('x-forwarded-host', url.hostname)
    headers.delete('cf-connecting-ip')
    headers.delete('cf-ray')

    const response = await fetch(upstreamUrl.toString(), {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
    })

    const responseHeaders = new Headers(response.headers)
    const location = responseHeaders.get('location')
    if (location) {
      responseHeaders.set(
        'location',
        location.replace(UPSTREAM, `${url.protocol}//${url.host}`),
      )
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  },
}
