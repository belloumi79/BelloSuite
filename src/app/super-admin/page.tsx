import { getSuperAdminStats } from './actions'
import { redirect } from 'next/navigation'
import SuperAdminDashboardClient from './SuperAdminDashboardClient'

export const dynamic = 'force-dynamic'

export default async function SuperAdminDashboard() {
  let data
  try {
    data = await getSuperAdminStats()
  } catch (e) {
    console.error('Error fetching super admin stats:', e)
    redirect('/login')
  }

  const { stats, tenants, modules, recentUsers } = data

  return (
    <SuperAdminDashboardClient 
      stats={stats} 
      initialTenants={tenants} 
      initialUsers={recentUsers} 
      modules={modules} 
    />
  )
}
