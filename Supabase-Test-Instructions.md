# Kids Library previews and Supabase live-account test

No Stripe account or payment service is needed for this test. No money is charged.

## Install website update

Upload all the ZIP contents into the existing ward-bulletin site, replacing matching files. Keep the existing assets and vendor folder. The PDF previews use the same vendor PDF renderer as the bulletin preview.

## Create the project

Use your existing Supabase login. Create a NEW project called Ward Bulletin Studio in a Free organization, if you have a free project slot available. Do not run the setup SQL in your other project's database.

## Initialize account tables

Open the new project's SQL Editor. Paste and run Supabase-Test-Setup.sql once. It creates account details and TEST plan access tables, with rules restricting each user to their own account. Test checkout is enabled for signed-in users in this test project.

This is a test-account foundation, not the final multi-editor ward membership or production subscription system.

## Configure authentication redirects

In Supabase Authentication > URL Configuration, set Site URL to:
https://hal22036.github.io/ward-bulletin/

Add this Redirect URL:
https://hal22036.github.io/ward-bulletin/account.html

Use your actual domain instead if hosting elsewhere. Keep email confirmation enabled. Supabase email delivery/rate limits may affect confirmation and reset emails during testing.

## Connect the website

From the project's Connect dialog, copy the Project URL and publishable key (legacy anon public key is also supported). No database password or service-role/secret key belongs in the browser.

Open the website's Account & plans page. Expand Connect Supabase, paste those two public values, and Connect. They are saved only in this browser. To configure the hosted website for every browser later, put the same PUBLIC values into cloud-config.js and upload it.

## Try a live account

Create an account using an email you control. Confirm the email if requested, then sign in. Enter your name and ward/branch under Account details and use Save account details to Supabase.

Select a plan and billing period. In Test checkout, check the acknowledgement and click Confirm test payment — $0 charged. The plan is stored on your signed-in account as TEST access. No card fields, payment request, invoice, or real subscription is created. Signing in again retrieves your test plan.

Passwords are handled by Supabase Auth; application profile tables do not store passwords.

## Library previews

Every locally uploaded Kids Program PDF shows its first page in the list. Click the preview to open the complete PDF in a new tab. Existing local PDFs also receive previews. Files remain in the current browser; shared cloud library files and cloud bulletin drafts are a later step.

## Before real subscriptions

Disable test checkout in SQL Editor:
update bulletin_private.test_checkout_settings set enabled=false where singleton=true;

Replace preview-only access with server-enforced production entitlements and real billing verification. These TEST plan records must never be treated as proof of payment.

## Verification

Verified PDF first-page previews in a browser at desktop/mobile sizes, persistence across reload, and existing bulletin regressions. The Supabase UI flow was tested against a simulated SDK, including secret-key rejection, sign-in, required test acknowledgement, plan restoration, and sign-out. Live project authentication and SQL policies still require verification against your new Supabase project.

Official references:
https://supabase.com/docs/guides/auth/passwords
https://supabase.com/docs/guides/getting-started/api-keys
https://supabase.com/docs/guides/database/postgres/row-level-security
