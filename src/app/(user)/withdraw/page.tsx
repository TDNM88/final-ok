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

  const { data: settings, error: settingsError } = useSWR(
    token ? '/api/admin/settings' : null,
    url => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json())
  );

  useEffect(() => {
    if (!isLoading && !user) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng đăng nhập' });
      router.push('/login');
      return;
    }
    
    if (user) {
      // Kiểm tra xem người dùng đã có thông tin ngân hàng chưa
      if (user.bankInfo) {
        setBankName(user.bankInfo.bankName || '');
        setAccountNumber(user.bankInfo.accountNumber || '');
        setAccountHolder(user.bankInfo.accountHolder || '');
        setIsVerified(user.bankInfo.verified || false);
        setHasBankInfo(!!user.bankInfo.bankName && !!user.bankInfo.accountNumber && !!user.bankInfo.accountHolder);
      } else {
        setHasBankInfo(false);
      }
    }
  }, [user, isLoading, router, toast]);

  const handleSubmit = async () => {
    if (!amount) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng nhập số tiền rút' });
      return;
    }
    
    if (!hasBankInfo) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Bạn cần liên kết tài khoản ngân hàng trước' });
      return;
    }

    if (settings && (Number(amount) < settings.minWithdrawal || Number(amount) > settings.maxWithdrawal)) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: `Số tiền rút phải từ ${settings.minWithdrawal.toLocaleString()} đ đến ${settings.maxWithdrawal.toLocaleString()} đ`,
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
                    Số tiền rút tối thiểu: {settings.minWithdrawal?.toLocaleString()} VND
                  </p>
                )}
              </div>
              
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Landmark className="h-5 w-5" />
                    Thông tin ngân hàng
                    {isVerified && (
                      <span className="ml-2 text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded-full flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" /> Đã xác minh
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <p className="text-gray-400 text-sm">Ngân hàng:</p>
                      <p className="text-white font-medium">{bankName}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Số tài khoản:</p>
                      <p className="text-white font-medium">{accountNumber}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400 text-sm">Chủ tài khoản:</p>
                      <p className="text-white font-medium">{accountHolder}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
                <p className="text-sm text-gray-300">
                  <AlertCircle className="h-4 w-4 text-blue-500 inline mr-2" />
                  Yêu cầu rút tiền sẽ được xử lý trong vòng 24 giờ làm việc. Vui lòng kiểm tra thông tin ngân hàng trước khi gửi yêu cầu.
                </p>
              </div>
              
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5"
                onClick={handleSubmit}
                disabled={!amount || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Đang xử lý...
                  </>
                ) : (
                  'Gửi yêu cầu rút tiền'
                )}
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
