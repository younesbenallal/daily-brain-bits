import React from "react";
import BackgroundLayout from "./components/BackgroundLayout";
import Router from "@/components/Router";

export default function Home() {
  return (
    <BackgroundLayout>
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto scrollbar-custom">
          <Router />
        </div>
      </div>
    </BackgroundLayout>
  );
}
