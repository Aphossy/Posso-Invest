"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
  Link2,
  Shield,
  Unlink,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader } from "@/components/common/loader"

const formatErrorMessage = (
  error: string
): { title: string; description: string } => {
  const errorMap: Record<string, { title: string; description: string }> = {
    "email_doesn't_match": {
      title: "Email Mismatch",
      description:
        "The email associated with this social account doesn't match your current account email. Please use an account with the same email address.",
    },
    account_already_linked: {
      title: "Already Linked",
      description:
        "This social account is already linked to another user account.",
    },
    linking_failed: {
      title: "Linking Failed",
      description: "Failed to link the social account. Please try again later.",
    },
    invalid_provider: {
      title: "Invalid Provider",
      description:
        "The authentication provider is not supported or configured correctly.",
    },
    authentication_failed: {
      title: "Authentication Failed",
      description:
        "Failed to authenticate with the social provider. Please try again.",
    },
    session_expired: {
      title: "Session Expired",
      description:
        "Your session has expired. Please sign in again to link accounts.",
    },
  }

  // Return mapped error or generic error message
  return (
    errorMap[error] || {
      title: "Linking Error",
      description: error
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
    }
  )
}

const SUPPORTED_SOCIAL_PROVIDERS = [
  {
    id: "google",
    name: "Google",
    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Google_Favicon_2025.svg/250px-Google_Favicon_2025.svg.png",
  },
]

const getProviderDisplayName = (providerId: string) =>
  SUPPORTED_SOCIAL_PROVIDERS.find((provider) => provider.id === providerId)
    ?.name ?? providerId

const validatePassword = (password: string) => {
  const errors: string[] = []
  if (password.length < 8) errors.push("At least 8 characters")
  if (!/[A-Z]/.test(password)) errors.push("One uppercase letter")
  if (!/[a-z]/.test(password)) errors.push("One lowercase letter")
  if (!/\d/.test(password)) errors.push("One number")
  if (!/[^a-zA-Z0-9]/.test(password)) errors.push("One special character")
  if (password.length > 20) errors.push("Maximum 20 characters")
  return errors
}

