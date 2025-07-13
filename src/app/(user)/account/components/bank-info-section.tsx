"use client";

import React, { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  CreditCard, 
  Building, 
  User, 
  Clock,
  PencilLine,
  ShieldCheck,
  ShieldAlert,
  Info,
  Upload
} from 'lucide-react';

interface AuthContextType {
  user: any;
  refreshUser: () => Promise<void>;
}

interface BankInfo {
  fullName: string;
  bankType?: string;
  bankName: string;
  accountNumber: string;
  verified?: boolean;
  pendingVerification?: boolean;
  submittedAt?: string;
  verifiedAt?: string;
}

export function BankInfoSection() {
  const { user, refreshUser } = useAuth() as AuthContextType;
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<BankInfo>({
    fullName: user?.fullName || '',
    bankType: 'Ngân hàng',
    bankName: user?.bankInfo?.bankName || '',
    accountNumber: user?.bankInfo?.accountNumber || ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // State cho phần xác minh danh tính
  const [identityInfo, setIdentityInfo] = useState({
    frontImage: '',
    backImage: '',
    verified: false,
    pendingVerification: false,
    submittedAt: '',
    verifiedAt: ''
  });
  
  // State cho việc upload ảnh
  const [frontImageFile, setFrontImageFile] = useState<File | null>(null);
  const [backImageFile, setBackImageFile] = useState<File | null>(null);
  const [frontImagePreview, setFrontImagePreview] = useState<string>('');
  const [backImagePreview, setBackImagePreview] = useState<string>('');
  const [isUploadingIdentity, setIsUploadingIdentity] = useState(false);
  
  // Load bank info from user object or localStorage
  useEffect(() => {
    // First try to get from localStorage
    if (typeof window !== 'undefined') {
      const savedBankInfo = localStorage.getItem('userBankInfo');
      if (savedBankInfo) {
        try {
          const parsedInfo = JSON.parse(savedBankInfo);
          // Verify this belongs to current user
          if (user && (parsedInfo.userId === user._id || parsedInfo.userId === user.id)) {
            setFormData({
              fullName: parsedInfo.fullName || parsedInfo.accountHolder || '',
              bankType: parsedInfo.bankType || 'Ngân hàng',
              bankName: parsedInfo.bankName || '',
              accountNumber: parsedInfo.accountNumber || '',
              verified: parsedInfo.verified || false,
              pendingVerification: parsedInfo.pendingVerification || false,
              submittedAt: parsedInfo.submittedAt,
              verifiedAt: parsedInfo.verifiedAt
            });
          }
        } catch (error) {
          console.error('Error parsing saved bank info:', error);
        }
      }
      
      // Lấy thông tin xác minh danh tính từ localStorage
      const savedIdentityInfo = localStorage.getItem('userIdentityInfo');
      if (savedIdentityInfo) {
        try {
          const parsedInfo = JSON.parse(savedIdentityInfo);
          if (user && (parsedInfo.userId === user._id || parsedInfo.userId === user.id)) {
            setIdentityInfo(parsedInfo);
          }
        } catch (error) {
          console.error('Error parsing saved identity info:', error);
        }
      }
    }
    
    // Then override with user data if available (server data takes precedence)
    if (user?.bankInfo) {
      setFormData({
        fullName: user.bankInfo.fullName || '',
        bankType: user.bankInfo.bankType || 'Ngân hàng',
        bankName: user.bankInfo.bankName || '',
        accountNumber: user.bankInfo.accountNumber || '',
        verified: user.bankInfo.verified || false,
        pendingVerification: user.bankInfo.pendingVerification || false,
        submittedAt: user.bankInfo.submittedAt,
        verifiedAt: user.bankInfo.verifiedAt
      });
      
      // Save to localStorage for future use
      if (typeof window !== 'undefined') {
        try {
          const bankInfoToSave = {
            ...user.bankInfo,
            userId: user._id || user.id || '',
            // Ensure verification flags are set
            verified: user.bankInfo.verified || false,
            pendingVerification: user.bankInfo.pendingVerification || false
          };
          localStorage.setItem('userBankInfo', JSON.stringify(bankInfoToSave));
        } catch (error) {
          console.error('Error saving bank info to localStorage:', error);
        }
      }
    }
    
    // Lấy thông tin xác minh danh tính từ server nếu có
    if (user?.identityInfo) {
      setIdentityInfo({
        frontImage: user.identityInfo.frontImage || '',
        backImage: user.identityInfo.backImage || '',
        verified: user.identityInfo.verified || false,
        pendingVerification: user.identityInfo.pendingVerification || false,
        submittedAt: user.identityInfo.submittedAt || '',
        verifiedAt: user.identityInfo.verifiedAt || ''
      });
      
      // Lưu vào localStorage
      if (typeof window !== 'undefined') {
        try {
          const identityInfoToSave = {
            ...user.identityInfo,
            userId: user._id || user.id || '',
            verified: user.identityInfo.verified || false,
            pendingVerification: user.identityInfo.pendingVerification || false
          };
          localStorage.setItem('userIdentityInfo', JSON.stringify(identityInfoToSave));
        } catch (error) {
          console.error('Error saving identity info to localStorage:', error);
        }
      }
    }
  }, [user]);
  
  const getToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('authToken');
  };

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };
  
  // Toggle edit mode
  const toggleEditMode = () => {
    // Don't allow editing if verified or pending verification
    if (formData.verified || formData.pendingVerification) {
      toast({
        title: "Không thể chỉnh sửa",
        description: "Thông tin ngân hàng đã được xác minh hoặc đang chờ xác minh và không thể thay đổi",
        variant: "destructive"
      });
      return;
    }
    
    setIsEditMode(!isEditMode);
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
    if (formData.verified || formData.pendingVerification) {
      toast({
        title: "Không thể thay đổi",
        description: "Thông tin ngân hàng đã được xác minh hoặc đang chờ xác minh, không thể thay đổi",
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
    
    try {
      // Lưu thông tin vào localStorage trước
      if (typeof window !== 'undefined') {
        try {
          const bankInfoToSave = {
            ...formData,
            userId: user?._id || user?.id || '',
            pendingVerification: true,
            submittedAt: new Date().toISOString()
          };
          localStorage.setItem('userBankInfo', JSON.stringify(bankInfoToSave));
        } catch (error) {
          console.error('Error saving bank info to localStorage:', error);
        }
      }
      
      // Gửi lên server
      const response = await fetch('/api/update-bank-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          bankInfo: {
            fullName: formData.fullName,
            bankType: formData.bankType,
            bankName: formData.bankName,
            accountNumber: formData.accountNumber,
            pendingVerification: true,
            submittedAt: new Date().toISOString()
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      toast({
        title: "Thành công",
        description: "Thông tin ngân hàng đã được cập nhật và đang chờ xác minh"
      });
      
      // Cập nhật lại thông tin user
      refreshUser();
      setIsEditMode(false);
      
    } catch (error) {
      console.error('Error updating bank info:', error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật thông tin ngân hàng. Vui lòng thử lại sau.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Xác định trạng thái xác minh
  const isVerified = formData.verified || user?.bankInfo?.verified || false;
  const isPending = (formData.pendingVerification || user?.bankInfo?.pendingVerification || false) && !isVerified;
  
  // Kiểm tra xem có thông tin ngân hàng hay không
  const hasBankInfo = !!(formData.bankName && formData.accountNumber);
  
  // Thêm thông báo cho người dùng khi thông tin đã được xác minh hoặc đang chờ xác minh
  const getBankInfoStatus = () => {
    if (isVerified) {
      return (
        <div className="bg-green-900/20 p-3 rounded-md border border-green-900/30 mb-6">
          <p className="text-sm text-green-400 flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Thông tin ngân hàng của bạn đã được xác minh
          </p>
          {formData.verifiedAt && (
            <p className="text-xs text-green-400/70 mt-1">Xác minh vào: {formatDate(formData.verifiedAt)}</p>
          )}
        </div>
      );
    }
    
    if (isPending) {
      return (
        <div className="bg-amber-900/20 p-3 rounded-md border border-amber-900/30 mb-6">
          <p className="text-sm text-amber-400 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Thông tin ngân hàng của bạn đang được xem xét
          </p>
          {formData.submittedAt && (
            <p className="text-xs text-amber-400/70 mt-1">Gửi yêu cầu vào: {formatDate(formData.submittedAt)}</p>
          )}
        </div>
      );
    }
    
    if (!hasBankInfo) {
      return (
        <div className="bg-blue-900/20 p-3 rounded-md border border-blue-900/30 mb-6">
          <p className="text-sm text-blue-400 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Bạn chưa cập nhật thông tin ngân hàng
          </p>
          <p className="text-xs text-blue-400/70 mt-1">
            Vui lòng cập nhật thông tin ngân hàng để có thể rút tiền
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
      {hasBankInfo || isVerified || isPending || isSaving ? (
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
          </div>
            
      <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 overflow-hidden mt-6">
        <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
          <h3 className="font-medium flex items-center gap-2">
            <Building className="h-4 w-4 text-gray-400" />
            Thông tin ngân hàng
          </h3>
          {isVerified && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Đã xác minh</span>}
          {isPending && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">Đang xác minh</span>}
        </div>
          
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Tên chủ tài khoản</p>
                <p className="font-medium">{formData.fullName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Building className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Ngân hàng</p>
                <p className="font-medium">{formData.bankName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <CreditCard className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Số tài khoản</p>
                <p className="font-medium">{formData.accountNumber}</p>
              </div>
            </div>
            
            {formData.submittedAt && (
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Ngày gửi yêu cầu</p>
                  <p className="font-medium">{formatDate(formData.submittedAt)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
     
      {/* Phần xác minh danh tính */}
      <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 overflow-hidden mt-6">
        <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
          <h3 className="font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-gray-400" />
            Xác minh danh tính
          </h3>
          {identityInfo.verified && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Đã xác minh</span>}
          {identityInfo.pendingVerification && !identityInfo.verified && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">Đang xác minh</span>}
          {!identityInfo.verified && !identityInfo.pendingVerification && <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded-full">Chưa xác minh</span>}
        </div>
        
        {/* Hiển thị thông tin đã xác minh hoặc đang chờ xác minh */}
        {(identityInfo.verified || identityInfo.pendingVerification) && (
          <div className="p-5 space-y-4">
            {/* Hiển thị ảnh đã tải lên */}
            {(identityInfo.frontImage || identityInfo.backImage) && (
              <div className="grid grid-cols-2 gap-4">
                {identityInfo.frontImage && (
                  <div className="border border-gray-700 rounded-md overflow-hidden">
                    <div className="p-2 bg-gray-800/50 text-xs text-gray-400">Mặt trước CMND/CCCD</div>
                    <img 
                      src={identityInfo.frontImage} 
                      alt="Mặt trước CMND/CCCD" 
                      className="w-full h-auto object-cover"
                    />
                  </div>
                )}
                
                {identityInfo.backImage && (
                  <div className="border border-gray-700 rounded-md overflow-hidden">
                    <div className="p-2 bg-gray-800/50 text-xs text-gray-400">Mặt sau CMND/CCCD</div>
                    <img 
                      src={identityInfo.backImage} 
                      alt="Mặt sau CMND/CCCD" 
                      className="w-full h-auto object-cover"
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* Hiển thị trạng thái */}
            {identityInfo.verified ? (
              <div className="bg-green-900/20 p-3 rounded-md border border-green-900/30">
                <p className="text-sm text-green-400 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Thông tin danh tính của bạn đã được xác minh
                </p>
                {identityInfo.verifiedAt && (
                  <p className="text-xs text-green-400/70 mt-1">Xác minh vào: {formatDate(identityInfo.verifiedAt)}</p>
                )}
              </div>
            ) : identityInfo.pendingVerification ? (
              <div className="bg-amber-900/20 p-3 rounded-md border border-amber-900/30">
                <p className="text-sm text-amber-400 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Thông tin danh tính của bạn đang được xem xét
                </p>
                {identityInfo.submittedAt && (
                  <p className="text-xs text-amber-400/70 mt-1">Gửi yêu cầu vào: {formatDate(identityInfo.submittedAt)}</p>
                )}
              </div>
            ) : null}
          </div>
        )}
        
        {/* Form tải lên ảnh xác minh danh tính */}
        {!identityInfo.verified && !identityInfo.pendingVerification && (
          <div className="p-5">
            <p className="text-sm text-gray-400 mb-4">Vui lòng tải lên ảnh chụp CMND/CCCD để xác minh danh tính của bạn.</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="border border-dashed border-gray-600 rounded-md p-4 flex flex-col items-center justify-center">
                <p className="text-sm text-gray-400 mb-2">Mặt trước CMND/CCCD</p>
                {frontImagePreview ? (
                  <div className="relative w-full">
                    <img 
                      src={frontImagePreview} 
                      alt="Mặt trước CMND/CCCD" 
                      className="w-full h-auto object-cover rounded-md"
                    />
                    <button 
                      type="button"
                      className="absolute top-2 right-2 bg-red-500/80 text-white p-1 rounded-full hover:bg-red-600"
                      onClick={() => {
                        setFrontImageFile(null);
                        setFrontImagePreview('');
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button 
                    type="button"
                    className="px-3 py-2 bg-gray-700 text-white rounded-md text-sm hover:bg-gray-600 transition-colors"
                    onClick={() => document.getElementById('front-image-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 inline-block mr-1" />
                    Tải lên
                  </button>
                )}
                <input 
                  id="front-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setFrontImageFile(file);
                      
                      // Tạo preview
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFrontImagePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
              
              <div className="border border-dashed border-gray-600 rounded-md p-4 flex flex-col items-center justify-center">
                <p className="text-sm text-gray-400 mb-2">Mặt sau CMND/CCCD</p>
                {backImagePreview ? (
                  <div className="relative w-full">
                    <img 
                      src={backImagePreview} 
                      alt="Mặt sau CMND/CCCD" 
                      className="w-full h-auto object-cover rounded-md"
                    />
                    <button 
                      type="button"
                      className="absolute top-2 right-2 bg-red-500/80 text-white p-1 rounded-full hover:bg-red-600"
                      onClick={() => {
                        setBackImageFile(null);
                        setBackImagePreview('');
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button 
                    type="button"
                    className="px-3 py-2 bg-gray-700 text-white rounded-md text-sm hover:bg-gray-600 transition-colors"
                    onClick={() => document.getElementById('back-image-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 inline-block mr-1" />
                    Tải lên
                  </button>
                )}
                <input 
                  id="back-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setBackImageFile(file);
                      
                      // Tạo preview
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setBackImagePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </div>
            
            <Button 
              type="button" 
              className="w-full"
              disabled={isUploadingIdentity || !frontImageFile || !backImageFile}
              onClick={async () => {
                if (!frontImageFile || !backImageFile) {
                  toast({
                    title: "Thiếu thông tin",
                    description: "Vui lòng tải lên đầy đủ ảnh mặt trước và mặt sau CMND/CCCD",
                    variant: "destructive"
                  });
                  return;
                }
                
                setIsUploadingIdentity(true);
                try {
                  // Tạo form data để upload
                  const formData = new FormData();
                  formData.append('frontImage', frontImageFile);
                  formData.append('backImage', backImageFile);
                  
                  // Gọi API upload
                  const token = getToken();
                  const response = await fetch('/api/upload-identity-verification', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`
                    },
                    body: formData
                  });
                  
                  const data = await response.json();
                  
                  if (!response.ok) {
                    throw new Error(data.message || 'Có lỗi xảy ra khi tải lên ảnh xác minh');
                  }
                  
                  // Cập nhật state
                  setIdentityInfo({
                    ...identityInfo,
                    frontImage: data.frontImageUrl || frontImagePreview,
                    backImage: data.backImageUrl || backImagePreview,
                    pendingVerification: true,
                    submittedAt: new Date().toISOString()
                  });
                  
                  // Lưu vào localStorage
                  if (typeof window !== 'undefined' && user) {
                    const identityInfoToSave = {
                      frontImage: data.frontImageUrl || frontImagePreview,
                      backImage: data.backImageUrl || backImagePreview,
                      pendingVerification: true,
                      verified: false,
                      submittedAt: new Date().toISOString(),
                      userId: user._id || user.id
                    };
                    localStorage.setItem('userIdentityInfo', JSON.stringify(identityInfoToSave));
                  }
                  
                  toast({
                    title: "Thành công",
                    description: "Yêu cầu xác minh danh tính của bạn đã được gửi và đang chờ xác nhận",
                    variant: "default"
                  });
                  
                  // Refresh user data
                  refreshUser();
                  
                } catch (error: any) {
                  console.error('Error uploading identity verification:', error);
                  toast({
                    title: "Lỗi",
                    description: error.message || "Có lỗi xảy ra khi tải lên ảnh xác minh",
                    variant: "destructive"
                  });
                } finally {
                  setIsUploadingIdentity(false);
                }
              }}
            >
              {isUploadingIdentity ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em]"></span>
                  Đang xử lý...
                </>
              ) : "Gửi yêu cầu xác minh"}
            </Button>
          </div>
        )}
      </div>
      
      {/* Edit Form */}
      {(isEditMode || !hasBankInfo) && (
        <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 overflow-hidden mt-6">
          <div className="p-4 border-b border-gray-700/50">
            <h3 className="font-medium">{hasBankInfo ? "Chỉnh sửa thông tin" : "Thêm thông tin ngân hàng"}</h3>
          </div>
          
          <div className="p-5">
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
                />
              </div>
              
              <div className="pt-2 flex gap-3">
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
                  className={isEditMode ? "flex-1" : "w-full"}
                >
                  {isSubmitting ? (
                    <>
                      <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em]"></span>
                      Đang xử lý...
                    </>
                  ) : hasBankInfo ? "Cập nhật thông tin" : "Lưu thông tin"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
