import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { uploadFile } from '@/lib/fileUpload';
import { getMongoDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

// Cấu hình cho API route này để cho phép file lớn
export const config = {
  api: {
    bodyParser: false, // Disable body parser để xử lý upload file lớn
  },
  maxDuration: 60, // Tăng thời gian tối đa của serverless function (cho Vercel)
};

// API xử lý upload hóa đơn nạp tiền
export async function POST(req: NextRequest) {
  try {
    // Xác thực người dùng
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.userId) {
      return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 });
    }

    // Xử lý form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ message: 'Không tìm thấy file' }, { status: 400 });
    }

    // Kiểm tra loại file
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ message: 'Chỉ chấp nhận file ảnh' }, { status: 400 });
    }

    // Kiểm tra kích thước file (giới hạn 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: 'Kích thước file không được vượt quá 5MB' }, { status: 400 });
    }

    try {
      // Upload file lên storage
      const fileUrl = await uploadFile(file);

      // Lấy kết nối MongoDB
      const db = await getMongoDb();
      if (!db) {
        throw new Error('Không thể kết nối đến cơ sở dữ liệu');
      }

      // Lưu thông tin bill vào collection deposits
      const depositData = {
        userId: new ObjectId(user.userId),
        billUrl: fileUrl,
        status: 'pending', // pending, approved, rejected
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await db.collection('deposits').insertOne(depositData);

      if (!result.acknowledged) {
        throw new Error('Không thể lưu thông tin hóa đơn');
      }
      
      // Trả về đường dẫn file
      return NextResponse.json({
        success: true,
        message: 'Đã tải lên hóa đơn nạp tiền thành công',
        url: fileUrl,
        depositId: result.insertedId.toString()
      }, { status: 200 });
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }

  } catch (error) {
    console.error('Error uploading deposit bill:', error);
    return NextResponse.json({ 
      message: 'Đã xảy ra lỗi khi upload hóa đơn',
      error: (error as Error).message 
    }, { status: 500 });
  }
}
