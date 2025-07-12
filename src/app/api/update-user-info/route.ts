import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    // Verify token
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token không hợp lệ' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ success: false, error: 'Token không hợp lệ hoặc hết hạn' }, { status: 401 });
    }

    // Parse request body
    const data = await request.json();
    
    // Validate required fields
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: 'Không có dữ liệu để cập nhật' }, { status: 400 });
    }

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection('users');

    // Find user by ID
    const userId = decoded.userId;
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    // Prepare update data with verification status
    const updateData: Record<string, any> = {};
    const fieldVerifications: Record<string, any> = user.fieldVerifications || {};

    // Process each field and mark as pending verification
    for (const [field, value] of Object.entries(data)) {
      // Skip empty values
      if (!value) continue;

      // Update the field value
      updateData[field] = value;

      // Mark field as pending verification
      fieldVerifications[field] = {
        value,
        pendingVerification: true,
        verified: false,
        updatedAt: new Date().toISOString()
      };
    }

    // Add field verifications to update data
    updateData.fieldVerifications = fieldVerifications;

    // Update user in database
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ success: false, error: 'Không có thay đổi nào được cập nhật' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Cập nhật thông tin thành công. Thông tin sẽ được xác minh trong thời gian sớm nhất.' 
    });
  } catch (error) {
    console.error('Error updating user info:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật thông tin người dùng' 
    }, { status: 500 });
  }
}
