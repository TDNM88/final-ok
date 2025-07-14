import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { hash, compare } from 'bcryptjs';
import { getMongoDb } from '@/lib/db';

// Tạo một Map đơn giản để theo dõi các yêu cầu đổi mật khẩu
const rateLimitMap = new Map<string, { count: number, timestamp: number }>();

// Hàm kiểm tra giới hạn tỷ lệ request
const checkRateLimit = (key: string, limit: number, interval: number): boolean => {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record) {
    rateLimitMap.set(key, { count: 1, timestamp: now });
    return true;
  }
  
  if (now - record.timestamp > interval) {
    // Reset nếu đã quá khoảng thời gian
    rateLimitMap.set(key, { count: 1, timestamp: now });
    return true;
  }
  
  if (record.count >= limit) {
    return false; // Vượt quá giới hạn
  }
  
  // Tăng bộ đếm
  record.count += 1;
  rateLimitMap.set(key, record);
  return true;
};

// Xóa các bản ghi cũ mỗi giờ
setInterval(() => {
  const now = Date.now();
  // Sử dụng Array.from để tương thích với các phiên bản TypeScript cũ hơn
  Array.from(rateLimitMap.keys()).forEach(key => {
    const record = rateLimitMap.get(key);
    if (record && now - record.timestamp > 3600000) { // 1 giờ
      rateLimitMap.delete(key);
    }
  });
}, 3600000); // Kiểm tra mỗi giờ

