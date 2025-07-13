import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
  try {
    // Lấy token từ header hoặc cookie
    let token = req.headers.get('authorization')?.split(' ')[1];
    
    // Nếu không có token trong header, thử lấy từ cookie
    if (!token) {
      const cookieHeader = req.headers.get('cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [name, value] = cookie.trim().split('=');
          acc[name] = value;
          return acc;
        }, {} as Record<string, string>);
        
        token = cookies['token'] || cookies['authToken'];
      }
    }
    
    // Nếu không có token trong localStorage, thử lấy từ cookie
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        message: 'Bạn cần đăng nhập' 
      }, { status: 401 });
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
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 });
    }

    // Kết nối đến MongoDB
    const db = await getMongoDb();

    // Lấy thông tin ngân hàng của nền tảng từ collection platform_banks
    // Nếu không có collection này, sẽ trả về mảng rỗng
    let platformBanks = await db.collection('platform_banks').find({}).toArray();
    
    // Nếu không có dữ liệu ngân hàng, thêm dữ liệu mẫu
    if (platformBanks.length === 0) {
      const sampleBank = {
        code: 'VCB',
        bankName: 'Vietcombank',
        accountNumber: '1234567890',
        accountHolder: 'NGUYEN VAN A',
        branch: 'Hà Nội',
        isActive: true
      };
      
      // Thêm dữ liệu mẫu vào database
      await db.collection('platform_banks').insertOne(sampleBank);
      platformBanks = [sampleBank];
    }

    return NextResponse.json({
      success: true,
      banks: platformBanks.map(bank => ({
        code: bank.code || bank.bankName,
        name: bank.bankName,
        accountNumber: bank.accountNumber,
        accountHolder: bank.accountHolder,
        branch: bank.branch || '',
        isActive: bank.isActive !== false // Mặc định là true nếu không có trường isActive
      })).filter(bank => bank.isActive) // Chỉ trả về các ngân hàng đang hoạt động
    });
  } catch (error) {
    console.error('Error fetching platform banks:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Có lỗi xảy ra khi lấy thông tin ngân hàng' 
    }, { status: 500 });
  }
}
