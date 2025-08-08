import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import User from '@/models/User'

// POST /api/admin/users/bulk - Bulk operations on users
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userIds, action, data } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'User IDs are required' },
        { status: 400 }
      )
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    await connectDB()

    // Prevent admin from modifying themselves in bulk operations
    const currentUserId = (session.user as any).id
    const filteredUserIds = userIds.filter(id => id !== currentUserId)

    let result
    switch (action) {
      case 'activate':
        result = await User.updateMany(
          { _id: { $in: filteredUserIds } },
          { status: 'active' }
        )
        break

      case 'suspend':
        result = await User.updateMany(
          { _id: { $in: filteredUserIds } },
          { status: 'suspended' }
        )
        break

      case 'delete':
        result = await User.updateMany(
          { _id: { $in: filteredUserIds } },
          { status: 'deleted' }
        )
        break

      case 'changeRole':
        if (!data?.role) {
          return NextResponse.json(
            { error: 'Role is required for changeRole action' },
            { status: 400 }
          )
        }
        result = await User.updateMany(
          { _id: { $in: filteredUserIds } },
          { role: data.role }
        )
        break

      case 'assignBusiness':
        if (!data?.businessId) {
          return NextResponse.json(
            { error: 'Business ID is required for assignBusiness action' },
            { status: 400 }
          )
        }
        result = await User.updateMany(
          { _id: { $in: filteredUserIds } },
          { businessId: data.businessId }
        )
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      message: `Bulk ${action} completed successfully`,
      affected: result.modifiedCount,
      skipped: userIds.length - filteredUserIds.length
    })
  } catch (error: any) {
    console.error('Error in bulk operation:', error)
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    )
  }
}

// GET /api/admin/users/bulk/export - Export users to CSV
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'

    // Build query from filters
    const query: any = {}
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    
    if (role) query.role = role
    if (status) query.status = status

    const users = await User.find(query)
      .select('name email role status createdAt lastLogin loginCount')
      .populate('businessId', 'name')
      .lean()

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Name', 'Email', 'Role', 'Status', 'Business', 'Created At', 'Last Login', 'Login Count']
      const rows = users.map(user => [
        user.name,
        user.email,
        user.role,
        user.status,
        (user.businessId as any)?.name || '',
        new Date(user.createdAt).toISOString(),
        user.lastLogin ? new Date(user.lastLogin).toISOString() : '',
        user.loginCount || 0
      ])

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="users-${Date.now()}.csv"`
        }
      })
    } else {
      // Return JSON
      return NextResponse.json({ users })
    }
  } catch (error: any) {
    console.error('Error exporting users:', error)
    return NextResponse.json(
      { error: 'Failed to export users' },
      { status: 500 }
    )
  }
}