export async function POST(req: NextRequest) {
  try {
    console.log('API đổi mật khẩu: Bắt đầu xử lý request');
    
    // Lấy IP để giới hạn tỷ lệ request
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    console.log('IP của request:', ip);
    
    // Kiểm tra giới hạn tỷ lệ request: 5 lần/phút
    const isWithinLimit = checkRateLimit(`change-password-${ip}`, 5, 60000);
    if (!isWithinLimit) {
      console.log('Request bị từ chối do vượt quá giới hạn tỷ lệ');
      return NextResponse.json(
        { success: false, message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' },
        { status: 429 }
      );
    }
    
    // Lấy token từ header Authorization hoặc cookie
    let token = req.headers.get('authorization')?.split(' ')[1];
    console.log('Token từ header Authorization:', token ? `${token.substring(0, 10)}...` : 'không có');
    
    // Nếu không có token trong header, thử lấy từ cookie
    if (!token) {
      const cookieHeader = req.headers.get('cookie');
      if (cookieHeader) {
        console.log('Cookie header:', cookieHeader);
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [name, value] = cookie.trim().split('=');
          acc[name] = value;
          return acc;
        }, {} as Record<string, string>);
        
        token = cookies['token'] || cookies['authToken'];
        console.log('Token từ cookie:', token ? `${token.substring(0, 10)}...` : 'không có');
      }
    }
    
    if (!token) {
      console.log('Không tìm thấy token trong request');
      return NextResponse.json({ success: false, message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    // Sử dụng hàm verifyToken từ lib/auth để xác thực token
    console.log('Bắt đầu xác thực token...');
    let verifyResult;
    try {
      verifyResult = await verifyToken(token);
      console.log('Kết quả xác thực token:', verifyResult);
    } catch (verifyError) {
      console.error('Lỗi khi xác thực token:', verifyError);
      return NextResponse.json({ 
        success: false, 
        message: 'Lỗi xác thực phiên đăng nhập', 
        error: verifyError instanceof Error ? verifyError.message : 'Unknown error' 
      }, { status: 401 });
    }
    
    const { userId, isValid } = verifyResult;
    
    if (!isValid || !userId) {
      console.error('Token không hợp lệ hoặc không thể xác định user ID:', { isValid, userId });
      return NextResponse.json({ 
        success: false, 
        message: 'Phiên đăng nhập hết hạn hoặc không hợp lệ' 
      }, { status: 401 });
    }
    
    console.log('Đổi mật khẩu: Xác thực thành công với userId:', userId);

    // Đọc dữ liệu từ request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body:', { 
        hasCurrentPassword: !!requestBody.currentPassword,
        hasNewPassword: !!requestBody.newPassword,
        hasConfirmPassword: !!requestBody.confirmPassword
      });
    } catch (jsonError) {
      console.error('Lỗi khi đọc JSON từ request body:', jsonError);
      return NextResponse.json(
        { success: false, message: 'Dữ liệu gửi lên không hợp lệ' },
        { status: 400 }
      );
    }
    
    const { currentPassword, newPassword, confirmPassword } = requestBody;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      console.log('Thiếu trường dữ liệu bắt buộc');
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' },
        { status: 400 }
      );
    }
    
    // Kiểm tra mật khẩu mới và xác nhận mật khẩu nếu có gửi confirmPassword
    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Mật khẩu mới và xác nhận mật khẩu không khớp' },
        { status: 400 }
      );
    }

    // Kiểm tra độ mạnh của mật khẩu
    if (newPassword.length < 8) {
      console.log('Mật khẩu quá ngắn');
      return NextResponse.json(
        { success: false, message: 'Mật khẩu phải có ít nhất 8 ký tự' },
        { status: 400 }
      );
    }
    
    // Kiểm tra mật khẩu có chứa ít nhất một chữ cái và một số
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).+$/;
    if (!passwordRegex.test(newPassword)) {
      console.log('Mật khẩu không đủ mạnh');
      return NextResponse.json(
        { success: false, message: 'Mật khẩu phải chứa ít nhất một chữ cái và một số' },
        { status: 400 }
      );
    }

    // Kết nối database
    console.log('Kết nối tới database...');
    let db;
    try {
      db = await getMongoDb();
      console.log('Kết nối database thành công');
    } catch (dbError) {
      console.error('Lỗi khi kết nối database:', dbError);
      return NextResponse.json(
        { success: false, message: 'Lỗi kết nối cơ sở dữ liệu' },
        { status: 500 }
      );
    }

    // Lấy thông tin người dùng với mật khẩu đã hash
    console.log('Tìm kiếm thông tin người dùng với userId:', userId);
    let userData;
    try {
      // Kiểm tra xem userId có đúng định dạng ObjectId không
      let userObjectId;
      try {
        userObjectId = new ObjectId(userId);
        console.log('Chuyển đổi userId thành ObjectId thành công:', userObjectId.toString());
        
        // Tìm kiếm với ObjectId
        userData = await db.collection('users').findOne({
          _id: userObjectId
        });
      } catch (objectIdError) {
        console.error('Lỗi khi chuyển đổi userId thành ObjectId:', objectIdError);
        // Thử tìm kiếm bằng userId dạng string
        console.log('Thử tìm kiếm với userId dạng string');
        userData = await db.collection('users').findOne({ id: userId });
      }
      
      console.log('Kết quả tìm kiếm người dùng:', userData ? 'Tìm thấy' : 'Không tìm thấy');
      
      if (!userData) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy thông tin người dùng' },
          { status: 404 }
        );
      }
    } catch (findError) {
      console.error('Lỗi khi tìm kiếm người dùng:', findError);
      return NextResponse.json(
        { success: false, message: 'Lỗi khi tìm kiếm thông tin người dùng' },
        { status: 500 }
      );
    }

    if (!userData) {
      console.log('Không tìm thấy thông tin người dùng với userId:', userId);
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    // Xác thực mật khẩu hiện tại
    console.log('Xác thực mật khẩu hiện tại...');
    let isPasswordValid;
    try {
      isPasswordValid = await compare(currentPassword, userData.password);
      console.log('Kết quả xác thực mật khẩu hiện tại:', isPasswordValid ? 'Hợp lệ' : 'Không hợp lệ');
    } catch (compareError) {
      console.error('Lỗi khi xác thực mật khẩu hiện tại:', compareError);
      return NextResponse.json(
        { success: false, message: 'Lỗi khi xác thực mật khẩu' },
        { status: 500 }
      );
    }
    
    if (!isPasswordValid) {
      console.log('Mật khẩu hiện tại không đúng');
      return NextResponse.json(
        { success: false, message: 'Mật khẩu hiện tại không đúng' },
        { status: 400 }
      );
    }
    
    // Kiểm tra mật khẩu mới không được trùng với mật khẩu cũ
    console.log('Kiểm tra mật khẩu mới có trùng với mật khẩu cũ không...');
    let isSameAsOld;
    try {
      isSameAsOld = await compare(newPassword, userData.password);
      console.log('Mật khẩu mới' + (isSameAsOld ? ' trùng' : ' không trùng') + ' với mật khẩu cũ');
    } catch (compareError) {
      console.error('Lỗi khi so sánh mật khẩu mới với mật khẩu cũ:', compareError);
      return NextResponse.json(
        { success: false, message: 'Lỗi khi xử lý mật khẩu' },
        { status: 500 }
      );
    }
    
    if (isSameAsOld) {
      return NextResponse.json(
        { success: false, message: 'Mật khẩu mới không được trùng với mật khẩu cũ' },
        { status: 400 }
      );
    }

    // Hash mật khẩu mới
    console.log('Hash mật khẩu mới...');
    let hashedPassword;
    try {
      hashedPassword = await hash(newPassword, 12);
      console.log('Hash mật khẩu thành công');
    } catch (hashError) {
      console.error('Lỗi khi hash mật khẩu mới:', hashError);
      return NextResponse.json(
        { success: false, message: 'Lỗi khi xử lý mật khẩu mới' },
        { status: 500 }
      );
    }

    // Cập nhật mật khẩu trong database
    console.log('Cập nhật mật khẩu trong database...');
    let result;
    try {
      // Sử dụng cùng cách tìm kiếm như đã sử dụng ở trên
      // Nếu userData có _id, sử dụng _id để cập nhật
      // Nếu không, sử dụng id
      let query = {};
      
      if (userData._id) {
        console.log('Sử dụng _id để cập nhật:', userData._id);
        query = { _id: userData._id };
      } else if (userData.id) {
        console.log('Sử dụng id để cập nhật:', userData.id);
        query = { id: userData.id };
      } else {
        console.error('Không tìm thấy trường id hoặc _id trong userData');
        return NextResponse.json(
          { success: false, message: 'Lỗi khi xác định người dùng để cập nhật' },
          { status: 500 }
        );
      }
      
      result = await db.collection('users').updateOne(
        query,
        {
          $set: {
            password: hashedPassword,
            updatedAt: new Date(),
            passwordChangedAt: new Date()
          }
        }
      );
      console.log('Kết quả cập nhật:', { modifiedCount: result.modifiedCount });
    } catch (updateError) {
      console.error('Lỗi khi cập nhật mật khẩu trong database:', updateError);
      return NextResponse.json(
        { success: false, message: 'Lỗi khi cập nhật mật khẩu trong hệ thống' },
        { status: 500 }
      );
    }

    if (result.modifiedCount === 0) {
      console.log('Không có bản ghi nào được cập nhật');
      return NextResponse.json(
        { success: false, message: 'Không thể cập nhật mật khẩu' },
        { status: 500 }
      );
    }

    // Ghi log hoạt động đổi mật khẩu
    console.log('Ghi log hoạt động đổi mật khẩu...');
    try {
      // Sử dụng userId từ userData để đảm bảo tính nhất quán
      const userIdForLog = userData._id ? userData._id.toString() : (userData.id || userId);
      
      await db.collection('user_activities').insertOne({
        userId: userIdForLog,
        action: 'change_password',
        timestamp: new Date(),
        ip: ip,
        userAgent: req.headers.get('user-agent') || 'unknown',
        success: true
      });
      console.log('Ghi log thành công với userId:', userIdForLog);
    } catch (logError) {
      // Chỉ ghi log lỗi, không trả về lỗi cho người dùng vì đổi mật khẩu đã thành công
      console.error('Lỗi khi ghi log hoạt động:', logError);
    }

    console.log('Đổi mật khẩu thành công cho userId:', userId);
    return NextResponse.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    console.error('Change password error:', error);
    // Ghi log chi tiết hơn về lỗi
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Có lỗi xảy ra khi đổi mật khẩu. Vui lòng thử lại sau.',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
