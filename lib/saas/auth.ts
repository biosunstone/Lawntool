import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { MongoDBAdapter } from '@next-auth/mongodb-adapter'
import clientPromise from './mongodb-client'
import connectDB from './db'
import User from '@/models/User'
import Business from '@/models/Business'
import Subscription from '@/models/Subscription'
import { IUser } from '@/types/saas'

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        await connectDB()
        
        const user = await User.findOne({ email: credentials.email }).select('+password')
        
        if (!user || !user.password) {
          throw new Error('Invalid credentials')
        }

        const isPasswordValid = await user.comparePassword(credentials.password)
        
        if (!isPasswordValid) {
          throw new Error('Invalid credentials')
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          businessId: user.businessId?.toString(),
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Initial sign in
        token.id = user.id
        token.email = user.email
        token.role = (user as any).role
        token.businessId = (user as any).businessId
      }
      
      // Handle update trigger (when session is manually updated)
      if (trigger === 'update') {
        // Fetch latest user data when updating
        try {
          await connectDB()
          const currentUser:any = await User.findById(token.id as string).select('role businessId').lean()
          
          if (currentUser) {
            token.role = currentUser.role
            token.businessId = currentUser.businessId?.toString() || null
          }
        } catch (error) {
          console.error('Error updating token:', error)
        }
        
        // Merge with session updates if provided
        if (session) {
          return { ...token, ...session }
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        // Add user data to session from token
        (session.user as any).id = token.id || token.sub;
        (session.user as any).email = token.email || session.user.email;
        (session.user as any).role = token.role || 'customer';
        (session.user as any).businessId = token.businessId || null;
        
        // Only fetch from DB if we need to refresh (e.g., after business switch)
        // This is now handled by the update trigger instead of every session check
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export async function getUserWithBusiness(userId: string) {
  await connectDB()
  
  const user = await User.findById(userId)
  if (!user) return null
  
  let business = null
  let subscription = null
  
  if (user.businessId) {
    business = await Business.findById(user.businessId)
    subscription = await Subscription.findOne({ businessId: user.businessId })
  }
  
  return {
    user,
    business,
    subscription
  }
}