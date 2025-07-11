import { NextResponse, NextRequest } from 'next/server';
import { getUserFromRequest, verifyToken } from '@/lib/auth';
import { getMongoDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    // Xác thực người dùng từ token
    // Thử lấy token từ nhiều nguồn khác nhau
    let token = request.headers.get('authorization')?.split(' ')[1];
    
    // Nếu không có token trong header, thử lấy từ cookie
    if (!token) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [name, value] = cookie.trim().split('=');
          acc[name] = value;
          return acc;
        }, {} as Record<string, string>);
        
        token = cookies['token'] || cookies['authToken'];
      }
    }
    
    console.log('Token found in /api/auth/me:', token ? 'Yes' : 'No');
    
    if (!token) {
      return NextResponse.json({ success: false, message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const tokenData = await verifyToken(token);
    if (!tokenData?.isValid) {
      return NextResponse.json({ success: false, message: 'Token không hợp lệ' }, { status: 401 });
    }
    
    // Lấy thông tin người dùng từ database
    const db = await getMongoDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(tokenData.userId) });
    
    if (!user) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy người dùng' }, { status: 404 });
    }
    
    // Prepare user response with default values
    const userResponse = {
      id: user._id,
      username: user.username || '',
      email: user.email || '',
      name: user.name || user.username || '',
      role: user.role || 'user',
      balance: user.balance || { available: 0, frozen: 0 },
      bank: user.bank || { 
        name: '', 
        accountNumber: '', 
        accountHolder: '' 
      },
      verification: user.verification || { 
        verified: false, 
        cccdFront: '', 
        cccdBack: '' 
      },
      status: user.status || { 
        active: true, 
        betLocked: false, 
        withdrawLocked: false 
      },
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
      lastLogin: user.lastLogin || new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Lỗi hệ thống',
        _debug: process.env.NODE_ENV !== 'production' ? {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        } : undefined
      },
      { status: 500 }
    );
  }
}
