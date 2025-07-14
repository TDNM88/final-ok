import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db';
import { uploadFile } from '@/lib/fileUpload';

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file types
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    // Sử dụng hàm verifyToken từ lib/auth để xác thực token
    const { userId, isValid } = await verifyToken(token);
    
    if (!isValid || !userId) {
      console.error('Token không hợp lệ hoặc không thể xác định user ID');
      return NextResponse.json({ message: 'Token không hợp lệ hoặc hết hạn' }, { status: 401 });
    }
    
    console.log('Xác thực thành công với userId:', userId);

    const formData = await req.formData();
    const cccdFront = formData.get('cccdFront') as File;
    const cccdBack = formData.get('cccdBack') as File;

    if (!cccdFront || !cccdBack) {
      return NextResponse.json(
        { message: 'Vui lòng tải lên cả mặt trước và mặt sau CCCD/CMND' },
        { status: 400 }
      );
    }

    // Verify front file
    if (!ALLOWED_FILE_TYPES.includes(cccdFront.type)) {
      return NextResponse.json(
        { message: 'Mặt trước: Chỉ chấp nhận file ảnh định dạng JPG hoặc PNG' },
        { status: 400 }
      );
    }

    if (cccdFront.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: 'Mặt trước: Kích thước file tối đa là 5MB' },
        { status: 400 }
      );
    }

    // Verify back file
    if (!ALLOWED_FILE_TYPES.includes(cccdBack.type)) {
      return NextResponse.json(
        { message: 'Mặt sau: Chỉ chấp nhận file ảnh định dạng JPG hoặc PNG' },
        { status: 400 }
      );
    }

    if (cccdBack.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: 'Mặt sau: Kích thước file tối đa là 5MB' },
        { status: 400 }
      );
    }

    // Generate unique filenames
    const frontFileExt = cccdFront.name.split('.').pop();
    const backFileExt = cccdBack.name.split('.').pop();
    const timestamp = Date.now();
    
    const frontFileName = `${userId}-front-${timestamp}.${frontFileExt}`;
    const backFileName = `${userId}-back-${timestamp}.${backFileExt}`;
    
    const frontPathname = `verification/${frontFileName}`;
    const backPathname = `verification/${backFileName}`;

    // Upload both files using the fileUpload utility
    const [frontUrl, backUrl] = await Promise.all([
      uploadFile(cccdFront, frontPathname),
      uploadFile(cccdBack, backPathname)
    ]);

    // Update user document in MongoDB
    const db = await getMongoDb();
    
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          'verification.cccdFront': frontUrl,
          'verification.cccdBack': backUrl,
          'verification.verified': false,
          'verification.status': 'pending',
          'verification.submittedAt': new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Tải lên thành công',
      urls: {
        front: frontUrl,
        back: backUrl
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Lỗi khi tải lên' },
      { status: 500 }
    );
  }
}
