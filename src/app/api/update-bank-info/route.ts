import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.get('authorization');
    console.log('[update-bank-info] Authorization header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false,
        message: 'Bạn cần đăng nhập' 
      }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    console.log('[update-bank-info] Token found, length:', token.length);
    
    // Verify token
    const { userId, isValid } = await verifyToken(token);
    console.log('[update-bank-info] Token verification result:', { userId, isValid });
    
    if (!isValid || !userId) {
      return NextResponse.json({ 
        success: false,
        message: 'Phiên đăng nhập hết hạn' 
      }, { status: 401 });
    }

    const body = await req.json();
    const { accountHolder, bankName, accountNumber, bankType = '', name = '', bankCode = '', accountType = 'savings' } = body;
    
    console.log('[update-bank-info] Received bank info:', { accountHolder, bankName, accountNumber });

    // Validate required fields - chỉ cần tên ngân hàng, chủ tài khoản, số tài khoản
    if (!accountHolder) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng điền tên chủ tài khoản' },
        { status: 400 }
      );
    }
    
    if (!bankName) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng điền tên ngân hàng' },
        { status: 400 }
      );
    }
    
    if (!accountNumber) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng điền số tài khoản' },
        { status: 400 }
      );
    }

    // Update user document in MongoDB
    const client = await clientPromise;
    const db = client.db();
    
    console.log('[update-bank-info] Updating bank info for user:', userId);
    
    // Kiểm tra xem thông tin ngân hàng đã được xác minh chưa
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) }
    );
    
    // Nếu thông tin ngân hàng đã được xác minh, không cho phép cập nhật
    if (user?.bankInfo?.verified === true) {
      return NextResponse.json({ 
        success: false,
        message: 'Thông tin ngân hàng đã được xác minh, không thể chỉnh sửa' 
      }, { status: 403 });
    }

    // Prepare update data with required fields
    const updateData: Record<string, any> = {
      'bankInfo.accountHolder': accountHolder,
      'bankInfo.bankName': bankName,
      'bankInfo.accountNumber': accountNumber,
      'bankInfo.verified': false, // Reset verification status when bank info changes
      'bankInfo.pendingVerification': true, // Mark as pending verification
      updatedAt: new Date()
    };
    
    // Add optional fields if they exist
    if (bankType) updateData['bankInfo.bankType'] = bankType;
    if (name) updateData['bankInfo.name'] = name;
    if (bankCode) updateData['bankInfo.bankCode'] = bankCode;
    if (accountType) updateData['bankInfo.accountType'] = accountType;
    
    console.log('[update-bank-info] Updating with data:', updateData);
    
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: updateData,
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Cập nhật thông tin ngân hàng thành công',
      data: {
        accountHolder,
        bankType,
        bankName,
        accountNumber,
        verified: false
      }
    });
  } catch (error) {
    console.error('Update bank info error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật thông tin ngân hàng' 
      },
      { status: 500 }
    );
  }
}
