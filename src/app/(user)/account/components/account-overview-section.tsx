"use client";

import React from 'react';
import { useAuth } from '@/lib/useAuth';
import { 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Clock, 
  CreditCard, 
  Shield, 
  User, 
  Mail,
  Phone,
  Wallet
} from 'lucide-react';

interface AuthContextType {
  user: any;
  refreshUser: () => Promise<void>;
}

export function AccountOverviewSection() {
  const { user } = useAuth() as AuthContextType;
  
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

  const isVerified = user?.verification?.verified || false;
  const joinDate = formatDate(user?.createdAt);
  const lastLogin = formatDate(user?.lastLoginAt);

  return (
    <div>
      {/* Balance cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-700/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-600/30 p-2 rounded-full">
              <Wallet className="h-5 w-5 text-blue-400" />
            </div>
            <h3 className="text-blue-300 font-medium">Số dư khả dụng</h3>
          </div>
          <p className="text-3xl font-bold text-white">
            {getBalance(user?.balance).toLocaleString()} VND
          </p>
          <div className="mt-4 text-sm text-blue-300/70">
            <p>Có thể sử dụng để giao dịch và rút tiền</p>
          </div>
        </div>

        {user?.frozenBalance > 0 && (
          <div className="bg-gradient-to-br from-amber-600/20 to-amber-800/20 border border-amber-700/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-amber-600/30 p-2 rounded-full">
                <CreditCard className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="text-amber-300 font-medium">Số dư đóng băng</h3>
            </div>
            <p className="text-3xl font-bold text-white">
              {user?.frozenBalance?.toLocaleString()} VND
            </p>
            <div className="mt-4 text-sm text-amber-300/70">
              <p>Số dư tạm thời bị khóa do giao dịch đang xử lý</p>
            </div>
          </div>
        )}
      </div>

      {/* User info and assets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 pt-0">
        {/* User info */}
        <div className="lg:col-span-1 bg-gray-800/40 rounded-xl border border-gray-700/50 overflow-hidden">
          <div className="p-4 border-b border-gray-700/50">
            <h3 className="font-medium">Thông tin tài khoản</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Tên người dùng</p>
                <p className="font-medium">{user?.username || 'N/A'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="font-medium">{user?.email || 'N/A'}</p>
              </div>
            </div>
            
            {user?.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Số điện thoại</p>
                  <p className="font-medium">{user?.phone}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Trạng thái xác minh</p>
                <div className="flex items-center gap-2">
                  {isVerified ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <p className="font-medium text-green-500">Đã xác minh</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-amber-500" />
                      <p className="font-medium text-amber-500">Chưa xác minh</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Ngày tham gia</p>
                <p className="font-medium">{joinDate}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Đăng nhập gần nhất</p>
                <p className="font-medium">{lastLogin}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Assets list */}
        <div className="lg:col-span-2 bg-gray-800/40 rounded-xl border border-gray-700/50 overflow-hidden">
          <div className="p-4 border-b border-gray-700/50">
            <h3 className="font-medium">Danh sách tài sản</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="text-left py-3 px-6 text-sm text-gray-400 font-medium">Loại tài sản</th>
                  <th className="text-right py-3 px-6 text-sm text-gray-400 font-medium">Số dư khả dụng</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-700/30 hover:bg-gray-800/30 transition-colors">
                  <td className="py-4 px-6 flex items-center gap-3">
                    <div className="bg-blue-600/20 p-1.5 rounded-full">
                      <CreditCard className="h-4 w-4 text-blue-400" />
                    </div>
                    <span>Ngân hàng (VND)</span>
                  </td>
                  <td className="py-4 px-6 text-right font-medium">{getBalance(user?.balance).toLocaleString()} VND</td>
                </tr>
                {user?.assets?.map((asset: any, index: number) => (
                  <tr key={index} className="border-t border-gray-700/30 hover:bg-gray-800/30 transition-colors">
                    <td className="py-4 px-6 flex items-center gap-3">
                      <div className="bg-purple-600/20 p-1.5 rounded-full">
                        <CreditCard className="h-4 w-4 text-purple-400" />
                      </div>
                      <span>{asset.name}</span>
                    </td>
                    <td className="py-4 px-6 text-right font-medium">{asset.amount.toLocaleString()} {asset.currency}</td>
                  </tr>
                ))}
                {(!user?.assets || user.assets.length === 0) && getBalance(user?.balance) === 0 && (
                  <tr className="border-t border-gray-700/30">
                    <td colSpan={2} className="py-8 text-center text-gray-400">
                      Bạn chưa có tài sản nào. Hãy nạp tiền để bắt đầu giao dịch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
