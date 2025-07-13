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

  // Lưu thông tin người dùng đã nhập
  const saveUserInputData = () => {
    if (user && amount && selectedBank) {
      const dataToSave = {
        userId: user._id || user.id,
        amount,
        selectedBank
      };
      localStorage.setItem('depositData', JSON.stringify(dataToSave));
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
    
    // Lưu thông tin người dùng đã nhập
    saveUserInputData();

    if (settings && Number(amount) < settings.minDeposit) {
      toast({ variant: 'destructive', title: 'Lỗi', description: `Số tiền nạp tối thiểu là ${settings.minDeposit.toLocaleString()} đ` });
      return;
    }

    if (!billUrl) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng đợi ảnh được tải lên hoàn tất' });
      return;
    }

    try {
      const res = await fetch('/api/deposits', {
        method: 'POST',
        credentials: 'include', // Include session cookie
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Number(amount),
          bill: billUrl,
          bank: selectedBank,
          confirmed: isConfirmed
        }),
      });
      
      const result = await res.json();
      
      if (res.ok) {
        toast({ title: 'Thành công', description: 'Yêu cầu nạp tiền đã được gửi' });
        setAmount('');
        setBill(null);
        setBillUrl(null);
      } else {
        toast({ variant: 'destructive', title: 'Lỗi', description: result.message || 'Có lỗi xảy ra' });
      }
    } catch (err) {
      console.error('Lỗi khi gửi yêu cầu:', err);
      toast({ 
        variant: 'destructive', 
        title: 'Lỗi', 
        description: 'Không thể gửi yêu cầu. Vui lòng thử lại sau.' 
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
            {/* Phần nhập số tiền */}
            <div className="mb-6">
              <Label htmlFor="amount" className="text-white mb-2 block font-medium">Số tiền nạp</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                  }}
                  placeholder="Nhập số tiền muốn nạp"
                  className="bg-gray-700 text-white border-gray-600 focus:border-blue-500"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                  VND
                </div>
              </div>
              {settings && (
                <p className="text-sm text-gray-400 mt-1">
                  Số tiền nạp tối thiểu: {settings.deposits?.minAmount?.toLocaleString() || '100,000'} VND
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
                <div className="mb-4">
                  <Label htmlFor="bank-select" className="text-white mb-2 block font-medium">Chọn ngân hàng</Label>
                  <Select 
                    value={selectedBank} 
                    onValueChange={(value) => {
                      setSelectedBank(value);
                      // Lưu thông tin khi người dùng chọn ngân hàng
                      if (user && amount) {
                        const dataToSave = {
                          userId: user._id || user.id,
                          amount,
                          selectedBank: value
                        };
                        localStorage.setItem('depositData', JSON.stringify(dataToSave));
                      }
                    }}
                  >
                    <SelectTrigger className="bg-gray-700 text-white border-gray-600">
                      <SelectValue placeholder="Chọn ngân hàng" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 text-white border-gray-700">
                      {platformBanks.banks.map((bank: any, index: number) => (
                        <SelectItem key={index} value={bank.bankName} className="focus:bg-gray-700 focus:text-white">
                          {bank.bankName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

            {selectedBank && platformBanks && (
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Thông tin chuyển khoản</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {platformBanks.banks.find((b: any) => b.bankName === selectedBank) && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-gray-400 text-sm">Ngân hàng:</p>
                          <p className="text-white font-medium">{selectedBank}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Số tài khoản:</p>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">
                              {platformBanks.banks.find((b: any) => b.bankName === selectedBank)?.accountNumber}
                            </p>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 rounded-full hover:bg-gray-600"
                              onClick={() => {
                                navigator.clipboard.writeText(platformBanks.banks.find((b: any) => b.bankName === selectedBank)?.accountNumber);
                                toast({ description: "Đã sao chép số tài khoản" });
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-gray-400 text-sm">Chủ tài khoản:</p>
                          <p className="text-white font-medium">
                            {platformBanks.banks.find((b: any) => b.bankName === selectedBank)?.accountHolder}
                          </p>
                        </div>
                        {platformBanks.banks.find((b: any) => b.bankName === selectedBank)?.branch && (
                          <div>
                            <p className="text-gray-400 text-sm">Chi nhánh:</p>
                            <p className="text-white font-medium">
                              {platformBanks.banks.find((b: any) => b.bankName === selectedBank)?.branch}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <p className="text-gray-400 text-sm">Nội dung chuyển khoản:</p>
                        <div className="flex items-center gap-2 bg-gray-800 p-2 rounded mt-1">
                          <p className="text-white font-mono">
                            NAP-{user?.username || 'user'}-{new Date().getTime().toString().slice(-6)}
                          </p>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 rounded-full hover:bg-gray-600"
                            onClick={() => {
                              navigator.clipboard.writeText(`NAP-${user?.username || 'user'}-${new Date().getTime().toString().slice(-6)}`);
                              toast({ description: "Đã sao chép nội dung chuyển khoản" });
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="mt-6">
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Tải lên bill chuyển khoản</CardTitle>
                  <CardDescription className="text-gray-400">
                    Vui lòng tải lên ảnh chụp màn hình hoặc hóa đơn chuyển khoản để xác nhận giao dịch
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="grid gap-4">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center justify-center w-full">
                        <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer border-gray-600 hover:border-gray-500 bg-gray-800/50">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-3 text-gray-400" />
                            <p className="mb-2 text-sm text-gray-400">
                              <span className="font-medium">Nhấn để tải lên</span> hoặc kéo thả file
                            </p>
                            <p className="text-xs text-gray-500">
                              PNG, JPG hoặc PDF (Tối đa 10MB)
                            </p>
                          </div>
                          <Input
                            id="file-upload"
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileChange}
                            disabled={isUploading}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                    
                    {isUploading && (
                      <div className="flex items-center justify-center text-sm text-blue-400">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Đang tải lên ảnh...
                      </div>
                    )}
                    
                    {bill && !isUploading && billUrl && (
                      <div className="flex items-center text-sm text-green-400 bg-green-400/10 p-2 rounded">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Đã tải lên thành công: {bill.name}
                      </div>
                    )}
                    
                    {bill && !isUploading && !billUrl && (
                      <div className="flex items-center text-sm text-yellow-400 bg-yellow-400/10 p-2 rounded">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Lỗi khi tải lên. Vui lòng thử lại.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-start space-x-2 mt-6 bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
              <input
                type="checkbox"
                id="confirm-deposit"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                required
              />
              <label htmlFor="confirm-deposit" className="text-sm text-gray-300">
                Tôi xác nhận đã chuyển khoản chính xác số tiền và nội dung như trên. Yêu cầu nạp tiền sẽ được xử lý trong vòng 5-15 phút sau khi xác nhận.
              </label>
            </div>

            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed mt-6"
              onClick={handleSubmit}
              disabled={!amount || !bill || isUploading || !billUrl || !selectedBank || !isConfirmed}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Gửi yêu cầu nạp tiền
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}