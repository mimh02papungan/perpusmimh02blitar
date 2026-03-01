import Sidebar from '@/components/Sidebar';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
            <Sidebar />
            <main className="md:ml-72 min-h-screen">
                <div className="p-4 md:p-8 pt-20 md:pt-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
