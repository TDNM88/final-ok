"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  Menu, 
  Loader2, 
  User, 
  CreditCard, 
  ShieldCheck, 
  KeyRound,
  LogOut,
  ChevronRight,
  Bell,
  RefreshCw
} from 'lucide-react';

import { BankInfoSection } from './components/bank-info-section';
import { AccountOverviewSection } from './components/account-overview-section';
import { IdentityVerificationSection } from './components/identity-verification-section';
import { ChangePasswordSection } from './components/change-password-section';

type TabType = 'overview' | 'verification' | 'password';

interface AuthContextType {
  user: any;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: () => boolean;
}

export default function AccountPage() {
  const { user, isLoading, logout, refreshUser } = useAuth() as AuthContextType;
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState({
    verified: false,
    cccdFront: '',
    cccdBack: '',
    submittedAt: ''
  });

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Get balance helper
  const getBalance = (balance: any): number => {
    if (typeof balance === 'number') return balance;
    if (typeof balance === 'object' && balance?.available) return balance.available;
    return 0;
  };

  // Get token helper
  const getToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('authToken');
  };

  // Update verification status when user data changes
  useEffect(() => {
    if (user?.verification) {
      setVerificationStatus({
        verified: user?.verification.verified || false,
        cccdFront: user?.verification.cccdFront || '',
        cccdBack: user?.verification.cccdBack || '',
        submittedAt: user?.verification.submittedAt || ''
      });
    }
  }, [user]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const handleRefreshData = async () => {
    try {
      setIsRefreshing(true);
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
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
          <p className="text-blue-400 animate-pulse">Đang tải thông tin tài khoản...</p>
        </div>
      </div>
    );
  }

  if (!user && isClient) {
    router.push('/login');
    return null;
  }

  const isVerified = verificationStatus.verified;
  const balance = getBalance(user?.balance);

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
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Làm mới
              </Button>
              <div className="flex flex-col items-end">
                <div className="text-sm text-blue-300">Số dư khả dụng</div>
                <div className="text-2xl font-bold">{balance.toLocaleString()} VND</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-1/4 w-full">
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl shadow-xl border border-gray-700/50 overflow-hidden sticky top-24">
              <div className="flex justify-between items-center p-4 border-b border-gray-700/50 lg:hidden">
                <h2 className="text-lg font-bold">Tài khoản</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </div>

              <div className="hidden lg:block p-4 border-b border-gray-700/50">
                <h2 className="text-lg font-bold">Quản lý tài khoản</h2>
                <p className="text-sm text-gray-400">Cập nhật thông tin và bảo mật</p>
              </div>

              <nav className={`${isMobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
                <div className="flex flex-col space-y-1 md:space-y-0 md:flex-row md:space-x-4">
                  <Button
                    variant={activeTab === 'overview' ? 'default' : 'ghost'}
                    className={`justify-start ${activeTab === 'overview' ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-gray-800'}`}
                    onClick={() => handleTabChange('overview')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Tổng quan
                  </Button>
                  <Button
                    variant={activeTab === 'verification' ? 'default' : 'ghost'}
                    className={`justify-start ${activeTab === 'verification' ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-gray-800'}`}
                    onClick={() => handleTabChange('verification')}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Xác minh tài khoản
                  </Button>
                  <Button
                    variant={activeTab === 'password' ? 'default' : 'ghost'}
                    className={`justify-start ${activeTab === 'password' ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-gray-800'}`}
                    onClick={() => handleTabChange('password')}
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    Mật khẩu
                  </Button>
                  {isVerified && (
                    <div className="ml-auto bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full flex items-center">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Đã xác minh
                    </div>
                  )}
                </div>
                
                <div className="border-t border-gray-700/50 p-3">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 py-5 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Đăng xuất</span>
                  </Button>
                </div>
              </nav>
            </div>
            
            {/* Verification status card */}
            {!isVerified && (
              <div className="mt-6 bg-gradient-to-br from-amber-900/30 to-amber-800/20 rounded-xl border border-amber-700/30 p-4 hidden lg:block">
                <div className="flex items-start gap-3">
                  <div className="bg-amber-500/20 p-2 rounded-full">
                    <Bell className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-amber-300">Xác minh tài khoản</h3>
                    <p className="text-sm text-amber-200/70 mt-1">Xác minh danh tính của bạn để mở khóa tất cả tính năng và nâng cao giới hạn giao dịch.</p>
                    <Button 
                      className="mt-3 bg-amber-600 hover:bg-amber-700 text-white" 
                      size="sm"
                      onClick={() => handleTabChange('verification')}
                    >
                      Xác minh ngay
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="lg:w-3/4 w-full">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl shadow-xl border border-gray-700/50 overflow-hidden">
                  <div className="border-b border-gray-700/50 p-6">
                    <h2 className="text-xl font-bold">Tổng quan tài khoản</h2>
                    <p className="text-gray-400 text-sm mt-1">Xem thông tin tài khoản và số dư của bạn</p>
                  </div>
                  <Suspense fallback={
                    <div className="p-8 flex justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  }>
                    <AccountOverviewSection />
                  </Suspense>
                </div>
              </div>
            )}

            {/* Verification Tab (Combined Bank Info and Identity Verification) */}
            {activeTab === 'verification' && (
              <div className="space-y-6">
                {/* Bank Info Section */}
                <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl shadow-xl border border-gray-700/50 overflow-hidden">
                  <div className="border-b border-gray-700/50 p-6">
                    <h2 className="text-xl font-bold">Thông tin ngân hàng</h2>
                    <p className="text-gray-400 text-sm mt-1">Quản lý thông tin tài khoản ngân hàng của bạn</p>
                  </div>
                  <Suspense fallback={
                    <div className="p-8 flex justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  }>
                    <div className="p-6">
                      <BankInfoSection />
                    </div>
                  </Suspense>
                </div>
                
                {/* Identity Verification Section */}
                <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl shadow-xl border border-gray-700/50 overflow-hidden">
                  <div className="border-b border-gray-700/50 p-6">
                    <h2 className="text-xl font-bold">Xác minh danh tính</h2>
                    <p className="text-gray-400 text-sm mt-1">Xác minh danh tính của bạn để mở khóa tất cả tính năng</p>
                  </div>
                  <Suspense fallback={
                    <div className="p-8 flex justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  }>
                    <div className="p-6">
                      <IdentityVerificationSection />
                    </div>
                  </Suspense>
                </div>
              </div>
            )}
            
            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl shadow-xl border border-gray-700/50 overflow-hidden">
                <div className="border-b border-gray-700/50 p-6">
                  <h2 className="text-xl font-bold">Đổi mật khẩu</h2>
                  <p className="text-gray-400 text-sm mt-1">Cập nhật mật khẩu để bảo vệ tài khoản của bạn</p>
                </div>
                <Suspense fallback={
                  <div className="p-8 flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                }>
                  <div className="p-6">
                    <ChangePasswordSection />
                  </div>
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
