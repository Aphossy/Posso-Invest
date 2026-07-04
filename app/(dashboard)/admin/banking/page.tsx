import { Metadata } from "next"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Banking",
  description: "Banking page for Posso Ventures.",
}

export default function BankingPage() {
  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Banking</h1>
        <p className="text-sm text-muted-foreground">
          Banking page for Posso Ventures.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Banking Content
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Content for this section will appear here.
        </CardContent>
      </Card>
    </div>
  )
}
