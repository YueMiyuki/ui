import { type NextRequest, NextResponse } from "next/server";
import { isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from "@/site/i18n/config";

function negotiate(header: string | null): Locale {
  let zh = 0;
  let en = 0;
  for (const part of header?.split(",") ?? []) {
    const [tag, ...params] = part.trim().split(";");
    const primary = tag.trim().toLowerCase().split("-")[0];
    let q = 1;
    for (const param of params) {
      const [key, value] = param.trim().split("=");
      if (key.trim().toLowerCase() === "q") q = Number(value);
    }
    if (!Number.isFinite(q) || q <= 0) continue;
    if (primary === "zh") zh = Math.max(zh, q);
    else if (primary === "en") en = Math.max(en, q);
  }
  return zh > en ? "zh" : "en";
}

function remember(response: NextResponse, locale: Locale) {
  response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: "lax" });
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];
  if (first === "zh") return NextResponse.next();

  const url = request.nextUrl.clone();
  if (first === "en") {
    url.pathname = pathname.slice(3) || "/";
    return remember(NextResponse.redirect(url, 308), "en");
  }

  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookie) ? cookie : negotiate(request.headers.get("accept-language"));
  if (locale === "zh") {
    url.pathname = pathname === "/" ? "/zh" : `/zh${pathname}`;
    return remember(NextResponse.redirect(url, 307), "zh");
  }

  url.pathname = pathname === "/" ? "/en" : `/en${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/((?!_next/|_vercel/|api(?:/|$)|r/|art/|thumbs/|preview/|thumb/|review(?:/|$)|opengraph-image(?:/|$)|twitter-image(?:/|$)|icon(?:/|$)|apple-icon(?:/|$)|.*\\.[^/]*$).*)",
  ],
};
