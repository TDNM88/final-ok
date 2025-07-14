import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    
    // Sử dụng hàm verifyToken từ lib/auth để xác thực token
    const { userId, isValid } = await verifyToken(token);
    
    if (!isValid || !userId) {
      console.error('Token không hợp lệ hoặc không thể xác định user ID');
      return NextResponse.json({ message: 'Token không hợp lệ hoặc hết hạn' }, { status: 401 });
    }
    
    console.log('Giao dịch: Xác thực thành công với userId:', userId);

    const { sessionId, direction, amount, asset } = await req.json();
    
    if (!sessionId || !direction || !amount || !asset) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const db = await getMongoDb();
    
    // Kiểm tra số dư tài khoản
    const userData = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!userData || userData.balance.available < amount) {
      return NextResponse.json({ message: 'Số dư không đủ' }, { status: 400 });
    }

    // Tạo giao dịch mới
    const trade = {
      userId: new ObjectId(userId),
      sessionId,
      direction,
      amount: Number(amount),
      asset,
      status: 'pending',
      profit: 0,
      result: null as 'win' | 'lose' | null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
    const session = db.startSession();
    try {
      await session.withTransaction(async () => {
        // Trừ tiền từ tài khoản
        await db.collection('users').updateOne(
          { _id: new ObjectId(userId) },
          { 
            $inc: { 
              'balance.available': -amount,
              'balance.frozen': amount
            } 
          },
          { session }
        );

        // Lưu giao dịch
        await db.collection('trades').insertOne(trade, { session });
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({ 
      success: true, 
      trade: {
        ...trade,
        _id: new ObjectId(),
        userId: userId
      }
    });

  } catch (error) {
    console.error('Error placing trade:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
