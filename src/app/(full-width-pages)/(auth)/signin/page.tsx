import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome to Promptify | AI Prompt Library",
  description: "Sign in to your Promptify account to organize and manage your AI prompts",
};

export default function SignIn() {
  return <SignInForm />;
}
