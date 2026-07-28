"use client";
import { useFormStatus } from "react-dom";
export function AuthSubmitButton({idleText,pendingText}:{idleText:string;pendingText:string}){const {pending}=useFormStatus();return <button className="button primary" type="submit" disabled={pending}>{pending?pendingText:idleText}</button>}
