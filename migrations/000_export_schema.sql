-- UP
CREATE TABLE ai_insight (
  insight_id uuid NOT NULL DEFAULT gen_random_uuid(),
  insight_type character varying,
  insight_title character varying NOT NULL,
  insight_content text NOT NULL,
  total_inquiry integer,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  positive_summary text,
  negative_summary text,
  recommendation text,
  total_positive integer DEFAULT 0,
  total_negative integer DEFAULT 0,
  total_hot integer DEFAULT 0,
  total_high_urgency integer DEFAULT 0,
  top_industry character varying,
  top_location character varying,
  top_product text,
  generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ai_insight_pkey PRIMARY KEY (insight_id)
);

CREATE TABLE ai_responses (
  record character varying,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT ai_responses_pk PRIMARY KEY (id)
);

CREATE TABLE analytics_dashboard (
  analytics_id uuid NOT NULL DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL,
  company character varying,
  customer_industry character varying,
  bahtera_industry character varying,
  product_inquiry text,
  reason_for_inquiry text,
  location character varying,
  inquiry_date timestamp without time zone,
  month integer,
  quarter integer,
  year integer,
  week integer,
  classification_confidence integer,
  classification_reason text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  sentiment character varying,
  urgency character varying,
  sales_priority character varying,
  inquiry_month_name character varying,
  inquiry_day_name character varying,
  inquiry_hour integer,
  created_date date,
  ai_insight_category character varying,
  business_action text,
  product_trend character varying,
  ai_summary text,
  insight_category character varying,
  business_solution text,
  ticket_status integer,
  assigned_user_id uuid,
  assigned_sales character varying,
  sales_industry character varying,
  sales_branch character varying,
  converted_to_erp boolean DEFAULT false,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT analytics_dashboard_inquiry_id_key UNIQUE (inquiry_id),
  CONSTRAINT analytics_dashboard_pkey PRIMARY KEY (analytics_id)
);

CREATE TABLE branch (
  branch_id uuid NOT NULL DEFAULT gen_random_uuid(),
  branch_name character varying NOT NULL,
  CONSTRAINT branch_pkey PRIMARY KEY (branch_id)
);

CREATE TABLE industry (
  industry_id uuid NOT NULL DEFAULT gen_random_uuid(),
  industry_name character varying NOT NULL,
  CONSTRAINT industry_pkey PRIMARY KEY (industry_id)
);

CREATE TABLE branch_industry (
  branch_industry_id uuid NOT NULL DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL,
  industry_id uuid NOT NULL,
  CONSTRAINT branch_industry_pkey PRIMARY KEY (branch_industry_id),
  CONSTRAINT fk_branch FOREIGN KEY (branch_id) REFERENCES branch(branch_id),
  CONSTRAINT fk_industry FOREIGN KEY (industry_id) REFERENCES industry(industry_id),
  CONSTRAINT unique_branch_industry UNIQUE (branch_id, industry_id)
);

CREATE TABLE chat_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  extraction_status character varying,
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id)
);

CREATE TABLE chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  role character varying NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT fk_chat_messages_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
);

CREATE TABLE inquiry (
  inquiry_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  name character varying,
  email character varying,
  phone character varying,
  company character varying,
  location character varying,
  industry character varying,
  industry_scale character varying,
  product_inquiry text,
  reason_for_inquiry text,
  consent_to_contact boolean DEFAULT false,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  type character varying,
  session_id uuid,
  CONSTRAINT inquiry_pkey PRIMARY KEY (inquiry_id),
  CONSTRAINT inquiry_session_id UNIQUE (session_id)
);

CREATE TABLE role (
  role_id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_name character varying NOT NULL,
  CONSTRAINT role_pkey PRIMARY KEY (role_id)
);

CREATE TABLE users (
  user_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_name character varying NOT NULL,
  user_email character varying NOT NULL,
  password text NOT NULL,
  role_id uuid,
  CONSTRAINT users_pkey PRIMARY KEY (user_id),
  CONSTRAINT users_user_email_key UNIQUE (user_email)
);

CREATE TABLE sales_person (
  sales_person_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_name character varying,
  branch character varying,
  industry character varying,
  user_name character varying,
  branch_id uuid,
  industry_id uuid,
  CONSTRAINT fk_sales_person_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT sales_person_pkey PRIMARY KEY (sales_person_id)
);

CREATE TABLE ticket (
  ticket_id uuid NOT NULL DEFAULT gen_random_uuid(),
  inquiry_id uuid,
  assigned_user_id uuid,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  closed_at timestamp without time zone,
  status integer,
  converted_to_erp boolean NOT NULL DEFAULT false,
  CONSTRAINT ticket_inquiry_id_unique UNIQUE (inquiry_id),
  CONSTRAINT ticket_pkey PRIMARY KEY (ticket_id)
);

