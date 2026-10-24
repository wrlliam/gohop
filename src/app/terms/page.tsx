import Link from "next/link";
import { LEGAL } from "~/lib/legal";
import { A, H2, LegalPage, P, UL } from "~/components/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      intro={`The rules for using ${LEGAL.product} at ${LEGAL.domain}. By creating an account or using the service you agree to them.`}
    >
      <H2 id="who">1. Who we are</H2>
      <P>
        {LEGAL.product} is run by {LEGAL.operator} (&quot;we&quot;,
        &quot;us&quot;), of {LEGAL.address}. Contact us at{" "}
        <A href={`mailto:${LEGAL.email}`}>{LEGAL.email}</A>. How we use personal
        data is explained in our{" "}
        <Link href="/privacy" className="text-accent underline">
          privacy policy
        </Link>
        .
      </P>

      <H2 id="accounts">2. Accounts</H2>
      <UL>
        <li>You must be 18 or over to create an account.</li>
        <li>
          Give accurate details and keep them up to date. You&apos;re
          responsible for activity on your account and for keeping your sign-in
          details safe.
        </li>
        <li>
          One person, one account. Don&apos;t create extra accounts to get
          around a limit, a block or a fee.
        </li>
      </UL>

      <H2 id="links">3. Your links</H2>
      <P>
        You&apos;re responsible for every link you create and for what its
        destination contains. You must not create links to, or use{" "}
        {LEGAL.product} to promote:
      </P>
      <UL>
        <li>Anything illegal, or that infringes someone else&apos;s rights.</li>
        <li>Malware, phishing, scams or deceptive pages.</li>
        <li>
          Sexual content involving minors, or content that incites violence or
          hatred.
        </li>
        <li>
          Other link shorteners or redirect services, or chains of redirects.
        </li>
        <li>
          Content that would breach the policies of our advertising partners.
        </li>
      </UL>
      <P>
        We check destinations and may show visitors a warning, disable a link,
        or remove content at our discretion, with or without notice where we
        think that&apos;s necessary.
      </P>

      <H2 id="how-links-work">4. How links work</H2>
      <P>
        Visitors pass through a short page before reaching your destination.
        That page may show an advertisement, a password prompt, or a warning
        about the destination. Links can be switched off, can expire, or can
        reach a view limit, and visitors then see a message instead of the
        destination. We don&apos;t guarantee that any link will always be
        available.
      </P>

      <H2 id="earning">5. Earnings</H2>
      <P>
        You can earn a share of the advertising revenue we receive for views of
        your links. The details:
      </P>
      <UL>
        <li>
          <strong>Not guaranteed.</strong> Earnings depend on the revenue we
          actually receive. Ads may not appear on every view, and we may change
          or stop showing ads. We don&apos;t promise any amount.
        </li>
        <li>
          <strong>How it&apos;s calculated.</strong> For each period we close,
          the revenue for that period is divided between links in proportion to
          their billable views. There is no fixed rate per view.
        </li>
        <li>
          <strong>Billable views.</strong> A view counts only if a real visitor
          was shown an ad and we judge the view genuine. We exclude bots, the
          link owner&apos;s own views, repeated views from the same network,
          views on links with earning switched off, and anything we consider
          invalid. These decisions use automated checks. You can ask us to
          review one.
        </li>
        <li>
          <strong>Fees.</strong> We keep a platform fee from the revenue
          attributed to your links, and a flat fee on each withdrawal. The
          current percentage, flat fee, minimum withdrawal and hold period are
          shown on your monetisation page. We may change them on at least 30
          days&apos; notice. A change doesn&apos;t affect earnings already
          calculated.
        </li>
        <li>
          <strong>Hold period.</strong> New earnings become available to
          withdraw after a hold period, so that invalid traffic and adjustments
          from our ad partners can be dealt with first.
        </li>
        <li>
          <strong>Adjustments.</strong> We may withhold, reduce or reverse
          earnings that relate to invalid or fraudulent activity, to deductions
          made by our ad partners, to payment reversals, or to a breach of these
          terms. If an adjustment takes your balance below zero, it carries
          forward and is deducted from future earnings.
        </li>
        <li>
          <strong>Blocking.</strong> You can switch earning off for any of your
          links. No ads are shown on a link that has earning off.
        </li>
      </UL>

      <H2 id="conduct">6. Fair use of the earning system</H2>
      <P>You must not, and must not help anyone to:</P>
      <UL>
        <li>Click on, or ask or encourage others to click on, the ads.</li>
        <li>
          Pay, reward or otherwise incentivise people to open your links, or buy
          traffic.
        </li>
        <li>
          Use bots, scripts, repeated refreshing, proxies, VPNs or similar to
          create or inflate views.
        </li>
        <li>Open your own links to generate views.</li>
        <li>
          Interfere with, or try to avoid, the checks that decide which views
          count.
        </li>
      </UL>
      <P>
        If we believe you have, we may remove earnings (including those already
        paid, where the law allows), suspend or close your account, and report
        the matter to the relevant ad partner or authority.
      </P>

      <H2 id="payments">7. Payments and tax</H2>
      <UL>
        <li>
          Withdrawals are paid through Stripe. To be paid you must create a
          Stripe account and accept Stripe&apos;s terms, including its
          verification checks. We aren&apos;t responsible for Stripe&apos;s
          services, delays or decisions.
        </li>
        <li>
          You&apos;re responsible for any tax on your earnings and for declaring
          them where required. We may share information with tax authorities
          where the law requires.
        </li>
        <li>
          If we can&apos;t pay you (for example because your Stripe account
          isn&apos;t verified) the balance stays on your account.
        </li>
      </UL>

      <H2 id="ip">8. Intellectual property</H2>
      <P>
        We own the {LEGAL.product} service, brand and software. You keep
        ownership of your content. You give us permission to process, display
        and redirect to it as needed to run the service.
      </P>

      <H2 id="third-parties">9. Third-party sites</H2>
      <P>
        Destinations are controlled by other people. We aren&apos;t responsible
        for them, and a safety check isn&apos;t a guarantee that a destination
        is safe.
      </P>

      <H2 id="ending">10. Ending your account</H2>
      <P>
        You can close your account at any time by emailing us. We may suspend or
        close an account for breaking these terms, to meet a legal duty, or if
        we stop providing the service. When an account closes, its links stop
        working. Earnings that were genuinely earned and have passed the hold
        period will be paid out, less any adjustments under section 5, unless we
        closed the account for fraud or serious breach.
      </P>

      <H2 id="liability">11. Our responsibility to you</H2>
      <P>
        We provide the service with reasonable care and skill, but it&apos;s
        provided &quot;as is&quot;. We don&apos;t promise that it will be
        uninterrupted, error-free or that any link or earning estimate will be
        accurate.
      </P>
      <P>
        Nothing in these terms limits liability for death or personal injury
        caused by negligence, for fraud, or for anything else that can&apos;t
        lawfully be limited. Otherwise, we aren&apos;t liable for indirect or
        consequential loss, or for loss of profit, income or data, and our total
        liability to you in connection with the service is limited to the
        greater of £100 and the earnings paid to you in the 12 months before the
        claim.
      </P>

      <H2 id="changes">12. Changes</H2>
      <P>
        We may update these terms. For material changes we&apos;ll give at least
        30 days&apos; notice by email or in the app. If you keep using the
        service after that, you accept the new terms. If you don&apos;t, you can
        close your account.
      </P>

      <H2 id="law">13. Governing law</H2>
      <P>
        These terms are governed by the law of {LEGAL.governingLaw}, and the
        courts of {LEGAL.governingLaw} have jurisdiction. If you&apos;re a
        consumer living elsewhere in the UK you keep any rights you have to
        bring a claim in your home courts.
      </P>
    </LegalPage>
  );
}
