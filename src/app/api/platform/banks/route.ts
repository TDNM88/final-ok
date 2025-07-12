import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';

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

    const tokenData = await verifyToken(token);
    if (!tokenData?.isValid) {
      return NextResponse.json({ 
        success: false, 
        message: 'Phiên đăng nhập hết hạn' 
      }, { status: 401 });
    }

    // Kết nối đến MongoDB
    const client = await clientPromise;
    const db = client.db();

    // Lấy thông tin ngân hàng của nền tảng từ collection platform_banks
    // Nếu không có collection này, sẽ trả về mảng rỗng
    const platformBanks = await db.collection('platform_banks').find({}).toArray();

    return NextResponse.json({
      success: true,
      banks: platformBanks.map(bank => ({
        bankName: bank.bankName,
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
