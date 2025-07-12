"use client";

import React from 'react';
import { useAuth } from '@/lib/useAuth';
import { VerifiableField } from '@/components/ui/verifiable-field';
import { useVerifiableField } from '@/hooks/useVerifiableField';
import { VerificationStatus } from '@/types/verification';

interface AuthContextType {
  user: any;
  refreshUser: () => Promise<void>;
}

export function PersonalInfoSection() {
  const { user, refreshUser } = useAuth() as AuthContextType;
  
  const getToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('authToken');
  };

  // Determine verification status for each field
  const getFieldStatus = (fieldName: string): VerificationStatus => {
    // Check if the field has a specific verification status
    const fieldVerificationStatus = user?.fieldVerifications?.[fieldName];
    
    if (fieldVerificationStatus) {
      if (fieldVerificationStatus.verified) return 'verified';
      if (fieldVerificationStatus.pendingVerification) return 'pending';
    }
    
    // For fields without specific verification status
    // If user is verified overall, consider critical fields verified
    if (user?.verification?.verified && ['fullName', 'email', 'phone'].includes(fieldName)) {
      return 'verified';
    }
    
    return 'unverified';
  };

  // Full Name field
  const fullNameField = useVerifiableField({
    initialValue: user?.fullName || '',
    initialStatus: getFieldStatus('fullName'),
    fieldName: 'fullName',
    apiEndpoint: '/api/update-user-info',
    getToken,
    onSuccess: refreshUser
  });

  // Email field
  const emailField = useVerifiableField({
    initialValue: user?.email || '',
    initialStatus: getFieldStatus('email'),
    fieldName: 'email',
    apiEndpoint: '/api/update-user-info',
    getToken,
    onSuccess: refreshUser
  });

  // Phone field
  const phoneField = useVerifiableField({
    initialValue: user?.phone || '',
    initialStatus: getFieldStatus('phone'),
    fieldName: 'phone',
    apiEndpoint: '/api/update-user-info',
    getToken,
    onSuccess: refreshUser
  });

  // Address field
  const addressField = useVerifiableField({
    initialValue: user?.address || '',
    initialStatus: getFieldStatus('address'),
    fieldName: 'address',
    apiEndpoint: '/api/update-user-info',
    getToken,
    onSuccess: refreshUser
  });

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg">
      <h3 className="text-lg font-medium mb-4">Thông tin cá nhân</h3>
      <div className="space-y-4">
        <VerifiableField
          label="Họ và tên"
          value={fullNameField.value}
          fieldName="fullName"
          status={fullNameField.status}
          onChange={fullNameField.handleChange}
          onSave={fullNameField.handleSave}
          onCancel={fullNameField.handleCancel}
        />
        
        <VerifiableField
          label="Email"
          value={emailField.value}
          fieldName="email"
          status={emailField.status}
          onChange={emailField.handleChange}
          onSave={emailField.handleSave}
          onCancel={emailField.handleCancel}
        />
        
        <VerifiableField
          label="Số điện thoại"
          value={phoneField.value}
          fieldName="phone"
          status={phoneField.status}
          onChange={phoneField.handleChange}
          onSave={phoneField.handleSave}
          onCancel={phoneField.handleCancel}
        />
        
        <VerifiableField
          label="Địa chỉ"
          value={addressField.value}
          fieldName="address"
          status={addressField.status}
          onChange={addressField.handleChange}
          onSave={addressField.handleSave}
          onCancel={addressField.handleCancel}
        />
      </div>
    </div>
  );
}
