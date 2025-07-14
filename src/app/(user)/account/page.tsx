"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { Menu, X, Loader2, CheckCircle } from 'lucide-react';

// Mở rộng interface cho bank info để bao gồm các trường verified và pendingVerification
interface BankInfo {
  name: string;
  accountNumber: string;
  accountHolder: string;
  verified?: boolean;
  pendingVerification?: boolean;
}

export default function AccountPage() {
  const { user, isLoading, logout, refreshUser } = useAuth();
  // Lấy token từ localStorage để sử dụng cho các API calls
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  
  // Sử dụng useEffect để đảm bảo chỉ chạy ở phía client và lấy token
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    // Lấy token từ localStorage
    const storedToken = localStorage.getItem('token') || localStorage.getItem('authToken');
    setToken(storedToken);
  }, []);
  
  // Kiểm tra trạng thái xác minh ngân hàng từ dữ liệu người dùng và localStorage
  useEffect(() => {
    // Thêm biến để kiểm tra xem useEffect đã chạy xong chưa
    let isMounted = true;
    
    const checkBankVerification = async () => {
      if (!user) return;
      
      let isVerifiedStatus = false;
      
      // Đầu tiên, kiểm tra trạng thái xác minh từ localStorage
      // Vì localStorage có thể chứa thông tin mới nhất sau khi người dùng đã gửi form
      try {
        const storedBankInfo = localStorage.getItem('userBankInfo');
        
        if (storedBankInfo) {
          const bankInfo = JSON.parse(storedBankInfo);
          
          // Kiểm tra xem thông tin có thuộc về người dùng hiện tại không
          if (bankInfo.userId === user.id) {
            
            // Cập nhật form với dữ liệu từ localStorage
            if (isMounted) {
              setBankForm({
                fullName: bankInfo.accountHolder || '',
                bankType: 'Ngân hàng',
                bankName: bankInfo.bankName || '',
                accountNumber: bankInfo.accountNumber || ''
              });
            }
            
            // Kiểm tra trạng thái xác minh
            if (bankInfo.verified === true || bankInfo.pendingVerification === true) {
              isVerifiedStatus = true;
              if (isMounted) {
                setIsVerified(true);
              }
              return; // Thoát khỏi hàm nếu đã xác minh từ localStorage
            }
          }
        }
      } catch (error) {
        // Xử lý lỗi đọc từ localStorage một cách im lặng
      }
      
      // Nếu không có dữ liệu từ localStorage hoặc không có trạng thái xác minh, kiểm tra từ server
      if (user.bank) {
        // Cập nhật form với dữ liệu từ user.bank
        if (isMounted) {
          setBankForm({
            fullName: user.bank.accountHolder || '',
            bankType: 'Ngân hàng',
            bankName: user.bank.name || '',
            accountNumber: user.bank.accountNumber || ''
          });
        }
        
        // Kiểm tra trạng thái xác minh từ user.bank (sử dụng type assertion)
        const bankInfo = user.bank as any;
        
        // Kiểm tra các trường hợp có thể xảy ra
        if (bankInfo.verified === true || bankInfo.pendingVerification === true) {
          isVerifiedStatus = true;
          if (isMounted) {
            setIsVerified(true);
          }
          return;
        }
      }
      
      // Nếu không có trạng thái xác minh từ cả localStorage và server, đặt isVerified = false
      if (isMounted) {
        setIsVerified(false);
      }
    };
    
    checkBankVerification();
    
    // Cleanup function để tránh memory leak
    return () => {
      isMounted = false;
    };
  }, [user]);
  
  // Sử dụng searchParams một cách an toàn
  let searchParams: URLSearchParams | null = null;
  if (typeof window !== 'undefined') {
    searchParams = new URLSearchParams(window.location.search);
  }
  
  // Xử lý tham số tab từ URL
  useEffect(() => {
    if (!isClient) return;
    
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['overview', 'bank', 'verify', 'password'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [isClient]);
  
  // Form state cho thông tin ngân hàng
  const [bankForm, setBankForm] = useState({
    fullName: '',
    bankType: 'Ngân hàng',
    bankName: '',
    accountNumber: ''
  });
  
  // Form state cho đổi mật khẩu
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [frontIdFile, setFrontIdFile] = useState<File | null>(null);
  const [backIdFile, setBackIdFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'front') {
        setFrontIdFile(file);
      } else {
        setBackIdFile(file);
      }
    }
  };

  // Handle file upload cho cả hai mặt CCCD/CMND riêng biệt
  const handleUploadBothSides = async () => {
    // Kiểm tra cả hai file đã được chọn
    if (!frontIdFile || !backIdFile) {
      toast({ 
        variant: 'destructive', 
        title: 'Lỗi', 
        description: 'Vui lòng tải lên cả mặt trước và mặt sau CCCD/CMND' 
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Lấy token trực tiếp từ localStorage để đảm bảo có token mới nhất
      const currentToken = localStorage.getItem('token') || localStorage.getItem('authToken') || token;
      
      // Tạo URL đầy đủ cho API endpoint
      const apiUrl = window.location.origin + '/api/upload-verification';
      
      // Upload mặt trước trước
      const frontFormData = new FormData();
      frontFormData.append('document', frontIdFile);
      frontFormData.append('type', 'front');
      
      const frontRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': currentToken ? `Bearer ${currentToken}` : ''
        },
        credentials: 'include',
        body: frontFormData
      });
      
      // Kiểm tra kết quả upload mặt trước
      if (!frontRes.ok) {
        const errorText = await frontRes.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || `Lỗi API (mặt trước): ${frontRes.status} ${frontRes.statusText}`);
        } catch (e) {
          throw new Error(`Lỗi API (mặt trước): ${frontRes.status} ${frontRes.statusText}. ${errorText.substring(0, 100)}...`);
        }
      }
      
      // Upload mặt sau
      const backFormData = new FormData();
      backFormData.append('document', backIdFile);
      backFormData.append('type', 'back');
      
      const backRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': currentToken ? `Bearer ${currentToken}` : ''
        },
        credentials: 'include',
        body: backFormData
      });
      
      // Kiểm tra kết quả upload mặt sau
      if (!backRes.ok) {
        const errorText = await backRes.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || `Lỗi API (mặt sau): ${backRes.status} ${backRes.statusText}`);
        } catch (e) {
          throw new Error(`Lỗi API (mặt sau): ${backRes.status} ${backRes.statusText}. ${errorText.substring(0, 100)}...`);
        }
      }
      
      // Lấy kết quả từ mặt sau (hoặc có thể lấy từ mặt trước)
      const backData = await backRes.json();
      
      if (backData.success) {
        // Cập nhật UI sau khi upload thành công
        setFrontIdFile(null); // Reset file input
        setBackIdFile(null); // Reset file input
        
        // Reset các input file
        const frontInput = document.getElementById('frontId') as HTMLInputElement;
        const backInput = document.getElementById('backId') as HTMLInputElement;
        if (frontInput) frontInput.value = '';
        if (backInput) backInput.value = '';
        
        // Refresh thông tin người dùng để cập nhật trạng thái xác minh
        if (refreshUser) {
          await refreshUser();
        }
        
        toast({ 
          title: 'Thành công', 
          description: 'Tải lên CCCD/CMND thành công. Chúng tôi sẽ xác minh thông tin của bạn trong thời gian sớm nhất.'
        });
      } else {
        throw new Error(backData.message || 'Có lỗi xảy ra khi tải lên');
      }
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Lỗi', 
        description: error.message || 'Không thể kết nối đến máy chủ' 
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Hàm này chỉ để xem trước file đã chọn, không gửi API
  const handleFilePreview = (type: 'front' | 'back') => {
    const file = type === 'front' ? frontIdFile : backIdFile;
    if (!file) return;
    
    // Tạo URL tạm thời để xem trước file
    const previewUrl = URL.createObjectURL(file);
    window.open(previewUrl, '_blank');
  };
  
  // Xử lý query parameter tab từ URL
  useEffect(() => {
    // Lấy query parameter từ URL
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    
    // Nếu có tab parameter và là tab hợp lệ, set activeTab
    if (tabParam && ['overview', 'bank', 'verify', 'password'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);
  
  // Load thông tin ngân hàng nếu đã có
  useEffect(() => {
    if (user && user.bank) {
      setBankForm({
        fullName: user.bank.accountHolder || '',
        bankType: 'Ngân hàng',
        bankName: user.bank.name || '',
        accountNumber: user.bank.accountNumber || ''
      });
      
      // Kiểm tra trạng thái xác minh từ user.bank hoặc localStorage
      // Sử dụng type assertion vì thuộc tính verified không có trong type User.bank
      const bankWithVerification = user.bank as any;
      setIsVerified(bankWithVerification?.verified === true);
      
      // Thử đọc từ localStorage nếu không có thông tin xác minh từ user
      if (bankWithVerification?.verified === undefined) {
        try {
          const savedBankInfo = localStorage.getItem('userBankInfo');
          if (savedBankInfo) {
            const parsedInfo = JSON.parse(savedBankInfo);
            if (parsedInfo.userId === user.id) {
              setIsVerified(parsedInfo.verified === true);
            }
          }
        } catch (error) {
          console.error('Error reading bank verification status from localStorage:', error);
        }
      }
    }
  }, [user]);
  
  // Handle tab selection and close mobile menu when a tab is selected
  const handleTabSelect = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };
  
  // Handle form input changes
  const handleBankFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBankForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Xử lý đổi mật khẩu
  const handleChangePassword = async () => {
    // Kiểm tra dữ liệu đầu vào
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      setPasswordError('');
      
      // Lấy token mới nhất từ localStorage
      const currentToken = localStorage.getItem('token') || localStorage.getItem('authToken') || token;
      
      // Tạo URL đầy đủ cho API endpoint
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
      const apiUrl = `${baseUrl}/api/change-password`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': currentToken ? `Bearer ${currentToken}` : ''
        },
        credentials: 'include', // Đảm bảo gửi cookie
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      
      // Xử lý response không thành công
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || `Lỗi API: ${response.status} ${response.statusText}`);
        } catch (e) {
          throw new Error(`Lỗi API: ${response.status} ${response.statusText}. ${errorText.substring(0, 100)}...`);
        }
      }
      
      // Parse JSON response
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Đổi mật khẩu thất bại');
      }

      // Đặt lại form và hiển thị thông báo thành công
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      toast({
        title: 'Thành công',
        description: 'Đổi mật khẩu thành công',
        variant: 'default'
      });

    } catch (error) {
      console.error('Lỗi khi đổi mật khẩu:', error);
      setPasswordError(error instanceof Error ? error.message : 'Đã xảy ra lỗi khi đổi mật khẩu');
    } finally {
      setIsUpdatingPassword(false);
    }
  };
  
  // Submit bank information
  const handleSubmitBankInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting bank info form');
    
    // Kiểm tra nếu thông tin đã được xác minh hoặc đang chờ xác minh
    if (isVerified) {
      console.log('Cannot edit: bank info is already verified');
      toast({ 
        variant: 'destructive', 
        title: 'Không thể chỉnh sửa', 
        description: 'Thông tin ngân hàng đã được xác minh và không thể chỉnh sửa' 
      });
      return;
    }
    
    // Validate form
    if (!bankForm.fullName || !bankForm.bankName || !bankForm.accountNumber) {
      console.log('Form validation failed');
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng nhập đầy đủ thông tin' });
      return;
    }
    
    setIsSaving(true);
    console.log('Sending API request to update bank info');
    
    try {
      // Lấy token từ localStorage trực tiếp để đảm bảo token mới nhất
      const currentToken = localStorage.getItem('token') || localStorage.getItem('authToken');
      console.log('Using token for API request:', currentToken ? 'Found' : 'Not found');
      
      // Kiểm tra xem token có được lấy đúng không
      if (!currentToken) {
        console.error('No auth token found in localStorage');
        toast({ variant: 'destructive', title: 'Lỗi xác thực', description: 'Không tìm thấy token xác thực. Vui lòng đăng nhập lại.' });
        return;
      }
      
      // Thử sử dụng API endpoint khác
      const apiUrl = '/api/user/save-bank-info';
      console.log('Using API endpoint:', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include', // Thêm credentials để gửi cookie nếu có
        body: JSON.stringify({
          accountHolder: bankForm.fullName,
          bankName: bankForm.bankName,
          accountNumber: bankForm.accountNumber
        }),
      });
      
      const data = await res.json();
      console.log('API response:', data);
      
      if (res.ok && data.success) {
        toast({ title: 'Thành công', description: data.message || 'Thông tin ngân hàng đã được cập nhật' });
        
        // Lưu thông tin vào localStorage với trạng thái pendingVerification = true
        try {
          // Đảm bảo có userId trước khi lưu
          if (!user?.id) {
            console.error('Cannot save bank info: user ID is missing');
            toast({ 
              variant: 'destructive', 
              title: 'Lỗi', 
              description: 'Không thể lưu thông tin ngân hàng: thiếu ID người dùng' 
            });
            return;
          }
          
          const bankInfo = {
            userId: user.id,
            accountHolder: bankForm.fullName,
            bankName: bankForm.bankName,
            accountNumber: bankForm.accountNumber,
            pendingVerification: true,
            verified: false,
            timestamp: new Date().toISOString()
          };
          
          // Lưu vào localStorage
          localStorage.setItem('userBankInfo', JSON.stringify(bankInfo));
          console.log('Saved bank info to localStorage with pendingVerification=true');
          
          // Cập nhật trạng thái để hiển thị thông tin dạng readonly
          console.log('Setting isVerified to true');
          setIsVerified(true);
          
          // Cập nhật dữ liệu người dùng từ server
          console.log('Refreshing user data from server');
          await refreshUser();
          
          // Đảm bảo UI được cập nhật đồng bộ
          // Sử dụng setTimeout để đảm bảo các thay đổi state được áp dụng trước khi render lại
          setTimeout(() => {
            console.log('Force re-render with current state:', { isVerified, bankForm });
            // Gọi lại hàm kiểm tra trạng thái xác minh để đảm bảo UI được cập nhật
            setIsVerified(prev => {
              console.log('Re-confirming verified status is TRUE');
              return true; // Đảm bảo isVerified luôn là true sau khi submit thành công
            });
          }, 300);
        } catch (error) {
          console.error('Error saving bank info to localStorage:', error);
        }
      } else {
        console.log('API error:', data.message);
        toast({ 
          variant: 'destructive', 
          title: 'Lỗi', 
          description: data.message || 'Không thể cập nhật thông tin ngân hàng' 
        });
      }
    } catch (error) {
      console.error('Bank info update error:', error);
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể kết nối đến máy chủ' });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng đăng nhập' });
      router.push('/login');
    }
  }, [user, isLoading, router, toast]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-[60vh] text-gray-400">Đang tải...</div>;
  }

  if (!user) {
    return null;
  }

  // Định dạng ngày đăng ký
  const formatDate = (dateString: string | Date | undefined): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

