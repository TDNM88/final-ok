import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { verifyToken } from '@/lib/auth';

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
    const { bankName, accountNumber, accountHolder } = await req.json();

    if (!bankName || !accountNumber || !accountHolder) {
      return NextResponse.json(
        { message: 'Thiếu thông tin ngân hàng' },
        { status: 400 }
      );
    }

    // Lưu thông tin vào database
    const db = await getMongoDb();
    
    // Cập nhật thông tin ngân hàng cho user
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          bankInfo: {
            bankName,
            accountNumber,
            accountHolder,
            pendingVerification: true,
            updatedAt: new Date()
          }
        }
      }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Đã lưu thông tin ngân hàng thành công'
    });

  } catch (error) {
    console.error('Save bank info error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Lỗi khi lưu thông tin ngân hàng' },
      { status: 500 }
    );
  }
}
