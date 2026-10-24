import Link from "next/link";
import { LEGAL } from "~/lib/legal";
import {
  A,
  H2,
  LegalPage,
  LegalTable,
  P,
  UL,
} from "~/components/LegalPage";
import { CookieSettingsButton } from "~/components/Cookies/CookieSettingsButton";

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookies"
      intro={`How ${LEGAL.product} uses cookies and similar technologies, and how to control them.`}
    >
      <H2 id="what">What are cookies?</H2>
      <P>
        Cookies are small files a website stores in your browser. We also use
        &quot;similar technologies&quot; such as local storage, and the same
        rules apply to them. Some are essential, and others only run if you
        agree.
      </P>

      <H2 id="choices">Your choices</H2>
      <P>
        When you first visit, we ask you to choose. You can change your mind at
        any time and we&apos;ll ask again.
      </P>
      <div>
        <CookieSettingsButton />
      </div>

      <H2 id="used">What we use</H2>
      <LegalTable
        head={["Type", "What it does", "Needs consent?"]}
        rows={[
          [
            "Strictly necessary: sign-in session",
            "Keeps you signed in. Set by our authentication library; names begin with better-auth.",
            "No",
          ],
          [
            "Strictly necessary: your cookie choice",
            "Remembers what you chose, so we don't ask on every page. Stored as: [name of your consent cookie or storage key].",
            "No",
          ],
          [
            "Advertising: Google AdSense",
            "Google sets cookies to deliver and measure ads and to limit how often you see the same ad. If you agree, they may also be used to personalise ads. Names and lifetimes are controlled by Google.",
            "Yes",
          ],
        ]}
      />
      <P>
        We don&apos;t use analytics or tracking cookies of our own. The
        statistics link owners see are produced on our servers when a link is
        opened, not by scripts in your browser.
      </P>

      <H2 id="google">Google ads</H2>
      <P>
        Ads are shown only on the short page visitors pass through, and only if
        the link&apos;s owner has earning switched on. Ad cookies are not set
        unless you&apos;ve agreed to them. In the UK, EEA and Switzerland
        personalised ads are only possible with your consent. To manage
        personalised advertising, visit{" "}
        <A href="https://adssettings.google.com">Google Ads Settings</A>. To
        learn how Google uses cookies, see{" "}
        <A href="https://policies.google.com/technologies/cookies">
          Google&apos;s cookies page
        </A>
        .
      </P>

      <H2 id="other">Other third-party requests</H2>
      <P>
        We load an icon script from Font Awesome. Your browser contacts their
        servers to fetch it, which shares your IP address and browser details
        with them. It isn&apos;t used to track you across sites by us. Their
        practices are described in their own privacy policy.
      </P>

      <H2 id="browser">Controlling cookies in your browser</H2>
      <UL>
        <li>
          Most browsers let you block or delete cookies in their settings.
        </li>
        <li>Blocking essential cookies will stop sign-in from working.</li>
      </UL>

      <H2 id="more">More information</H2>
      <P>
        See our{" "}
        <Link href="/privacy" className="text-accent underline">
          privacy policy
        </Link>{" "}
        for how we handle personal data, or email{" "}
        <A href={`mailto:${LEGAL.email}`}>{LEGAL.email}</A>.
      </P>
    </LegalPage>
  );
}
