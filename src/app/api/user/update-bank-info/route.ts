import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getMongoDb } from '@/lib/db';
import { ObjectId, Db } from 'mongodb';

interface UpdateBankInfoRequest {
  accountHolder?: string;
  bankName?: string;
  bankType?: string;
  accountNumber?: string;
  bankCode?: string;
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
    const data: UpdateBankInfoRequest = await request.json();
    
    // Kiểm tra dữ liệu
    const allowedFields = ['accountHolder', 'bankName', 'bankType', 'accountNumber', 'bankCode'];
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
    
    // Tạo đối tượng cập nhật cho ngân hàng
    const bankInfoUpdate: Record<string, any> = {};
    
    // Cập nhật các trường trong bankInfo
    Object.keys(updateData).forEach(key => {
      bankInfoUpdate[`bankInfo.${key}`] = updateData[key];
    });
    
    // Cập nhật thông tin ngân hàng của người dùng
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(decoded.userId) },
      { $set: bankInfoUpdate }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cập nhật thông tin ngân hàng thành công',
      updatedFields: Object.keys(updateData)
    });
    
  } catch (error) {
    console.error('Update bank info error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật thông tin ngân hàng' 
    }, { status: 500 });
  }
}
