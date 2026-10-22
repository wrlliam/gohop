import "~/styles/globals.css";
import { Figtree } from "next/font/google";
import { Toaster } from "sonner";
import Navbar from "~/components/Navbar/Navbar";
import { TooltipProvider } from "~/components/ui/tooltip";
// import { usePathname } from "next/navigation";
import { getUser } from "~/lib/session";
import { UserProvider } from "~/components/Auth/userProvider";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  // const pathname = usePathname();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>gohop</title>
        <meta
          name="description"
          content="Redirect your links, get analytics down to fine details, and get paid for sharing."
        />
        <link rel="icon" href="/favicon.ico" />
        <script />
        <script
          src="https://kit.fontawesome.com/84ad06ee17.js"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body className={`bg-ink text-paper antialiased ${figtree.variable} `}>
        <UserProvider user={user}>
          <Navbar />
          <TooltipProvider>
            <div className="mx-auto flex min-h-screen w-full max-w-[950px] flex-col px-4 mt-[6rem] max-sm:py-10">
              {children}
            </div>
          </TooltipProvider>
          <Toaster theme="dark" />
        </UserProvider>
      </body>
    </html>
  );
}
