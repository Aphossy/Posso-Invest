"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Key,
  LogOut,
  Shield,
  Smartphone,
  Trash2,
  UserX,
  X,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { authClient } from "@/lib/auth-client"
import { passwordFormSchema } from "@/lib/validators/auth-validators"
import type { UserSettings } from "@/hooks/use-settings"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import "@/components/ui/dialog"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Switch } from "@/components/ui/switch"

import AccountLinkingPage from "../auth/account-linking/page"
import { Loader } from "../common/loader"

interface SecuritySettingsProps {
  settings: UserSettings
  onUpdateSettings: (
    updates: any
  ) => Promise<{ success: boolean; requiresVerification?: boolean }>
  updating: boolean
}

export function SecuritySettings({
  settings,
  onUpdateSettings,
  updating,
}: SecuritySettingsProps) {
  const router = useRouter()
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    settings.twoFactorEnabled
  )
  const [hasCredential, setHasCredential] = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])

  // 2FA Dialog States
  const [showEnableDialog, setShowEnableDialog] = useState(false)
  const [showDisableDialog, setShowDisableDialog] = useState(false)
  const [showBackupCodesDialog, setShowBackupCodesDialog] = useState(false)
  const [twoFactorPassword, setTwoFactorPassword] = useState("")
  const [showTwoFactorPassword, setShowTwoFactorPassword] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Delete Account Dialog States
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [showDeletePassword, setShowDeletePassword] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Check if user has credential account
  useEffect(() => {
    const checkCredentialAccount = async () => {
      try {
        setLoadingAccounts(true)
        const linkedAccounts = await authClient.listAccounts()
        if ("data" in linkedAccounts && Array.isArray(linkedAccounts.data)) {
          const linkedProviderIds = linkedAccounts.data.map(
            (acc: any) => acc.providerId
          )
          setHasCredential(linkedProviderIds.includes("credential"))
        }
      } catch (error) {
        console.error("Failed to fetch accounts:", error)
      } finally {
        setLoadingAccounts(false)
      }
    }
    checkCredentialAccount()
  }, [])

  const handlePasswordUpdate = async () => {
    // Validate using Zod schema
    try {
      passwordFormSchema.parse(passwordData)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0]
        toast.error(firstError.message)
        return
      }
    }

    try {
      const { error } = await authClient.changePassword({
        newPassword: passwordData.newPassword,
        currentPassword: passwordData.currentPassword,
      })

      if (error) {
        throw new Error(error.message)
      } else {
        toast.success("Password updated successfully")
      }

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      setPasswordErrors([])
    } catch (error: any) {
      console.error("Password update error:", error)
      toast.error(error.message || "Failed to update password")
    }
  }

  const handleTwoFactorToggle = async (enabled: boolean) => {
    if (enabled) {
      // Check if user has credential authentication before enabling 2FA
      if (!hasCredential) {
        toast.error("Password Authentication Required", {
          description:
            "You need to set up a password first before enabling 2FA. Please add password authentication in Account Security section below.",
          duration: 5000,
        })
        return
      }
      setShowEnableDialog(true)
    } else {
      setShowDisableDialog(true)
    }
  }

  const handleEnable2FA = async () => {
    if (!twoFactorPassword) {
      toast.error("Please enter your password")
      return
    }

    setIsProcessing(true)

    try {
      const { data, error } = await authClient.twoFactor.enable({
        password: twoFactorPassword,
        issuer: "TrustLink Group",
      })

      if (error) {
        toast.error(error.message || "Failed to enable 2FA")
        setIsProcessing(false)
        return
      }

      if (data?.backupCodes) {
        setBackupCodes(data.backupCodes)
        setShowEnableDialog(false)
        setShowBackupCodesDialog(true)
        setTwoFactorEnabled(true)
        await onUpdateSettings({
          twoFactorEnabled: true,
          twoFactorEnabledAt: new Date().toISOString(),
        })

        toast.success("Two-factor authentication enabled successfully!")
      }
    } catch (error: any) {
      console.error("Enable 2FA error:", error)
      toast.error("Failed to enable two-factor authentication")
      setIsProcessing(false)
    }
  }

  const handleDisable2FA = async () => {
    if (!twoFactorPassword) {
      toast.error("Please enter your password to confirm")
      return
    }

    setIsProcessing(true)

    try {
      const { error } = await authClient.twoFactor.disable({
        password: twoFactorPassword,
      })

      if (error) {
        toast.error(error.message || "Failed to disable 2FA")
        setIsProcessing(false)
        return
      }

      setTwoFactorEnabled(false)
      setShowDisableDialog(false)
      setTwoFactorPassword("")
      await onUpdateSettings({
        twoFactorEnabled: false,
        twoFactorDisabledAt: new Date().toISOString(),
      })
      toast.success("Two-factor authentication disabled successfully")
    } catch (error: any) {
      console.error("Disable 2FA error:", error)
      toast.error("Failed to disable two-factor authentication")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleLogoutAfterEnable = async () => {
    setShowBackupCodesDialog(false)
    toast.success("Logging out to apply 2FA settings...")

    setTimeout(async () => {
      await authClient.signOut()
      router.push("/login")
      router.refresh()
    }, 1500)
  }

  const copyBackupCodes = () => {
    const codesText = backupCodes.join("\n")
    navigator.clipboard.writeText(codesText)
    toast.success("Backup codes copied to clipboard!")
  }

  const downloadBackupCodes = () => {
    const codesText = backupCodes.join("\n")
    const blob = new Blob([codesText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "trustlink-group-2fa-backup-codes.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Backup codes downloaded!")
  }

  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return strength
  }

  const getStrengthColor = (strength: number) => {
    if (strength >= 4) return "bg-green-500"
    if (strength >= 3) return "bg-yellow-500"
    if (strength >= 2) return "bg-orange-500"
    return "bg-red-500"
  }

  const getStrengthText = (strength: number) => {
    if (strength >= 4) return "Strong"
    if (strength >= 3) return "Good"
    if (strength >= 2) return "Fair"
    return "Weak"
  }

  const passwordStrength = getPasswordStrength(passwordData.newPassword)

  // Real-time password validation
  useEffect(() => {
    if (passwordData.newPassword) {
      const errors: string[] = []
      if (passwordData.newPassword.length < 8) {
        errors.push("Password must be at least 8 characters")
      }
      if (passwordData.newPassword.length > 16) {
        errors.push("Password must be at most 16 characters")
      }
      if (!/[A-Z]/.test(passwordData.newPassword)) {
        errors.push("Password must contain an uppercase letter")
      }
      if (!/[a-z]/.test(passwordData.newPassword)) {
        errors.push("Password must contain a lowercase letter")
      }
      if (!/\d/.test(passwordData.newPassword)) {
        errors.push("Password must contain a number")
      }
      if (!/[^a-zA-Z0-9]/.test(passwordData.newPassword)) {
        errors.push("Password must contain a special character")
      }
      setPasswordErrors(errors)
    } else {
      setPasswordErrors([])
    }
  }, [passwordData.newPassword])

  const handleDeleteAccount = async () => {
    // Only require password if user has credential account
    if (hasCredential && !deletePassword) {
      toast.error("Please enter your password to confirm")
      return
    }

    setIsDeleting(true)

    try {
      // Delete user with password (if credential account) or just request deletion
      const deleteOptions: any = {
        callbackURL: "/", // Redirect to homepage after deletion
      }

      // Add password for credential accounts
      if (hasCredential && deletePassword) {
        deleteOptions.password = deletePassword
      }

      const { error } = await authClient.deleteUser(deleteOptions)

      if (error) {
        // Check if user needs to verify deletion via email (for OAuth users)
        if (
          error.message?.includes("verification") ||
          error.message?.includes("email")
        ) {
          toast.success(
            "Verification email sent! Please check your inbox to confirm account deletion.",
            { duration: 6000 }
          )
          setShowDeleteDialog(false)
          setDeletePassword("")
          setIsDeleting(false)
          return
        }

        toast.error(error.message || "Failed to delete account")
        setIsDeleting(false)
        return
      }

      toast.success(
        "Account delete request received. Please check your email for confirmation.",
        { duration: 6000 }
      )
      setShowDeleteDialog(false)
      setDeletePassword("")

      setTimeout(() => {
        router.push("/")
        router.refresh()
      }, 1500)
    } catch (error: any) {
      console.error("Delete account error:", error)
      toast.error(error.message || "Failed to delete account")
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Password Section - Only show if credential account exists */}
      {hasCredential && !loadingAccounts && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Password
            </CardTitle>
            <CardDescription>Change your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }))
                  }
                  disabled={updating}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  disabled={updating}>
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  disabled={updating}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={updating}>
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {passwordData.newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-gray-200">
                      <div
                        className={`h-2 rounded-full transition-all ${getStrengthColor(passwordStrength)}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {getStrengthText(passwordStrength)}
                    </span>
                  </div>
                  {passwordErrors.length > 0 ? (
                    <div className="space-y-1">
                      {passwordErrors.map((error, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs text-red-600">
                          <XCircle className="h-3 w-3" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Password meets all requirements</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                disabled={updating}
              />
              {passwordData.confirmPassword &&
                passwordData.newPassword !== passwordData.confirmPassword && (
                  <p className="text-sm text-red-600">Passwords do not match</p>
                )}
            </div>

            <Button onClick={handlePasswordUpdate} disabled={updating}>
              {updating ? (
                <Loader className="mr-2 h-4 w-4" />
              ) : (
                <Key className="mr-2 h-4 w-4" />
              )}
              {updating ? "Updating..." : "Update Password"}
            </Button>

            {settings.lastPasswordChange && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Last changed{" "}
                  {formatDistanceToNow(new Date(settings.lastPasswordChange), {
                    addSuffix: true,
                  })}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                {twoFactorEnabled && (
                  <Badge
                    variant="outline"
                    className="border-green-600 text-green-600">
                    <Check className="mr-1 h-3 w-3" />
                    Enabled
                  </Badge>
                )}
              </div>
            </div>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={handleTwoFactorToggle}
              disabled={updating}
            />
          </div>

          {!twoFactorEnabled && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Enable two-factor authentication to significantly improve your
                account security.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <AccountLinkingPage />

      {/* Delete Account Section */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <UserX className="h-5 w-5" />
            Delete Account
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            className="w-full sm:w-auto">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete My Account
          </Button>
        </CardContent>
      </Card>

      {/* Enable 2FA Dialog */}
      <ResponsiveModal
        open={showEnableDialog}
        onOpenChange={setShowEnableDialog}
        title={
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Enable Two-Factor Authentication
          </div>
        }
        description="Enhance your account security by enabling two-factor authentication. You'll need to enter a code sent to your email each time you log in."
        className="sm:max-w-125"
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowEnableDialog(false)
                setTwoFactorPassword("")
                setShowTwoFactorPassword(false)
              }}
              disabled={isProcessing}
              className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleEnable2FA}
              disabled={isProcessing || !twoFactorPassword}
              className="flex-1 bg-green-600 hover:bg-green-700">
              {isProcessing ? (
                <>
                  <Loader className="mr-2 h-4 w-4" />
                  Enabling...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Enable 2FA
                </>
              )}
            </Button>
          </div>
        }>
        <div className="space-y-4">
          <Alert className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <div>
              <AlertTitle>Important</AlertTitle>
              <AlertDescription className="text-sm">
                After enabling 2FA, you will be logged out and need to log in
                again with your new 2FA code. Make sure to save your backup
                codes safely.
              </AlertDescription>
            </div>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="2fa-password">Confirm Your Password</Label>
            <div className="relative">
              <Input
                id="2fa-password"
                type={showTwoFactorPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={twoFactorPassword}
                onChange={(e) => setTwoFactorPassword(e.target.value)}
                disabled={isProcessing}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleEnable2FA()
                  }
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-0 right-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowTwoFactorPassword(!showTwoFactorPassword)}
                disabled={isProcessing}>
                {showTwoFactorPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </ResponsiveModal>

      {/* Disable 2FA Dialog */}
      <ResponsiveModal
        open={showDisableDialog}
        onOpenChange={setShowDisableDialog}
        title={
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Disable Two-Factor Authentication
          </div>
        }
        description="Are you sure you want to disable two-factor authentication? This will make your account less secure."
        className="sm:max-w-125"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setShowDisableDialog(false)
                setTwoFactorPassword("")
                setShowTwoFactorPassword(false)
              }}
              disabled={isProcessing}
              className="flex-1">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable2FA}
              disabled={isProcessing || !twoFactorPassword}
              className="flex-1">
              {isProcessing ? (
                <>
                  <Loader className="mr-2 h-4 w-4" />
                  Disabling...
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Disable 2FA
                </>
              )}
            </Button>
          </div>
        }>
        <div className="space-y-4">
          <Alert variant="destructive">
            <X className="h-4 w-4" />
            <AlertTitle>Security Warning</AlertTitle>
            <AlertDescription>
              Disabling 2FA will remove an important security layer from your
              account. You will only need your password to log in.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="disable-2fa-password">Confirm Your Password</Label>
            <div className="relative">
              <Input
                id="disable-2fa-password"
                type={showTwoFactorPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={twoFactorPassword}
                onChange={(e) => setTwoFactorPassword(e.target.value)}
                disabled={isProcessing}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleDisable2FA()
                  }
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-0 right-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowTwoFactorPassword(!showTwoFactorPassword)}
                disabled={isProcessing}>
                {showTwoFactorPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </ResponsiveModal>

      {/* Backup Codes Dialog */}
      <ResponsiveModal
        open={showBackupCodesDialog}
        onOpenChange={() => {}}
        title={
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-green-600" />
            Save Your Backup Codes
          </div>
        }
        description="Store these backup codes in a safe place. You can use them to access your account if you lose access to your email."
        className="sm:max-w-150"
        footer={
          <Button onClick={handleLogoutAfterEnable} className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            I've Saved My Codes - Logout & Apply Changes
          </Button>
        }>
        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle>Important!</AlertTitle>
            <AlertDescription>
              These codes will only be shown once. Make sure to save them
              securely before continuing.
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border bg-muted p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
              {backupCodes.map((code, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded bg-background px-3 py-2 font-mono text-sm">
                  <span>{code}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={copyBackupCodes}
              variant="outline"
              className="flex-1">
              <Copy className="mr-2 h-4 w-4" />
              Copy Codes
            </Button>
            <Button
              onClick={downloadBackupCodes}
              variant="outline"
              className="flex-1">
              <Key className="mr-2 h-4 w-4" />
              Download Codes
            </Button>
          </div>
        </div>
      </ResponsiveModal>

      {/* Delete Account Dialog */}
      <ResponsiveModal
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Your Account
          </div>
        }
        description="This action is permanent and cannot be undone. All your data will be deleted immediately."
        className="sm:max-w-125"
        contentProps={{ onInteractOutside: (e) => e.preventDefault() }}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setDeletePassword("")
                setShowDeletePassword(false)
              }}
              disabled={isDeleting}
              className="flex-1">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting || (hasCredential && !deletePassword)}
              className="flex-1">
              {isDeleting ? (
                <>
                  <Loader className="mr-2 h-4 w-4" />
                  {hasCredential
                    ? "Deleting Account..."
                    : "Sending Verification Email..."}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {hasCredential
                    ? "Yes, Delete My Account"
                    : "Send Verification Email"}
                </>
              )}
            </Button>
          </div>
        }>
        <div className="space-y-4">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Final Warning</AlertTitle>
            <AlertDescription>
              You are about to permanently delete your account. This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Delete all your personal information</li>
                <li>Remove access to all services</li>
                <li>Cancel any active subscriptions</li>
                <li>Delete all your data permanently</li>
              </ul>
            </AlertDescription>
          </Alert>

          {!loadingAccounts && (
            <div className="space-y-2">
              <Label htmlFor="delete-password">
                {hasCredential
                  ? "Confirm Your Password to Continue"
                  : "Confirm Deletion (No password required)"}
              </Label>
              {hasCredential ? (
                <div className="relative">
                  <Input
                    id="delete-password"
                    type={showDeletePassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    disabled={isDeleting}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleDeleteAccount()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-0 right-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    disabled={isDeleting}>
                    {showDeletePassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Email Verification Required</strong>
                    <br />
                    Since you're using social login, we'll send a verification
                    email to confirm your deletion request. This is for your
                    security.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-4">
            <p className="text-sm font-medium text-destructive">
              Are you absolutely sure you want to delete your account?
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              This action is irreversible and all your data will be lost
              forever.
            </p>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  )
}
