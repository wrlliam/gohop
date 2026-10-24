"use client";

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChartBar,
  Check,
  Clock,
  DeviceMobile,
  Eye,
  Globe,
  LockSimple,
  MapPin,
  Pencil,
  Power,
  Prohibit,
  Robot,
  ShieldCheck,
  Users,
  Wallet,
  Warning,
  type Icon,
} from "@phosphor-icons/react";
import { GoHopMark } from "~/components/Brand/GoHopMark";
import {
  ConsentLinkButton,
  resetConsent,
} from "~/components/Cookies/CookieConsent";
import { useUser } from "~/components/Auth/userProvider";

const SHORT_HOST = "gohop.link";

/* ------------------------------------------------------------------ data */

const steps = [
  {
    title: "Create a link",
    text: "Paste a destination URL and name it. Optionally add a password, a view limit or an expiry date.",
  },
  {
    title: "Share it",
    text: "Post your short link anywhere. Visitors don't need an account to open it.",
  },
  {
    title: "Visitors hop through",
    text: "A quick page checks the destination is safe, then sends them on. Password-protected links ask first.",
  },
  {
    title: "Track and earn",
    text: "See where views come from and what each link earns. Withdraw through Stripe when you're ready.",
  },
];

const journey = [
  {
    title: "The link is looked up",
    text: "If it's switched off, expired or out of views, the visitor gets a clear message instead of an error.",
  },
  {
    title: "A password, if you set one",
    text: "The destination stays hidden until the right password is entered. Repeated wrong guesses are rate limited.",
  },
  {
    title: "The destination is checked",
    text: "Broken or invalid destinations show a warning with the reasons. The visitor decides whether to continue.",
  },
  {
    title: "A short page with an ad",
    text: "This is where earning links make money. Links with earning switched off show no ad.",
  },
  {
    title: "They land on your destination",
    text: "The whole hop usually takes a couple of seconds.",
  },
];

const controls: { icon: Icon; title: string; text: string }[] = [
  {
    icon: LockSimple,
    title: "Passwords",
    text: "Lock a link. Passwords are stored hashed, never in plain text.",
  },
  {
    icon: Eye,
    title: "View limits",
    text: "Close a link automatically after a set number of views.",
  },
  {
    icon: Clock,
    title: "Expiry dates",
    text: "Pick a date and the link stops working on it.",
  },
  {
    icon: Power,
    title: "Switch off any time",
    text: "Deactivate a link without deleting it or losing its stats.",
  },
  {
    icon: Pencil,
    title: "Edit later",
    text: "Change the name, destination, password or limit. Your short code stays the same.",
  },
  {
    icon: Prohibit,
    title: "Block earning per link",
    text: "Turn monetisation off for any link you'd rather keep ad-free.",
  },
];

type Example = {
  name: string;
  code: string;
  destination: string;
  views: string;
  description: string;
  badges: { icon: Icon; label: string }[];
  usage?: { used: number; max: number };
};

const examples: Example[] = [
  {
    name: "Launch announcement",
    code: "launch",
    destination: "example.com/blog/new-product",
    views: "1,284",
    description: "No limits. Anyone with the link can open it.",
    badges: [{ icon: Eye, label: "Public" }],
  },
  {
    name: "Private beta invite",
    code: "beta",
    destination: "example.com/join/beta",
    views: "31",
    description: "Locked with a password and closes after 50 views.",
    badges: [
      { icon: LockSimple, label: "Password" },
      { icon: Eye, label: "Max 50 views" },
    ],
    usage: { used: 31, max: 50 },
  },
  {
    name: "Weekend sale",
    code: "sale",
    destination: "example.com/shop/weekend-sale",
    views: "412",
    description: "Stops working on the date you pick.",
    badges: [{ icon: Clock, label: "Expires Sunday" }],
  },
];

