"use client";

import React, { useState, useEffect, useRef, useCallback, ChangeEvent, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { Menu, X, Loader2, Upload, CheckCircle, XCircle, UploadCloud, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import useSWR from 'swr';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { A } from 'framer-motion/dist/types.d-D0HXPxHm';

type TabType = 'overview' | 'bank' | 'verify' | 'password' | 'deposit' | 'withdraw';

interface BankForm {
  fullName: string;
  bankType: string;
  bankName: string;
  accountNumber: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface UploadStatus {
  success: boolean;
  message: string;
}

interface UploadState {
  front: UploadStatus | null;
  back: UploadStatus | null;
}

interface BankInfo {
  accountHolder: string;
  name: string;
  bankName: string;
  accountNumber: string;
  accountType?: string;
  bankType?: string;
  bankCode?: string;
  verified?: boolean;
}

interface VerificationData {
  verified: boolean;
  cccdFront: string;
  cccdBack: string;
  submittedAt?: string;
  status?: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

interface BalanceInfo {
  available: number;
  locked?: number;
  total?: number;
}

interface User {
  _id?: string;
  id?: string;
  username?: string;
  email?: string;
  phone?: string;
  fullName?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  bankInfo?: BankInfo;
  bank?: BankInfo;
  verification?: VerificationData;
  balance?: BalanceInfo | number;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  refreshUser: () => Promise<void>;
}

export default function AccountPage() {
  const { user, isLoading, logout, refreshUser } = useAuth() as AuthContextType;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const toastVariant = {
    default: 'default' as const,
    destructive: 'destructive' as const,
    success: 'success' as const,
    error: 'destructive' as const,
  } as const;

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState({
    verified: false,
    cccdFront: '',
    cccdBack: '',
    submittedAt: '',
  });

  const [frontIdFile, setFrontIdFile] = useState<File | null>(null);
  const [backIdFile, setBackIdFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadState>({
    front: null,
    back: null
  });

  const [bankForm, setBankForm] = useState<BankInfo>({
    accountHolder: user?.bankInfo?.accountHolder || user?.bank?.accountHolder || '',
    name: user?.bankInfo?.name || user?.bank?.name || '',
    bankName: user?.bankInfo?.bankName || user?.bank?.bankName || '',
    accountNumber: user?.bankInfo?.accountNumber || user?.bank?.accountNumber || '',
    accountType: user?.bankInfo?.accountType || 'savings',
    bankType: user?.bankInfo?.bankType || '',
    bankCode: user?.bankInfo?.bankCode || '',
    verified: user?.bankInfo?.verified || false
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // State cho tab nạp tiền
  const [depositAmount, setDepositAmount] = useState('');
  const [depositBill, setDepositBill] = useState<File | null>(null);
  const [isUploadingBill, setIsUploadingBill] = useState(false);
  const [depositBillUrl, setDepositBillUrl] = useState<string | null>(null);
  const [selectedDepositBank, setSelectedDepositBank] = useState('');
  
  // State cho tab rút tiền
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');
  
  // Vô hiệu hóa chức năng chỉnh sửa thông tin ngân hàng
  const [isEditingBankInfo, setIsEditingBankInfo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (user?.verification) {
      setVerificationStatus({
        verified: user.verification.verified || false,
        cccdFront: user.verification.cccdFront || '',
        cccdBack: user.verification.cccdBack || '',
        submittedAt: user.verification.submittedAt || ''
      });
    }
  }, [user]);

  const isVerified = verificationStatus.verified;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Checking authentication status...');
        
        // Lấy token từ localStorage
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        
        const res = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include', // Vẫn giữ để tương thích với phiên bản cũ
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            // Thêm token vào header nếu có
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        
        // Xử lý response
        if (res.ok) {
          const data = await res.json();
          if (data?.success && data.user) {
            console.log('User authenticated:', data.user.username);
            // Cập nhật user state nếu cần
          } else {
            console.log('No user in auth response:', data);
            // Xử lý khi không có user
          }
        } else {
          console.log('Auth check failed with status:', res.status);
          // Xử lý khi API trả về lỗi
        }
      } catch (error) {
        console.error('Failed to refresh user data:', error);
      }
    };
  
    checkAuth();
  }, [user, refreshUser]);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Lấy thông tin ngân hàng nền tảng
  const { data: platformBanks } = useSWR(
    user ? '/api/platform/banks' : null,
    async (url: string) => {
      const res = await fetch(url, { 
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch platform banks');
      return res.json();
    },
    { revalidateOnFocus: false }
  );
  
  // Lấy lịch sử nạp tiền
  const { data: depositHistory } = useSWR(
    user ? '/api/user/deposits' : null,
    async (url: string) => {
      const res = await fetch(url, { 
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch deposit history');
      return res.json();
    },
    { revalidateOnFocus: false }
  );
  
  // Lấy lịch sử rút tiền
  const { data: withdrawHistory } = useSWR(
    user ? '/api/user/withdraws' : null,
    async (url: string) => {
      const res = await fetch(url, { 
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch withdraw history');
      return res.json();
    },
    { revalidateOnFocus: false }
  );

  const getBalance = (balance: number | BalanceInfo | undefined): number => {
    if (balance === undefined) return 0;
    if (typeof balance === 'number') return balance;
    if (balance && 'available' in balance) return Number(balance.available) || 0;
    return 0;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    
    // Try to get token from localStorage first
    const token = localStorage.getItem('authToken');
    if (token) return token;
    
    // If still not found, try to get it from cookies
    const cookies = document.cookie.split(';').reduce((cookies, cookie) => {
      const [name, value] = cookie.split('=').map(c => c.trim());
      cookies[name] = value;
      return cookies;
    }, {} as Record<string, string>);
    
    return cookies.authToken || null;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast({
        title: 'Lỗi',
        description: 'Chỉ chấp nhận file ảnh định dạng JPG hoặc PNG',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Lỗi',
        description: 'Kích thước file tối đa là 5MB',
        variant: 'destructive',
      });
      return;
    }

    if (type === 'front') {
      setFrontIdFile(file);
      setUploadStatus(prev => ({ ...prev, front: null }));
    } else {
      setBackIdFile(file);
      setUploadStatus(prev => ({ ...prev, back: null }));
    }
  };

  const handleUpload = async (type: 'front' | 'back') => {
    const file = type === 'front' ? frontIdFile : backIdFile;
    if (!file) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn tệp để tải lên',
        variant: 'destructive',
      });
      return;
    }

    // Check authentication first
    const token = getToken();
    if (!token) {
      toast({
        title: 'Lỗi xác thực',
        description: 'Vui lòng đăng nhập lại để tiếp tục',
        variant: 'destructive',
      });
      router.push('/login');
      return;
    }

    setIsUploading(true);
    setUploadStatus(prev => ({ ...prev, [type]: { status: 'uploading' } }));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      // Get fresh token on each request
      const token = getToken();
      if (!token) {
        throw new Error('Không tìm thấy thông tin xác thực. Vui lòng đăng nhập lại.');
      }

      // Add cache-control headers to prevent caching
      const headers = new Headers();
      headers.append('Authorization', `Bearer ${token}`);
      headers.append('Cache-Control', 'no-cache, no-store, must-revalidate');
      headers.append('Pragma', 'no-cache');
      headers.append('Expires', '0');

      const response = await fetch('/api/upload-verification', {
        method: 'POST',
        headers: headers,
        body: formData,
        credentials: 'include', // Include cookies in the request
        cache: 'no-store' // Prevent caching
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Có lỗi xảy ra khi tải lên ảnh');
      }

      const data = await response.json();
      setVerificationStatus(prev => ({
        ...prev,
        [type === 'front' ? 'cccdFront' : 'cccdBack']: data.url,
        status: 'pending',
        submittedAt: new Date().toISOString()
      }));

      // Refresh user data after successful upload
      await refreshUser();
      
      toast({
        title: 'Thành công',
        description: `Đã tải lên ảnh ${type === 'front' ? 'mặt trước' : 'mặt sau'} thành công`,
        variant: 'default',
      });
      
      // Reset the file input
      if (type === 'front') {
        setFrontIdFile(null);
      } else {
        setBackIdFile(null);
      }

      setUploadStatus(prev => ({
        ...prev,
        [type]: { success: true, message: 'Tải lên thành công' }
      }));
    } catch (error) {
      console.error(`Lỗi khi tải lên ảnh ${type === 'front' ? 'mặt trước' : 'mặt sau'}:`, error);
      
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải lên ảnh',
        variant: 'destructive',
      });

      setUploadStatus(prev => ({
        ...prev,
        [type]: { success: false, message: error instanceof Error ? error.message : 'Có lỗi xảy ra' }
      }));
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));

    if (passwordError) {
      setPasswordError('');
    }
  };

  const handleBankInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBankForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBankFormChange = handleBankInfoChange;

  const handleSubmitBankInfo = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Không tìm thấy token xác thực');
      }

      const response = await fetch('/api/update-bank-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bankForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Có lỗi xảy ra khi cập nhật thông tin ngân hàng');
      }

      const data = await response.json();

      toast({
        title: 'Thành công',
        description: 'Cập nhật thông tin ngân hàng thành công',
        variant: 'default',
      });
    } catch (error) {
      console.error('Update bank info error:', error);
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật thông tin ngân hàng',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setIsSaving(true);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Không tìm thấy token xác thực');
      }

      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Thành công',
          description: 'Mật khẩu đã được cập nhật',
          variant: toastVariant.success
        });
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setPasswordError(data.message || 'Có lỗi xảy ra khi đổi mật khẩu');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError('Có lỗi xảy ra khi đổi mật khẩu');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Xử lý thay đổi file bill nạp tiền
  const handleDepositBillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      toast({
        title: 'Lỗi',
        description: 'Chỉ chấp nhận file ảnh định dạng JPG hoặc PNG',
        variant: toastVariant.error
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: 'Lỗi',
        description: 'Kích thước file không được vượt quá 5MB',
        variant: toastVariant.error
      });
      return;
    }

    setDepositBill(file);
  };

  // Xử lý upload bill nạp tiền
  const handleUploadDepositBill = async () => {
    if (!depositBill) return;

    setIsUploadingBill(true);
    const formData = new FormData();
    formData.append('file', depositBill);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Không tìm thấy token xác thực');
      }

      const response = await fetch('/api/upload/bill', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDepositBillUrl(data.url);
        toast({
          title: 'Thành công',
          description: 'Tải lên bill thành công',
          variant: toastVariant.success
        });
      } else {
        toast({
          title: 'Lỗi',
          description: data.message || 'Có lỗi xảy ra khi tải lên bill',
          variant: toastVariant.error
        });
      }
    } catch (error) {
      console.error('Error uploading bill:', error);
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra khi tải lên bill',
        variant: toastVariant.error
      });
    } finally {
      setIsUploadingBill(false);
    }
  };

  // Xử lý gửi yêu cầu nạp tiền
  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập số tiền hợp lệ',
        variant: toastVariant.error
      });
      return;
    }

    if (!selectedDepositBank) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn ngân hàng',
        variant: toastVariant.error
      });
      return;
    }

    if (!depositBillUrl) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng tải lên bill chuyển khoản',
        variant: toastVariant.error
      });
      return;
    }

    setIsSaving(true);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Không tìm thấy token xác thực');
      }

      const response = await fetch('/api/user/deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(depositAmount),
          bankName: selectedDepositBank,
          billUrl: depositBillUrl
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Thành công',
          description: 'Yêu cầu nạp tiền đã được gửi',
          variant: toastVariant.success
        });
        setDepositAmount('');
        setSelectedDepositBank('');
        setDepositBill(null);
        setDepositBillUrl(null);
      } else {
        toast({
          title: 'Lỗi',
          description: data.message || 'Có lỗi xảy ra khi gửi yêu cầu nạp tiền',
          variant: toastVariant.error
        });
      }
    } catch (error) {
      console.error('Error submitting deposit:', error);
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra khi gửi yêu cầu nạp tiền',
        variant: toastVariant.error
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Xử lý gửi yêu cầu rút tiền
  const handleSubmitWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập số tiền hợp lệ',
        variant: toastVariant.error
      });
      return;
    }

    // Kiểm tra số dư
    const balance = getBalance(user?.balance);
    if (parseFloat(withdrawAmount) > balance) {
      toast({
        title: 'Lỗi',
        description: 'Số dư không đủ để thực hiện giao dịch này',
        variant: toastVariant.error
      });
      return;
    }

    // Kiểm tra thông tin ngân hàng
    if (!user?.bankInfo?.accountNumber || !user?.bankInfo?.accountHolder || !user?.bankInfo?.bankName) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng cập nhật thông tin ngân hàng trước khi rút tiền',
        variant: toastVariant.error
      });
      setActiveTab('bank');
      return;
    }

    setIsSaving(true);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Không tìm thấy token xác thực');
      }

      const response = await fetch('/api/user/withdraws', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(withdrawAmount),
          note: withdrawNote
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Thành công',
          description: 'Yêu cầu rút tiền đã được gửi',
          variant: toastVariant.success
        });
        setWithdrawAmount('');
        setWithdrawNote('');
      } else {
        toast({
          title: 'Lỗi',
          description: data.message || 'Có lỗi xảy ra khi gửi yêu cầu rút tiền',
          variant: toastVariant.error
        });
      }
    } catch (error) {
      console.error('Error submitting withdraw:', error);
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra khi gửi yêu cầu rút tiền',
        variant: toastVariant.error
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle authentication state and redirects
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Check if we're already on the login page to prevent loops
    const isLoginPage = window.location.pathname === '/login';
    const token = getToken();
    
    // If no token and not on login page, redirect to login
    if (!token && !isLoginPage) {
      // Store the current URL to return after login
      const returnUrl = window.location.pathname + window.location.search;
      router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    // If we have a token but no user data yet, try to refresh
    if (token && !user && !isLoading) {
      refreshUser().catch(() => {
        // If refresh fails, clear invalid token and redirect to login
        localStorage.removeItem('authToken');
        router.push('/login');
      });
    }
  }, [user, isLoading, router, refreshUser]);

  // Show loading state only when we're still loading and have a token
  if ((isLoading && getToken()) || (!user && getToken())) {
    return (
      <div className="min-h-screen bg-gray-900 flex justify-center items-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
          <p className="text-gray-400">Đang tải thông tin tài khoản...</p>
        </div>
      </div>
    );
  }

  // If no user and no token, we'll be redirected by the useEffect
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar - Hidden on mobile, shown on desktop */}
          <div className="hidden md:block w-64 flex-shrink-0">
            <div className="bg-gray-800 rounded-lg p-4 sticky top-4">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-blue-600 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h2 className="font-medium">{user.username}</h2>
                  <p className="text-sm text-gray-400">{user.email}</p>
                </div>
              </div>
              
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full text-left px-4 py-2 rounded-md ${activeTab === 'overview' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                  Tổng quan
                </button>
                <button
                  onClick={() => setActiveTab('bank')}
                  className={`w-full text-left px-4 py-2 rounded-md ${activeTab === 'bank' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                  Thông tin ngân hàng
                </button>
                <button
                  onClick={() => setActiveTab('verify')}
                  className={`w-full text-left px-4 py-2 rounded-md ${activeTab === 'verify' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                  Xác minh danh tính
                </button>
                <button
                  onClick={() => setActiveTab('password')}
                  className={`w-full text-left px-4 py-2 rounded-md ${activeTab === 'password' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                  Đổi mật khẩu
                </button>
                <button
                  onClick={() => setActiveTab('deposit')}
                  className={`w-full text-left px-4 py-2 rounded-md ${activeTab === 'deposit' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                  Nạp tiền
                </button>
                <button
                  onClick={() => setActiveTab('withdraw')}
                  className={`w-full text-left px-4 py-2 rounded-md ${activeTab === 'withdraw' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                  Rút tiền
                </button>
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 rounded-md text-red-400 hover:bg-gray-700"
                >
                  Đăng xuất
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Mobile Navigation - Only show on mobile */}
            <div className="md:hidden mb-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-blue-600 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h2 className="font-medium text-sm">{user.username}</h2>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 py-2 text-sm rounded ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  >
                    Tổng quan
                  </button>
                  <button
                    onClick={() => setActiveTab('bank')}
                    className={`px-3 py-2 text-sm rounded ${activeTab === 'bank' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  >
                    Ngân hàng
                  </button>
                  <button
                    onClick={() => setActiveTab('verify')}
                    className={`px-3 py-2 text-sm rounded ${activeTab === 'verify' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  >
                    Xác minh
                  </button>
                  <button
                    onClick={() => setActiveTab('password')}
                    className={`px-3 py-2 text-sm rounded ${activeTab === 'password' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  >
                    Mật khẩu
                  </button>
                  <button
                    onClick={() => setActiveTab('deposit')}
                    className={`px-3 py-2 text-sm rounded ${activeTab === 'deposit' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  >
                    Nạp tiền
                  </button>
                  <button
                    onClick={() => setActiveTab('withdraw')}
                    className={`px-3 py-2 text-sm rounded ${activeTab === 'withdraw' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  >
                    Rút tiền
                  </button>
                </div>
              </div>
            </div>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold">Tổng quan tài khoản</h1>
                
                <div className="bg-gray-800/50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Thông tin cá nhân</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400">Họ và tên</p>
                      <p>{user.fullName || 'Chưa cập nhật'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Email</p>
                      <p>{user.email || 'Chưa cập nhật'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Số điện thoại</p>
                      <p>{user.phone || 'Chưa cập nhật'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Địa chỉ</p>
                      <p>{user.address || 'Chưa cập nhật'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Trạng thái tài khoản</h3>
                  <div className="space-y-3">
                    <p>
                      <span className="text-gray-400">Xác minh danh tính:</span>{' '}
                      {isVerified ? (
                        <span className="text-green-400 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1" /> Đã xác minh
                        </span>
                      ) : (
                        <span className="text-yellow-400">Chưa xác minh</span>
                      )}
                    </p>
                    <p><span className="text-gray-400">Số dư khả dụng:</span> {getBalance(user.balance).toLocaleString()} VNĐ</p>
                    <p><span className="text-gray-400">Ngày tạo tài khoản:</span> {formatDate(user.createdAt)}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'bank' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h1 className="text-2xl font-bold">Thông tin ngân hàng</h1>
                  {/* Nút chỉnh sửa đã bị ẩn theo yêu cầu */}
                </div>

                {false ? ( // Vô hiệu hóa hoàn toàn form chỉnh sửa
                  <form onSubmit={handleSubmitBankInfo} className="space-y-4 max-w-2xl">
                    <div>
                      <label htmlFor="fullName" className="block text-gray-400 mb-1">Tên chủ tài khoản</label>
                      <input
                        id="fullName"
                        name="accountHolder"
                        type="text"
                        value={bankForm.accountHolder}
                        onChange={handleBankFormChange}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                        required 
                      />
                    </div>
                    <div>
                      <label htmlFor="bankType" className="block text-gray-400 mb-1">Loại tài khoản</label>
                      <select
                        id="bankType"
                        name="bankType"
                        value={bankForm.bankType}
                        onChange={handleBankFormChange}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                        required
                      >
                        <option value="">Chọn loại tài khoản</option>
                        <option value="Ngân hàng">Ngân hàng</option>
                        <option value="Ví điện tử">Ví điện tử</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="bankName" className="block text-gray-400 mb-1">Tên ngân hàng/Ví điện tử</label>
                      <input
                        id="bankName"
                        name="bankName"
                        type="text"
                        value={bankForm.bankName}
                        onChange={handleBankFormChange}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                        required 
                      />
                    </div>
                    <div>
                      <label htmlFor="accountNumber" className="block text-gray-400 mb-1">Số tài khoản/Số điện thoại</label>
                      <input
                        id="accountNumber"
                        name="accountNumber"
                        type="text"
                        value={bankForm.accountNumber}
                        onChange={handleBankFormChange}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                        required 
                      />
                    </div>
                    <div className="flex space-x-3 pt-2">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang lưu...
                          </>
                        ) : 'Lưu thay đổi'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-gray-600 text-white hover:bg-gray-700"
                        onClick={() => setIsEditingBankInfo(false)}
                      >
                        Hủy
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="bg-gray-800/50 p-6 rounded-lg max-w-2xl">
                    <div className="space-y-3">
                      <p><span className="text-gray-400">Tên chủ tài khoản:</span> {bankForm.accountHolder || 'Chưa cập nhật'}</p>
                      <p><span className="text-gray-400">Loại tài khoản:</span> {bankForm.bankType || 'Chưa cập nhật'}</p>
                      <p><span className="text-gray-400">Tên ngân hàng/Ví điện tử:</span> {bankForm.bankName || 'Chưa cập nhật'}</p>
                      <p><span className="text-gray-400">Số tài khoản/SĐT:</span> {bankForm.accountNumber || 'Chưa cập nhật'}</p>
                      <p>
                        <span className="text-gray-400">Trạng thái xác minh:</span>{' '}
                        {bankForm.verified ? (
                          <span className="text-green-400">Đã xác minh</span>
                        ) : (
                          <span className="text-yellow-400">Chưa xác minh</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
  
            {activeTab === 'verify' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold mb-2">Xác minh danh tính</h1>
                  <p className="text-gray-400">Vui lòng tải lên ảnh chụp 2 mặt CMND/CCCD của bạn</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Front ID Card */}
                  <div className="bg-gray-800/50 rounded-lg p-6">
                    <h3 className="font-medium mb-4">Mặt trước CMND/CCCD</h3>
                    {verificationStatus.cccdFront ? (
                      <div className="relative">
                        <img 
                          src={verificationStatus.cccdFront} 
                          alt="Mặt trước CMND/CCCD"
                          className="w-full h-auto rounded border border-gray-700"
                        />
                        {uploadStatus.front && (
                          <div className={`mt-2 text-sm ${uploadStatus.front.success ? 'text-green-400' : 'text-red-400'}`}>
                            {uploadStatus.front.success ? (
                              <span className="flex items-center">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                {uploadStatus.front.message}
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <XCircle className="w-4 h-4 mr-1" />
                                {uploadStatus.front.message}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          id="frontId"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, 'front')}
                        />
                        <label
                          htmlFor="frontId"
                          className="flex flex-col items-center justify-center cursor-pointer p-6"
                        >
                          <UploadCloud className="w-12 h-12 text-gray-500 mb-2" />
                          <p className="text-gray-400">Tải lên mặt trước CMND/CCCD</p>
                          <p className="text-xs text-gray-500 mt-1">JPG, PNG (tối đa 5MB)</p>
                        </label>
                        {frontIdFile && (
                          <Button
                            onClick={() => handleUpload('front')}
                            disabled={isUploading}
                            className="mt-4 w-full"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Đang tải lên...
                              </>
                            ) : 'Xác nhận tải lên'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Back ID Card */}
                  <div className="bg-gray-800/50 rounded-lg p-6">
                    <h3 className="font-medium mb-4">Mặt sau CMND/CCCD</h3>
                    {verificationStatus.cccdBack ? (
                      <div className="relative">
                        <img 
                          src={verificationStatus.cccdBack} 
                          alt="Mặt sau CMND/CCCD"
                          className="w-full h-auto rounded border border-gray-700"
                        />
                        {uploadStatus.back && (
                          <div className={`mt-2 text-sm ${uploadStatus.back.success ? 'text-green-400' : 'text-red-400'}`}>
                            {uploadStatus.back.success ? (
                              <span className="flex items-center">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                {uploadStatus.back.message}
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <XCircle className="w-4 h-4 mr-1" />
                                {uploadStatus.back.message}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          id="backId"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, 'back')}
                        />
                        <label
                          htmlFor="backId"
                          className="flex flex-col items-center justify-center cursor-pointer p-6"
                        >
                          <UploadCloud className="w-12 h-12 text-gray-500 mb-2" />
                          <p className="text-gray-400">Tải lên mặt sau CMND/CCCD</p>
                          <p className="text-xs text-gray-500 mt-1">JPG, PNG (tối đa 5MB)</p>
                        </label>
                        {backIdFile && (
                          <Button
                            onClick={() => handleUpload('back')}
                            disabled={isUploading}
                            className="mt-4 w-full"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Đang tải lên...
                              </>
                            ) : 'Xác nhận tải lên'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 bg-blue-900/20 border border-blue-800/50 rounded-lg p-4 text-sm text-blue-200">
                  <h4 className="font-medium mb-2">Hướng dẫn tải ảnh:</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Ảnh phải rõ nét, không bị mờ, không bị che khuất</li>
                    <li>• Chụp đầy đủ 4 góc CMND/CCCD</li>
                    <li>• Đảm bảo thông tin trên CMND/CCCD dễ đọc</li>
                    <li>• Kích thước tối đa: 5MB/ảnh</li>
                  </ul>
                </div>

                <div className="p-4 bg-yellow-900/20 border border-yellow-800/50 rounded-lg">
                  <h4 className="font-medium text-yellow-300 mb-2">Lưu ý quan trọng:</h4>
                  <ul className="text-sm text-yellow-200 space-y-1">
                    <li>• Thông tin của bạn sẽ được bảo mật và chỉ sử dụng cho mục đích xác minh danh tính</li>
                    <li>• Thời gian xử lý: Thông thường từ 1-3 ngày làm việc</li>
                    <li>• Vui lòng đảm bảo thông tin trên CMND/CCCD rõ ràng và dễ đọc</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'password' && (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold">Đổi mật khẩu</h1>
                
                <div className="bg-gray-800/50 p-6 rounded-lg max-w-2xl">
                  <form onSubmit={handleSubmitPassword} className="space-y-4">
                    <div>
                      <label htmlFor="currentPassword" className="block text-gray-400 mb-1">Mật khẩu hiện tại</label>
                      <input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="newPassword" className="block text-gray-400 mb-1">Mật khẩu mới</label>
                      <input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                        required
                        minLength={6}
                      />
                      {passwordError && <p className="mt-1 text-sm text-red-400">{passwordError}</p>}
                    </div>
                    <Button type="submit" className="mt-4 bg-blue-600 hover:bg-blue-700" disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang xử lý...
                        </>
                      ) : (
                        'Cập nhật mật khẩu'
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'deposit' && (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold">Nạp tiền</h1>
                
                {/* Thông tin ngân hàng nền tảng */}
                <div className="bg-gray-800/50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Thông tin chuyển khoản</h3>
                  {platformBanksLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    </div>
                  ) : platformBanksError ? (
                    <div className="p-4 text-red-400 text-center">
                      Không thể tải thông tin ngân hàng. Vui lòng thử lại sau.
                    </div>
                  ) : platformBanks && platformBanks.length > 0 ? (
                    <div className="space-y-4">
                      {platformBanks.map((bank, index) => (
                        <div key={index} className="border border-gray-700 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-gray-400 text-sm">Ngân hàng</p>
                              <p className="font-medium">{bank.bankName}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-sm">Chủ tài khoản</p>
                              <p className="font-medium">{bank.accountHolder}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-sm">Số tài khoản</p>
                              <div className="flex items-center">
                                <p className="font-medium mr-2">{bank.accountNumber}</p>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(bank.accountNumber);
                                    toast({
                                      title: "Đã sao chép",
                                      description: "Số tài khoản đã được sao chép vào clipboard",
                                      variant: "default",
                                    });
                                  }}
                                  className="text-blue-500 hover:text-blue-400 text-xs"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <div>
                              <p className="text-gray-400 text-sm">Chi nhánh</p>
                              <p className="font-medium">{bank.branch || "Không có thông tin"}</p>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-gray-700">
                            <p className="text-gray-400 text-sm mb-1">Nội dung chuyển khoản</p>
                            <div className="flex items-center bg-gray-900 p-2 rounded">
                              <p className="font-medium mr-2">{user?.username || "NAP_username"}</p>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(user?.username || "NAP_username");
                                  toast({
                                    title: "Đã sao chép",
                                    description: "Nội dung chuyển khoản đã được sao chép vào clipboard",
                                    variant: "default",
                                  });
                                }}
                                className="text-blue-500 hover:text-blue-400 text-xs"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-yellow-400 text-center">
                      Không có thông tin ngân hàng nào được cấu hình.
                    </div>
                  )}
                </div>
                
                {/* Form nạp tiền */}
                <div className="bg-gray-800/50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Tạo yêu cầu nạp tiền</h3>
                  <form onSubmit={handleSubmitDeposit} className="space-y-4 max-w-2xl">
                    <div>
                      <label htmlFor="depositAmount" className="block text-gray-400 mb-1">Số tiền nạp (VNĐ)</label>
                      <input
                        id="depositAmount"
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                        placeholder="Nhập số tiền"
                        required
                        min="10000"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="depositBank" className="block text-gray-400 mb-1">Chọn ngân hàng đã chuyển</label>
                      <select
                        id="depositBank"
                        value={selectedDepositBank}
                        onChange={(e) => setSelectedDepositBank(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                        required
                      >
                        <option value="">Chọn ngân hàng</option>
                        {platformBanks && platformBanks.map((bank, index) => (
                          <option key={index} value={bank.bankName}>
                            {bank.bankName}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 mb-1">Bill chuyển khoản</label>
                      <div className="border border-dashed border-gray-700 rounded-lg p-4">
                        <input
                          type="file"
                          id="depositBill"
                          accept="image/jpeg,image/png,image/jpg"
                          className="hidden"
                          onChange={handleDepositBillChange}
                        />
                        
                        {depositBill ? (
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <FileImage className="h-5 w-5 mr-2 text-blue-500" />
                              <span className="text-sm">{depositBill.name}</span>
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button 
                                type="button" 
                                onClick={handleUploadDepositBill} 
                                disabled={isUploadingBill || depositBillUrl}
                                className="text-xs py-1 px-3 h-auto"
                              >
                                {isUploadingBill ? (
                                  <>
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    Đang tải lên...
                                  </>
                                ) : depositBillUrl ? (
                                  <>
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    Đã tải lên
                                  </>
                                ) : (
                                  'Tải lên'
                                )}
                              </Button>
                              
                              <Button 
                                type="button" 
                                onClick={() => {
                                  setDepositBill(null);
                                  setDepositBillUrl(null);
                                }}
                                variant="destructive"
                                className="text-xs py-1 px-3 h-auto"
                              >
                                Xóa
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <label
                            htmlFor="depositBill"
                            className="flex flex-col items-center justify-center cursor-pointer p-4"
                          >
                            <UploadCloud className="w-10 h-10 text-gray-500 mb-2" />
                            <p className="text-gray-400">Tải lên ảnh bill chuyển khoản</p>
                            <p className="text-xs text-gray-500 mt-1">JPG, PNG (tối đa 5MB)</p>
                          </label>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="mt-4 bg-blue-600 hover:bg-blue-700" 
                      disabled={isSaving || !depositBillUrl}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang xử lý...
                        </>
                      ) : (
                        'Gửi yêu cầu nạp tiền'
                      )}
                    </Button>
                  </form>
                </div>
                
                {/* Lịch sử nạp tiền */}
                <div className="bg-gray-800/50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Lịch sử nạp tiền</h3>
                  {depositsLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    </div>
                  ) : depositsError ? (
                    <div className="p-4 text-red-400 text-center">
                      Không thể tải lịch sử nạp tiền. Vui lòng thử lại sau.
                    </div>
                  ) : deposits && deposits.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-700">
                            <th className="pb-2 text-left">Mã giao dịch</th>
                            <th className="pb-2 text-left">Ngày</th>
                            <th className="pb-2 text-right">Số tiền</th>
                            <th className="pb-2 text-left">Ngân hàng</th>
                            <th className="pb-2 text-left">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deposits.map((deposit, index) => (
                            <tr key={index} className="border-b border-gray-800">
                              <td className="py-3">{deposit.id || deposit._id}</td>
                              <td className="py-3">{formatDate(deposit.createdAt)}</td>
                              <td className="py-3 text-right">{formatCurrency(deposit.amount)} VNĐ</td>
                              <td className="py-3">{deposit.bankName}</td>
                              <td className="py-3">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  deposit.status === 'approved' ? 'bg-green-900/30 text-green-400' :
                                  deposit.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                                  deposit.status === 'rejected' ? 'bg-red-900/30 text-red-400' :
                                  'bg-gray-900/30 text-gray-400'
                                }`}>
                                  {deposit.status === 'approved' ? 'Đã duyệt' :
                                   deposit.status === 'pending' ? 'Đang xử lý' :
                                   deposit.status === 'rejected' ? 'Từ chối' : deposit.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 text-gray-400 text-center">
                      Bạn chưa có giao dịch nạp tiền nào.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'withdraw' && (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold">Rút tiền</h1>
                
                {/* Form rút tiền */}
                <div className="bg-gray-800/50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Tạo yêu cầu rút tiền</h3>
                  
                  {/* Thông tin ngân hàng người dùng */}
                  <div className="mb-6 p-4 border border-gray-700 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Thông tin tài khoản nhận tiền</h4>
                    {user?.bankInfo?.accountNumber ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-400 text-xs">Chủ tài khoản</p>
                          <p className="font-medium">{user.bankInfo.accountHolder}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Ngân hàng</p>
                          <p className="font-medium">{user.bankInfo.bankName}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Số tài khoản</p>
                          <p className="font-medium">{user.bankInfo.accountNumber}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-yellow-400 text-sm">
                        <p>Bạn chưa cập nhật thông tin ngân hàng.</p>
                        <button 
                          onClick={() => setActiveTab('bank')} 
                          className="text-blue-400 hover:underline mt-1"
                        >
                          Cập nhật ngay
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <form onSubmit={handleSubmitWithdraw} className="space-y-4 max-w-2xl">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label htmlFor="withdrawAmount" className="block text-gray-400">Số tiền rút (VNĐ)</label>
                        <span className="text-gray-400 text-xs">Số dư: {formatCurrency(getBalance(user?.balance))} VNĐ</span>
                      </div>
                      <input
                        id="withdrawAmount"
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                        placeholder="Nhập số tiền"
                        required
                        min="50000"
                        max={getBalance(user?.balance)}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="withdrawNote" className="block text-gray-400 mb-1">Ghi chú (không bắt buộc)</label>
                      <textarea
                        id="withdrawNote"
                        value={withdrawNote}
                        onChange={(e) => setWithdrawNote(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                        placeholder="Nhập ghi chú nếu cần"
                        rows={3}
                      />
                    </div>
                    
                    <div className="p-3 bg-yellow-900/20 border border-yellow-800/50 rounded-lg text-sm text-yellow-200">
                      <p className="flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Lưu ý: Yêu cầu rút tiền sẽ được xử lý trong vòng 24 giờ làm việc.
                      </p>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="mt-4 bg-blue-600 hover:bg-blue-700" 
                      disabled={isSaving || !user?.bankInfo?.accountNumber}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang xử lý...
                        </>
                      ) : (
                        'Gửi yêu cầu rút tiền'
                      )}
                    </Button>
                  </form>
                </div>
                
                {/* Lịch sử rút tiền */}
                <div className="bg-gray-800/50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Lịch sử rút tiền</h3>
                  {withdrawsLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    </div>
                  ) : withdrawsError ? (
                    <div className="p-4 text-red-400 text-center">
                      Không thể tải lịch sử rút tiền. Vui lòng thử lại sau.
                    </div>
                  ) : withdraws && withdraws.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-700">
                            <th className="pb-2 text-left">Mã giao dịch</th>
                            <th className="pb-2 text-left">Ngày</th>
                            <th className="pb-2 text-right">Số tiền</th>
                            <th className="pb-2 text-left">Ghi chú</th>
                            <th className="pb-2 text-left">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {withdraws.map((withdraw, index) => (
                            <tr key={index} className="border-b border-gray-800">
                              <td className="py-3">{withdraw.id || withdraw._id}</td>
                              <td className="py-3">{formatDate(withdraw.createdAt)}</td>
                              <td className="py-3 text-right">{formatCurrency(withdraw.amount)} VNĐ</td>
                              <td className="py-3">{withdraw.note || '-'}</td>
                              <td className="py-3">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  withdraw.status === 'approved' ? 'bg-green-900/30 text-green-400' :
                                  withdraw.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                                  withdraw.status === 'rejected' ? 'bg-red-900/30 text-red-400' :
                                  'bg-gray-900/30 text-gray-400'
                                }`}>
                                  {withdraw.status === 'approved' ? 'Đã duyệt' :
                                   withdraw.status === 'pending' ? 'Đang xử lý' :
                                   withdraw.status === 'rejected' ? 'Từ chối' : withdraw.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 text-gray-400 text-center">
                      Bạn chưa có giao dịch rút tiền nào.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};