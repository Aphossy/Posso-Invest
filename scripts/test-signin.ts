#!/usr/bin/env tsx
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

async function run(){
  try{
    const res = await auth.api.signInEmail({ body: { email: 'hakuzweaphossy@gmail.com', password: 'e%d3iGOUe6aax%', rememberMe: false }, headers: new Map() as any })
    console.log('signin result:', res)
  }catch(e:any){
    console.error('signin error:', e?.message || e)
    if(e?.body) console.error('body:', e.body)
    if(e?.stack) console.error(e.stack)
  }
}
run()
