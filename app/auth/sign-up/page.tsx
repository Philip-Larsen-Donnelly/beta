import { redirect } from "next/navigation"

export default function SignUpPage() {
  // Public sign-up disabled — redirect to login
  redirect("/auth/login")
}
