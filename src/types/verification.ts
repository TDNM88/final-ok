// Verification status types for user information fields
export type VerificationStatus = 'unverified' | 'pending' | 'verified';

export interface VerifiableField {
  value: string;
  status: VerificationStatus;
  updatedAt?: string;
  verifiedAt?: string;
}

export interface UserVerifiableInfo {
  fullName?: VerifiableField;
  email?: VerifiableField;
  phone?: VerifiableField;
  address?: VerifiableField;
  dateOfBirth?: VerifiableField;
  idNumber?: VerifiableField; // CCCD/CMND number
  bankInfo?: {
    accountHolder?: VerifiableField;
    bankName?: VerifiableField;
    accountNumber?: VerifiableField;
    bankType?: VerifiableField;
  };
}
