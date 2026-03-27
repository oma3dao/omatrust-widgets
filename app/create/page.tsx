import { redirect } from "next/navigation"
import { REVIEW_WIDGET_CREATE_PATH } from "@/lib/widget-config"

export default function CreatePage() {
  redirect(REVIEW_WIDGET_CREATE_PATH)
}
