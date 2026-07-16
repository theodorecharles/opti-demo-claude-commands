"use client";

// Triggers the browser print dialog (Save as PDF) for the comparison page.
// Print styling lives in the page's <style> block + print: utilities.
export function PrintButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      {children}
    </button>
  );
}
