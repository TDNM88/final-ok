"use client";

import React from 'react';
import { useAuth } from '@/lib/useAuth';
import { VerifiableField } from '@/components/ui/verifiable-field';
import { useVerifiableField } from '@/hooks/useVerifiableField';
import { VerificationStatus } from '@/types/verification';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface AuthContextType {
  user: any;
  refreshUser: () => Promise<void>;
}

export function BankInfoSection() {
  const { user, refreshUser } = useAuth() as AuthContextType;
  
  const getToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('authToken');
  };

  // Get bank info from user data
  const bankInfo = user?.bankInfo || user?.bank || {};
  
  // Determine verification status for bank info fields
  const getBankFieldStatus = (fieldName: string): VerificationStatus => {
    if (bankInfo.verified) return 'verified';
    if (bankInfo.pendingVerification) return 'pending';
    return 'unverified';
  };

  // Bank account holder field
  const accountHolderField = useVerifiableField({
    initialValue: bankInfo?.accountHolder || '',
    initialStatus: getBankFieldStatus('accountHolder'),
    fieldName: 'accountHolder',
    apiEndpoint: '/api/update-bank-info',
    getToken,
    onSuccess: refreshUser
  });

  // Bank name field
  const bankNameField = useVerifiableField({
    initialValue: bankInfo?.bankName || '',
    initialStatus: getBankFieldStatus('bankName'),
    fieldName: 'bankName',
    apiEndpoint: '/api/update-bank-info',
    getToken,
    onSuccess: refreshUser
  });

  // Account number field
  const accountNumberField = useVerifiableField({
    initialValue: bankInfo?.accountNumber || '',
    initialStatus: getBankFieldStatus('accountNumber'),
    fieldName: 'accountNumber',
    apiEndpoint: '/api/update-bank-info',
    getToken,
    onSuccess: refreshUser
  });

  // Render verification status badge
  const renderVerificationStatus = () => {
    if (bankInfo.verified) {
      return (
        <div className="flex items-center text-green-500 mb-4">
          <CheckCircle className="h-5 w-5 mr-2" />
          <span>Đã xác minh</span>
        </div>
      );
    } else if (bankInfo.pendingVerification) {
      return (
        <div className="flex items-center text-yellow-500 mb-4">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <span>Đang chờ xác minh</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-gray-400 mb-4">
          <XCircle className="h-5 w-5 mr-2" />
          <span>Chưa xác minh</span>
        </div>
      );
    }
  };

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg">
      <h3 className="text-lg font-medium mb-4">Thông tin ngân hàng</h3>
      
      {renderVerificationStatus()}
      
      <div className="space-y-4">
        <VerifiableField
          label="Tên chủ tài khoản"
          value={accountHolderField.value}
          fieldName="accountHolder"
          status={accountHolderField.status}
          onChange={accountHolderField.handleChange}
          onSave={accountHolderField.handleSave}
          onCancel={accountHolderField.handleCancel}
        />
        
        <VerifiableField
          label="Tên ngân hàng"
          value={bankNameField.value}
          fieldName="bankName"
          status={bankNameField.status}
          onChange={bankNameField.handleChange}
          onSave={bankNameField.handleSave}
          onCancel={bankNameField.handleCancel}
        />
        
        <VerifiableField
          label="Số tài khoản"
          value={accountNumberField.value}
          fieldName="accountNumber"
          status={accountNumberField.status}
          onChange={accountNumberField.handleChange}
          onSave={accountNumberField.handleSave}
          onCancel={accountNumberField.handleCancel}
        />
      </div>
    </div>
  );
}
