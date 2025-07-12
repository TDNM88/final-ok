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
    const { accountHolder, bankType, bankName, accountNumber } = body;

    // Validate required fields
    if (!accountHolder || !bankType || !bankName || !accountNumber) {
      return NextResponse.json(
        { message: 'Vui lòng điền đầy đủ thông tin' },
        { status: 400 }
      );
    }

    // Update user document in MongoDB
    const client = await clientPromise;
    const db = client.db();
    
    console.log('[update-bank-info] Updating bank info for user:', userId);

    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          'bankInfo.accountHolder': accountHolder,
          'bankInfo.bankType': bankType,
          'bankInfo.bankName': bankName,
          'bankInfo.accountNumber': accountNumber,
          'bankInfo.verified': false, // Reset verification status when bank info changes
          updatedAt: new Date()
        },
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
