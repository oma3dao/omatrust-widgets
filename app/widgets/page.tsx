import { redirect } from "next/navigation"
import { REVIEW_WIDGET_CREATE_PATH } from "@/lib/widget-config"

export default function WidgetsPage() {
  redirect(REVIEW_WIDGET_CREATE_PATH)
}
