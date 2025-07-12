"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface BankInfo {
  accountHolder: string;
  accountNumber: string;
  bankName: string;
  bankType: string;
  verified: boolean;
  pendingVerification: boolean;
  updatedAt?: string;
}

interface VerifiableField {
  value: string;
  verified: boolean;
  pendingVerification: boolean;
  updatedAt: string;
}

interface User {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  verification: {
    verified: boolean;
    cccdFront?: string;
    cccdBack?: string;
  };
  bankInfo?: BankInfo;
  verifiableInfo?: {
    [key: string]: VerifiableField;
  }
}

export default function VerificationPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && currentUser?.role !== 'admin') {
      toast({
        title: "Không có quyền truy cập",
        description: "Bạn không có quyền truy cập trang này",
        variant: "destructive"
      });
      return;
    }

    fetchUsers();
  }, [authLoading, currentUser]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token') || '';
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách người dùng",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (userId: string, field: string, approved: boolean) => {
    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch('/api/admin/verify-user-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          field,
          approved
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update verification status');
      }

      // Update local state
      setUsers(users.map(user => {
        if (user._id === userId) {
          // Handle verification for specific fields
          if (field === 'bankInfo' && user.bankInfo) {
            const updatedUser: User = {
              ...user,
              bankInfo: {
                ...user.bankInfo,
                verified: approved,
                pendingVerification: false
              }
            };
            return updatedUser;
          } else if (user.verifiableInfo && user.verifiableInfo[field]) {
            const updatedUser: User = {
              ...user,
              verifiableInfo: {
                ...user.verifiableInfo,
                [field]: {
                  ...user.verifiableInfo[field],
                  verified: approved,
                  pendingVerification: false
                }
              }
            };
            return updatedUser;
          }
        }
        return user;
      }));

      toast({
        title: approved ? "Đã xác minh" : "Đã từ chối",
        description: `Thông tin ${getFieldLabel(field)} của người dùng đã được ${approved ? 'xác minh' : 'từ chối'}`,
        variant: approved ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Error updating verification status:', error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái xác minh",
        variant: "destructive"
      });
    }
  };

  const getFieldLabel = (field: string): string => {
    const fieldLabels: {[key: string]: string} = {
      'bankInfo': 'Thông tin ngân hàng',
      'fullName': 'Họ và tên',
      'email': 'Email',
      'phone': 'Số điện thoại',
      'address': 'Địa chỉ'
    };
    
    return fieldLabels[field] || field;
  };

  const getPendingUsers = () => {
    return users.filter(user => {
      // Check if bank info is pending verification
      if (user.bankInfo?.pendingVerification) return true;
      
      // Check if any verifiable field is pending verification
      if (user.verifiableInfo) {
        for (const field in user.verifiableInfo) {
          if (user.verifiableInfo[field].pendingVerification) return true;
        }
      }
      
      return false;
    });
  };

  const getVerifiedUsers = () => {
    return users.filter(user => {
      // Only include users with at least one verified field
      if (user.bankInfo?.verified) return true;
      
      if (user.verifiableInfo) {
        for (const field in user.verifiableInfo) {
          if (user.verifiableInfo[field].verified) return true;
        }
      }
      
      return false;
    });
  };

  if (authLoading || (currentUser && currentUser.role !== 'admin')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Quản lý xác minh thông tin</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="pending">Chờ xác minh</TabsTrigger>
          <TabsTrigger value="verified">Đã xác minh</TabsTrigger>
          <TabsTrigger value="all">Tất cả</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getPendingUsers().length > 0 ? (
                getPendingUsers().map(user => (
                  <UserVerificationCard 
                    key={user._id} 
                    user={user} 
                    onVerify={handleVerify} 
                    showPending={true}
                  />
                ))
              ) : (
                <div className="col-span-full text-center p-8 bg-gray-800/50 rounded-lg">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-xl">Không có thông tin nào đang chờ xác minh</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="verified">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getVerifiedUsers().length > 0 ? (
                getVerifiedUsers().map(user => (
                  <UserVerificationCard 
                    key={user._id} 
                    user={user} 
                    onVerify={handleVerify} 
                    showVerified={true}
                  />
                ))
              ) : (
                <div className="col-span-full text-center p-8 bg-gray-800/50 rounded-lg">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-xl">Không có thông tin nào đã được xác minh</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="all">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.length > 0 ? (
                users.map(user => (
                  <UserVerificationCard 
                    key={user._id} 
                    user={user} 
                    onVerify={handleVerify} 
                    showAll={true}
                  />
                ))
              ) : (
                <div className="col-span-full text-center p-8 bg-gray-800/50 rounded-lg">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-xl">Không có người dùng nào</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface UserVerificationCardProps {
  user: User;
  onVerify: (userId: string, field: string, approved: boolean) => Promise<void>;
  showPending?: boolean;
  showVerified?: boolean;
  showAll?: boolean;
}

function UserVerificationCard({ user, onVerify, showPending = false, showVerified = false, showAll = false }: UserVerificationCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFieldLabel = (field: string): string => {
    const fieldLabels: {[key: string]: string} = {
      'bankInfo': 'Thông tin ngân hàng',
      'fullName': 'Họ và tên',
      'email': 'Email',
      'phone': 'Số điện thoại',
      'address': 'Địa chỉ'
    };
    
    return fieldLabels[field] || field;
  };

  const renderVerifiableFields = () => {
    const fields = [];
    
    // Add bank info if it exists
    if (user.bankInfo) {
      const isPending = user.bankInfo.pendingVerification;
      const isVerified = user.bankInfo.verified;
      
      // Filter based on view mode
      if ((showPending && !isPending) || (showVerified && !isVerified)) {
        return null;
      }
      
      fields.push(
        <div key="bankInfo" className="border-t border-gray-700 pt-3 mt-3">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-medium flex items-center">
                Thông tin ngân hàng
                {isPending && <Badge className="ml-2 bg-yellow-600">Chờ xác minh</Badge>}
                {isVerified && <Badge className="ml-2 bg-green-600">Đã xác minh</Badge>}
              </h4>
              <p className="text-sm text-gray-400">Cập nhật: {formatDate(user.bankInfo.updatedAt || '')}</p>
            </div>
            {isPending && (
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="bg-green-900/20 hover:bg-green-800/30 border-green-700"
                  onClick={() => onVerify(user._id, 'bankInfo', true)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" /> Xác nhận
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="bg-red-900/20 hover:bg-red-800/30 border-red-700"
                  onClick={() => onVerify(user._id, 'bankInfo', false)}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Từ chối
                </Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-gray-400">Tên chủ TK:</p>
              <p>{user.bankInfo.accountHolder}</p>
            </div>
            <div>
              <p className="text-gray-400">Số TK:</p>
              <p>{user.bankInfo.accountNumber}</p>
            </div>
            <div>
              <p className="text-gray-400">Ngân hàng:</p>
              <p>{user.bankInfo.bankName}</p>
            </div>
            <div>
              <p className="text-gray-400">Loại:</p>
              <p>{user.bankInfo.bankType}</p>
            </div>
          </div>
        </div>
      );
    }
    
    // Add other verifiable fields
    if (user.verifiableInfo) {
      Object.entries(user.verifiableInfo).forEach(([field, info]) => {
        const isPending = info.pendingVerification;
        const isVerified = info.verified;
        
        // Filter based on view mode
        if ((showPending && !isPending) || (showVerified && !isVerified)) {
          return;
        }
        
        fields.push(
          <div key={field} className="border-t border-gray-700 pt-3 mt-3">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium flex items-center">
                  {getFieldLabel(field)}
                  {isPending && <Badge className="ml-2 bg-yellow-600">Chờ xác minh</Badge>}
                  {isVerified && <Badge className="ml-2 bg-green-600">Đã xác minh</Badge>}
                </h4>
                <p className="text-sm text-gray-400">Cập nhật: {formatDate(info.updatedAt)}</p>
              </div>
              {isPending && (
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-green-900/20 hover:bg-green-800/30 border-green-700"
                    onClick={() => onVerify(user._id, field, true)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Xác nhận
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-red-900/20 hover:bg-red-800/30 border-red-700"
                    onClick={() => onVerify(user._id, field, false)}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Từ chối
                  </Button>
                </div>
              )}
            </div>
            <div className="text-sm">
              <p className="text-gray-400">Giá trị:</p>
              <p>{info.value}</p>
            </div>
          </div>
        );
      });
    }
    
    return fields.length > 0 ? fields : (
      <div className="text-center text-gray-400 py-4">
        <p>Không có thông tin cần xác minh</p>
      </div>
    );
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle>{user.fullName || 'Người dùng'}</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent>
        {renderVerifiableFields()}
      </CardContent>
      <CardFooter className="border-t border-gray-700 pt-4">
        <p className="text-sm text-gray-400">ID: {user._id}</p>
      </CardFooter>
    </Card>
  );
}
