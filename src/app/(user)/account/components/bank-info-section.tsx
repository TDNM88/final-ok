"use client";

import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  CreditCard, 
  Building, 
  User, 
  Clock
} from 'lucide-react';

interface AuthContextType {
  user: any;
  refreshUser: () => Promise<void>;
}

interface BankInfo {
  fullName: string;
  bankName: string;
  accountNumber: string;
  verified?: boolean;
  pendingVerification?: boolean;
  submittedAt?: string;
  verifiedAt?: string;
}

// Interface IdentityInfo đã được xóa vì không còn cần thiết

export function BankInfoSection() {
  const { user, refreshUser } = useAuth() as AuthContextType;
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<BankInfo>({
    fullName: '',
    bankName: '',
    accountNumber: '',
    verified: false,
    pendingVerification: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadStoredData = async () => {
      if (typeof window === 'undefined') return;

      try {
        // Đầu tiên, kiểm tra dữ liệu từ server (user object)
        if (user && user.bankInfo) {
          const bankInfo = {
            fullName: user.bankInfo.fullName || '',
            bankName: user.bankInfo.bankName || '',
            accountNumber: user.bankInfo.accountNumber || '',
            verified: user.bankInfo.verified || false,
            pendingVerification: user.bankInfo.pendingVerification || false,
            submittedAt: user.bankInfo.submittedAt || '',
            verifiedAt: user.bankInfo.verifiedAt || ''
          };
          
          setFormData(bankInfo);
          
          // Cập nhật localStorage với dữ liệu mới nhất từ server
          localStorage.setItem('userBankInfo', JSON.stringify({
            ...bankInfo,
            userId: user._id || user.id,
            lastUpdated: new Date().toISOString()
          }));
        } 
        // Nếu không có dữ liệu từ server, thử tải từ localStorage
        else {
          const savedBankInfo = localStorage.getItem('userBankInfo');
          if (savedBankInfo) {
            const parsedInfo = JSON.parse(savedBankInfo);
            if (user && (parsedInfo.userId === user._id || parsedInfo.userId === user.id)) {
              setFormData(prev => ({
                ...prev,
                ...parsedInfo,
                verified: parsedInfo.verified ?? false,
                pendingVerification: parsedInfo.pendingVerification ?? false
              }));
            }
          }
        }
        
        setDataLoaded(true);
      } catch (error) {
        console.error('Error loading bank info data:', error);
        toast({
          title: "Lỗi",
          description: "Không thể tải thông tin ngân hàng",
          variant: "destructive"
        });
      }
    };

    loadStoredData();
  }, [user, toast]);

  const getToken = useCallback(() => {
    return localStorage.getItem('token') || localStorage.getItem('authToken') || '';
  }, []);

  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, []);

  const toggleEditMode = useCallback(() => {
    if (formData.verified || formData.pendingVerification) {
      toast({
        title: "Không thể chỉnh sửa",
        description: "Thông tin ngân hàng đã được xác minh hoặc đang chờ xác minh",
        variant: "destructive"
      });
      return;
    }
    setIsEditMode(prev => !prev);
  }, [formData.verified, formData.pendingVerification, toast]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Đối với trường accountNumber, chỉ cho phép nhập số
    if (name === 'accountNumber') {
      // Loại bỏ tất cả ký tự không phải số
      const numericValue = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();

    if (formData.verified || formData.pendingVerification) {
      toast({
        title: "Không thể cập nhật",
        description: "Thông tin đã được xác minh hoặc đang chờ xác minh",
        variant: "destructive"
      });
      return;
    }

    if (!formData.fullName || !formData.bankName || !formData.accountNumber) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin ngân hàng",
        variant: "destructive"
      });
      return;
    }
    
    // Kiểm tra độ dài số tài khoản
    if (formData.accountNumber.length < 8) {
      toast({
        title: "Lỗi",
        description: "Số tài khoản phải có ít nhất 8 ký tự",
        variant: "destructive"
      });
      return;
    }
    
    // Kiểm tra số tài khoản chỉ chứa số
    if (!formData.accountNumber.match(/^[0-9]+$/)) {
      toast({
        title: "Lỗi",
        description: "Số tài khoản chỉ được chứa các chữ số",
        variant: "destructive"
      });
      return;
    }
    
    // Kiểm tra nếu thông tin đã được xác minh hoặc đang chờ xác minh
    if (formData.verified || formData.pendingVerification) {
      toast({
        title: "Không thể cập nhật",
        description: "Thông tin ngân hàng đã được xác minh hoặc đang chờ xác minh",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Gửi thông tin ngân hàng lên server
      const response = await fetch('/api/update-bank-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      // Cập nhật localStorage với dữ liệu mới nhất
      if (user) {
        localStorage.setItem('userBankInfo', JSON.stringify({
          ...formData,
          userId: user._id || user.id,
          pendingVerification: responseData.pendingVerification || false,
          lastUpdated: new Date().toISOString()
        }));
      }
      
      toast({
        title: "Thành công",
        description: "Đã cập nhật thông tin ngân hàng"
      });
      
      setIsEditMode(false);
      refreshUser(); // Refresh user data to get updated bank info
      
    } catch (error) {
      console.error('Error updating bank info:', error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật thông tin ngân hàng",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, user, getToken, refreshUser, toast]);

  const isVerified = formData.verified || false;
  const isPending = formData.pendingVerification && !isVerified;
  const hasBankInfo = formData.bankName && formData.accountNumber;

  const getBankInfoStatus = () => {
    if (isVerified) {
      return (
        <div className="bg-green-900/20 p-4 rounded-lg border border-green-700/50 mb-6">
          <p className="text-sm text-green-400 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Thông tin ngân hàng đã được xác minh
          </p>
          {formData.verifiedAt && (
            <p className="text-xs text-green-400/70 mt-1">
              Xác minh vào: {formatDate(formData.verifiedAt)}
            </p>
          )}
        </div>
      );
    }

    if (isPending) {
      return (
        <div className="bg-amber-900/20 p-4 rounded-lg border border-amber-700/50 mb-6">
          <p className="text-sm text-amber-400 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Thông tin ngân hàng đang được xem xét
          </p>
          {formData.submittedAt && (
            <p className="text-xs text-amber-400/70 mt-1">
              Gửi yêu cầu vào: {formatDate(formData.submittedAt)}
            </p>
          )}
        </div>
      );
    }

    if (!hasBankInfo) {
      return (
        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-700/50 mb-6">
          <p className="text-sm text-blue-400 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Bạn chưa cập nhật thông tin ngân hàng
          </p>
          <p className="text-xs text-blue-400/70 mt-1">
            Vui lòng cập nhật thông tin ngân hàng để tiếp tục
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-gray-900 text-white p-6 rounded-xl">
      {getBankInfoStatus()}

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">{user?.username || 'Người dùng'}</h2>
        <p className="text-sm text-gray-400">ID: {user?._id || user?.id || 'N/A'}</p>
        <p className="text-sm text-gray-400">Ngày đăng ký: {formatDate(user?.createdAt) || 'N/A'}</p>
        <div className="mt-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
            ${isVerified ? 'bg-green-900/30 text-green-400' : 
              isPending ? 'bg-yellow-900/30 text-yellow-400' : 
              'bg-orange-900/30 text-orange-400'}`}>
            {isVerified ? <CheckCircle className="w-4 h-4 mr-1" /> : 
             isPending ? <AlertTriangle className="w-4 h-4 mr-1" /> : 
             <XCircle className="w-4 h-4 mr-1" />}
            {isVerified ? 'Đã xác minh' : isPending ? 'Đang chờ xác minh' : 'Chưa xác minh'}
          </span>
        </div>
      </div>

      {(hasBankInfo || isVerified || isPending) && (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700/50 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Building className="h-5 w-5" />
              Thông tin ngân hàng
            </h3>
            <span className={`text-xs px-3 py-1 rounded-full
              ${isVerified ? 'bg-green-500/20 text-green-400' : 
                'bg-amber-500/20 text-amber-400'}`}>
              {isVerified ? 'Đã xác minh' : 'Đang xác minh'}
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Chủ tài khoản</p>
                <p className="font-medium">{formData.fullName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Ngân hàng</p>
                <p className="font-medium">{formData.bankName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Số tài khoản</p>
                <p className="font-medium">{formData.accountNumber}</p>
              </div>
            </div>
            {formData.submittedAt && (
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Ngày gửi yêu cầu</p>
                  <p className="font-medium">{formatDate(formData.submittedAt)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phần xác minh danh tính đã được chuyển sang component IdentityVerificationSection riêng biệt */}

      {(isEditMode || !hasBankInfo) && (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700/50">
          <h3 className="text-lg font-medium mb-4">
            {hasBankInfo ? 'Chỉnh sửa thông tin' : 'Thêm thông tin ngân hàng'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium mb-2 text-gray-300">
                Tên chủ tài khoản
              </label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Nhập tên chủ tài khoản"
                disabled={isVerified || isPending}
                className="bg-gray-900/50 border-gray-700"
              />
            </div>
            <div>
              <label htmlFor="bankName" className="block text-sm font-medium mb-2 text-gray-300">
                Tên ngân hàng
              </label>
              <Input
                id="bankName"
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                placeholder="Ví dụ: Vietcombank, Techcombank..."
                disabled={isVerified || isPending}
                className="bg-gray-900/50 border-gray-700"
              />
            </div>
            <div>
              <label htmlFor="accountNumber" className="block text-sm font-medium mb-2 text-gray-300">
                Số tài khoản
              </label>
              <Input
                id="accountNumber"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleInputChange}
                placeholder="Nhập số tài khoản"
                disabled={isVerified || isPending}
                className="bg-gray-900/50 border-gray-700"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
              />
            </div>
            <div className="flex gap-3 pt-2">
              {isEditMode && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditMode(false)}
                  className="flex-1"
                >
                  Hủy
                </Button>
              )}
              <Button
                type="submit"
                disabled={isSubmitting || isVerified || isPending}
                className={isEditMode ? 'flex-1' : 'w-full'}
              >
                {isSubmitting ? (
                  <>
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                    Đang xử lý...
                  </>
                ) : hasBankInfo ? 'Cập nhật thông tin' : 'Lưu thông tin'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {hasBankInfo && !isEditMode && !isVerified && !isPending && (
        <Button
          onClick={toggleEditMode}
          className="mt-4 w-full"
        >
          Chỉnh sửa thông tin ngân hàng
        </Button>
      )}
    </div>
  );
}