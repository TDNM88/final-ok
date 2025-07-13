import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    // Lấy token từ header
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    // Giải mã token để lấy thông tin người dùng
    let userId;
    
    try {
      // Nếu token là JWT (có dạng xxx.yyy.zzz)
      if (token.includes('.') && token.split('.').length === 3) {
        // Giải mã phần payload của JWT token (phần thứ 2)
        const base64Payload = token.split('.')[1];
        const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
        userId = payload.id || payload.userId || payload.sub;
      } 
      // Nếu token có dạng user_ID_timestamp
      else if (token.includes('_')) {
        const parts = token.split('_');
        if (parts.length > 1) {
          userId = parts[1]; 
        }
      }
      
      if (!userId) {
        console.error('Không thể xác định user ID từ token');
        return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 });
      }
      
      console.log('Xác thực thành công với userId:', userId);
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 });
    }

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
