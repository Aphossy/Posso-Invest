import { Metadata } from "next"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Team",
  description: "Team page for TrustLink Group.",
}

export default function TeamPage() {
  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-sm text-muted-foreground">
          Team page for TrustLink Group.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Team Content
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Content for this section will appear here.
        </CardContent>
      </Card>
    </div>
  )
}
