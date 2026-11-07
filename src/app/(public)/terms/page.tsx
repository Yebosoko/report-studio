import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of service" };
export const dynamic = "force-dynamic";

export default function Terms() {
  return (
    <LegalPage
      title="Terms of service"
      intro={<p>These terms are an agreement between you and Report Studio for your use of the website and service. By creating an account or using the service, you accept them. If you use Report Studio on behalf of an organisation, you confirm that you are authorised to accept these terms for it.</p>}
      sections={[
        ["The service", <>
          <p>Report Studio lets you prepare reports from templates, edit designed sections such as tables, charts and key figures, and export them as editable Microsoft Word (.docx) files. Some plans include AI features that help structure and refine your text.</p>
          <p>We may improve, change or add features over time. We will not remove a core feature you are paying for during your billing period without telling you in advance.</p>
        </>],
        ["Your account", <>
          <ul>
            <li>You must be at least 18 and give accurate information when you sign up.</li>
            <li>Keep your password confidential. You are responsible for activity under your account; tell us promptly if you think someone else has used it.</li>
            <li>An account is for one person. Firms that need several users should contact us.</li>
          </ul>
        </>],
        ["Plans, payment and cancellation", <>
          <ul>
            <li>Each plan sets how many new reports you can start each month, which templates you can use and whether AI features are included. Current plans and prices are shown on the <Link href="/pricing">Pricing</Link> page.</li>
            <li>Paid plans are billed in advance, monthly or yearly, in Naira, and renew automatically until you cancel. You can cancel at any time from your Account page; your plan stays active until the end of the period you have paid for.</li>
            <li>Fees already paid are not refundable, except where the law requires a refund or we fail to provide the service you paid for.</li>
            <li>We may change prices for future billing periods. We will tell you at least 30 days before a change affects you, and you can cancel before it takes effect.</li>
            <li>If you cancel or a payment fails, your account moves to the free plan. Your existing reports remain available to open and download.</li>
          </ul>
        </>],
        ["Your content", <>
          <p>You own the reports, text, data, images and logos you put into Report Studio, and the Word files you export. You give us permission to store, process and display your content only as needed to provide the service to you, including sending it to our AI provider when you use an AI feature.</p>
          <p>You confirm that you have the right to use the content you upload, including logos, photographs and any personal data about other people in your reports, and that your use of it is lawful.</p>
        </>],
        ["AI features and professional responsibility", <>
          <p>AI features rearrange and rewrite the material you provide. They are designed to use only facts from your draft, but AI output can contain errors or omissions.</p>
          <p>Report Studio is a document preparation tool. It does not provide environmental, social, engineering, legal or regulatory advice. You are responsible for the accuracy, completeness and professional quality of your reports, and for their compliance with the requirements of clients, lenders and regulators, whether or not you used AI features to prepare them.</p>
        </>],
        ["Acceptable use", <>
          <p>You agree not to:</p>
          <ul>
            <li>use the service for anything unlawful, fraudulent or misleading, including falsifying data in reports;</li>
            <li>upload malware, or content that infringes someone else&apos;s rights;</li>
            <li>try to access other users&apos; accounts or data, or get around plan limits or security controls;</li>
            <li>overload, disrupt, scrape or reverse-engineer the service;</li>
            <li>resell or share access to the service without our written agreement.</li>
          </ul>
        </>],
        ["Our intellectual property", <>
          <p>The Report Studio software, website and template library, including layouts, cover designs, colour themes and section structures, belong to Report Studio. While you have an account, you may use them to create reports. Reports you export may include these designs, and you may use, share and submit those reports freely, including after your account ends. You may not copy the templates to build a competing product or service.</p>
        </>],
        ["Availability and support", <>
          <p>We work to keep Report Studio available and reliable, but we cannot promise it will always be uninterrupted or error-free. Planned maintenance will be kept short where possible. Keep your own copies of important documents by downloading them.</p>
        </>],
        ["Suspension and ending your account", <>
          <p>You can delete your account at any time from your Account page. This permanently deletes your reports and data, as described in our <Link href="/privacy">Privacy policy</Link>.</p>
          <p>We may suspend or close an account that seriously or repeatedly breaks these terms, fails to pay, or puts the service or other users at risk. Where reasonable, we will warn you first and give you a chance to download your reports.</p>
        </>],
        ["Disclaimers", <>
          <p>Except as set out in these terms, the service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the extent the law allows, we make no other promises about the service, including that it will meet every particular purpose. Nothing in these terms removes rights you have as a consumer under Nigerian law that cannot be excluded.</p>
        </>],
        ["Limitation of liability", <>
          <p>To the extent the law allows, Report Studio is not liable for indirect or consequential losses, or for loss of profits, revenue, contracts or data, arising from your use of the service. Our total liability to you for any claim relating to the service is limited to the fees you paid us in the 12 months before the claim arose, or ₦50,000 if that is greater.</p>
          <p>These limits do not apply to liability that cannot be limited by law, such as for fraud.</p>
        </>],
        ["Indemnity", <>
          <p>You agree to compensate Report Studio for reasonable losses and costs arising from claims by others that your content, or your use of the service in breach of these terms, infringed their rights or broke the law.</p>
        </>],
        ["Changes to these terms", <>
          <p>We may update these terms as the service changes. We will post the new version here with a new effective date and give signed-in users at least 14 days&apos; notice of significant changes. If you keep using the service after a change takes effect, the new terms apply; if you don&apos;t agree, you can cancel and delete your account.</p>
        </>],
        ["Governing law and disputes", <>
          <p>These terms are governed by the laws of the Federal Republic of Nigeria. If a dispute arises, please contact us first so we can try to resolve it informally. If it can&apos;t be resolved within 30 days, the courts of Lagos State, Nigeria, will have jurisdiction.</p>
        </>],
        ["Contact", <>
          <p>Questions about these terms? Contact us <Contact />.</p>
        </>]
      ]}
    />
  );
}
