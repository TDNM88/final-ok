import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getMongoDb } from '@/lib/db';
import { ObjectId, Db } from 'mongodb';

interface Withdrawal {
  _id: ObjectId | string;
  userId: string;
  amount: number;
  note?: string;
  status: string;
  createdAt: Date | string;
  [key: string]: any; // Cho phép các trường khác
}

export async function GET(request: Request) {
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

    // Kết nối đến database
    const db: Db = await getMongoDb();
    
    // Truy vấn lịch sử rút tiền của người dùng
    const withdrawals = await db.collection<Withdrawal>('withdrawals')
      .find({ userId: decoded.userId })
      .sort({ createdAt: -1 }) // Sắp xếp theo thời gian giảm dần (mới nhất lên đầu)
      .limit(50) // Giới hạn số lượng kết quả
      .toArray();
    
    // Chuyển đổi _id từ ObjectId sang string để dễ xử lý ở client
    const formattedWithdrawals = withdrawals.map((withdrawal: Withdrawal) => ({
      ...withdrawal,
      _id: withdrawal._id instanceof ObjectId ? withdrawal._id.toString() : withdrawal._id,
      createdAt: withdrawal.createdAt instanceof Date 
        ? withdrawal.createdAt.toISOString() 
        : withdrawal.createdAt
    }));

    return NextResponse.json(formattedWithdrawals);
    
  } catch (error) {
    console.error('Error fetching withdrawal history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch withdrawal history' }, 
      { status: 500 }
    );
  }
}
