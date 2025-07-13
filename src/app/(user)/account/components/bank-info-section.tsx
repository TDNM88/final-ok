"use client";

import React, { useState, FormEvent, useEffect } from 'react';
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
  
  // Load data from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const savedBankData = localStorage.getItem('userBankInfo');
      if (savedBankData) {
        try {
          const parsedData = JSON.parse(savedBankData);
          if (parsedData.userId === user._id || parsedData.userId === user.id) {
            // Chỉ sử dụng dữ liệu từ localStorage nếu chưa có dữ liệu từ server
            if (!user?.bankInfo?.verified && !user?.bankInfo?.pendingVerification) {
              setFormData(prev => ({
                ...prev,
                bankName: parsedData.bankName || prev.bankName,
                accountNumber: parsedData.accountNumber || prev.accountNumber,
                fullName: parsedData.accountHolder || prev.fullName
              }));
            }
          }
        } catch (error) {
          console.error('Lỗi khi đọc dữ liệu ngân hàng đã lưu:', error);
        }
      }
    }
  }, [user]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
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
    
    // Kiểm tra nếu thông tin đã được xác nhận hoặc đang chờ xác minh thì không cho phép thay đổi
    if (isVerified || isPending) {
      toast({
        title: "Không thể thay đổi",
        description: "Thông tin ngân hàng đã được xác nhận hoặc đang chờ xác minh, không thể thay đổi",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.fullName || !formData.bankName || !formData.accountNumber) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    setIsSaving(true); // Bắt đầu trạng thái loading
    
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
      
      // Lưu thông tin vào localStorage
      if (typeof window !== 'undefined' && user) {
        localStorage.setItem('userBankInfo', JSON.stringify({
          userId: user._id || user.id || '',
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          accountHolder: formData.fullName,
          pendingVerification: true,
          savedAt: new Date().toISOString()
        }));
      }
      
      toast({
        title: "Thành công",
        description: "Thông tin ngân hàng đã được cập nhật và đang chờ xác minh"
      });
      
      setFormData(prev => ({
        ...prev,
        pendingVerification: true
      }));
      
      refreshUser();
      
    } catch (error) {
      toast({
        title: "Lỗi",
        description: (error as Error).message || "Đã xảy ra lỗi khi cập nhật thông tin ngân hàng",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setIsSaving(false); // Kết thúc trạng thái loading
    }
  };
  
  // Check if bank info is verified
  const isVerified = user?.bankInfo?.verified || false;
  const isPending = user?.bankInfo?.pendingVerification || false;
  
  // Thêm thông báo cho người dùng khi thông tin đã được xác minh hoặc đang chờ xác minh
  const getBankInfoStatus = () => {
    if (isVerified) {
      return (
        <div className="mb-4 p-3 bg-green-900/20 border border-green-900/30 rounded-md">
          <p className="flex items-center text-green-400">
            <CheckCircle className="w-4 h-4 mr-2" /> 
            Thông tin ngân hàng đã được xác minh. Bạn không thể thay đổi thông tin này.
          </p>
        </div>
      );
    } else if (isPending) {
      return (
        <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-900/30 rounded-md">
          <p className="flex items-center text-yellow-400">
            <AlertTriangle className="w-4 h-4 mr-2" /> 
            Thông tin ngân hàng đang chờ xác minh. Bạn không thể thay đổi thông tin này.
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-900 text-white">
      {/* Bank info status message */}
      {getBankInfoStatus()}
      
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
      
      {/* Bank info form or display */}
      {isVerified || isPending || isSaving ? (
        <div className="space-y-4">
          {/* Hiển thị thông tin dạng thẻ thông tin khi đã xác minh hoặc đang chờ xác minh hoặc đang lưu */}
          <div className="bg-gray-800/50 p-4 rounded-md border border-gray-700/50 space-y-3">
            <div className="flex justify-between items-center border-b border-gray-700/30 pb-2">
              <h3 className="text-md font-medium text-white">Thông tin ngân hàng</h3>
              {isSaving ? (
                <div className="flex items-center space-x-2 bg-blue-900/30 px-2 py-1 rounded">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400"></div>
                  <span className="text-xs text-blue-400">Đang lưu...</span>
                </div>
              ) : isVerified ? (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-900/30 text-green-400">
                  <CheckCircle className="w-3 h-3 mr-1" /> Đã xác minh
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-900/30 text-yellow-400">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Đang chờ xác minh
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-gray-400">Ngân hàng:</div>
              <div className="col-span-2 text-white font-medium">{formData.bankName}</div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-gray-400">Số tài khoản:</div>
              <div className="col-span-2 text-white font-medium">{formData.accountNumber}</div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-gray-400">Chủ tài khoản:</div>
              <div className="col-span-2 text-white font-medium">{formData.fullName}</div>
            </div>
            
            {isSaving && (
              <div className="bg-blue-900/20 p-3 rounded-md border border-blue-900/30 mt-2">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <p className="text-sm text-blue-400">Đang xử lý thông tin ngân hàng của bạn...</p>
                </div>
              </div>
            )}
            
            {!isSaving && (
              <div className="bg-blue-900/20 p-3 rounded-md border border-blue-900/30">
                <p className="text-sm text-blue-400">
                  Thông tin ngân hàng {isVerified ? 'đã được xác minh' : 'đang chờ xác minh'} và không thể chỉnh sửa.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
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
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md"
            disabled={isSubmitting || isSaving}
          >
            {isSubmitting || isSaving ? 'Đang xử lý...' : 'Xác nhận'}
          </Button>
        </form>
      )}
    </div>
  );
}
