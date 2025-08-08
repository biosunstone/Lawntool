import NextAuth from 'next-auth'
import { authOptions } from '@/lib/saas/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }