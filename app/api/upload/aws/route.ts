import { NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { s3 } from "@/lib/s3"

export async function POST(req: Request) {
  try {
    const { name, type } = await req.json()

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: name,
      ContentType: type,
    })

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 })

    return NextResponse.json({ uploadUrl })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to create upload URL" },
      { status: 500 }
    )
  }
}
