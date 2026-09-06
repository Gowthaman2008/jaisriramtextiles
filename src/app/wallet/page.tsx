"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RefreshCw } from "lucide-react";

function WalletRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const redeem = searchParams.get("redeem");
    if (redeem) {
      router.replace(`/account?tab=wallet&redeem=${encodeURIComponent(redeem)}`);
    } else {
      router.replace("/account?tab=wallet");
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
      <RefreshCw className="w-8 h-8 text-zari animate-spin" />
      <p className="text-sm font-bold text-ink">Redirecting to Wallet Portal...</p>
    </div>
  );
}

export default function WalletRedirectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-zari animate-spin" />
        <p className="text-sm font-bold text-ink">Loading Wallet...</p>
      </div>
    }>
      <WalletRedirectContent />
    </Suspense>
  );
}