return (
    <div className="min-h-[90vh] bg-[#0F1924] text-white flex flex-col md:flex-row">
      {/* Mobile menu button */}
      <div className="flex items-center justify-between p-4 md:hidden border-b border-gray-800">
        <h1 className="text-xl font-bold">Tài khoản</h1>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-white hover:bg-blue-900"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </div>
      
      {/* Menu bên trái - hidden on mobile unless toggled */}
      <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex w-full md:w-[250px] flex-col space-y-1 p-4 md:border-r border-gray-800`}>
        <Button
          variant="link"
          className={`justify-start px-4 py-2 ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-white hover:bg-blue-900'}`}
          onClick={() => handleTabSelect('overview')}
        >
          Tổng quan
        </Button>
        <Button
          variant="link"
          className={`justify-start px-4 py-2 ${activeTab === 'bank' ? 'bg-blue-600 text-white' : 'text-white hover:bg-blue-900'}`}
          onClick={() => handleTabSelect('bank')}
        >
          Thông tin ngân hàng
        </Button>
        <Button
          variant="link"
          className={`justify-start px-4 py-2 ${activeTab === 'verify' ? 'bg-blue-600 text-white' : 'text-white hover:bg-blue-900'}`}
          onClick={() => handleTabSelect('verify')}
        >
          Xác minh danh tính
        </Button>
        <Button
          variant="link"
          className={`justify-start px-4 py-2 ${activeTab === 'password' ? 'bg-blue-600 text-white' : 'text-white hover:bg-blue-900'}`}
          onClick={() => handleTabSelect('password')}
        >
          Thay đổi mật khẩu
        </Button>
      </div>

      {/* Khu vực thông tin chính */}
      <div className="flex-1 p-4 md:p-6">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-medium mb-4">tdnm</h2>
              <p className="text-gray-400">ID: {user.id || '69934'}</p>
              <p className="text-gray-400">Ngày đăng ký: {formatDate(user.createdAt) || '24/06/2025 12:37'}</p>
              <div className="mt-2">
                <span className="inline-block bg-orange-600 text-white text-xs px-3 py-1 rounded">
                  Chưa xác minh
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-lg mb-2">Tổng tài sản quy đổi</h3>
              <p className="text-3xl font-bold">{user.balance?.available?.toLocaleString() || '0'}VND</p>
              
              <div className="mt-4 flex space-x-2">
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white" 
                  onClick={() => router.push('/deposit')}
                >
                  Nạp tiền
                </Button>
                <Button 
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => router.push('/withdraw')}
                >
                  Rút tiền
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg mb-3">Danh sách tài sản</h3>
              <div className="border-b border-gray-700 pb-2 mb-2 flex justify-between">
                <span className="text-gray-400">Bank</span>
                <span className="text-gray-400">Có sẵn</span>
              </div>
              <div className="flex justify-between py-2">
                <span>Ngân hàng</span>
                <span>{user.balance?.available?.toLocaleString() || '0'}VND</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="space-y-6" key={`bank-info-section-${isVerified ? 'verified' : 'editable'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium">Thông tin ngân hàng</h2>
              {/* Hiển thị trạng thái xác minh */}
              {isVerified && (
                <span className="bg-green-600 text-white text-xs px-3 py-1 rounded flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {(user?.bank as BankInfo)?.verified ? 'Đã xác minh' : 'Đang chờ xác minh'}
                </span>
              )}
            </div>
            
            {/* Debug info - sẽ xóa sau khi hoàn thành */}
            <div className="bg-gray-800 p-2 text-xs text-gray-400 rounded mb-2">
              <p>Debug: isVerified = {isVerified ? 'true' : 'false'}</p>
              <p>Bank form data: {JSON.stringify(bankForm)}</p>
              <p>localStorage: {typeof window !== 'undefined' ? localStorage.getItem('userBankInfo') : 'N/A'}</p>
            </div>
            
            {isVerified ? (
              <div className="space-y-4" key="verified-bank-info-display">
                {/* Thông báo xác minh */}
                <div className="mb-5">
                  <div className={`${(user?.bank as BankInfo)?.verified 
                    ? "bg-green-900 border border-green-700 text-green-300" 
                    : "bg-blue-900 border border-blue-700 text-blue-300"} p-4 rounded-lg shadow-md`}>
                    <div className="flex items-center">
                      {(user?.bank as BankInfo)?.verified ? (
                        <CheckCircle className="h-6 w-6 mr-3 text-green-400" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 mr-3 text-blue-400">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                      )}
                      <div>
                        <h4 className="font-medium text-lg mb-1">
                          {(user?.bank as BankInfo)?.verified ? 'Xác minh thành công' : 'Đang chờ xác minh'}
                        </h4>
                        <p className="text-sm">
                          {(user?.bank as BankInfo)?.verified 
                            ? 'Thông tin ngân hàng đã được xác minh và không thể chỉnh sửa.'
                            : 'Thông tin ngân hàng đã được gửi và đang chờ xác minh. Không thể chỉnh sửa trong thời gian này.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Hiển thị thông tin ngân hàng dạng readonly */}
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 shadow-md">
                  <div className="grid grid-cols-1 gap-5">
                    <div className="border-b border-gray-700 pb-4">
                      <label className="block text-gray-400 mb-2 text-sm font-medium">Họ tên chủ tài khoản</label>
                      <div className="font-semibold text-white text-lg">{bankForm.fullName}</div>
                    </div>
                    
                    <div className="border-b border-gray-700 pb-4">
                      <label className="block text-gray-400 mb-2 text-sm font-medium">Loại tài khoản</label>
                      <div className="font-semibold text-white text-lg">{bankForm.bankType}</div>
                    </div>
                    
                    <div className="border-b border-gray-700 pb-4">
                      <label className="block text-gray-400 mb-2 text-sm font-medium">Ngân hàng</label>
                      <div className="font-semibold text-white text-lg">{bankForm.bankName}</div>
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 mb-2 text-sm font-medium">Số tài khoản</label>
                      <div className="font-semibold text-white text-lg">{bankForm.accountNumber}</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-sm text-gray-400 bg-gray-900 p-4 rounded-lg border border-gray-800">
                  <div className="flex items-start">
                    <div className="mr-3 mt-1 text-blue-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                      </svg>
                    </div>
                    <div>
                      <p className="mb-2">Thông tin này đã được lưu vào hệ thống và sẽ được sử dụng cho các giao dịch rút tiền.</p>
                      <p>Nếu cần thay đổi, vui lòng liên hệ với quản trị viên.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitBankInfo} className="space-y-4" key="bank-info-edit-form">
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded mb-4">
                  <p className="text-sm">Vui lòng nhập chính xác thông tin ngân hàng của bạn. Sau khi xác nhận, thông tin này sẽ không thể chỉnh sửa.</p>
                </div>
                
                <div>
                  <label className="block text-gray-400 mb-1">Họ tên <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    name="fullName"
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" 
                    value={bankForm.fullName}
                    onChange={handleBankFormChange}
                    placeholder="Nhập tên, vui lòng nhập thêm khoảng cách cho mỗi từ"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Loại <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" 
                    value="Ngân hàng"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Ngân hàng <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    name="bankName"
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" 
                    value={bankForm.bankName}
                    onChange={handleBankFormChange}
                    placeholder="Nhập tên ngân hàng"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Số tài khoản <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    name="accountNumber"
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" 
                    value={bankForm.accountNumber}
                    onChange={handleBankFormChange}
                    placeholder="Nhập số tài khoản ngân hàng của bạn"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-md transition-colors"
                  disabled={isSaving}
                >
                  {isSaving ? 'Đang xử lý...' : 'Xác nhận và Lưu'}
                </button>
                
                <div className="mt-4 bg-orange-100 border-l-4 border-orange-500 text-orange-800 p-3">
                  <p className="text-sm"><strong>Lưu ý:</strong> Thông tin ngân hàng là bắt buộc để thực hiện lệnh rút tiền và sẽ không thể chỉnh sửa sau khi xác nhận.</p>
                </div>
              </form>
            )}
          </div>
        )}

        {activeTab === 'verify' && (
          <div className="space-y-6">
            <h2 className="text-xl font-medium mb-4">Xác minh danh tính</h2>
            <p className="text-gray-300">Vui lòng tải lên cả mặt trước và mặt sau CMND/CCCD để xác minh danh tính của bạn</p>
            
            {user?.verification?.verified ? (
              <div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 rounded">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <p>Danh tính của bạn đã được xác minh thành công!</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 max-w-3xl mx-auto">
                <div>
                  <label className="block text-gray-400 mb-1">CMND/CCCD mặt trước <span className="text-red-500">*</span></label>
                  <div className="border-2 border-dashed border-gray-700 p-6 rounded-lg text-center">
                    <p className="text-gray-500">Kéo và thả hoặc click để tải file lên</p>
                    <input 
                      id="frontId"
                      type="file" 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, 'front')}
                      accept="image/*,.pdf"
                    />
                    <Button 
                      type="button"
                      className="mt-2 bg-blue-600 hover:bg-blue-700"
                      onClick={() => document.getElementById('frontId')?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? 'Đang xử lý...' : 'Chọn file'}
                    </Button>
                    {frontIdFile && (
                      <div className="mt-2 text-sm text-gray-400">
                        Đã chọn: {frontIdFile.name}
                        <Button 
                          type="button"
                          className="ml-2 bg-blue-600 hover:bg-blue-700 text-xs py-0 h-6"
                          onClick={() => handleFilePreview('front')}
                        >
                          Xem trước
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-400 mb-1">CMND/CCCD mặt sau <span className="text-red-500">*</span></label>
                  <div className="border-2 border-dashed border-gray-700 p-6 rounded-lg text-center">
                    <p className="text-gray-500">Kéo và thả hoặc click để tải file lên</p>
                    <input 
                      id="backId"
                      type="file" 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, 'back')}
                      accept="image/*,.pdf"
                    />
                    <Button 
                      type="button"
                      className="mt-2 bg-blue-600 hover:bg-blue-700"
                      onClick={() => document.getElementById('backId')?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? 'Đang xử lý...' : 'Chọn file'}
                    </Button>
                    {backIdFile && (
                      <div className="mt-2 text-sm text-gray-400">
                        Đã chọn: {backIdFile.name}
                        <Button 
                          type="button"
                          className="ml-2 bg-blue-600 hover:bg-blue-700 text-xs py-0 h-6"
                          onClick={() => handleFilePreview('back')}
                        >
                          Xem trước
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="md:col-span-2 mt-4">
                  <Button 
                    type="button"
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-md transition-colors"
                    onClick={handleUploadBothSides}
                    disabled={isUploading || !frontIdFile || !backIdFile}
                  >
                    {isUploading ? 'Đang xử lý...' : 'Gửi xác minh danh tính'}
                  </Button>
                  
                  <div className="mt-4 bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-3">
                    <p className="text-sm">Lưu ý: Bạn cần tải lên cả hai mặt của CMND/CCCD để hoàn tất xác minh danh tính.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'password' && (
          <div className="space-y-6">
            <h2 className="text-xl font-medium mb-4">Thay đổi mật khẩu</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-1">Mật khẩu hiện tại</label>
                <input 
                  type="password" 
                  name="currentPassword"
                  className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" 
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Mật khẩu mới</label>
                <input 
                  type="password" 
                  name="newPassword"
                  className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" 
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Xác nhận mật khẩu mới</label>
                <input 
                  type="password" 
                  name="confirmPassword"
                  className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" 
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                />
              </div>
              {passwordError && (
                <div className="text-red-500 text-sm">{passwordError}</div>
              )}
              <Button 
                className="mt-4 bg-blue-600 hover:bg-blue-700" 
                onClick={handleChangePassword}
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                    Đang xử lý...
                  </>
                ) : (
                  'Cập nhật mật khẩu'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
