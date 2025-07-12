import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

interface VerifyUserInfoRequest {
  userId: string;
  field: string;
  approved: boolean;
}

export async function POST(req: NextRequest) {
  try {
    // Verify admin token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyToken(token);
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const client = await clientPromise;
    const db = client.db();
    const adminUser = await db.collection('users').findOne({ 
      _id: new ObjectId(decoded.userId),
      role: 'admin'
    });

    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Get verification data from request
    const data: VerifyUserInfoRequest = await req.json();
    const { userId, field, approved } = data;

    if (!userId || !field) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update user verification status
    let updateQuery: any = {};
    
    // Handle different field types
    if (field === 'bankInfo') {
      // Update bank info verification status
      updateQuery = {
        $set: {
          'bankInfo.verified': approved,
          'bankInfo.pendingVerification': false,
          'bankInfo.verifiedAt': approved ? new Date() : null,
          'bankInfo.verifiedBy': approved ? decoded.userId : null
        }
      };
    } else {
      // Update other verifiable fields
      updateQuery = {
        $set: {
          [`verifiableInfo.${field}.verified`]: approved,
          [`verifiableInfo.${field}.pendingVerification`]: false,
          [`verifiableInfo.${field}.verifiedAt`]: approved ? new Date() : null,
          [`verifiableInfo.${field}.verifiedBy`]: approved ? decoded.userId : null
        }
      };
    }

    // Update the user document
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      updateQuery
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Log the verification action
    await db.collection('verificationLogs').insertOne({
      userId: new ObjectId(userId),
      adminId: new ObjectId(decoded.userId),
      field,
      approved,
      timestamp: new Date()
    });

    return NextResponse.json({
      success: true,
      message: `User ${field} verification status updated successfully`,
      approved
    });
  } catch (error) {
    console.error('Error verifying user info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
