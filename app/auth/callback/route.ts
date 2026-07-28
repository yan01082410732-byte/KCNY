import { NextResponse } from "next/server"; import { createClient } from "@/lib/supabase/server";
export async function GET(r:Request){const u=new URL(r.url),c=u.searchParams.get("code"),n=u.searchParams.get("next"),s=await createClient();if(c&&s)await s.auth.exchangeCodeForSession(c);return NextResponse.redirect(new URL(n?.startsWith("/")&&!n.startsWith("//")?n:"/",u.origin));}
