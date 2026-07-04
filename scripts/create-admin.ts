#!/usr/bin/env tsx
/**
 * Script to create the initial administrator account
 * Usage: bun scripts/create-admin.ts
 * 
 * Uses Argon2 for password hashing (same as Better Auth default)
 */

import * as crypto from "crypto"
import { db } from "@/db"
import { account, user, organization, member, session as sessionTable } from "@/db/schemas"
import { and, eq } from "drizzle-orm"
import { hash } from "argon2"
import { organisationName } from "@/constants/organisation"

// Password requirements based on auth-validators.ts:
// - Minimum 8 characters, maximum 16 characters
// - At least one uppercase letter (A-Z)
// - At least one lowercase letter (a-z)
// - At least one number (0-9)
// - At least one special character (non-alphanumeric)

/**
 * Generate a secure password that meets the requirements
 */
function generateSecurePassword(): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const lowercase = "abcdefghijklmnopqrstuvwxyz"
  const numbers = "0123456789"
  const special = "!@#$%^&*_-+="

  // Ensure we have at least one of each required character type
  let password =
    uppercase[Math.floor(Math.random() * uppercase.length)] +
    lowercase[Math.floor(Math.random() * lowercase.length)] +
    numbers[Math.floor(Math.random() * numbers.length)] +
    special[Math.floor(Math.random() * special.length)]

  // Fill the rest with a mix of all character types
  const allChars = uppercase + lowercase + numbers + special
  for (let i = password.length; i < 14; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("")
}

/**
 * Validate password meets all requirements
 */
function validatePassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) errors.push("Password must be at least 8 characters")
  if (password.length > 16)
    errors.push("Password must be at most 16 characters")
  if (!/[A-Z]/.test(password))
    errors.push("Password must contain an uppercase letter")
  if (!/[a-z]/.test(password))
    errors.push("Password must contain a lowercase letter")
  if (!/\d/.test(password)) errors.push("Password must contain a number")
  if (!/[^a-zA-Z0-9]/.test(password))
    errors.push("Password must contain a special character")

  return { valid: errors.length === 0, errors }
}

/**
 * Create the admin account
 */
async function createAdminAccount() {
  const adminDetails = {
    fullName: "Aphrodis Hakuzweyezu",
    email: "hakuzweaphossy@gmail.com",
    username: "Aphrodis Hakuzweyezu",
  }

  try {
    console.log("🔑 Creating initial administrator account...")
    console.log(`📧 Email: ${adminDetails.email}`)

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, adminDetails.email))
      .limit(1)

    if (existingUser.length > 0) {
      const existingAdmin = existingUser[0]
      console.log("⚠️  Found existing user with this email.")
      console.log(`   User ID: ${existingAdmin.id}`)
      console.log(`   Name: ${existingAdmin.name}`)
      console.log(`   Role: ${existingAdmin.role}`)
      console.log("\n🔄 Deleting existing user to recreate with correct password hash...")

      // Delete the user (this will cascade delete account records)
      await db.delete(user).where(eq(user.id, existingAdmin.id))
      console.log("✅ Deleted existing user")
    }

    // Generate a secure password
    const generatedPassword = generateSecurePassword()
    const validation = validatePassword(generatedPassword)

    if (!validation.valid) {
      console.error("❌ Generated password failed validation:")
      validation.errors.forEach((error) => console.error(`   - ${error}`))
      process.exit(1)
    }

    console.log("✅ Generated secure password that meets all requirements")
    console.log(`   - Length: ${generatedPassword.length} characters`)
    console.log(`   - Contains uppercase: ${/[A-Z]/.test(generatedPassword)}`)
    console.log(`   - Contains lowercase: ${/[a-z]/.test(generatedPassword)}`)
    console.log(`   - Contains number: ${/\d/.test(generatedPassword)}`)
    console.log(`   - Contains special char: ${/[^a-zA-Z0-9]/.test(generatedPassword)}`)
    console.log("\n🔐 Hashing password with Argon2 (same algorithm as Better Auth)...")

    // Hash the password using Argon2 (same as Better Auth default)
    const hashedPassword = await hash(generatedPassword, {
      memoryCost: 19456, // 19 MB
      timeCost: 2,
      parallelism: 1,
    })

    // Create user record with a UUID
    const userId = crypto.randomUUID()

    const newUser = await db
      .insert(user)
      .values({
        id: userId,
        name: adminDetails.fullName,
        email: adminDetails.email,
        emailVerified: true, // Verify email immediately for admin
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    console.log("✅ User record created")

    // Create account record with password
    const accountId = crypto.randomUUID()

    await db
      .insert(account)
      .values({
        id: accountId,
        userId: userId,
        accountId: crypto.randomUUID(),
        providerId: "credential",
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    console.log("✅ Account record created with hashed password")

    // Create a default organization for the admin and add as member
    try {
      const orgId = crypto.randomUUID()
      const slug = `${organisationName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")}`

      await db.insert(organization).values({
        id: orgId,
        name: organisationName,
        slug,
        logo: null,
        createdAt: new Date(),
        metadata: JSON.stringify({ type: "ikimina" }),
      })

      console.log(`✅ Organization created: ${slug} (${orgId})`)

      // Add admin as member with admin role
      await db.insert(member).values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        userId: userId,
        role: "admin",
        createdAt: new Date(),
      })

      console.log("✅ Admin added as organization member")

      // Update any existing sessions for this user to set active organization
      await db.update(sessionTable).set({ activeOrganizationId: orgId }).where(eq(sessionTable.userId, userId))
      console.log("✅ Updated session activeOrganizationId for admin (if any)")
    } catch (err) {
      console.error("⚠️ Failed to create default organization/member:", err)
    }

    // Display the results
    console.log("\n" + "=".repeat(60))
    console.log("🎉 Administrator Account Created Successfully!")
    console.log("=".repeat(60))
    console.log("\nAccount Details:")
    console.log(`  Full Name:       ${adminDetails.fullName}`)
    console.log(`  Email:           ${adminDetails.email}`)
    console.log(`  Role:            Admin`)
    console.log(`  Email Verified:  Yes`)
    console.log("\nLogin Credentials:")
    console.log(`  Email:    ${adminDetails.email}`)
    console.log(`  Password: ${generatedPassword}`)
    console.log("\n⚠️  IMPORTANT:")
    console.log(
      "  - Save the password above in a secure location (password manager)"
    ),
      console.log(
        "  - You can change this password after your first login"
      )
    console.log(
      "  - Do NOT share this password with anyone else initially"
    )
    console.log("\n✅ You can now log in at /auth/signin")
    console.log("=".repeat(60) + "\n")

    process.exit(0)
  } catch (error) {
    console.error("❌ Error creating admin account:", error)
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
    }
    process.exit(1)
  }
}

// Run the function
createAdminAccount()