CREATE TABLE user_branch (
  user_branch_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  CONSTRAINT fk_user_branch_branch FOREIGN KEY (branch_id) REFERENCES branch(branch_id),
  CONSTRAINT fk_user_branch_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT uq_user_branch UNIQUE (user_id, branch_id),
  CONSTRAINT user_branch_pkey PRIMARY KEY (user_branch_id)
);

CREATE TABLE user_industry (
  user_industry_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  industry_id uuid NOT NULL,
  CONSTRAINT fk_user_industry_industry FOREIGN KEY (industry_id) REFERENCES industry(industry_id),
  CONSTRAINT fk_user_industry_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT uq_user_industry UNIQUE (user_id, industry_id),
  CONSTRAINT user_industry_pkey PRIMARY KEY (user_industry_id)
);

CREATE INDEX idx_chat_sessions_extraction_pending ON public.chat_sessions USING btree (updated_at, extraction_status) WHERE ((extraction_status IS NULL) OR ((extraction_status)::text = 'pending'::text));

CREATE INDEX idx_chat_messages_session_created_at ON public.chat_messages USING btree (session_id, created_at);

CREATE INDEX idx_chat_messages_session_id ON public.chat_messages USING btree (session_id);

INSERT INTO industry (industry_id, industry_name) VALUES ('c2997ecb-f403-4042-86c9-78a9aeb71e93', 'Healthcare');
INSERT INTO industry (industry_id, industry_name) VALUES ('6ae9fb87-feca-4c16-a10e-f4f63b65fa33', 'F&B');
INSERT INTO industry (industry_id, industry_name) VALUES ('02ab53d5-ab53-4bf7-b8f1-58ff53c743c6', 'Agriculture');
INSERT INTO industry (industry_id, industry_name) VALUES ('ff540de9-5497-4f52-b673-b0187e2cbfdd', 'All');
INSERT INTO industry (industry_id, industry_name) VALUES ('85b8e6d9-61eb-45a3-947f-9233f7486c84', 'Industrial Solution');
INSERT INTO industry (industry_id, industry_name) VALUES ('af724f0b-53e5-47d0-8c7a-a05f9620281a', 'Personal & Household Care');
INSERT INTO industry (industry_id, industry_name) VALUES ('b9d4c884-93cc-46ca-a3cf-bbc81b403a79', 'Paper, Packaging & Eksport');
INSERT INTO industry (industry_id, industry_name) VALUES ('1d5cf461-5147-4ca1-a8a0-f6276b1702fb', 'Paper, Packaging & Export');

INSERT INTO branch (branch_id, branch_name) VALUES ('e3af4426-4bf8-4e20-a75b-e90089897d93', 'Jakarta');
INSERT INTO branch (branch_id, branch_name) VALUES ('0e59dea8-a840-444b-9768-7a9486a837b1', 'Semarang');
INSERT INTO branch (branch_id, branch_name) VALUES ('fc30a3ab-bb2e-41e1-a70c-3cf14e9948d8', 'Surabaya');
INSERT INTO branch (branch_id, branch_name) VALUES ('86b4897c-bcd9-48dd-9235-212516b5bd24', 'All');
INSERT INTO branch (branch_id, branch_name) VALUES ('d03a3d78-d43a-466f-89fc-489073843933', 'Cikarang');
INSERT INTO branch (branch_id, branch_name) VALUES ('1d4d6239-8fb1-4494-9c54-feeff72913d8', 'Karawang');
INSERT INTO branch (branch_id, branch_name) VALUES ('b921bc97-e91c-4a35-b2d3-b4733f8a0520', 'Jogja');

INSERT INTO role (role_id, role_name) VALUES ('2cf30899-ebdc-4b05-9efd-48998f642160', 'sales staff');
INSERT INTO role (role_id, role_name) VALUES ('395f72ef-f066-4f3c-86eb-4e65b7cec3ea', 'admin');
INSERT INTO role (role_id, role_name) VALUES ('687d1638-e9f8-47e8-90a7-e0c3603cdf28', 'head sales');
INSERT INTO role (role_id, role_name) VALUES ('9e75dd66-67c9-42ba-8589-1b70ab07f20b', 'product');

INSERT INTO users (user_id, user_name, user_email, password, role_id) VALUES ('5550d70a-01f6-44a0-9fc2-4629e0e92874', 'Admin', 'admin@company.com', '8eeff7049e5b1b19d0b43fdc:9c011adb662124cc2201c053f06f6cf5:43c22451bdf0', '395f72ef-f066-4f3c-86eb-4e65b7cec3ea');

-- DOWN
DROP TABLE IF EXISTS user_industry;
DROP TABLE IF EXISTS user_branch;
DROP TABLE IF EXISTS ticket;
DROP TABLE IF EXISTS sales_person;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS role;
DROP TABLE IF EXISTS inquiry;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_sessions;
DROP TABLE IF EXISTS branch_industry;
DROP TABLE IF EXISTS industry;
DROP TABLE IF EXISTS branch;
DROP TABLE IF EXISTS analytics_dashboard;
DROP TABLE IF EXISTS ai_responses;
DROP TABLE IF EXISTS ai_insight;
