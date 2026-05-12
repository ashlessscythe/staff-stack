"use client";

export default function TenantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg p-8">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{error.message}</p>
      <button
        type="button"
        className="mt-4 rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
