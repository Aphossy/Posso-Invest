interface MemberAvatarProps {
  name?: string | null
  email?: string | null
  image?: string | null
  size: "sm" | "md"
}

export function MemberAvatar({ name, email, image, size }: MemberAvatarProps) {
  const sizeClass = size === "sm" ? "h-6 w-6 text-xs" : "h-7 w-7 text-xs"
  const displayName = name ?? email ?? "?"
  const initials = displayName[0].toUpperCase()

  if (image) {
    return (
      <img
        src={image}
        alt={displayName}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary`}>
      {initials}
    </div>
  )
}
