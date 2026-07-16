export function OptimizelyLogo({ className = "h-6 w-auto" }: { className?: string }) {
  // The Optimizely "Free to Grow" wordmark. Copied to /public by the installer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/optimizely-logo.svg" alt="Optimizely" className={className} />;
}
