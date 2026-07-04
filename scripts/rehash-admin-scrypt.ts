#!/usr/bin/env tsx
import { db } from '@/db'
import { user, account } from '@/db/schemas'
import { eq } from 'drizzle-orm'
import { randomBytes, scrypt as _scrypt } from 'node:crypto'

const config = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64,
}

function generateKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    _scrypt(
      password.normalize('NFKC'),
      salt,
      config.dkLen,
      {
        N: config.N,
        r: config.r,
        p: config.p,
        maxmem: 128 * config.N * config.r * 2,
      } as any,
      (err, key) => {
        if (err) reject(err)
        else resolve(key)
      }
    )
  })
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const key = await generateKey(password, salt)
  return `${salt}:${key.toString('hex')}`
}

async function run(){
  const email = 'hakuzweaphossy@gmail.com'
  const plaintext = 'HzHk^sUp29UM^t'
  try{
    const users = await db.select().from(user).where(eq(user.email,email))
    if(users.length===0){ console.error('User not found'); process.exit(1)}
    const u = users[0]
    const accounts = await db.select().from(account).where(eq(account.userId,u.id))
    if(accounts.length===0){ console.error('No accounts found for user'); process.exit(1)}
    const a = accounts[0]
    console.log('Existing password:', a.password?.slice(0,60))
    const newHash = await hashPassword(plaintext)
    console.log('New scrypt hash preview:', newHash.slice(0,60))
    const res = await db.update(account).set({password:newHash}).where(eq(account.id,a.id)).returning()
    console.log('Updated account password for', res[0].id)
    process.exit(0)
  }catch(e){ console.error(e); process.exit(1)}
}
run()
