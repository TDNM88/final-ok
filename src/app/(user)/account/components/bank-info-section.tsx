"use client";

import React, { useState, FormEvent } from 'react';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface AuthContextType {
  user: any;
  refreshUser: () => Promise<void>;
}

export function BankInfoSection() {
  const { user, refreshUser } = useAuth() as AuthContextType;
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    bankType: 'Ngân hàng',
    bankName: user?.bankInfo?.bankName || '',
    accountNumber: user?.bankInfo?.accountNumber || ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const getToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('authToken');
  };

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.bankName || !formData.accountNumber) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/update-bank-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          accountHolder: formData.fullName,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Đã xảy ra lỗi');
      }
      
      toast({
        title: "Thành công",
        description: "Thông tin ngân hàng đã được cập nhật"
      });
      
      refreshUser();
      
    } catch (error) {
      toast({
        title: "Lỗi",
        description: (error as Error).message || "Đã xảy ra lỗi khi cập nhật thông tin ngân hàng",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Check if bank info is verified
  const isVerified = user?.bankInfo?.verified || false;
  const isPending = user?.bankInfo?.pendingVerification || false;

  return (
    <div className="bg-gray-900 text-white">
      {/* User info header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-1">
          {user?.username || 'tdnm'}
        </h2>
        <p className="text-sm text-gray-400">ID: {user?.userId || user?._id || '69934'}</p>
        <p className="text-sm text-gray-400">Ngày đăng ký: {formatDate(user?.createdAt) || '24/06/2025 12:37'}</p>
        <div className="mt-2">
          {isVerified ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-900/30 text-green-400">
              <CheckCircle className="w-4 h-4 mr-1" /> Đã xác minh
            </span>
          ) : isPending ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-900/30 text-yellow-400">
              <AlertTriangle className="w-4 h-4 mr-1" /> Đang chờ xác minh
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-900/30 text-orange-400">
              <XCircle className="w-4 h-4 mr-1" /> Chưa xác minh
            </span>
          )}
        </div>
      </div>
      
      {/* Bank info form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-red-500">
            * Họ tên
          </label>
          <Input 
            type="text" 
            name="fullName" 
            value={formData.fullName} 
            onChange={handleInputChange} 
            placeholder="Nhập tên, vui lòng nhập thêm khoảng cách cho mỗi từ"
            className="bg-transparent border-gray-700 text-white"
            disabled={isVerified || isPending}
          />
        </div>
        
        <div className="space-y-1">
          <label className="block text-sm font-medium text-red-500">
            * Loại
          </label>
          <div className="relative">
            <Input 
              type="text" 
              value={formData.bankType} 
              readOnly
              className="bg-transparent border-gray-700 text-white pr-10"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="block text-sm font-medium text-red-500">
            * Ngân hàng
          </label>
          <Input 
            type="text" 
            name="bankName" 
            value={formData.bankName} 
            onChange={handleInputChange} 
            placeholder="Nhập tên ngân hàng"
            className="bg-transparent border-gray-700 text-white"
            disabled={isVerified || isPending}
          />
        </div>
        
        <div className="space-y-1">
          <label className="block text-sm font-medium text-red-500">
            * Số tài khoản
          </label>
          <Input 
            type="text" 
            name="accountNumber" 
            value={formData.accountNumber} 
            onChange={handleInputChange} 
            placeholder="Nhập số tài khoản ngân hàng của bạn"
            className="bg-transparent border-gray-700 text-white"
            disabled={isVerified || isPending}
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md"
          disabled={isSubmitting || isVerified || isPending}
        >
          {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
        </Button>
      </form>
    </div>
  );
}
