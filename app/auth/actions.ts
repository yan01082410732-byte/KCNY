"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeLanguage, safeReturnTo, validateSignIn, validateSignUp } from "@/lib/auth";

export async function signUp(formData: FormData) {
  const language=normalizeLanguage(formData.get("language"));
  const input={username:String(formData.get("username")||""),displayName:String(formData.get("displayName")||""),email:String(formData.get("email")||""),password:String(formData.get("password")||""),confirmPassword:String(formData.get("confirmPassword")||""),preferredLanguage:formData.get("preferredLanguage")};
  const error=validateSignUp(input); if(error) redirect(`/auth/signup?lang=${language}&error=${error}`);
  const supabase=await createClient(); if(!supabase)redirect(`/auth/signup?lang=${language}&error=configuration`);
  const {error:authError}=await supabase.auth.signUp({email:input.email,password:input.password,options:{emailRedirectTo:`${process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000"}/auth/callback?lang=${language}`,data:{username:input.username,display_name:input.displayName,preferred_language:input.preferredLanguage}}});
  if(authError)redirect(`/auth/signup?lang=${language}&error=auth_failed`);redirect(`/auth/login?lang=${language}&notice=check_email`);
}
export async function signIn(formData: FormData) {
  const language=normalizeLanguage(formData.get("language")); const input={email:String(formData.get("email")||""),password:String(formData.get("password")||""),language,returnTo:formData.get("returnTo")};
  const error=validateSignIn(input); if(error)redirect(`/auth/login?lang=${language}&error=${error}`);
  const supabase=await createClient();if(!supabase)redirect(`/auth/login?lang=${language}&error=configuration`);
  if((await supabase.auth.signInWithPassword({email:input.email,password:input.password})).error)redirect(`/auth/login?lang=${language}&error=auth_failed`);redirect(safeReturnTo(input.returnTo));
}
