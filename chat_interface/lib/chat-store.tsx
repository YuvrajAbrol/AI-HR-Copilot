"use client"

import type { ReactNode } from "react"
import { useChat, MODELS, TONES, DATA_SOURCES, formatRelativeTime } from "./chat-store"

export { useChat, MODELS, TONES, DATA_SOURCES, formatRelativeTime }

export function ChatProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}
