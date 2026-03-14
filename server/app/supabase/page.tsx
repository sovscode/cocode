import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const supabase = createClient(await cookies())

  const { data: sessions } = await supabase.from('Session').select("*")
  console.log("Data: ")
  if (sessions) {
    console.log(sessions.map(session => session.code))
  }

  return (
    <ul>
      {sessions?.map((todo) => (
        <li>{JSON.stringify(todo)}</li>
      ))}
    </ul>
  )
}

