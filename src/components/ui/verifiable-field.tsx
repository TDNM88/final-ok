"use client";

import React, { useState } from 'react';
import { Pencil, Check, X, Loader2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { VerificationStatus } from '@/types/verification';

interface VerifiableFieldProps {
  label: string;
  value: string;
  fieldName: string;
  status: VerificationStatus;
  placeholder?: string;
  disabled?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
}

export function VerifiableField({
  label,
  value,
  fieldName,
  status,
  placeholder = 'Chưa cập nhật',
  disabled = false,
  onChange,
  onSave,
  onCancel
}: VerifiableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    if (status !== 'unverified' || disabled) return;
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    setIsEditing(false);
  };

  const getStatusIcon = () => {
    if (status === 'verified') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (status === 'pending') {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    return null;
  };

  const getStatusText = () => {
    if (status === 'verified') {
      return <span className="text-xs text-green-500 ml-2">Đã xác minh</span>;
    } else if (status === 'pending') {
      return <span className="text-xs text-yellow-500 ml-2">Đang chờ xác minh</span>;
    }
    return null;
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-gray-400 min-w-[150px] flex items-center">
        {label}
        {getStatusIcon()}
        {getStatusText()}
      </span>
      
      {isEditing ? (
        <>
          <input
            type="text"
            name={fieldName}
            value={value}
            onChange={onChange}
            className="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 text-sm flex-1"
            placeholder={placeholder}
          />
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded p-1"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </button>
          <button 
            onClick={handleCancel}
            className="bg-gray-700 hover:bg-gray-600 text-white rounded p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <p className="flex-1">{value || placeholder}</p>
          {status === 'unverified' && !disabled && (
            <button 
              onClick={handleEdit}
              className="ml-2 text-gray-400 hover:text-blue-400 cursor-pointer"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
