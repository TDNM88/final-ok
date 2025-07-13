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
  Clock,
  ShieldCheck,
  Upload
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

interface IdentityInfo {
  frontImage: string;
  backImage: string;
  verified: boolean;
  pendingVerification: boolean;
  submittedAt: string;
  verifiedAt: string;
}

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

  const [identityInfo, setIdentityInfo] = useState<IdentityInfo>({
    frontImage: '',
    backImage: '',
    verified: false,
    pendingVerification: false,
    submittedAt: '',
    verifiedAt: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [frontImageFile, setFrontImageFile] = useState<File | null>(null);
  const [backImageFile, setBackImageFile] = useState<File | null>(null);
  const [frontImagePreview, setFrontImagePreview] = useState<string>('');
  const [backImagePreview, setBackImagePreview] = useState<string>('');
  const [isUploadingIdentity, setIsUploadingIdentity] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadStoredData = () => {
      if (typeof window === 'undefined') return;

      // Load bank info
      const savedBankInfo = localStorage.getItem('userBankInfo');
      if (savedBankInfo) {
        try {
          const parsedInfo = JSON.parse(savedBankInfo);
          if (user && (parsedInfo.userId === user._id || parsedInfo.userId === user.id)) {
            setFormData(prev => ({
              ...prev,
              ...parsedInfo,
              verified: parsedInfo.verified ?? false,
              pendingVerification: parsedInfo.pendingVerification ?? false
            }));
          }
        } catch (error) {
          console.error('Error parsing saved bank info:', error);
        }
      }

      // Load identity info
      const savedIdentityInfo = localStorage.getItem('userIdentityInfo');
      if (savedIdentityInfo) {
        try {
          const parsedInfo = JSON.parse(savedIdentityInfo);
          if (user && (parsedInfo.userId === user._id || parsedInfo.userId === user.id)) {
            setIdentityInfo(prev => ({
              ...prev,
              ...parsedInfo,
              verified: parsedInfo.verified ?? false,
              pendingVerification: parsedInfo.pendingVerification ?? false
            }));
          }
        } catch (error) {
          console.error('Error parsing saved identity info:', error);
        }
      }
    };

    loadStoredData();

    // Update with server data if available
    if (user?.bankInfo) {
      const bankInfo = {
        fullName: user.bankInfo.fullName || '',
        bankName: user.bankInfo.bankName || '',
        accountNumber: user.bankInfo.accountNumber || '',
        verified: user.bankInfo.verified ?? false,
        pendingVerification: user.bankInfo.pendingVerification ?? false,
        submittedAt: user.bankInfo.submittedAt,
        verifiedAt: user.bankInfo.verifiedAt
      };
      setFormData(bankInfo);
      localStorage.setItem('userBankInfo', JSON.stringify({
        ...bankInfo,
        userId: user._id || user.id
      }));
    }

    if (user?.identityInfo) {
      const newIdentityInfo = {
        frontImage: user.identityInfo.frontImage || '',
        backImage: user.identityInfo.backImage || '',
        verified: user.identityInfo.verified ?? false,
        pendingVerification: user.identityInfo.pendingVerification ?? false,
        submittedAt: user.identityInfo.submittedAt || '',
        verifiedAt: user.identityInfo.verifiedAt || ''
      };
      setIdentityInfo(newIdentityInfo);
      localStorage.setItem('userIdentityInfo', JSON.stringify({
        ...newIdentityInfo,
        userId: user._id || user.id
      }));
    }
  }, [user]);

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
        description: "Vui lòng điền đầy đủ thông tin",
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
    if (!/^\d+$/.test(formData.accountNumber)) {
      toast({
        title: "Lỗi",
        description: "Số tài khoản chỉ được chứa các chữ số",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const bankInfoToSave = {
        ...formData,
        userId: user?._id || user?.id || '',
        pendingVerification: true,
        submittedAt: new Date().toISOString()
      };
      localStorage.setItem('userBankInfo', JSON.stringify(bankInfoToSave));

      const response = await fetch('/api/update-bank-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ bankInfo: bankInfoToSave })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      await response.json();
      await refreshUser();
      setIsEditMode(false);
      
      toast({
        title: "Thành công",
        description: "Thông tin ngân hàng đã được cập nhật và đang chờ xác minh"
      });
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

  const handleIdentityUpload = useCallback(async () => {
    if (!frontImageFile || !backImageFile) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng tải lên cả hai ảnh CMND/CCCD",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingIdentity(true);
    try {
      const formData = new FormData();
      formData.append('frontImage', frontImageFile);
      formData.append('backImage', backImageFile);

      const response = await fetch('/api/upload-identity-verification', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload identity images');
      }

      const data = await response.json();
      const newIdentityInfo = {
        frontImage: data.frontImageUrl || frontImagePreview,
        backImage: data.backImageUrl || backImagePreview,
        verified: false,
        pendingVerification: true,
        submittedAt: new Date().toISOString(),
        verifiedAt: ''
      };

      setIdentityInfo(newIdentityInfo);
      localStorage.setItem('userIdentityInfo', JSON.stringify({
        ...newIdentityInfo,
        userId: user._id || user.id
      }));

      await refreshUser();
      toast({
        title: "Thành công",
        description: "Yêu cầu xác minh danh tính đã được gửi"
      });
    } catch (error) {
      console.error('Error uploading identity:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải lên ảnh xác minh",
        variant: "destructive"
      });
    } finally {
      setIsUploadingIdentity(false);
    }
  }, [frontImageFile, backImageFile, frontImagePreview, backImagePreview, getToken, user, refreshUser, toast]);

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

      <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700/50 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Xác minh danh tính
          </h3>
          <span className={`text-xs px-3 py-1 rounded-full
            ${identityInfo.verified ? 'bg-green-500/20 text-green-400' :
              identityInfo.pendingVerification ? 'bg-amber-500/20 text-amber-400' :
              'bg-gray-500/20 text-gray-400'}`}>
            {identityInfo.verified ? 'Đã xác minh' : 
             identityInfo.pendingVerification ? 'Đang xác minh' : 
             'Chưa xác minh'}
          </span>
        </div>

        {(identityInfo.verified || identityInfo.pendingVerification) && (
          <div className="space-y-4">
            {(identityInfo.frontImage || identityInfo.backImage) && (
              <div className="grid grid-cols-2 gap-4">
                {identityInfo.frontImage && (
                  <div className="border border-gray-700 rounded-lg overflow-hidden">
                    <div className="p-2 bg-gray-800/50 text-xs text-gray-400">Mặt trước CMND/CCCD</div>
                    <img src={identityInfo.frontImage} alt="Mặt trước" className="w-full h-auto" />
                  </div>
                )}
                {identityInfo.backImage && (
                  <div className="border border-gray-700 rounded-lg overflow-hidden">
                    <div className="p-2 bg-gray-800/50 text-xs text-gray-400">Mặt sau CMND/CCCD</div>
                    <img src={identityInfo.backImage} alt="Mặt sau" className="w-full h-auto" />
                  </div>
                )}
              </div>
            )}

            {identityInfo.verified ? (
              <div className="bg-green-900/20 p-4 rounded-lg border border-green-700/50">
                <p className="text-sm text-green-400 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Danh tính đã được xác minh
                </p>
                {identityInfo.verifiedAt && (
                  <p className="text-xs text-green-400/70 mt-1">
                    Xác minh vào: {formatDate(identityInfo.verifiedAt)}
                  </p>
                )}
              </div>
            ) : identityInfo.pendingVerification ? (
              <div className="bg-amber-900/20 p-4 rounded-lg border border-amber-700/50">
                <p className="text-sm text-amber-400 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Danh tính đang được xem xét
                </p>
                {identityInfo.submittedAt && (
                  <p className="text-xs text-amber-400/70 mt-1">
                    Gửi yêu cầu vào: {formatDate(identityInfo.submittedAt)}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        )}

        {!identityInfo.verified && !identityInfo.pendingVerification && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">Vui lòng tải lên ảnh CMND/CCCD để xác minh danh tính</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center">
                <p className="text-sm text-gray-400 mb-2">Mặt trước CMND/CCCD</p>
                {frontImagePreview ? (
                  <div className="relative w-full">
                    <img src={frontImagePreview} alt="Mặt trước" className="w-full h-auto rounded-md" />
                    <button
                      type="button"
                      className="absolute top-2 right-2 bg-red-500/80 p-1 rounded-full hover:bg-red-600"
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
                    className="px-3 py-2 bg-gray-700 rounded-md text-sm hover:bg-gray-600 transition-colors"
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
                    if (e.target.files?.[0]) {
                      const file = e.target.files[0];
                      setFrontImageFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => setFrontImagePreview(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>

              <div className="border border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center">
                <p className="text-sm text-gray-400 mb-2">Mặt sau CMND/CCCD</p>
                {backImagePreview ? (
                  <div className="relative w-full">
                    <img src={backImagePreview} alt="Mặt sau" className="w-full h-auto rounded-md" />
                    <button
                      type="button"
                      className="absolute top-2 right-2 bg-red-500/80 p-1 rounded-full hover:bg-red-600"
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
                    className="px-3 py-2 bg-gray-700 rounded-md text-sm hover:bg-gray-600 transition-colors"
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
                    if (e.target.files?.[0]) {
                      const file = e.target.files[0];
                      setBackImageFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => setBackImagePreview(reader.result as string);
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
              onClick={handleIdentityUpload}
            >
              {isUploadingIdentity ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                  Đang xử lý...
                </>
              ) : (
                'Gửi yêu cầu xác minh'
              )}
            </Button>
          </div>
        )}
      </div>

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