const analytics: { icon: Icon; text: string }[] = [
  {
    icon: ChartBar,
    text: "Views, unique visitors and billable views over time, compared with the previous period",
  },
  { icon: Globe, text: "Countries and cities your visitors come from" },
  {
    icon: Users,
    text: "Referrers and utm_campaign tags, so you know which post worked",
  },
  { icon: DeviceMobile, text: "Devices, browsers and operating systems" },
  { icon: Clock, text: "The hours of the day people click (UTC)" },
  { icon: Robot, text: "Bot traffic, filtered out and shown separately" },
];

const stats = [
  { label: "Views", value: "1,284" },
  { label: "Unique visitors", value: "903" },
  { label: "Billable views", value: "641" },
  { label: "Bot traffic", value: "6%" },
];

const earningPoints = [
  "Ads on the short page generate revenue. At the end of each period, that period's revenue is split between links in proportion to their billable views. There's no fixed rate per view.",
  "A view is billable only when a real visitor was actually shown an ad. Bots, your own views and repeated views from the same network are not counted.",
  "goHop keeps a small platform fee, and each withdrawal has a small flat fee to cover payment costs. Both are shown on your monetisation page.",
  "New earnings are held briefly before they become withdrawable, then paid out through Stripe once you've verified your details with them.",
  "You can switch earning off for any link at any time.",
];

const trust: { icon: Icon; title: string; text: string }[] = [
  {
    icon: ShieldCheck,
    title: "Destination checks",
    text: "Every destination is checked before a visitor is sent on, and problems are shown rather than hidden.",
  },
  {
    icon: Warning,
    title: "Honest about money",
    text: "Earnings depend on real ad revenue and aren't guaranteed. You can see exactly how each amount was worked out.",
  },
  {
    icon: MapPin,
    title: "Privacy by design",
    text: "Visitor IP addresses are hashed with a secret salt before they're stored, not kept as raw addresses.",
  },
];

const faqs = [
  {
    q: "Do visitors need an account to open my link?",
    a: "No. Only link owners need an account. Anyone with the short link can open it.",
  },
  {
    q: "How much does it cost?",
    a: "Creating links is free. When you earn, goHop keeps a small platform fee from that revenue, and withdrawals carry a small flat fee. Both are shown in your monetisation page before you withdraw.",
  },
  {
    q: "How are my earnings worked out?",
    a: "Each period's ad revenue is shared between links by billable views. Your share is whatever your links' billable views add up to, minus the fee.",
  },
  {
    q: "Which views count?",
    a: "Real visitors who were shown an ad. Bots, the link owner's own views and repeated views from the same network are excluded, so refreshing your own link won't earn anything.",
  },
  {
    q: "What happens when a link expires or hits its view limit?",
    a: "Visitors see a clear message saying why it no longer works. Your stats stay available in your dashboard.",
  },
  {
    q: "Can I change a link after creating it?",
    a: "Yes. You can rename it, change the destination, add or remove a password, change the view limit or switch it off. The short code can't be changed.",
  },
  {
    q: "How do I get paid?",
    a: "Connect a Stripe account from your monetisation page. Stripe collects your identity and bank details and sends the money to you.",
  },
];

/* ------------------------------------------------------------ components */

