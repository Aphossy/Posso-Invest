import { NextResponse } from "next/server"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"

import { s3 } from "@/lib/s3"

export async function POST(req: Request) {
  try {
    const { key } = await req.json()

    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
    })

    await s3.send(command)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    )
  }
}
