import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layouts/app-layout";

export const Route = createFileRoute("/(app)/dash")({
  component: AppPage,
});

function AppPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="space-y-3">
          <h1 className="font-display text-3xl text-primary">Est eu occaecat mollit dolore anim</h1>
          <p className="text-sm text-muted-foreground">
            Cillum pariatur quis nulla. Lorem ex et laboris nulla laboris aliqua laboris aliqua voluptate reprehenderit ex.
            Incididunt laborum aliquip dolore in laboris culpa sint nisi Lorem voluptate. Excepteur magna ad esse exercitation
            Lorem et ullamco aliquip.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {["A. Lorem", "B. Lipsum", "C. Dolor", "D. Sit Amet"].map((label) => (
            <span key={label} className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-slate-600">
              {label}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span># Notion</span>
          <span>↑</span>
        </div>
      </div>
    </AppLayout>
  );
}
