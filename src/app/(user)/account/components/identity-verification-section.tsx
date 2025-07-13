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
    if (user?.verification) {
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
      
      // Update form data
      setFormData({
        fullName: user.fullName || '',
      });
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
    
    // Check if already verified or pending
    if (verificationStatus.verified || verificationStatus.pendingVerification) {
      toast({
        title: "Không thể gửi",
        description: "Yêu cầu xác minh đã được gửi hoặc đã được xác minh",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const formDataToSubmit = new FormData();
      formDataToSubmit.append('fullName', formData.fullName);
      formDataToSubmit.append('cccdFront', frontIdFile);
      formDataToSubmit.append('cccdBack', backIdFile);
      
      const response = await fetch('/api/upload-verification', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        },
        body: formDataToSubmit
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `API error: ${response.status}`);
      }
      
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
  const isVerified = user?.verification?.verified || false;
  const isPending = user?.verification?.cccdFront && user?.verification?.cccdBack && !isVerified;
  
  return (
    <div className="bg-gray-900 text-white">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Thông tin xác minh
        </h2>
        
        <div className="bg-teal-900/20 border border-teal-800/50 rounded-md p-4 mb-6">
          <p className="text-teal-400">
            Sau khi hoàn tất xác minh danh tính, bạn có thể nhận được các quyền lợi tương ứng
          </p>
        </div>
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-red-500">
              * Tải lên mặt trước thẻ căn cước
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
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="block text-sm font-medium text-red-500">
              * Tải lên mặt sau thẻ căn cước
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
            </div>
          </div>
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md"
          disabled={isSubmitting || isVerified || isPending}
        >
          {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
        </Button>
      </form>
    </div>
  );
}
