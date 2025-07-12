"use client"

import React from 'react';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type User = {
  id: string;
  username: string;
  role: string;
  avatar?: string;
  balance: {
    available: number;
    frozen: number;
  };
  bank?: {
    name: string;
    accountNumber: string;
    accountHolder: string;
  };
  verification?: {
    verified: boolean;
    cccdFront: string;
    cccdBack: string;
  };
  status?: {
    active: boolean;
    betLocked: boolean;
    withdrawLocked: boolean;
  };
  createdAt?: string;
  lastLogin?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function useAuthStandalone(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  // Helper functions for token management
  const getToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('authToken');
  };

  const setToken = (token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('authToken', token); // For backward compatibility
    document.cookie = `token=${token}; path=/; max-age=604800`; // Also set as cookie for 7 days
  };

  const clearToken = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'; // Clear cookie
  };

  // Helper for authenticated fetch requests
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = getToken();
    const headers = {
      ...options.headers,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    return fetch(url, {
      ...options,
      credentials: 'include',
      headers
    });
  };

  const checkAuth = async () => {
    try {
      console.log('Checking authentication status...');
      
      // Lấy token từ localStorage
      const token = getToken();
      console.log('Token from storage:', token ? 'Found' : 'Not found');
      
      if (!token) {
        console.log('No token found, user is not authenticated');
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      const res = await fetchWithAuth('/api/auth/me');
      
      console.log('Auth check response status:', res.status);
      
      if (res.ok) {
        const data = await res.json().catch(e => {
          console.error('Error parsing auth response:', e);
          return null;
        });
        
        if (data?.success && data.user) {
          console.log('User authenticated:', data.user.username);
          setUser(data.user);
        } else {
          console.log('No user in auth response:', data);
          clearToken(); // Clear invalid token
          setUser(null);
        }
      } else {
        console.log('Auth check failed with status:', res.status);
        if (res.status === 401) {
          console.log('Token is invalid or expired, clearing');
          clearToken(); // Clear invalid token
        }
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      console.log('=== Login Attempt Started ===');
      console.log('Username:', username);
      
      // Basic input validation
      if (!username || !password) {
        console.error('Validation failed: Missing username or password');
        return { success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu' };
      }
      
      // Clear any existing auth state
      setUser(null);

      // Create full URL to ensure it's correct
      const apiUrl = new URL('/api/login', window.location.origin).toString();
      console.log('Sending login request to:', apiUrl);
      
      const startTime = Date.now();
      let res;
      
      try {
        res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          body: JSON.stringify({ 
            username: username.trim(), 
            password: password 
          }),
          credentials: 'include',
        });
      } catch (fetchError) {
        console.error('Network error during fetch:', fetchError);
        return { 
          success: false, 
          message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.' 
        };
      }
      
      const responseTime = Date.now() - startTime;
      console.log(`Login request completed in ${responseTime}ms with status:`, res.status);
      
      // Check if the response is JSON before trying to parse it
      const contentType = res.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await res.json();
          console.log('Login response data:', data);
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          return { 
            success: false, 
            message: 'Lỗi xử lý phản hồi từ máy chủ' 
          };
        }
      } else {
        const text = await res.text();
        console.error('Non-JSON response received:', text);
        return { 
          success: false, 
          message: 'Phản hồi không hợp lệ từ máy chủ' 
        };
      }
      
      if (res.ok && data?.success) {
        console.log('Login API call successful, response:', data);
        
        // Lưu token vào localStorage và cookie
        const token = data.token;
        if (token) {
          console.log('Saving token to localStorage and cookie');
          setToken(token); // Sử dụng hàm setToken mới
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('loginTimestamp', Date.now().toString());
        } else {
          console.warn('No token found in login response');
        }
        
        // Thêm delay để đảm bảo cookie được thiết lập
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
          // Thử lấy thông tin người dùng sử dụng fetchWithAuth
          console.log('Attempting to fetch current user...');
          const meResponse = await fetchWithAuth('/api/auth/me');
          
          console.log('Auth/me response status:', meResponse.status);
          
          if (meResponse.ok) {
            const meData = await meResponse.json();
            console.log('Auth/me response data:', meData);
            
            if (meData?.success && meData.user) {
              console.log('Authentication verified, setting user in context');
              // Cập nhật thông tin người dùng
              const userData = {
                ...meData.user,
                // Đảm bảo các trường bắt buộc tồn tại
                balance: meData.user.balance || { available: 0, frozen: 0 }
              };
              setUser(userData);
              return { success: true, message: 'Đăng nhập thành công' };
            } else {
              console.error('Auth/me response missing user data:', meData);
            }
          } else {
            console.error('Auth/me request failed with status:', meResponse.status);
            const errorText = await meResponse.text().catch(() => 'No error details');
            console.error('Auth/me error response:', errorText);
          }
          
          // If we get here, auth verification failed
          console.error('Auth verification failed after login');
          return { 
            success: false, 
            message: 'Đăng nhập thành công nhưng không thể xác minh trạng thái. Vui lòng làm mới trang.' 
          };
          
        } catch (verifyError) {
          console.error('Error during auth verification:', verifyError);
          return { 
            success: false, 
            message: 'Đăng nhập thành công nhưng có lỗi khi xác minh. Vui lòng thử lại.' 
          };
        }
      } else {
        console.error('Login failed with status:', res.status, 'Response:', data);
        return { 
          success: false, 
          message: data?.message || `Đăng nhập thất bại (Mã lỗi: ${res.status})` 
        };
      }
    } catch (error) {
      console.error('Unexpected error during login:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Lỗi không xác định' 
      };
    } finally {
      console.log('=== Login Attempt Completed ===');
    }
  };

  const logout = async () => {
    try {
      await fetchWithAuth('/api/auth/logout', { 
        method: 'POST'
      });
      // Xóa token khỏi localStorage và cookie
      clearToken();
      // Xóa các thông tin đăng nhập khác
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('loginTimestamp');
      setUser(null);
      console.log('Logout successful, all tokens cleared');
    } catch (error) {
      console.error('Logout error:', error);
      // Vẫn xóa token ngay cả khi API gặp lỗi
      clearToken();
      setUser(null);
    }
  };

  const isAuthenticated = () => {
    return user !== null;
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  return {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated,
    isAdmin,
    refreshUser,
  };
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuthStandalone();
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}
