"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  Menu, 
  Loader2, 
  User, 
  ShieldCheck, 
  KeyRound,
  Bell
} from 'lucide-react';

import { BankInfoSection } from './components/bank-info-section';
import { AccountOverviewSection } from './components/account-overview-section';
import { IdentityVerificationSection } from './components/identity-verification-section';
import { ChangePasswordSection } from './components/change-password-section';

type TabType = 'overview' | 'verification' | 'password';

export default function AccountPage() {
  const { user } = useAuth() as { user: any };
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState({
    verified: false,
    cccdFront: '',
    cccdBack: '',
    submittedAt: ''
  });

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

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const isVerified = verificationStatus.verified;

  return (
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
            <div className="flex flex-col p-2 space-y-1">
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
                {isVerified && (
                  <span className="ml-auto bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full flex items-center">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Đã xác minh
                  </span>
                )}
              </Button>
              <Button
                variant={activeTab === 'password' ? 'default' : 'ghost'}
                className={`justify-start ${activeTab === 'password' ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-gray-800'}`}
                onClick={() => handleTabChange('password')}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Mật khẩu
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
  );
}
