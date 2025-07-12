import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getMongoDb } from '@/lib/db';
import { ObjectId, Db } from 'mongodb';

interface UpdateProfileRequest {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  [key: string]: any;
}

export async function POST(request: Request) {
  try {
    // Xác thực người dùng
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyToken(token);
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Lấy dữ liệu từ request
    const data: UpdateProfileRequest = await request.json();
    
    // Kiểm tra dữ liệu
    const allowedFields = ['fullName', 'email', 'phone', 'address'];
    const updateData: Record<string, any> = {};
    
    // Chỉ lấy các trường được phép cập nhật
    Object.keys(data).forEach(key => {
      if (allowedFields.includes(key) && data[key] !== undefined) {
        updateData[key] = data[key];
      }
    });
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Không có dữ liệu hợp lệ để cập nhật' }, { status: 400 });
    }
    
    // Kết nối đến database
    const db: Db = await getMongoDb();
    
    // Cập nhật thông tin người dùng
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(decoded.userId) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cập nhật thông tin cá nhân thành công',
      updatedFields: Object.keys(updateData)
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật thông tin cá nhân' 
    }, { status: 500 });
  }
}
