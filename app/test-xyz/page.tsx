"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/providers/Toasts/ToastProvider";

export default function TestXyzPage() {
  const { addToast } = useToast();

  const testToast = () => {
    addToast("Regular notification");
  };

  const testToastWithDismissible = () => {
    addToast("Dismissible notification", true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-gray-900">
      <h1 className="text-2xl font-semibold text-gray-200">Toast Test</h1>
      <div className="flex justify-center gap-4">
        <Button variant="outline" size="sm" onClick={testToast}>
          Add Toast
        </Button>
        <Button variant="outline" size="sm" onClick={testToastWithDismissible}>
          Add Dismissible Toast
        </Button>
      </div>
    </div>
  );
}
