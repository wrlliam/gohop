import Link from "next/link";
import { LEGAL } from "~/lib/legal";
import {
  A,
  H2,
  H3,
  LegalPage,
  LegalTable,
  P,
  UL,
} from "~/components/LegalPage";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro={`How ${LEGAL.product} collects, uses and protects personal data. This policy applies to ${LEGAL.domain}, including the short-link pages visitors pass through.`}
    >
      <H2 id="who">1. Who we are</H2>
      <P>
        {LEGAL.operator} (&quot;{LEGAL.product}&quot;, &quot;we&quot;) is the
        controller of the personal data described here. {LEGAL.companyNumber}{" "}
        Our address is {LEGAL.address}. You can contact us about privacy at{" "}
        <A href={`mailto:${LEGAL.email}`}>{LEGAL.email}</A>.
      </P>

      <H2 id="collect">2. What we collect</H2>

      <H3>If you have an account</H3>
      <UL>
        <li>
          Your name, email address and profile image, from you or from GitHub if
          you sign in with it.
        </li>
        <li>
          A password if you sign up with one. We store it hashed, never in plain
          text.
        </li>
        <li>
          Session records: a session token, the IP address and browser details
          of the device you signed in from, and when the session expires.
        </li>
        <li>
          The links you create: names, short codes, destination URLs, limits,
          expiry dates, settings, and any link password (stored hashed).
        </li>
        <li>
          Earnings records: how much each link earned, fees, withdrawals and the
          status of your payout account.
        </li>
      </UL>

      <H3>If you open a short link (a visitor)</H3>
      <P>You don&apos;t need an account. When you open a link we record:</P>
      <UL>
        <li>
          Technical details: your browser&apos;s user agent, and the browser,
          operating system and device type we work out from it.
        </li>
        <li>
          Where you came from: the referring page and any utm_ campaign tags on
          the link.
        </li>
        <li>
          Approximate location (country, region and city) where available.
        </li>
        <li>
          Two hashed identifiers made from your IP address: one combined with
          your user agent, and one from the IP address alone. Both use a secret
          key, so we don&apos;t store your raw IP address with the view.
        </li>
        <li>
          Whether you were signed in to {LEGAL.product} (so owners&apos; own
          views can be excluded).
        </li>
        <li>
          Whether an advertisement was shown to you, used to decide whether the
          view counts towards earnings.
        </li>
      </UL>
      <P>
        Link owners see statistics and per-view technical details such as
        approximate location, device and referrer. They never see IP addresses.
      </P>

      <H3>Payments</H3>
      <P>
        Payouts are handled by Stripe. Stripe collects your identity and bank
        details directly, under its own privacy policy. We store your Stripe
        account ID, whether it can receive payouts, and our transfer records. We
        never see your bank details.
      </P>

      <H3>Contacting us</H3>
      <P>If you email us we keep the message and our reply.</P>

      <H2 id="why">3. Why we use it, and our legal basis</H2>
      <LegalTable
        head={["Purpose", "Legal basis (UK GDPR)"]}
        rows={[
          [
            "Running accounts, creating and serving links, and showing you analytics",
            "Contract: we need it to provide the service you asked for.",
          ],
          ["Calculating earnings and paying you", "Contract."],
          [
            "Keeping financial records and meeting tax and accounting duties",
            "Legal obligation.",
          ],
          [
            "Security, abuse prevention, and deciding whether views are genuine (bots, own-link views, repeated views from one network)",
            "Legitimate interests: protecting the service, advertisers and honest creators from fraud.",
          ],
          [
            "Checking link destinations and showing safety warnings",
            "Legitimate interests: keeping visitors safe.",
          ],
          [
            "Personalised advertising, and cookies or similar technologies that aren't strictly necessary",
            "Consent, which you can withdraw at any time (see our cookies page).",
          ],
        ]}
      />
      <P>
        Some decisions are made automatically, such as whether a view counts
        towards earnings. If you think one is wrong, email us and a person will
        review it.
      </P>

      <H2 id="share">4. Who we share data with</H2>
      <UL>
        <li>
          <strong>Stripe</strong> processes payouts and verifies the identity of
          people who want to be paid.
        </li>
        <li>
          <strong>Google</strong> (AdSense) serves and measures the ads on the
          short-link page. See section 5.
        </li>
        <li>
          <strong>GitHub</strong>, if you choose to sign in with it.
        </li>
        <li>
          <strong>Font Awesome</strong>, whose script we load for icons. Your
          browser contacts their servers when it does, which shares your IP
          address and browser details with them.
        </li>
        <li>
          Service providers such as hosting and email: [list your providers].
        </li>
        <li>
          Professional advisers, and authorities where the law requires it.
        </li>
      </UL>
      <P>We don&apos;t sell personal data.</P>

      <H2 id="ads">5. Advertising and Google</H2>
      <P>
        We show ads provided by Google AdSense on the short-link page. Third
        party vendors, including Google, use cookies to serve ads based on a
        user&apos;s prior visits to this and other websites. Google&apos;s use
        of advertising cookies enables it and its partners to serve ads to you
        based on your visit to this site and/or other sites on the internet.
      </P>
      <P>
        In the UK, the EEA and Switzerland, personalised ads only run with your
        consent. You can opt out of personalised advertising at{" "}
        <A href="https://adssettings.google.com">Google Ads Settings</A> or{" "}
        <A href="https://www.aboutads.info">aboutads.info</A>. To learn how
        Google uses data from sites that use its services, see{" "}
        <A href="https://policies.google.com/technologies/partner-sites">
          Google&apos;s partner sites page
        </A>
        .
      </P>

      <H2 id="transfers">6. Transfers outside the UK</H2>
      <P>
        Stripe, Google and some other providers process data in the United
        States and elsewhere. Where that happens we rely on safeguards the UK
        law recognises, such as the UK–US data bridge or standard contractual
        clauses with the UK addendum.
      </P>

      <H2 id="retention">7. How long we keep it</H2>
      <UL>
        <li>
          Account data: while your account is open, and for a short time after
          you close it.
        </li>
        <li>
          View records: for as long as the link exists, so analytics and
          earnings history stay accurate.
        </li>
        <li>
          Financial records: for the period tax law requires, typically six
          years in the UK.
        </li>
        <li>Support emails: as long as needed to deal with your request.</li>
      </UL>

      <H2 id="security">8. Security</H2>
      <P>
        Passwords (yours and link passwords) are stored hashed. Visitor IP
        addresses are hashed with a secret key. Access to production systems is
        restricted. No system is perfectly secure, and if a breach puts your
        rights at risk we will tell you and the regulator as the law requires.
      </P>

      <H2 id="rights">9. Your rights</H2>
      <P>
        You can ask us to access, correct, delete or restrict the use of your
        personal data, to move it to another service, and to object to uses
        based on legitimate interests. You can withdraw consent at any time from
        our{" "}
        <Link href="/cookies" className="text-accent underline">
          cookies page
        </Link>
        . Email <A href={`mailto:${LEGAL.email}`}>{LEGAL.email}</A> and we will
        reply within one month.
      </P>
      <P>
        If you&apos;re unhappy with how we handle your data, you can complain to
        the Information Commissioner&apos;s Office at{" "}
        <A href="https://ico.org.uk/make-a-complaint/">ico.org.uk</A>. We would
        appreciate the chance to put things right first.
      </P>

      <H2 id="children">10. Children</H2>
      <P>
        {LEGAL.product} accounts are for people aged 18 or over, and we
        don&apos;t knowingly collect data from children for accounts. Short
        links can be opened by anyone, and we don&apos;t target them at
        children.
      </P>

      <H2 id="changes">11. Changes to this policy</H2>
      <P>
        If we make material changes we&apos;ll tell account holders by email or
        in the app before they take effect, and update the date above.
      </P>
    </LegalPage>
  );
}
