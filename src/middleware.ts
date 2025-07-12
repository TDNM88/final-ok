import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Danh sách domain được phép truy cập
const allowedOrigins = [
  'https://inal-hsc1.com',
  'https://www.inal-hsc1.com',
  'https://london-hsc.com',
  'https://www.london-hsc.com',
  // Môi trường phát triển
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

// Các header bảo mật
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const;

// Hàm thiết lập CORS headers
function setCorsHeaders(response: NextResponse, origin: string) {
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 giờ
  response.headers.set('Vary', 'Origin');
  return response;
}

// Hàm lấy token từ request
function getTokenFromRequest(request: NextRequest): string | null {
  console.log('Getting token from request...');
  
  // 1. Ưu tiên lấy từ header Authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    console.log('Got token from Authorization header');
    return token;
  }
  
  // 2. Thử lấy từ cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    const token = cookies['token'];
    if (token) {
      console.log('Got token from cookie');
      return token;
    }
  }
  
  // 3. Thử lấy từ localStorage (cho client-side rendering)
  // Lưu ý: Middleware chạy trên server nên không thể truy cập trực tiếp localStorage
  // Nhưng có thể kiểm tra xem có token trong URL không (cho trường hợp redirect từ OAuth)
  const url = new URL(request.url);
  const tokenFromUrl = url.searchParams.get('token');
  if (tokenFromUrl) {
    console.log('Got token from URL');
    return tokenFromUrl;
  }
  
  console.log('No token found in request');
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin') || '';
  const isAllowedOrigin = allowedOrigins.includes(origin) ||
    (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost'));

  // Xử lý preflight request
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    return setCorsHeaders(response, origin);
  }

  // Tạo response mới với CORS headers nếu cần
  let response: NextResponse;
  
  if (isAllowedOrigin) {
    const newResponse = NextResponse.next();
    setCorsHeaders(newResponse, origin);
    response = newResponse;
  } else {
    response = NextResponse.next();
  }
  
  // Danh sách các đường dẫn tĩnh và công khai không cần xác thực
  const staticPaths = [
    '/_next',
    '/favicon.ico',
    '/site.webmanifest',
    '/images',
    '/icons',
    '/assets',
    '/fonts',
    '/public'
  ];
  
  // Kiểm tra xem có phải là tài nguyên tĩnh không
  const isStaticPath = staticPaths.some(path => pathname.startsWith(path));
  const hasFileExtension = pathname.includes('.'); // Bất kỳ tệp có phần mở rộng
  
  // Nếu là tài nguyên tĩnh, cho phép truy cập mà không cần xác thực
  if (isStaticPath || hasFileExtension) {
    return response;
  }
  
  // Bỏ qua xác thực cho các API route công khai
  const publicApiPaths = [
    '/api/auth',
    '/api/health'
  ];
  
  const isPublicApiPath = publicApiPaths.some(path => pathname.startsWith(path));
  
  if (isPublicApiPath) {
    return response;
  }
  
  // Lấy token từ request
  const token = getTokenFromRequest(request);
  console.log('Token in middleware:', token ? 'Token exists' : 'No token');
  
  // Kiểm tra token
  if (!token) {
    console.log('No token found in request');
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Kiểm tra token hợp lệ
  const { isValid } = await verifyToken(token);
  if (!isValid) {
    console.log('Invalid or expired token');
    
    // Xóa cookie token nếu không hợp lệ
    response.cookies.delete('token');
    
    return NextResponse.redirect(new URL('/login', request.url), {
      headers: response.headers
    });
  }

  // Xử lý preflight request (OPTIONS) đã được xử lý ở trên
  if (request.method === 'OPTIONS') {
    return response;
  }

  // Chặn request từ origin không được phép
  if (origin && !isAllowedOrigin) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: 'Not allowed by CORS',
        allowedOrigins
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",                // Trang chủ
    "/login",           // Trang đăng nhập
    "/register",        // Trang đăng ký
    "/auth-check",      // Trang kiểm tra xác thực
    "/about",           // Trang giới thiệu
    "/contact",         // Trang liên hệ
    "/news",            // Trang tin tức
    "/products",        // Trang sản phẩm
    "/services"         // Trang dịch vụ
  ];
  
  // Kiểm tra xem đường dẫn hiện tại có phải là trang công khai không
  const isPublicPage = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  
  // Nếu là trang chủ hoặc các trang con của trang chủ, luôn cho phép truy cập
  if (pathname === "/" || pathname === "" || isPublicPage) {
    console.log('Public page access, allowing without authentication');
    return response;
  }
  
  // API routes that don't require authentication
  const publicApiRoutes = ["/api/auth/me", "/api/public"];
  
  // Skip auth check for public API routes
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return response;
  }

  // API routes that should be handled separately
  if (pathname.startsWith("/api/")) {
    // Chặn request từ origin không được phép
    if (origin && !isAllowedOrigin) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: 'Not allowed by CORS',
          allowedOrigins
        }),
        {
          status: 403,
          headers: { 
            'Content-Type': 'application/json',
            ...Object.fromEntries(
              Object.entries(securityHeaders).map(([k, v]) => [k, v])
            )
          }
        }
      );
    }

    // Thêm các header bảo mật cho API
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // Thêm CORS headers cho các response API
    if (isAllowedOrigin) {
      response = setCorsHeaders(response, origin);
    }
    
    return response;
  }

  // Static files and Next.js internals
  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/site.webmanifest" ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/icons/") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".gif") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".js")
  ) {
    return response;
  }

  // Check if current path is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  
  // Kiểm tra xem URL có chứa tham số auth=true không
  const url = new URL(request.url);
  const hasAuthParam = url.searchParams.get('auth') === 'true';
  const noRedirect = url.searchParams.get('redirect') === 'false';
  
  // Nếu URL có tham số auth=true, cho phép truy cập mà không cần chuyển hướng
  if (hasAuthParam && noRedirect) {
    console.log('Auth param detected, allowing access without token');
    return response;
  }

  // Kiểm tra xem có phải là tài nguyên tĩnh không
  const isStaticResource = (
    pathname.includes('.') || // Bất kỳ tệp có phần mở rộng
    pathname.startsWith('/images/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/public/') ||
    pathname.startsWith('/_next/')
  );
  
  // Nếu là tài nguyên tĩnh, cho phép truy cập mà không cần xác thực
  if (isStaticResource) {
    return response;
  }

  // Nếu không có token, chuyển hướng về trang đăng nhập
  if (!token) {
    console.log('No token found, redirecting to login');
    
    // Nếu là trang công khai, không cần chuyển hướng
    if (isPublicRoute) {
      return response;
    }
    
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    
    // Nếu là API request, trả về lỗi 401 thay vì redirect
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ message: 'Unauthorized' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return NextResponse.redirect(loginUrl);
  }

  // If has token but trying to access auth pages, redirect to home
  if (token && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Thêm các header bảo mật cho các trang thông thường
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Log các request (chỉ trong môi trường development)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${request.method}] ${pathname}`, {
      origin,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - site.webmanifest (web app manifest)
     * - images/ (image files)
     * - icons/ (icon files)
     * - assets/ (static assets)
     * - public/ (public files)
     * - .*\..* (files with extensions)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|site.webmanifest|.*\..*|images/.*|icons/.*|assets/.*|public/.*).*)",
  ],
}
