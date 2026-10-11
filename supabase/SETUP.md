# Supabase setup for MS Quistões

This folder contains the backend foundation. It is not live until a Supabase project is created and configured.

## 1. Create the free project
1. Open https://supabase.com/dashboard and create a project on the Free plan.
2. Open SQL Editor and run the full contents of `schema.sql`.
3. In Storage, create a bucket named `ms-questoes-photos` and leave it **private**. Do not add public read policies.

## 2. Create the Edge Function
1. Open Edge Functions and create a function named `ms-questoes`.
2. Paste the contents of `functions/ms-questoes/index.ts`.
3. Configure the function secrets:
   - `SUPABASE_URL`: Project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: service_role key (keep private; never put it in the website)
   - `SANDRO_PIN`: a private PIN of at least 4 characters
   - `MARTA_PIN`: a different private PIN of at least 4 characters
4. If the dashboard asks about JWT verification, disable it only because this function validates each participant using the separate PINs. Never publish the PINs in the website.
5. Deploy the function.

## 3. Important status
- The website is not yet connected to this backend. Do not enter credentials in `index.html`.
- The challenges table is private to the server. The function only returns the challenge active for the current date in its configured time zone, so future prompts are not sent to the browser.
- The photos are kept in a private Storage bucket and sent to the VisionSter image-analysis API. VisionSter is a third-party service; its free API has fair-use limits and may change. Avoid uploading sensitive photographs.
- The score is proposed by AI and stored with its written rationale. The AI can make mistakes; this is not a guarantee of perfect impartiality.
- This starter stores one current submission per participant per day. Re-submitting updates that participant's score for that day; old photo objects may need periodic cleanup.
- Once the Supabase project exists, the frontend can be connected without exposing the service-role key.

