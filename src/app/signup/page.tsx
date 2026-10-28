import { redirect } from "next/navigation";
import { registrationEnabled } from "@/domains/auth/server";
export const dynamic = "force-dynamic";
export default function SignupPage() { redirect(registrationEnabled() ? "/login?mode=signup" : "/login"); }
