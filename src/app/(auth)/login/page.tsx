'use client';

// Ensure React is loaded first
import React, { useState, useEffect } from 'react';

// Import other dependencies
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff } from 'lucide-react';

// Import the React global initializer
import '@/lib/ensure-react';

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated, isAdmin } = useAuth()

  const callbackUrl = searchParams.get("callbackUrl") || "/"

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      if (isAdmin()) {
        router.push("/admin")
      } else {
        router.push(callbackUrl)
      }
    }
  }, [isAuthenticated, isAdmin, router, callbackUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors and set loading state
    setError("")
    setIsLoading(true)
    
    // Basic client-side validation
    if (!username.trim()) {
      setError("Vui lòng nhập tên đăng nhập")
      setIsLoading(false)
      return
    }
    
    if (!password) {
      setError("Vui lòng nhập mật khẩu")
      setIsLoading(false)
      return
    }

    console.log('Form submitted, attempting login...')
    
    try {
      const result = await login(username.trim(), password)
      console.log('Login result:', result)

      if (result?.success) {
        console.log('Login successful, processing...');
        
        // Lưu trạng thái đăng nhập vào localStorage
        try {
          // Lưu thời gian đăng nhập
          localStorage.setItem('loginTimestamp', Date.now().toString());
          localStorage.setItem('isLoggedIn', 'true');
          
          // Lưu URL chuyển hướng vào localStorage
          localStorage.setItem('redirectAfterLogin', callbackUrl);
          
          console.log('Login state saved to localStorage');
          
          // Đảm bảo token được lưu trong localStorage và cookie
          const token = localStorage.getItem('token') || localStorage.getItem('authToken');
          console.log('Token in localStorage after login:', token ? 'Found' : 'Not found');
          
          // Sử dụng type assertion để truy cập token từ result
          const loginResult = result as { success: boolean; message?: string; token?: string };
          
          if (loginResult.token) {
            console.log('Token found in login result, saving to localStorage and cookie');
            localStorage.setItem('token', loginResult.token);
            localStorage.setItem('authToken', loginResult.token);
            
            // Lưu token vào cookie để server-side có thể đọc
            document.cookie = `token=${loginResult.token}; path=/; max-age=604800`; // 7 days
          }
          
          // Hiển thị thông báo thành công
          setError("Đăng nhập thành công! Đang chuyển hướng...");
          
          // Thêm delay để đảm bảo token được lưu trữ
          setTimeout(() => {
            // Kiểm tra token một lần nữa trước khi chuyển hướng
            const finalToken = localStorage.getItem('token') || localStorage.getItem('authToken');
            console.log('Final token check before redirect:', finalToken ? 'Found' : 'Not found');
            
            if (isAdmin()) {
              console.log('Admin user detected, redirecting to admin dashboard');
              window.location.replace('/admin');
            } else {
              console.log('Regular user, redirecting to:', callbackUrl);
              window.location.replace(callbackUrl);
            }
          }, 1500);
        } catch (err) {
          console.error('Error saving to localStorage:', err);
        }
      } else {
        console.error('Login failed:', result?.message || 'No error message')
        setError(result?.message || "Đăng nhập thất bại. Vui lòng thử lại.")
      }
    } catch (err) {
      console.error('Unexpected error during login:', err)
      setError("Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại sau.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Đăng nhập</CardTitle>
          <CardDescription className="text-center">Nhập thông tin đăng nhập của bạn</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant={error.includes('Đăng nhập thành công') ? "default" : "destructive"} className="mb-4">
              <AlertDescription className="flex items-center">
                {error}
                {error.includes('Đăng nhập thành công') && (
                  <div className="ml-2">
                    <Loader2 className="h-4 w-4 animate-spin inline-block" />
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                placeholder="Nhập tên đăng nhập"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Nhập mật khẩu"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                "Đăng nhập"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-gray-600">Chưa có tài khoản? </span>
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              Đăng ký ngay
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}