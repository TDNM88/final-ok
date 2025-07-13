'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import useSWR from 'swr';
import { Upload, Copy, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

// Định nghĩa kiểu cho User để tránh lỗi TypeScript
interface BankInfo {
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  verified?: boolean;
}

interface User {
  _id: string;
  id?: string;
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

export default function DepositPage() {
  const { user, isLoading, isAuthenticated } = useAuth() as AuthContextType;
  const [authToken, setAuthToken] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [bill, setBill] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [billUrl, setBillUrl] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [savedData, setSavedData] = useState<{
    amount: string;
    selectedBank: string;
  } | null>(null);

  // Lấy token từ localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('authToken') : null;

  // Lấy cài đặt chung của hệ thống
  const { data: settings, error: settingsError } = useSWR(
    user ? '/api/admin/settings' : null,
    async (url: string) => {
      const res = await fetch(url, { 
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    }
  );
  
  // Lấy thông tin ngân hàng của nền tảng
  const { data: platformBanks, error: platformBanksError } = useSWR(
    user ? '/api/platform/banks' : null,
    async (url: string) => {
      const res = await fetch(url, { 
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch platform banks');
      return res.json();
    }
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated()) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng đăng nhập' });
      router.push('/login');
      return;
    }
    
    // Lấy dữ liệu đã lưu từ localStorage
    if (typeof window !== 'undefined') {
      const savedDepositData = localStorage.getItem('depositData');
      if (savedDepositData) {
        try {
          const parsedData = JSON.parse(savedDepositData);
          if (parsedData.userId === user?._id || parsedData.userId === user?.id) {
            setSavedData(parsedData);
            setAmount(parsedData.amount || '');
            setSelectedBank(parsedData.selectedBank || '');
          }
        } catch (error) {
          console.error('Lỗi khi đọc dữ liệu đã lưu:', error);
        }
      }
    }
  }, [user, isLoading, isAuthenticated, router, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBill(file);
      handleUploadFile(file);
    }
  };

  const handleUploadFile = async (file: File) => {
    setIsUploading(true);
    setBillUrl(null);
    
    try {
      // Lấy token từ localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('authToken') : null;
      
      if (!token) {
        throw new Error('Không tìm thấy token xác thực');
      }
      
      // Sử dụng API upload-deposit-bill thay vì API upload
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload-deposit-bill', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Upload error:', response.status, errorData);
        throw new Error(`Upload thất bại: ${response.status} ${errorData.message || ''}`);
      }
      
      const data = await response.json();
      setBillUrl(data.url);
      toast({
        title: 'Thành công',
        description: 'Tải lên bill chuyển khoản thành công',
      });
    } catch (error) {
      console.error('Lỗi khi tải lên bill:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể tải lên bill chuyển khoản. Vui lòng thử lại.',
      });
      setBill(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Lưu thông tin người dùng đã nhập vào database
  const saveUserInputData = async () => {
    if (user && amount && selectedBank) {
      try {
        // Lưu vào localStorage để hiển thị ngay lập tức
        const dataToSave = {
          userId: user._id || user.id,
          amount,
          selectedBank,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('depositData', JSON.stringify(dataToSave));
        
        // Lưu vào database
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('authToken') : null;
        
        if (token) {
          const response = await fetch('/api/deposits/save-info', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              amount: Number(amount),
              selectedBank
            })
          });
          
          if (!response.ok) {
            console.error('Lỗi khi lưu thông tin nạp tiền:', await response.text());
          }
        }
      } catch (error) {
        console.error('Lỗi khi lưu thông tin nạp tiền:', error);
      }
    }
  };

  const handleSubmit = async () => {
    if (!amount || !bill || !selectedBank || !isConfirmed) {
      toast({ 
        variant: 'destructive', 
        title: 'Lỗi', 
        description: 'Vui lòng điền đầy đủ thông tin và xác nhận' 
      });
      return;
    }
    
    try {
      // Lưu thông tin người dùng đã nhập
      await saveUserInputData();
      
      toast({
        title: 'Thành công',
        description: 'Yêu cầu nạp tiền đã được gửi. Vui lòng chờ xử lý.',
      });
      
      // Cập nhật trạng thái đã lưu
      setSavedData({
        amount,
        selectedBank
      });
    } catch (error) {
      console.error('Lỗi khi gửi yêu cầu nạp tiền:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể gửi yêu cầu nạp tiền. Vui lòng thử lại sau.',
      });
    }
  };

  if (isLoading || !user) {
    return <div className="flex justify-center items-center h-[60vh] text-gray-600">Đang tải...</div>;
  }

  return (
    <div id="deposit-page" className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Thông tin ngân hàng nền tảng */}
        <Card className="bg-gray-800 border-gray-700 shadow-lg rounded-xl">
          <CardHeader className="border-b border-gray-700 p-6">
            <CardTitle className="text-2xl font-semibold text-white">Thông tin ngân hàng nền tảng</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Nhập số tiền nạp */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium text-white">Số tiền nạp</Label>
              <div className="relative">
                {savedData ? (
                  <div className="bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 flex justify-between items-center">
                    <span>{Number(savedData.amount).toLocaleString()} VND</span>
                    <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded-full flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" /> Đã xác nhận
                    </span>
                  </div>
                ) : (
                  <>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Nhập số tiền muốn nạp"
                      className="bg-gray-700 text-white border-gray-600 focus:border-blue-500"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                      VND
                    </div>
                  </>
                )}
              </div>
              {settings && !savedData && (
                <p className="text-sm text-gray-400 mt-1">
                  Số tiền nạp tối thiểu: {settings.deposits.minAmount.toLocaleString()} VND
                </p>
              )}
            </div>

            {!platformBanks ? (
              <div className="text-center py-4 text-gray-400">Đang tải thông tin ngân hàng...</div>
            ) : platformBanksError ? (
              <div className="text-red-500">Không thể tải thông tin ngân hàng</div>
            ) : platformBanks.banks && platformBanks.banks.length > 0 ? (
              <div className="space-y-4">
                <p className="text-yellow-400 font-medium">Vui lòng chuyển khoản vào một trong các tài khoản sau:</p>
                {/* Chọn ngân hàng */}
                <div className="space-y-2">
                  <Label htmlFor="bank" className="text-sm font-medium text-white">Chọn ngân hàng</Label>
                  {savedData ? (
                    <div className="bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 flex justify-between items-center">
                      <span>
                        {platformBanks?.banks?.find((bank: any) => bank.code === savedData.selectedBank)?.name || savedData.selectedBank}
                      </span>
                      <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded-full flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" /> Đã xác nhận
                      </span>
                    </div>
                  ) : (
                    <Select value={selectedBank} onValueChange={setSelectedBank}>
                      <SelectTrigger className="bg-gray-700 text-white border-gray-600 focus:border-blue-500">
                        <SelectValue placeholder="Chọn ngân hàng" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 text-white border-gray-700">
                        {platformBanks?.banks?.map((bank: any) => (
                          <SelectItem key={bank.code} value={bank.code}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {platformBanks.banks.map((bank: any, index: number) => (
                    <div key={index} className="bg-gray-700 p-4 rounded-lg">
                      <h3 className="text-lg font-bold text-white">{bank.bankName}</h3>
                      <div className="mt-2 space-y-1">
                        <p><span className="text-gray-400">Chủ tài khoản:</span> <span className="text-white font-medium">{bank.accountHolder}</span></p>
                        <p><span className="text-gray-400">Số tài khoản:</span> <span className="text-white font-medium">{bank.accountNumber}</span></p>
                        {bank.branch && <p><span className="text-gray-400">Chi nhánh:</span> <span className="text-white">{bank.branch}</span></p>}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-amber-500">Lưu ý: Nội dung chuyển khoản vui lòng ghi rõ <span className="font-mono bg-gray-700 px-2 py-0.5 rounded">NAP-{user?.username || 'user'}-{new Date().getTime().toString().slice(-6)}</span> để chúng tôi có thể xác nhận nhanh chóng.</p>
              </div>
            ) : (
              <p className="text-gray-400">Hiện tại chưa có thông tin ngân hàng nền tảng.</p>
            )}

            {/* Upload bill */}
            <div className="space-y-2">
              <Label htmlFor="bill" className="text-sm font-medium text-white">Tải lên bill chuyển khoản</Label>
              <div className="flex items-center gap-2">
                {billUrl ? (
                  <div className="w-full p-2 bg-green-500/10 border border-green-500/20 rounded-md flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm text-green-500">Bill đã được tải lên thành công</span>
                    </div>
                    {!savedData && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                        onClick={() => document.getElementById('bill-upload')?.click()}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 flex-1"
                    onClick={() => document.getElementById('bill-upload')?.click()}
                    disabled={isUploading || !!savedData}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Đang tải lên...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {bill ? bill.name : 'Chọn file'}
                      </>
                    )}
                  </Button>
                )}
                <input
                  id="bill-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={!!savedData}
                />
              </div>
            </div>

            {/* Xác nhận */}
            {!savedData && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="confirm"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-600 bg-gray-700 border-gray-600"
                />
                <label htmlFor="confirm" className="text-sm text-gray-300">
                  Tôi xác nhận đã chuyển khoản đúng số tiền và thông tin
                </label>
              </div>
            )}
            
            {/* Nút gửi hoặc trạng thái */}
            {savedData ? (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
                <p className="text-sm text-blue-400 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Yêu cầu nạp tiền đã được gửi. Vui lòng chờ xử lý.
                </p>
              </div>
            ) : (
              <Button
                type="button"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSubmit}
                disabled={!amount || !bill || !selectedBank || !isConfirmed || isUploading}
              >
                Gửi yêu cầu nạp tiền
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}