"use client";
export default function StorefrontError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl p-10">
      <h1 className="text-2xl font-bold">This website could not be loaded</h1>
      <p>Please try again shortly.</p>
      <button
        onClick={reset}
        className="mt-5 rounded-xl bg-violet-700 px-5 py-3 text-white"
      >
        Try again
      </button>
    </main>
  );
}
