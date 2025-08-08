import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import User from '@/models/User'
import Business from '@/models/Business'
import BusinessMembership from '@/models/BusinessMembership'

// GET /api/admin/users - List all users with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check if user is admin
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1

    // Build query
    const query: any = {}
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }
    
    if (role) {
      query.role = role
    }
    
    if (status) {
      query.status = status
    }

    // Execute query with pagination
    const skip = (page - 1) * limit
    const total = await User.countDocuments(query)
    
    const users = await User.find(query)
      .select('-password')
      .populate('businessId', 'name')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean()

    // Get additional stats
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          suspendedUsers: {
            $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] }
          },
          adminCount: {
            $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
          },
          businessOwnerCount: {
            $sum: { $cond: [{ $eq: ['$role', 'business_owner'] }, 1, 0] }
          },
          staffCount: {
            $sum: { $cond: [{ $eq: ['$role', 'staff'] }, 1, 0] }
          },
          customerCount: {
            $sum: { $cond: [{ $eq: ['$role', 'customer'] }, 1, 0] }
          }
        }
      }
    ])

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: stats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        suspendedUsers: 0,
        adminCount: 0,
        businessOwnerCount: 0,
        staffCount: 0,
        customerCount: 0
      }
    })
  } catch (error: any) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST /api/admin/users - Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, password, role, businessId, status, sendWelcomeEmail } = body

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Name, email, password, and role are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Validate role-specific requirements
    if ((role === 'business_owner' || role === 'staff') && !businessId) {
      return NextResponse.json(
        { error: 'Business is required for business_owner and staff roles' },
        { status: 400 }
      )
    }

    await connectDB()

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Validate business exists if provided
    if (businessId) {
      const business = await Business.findById(businessId)
      if (!business) {
        return NextResponse.json(
          { error: 'Invalid business ID' },
          { status: 400 }
        )
      }
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role,
      businessId: businessId || undefined,
      status: status || 'active',
      emailVerified: new Date(), // Mark as verified since admin created
      metadata: {
        registrationSource: 'admin',
        createdBy: (session.user as any).id,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
        userAgent: request.headers.get('user-agent') || ''
      }
    })

    // Create BusinessMembership if business is assigned
    if (businessId) {
      await BusinessMembership.create({
        userId: user._id,
        businessId: businessId,
        role: role,
        invitedBy: (session.user as any).id,
        isPrimary: true,
        status: 'active'
      })

      // Add user to business team members
      await Business.findByIdAndUpdate(
        businessId,
        { $addToSet: { teamMembers: user._id } }
      )
    }

    // TODO: Send welcome email if requested
    if (sendWelcomeEmail) {
      // Implement email sending logic here
      console.log('Welcome email would be sent to:', email)
    }

    // Remove password from response
    const userResponse = user.toObject()
    delete userResponse.password

    return NextResponse.json({
      message: 'User created successfully',
      user: userResponse
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    )
  }
}