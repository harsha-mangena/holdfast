const g = globalThis as typeof globalThis & { __hfPublicOrigin?: string };

export function rememberPublicOrigin(origin: string) {
  if (!origin || /example\.com|localhost|127\.0\.0\.1/i.test(origin)) return;
  g.__hfPublicOrigin = origin.replace(/\/$/, "");
}

export function publicOrigin(request?: Request): string {
  const origin = request?.headers.get("origin");
  if (origin && !/example\.com/i.test(origin)) {
    rememberPublicOrigin(origin);
    if (!/localhost|127\.0\.0\.1/i.test(origin)) return origin.replace(/\/$/, "");
  }
  const xf = request?.headers.get("x-forwarded-host") || request?.headers.get("host") || "";
  const host = xf.split(",")[0].trim();
  const proto = request?.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  if (host && !/example\.com/i.test(host) && !/localhost|127\.0\.0\.1/i.test(host)) {
    const o = proto + "://" + host;
    rememberPublicOrigin(o);
    return o;
  }
  if (g.__hfPublicOrigin) return g.__hfPublicOrigin;
  return "http://127.0.0.1:8080";
}

export function rewriteToPublic(url: string, request?: Request): string {
  try {
    const u = new URL(url);
    const o = new URL(publicOrigin(request));
    u.protocol = o.protocol;
    u.host = o.host;
    const cb = u.searchParams.get("callbackURL");
    if (cb) {
      try {
        const c = new URL(cb, o.origin);
        c.protocol = o.protocol;
        c.host = o.host;
        u.searchParams.set("callbackURL", c.toString());
      } catch {
        u.searchParams.set("callbackURL", o.origin + "/app");
      }
    }
    return u.toString();
  } catch {
    return url;
  }
}
