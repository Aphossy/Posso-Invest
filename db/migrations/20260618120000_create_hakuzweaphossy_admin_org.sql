-- Add missing organization membership fields and seed the admin organization/member
ALTER TABLE IF EXISTS public."member"
ADD COLUMN IF NOT EXISTS "member_number" text,
ADD COLUMN IF NOT EXISTS "title" text,
ADD COLUMN IF NOT EXISTS "department" text;

WITH inserted_user AS (
  INSERT INTO public."user" (
    id,
    name,
    email,
    email_verified,
    role,
    created_at,
    updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Hakuzwe Aphossy',
    'hakuzweaphossy@gmail.com',
    true,
    'admin',
    now(),
    now()
  )
  ON CONFLICT (email) DO UPDATE
  SET
    name = EXCLUDED.name,
    role = 'admin',
    email_verified = true,
    updated_at = now()
  RETURNING id
),
inserted_organization AS (
  INSERT INTO public."organization" (
    id,
    name,
    slug,
    logo,
    created_at,
    metadata,
    description
  )
  VALUES (
    '00000000-0000-0000-0000-000000000002',
    'TrustLink Group',
    'trustlink-group',
    NULL,
    now(),
    '{"type":"ikimina"}',
    'TrustLink Group default organization'
  )
  ON CONFLICT (slug) DO UPDATE
  SET
    name = EXCLUDED.name,
    metadata = EXCLUDED.metadata,
    description = EXCLUDED.description
  RETURNING id
),
existing_user AS (
  SELECT id FROM public."user" WHERE email = 'hakuzweaphossy@gmail.com'
),
existing_org AS (
  SELECT id FROM public."organization" WHERE slug = 'trustlink-group'
),
user_id AS (
  SELECT id FROM inserted_user
  UNION ALL
  SELECT id FROM existing_user WHERE NOT EXISTS (SELECT 1 FROM inserted_user)
),
org_id AS (
  SELECT id FROM inserted_organization
  UNION ALL
  SELECT id FROM existing_org WHERE NOT EXISTS (SELECT 1 FROM inserted_organization)
)
INSERT INTO public."member" (
  id,
  organization_id,
  user_id,
  role,
  created_at,
  member_number,
  title,
  department
)
SELECT
  '00000000-0000-0000-0000-000000000003',
  org_id.id,
  user_id.id,
  'admin',
  now(),
  'TLG-0001',
  'Controller',
  'Executive'
FROM user_id, org_id
WHERE NOT EXISTS (
  SELECT 1 FROM public."member"
  WHERE organization_id = org_id.id
    AND user_id = user_id.id
);
