"use client";

import React, { useState, FormEvent, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Upload, 
  User, 
  Clock,
  Camera,
  FileCheck,
  ShieldCheck,
  ShieldAlert,
  Info,
  FileWarning
} from 'lucide-react';

interface AuthContextType {
  user: any;
  refreshUser: () => Promise<void>;
}

interface VerificationStatus {
  verified?: boolean;
  pendingVerification?: boolean;
  submittedAt?: string;
  verifiedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  frontIdUrl?: string;
  backIdUrl?: string;
}

export function IdentityVerificationSection() {
  const { user, refreshUser } = useAuth() as AuthContextType;
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
  });
  
  const [frontIdFile, setFrontIdFile] = useState<File | null>(null);
  const [backIdFile, setBackIdFile] = useState<File | null>(null);
  const [frontIdPreview, setFrontIdPreview] = useState<string>('');
  const [backIdPreview, setBackIdPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const frontIdInputRef = useRef<HTMLInputElement>(null);
  const backIdInputRef = useRef<HTMLInputElement>(null);
  
  // Verification status
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    verified: user?.verification?.verified || false,
    pendingVerification: user?.verification?.pendingVerification || false,
    submittedAt: user?.verification?.submittedAt,
    verifiedAt: user?.verification?.verifiedAt,
    rejectedAt: user?.verification?.rejectedAt,
    rejectionReason: user?.verification?.rejectionReason,
    frontIdUrl: user?.verification?.frontIdUrl,
    backIdUrl: user?.verification?.backIdUrl
  });
  
  // Update verification status when user data changes
  useEffect(() => {
    if (user) {
      // Update verification status
      if (user.verification) {
        setVerificationStatus({
          verified: user.verification.verified || false,
          pendingVerification: user.verification.pendingVerification || false,
          submittedAt: user.verification.submittedAt,
          verifiedAt: user.verification.verifiedAt,
          rejectedAt: user.verification.rejectedAt,
          rejectionReason: user.verification.rejectionReason,
          frontIdUrl: user.verification.frontIdUrl,
          backIdUrl: user.verification.backIdUrl
        });
      }
      
      // Update form data
      setFormData({
        fullName: user.fullName || '',
      });
      
      // Reset file inputs if verification status changes
      if (user.verification?.verified || user.verification?.pendingVerification) {
        setFrontIdFile(null);
        setBackIdFile(null);
        setFrontIdPreview('');
        setBackIdPreview('');
      }
    }
  }, [user]);
  
  const getToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('authToken');
  };

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  };
  
  // Handle front ID file selection
  const handleFrontIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFrontIdFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFrontIdPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle back ID file selection
  const handleBackIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBackIdFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackIdPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.fullName) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập họ tên đầy đủ",
        variant: "destructive"
      });
      return;
    }
    
    if (!frontIdFile || !backIdFile) {
      toast({
        title: "Lỗi",
        description: "Vui lòng tải lên ảnh mặt trước và mặt sau CMND/CCCD",
        variant: "destructive"
      });
      return;
    }
    
    if (verificationStatus.verified || verificationStatus.pendingVerification) {
      toast({
        title: "Không thể gửi",
        description: "Yêu cầu xác minh đã được gửi hoặc đã được xác minh",
        variant: "destructive"
      });
      return;
    }
    
    // Kiểm tra kích thước file
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    if (frontIdFile && frontIdFile.size > maxSizeInBytes) {
      toast({
        title: "Lỗi",
        description: "Ảnh mặt trước không được vượt quá 5MB",
        variant: "destructive"
      });
      return;
    }
    
    if (backIdFile && backIdFile.size > maxSizeInBytes) {
      toast({
        title: "Lỗi",
        description: "Ảnh mặt sau không được vượt quá 5MB",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Tải lên mặt trước
      const frontFormData = new FormData();
      frontFormData.append('document', frontIdFile);
      frontFormData.append('type', 'front');
      
      // Tải lên mặt sau
      const backFormData = new FormData();
      backFormData.append('document', backIdFile);
      backFormData.append('type', 'back');
      
      // Gửi cả hai request song song
      const [frontResponse, backResponse] = await Promise.all([
        fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getToken()}`
          },
          body: frontFormData
        }),
        fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getToken()}`
          },
          body: backFormData
        })
      ]);
      
      // Kiểm tra kết quả
      if (!frontResponse.ok) {
        const data = await frontResponse.json().catch(() => ({}));
        throw new Error(data.message || `API error (mặt trước): ${frontResponse.status}`);
      }
      
      if (!backResponse.ok) {
        const data = await backResponse.json().catch(() => ({}));
        throw new Error(data.message || `API error (mặt sau): ${backResponse.status}`);
      }
      
      const frontResult = await frontResponse.json();
      const backResult = await backResponse.json();
      
      // Cập nhật trạng thái xác minh
      setVerificationStatus({
        ...verificationStatus,
        pendingVerification: true,
        submittedAt: new Date().toISOString(),
        frontIdUrl: frontResult.url || verificationStatus.frontIdUrl,
        backIdUrl: backResult.url || verificationStatus.backIdUrl
      });
      
      // Xóa preview ảnh
      setFrontIdPreview('');
      setBackIdPreview('');
      
      // Xóa file đã chọn
      setFrontIdFile(null);
      setBackIdFile(null);
      
      toast({
        title: "Thành công",
        description: "Đã gửi yêu cầu xác minh danh tính thành công. Vui lòng đợi phê duyệt."
      });
      
      refreshUser();
      
    } catch (error) {
      toast({
        title: "Lỗi",
        description: (error as Error).message || "Đã xảy ra lỗi khi xác minh danh tính",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Kiểm tra trạng thái xác minh
  const isVerified = verificationStatus.verified || false;
  const isPending = verificationStatus.pendingVerification || false;
  
  return (
    <div className="bg-gray-900 text-white">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-400" />
            Thông tin xác minh danh tính
          </h2>
          {verificationStatus.verified && (
            <span className="bg-green-500/20 text-green-400 text-xs px-3 py-1 rounded-full flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Đã xác minh
            </span>
          )}
          {verificationStatus.pendingVerification && !verificationStatus.verified && (
            <span className="bg-yellow-500/20 text-yellow-400 text-xs px-3 py-1 rounded-full flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Đang chờ xác minh
            </span>
          )}
        </div>
        
        {!verificationStatus.verified && !verificationStatus.pendingVerification && (
          <div className="bg-teal-900/20 border border-teal-800/50 rounded-md p-4 mb-6">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-teal-400" />
              <p className="text-teal-400">
                Sau khi hoàn tất xác minh danh tính, bạn có thể nhận được các quyền lợi tương ứng
              </p>
            </div>
          </div>
        )}
        
        {verificationStatus.pendingVerification && !verificationStatus.verified && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-4 mb-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <p className="text-yellow-500">
                Yêu cầu xác minh danh tính của bạn đang được xử lý. Vui lòng đợi trong vòng 24-48 giờ làm việc.
              </p>
            </div>
            {verificationStatus.submittedAt && (
              <div className="mt-2 text-xs text-yellow-500/70">
                Ngày gửi yêu cầu: {formatDate(verificationStatus.submittedAt)}
              </div>
            )}
          </div>
        )}
        
        {verificationStatus.verified && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-md p-4 mb-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <p className="text-green-500">
                Danh tính của bạn đã được xác minh thành công.
              </p>
            </div>
            {verificationStatus.verifiedAt && (
              <div className="mt-2 text-xs text-green-500/70">
                Ngày xác minh: {formatDate(verificationStatus.verifiedAt)}
              </div>
            )}
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-red-500">
            * Họ tên thật
          </label>
          <Input 
            type="text" 
            value={formData.fullName} 
            onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
            placeholder="Nhập tên, vui lòng nhập thêm khoảng cách cho mỗi từ"
            className="bg-transparent border-gray-700 text-white"
            disabled={isVerified || isPending}
          />
        </div>
        
        {/* Hiển thị ảnh CMND/CCCD đã được xác minh */}
        {verificationStatus.verified && verificationStatus.frontIdUrl && verificationStatus.backIdUrl && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">
              Ảnh CMND/CCCD đã xác minh
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800/50 border border-gray-700 rounded-md overflow-hidden">
                <div className="p-2 bg-gray-800 text-xs text-gray-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <FileCheck className="h-3 w-3" /> Mặt trước
                  </span>
                  <span className="text-green-400 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Đã xác minh
                  </span>
                </div>
                <div className="p-2">
                  <img 
                    src={verificationStatus.frontIdUrl} 
                    alt="Mặt trước CMND/CCCD" 
                    className="w-full h-auto object-contain max-h-40"
                  />
                </div>
              </div>
              <div className="bg-gray-800/50 border border-gray-700 rounded-md overflow-hidden">
                <div className="p-2 bg-gray-800 text-xs text-gray-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <FileCheck className="h-3 w-3" /> Mặt sau
                  </span>
                  <span className="text-green-400 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Đã xác minh
                  </span>
                </div>
                <div className="p-2">
                  <img 
                    src={verificationStatus.backIdUrl} 
                    alt="Mặt sau CMND/CCCD" 
                    className="w-full h-auto object-contain max-h-40"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form tải lên ảnh CMND/CCCD */}
        {!verificationStatus.verified && !verificationStatus.pendingVerification && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-red-500 flex items-center gap-1">
                <Camera className="h-4 w-4" /> * Mặt trước CMND/CCCD
              </label>
              <div className="relative">
                <input
                  type="file"
                  ref={frontIdInputRef}
                  onChange={handleFrontIdChange}
                  className="hidden"
                  accept="image/*"
                  disabled={isVerified || isPending}
                />
                <Button
                  type="button"
                  onClick={() => frontIdInputRef.current?.click()}
                  className="w-full bg-transparent border border-gray-700 hover:bg-gray-800 flex items-center justify-center"
                  disabled={isVerified || isPending}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {frontIdFile ? frontIdFile.name : 'Tải lên'}
                </Button>
                {frontIdPreview && (
                  <div className="mt-2 border border-gray-700 rounded-md overflow-hidden">
                    <img 
                      src={frontIdPreview} 
                      alt="Preview mặt trước" 
                      className="w-full h-auto object-contain max-h-40"
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-red-500 flex items-center gap-1">
                <Camera className="h-4 w-4" /> * Mặt sau CMND/CCCD
              </label>
              <div className="relative">
                <input
                  type="file"
                  ref={backIdInputRef}
                  onChange={handleBackIdChange}
                  className="hidden"
                  accept="image/*"
                  disabled={isVerified || isPending}
                />
                <Button
                  type="button"
                  onClick={() => backIdInputRef.current?.click()}
                  className="w-full bg-transparent border border-gray-700 hover:bg-gray-800 flex items-center justify-center"
                  disabled={isVerified || isPending}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {backIdFile ? backIdFile.name : 'Tải lên'}
                </Button>
                {backIdPreview && (
                  <div className="mt-2 border border-gray-700 rounded-md overflow-hidden">
                    <img 
                      src={backIdPreview} 
                      alt="Preview mặt sau" 
                      className="w-full h-auto object-contain max-h-40"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Hiển thị ảnh đang chờ xác minh */}
        {verificationStatus.pendingVerification && !verificationStatus.verified && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">
              Ảnh CMND/CCCD đang chờ xác minh
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800/50 border border-gray-700 rounded-md overflow-hidden">
                <div className="p-2 bg-gray-800 text-xs text-gray-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <FileWarning className="h-3 w-3" /> Mặt trước
                  </span>
                  <span className="text-yellow-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Đang chờ xác minh
                  </span>
                </div>
                {verificationStatus.frontIdUrl && (
                  <div className="p-2">
                    <img 
                      src={verificationStatus.frontIdUrl} 
                      alt="Mặt trước CMND/CCCD" 
                      className="w-full h-auto object-contain max-h-40"
                    />
                  </div>
                )}
              </div>
              <div className="bg-gray-800/50 border border-gray-700 rounded-md overflow-hidden">
                <div className="p-2 bg-gray-800 text-xs text-gray-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <FileWarning className="h-3 w-3" /> Mặt sau
                  </span>
                  <span className="text-yellow-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Đang chờ xác minh
                  </span>
                </div>
                {verificationStatus.backIdUrl && (
                  <div className="p-2">
                    <img 
                      src={verificationStatus.backIdUrl} 
                      alt="Mặt sau CMND/CCCD" 
                      className="w-full h-auto object-contain max-h-40"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {!verificationStatus.verified && !verificationStatus.pendingVerification && (
          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md flex items-center justify-center gap-2"
            disabled={isSubmitting || !formData.fullName || !frontIdFile || !backIdFile}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5" />
                <span>Gửi yêu cầu xác minh</span>
              </>
            )}
          </Button>
        )}
        
        {verificationStatus.pendingVerification && !verificationStatus.verified && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-yellow-500">Đang chờ xác minh</span>
            </div>
            <Button 
              type="button" 
              className="bg-transparent border border-yellow-500/50 hover:bg-yellow-500/10 text-yellow-500 text-xs px-3 py-1 h-auto"
              onClick={refreshUser}
            >
              Kiểm tra trạng thái
            </Button>
          </div>
        )}
        
        {verificationStatus.verified && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-md p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-green-500">Đã xác minh thành công</span>
            </div>
            <span className="text-xs text-green-500/70">
              {verificationStatus.verifiedAt && formatDate(verificationStatus.verifiedAt)}
            </span>
          </div>
        )}
      </form>
    </div>
  );
}
