import { NextRequest, NextResponse } from 'next/server';
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
  console.log('Upload deposit bill API called');
  try {
    // Xác thực người dùng
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    
    if (!token) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    // Giải mã token để lấy thông tin người dùng
    let userId;
    
    try {
      // Nếu token là JWT (có dạng xxx.yyy.zzz)
      if (token.includes('.') && token.split('.').length === 3) {
        // Giải mã phần payload của JWT token (phần thứ 2)
        const base64Payload = token.split('.')[1];
        const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
        userId = payload.id || payload.userId || payload.sub;
      } 
      // Nếu token có dạng user_ID_timestamp
      else if (token.includes('_')) {
        const parts = token.split('_');
        if (parts.length > 1) {
          userId = parts[1]; 
        }
      }
      
      if (!userId) {
        console.error('Không thể xác định user ID từ token');
        return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 });
      }
      
      console.log('Xác thực thành công với userId:', userId);
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 });
    }

    // Xử lý form data
    console.log('Processing form data...');
    const formData = await req.formData();
    console.log('Form data keys:', Array.from(formData.keys()));
    const file = formData.get('file') as File;
    
    if (!file) {
      console.error('No file found in form data');
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
      console.log('File received:', file.name, 'Type:', file.type, 'Size:', file.size);
      
      // Tạo ID duy nhất cho file
      const fileId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      
      // Chuyển đổi file thành base64
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');
      
      // Tạo data URL
      const fileUrl = `data:${file.type};base64,${base64Data}`;
      console.log('Created data URL (truncated):', fileUrl.substring(0, 50) + '...');

      // Lấy kết nối MongoDB
      const db = await getMongoDb();
      if (!db) {
        throw new Error('Không thể kết nối đến cơ sở dữ liệu');
      }

      // Lưu thông tin bill vào collection deposits
      const depositData = {
        userId: new ObjectId(userId),
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
