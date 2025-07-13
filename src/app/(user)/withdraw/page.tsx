"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, AlertTriangle, CheckCircle, Loader2, Landmark, ArrowRight } from 'lucide-react';
import useSWR from 'swr';
import Link from 'next/link';

// Định nghĩa kiểu cho user để tránh lỗi TypeScript
interface BankInfo {
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  verified?: boolean;
  pendingVerification?: boolean;
}

interface User {
  _id: string;
  id?: string; // Thêm id để tương thích với các API khác
  username: string;
  email: string;
  balance: number;
  bankInfo?: BankInfo;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
}

export default function WithdrawPage() {
  const { user, isLoading, logout, isAuthenticated } = useAuth() as AuthContextType;
  // Lấy token từ localStorage thay vì từ useAuth
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('authToken') : null;
  const router = useRouter();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [hasBankInfo, setHasBankInfo] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingBankInfo, setIsSavingBankInfo] = useState(false);
  const [savedBankInfo, setSavedBankInfo] = useState<{
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    verified?: boolean;
    pendingVerification?: boolean;
  } | null>(null);
  
  const { data: settingsData, error: settingsError } = useSWR(
    token ? '/api/settings' : null,
    url => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json())
  );
  
  // Truy cập settings từ response data
  const settings = settingsData?.settings;

  useEffect(() => {
    if (!isLoading && !user) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng đăng nhập' });
      router.push('/login');
      return;
    }
    
    // Lấy thông tin ngân hàng đã lưu từ localStorage ngay khi trang được tải
    if (typeof window !== 'undefined') {
      const savedBankData = localStorage.getItem('userBankInfo');
      if (savedBankData && user) {
        try {
          const parsedData = JSON.parse(savedBankData);
          if (parsedData.userId === user._id || parsedData.userId === user.id) {
            setSavedBankInfo(parsedData);
            setBankName(parsedData.bankName || '');
            setAccountNumber(parsedData.accountNumber || '');
            setAccountHolder(parsedData.accountHolder || '');
            setHasBankInfo(!!parsedData.bankName && !!parsedData.accountNumber && !!parsedData.accountHolder);
          }
        } catch (error) {
          console.error('Lỗi khi đọc dữ liệu ngân hàng đã lưu:', error);
        }
      }
    }
    
    if (user) {
      // Kiểm tra xem người dùng đã có thông tin ngân hàng chưa
      if (user.bankInfo) {
        setBankName(user.bankInfo.bankName || '');
        setAccountNumber(user.bankInfo.accountNumber || '');
        setAccountHolder(user.bankInfo.accountHolder || '');
        setIsVerified(user.bankInfo.verified || false);
        setHasBankInfo(!!user.bankInfo.bankName && !!user.bankInfo.accountNumber && !!user.bankInfo.accountHolder);
        
        // Lưu thông tin ngân hàng đã xác minh vào state để hiển thị
        if (user.bankInfo.verified) {
          setSavedBankInfo({
            bankName: user.bankInfo.bankName || '',
            accountNumber: user.bankInfo.accountNumber || '',
            accountHolder: user.bankInfo.accountHolder || '',
            verified: true
          });
        } else if (user.bankInfo.pendingVerification) {
          setSavedBankInfo({
            bankName: user.bankInfo.bankName || '',
            accountNumber: user.bankInfo.accountNumber || '',
            accountHolder: user.bankInfo.accountHolder || '',
            pendingVerification: true
          });
        }
      } else {
        setHasBankInfo(false);
      }
    }
  }, [user, isLoading, router, toast]);

  // Hàm lưu thông tin ngân hàng người dùng
  const saveBankInfo = async () => {
    // Kiểm tra nếu thông tin đã được xác nhận hoặc đang chờ xác minh thì không cho phép thay đổi
    if (savedBankInfo?.verified || savedBankInfo?.pendingVerification) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng điền đầy đủ thông tin ngân hàng",
        variant: "destructive",
      });
      return;
    }

    if (savedBankInfo?.verified || savedBankInfo?.pendingVerification) {
      toast({
        title: "Không thể thay đổi",
        description: "Thông tin ngân hàng đã được xác nhận hoặc đang chờ xác minh, không thể thay đổi",
        variant: "destructive",
      });
      return;
    }

    setIsSavingBankInfo(true); // Bắt đầu trạng thái loading

    try {
      const response = await fetch('/api/user/save-bank-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bankName,
          accountNumber,
          accountHolder
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Thành công",
          description: "Đã lưu thông tin ngân hàng",
        });

        // Lưu thông tin vào localStorage
        localStorage.setItem('userBankInfo', JSON.stringify({
          userId: user?._id || user?.id || '',
          bankName,
          accountNumber,
          accountHolder,
          pendingVerification: true,
          savedAt: new Date().toISOString()
        }));

        // Cập nhật state
        setSavedBankInfo({
          bankName,
          accountNumber,
          accountHolder,
          pendingVerification: true
        });
      } else {
        toast({
          title: "Lỗi",
          description: data.message || "Không thể lưu thông tin ngân hàng",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving bank info:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Có lỗi xảy ra khi lưu thông tin ngân hàng',
      });
    } finally {
      setIsSavingBankInfo(false);
    }
  };

  const handleSubmit = async () => {
    if (!amount) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng nhập số tiền rút' });
      return;
    }
    
    if (!hasBankInfo) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Bạn cần liên kết tài khoản ngân hàng trước' });
      return;
    }

    if (settings && (Number(amount) < settings.withdrawals.minAmount || Number(amount) > settings.withdrawals.maxAmount)) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: `Số tiền rút phải từ ${settings.withdrawals.minAmount.toLocaleString()} đ đến ${settings.withdrawals.maxAmount.toLocaleString()} đ`,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: Number(amount), bankName, accountNumber, accountHolder }),
      });
      const result = await res.json();
      if (res.ok) {
        toast({ title: 'Thành công', description: 'Yêu cầu rút tiền đã được gửi' });
        setAmount('');
      } else {
        toast({ variant: 'destructive', title: 'Lỗi', description: result.message });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể gửi yêu cầu' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="bg-gray-800 border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white">Rút tiền</CardTitle>
            <CardDescription className="text-gray-400">
              Rút tiền về tài khoản ngân hàng của bạn
            </CardDescription>
          </CardHeader>
          
          {!hasBankInfo ? (
            <>
              <CardContent className="space-y-4">
                <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-orange-500">Bạn chưa liên kết tài khoản ngân hàng!</h3>
                    <p className="text-sm text-gray-300 mt-1">
                      Để rút tiền, bạn cần liên kết tài khoản ngân hàng trong phần Tài khoản.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                  onClick={() => router.push('/account?tab=bank')}
                >
                  Liên kết ngay
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          ) : (
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="amount" className="text-gray-400 required-field">Số tiền rút</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Nhập số tiền muốn rút"
                    className="bg-gray-700 text-white border-gray-600 focus:border-blue-500"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                    VND
                  </div>
                </div>
                {settings && (
                  <p className="text-sm text-gray-400 mt-1">
                    Số tiền rút tối thiểu: {settings.withdrawals.minAmount.toLocaleString()} VND
                  </p>
                )}
              </div>
              
              {/* Hiển thị thông tin ngân hàng */}
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Landmark className="h-5 w-5" />
                    Thông tin ngân hàng
                    {savedBankInfo?.verified && (
                      <span className="ml-2 text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded-full flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" /> Đã xác minh
                      </span>
                    )}
                    {savedBankInfo?.pendingVerification && (
                      <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-full flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" /> Đang chờ xác minh
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-4">
                    {(savedBankInfo?.verified || savedBankInfo?.pendingVerification || isSavingBankInfo) ? (
                      <>
                        {/* Hiển thị thông tin ngân hàng dạng text khi đã xác minh hoặc đang chờ xác minh hoặc đang lưu */}
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-400">Ngân hàng</label>
                          <Input 
                            type="text" 
                            value={bankName} 
                            readOnly 
                            className="bg-transparent border-gray-700 text-white" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-400">Số tài khoản</label>
                          <Input 
                            type="text" 
                            value={accountNumber} 
                            readOnly 
                            className="bg-transparent border-gray-700 text-white" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-400">Chủ tài khoản</label>
                          <Input 
                            type="text" 
                            value={accountHolder} 
                            readOnly 
                            className="bg-transparent border-gray-700 text-white" 
                          />
                        </div>
                        {isSavingBankInfo && (
                          <div className="bg-blue-900/20 p-3 rounded-md border border-blue-900/30 mt-2">
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <p className="text-sm text-blue-400">Đang lưu thông tin ngân hàng...</p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Hiển thị form nhập liệu khi chưa xác minh */}
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-400">Ngân hàng</label>
                          <Input 
                            type="text" 
                            value={bankName} 
                            onChange={(e) => setBankName(e.target.value)} 
                            placeholder="Nhập tên ngân hàng" 
                            className="bg-transparent border-gray-700 text-white" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-400">Số tài khoản</label>
                          <Input 
                            type="text" 
                            value={accountNumber} 
                            onChange={(e) => setAccountNumber(e.target.value)} 
                            placeholder="Nhập số tài khoản" 
                            className="bg-transparent border-gray-700 text-white" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-400">Chủ tài khoản</label>
                          <Input 
                            type="text" 
                            value={accountHolder} 
                            onChange={(e) => setAccountHolder(e.target.value)} 
                            placeholder="Nhập tên chủ tài khoản" 
                            className="bg-transparent border-gray-700 text-white" 
                          />
                        </div>
                        <Button 
                          onClick={saveBankInfo} 
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md"
                          disabled={savedBankInfo?.verified || savedBankInfo?.pendingVerification}
                        >
                          Lưu thông tin ngân hàng
                        </Button>
                      </>
                    )}
                    
                    {/* Thông báo trạng thái xác minh */}
                    {savedBankInfo?.pendingVerification && (
                      <div className="bg-yellow-900/20 p-3 rounded-md border border-yellow-900/30">
                        <p className="text-sm text-yellow-400 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Thông tin ngân hàng đang chờ xác minh
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            
              <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
                <p className="text-sm text-gray-300">
                  <AlertCircle className="h-4 w-4 text-blue-500 inline mr-2" />
                  Yêu cầu rút tiền sẽ được xử lý trong vòng 24 giờ làm việc. Vui lòng kiểm tra thông tin ngân hàng trước khi gửi yêu cầu.
                </p>
              </div>
              
              {(savedBankInfo?.verified || isVerified) && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5"
                  onClick={handleSubmit}
                  disabled={!amount || isSubmitting || isSavingBankInfo}
                >
                  {isSubmitting || isSavingBankInfo ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Đang xử lý...
                    </>
                  ) : (
                    'Gửi yêu cầu rút tiền'
                  )}
                </Button>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
