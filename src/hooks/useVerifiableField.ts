"use client";

import { useState } from 'react';
import { VerificationStatus } from '@/types/verification';
import { useToast } from '@/components/ui/use-toast';

interface VerifiableFieldOptions {
  initialValue: string;
  initialStatus: VerificationStatus;
  fieldName: string;
  apiEndpoint: string;
  getToken: () => string | null;
  onSuccess?: () => Promise<void>;
}

export function useVerifiableField({
  initialValue,
  initialStatus,
  fieldName,
  apiEndpoint,
  getToken,
  onSuccess
}: VerifiableFieldOptions) {
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<VerificationStatus>(initialStatus);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleEdit = () => {
    if (status !== 'unverified') {
      toast({
        title: 'Không thể chỉnh sửa',
        description: status === 'verified' 
          ? 'Thông tin này đã được xác minh và không thể chỉnh sửa' 
          : 'Thông tin này đang chờ xác minh và không thể chỉnh sửa',
        variant: 'destructive',
      });
      return;
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!value.trim()) {
      toast({
        title: 'Lỗi',
        description: `Vui lòng nhập ${fieldName}`,
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const token = getToken();
      if (!token) {
        throw new Error('Không tìm thấy token xác thực');
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ [fieldName]: value })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Thành công',
          description: `Cập nhật ${fieldName} thành công`,
        });

        // Update status to pending verification
        setStatus('pending');
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          await onSuccess();
        }

        setIsEditing(false);
      } else {
        throw new Error(data.error || `Có lỗi xảy ra khi cập nhật ${fieldName}`);
      }
    } catch (error) {
      console.error(`Lỗi khi cập nhật ${fieldName}:`, error);
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : `Có lỗi xảy ra khi cập nhật ${fieldName}`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(initialValue);
    setIsEditing(false);
  };

  return {
    value,
    status,
    isEditing,
    isSaving,
    setValue,
    setStatus,
    handleChange,
    handleEdit,
    handleSave,
    handleCancel
  };
}
