-- ATHLY IQ — what the athlete agreed to, and when.
--
-- A clicked checkbox that leaves no record is not consent, it is a UI element.
-- This is the record: who agreed, to what, to which version of it, and at what
-- moment. All four are needed for the answer to "did they agree to this?" to be
-- anything other than an assurance.
--
-- **Versioned on purpose.** `document_version` is the version of the policy that
-- was on screen when they ticked the box. When the privacy policy changes in a
-- way that matters, the constant in `src/data/consentRepo.ts` is bumped and
-- every athlete is asked again — because agreeing to the old text is not
-- agreeing to the new one, and quietly treating it as though it were is the
-- exact thing consent exists to prevent.
--
-- One row per athlete per kind, replaced on re-consent. The history of *when
-- they first agreed* is deliberately not kept: it would be a second thing to
-- reason about in a deletion request, and the current agreement is what governs.

create type public.consent_kind as enum (
  -- The privacy policy and the terms of use, agreed together.
  'privacy',
  -- Sending a typed meal description to a third-party model to be read.
  'ai'
);

create table public.consents (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.consent_kind not null,
  -- The version on screen at the moment of agreement. A date string, matching
  -- the "Last updated" line on the document itself, so the two can be compared
  -- by a person and not only by code.
  document_version text not null check (length(document_version) between 1 and 40),
  agreed_at timestamptz not null default now(),
  primary key (user_id, kind)
);

alter table public.consents enable row level security;

-- Same four policies as everywhere else. An athlete may read and record their
-- own consent and nobody else's — including, notably, that nobody can record a
-- consent *on their behalf*.
create policy "consents are readable by their owner"
  on public.consents for select to authenticated using (auth.uid() = user_id);
create policy "consents are insertable by their owner"
  on public.consents for insert to authenticated with check (auth.uid() = user_id);
create policy "consents are updatable by their owner"
  on public.consents for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "consents are deletable by their owner"
  on public.consents for delete to authenticated using (auth.uid() = user_id);
