import { WorkspaceProvider } from "@/lib/workspace";
import { Shell } from "@/components/layout/Shell";

export default function Home() {
  return (
    <WorkspaceProvider>
      <Shell />
    </WorkspaceProvider>
  );
}
