import React from 'react'
import Header from '../../components/Header'
import { redirect } from 'next/navigation'
import { auth, currentUser } from '@clerk/nextjs/server'

const Layout = async ({ children } : { children : React.ReactNode }) => {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const userData = await currentUser();
  const email = userData?.emailAddresses?.[0]?.emailAddress ?? '';
  const fallbackName = email ? email.split('@')[0] : 'User';

  const user = {
    id: userId,
    name: userData?.fullName ?? userData?.firstName ?? fallbackName,
    email,
  }
  

  return (
    <main className='min-h-screen text-gray-400'>
      {/* Header */}
      <Header user={user} />
      <div className="container py-10">
        {children}
      </div>
    </main>
  )
}

export default Layout