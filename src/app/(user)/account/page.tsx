"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Menu, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { PersonalInfoSection } from './components/personal-info-section';
import { BankInfoSection } from './components/bank-info-section';
import { AccountOverviewSection } from './components/account-overview-section';
import { IdentityVerificationSection } from './components/identity-verification-section';
import { ChangePasswordSection } from './components/change-password-section';

type TabType = 'overview' | 'bank' | 'verify' | 'password';

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
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user && isClient) {
    router.push('/login');
    return null;
  }

  const isVerified = verificationStatus.verified;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="md:w-1/4">
            <div className="bg-gray-800/50 rounded-lg p-6 sticky top-24">
              <div className="flex justify-between items-center md:hidden mb-4">
                <h2 className="text-xl font-bold">Tài khoản</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-gray-400 hover:text-white"
                >
                  <Menu className="h-6 w-6" />
                </button>
              </div>

              <nav className={`space-y-2 ${isMobileMenuOpen ? 'block' : 'hidden md:block'}`}>
                <Button
                  variant={activeTab === 'overview' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => handleTabChange('overview')}
                >
                  Tổng quan
                </Button>
                <Button
                  variant={activeTab === 'bank' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => handleTabChange('bank')}
                >
                  Thông tin ngân hàng
                </Button>
                <Button
                  variant={activeTab === 'verify' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => handleTabChange('verify')}
                >
                  Xác minh danh tính
                </Button>
                <Button
                  variant={activeTab === 'password' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => handleTabChange('password')}
                >
                  Đổi mật khẩu
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  onClick={handleLogout}
                >
                  Đăng xuất
                </Button>
              </nav>
            </div>
          </div>

          {/* Main content */}
          <div className="md:w-3/4">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <Suspense fallback={<div className="p-4 text-center">Đang tải thông tin tài khoản...</div>}>
                  <AccountOverviewSection />
                </Suspense>

                <Suspense fallback={<div className="p-4 text-center">Đang tải thông tin cá nhân...</div>}>
                  <PersonalInfoSection />
                </Suspense>
              </div>
            )}

            {/* Bank Info Tab */}
            {activeTab === 'bank' && (
              <div className="bg-gray-800/50 p-6 rounded-lg">
                <Suspense fallback={<div className="p-4 text-center">Đang tải thông tin ngân hàng...</div>}>
                  <BankInfoSection />
                </Suspense>
              </div>
            )}

            {/* Verify Tab */}
            {activeTab === 'verify' && (
              <div className="bg-gray-800/50 p-6 rounded-lg">
                <Suspense fallback={<div className="p-4 text-center">Đang tải thông tin xác minh...</div>}>
                  <IdentityVerificationSection />
                </Suspense>
              </div>
            )}
            
            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="bg-gray-800/50 p-6 rounded-lg">
                <Suspense fallback={<div className="p-4 text-center">Đang tải...</div>}>
                  <ChangePasswordSection />
                </Suspense>
              </div>
            )}
            

          </div>
        </div>
      </div>
    </div>
  );
}
