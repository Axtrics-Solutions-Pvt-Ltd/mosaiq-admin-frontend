import { BarChart3, Building2, ShieldCheck } from "lucide-react";

import { BrandMark } from "@/components/layout/BrandMark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      id="main-content"
      className="min-h-screen lg:grid lg:grid-cols-[minmax(20rem,0.85fr)_minmax(30rem,1.15fr)]"
      tabIndex={-1}
    >
      <aside className="relative hidden overflow-hidden bg-[linear-gradient(145deg,#172554_0%,#1e3a8a_52%,#2563eb_100%)] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <BrandMark inverse />
        <div className="relative z-10 max-w-lg">
          <p className="text-sm font-medium text-blue-200">
            Operations, clearly connected
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight">
            Run every agency workspace from one focused admin portal.
          </h2>
          <p className="mt-5 text-base leading-7 text-blue-100">
            Review access, data health, and configuration across your MOSAIQ
            organization.
          </p>
          <ul className="mt-8 grid gap-3 text-sm text-blue-50">
            <li className="flex items-center gap-3">
              <Building2 aria-hidden className="size-5" /> Multi-agency
              oversight
            </li>
            <li className="flex items-center gap-3">
              <BarChart3 aria-hidden className="size-5" /> Operational
              visibility
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck aria-hidden className="size-5" /> Permission-aware
              access
            </li>
          </ul>
        </div>
        <p className="relative z-10 text-xs text-blue-200">MOSAIQ Admin</p>
        <div
          aria-hidden
          className="absolute -right-24 -bottom-24 size-96 rounded-full border border-white/15 bg-white/5"
        />
      </aside>
      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
