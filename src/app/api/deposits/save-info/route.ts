import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getMongoDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    // Lấy token từ header
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    // Sử dụng hàm verifyToken từ lib/auth để xác thực token
    const { userId, isValid } = await verifyToken(token);
    
    if (!isValid || !userId) {
      console.error('Token không hợp lệ hoặc không thể xác định user ID');
      return NextResponse.json({ message: 'Token không hợp lệ hoặc hết hạn' }, { status: 401 });
    }
    
    console.log('Xác thực thành công với userId:', userId);

    // Lấy thông tin từ body request
    const { amount, selectedBank } = await req.json();

    if (!amount || !selectedBank) {
      return NextResponse.json(
        { message: 'Thiếu thông tin số tiền hoặc ngân hàng' },
        { status: 400 }
      );
    }

    // Lưu thông tin vào database
    const db = await getMongoDb();
    
    // Tìm kiếm deposit hiện có của user
    const existingDeposit = await db.collection('deposits').findOne({
      userId: new ObjectId(userId),
      status: 'pending'
    });

    if (existingDeposit) {
      // Cập nhật deposit hiện có
      await db.collection('deposits').updateOne(
        { _id: existingDeposit._id },
        { 
          $set: { 
            amount,
            selectedBank,
            updatedAt: new Date()
          }
        }
      );
    } else {
      // Tạo deposit mới
      await db.collection('deposits').insertOne({
        userId: new ObjectId(userId),
        amount,
        selectedBank,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Đã lưu thông tin nạp tiền thành công'
    });

  } catch (error) {
    console.error('Save deposit info error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Lỗi khi lưu thông tin nạp tiền' },
      { status: 500 }
    );
  }
}
