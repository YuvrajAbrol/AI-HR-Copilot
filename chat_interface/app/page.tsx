import { ChatArea } from "@/components/chat-area"
import { ChatProvider } from "@/lib/chat-store"
import { AgentRuntimeProvider } from "@/lib/agent-runtime"
import { Toaster } from "@/components/ui/sonner"

export default function Home() {
  return (
    <AgentRuntimeProvider>
      <ChatProvider>
        <ChatArea />
        <Toaster theme="dark" position="bottom-center" />
      </ChatProvider>
    </AgentRuntimeProvider>
  )
}