function Pill({ icon: PillIcon, label }: { icon: Icon; label: string }) {
  return (
    <span className="border-stone/30 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold">
      <PillIcon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 py-14">
      <div className="flex max-w-2xl flex-col gap-2">
        <h2 className="text-3xl font-black tracking-tight text-balance">
          {title}
        </h2>
        {intro && <p className="text-stone font-semibold">{intro}</p>}
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function ExampleCard({ example }: { example: Example }) {
  const { usage } = example;
  return (
    <div className="border-stone/30 flex flex-col gap-4 rounded-lg border p-5">
      <div className="flex flex-col gap-1">
        <h3 className="font-black">{example.name}</h3>
        <p className="text-stone font-mono text-xs break-all">
          {SHORT_HOST}/{example.code}
        </p>
      </div>
      <p className="text-stone truncate text-sm font-semibold">
        Goes to {example.destination}
      </p>
      <div className="flex flex-wrap gap-2">
        {example.badges.map((badge) => (
          <Pill key={badge.label} {...badge} />
        ))}
      </div>
      {usage && (
        <div>
          <div
            role="progressbar"
            aria-label="Views used"
            aria-valuemin={0}
            aria-valuemax={usage.max}
            aria-valuenow={usage.used}
            className="bg-stone/20 h-1.5 overflow-hidden rounded-full"
          >
            <div
              className="bg-accent h-full rounded-full"
              style={{ width: `${(usage.used / usage.max) * 100}%` }}
            />
          </div>
          <p className="text-stone mt-1 text-xs font-semibold">
            {usage.used} of {usage.max} views used
          </p>
        </div>
      )}
      <p className="text-sm font-semibold">{example.description}</p>
      <div className="mt-auto flex items-center gap-1.5 text-sm font-black">
        <Eye className="text-accent size-4" aria-hidden />
        {example.views} views
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ page */

export default function HomePage() {
  const user = useUser();
  if (user) {
    redirect("/app");
  }

  return (
    <>
      <main className="w-full">
        {/* Hero */}
        <section className="flex flex-col items-center gap-6 py-16 text-center">
          <GoHopMark className="size-16" />
          <div className="flex flex-col gap-3">
            <h1 className="mx-auto max-w-3xl text-4xl font-black tracking-tight text-balance sm:text-6xl">
              Share links, track popularity, get paid for your views.
            </h1>
            <p className="text-stone mx-auto max-w-xl text-lg font-semibold text-balance">
              Create a short link, share it anywhere, and see exactly who opens
              it. Earn from the ad on the hop page, and withdraw through Stripe.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ConsentLinkButton href="/signup" size="lg">
              Create an account
            </ConsentLinkButton>
            <ConsentLinkButton href="/login" size="lg" variant="outline">
              Log in
            </ConsentLinkButton>
          </div>
          <p className="text-stone text-xs font-semibold">
            Free to start. Earnings aren&apos;t guaranteed and depend on ad
            revenue.
          </p>
        </section>

        <Section
          id="how-it-works"
          title="How it works"
          intro="Four steps from a long URL to money in your Stripe account."
        >
          <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-2">
                <span className="bg-accent text-ink flex size-8 items-center justify-center rounded-full text-sm font-black">
                  {index + 1}
                </span>
                <h3 className="text-lg font-black">{step.title}</h3>
                <p className="text-stone text-sm font-semibold">{step.text}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          id="visitors"
          title="What happens when someone opens your link"
          intro="The hop page is quick, but it does a few things before sending people on."
        >
          <ol className="flex max-w-2xl flex-col gap-5">
            {journey.map((item, index) => (
              <li key={item.title} className="flex gap-4">
                <span className="border-stone/30 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-black">
                  {index + 1}
                </span>
                <div className="flex flex-col gap-0.5">
                  <h3 className="font-black">{item.title}</h3>
                  <p className="text-stone text-sm font-semibold">
                    {item.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          id="controls"
          title="You stay in control of every link"
          intro="Set the rules when you create a link, and change them whenever you like."
        >
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {controls.map(({ icon: ControlIcon, title, text }) => (
              <li key={title} className="flex flex-col gap-2">
                <ControlIcon className="text-accent size-6" aria-hidden />
                <h3 className="font-black">{title}</h3>
                <p className="text-stone text-sm font-semibold">{text}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          id="examples"
          title="What a link can do"
          intro="Three example links. The names and numbers are made up."
        >
          <div className="grid gap-6 md:grid-cols-3">
            {examples.map((example) => (
              <ExampleCard key={example.code} example={example} />
            ))}
          </div>
        </Section>

        <Section
          id="analytics"
          title="Analytics down to the fine details"
          intro="Every link gets its own page showing how it's performing."
        >
          <div className="grid gap-10 md:grid-cols-2">
            <ul className="flex flex-col gap-4">
              {analytics.map(({ icon: ItemIcon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm">
                  <ItemIcon
                    className="text-accent mt-0.5 size-5 shrink-0"
                    aria-hidden
                  />
                  <span className="font-semibold">{text}</span>
                </li>
              ))}
            </ul>
            <div className="border-stone/30 flex flex-col gap-4 rounded-lg border p-5">
              <p className="text-stone text-xs font-semibold tracking-widest uppercase">
                Example stats, last 30 days
              </p>
              <dl className="grid grid-cols-2 gap-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex flex-col gap-0.5">
                    <dt className="text-stone text-xs font-semibold">
                      {stat.label}
                    </dt>
                    <dd className="text-2xl font-black tabular-nums">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="text-stone text-xs font-semibold">
                Made-up numbers, to show the layout.
              </p>
            </div>
          </div>
        </Section>

        <Section
          id="earning"
          title="Earn from the views your links get"
          intro="Before a visitor continues to your destination, they see a short page with an ad. You earn a share of the revenue it generates."
        >
          <div className="grid gap-10 md:grid-cols-2">
            <div className="border-stone/30 flex flex-col gap-3 rounded-lg border p-5">
              <Wallet className="text-accent size-7" aria-hidden />
              <h3 className="text-xl font-black">Your monetisation page</h3>
              <p className="text-stone text-sm font-semibold">
                See your available, pending and lifetime earnings, which links
                earn the most, and your withdrawal history. Switch earning off
                per link, and withdraw through Stripe whenever you reach the
                minimum.
              </p>
            </div>
            <ul className="flex flex-col gap-4">
              {earningPoints.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm">
                  <Check
                    className="text-accent mt-0.5 size-5 shrink-0"
                    weight="bold"
                    aria-hidden
                  />
                  <span className="font-semibold">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section
          id="trust"
          title="Safe for visitors, fair to creators"
          intro="Links are only useful if people trust them."
        >
          <ul className="grid gap-6 md:grid-cols-3">
            {trust.map(({ icon: TrustIcon, title, text }) => (
              <li
                key={title}
                className="border-stone/30 flex flex-col gap-2 rounded-lg border p-5"
              >
                <TrustIcon className="text-accent size-6" aria-hidden />
                <h3 className="font-black">{title}</h3>
                <p className="text-stone text-sm font-semibold">{text}</p>
              </li>
            ))}
          </ul>
          <p className="text-stone mt-4 text-sm font-semibold">
            Details are in our{" "}
            <Link href="/privacy" className="text-paper underline">
              privacy policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="text-paper underline">
              terms
            </Link>
            . You can change your cookie choices at any time from the footer.
          </p>
        </Section>

        <Section id="faq" title="Questions">
          <div className="flex max-w-2xl flex-col">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="border-stone/30 group border-b py-4 first:border-t"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-black">
                  {item.q}
                  <span
                    aria-hidden
                    className="text-accent text-xl transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="text-stone mt-2 text-sm font-semibold">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </Section>

        <section className="border-stone/30 my-14 flex flex-col items-center gap-5 rounded-lg border px-6 py-12 text-center">
          <h2 className="text-3xl font-black tracking-tight">
            Create your first link
          </h2>
          <p className="text-stone max-w-md font-semibold">
            It takes a minute, and you can change everything about it later.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ConsentLinkButton href="/signup" size="lg">
              Create an account
            </ConsentLinkButton>
            <ConsentLinkButton href="/login" size="lg" variant="outline">
              Log in
            </ConsentLinkButton>
          </div>
        </section>
      </main>

      <footer className="border-stone/30 text-stone mt-auto border-t py-6 text-sm font-semibold">
        <div className="flex w-full flex-wrap items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} goHop</p>
          <ul className="flex flex-wrap items-center gap-5">
            <li>
              <Link href="/privacy" className="hover:text-paper">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-paper">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="hover:text-paper">
                Cookies
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={resetConsent}
                className="hover:text-paper cursor-pointer"
              >
                Cookie settings
              </button>
            </li>
          </ul>
        </div>
      </footer>
    </>
  );
}
