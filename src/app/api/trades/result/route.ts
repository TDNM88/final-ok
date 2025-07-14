import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    // Lấy token từ header
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    // Sử dụng hàm verifyToken từ lib/auth để xác thực token
    const { userId, isValid } = await verifyToken(token);
    
    if (!isValid || !userId) {
      console.error('Token không hợp lệ hoặc không thể xác định user ID');
      return NextResponse.json({ message: 'Token không hợp lệ hoặc hết hạn' }, { status: 401 });
    }
    
    console.log('Kết quả giao dịch: Xác thực thành công với userId:', userId);

    const { tradeId, result, profit } = await request.json();

    if (!tradeId || !result) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    const db = await getMongoDb();
    if (!db) {
      throw new Error('Không thể kết nối cơ sở dữ liệu');
    }

    // Cập nhật trạng thái giao dịch
    const updateResult = await db.collection('trades').updateOne(
      { _id: new ObjectId(tradeId), userId: new ObjectId(userId) },
      { $set: { status: 'completed', result, profit, updatedAt: new Date() } }
    );

    // Cập nhật số dư người dùng nếu có lợi nhuận
    if (profit > 0) {
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $inc: { 'balance.available': profit } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lỗi khi cập nhật kết quả giao dịch:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
}
