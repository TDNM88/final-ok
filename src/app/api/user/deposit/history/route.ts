import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getMongoDb } from '@/lib/db';
import { ObjectId, Db } from 'mongodb';

interface Deposit {
  _id: ObjectId | string;
  userId: string;
  amount: number;
  bankName: string;
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
    
    // Truy vấn lịch sử nạp tiền của người dùng
    const deposits = await db.collection<Deposit>('deposits')
      .find({ userId: decoded.userId })
      .sort({ createdAt: -1 }) // Sắp xếp theo thời gian giảm dần (mới nhất lên đầu)
      .limit(50) // Giới hạn số lượng kết quả
      .toArray();
    
    // Chuyển đổi _id từ ObjectId sang string để dễ xử lý ở client
    const formattedDeposits = deposits.map((deposit: Deposit) => ({
      ...deposit,
      _id: deposit._id instanceof ObjectId ? deposit._id.toString() : deposit._id,
      createdAt: deposit.createdAt instanceof Date 
        ? deposit.createdAt.toISOString() 
        : deposit.createdAt
    }));

    return NextResponse.json(formattedDeposits);
    
  } catch (error) {
    console.error('Error fetching deposit history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deposit history' }, 
      { status: 500 }
    );
  }
}
