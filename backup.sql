--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    job_id integer,
    action character varying(50) NOT NULL,
    old_status character varying(50),
    new_status character varying(50),
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_logs_id_seq OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- Name: applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.applications (
    id integer NOT NULL,
    user_id integer,
    job_id integer,
    status character varying(50) DEFAULT 'Pending'::character varying,
    cover_letter character varying(255),
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.applications OWNER TO postgres;

--
-- Name: applications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.applications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.applications_id_seq OWNER TO postgres;

--
-- Name: applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.applications_id_seq OWNED BY public.applications.id;


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jobs (
    id integer NOT NULL,
    user_id integer,
    company character varying(100) NOT NULL,
    "position" character varying(100) NOT NULL,
    status character varying(50) NOT NULL,
    date_applied date NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.jobs OWNER TO postgres;

--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jobs_id_seq OWNER TO postgres;

--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    application_id integer,
    message text NOT NULL,
    sent_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    verification_token character varying(255),
    is_verified boolean DEFAULT false,
    is_admin boolean DEFAULT false,
    phone character varying(20),
    bio text,
    location character varying(100),
    profile_picture character varying(255),
    skills text[],
    education_level character varying(50),
    education_grade character varying(50),
    age integer,
    experience text,
    cv_url character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reset_token character varying(255)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- Name: applications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications ALTER COLUMN id SET DEFAULT nextval('public.applications_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_logs (id, job_id, action, old_status, new_status, "timestamp") FROM stdin;
7	6	job_added	\N	\N	2025-09-27 20:35:33.798554
9	8	job_added	\N	\N	2025-10-06 11:14:00.888303
\.


--
-- Data for Name: applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.applications (id, user_id, job_id, status, cover_letter, applied_at) FROM stdin;
4	10	6	Pending	\N	2025-09-27 20:35:38.535745
6	10	8	Shortlisted	\N	2025-10-06 11:14:51.884471
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jobs (id, user_id, company, "position", status, date_applied, notes, created_at) FROM stdin;
6	10	horizon	Officer	Open	2025-09-27	gygg	2025-09-27 20:35:33.790669
8	10	Emrates Academy	Teacher	Open	2025-10-06	I just applied	2025-10-06 11:14:00.822335
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, application_id, message, sent_at) FROM stdin;
4	10	4	Application submitted successfully	2025-09-27 20:35:41.831442
5	10	4	Your application for Officer at horizon has been updated to: Shortlisted	2025-09-27 22:38:09.214491
6	10	4	Your application for Officer at horizon has been updated to: Rejected	2025-09-27 22:42:06.280582
7	10	4	Your application for Officer at horizon has been updated to: Shortlisted	2025-09-27 22:44:49.837986
8	10	4	Your application for Officer at horizon has been updated to: Pending	2025-09-27 22:44:55.472696
9	10	4	Your application for Officer at horizon has been updated to: Accepted	2025-09-27 22:44:59.896681
10	10	4	Your application for Officer at horizon has been updated to: Pending	2025-09-27 22:55:10.444597
11	10	4	Your application for Officer at horizon has been updated to: Shortlisted	2025-09-27 22:55:19.849587
12	10	4	Your application for Officer at horizon has been updated to: Accepted	2025-09-28 08:43:14.532602
13	10	4	Your application for Officer at horizon has been updated to: Shortlisted	2025-09-28 08:43:45.492069
14	10	4	Your application for Officer at horizon has been updated to: Rejected	2025-09-28 08:58:08.889002
15	10	4	Your application for Officer at horizon has been updated to: Accepted	2025-09-28 09:05:52.8822
16	10	4	Your application for Officer at horizon has been updated to: Pending	2025-09-28 09:08:14.72336
19	10	4	Your application for Officer at horizon has been updated to: Accepted	2025-09-28 23:20:19.691433
20	10	4	Your application for Officer at horizon has been updated to: Pending	2025-09-28 23:33:58.191722
21	10	4	Your application for Officer at horizon has been updated to: Accepted	2025-09-28 23:34:57.765856
22	10	4	Your application for Officer at horizon has been updated to: Rejected	2025-09-28 23:35:31.289051
23	10	4	Your application for Officer at horizon has been updated to: Shortlisted	2025-09-29 18:51:03.53242
24	10	4	Your application for Officer at horizon has been updated to: Rejected	2025-09-29 18:52:02.115089
25	10	4	Your application for Officer at horizon has been updated to: Accepted	2025-09-29 19:12:54.296862
26	10	4	Your application for Officer at horizon has been updated to: Rejected	2025-09-29 19:38:14.404498
27	10	4	Your application for Officer at horizon has been updated to: Shortlisted	2025-09-29 21:03:02.033261
28	10	4	Your application for Officer at horizon has been updated to: Pending	2025-09-29 21:10:17.450236
29	10	6	Application submitted successfully	2025-10-06 11:14:55.729689
30	10	6	Your application for Teacher at Emrates Academy has been updated to: Shortlisted	2025-10-06 11:18:02.857304
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password, verification_token, is_verified, is_admin, phone, bio, location, profile_picture, skills, education_level, education_grade, age, experience, cv_url, created_at, reset_token) FROM stdin;
16	Joshua 	khalifajibreel@yahoo.com	$2b$10$zKuoKWxvssw3zNQdrVbjverS4SO3t8NDUkFStMOMASlE2d7kPBRge	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImtoYWxpZmFqaWJyZWVsQHlhaG9vLmNvbSIsImlhdCI6MTc1OTc0NTQwNywiZXhwIjoxNzU5ODMxODA3fQ.YhteLOrmefpHwdkMcWeJqwXaj6LRBVGTrupiNkLyMJQ	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-10-06 11:10:07.788051	\N
11	Admin User	admin@jobtracker.com	$2a$12$m2tH6wUK5vPXr67LnNPO9ehZOEavIPzBmivJiLAQE493E9KBzsYG2	\N	t	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-09-27 17:05:58.915405	\N
10	Khalipha 	khalifajibreel@gmail.com	$2b$10$zIwES53Hf.uxmh.6wbnLweA7kPBLNcujsgATUU2F1pGXfsNC19P3u	\N	t	f	08066484726	I am dev	Kano	https://res.cloudinary.com/dtxxvwnqv/image/upload/v1759053150/job_tracker_profiles/xus7w4zlokfogitpusav.jpg	{React.js,Node.js}	Bachelor's	Second Class Upper	30	IT	https://res.cloudinary.com/dtxxvwnqv/image/upload/v1759055093/job_tracker_cvs/cbrbjy2ylcwqfmdmxwob.pdf	2025-09-27 16:39:34.493503	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImtoYWxpZmFqaWJyZWVsQGdtYWlsLmNvbSIsImlhdCI6MTc1OTE3Njg0NywiZXhwIjoxNzU5MTgwNDQ3fQ.mux50ff1ub7vlJSS6dk23L994QHVJUqH_jdJSIsD3sw
15	Joshua 	khalifajibreel@hotmail.com	$2b$10$inDmXXiLWy.rAZ1sXMIGOOtmqqDg3ih819kf.gcWjIPexzRLX50Oq	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImtoYWxpZmFqaWJyZWVsQGhvdG1haWwuY29tIiwiaWF0IjoxNzU5NzQ1Mjg4LCJleHAiOjE3NTk4MzE2ODh9.iKaXpzL330AuAQ7To2L4yjcuxCkUqgQjIYwgQEWe9Ek	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-10-06 11:08:08.536542	\N
\.


--
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 9, true);


--
-- Name: applications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.applications_id_seq', 6, true);


--
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.jobs_id_seq', 8, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 30, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 16, true);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: applications applications_user_id_job_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_user_id_job_id_key UNIQUE (user_id, job_id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: applications applications_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: applications applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

