import { Metadata } from "next"

import { MemberShareOutView } from "@/components/dashboard/share-out/member-share-out-view"

export const metadata: Metadata = {
  title: "My Share-out",
  description: "Your year-end distribution from the group fund.",
}

export default async function MemberShareOutPage() {
  return <MemberShareOutView />
}
