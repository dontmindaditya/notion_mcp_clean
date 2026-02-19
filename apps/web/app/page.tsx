"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useNotionConnection } from "@/hooks/useNotionConnection";
import { ConnectButton } from "@/components/notion/ConnectButton";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function HomePage() {
  const router = useRouter();
  const { state } = useNotionConnection();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || state === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <LoadingSpinner size="lg" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col p-6 md:p-10">
      
      {/* Logo Header */}
      <div className="flex items-center gap-2 text-xl font-semibold mb-8">
        <Image
          src="/logo.png"
          alt="Logo"
          width={28}
          height={28}
          className="brightness-200"
        />
        <span>Fairquanta</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        
        {/* Card */}
        <section className="w-full max-w-[440px] bg-neutral-900 border border-neutral-800 rounded-[40px] px-12 py-12 flex flex-col items-center shadow-2xl">
          
          {/* Top Section */}
          <div className="flex flex-col items-center w-full">
            
            {/* Icon */}
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-lg">
              <Image
                src="/notion.png"
                alt="Notion"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>

            {/* Heading */}
            <h1 className="text-3xl font-bold text-center leading-tight mb-6">
              Connect your <br /> Notion workspace
            </h1>

            {/* Description */}
            <p className="text-neutral-400 text-center text-sm leading-relaxed px-2 mb-12">
              Link your Notion account to search pages, query databases, and
              interact with your workspace through MCP.
            </p>
          </div>

          {/* Button Section */}
          <div className="w-full max-w-[280px]">
            {state === "connected" ? (
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full bg-white text-black font-bold py-5 rounded-2xl hover:bg-neutral-200 transition-all active:scale-[0.98]"
              >
                Go to Dashboard
              </button>
            ) : (
              <ConnectButton
                variant="card"
                className="w-full"
              />
            )}
          </div>

          {/* Footer */}
          <p className="mt-auto pt-10 text-[11px] text-neutral-500 text-center leading-relaxed max-w-[300px]">
            Your credentials are encrypted and stored server-side. We never
            access your Notion data without your permission.
          </p>

        </section>
      </div>
    </main>
  );
}
