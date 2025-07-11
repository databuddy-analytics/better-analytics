import type { LayoutProps } from "@/types/layout";
import type { Metadata } from "next";

import { auth } from "@better-analytics/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export const metadata: Metadata = {
	title: "Better Analytics · Auth",
};

export default async function AuthLayout({ children }: LayoutProps) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (session) {
		redirect("/dashboard");
	}

	return (
		<div className="flex min-h-svh w-full items-center justify-center">
			{children}
		</div>
	);
}
