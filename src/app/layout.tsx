import "~/styles/globals.css";
import { Figtree } from "next/font/google";
import { AppToaster } from "~/components/AppToaster";
import Navbar from "~/components/Navbar/Navbar";
import { TooltipProvider } from "~/components/ui/tooltip";
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
          name="google-adsense-account"
          content="ca-pub-4391494793831066"
        ></meta>
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
            <div className="mx-auto mt-[6rem] flex min-h-screen w-full max-w-[1000px] flex-col px-4 max-sm:py-10">
              {children}
            </div>
          </TooltipProvider>
          <AppToaster />
        </UserProvider>
      </body>
    </html>
  );
}
