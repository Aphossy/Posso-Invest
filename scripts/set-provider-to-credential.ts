#!/usr/bin/env tsx
import { db } from "@/db"
import { account } from "@/db/schemas"
import { eq } from "drizzle-orm"

async function run(){
  try{
    console.log('Updating providerId credentials -> credential')
    const res = await db.update(account).set({providerId:'credential'}).where(eq(account.providerId,'credentials')).returning()
    console.log('Updated', res.length)
    res.forEach((r:any)=>console.log(r.id, r.providerId))
    process.exit(0)
  }catch(e){
    console.error(e); process.exit(1)
  }
}
run()
