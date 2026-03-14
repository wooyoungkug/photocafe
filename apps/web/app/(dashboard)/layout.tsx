import type { Metadata } from "next";
import { DashboardLayoutClient } from "./dashboard-layout-client";

export const metadata: Metadata = {
  icons: {
    icon: "/favicon-red.svg",
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
