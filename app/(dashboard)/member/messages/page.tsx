import UserMessagesPage from "@/components/dashboard/messages/user-messages-page"

export const metadata = {
  title: "My Messages",
  description: "View and manage your messages",
}

export default function Page() {
  return (
    <>
      <UserMessagesPage />
    </>
  )
}
