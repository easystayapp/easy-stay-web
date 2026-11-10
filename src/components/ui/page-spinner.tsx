import { Spinner } from "./spinner";

export function PageSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-primary">
      <Spinner className="size-8" aria-label={label} />
    </div>
  );
}