export default function AccountLinkingPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState<string | null>(null)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [settingPassword, setSettingPassword] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [passwordTouched, setPasswordTouched] = useState(false)

  const searchParams = useSearchParams()

  useEffect(() => {
    const linkingStatus = searchParams.get("linking")
    const providerParam = searchParams.get("provider")
    const error = searchParams.get("error")
    const shouldCleanup = Boolean(linkingStatus || providerParam || error)
    const providerName = providerParam
      ? getProviderDisplayName(providerParam)
      : "social account"

    if (linkingStatus === "success") {
      toast.success("Account Linked", {
        description: `${providerName} account linked successfully.`,
      })
    }

    if (error) {
      const { title, description } = formatErrorMessage(
        decodeURIComponent(error)
      )
      toast.error(title, {
        description,
      })
    } else if (linkingStatus === "failed") {
      toast.error("Link Failed", {
        description: `Failed to link ${providerName}. Please try again.`,
      })
    }

    if (!shouldCleanup) return

    // Clean up URL by removing linking params after showing toast
    const url = new URL(window.location.href)
    url.searchParams.delete("linking")
    url.searchParams.delete("provider")
    url.searchParams.delete("error")
    window.history.replaceState({}, "", `${url.pathname}${url.search}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, toast])

  useEffect(() => {
    fetchAccounts()
  }, [])

  useEffect(() => {
    if (passwordTouched && password) {
      setPasswordErrors(validatePassword(password))
    }
  }, [password, passwordTouched])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const { data: session } = await authClient.getSession()
      console.log("Current session:", session)
      if (!session?.user) {
        toast.error("Authentication Required", {
          description: "You must be signed in to view this page.",
        })
        throw new Error("You must be signed in to view this page.")
      }
      setUserEmail(session.user.email || null)
      const linkedAccounts = await authClient.listAccounts()
      console.log("Fetched linked accounts:", linkedAccounts)
      if ("data" in linkedAccounts && Array.isArray(linkedAccounts.data)) {
        setAccounts(linkedAccounts.data)
      } else {
        setAccounts([])
        const errorMessage =
          "message" in linkedAccounts
            ? typeof linkedAccounts.message === "string"
              ? linkedAccounts.message
              : JSON.stringify(linkedAccounts.message)
            : "Failed to fetch accounts."
        toast.error(errorMessage)
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch accounts.")
    } finally {
      setLoading(false)
    }
  }

  const handleLinkSocial = async (provider: string) => {
    try {
      setLinking(provider)
      const callbackUrl = new URL(window.location.href)
      callbackUrl.searchParams.set("tab", "security")
      callbackUrl.searchParams.set("linking", "success")
      callbackUrl.searchParams.set("provider", provider)
      callbackUrl.searchParams.delete("error")

      const errorCallbackUrl = new URL(callbackUrl.toString())
      errorCallbackUrl.searchParams.set("linking", "failed")

      const linkPromise = authClient.linkSocial({
        provider,
        callbackURL: `${callbackUrl.pathname}${callbackUrl.search}`,
        errorCallbackURL: `${errorCallbackUrl.pathname}${errorCallbackUrl.search}`,
      })

      toast.promise(linkPromise, {
        loading: `Redirecting to ${provider} for authentication...`,
        success: () => `Redirected to ${provider}.`,
        error: (err: any) => err.message || `Failed to link ${provider}.`,
      })

      await linkPromise
    } catch (err: any) {
      toast.error("Link Failed", {
        description: err.message || `Failed to link ${provider}.`,
      })
      setLinking(null)
    }
  }

  const handleUnlink = async (providerId: string, accountId?: string) => {
    try {
      if (accounts.length <= 1) {
        toast.error("Cannot Unlink", {
          description:
            "You must have at least one authentication method linked.",
        })
        return
      }
      setLoading(true)

      if (!accountId) {
        const account = accounts.find((acc) => acc.providerId === providerId)
        accountId = account?.id
      }

      const unlinkPromise = authClient.unlinkAccount({
        providerId,
        accountId,
      })

      toast.promise(unlinkPromise, {
        loading: `Unlinking ${providerId}...`,
        success: () => `${providerId} account unlinked successfully.`,
        error: (err: any) => err.message || `Failed to unlink ${providerId}.`,
      })

      await unlinkPromise
      await fetchAccounts()
    } catch (err: any) {
      console.error("Unlink error:", err)
      toast.error("Unlink Failed", {
        description:
          err.message ||
          `Failed to unlink ${providerId}. You cannot unlink your only account.`,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    const errors = validatePassword(password)
    if (errors.length > 0) {
      toast.error("Invalid Password", {
        description: `Password must have: ${errors.join(", ")}`,
      })
      return
    }

    if (password !== confirmPassword) {
      toast.error("Passwords Do Not Match", {
        description: "Please ensure both passwords are identical.",
      })
      return
    }

    setSettingPassword(true)

    const setPasswordPromise = fetch("/api/authentication/set-password", {
      method: "POST",
      body: JSON.stringify({ password }),
      headers: { "Content-Type": "application/json" },
    }).then(async (result) => {
      const data = await result.json()
      if (!result.ok) {
        throw new Error(
          data.error || "An error occurred while setting your password."
        )
      }
      return data
    })

    toast.promise(setPasswordPromise, {
      loading: "Setting your password...",
      success: () =>
        "Password set successfully. You can now sign in with your email and password.",
      error: (err: any) => err.message || "Failed to set password.",
    })

    try {
      await setPasswordPromise
      setPassword("")
      setConfirmPassword("")
      setShowPasswordForm(false)
      setPasswordTouched(false)
      setPasswordErrors([])
      await fetchAccounts()
    } catch {
      // Error handled by toast.promise
    } finally {
      setSettingPassword(false)
    }
  }

  const linkedProviderIds = accounts.map((acc) => acc.providerId)
  const hasCredential = linkedProviderIds.includes("credential")
  const availableSocialProviders = SUPPORTED_SOCIAL_PROVIDERS.filter(
    (p) => !linkedProviderIds.includes(p.id)
  )
  const canUnlink = accounts.length > 1

  return (
    <div className="container mx-auto  flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full">
        <Card className="shadow-xl border-2">
          <CardHeader className="space-y-3 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Account Security</CardTitle>
                <CardDescription className="text-base">
                  Manage your authentication methods and linked accounts
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Linked Accounts */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Linked Accounts</h3>
                <span className="ml-auto text-sm text-muted-foreground">
                  {accounts.length}{" "}
                  {accounts.length === 1 ? "method" : "methods"}
                </span>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="h-6 w-6 text-primary" />
                </div>
              ) : accounts.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No accounts linked yet. Add an authentication method below.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {accounts.map((account, index) => (
                      <motion.div
                        key={account.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 border-2 rounded-xl bg-card hover:bg-accent/50 transition-colors">
                        <div className="flex  items-center gap-3">
                          <div className="p-2 bg-background rounded-lg border">
                            {account.providerId === "google" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={
                                  SUPPORTED_SOCIAL_PROVIDERS[0].icon ||
                                  "/placeholder.svg"
                                }
                                alt="Google"
                                className="w-5 h-5"
                              />
                            ) : (
                              <Key className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <span className="font-medium uppercase">
                              {account.providerId}
                            </span>
                            {account.providerId === "credential" &&
                              userEmail && (
                                <p className="text-sm text-muted-foreground">
                                  {userEmail}
                                </p>
                              )}
                          </div>
                          {/* <CheckCircle2 className="h-4 w-4 text-green-600 ml-2" /> */}
                        </div>
                        {canUnlink && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={loading || !canUnlink}
                            onClick={() =>
                              handleUnlink(
                                account.providerId,
                                account.accountId
                              )
                            }
                            className="text-destructive hover:text-destructive hover:cursor-pointer hover:bg-destructive/10">
                            <Unlink className="h-4 w-4 mr-1" />
                            Unlink
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>

            {/* Link Social Accounts */}
            {availableSocialProviders.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold">Add Social Account</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {availableSocialProviders.map((provider) => (
                    <Button
                      key={provider.id}
                      variant="outline"
                      onClick={() => handleLinkSocial(provider.id)}
                      disabled={!!linking || loading}
                      className="justify-start h-10 w-fit border-2 hover:border-primary hover:bg-primary/5">
                      {linking === provider.id ? (
                        <Loader className="h-5 w-5 mr-2" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={provider.icon || "/placeholder.svg"}
                          alt={provider.name}
                          className="w-5 h-5 mr-2"
                        />
                      )}
                      Link with {provider.name}
                    </Button>
                  ))}
                </div>
              </section>
            )}

            {/* Set Password */}
            {!hasCredential && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold">
                    Password Authentication
                  </h3>
                </div>
                {!showPasswordForm ? (
                  <Button
                    variant="outline"
                    disabled={loading}
                    onClick={() => setShowPasswordForm(true)}
                    className="justify-start h-12 border-2 hover:border-primary hover:bg-primary/5 w-full sm:w-auto">
                    <Key className="h-5 w-5 mr-2" />
                    Set Up Password Login
                  </Button>
                ) : (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleSetPassword}
                    className="space-y-5 p-5 border-2 rounded-xl bg-muted/30">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-base">
                        New Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onBlur={() => setPasswordTouched(true)}
                          required
                          className="pr-10 h-11"
                          placeholder="Enter a strong password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {passwordTouched && password && (
                        <div className="space-y-1 mt-2">
                          {passwordErrors.length > 0 ? (
                            passwordErrors.map((error, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 text-sm text-destructive">
                                <XCircle className="h-3 w-3" />
                                <span>{error}</span>
                              </div>
                            ))
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Password meets all requirements</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-base">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="pr-10 h-11"
                          placeholder="Re-enter your password"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {confirmPassword && (
                        <div
                          className={`flex items-center gap-2 text-sm ${password === confirmPassword ? "text-green-600" : "text-destructive"}`}>
                          {password === confirmPassword ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Passwords match</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              <span>Passwords do not match</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        type="submit"
                        disabled={
                          settingPassword ||
                          passwordErrors.length > 0 ||
                          password !== confirmPassword
                        }
                        className="h-11">
                        {settingPassword ? (
                          <>
                            <Loader className="h-4 w-4 mr-2" />
                            Setting Password...
                          </>
                        ) : (
                          <>Save Password</>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setShowPasswordForm(false)
                          setPassword("")
                          setConfirmPassword("")
                          setPasswordTouched(false)
                          setPasswordErrors([])
                        }}
                        className="h-11">
                        Cancel
                      </Button>
                    </div>
                  </motion.form>
                )}
              </section>
            )}

            {/* Security Notice */}
            <Alert className="border-primary/20 bg-primary/5">
              <Shield className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                <strong>Security Tip:</strong> Link multiple authentication
                methods for better account security and recovery options.
                {accounts.length === 1 &&
                  " You must have at least one authentication method active."}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
