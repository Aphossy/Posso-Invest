"use client"

import * as React from "react"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ResponsiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  /** Extra class applied to the DialogContent on desktop */
  className?: string
  contentProps?: React.ComponentPropsWithoutRef<typeof DialogContent>
  drawerContentProps?: React.ComponentPropsWithoutRef<typeof DrawerContent>
}

/**
 * Renders a Dialog on md+ screens and a bottom Drawer on mobile.
 * Usage mirrors shadcn Dialog - wrap your form body in `children` and
 * pass action buttons in `footer`.
 */
export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className = "sm:max-w-lg",
  contentProps,
  drawerContentProps,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
        <DrawerContent {...drawerContentProps}>
          <DrawerHeader className="text-left px-4 pt-4 pb-2">
            <DrawerTitle>{title}</DrawerTitle>
            {description && (
              <DrawerDescription>{description}</DrawerDescription>
            )}
          </DrawerHeader>
          <ScrollArea className="overflow-y-auto px-4 pb-2 max-h-[60vh]">
            {children}
          </ScrollArea>
          {footer && (
            <DrawerFooter className="pt-2 border-t gap-2">
              <DrawerClose asChild>
                <span className="hidden" />
              </DrawerClose>
              {footer}
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className} {...contentProps}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
