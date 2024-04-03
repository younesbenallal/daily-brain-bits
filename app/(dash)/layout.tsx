import { DefaultWrapper } from "@/components/default-wrapper";
import { Header } from "@/components/header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<Header />
			<main className="top-0 flex flex-col items-center snap-y snap-mandatory">{children}</main>
		</>
	);
}
