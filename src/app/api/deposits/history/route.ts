import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    // Lấy token từ header
    const token = request.headers.get('authorization')?.split(' ')[1];
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

    // Lấy tham số phân trang từ query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    // Kết nối DB
    const db = await getMongoDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Lấy danh sách nạp tiền của người dùng
    const deposits = await db.collection('deposits')
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Lấy tổng số bản ghi để phân trang
    const total = await db.collection('deposits')
      .countDocuments({ userId: new ObjectId(userId) });

    return NextResponse.json({
      success: true,
      data: deposits,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching deposit history:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Lỗi khi lấy lịch sử nạp tiền' },
      { status: 500 }
    );
  }
}
