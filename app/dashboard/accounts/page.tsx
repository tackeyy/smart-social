import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AccountsClient } from './AccountsClient'
import type { XAccount } from '@/types/app'

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: accounts } = await supabase
    .from('x_accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const xAccounts = (accounts ?? []) as XAccount[]

  return <AccountsClient accounts={xAccounts} />
}
