import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-4">Daily Brain Bits</h1>
      <p className="text-muted-foreground">Welcome to your knowledge base</p>
    </div>
  );
}
