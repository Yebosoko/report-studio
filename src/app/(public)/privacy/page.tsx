import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy policy" };
export const dynamic = "force-dynamic";

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy policy"
      intro={<p>This policy explains what personal data Report Studio collects, why, who it is shared with, and the rights you have over it. It is written to meet the Nigeria Data Protection Act 2023 and applies to everyone who visits the website or uses the service.</p>}
      sections={[
        ["Who we are", <>
          <p>Report Studio is an online service for preparing environmental and social safeguards reports and exporting them as Word documents. Report Studio is the data controller for the personal data described in this policy.</p>
          <p>You can contact us about privacy <Contact />.</p>
        </>],
        ["What we collect", <>
          <ul>
            <li><strong>Account details:</strong> your name, email address, password (stored only in scrambled, hashed form), organisation and role.</li>
            <li><strong>Your content:</strong> the reports, drafts, tables, images, logos and brand settings you add.</li>
            <li><strong>Usage records:</strong> when you sign in, create a report or export a Word file, and which plan you are on. We use these to run plan limits and to understand how the service is used.</li>
            <li><strong>Technical data:</strong> your IP address, browser type and error logs, collected automatically by our hosting provider to keep the service secure and working.</li>
            <li><strong>Payment records</strong> (once online payment is available): the plan, amount, date and payment reference. Card and bank details are entered with our payment provider and are not stored by us.</li>
          </ul>
          <p>Your reports may contain personal data about other people, such as names of project-affected persons or stakeholders. You decide what goes into your reports, and you are responsible for having a lawful basis to include that information. We process it only to provide the service to you.</p>
        </>],
        ["Why we use it and our legal basis", <>
          <ul>
            <li><strong>To provide the service</strong> you sign up for: your account, storing and displaying your reports, Word export and plan limits. Legal basis: performance of our contract with you.</li>
            <li><strong>To keep the service secure,</strong> prevent misuse and fix problems. Legal basis: our legitimate interest in running a safe, reliable service.</li>
            <li><strong>To improve the product,</strong> using counts and usage patterns, not the content of your reports. Legal basis: legitimate interest.</li>
            <li><strong>To send service emails,</strong> such as sign-up confirmation, password resets and important changes. Legal basis: performance of our contract.</li>
            <li><strong>To meet legal obligations,</strong> such as tax and accounting records for payments. Legal basis: legal obligation.</li>
          </ul>
          <p>We do not sell your personal data, and we do not use it for advertising.</p>
        </>],
        ["AI features", <>
          <p>Some plans include AI features (&ldquo;Structure with AI&rdquo; and &ldquo;Refine with AI&rdquo;). When you press one of these buttons, the draft text or section you are working on is sent to Anthropic, the provider of the Claude AI models, to produce the result. Nothing is sent to an AI service unless you press an AI button yourself.</p>
          <p>Anthropic processes this content on our behalf under its commercial terms, which do not permit it to use the content to train its models. AI output can be wrong; you remain responsible for checking it before you rely on or submit a report.</p>
        </>],
        ["Who we share it with", <>
          <p>We share personal data only with service providers that help us run Report Studio, under contracts that require them to protect it and use it only on our instructions:</p>
          <ul>
            <li><strong>Supabase</strong>: database, sign-in and file storage.</li>
            <li><strong>Vercel</strong>: website hosting.</li>
            <li><strong>Anthropic</strong>: AI processing, only when you use an AI feature.</li>
            <li><strong>Our payment provider</strong>: payment processing, once online payment is available.</li>
            <li><strong>Email delivery providers</strong>: sending service emails.</li>
          </ul>
          <p>We may also disclose data where the law requires it, or to protect the rights and safety of our users or the public.</p>
          <p>Report Studio staff do not open your reports, except where you ask us to for support or where the law requires it.</p>
        </>],
        ["International transfers", <>
          <p>Our providers store and process data on servers outside Nigeria, including in the European Union and the United States. Where data leaves Nigeria, we rely on safeguards recognised by the Nigeria Data Protection Act, such as contractual protections with each provider, and on providers that apply recognised security standards.</p>
        </>],
        ["How long we keep it", <>
          <ul>
            <li><strong>Account and reports:</strong> for as long as your account is open. You can delete individual reports at any time.</li>
            <li><strong>After you delete your account:</strong> your account, reports, images and brand kit are deleted straight away from the live service, and removed from backups within 30 days.</li>
            <li><strong>Payment and tax records:</strong> for as long as the law requires, usually six years.</li>
            <li><strong>Security logs:</strong> for a limited period, normally no more than 90 days.</li>
          </ul>
        </>],
        ["How we protect it", <>
          <p>Data is encrypted in transit (HTTPS). Each account can reach only its own reports, images and brand kit; this is enforced in the database itself as well as in the application. Passwords are stored only in hashed form. Access to administrative functions is restricted and recorded.</p>
          <p>No system is perfectly secure. If a breach affecting your personal data occurs, we will notify the Nigeria Data Protection Commission and, where required, you, within the time the law sets.</p>
        </>],
        ["Your rights", <>
          <p>Under the Nigeria Data Protection Act 2023 you have the right to:</p>
          <ul>
            <li>be told how your data is used (this policy);</li>
            <li>access your data and get a copy of it: use <strong>Account → Download my data</strong>;</li>
            <li>correct inaccurate data: edit your profile on the Account page, or contact us;</li>
            <li>have your data deleted: use <strong>Account → Delete my account</strong>;</li>
            <li>receive your data in a portable format (the download is a standard JSON file);</li>
            <li>object to processing based on legitimate interest, or ask us to restrict it;</li>
            <li>withdraw consent where we rely on it, without affecting earlier processing.</li>
          </ul>
          <p>To use any right that the Account page doesn&apos;t cover, contact us <Contact />. We will reply within 30 days. If you are not satisfied with our response, you can complain to the <strong>Nigeria Data Protection Commission</strong> (ndpc.gov.ng).</p>
        </>],
        ["Cookies", <>
          <p>We use only the cookies needed to keep you signed in and to keep the service secure. We do not use advertising or third-party tracking cookies, so we don&apos;t ask for cookie consent. The editor may also store small preferences in your browser.</p>
        </>],
        ["Children", <>
          <p>Report Studio is a professional service for adults. It is not intended for anyone under 18, and we do not knowingly collect their data. If you believe a child has created an account, contact us and we will delete it.</p>
        </>],
        ["Changes to this policy", <>
          <p>We may update this policy as the service changes. We will post the new version here with a new effective date and, for significant changes, tell signed-in users by email or in the app before they take effect.</p>
          <p>See also our <Link href="/terms">Terms of service</Link>.</p>
        </>]
      ]}
    />
  );
}
