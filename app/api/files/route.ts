import { NextResponse } from "next/server"
import { ListObjectsV2Command } from "@aws-sdk/client-s3"

import { s3 } from "@/lib/s3"

export async function GET() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
    })

    const data = await s3.send(command)
    const files = data.Contents?.map((item) => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
    }))

    return NextResponse.json({ files })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to list files" }, { status: 500 })
  }
}
