'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, logout, refreshUser } = useAuth();
  const { toast } = useToast();
  
  // Function to handle logout
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Function to refresh user data
  const handleRefreshData = async () => {
    try {
      await refreshUser();
      toast({
        title: "Thành công",
        description: "Đã cập nhật thông tin tài khoản"
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật thông tin tài khoản",
        variant: "destructive"
      });
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated()) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-blue-400 animate-pulse">Đang tải thông tin tài khoản...</p>
        </div>
      </div>
    );
  }

  // Only render the layout if authenticated
  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white pb-20">
      {/* Header with user info */}
      <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border-b border-blue-800/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-xl font-bold">{user?.username || 'User'}</h1>
                <p className="text-blue-300 text-sm">{user?.email || 'No email'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleRefreshData} 
                variant="outline" 
                size="sm" 
                className="text-blue-300 border-blue-800 hover:bg-blue-900/30"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Làm mới
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="text-red-300 border-red-800 hover:bg-red-900/30"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
}
