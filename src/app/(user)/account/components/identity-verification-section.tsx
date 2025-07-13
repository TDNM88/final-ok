"use client";

import React, { useState, FormEvent, useRef } from 'react';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Upload } from 'lucide-react';

interface AuthContextType {
  user: any;
  refreshUser: () => Promise<void>;
}

export function IdentityVerificationSection() {
  const { user, refreshUser } = useAuth() as AuthContextType;
  const { toast } = useToast();
  
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const frontIdFileRef = useRef<HTMLInputElement>(null);
  const backIdFileRef = useRef<HTMLInputElement>(null);
  
  const [frontIdFile, setFrontIdFile] = useState<File | null>(null);
  const [backIdFile, setBackIdFile] = useState<File | null>(null);
  
  const getToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('authToken');
  };

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };
  
  const handleFrontIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFrontIdFile(e.target.files[0]);
    }
  };
  
  const handleBackIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBackIdFile(e.target.files[0]);
    }
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!fullName) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập họ tên thật",
        variant: "destructive"
      });
      return;
    }
    
    if (!frontIdFile || !backIdFile) {
      toast({
        title: "Lỗi",
        description: "Vui lòng tải lên ảnh mặt trước và mặt sau thẻ căn cước",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Cập nhật họ tên trước
      if (fullName !== user?.fullName) {
        const nameResponse = await fetch('/api/update-user-info', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
          },
          body: JSON.stringify({
            fullName
          })
        });
        
        if (!nameResponse.ok) {
          throw new Error('Không thể cập nhật họ tên');
        }
      }
      
      // Tải lên ảnh CCCD/CMND
      const formData = new FormData();
      formData.append('cccdFront', frontIdFile);
      formData.append('cccdBack', backIdFile);
      
      const response = await fetch('/api/upload-verification', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Có lỗi xảy ra khi tải lên ảnh xác minh');
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
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)} 
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
                ref={frontIdFileRef}
                onChange={handleFrontIdUpload}
                className="hidden"
                accept="image/*"
                disabled={isVerified || isPending}
              />
              <Button
                type="button"
                onClick={() => frontIdFileRef.current?.click()}
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
                ref={backIdFileRef}
                onChange={handleBackIdUpload}
                className="hidden"
                accept="image/*"
                disabled={isVerified || isPending}
              />
              <Button
                type="button"
                onClick={() => backIdFileRef.current?.click()}
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
