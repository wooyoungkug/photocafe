import type { Metadata } from "next";
import { DashboardLayoutClient } from "./dashboard-layout-client";

export const metadata: Metadata = {
  icons: {
    icon: "/images/favicon_Brown.svg",
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
