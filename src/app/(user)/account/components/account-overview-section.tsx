"use client";

import React from 'react';
import { useAuth } from '@/lib/useAuth';
import { CheckCircle, XCircle } from 'lucide-react';

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

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg">
      <div className="space-y-6">

        {/* Total assets */}
        <div className="space-y-1">
          <h3 className="text-sm text-gray-400">Tổng tài sản quy đổi</h3>
          <p className="text-3xl font-bold">
            {getBalance(user?.balance).toLocaleString()} VND
          </p>
        </div>



        {/* Assets list */}
        <div>
          <h3 className="text-sm text-gray-400 mb-3">Danh sách tài sản</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-700">
                <tr>
                  <th className="text-left py-2 text-sm text-gray-400">Bank</th>
                  <th className="text-right py-2 text-sm text-gray-400">Có sẵn</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3">Ngân hàng</td>
                  <td className="py-3 text-right">{getBalance(user?.balance).toLocaleString()} VND</td>
                </tr>
                {user?.assets?.map((asset: any, index: number) => (
                  <tr key={index} className="border-b border-gray-700/50">
                    <td className="py-3">{asset.name}</td>
                    <td className="py-3 text-right">{asset.amount.toLocaleString()} {asset.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
