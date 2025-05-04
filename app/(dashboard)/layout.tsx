import { auth } from "@clerk/nextjs";
import Navbar from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { checkSubscription } from "@/lib/subscription";
import { getApiLimitCount } from "@/lib/api-limit";

const DashboardLayout = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { userId } = auth();

  // Handle unauthenticated users
  if (!userId) {
    return (
      <div className="h-full flex items-center justify-center text-white text-lg">
        Unauthorized. Please login to continue.
      </div>
    );
  }

  const apiLimitCount = await getApiLimitCount(userId);
  const isPro = await checkSubscription(userId);

  return (
    <div className="h-full relative">
      <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-80 bg-gray-900">
        <Sidebar isPro={isPro} apiLimitCount={apiLimitCount} />
      </div>
      <main className="md:pl-72 pb-10">
        <Navbar />
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
