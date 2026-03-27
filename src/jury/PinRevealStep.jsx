// src/jury/PinRevealStep.jsx
// One-time PIN reveal after first-time registration. Phase 7 restyle.

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, Info, Copy, CopyCheck } from "lucide-react";

const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

export default function PinRevealStep({ pin, onContinue, onBack }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [pinSaved, setPinSaved] = useState(false);
  const normalizedPin = String(pin || "").replace(/\D/g, "").slice(0, 4);
  const digits = Array.from({ length: 4 }, (_, idx) => normalizedPin[idx] || "");

  const handleCopy = async () => {
    const valueToCopy = normalizedPin;
    if (!valueToCopy) { setCopied(false); return; }
    const markCopied = () => { setCopied(true); setCopyFailed(false); setTimeout(() => setCopied(false), 1500); };
    const markFailed = () => { setCopied(false); setCopyFailed(true); };
    try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(valueToCopy); markCopied(); return; } } catch {}
    try {
      const ta = document.createElement("textarea"); ta.value = valueToCopy; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand("copy"); document.body.removeChild(ta); if (ok) { markCopied(); return; }
    } catch {}
    markFailed();
  };

  return (
    <div className="premium-screen flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-5 pt-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <KeyRound className="size-6" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Your Access PIN</h1>
            <p className="text-sm text-muted-foreground">This PIN will be shown only once. Save it before continuing.</p>
          </div>

          {/* PIN digits */}
          <div className="flex justify-center gap-3" aria-label="One-time PIN">
            {digits.map((d, idx) => (
              <span key={idx} className="flex size-14 items-center justify-center rounded-lg border-2 border-primary/20 bg-muted text-2xl font-bold tabular-nums font-mono">
                {d}
              </span>
            ))}
          </div>

          {/* Copy button */}
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
              {copied ? <CopyCheck className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy PIN"}
            </Button>
          </div>

          {copyFailed && (
            <div className="text-center text-sm text-destructive" role="alert">
              Could not copy automatically. Please note your PIN manually.
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-sm text-amber-700">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>Use this PIN to resume your evaluation later or on another device.</span>
          </div>

          {isDemoMode && (
            <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5 text-sm text-blue-700">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>In production, each juror receives a unique 4-digit PIN for secure access.</span>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pinSaved} onChange={(e) => setPinSaved(e.target.checked)} className="size-4 rounded border-border" />
            I have noted / saved my PIN
          </label>

          <Button className="w-full" onClick={onContinue} disabled={!pinSaved}>
            Continue &rarr;
          </Button>
          {onBack && (
            <button type="button" className="block w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline" onClick={onBack}>
              &larr; Return Home
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
