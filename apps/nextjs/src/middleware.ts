import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DOCS_PREFIX = '/docs';

const hasFileExtension = (pathname: string) => {
  const lastSegment = pathname.split('/').pop();
  return Boolean(lastSegment && lastSegment.includes('.'));
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith(DOCS_PREFIX)) {
    return NextResponse.next();
  }

  if (hasFileExtension(pathname)) {
    return NextResponse.next();
  }

  const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const target =
    normalizedPath === DOCS_PREFIX ? `${DOCS_PREFIX}/index.html` : `${normalizedPath}/index.html`;

  const url = request.nextUrl.clone();
  url.pathname = target;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: '/docs/:path*',
};
