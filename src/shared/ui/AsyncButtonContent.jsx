import { Loader2 } from "lucide-react";

export default function AsyncButtonContent({
  loading,
  loadingText,
  children,
  spinnerSize = 14,
}) {
  if (!loading) return children;
  return (
    <>
      <Loader2 size={spinnerSize} className="fs-btn-spinner" aria-hidden="true" />
      {loadingText}
    </>
  );
}

