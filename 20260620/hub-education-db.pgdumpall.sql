--
-- PostgreSQL database cluster dump
--

\restrict zynhxhHMwcFTg3saZo6Dn7lILH9xMbrY3z6FNPGTNDvS0jsNxfHrCB4lgS0KMhY

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE hubedu;
ALTER ROLE hubedu WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:WsXG0wZoXQRxRF6kmUX6Rg==$6eTLf1i2VOJIXCo0jXLVuVtpM+Pcb0Yk1627w4+gSqk=:ngm37K8csuZtYl09R6EXUu7Rvvk7+JWCfRjd7HsOnic=';

--
-- User Configurations
--








\unrestrict zynhxhHMwcFTg3saZo6Dn7lILH9xMbrY3z6FNPGTNDvS0jsNxfHrCB4lgS0KMhY

--
-- Databases
--

--
-- Database "template1" dump
--

\connect template1

--
-- PostgreSQL database dump
--

\restrict ixO8Rgq0Vlk6kHIllrAFRTZ3Stny1P5dqq9b3QixJukTBIwuPLkrXXy3uGUIl7e

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- PostgreSQL database dump complete
--

\unrestrict ixO8Rgq0Vlk6kHIllrAFRTZ3Stny1P5dqq9b3QixJukTBIwuPLkrXXy3uGUIl7e

--
-- Database "hubeducation" dump
--

--
-- PostgreSQL database dump
--

\restrict RWutFiHqlIsEZTEjpEAOQWL83rONj79dBbydVg4DOB2yAoD556rlIN1I7ZDxCRU

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: hubeducation; Type: DATABASE; Schema: -; Owner: hubedu
--

CREATE DATABASE hubeducation WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE hubeducation OWNER TO hubedu;

\unrestrict RWutFiHqlIsEZTEjpEAOQWL83rONj79dBbydVg4DOB2yAoD556rlIN1I7ZDxCRU
\connect hubeducation
\restrict RWutFiHqlIsEZTEjpEAOQWL83rONj79dBbydVg4DOB2yAoD556rlIN1I7ZDxCRU

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: hubedu
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO hubedu;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: hubedu
--

COMMENT ON SCHEMA public IS '';


--
-- Name: Role; Type: TYPE; Schema: public; Owner: hubedu
--

CREATE TYPE public."Role" AS ENUM (
    'USER',
    'ADMIN'
);


ALTER TYPE public."Role" OWNER TO hubedu;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO hubedu;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.accounts (
    id text NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    provider_account_id text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


ALTER TABLE public.accounts OWNER TO hubedu;

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.announcements (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.announcements OWNER TO hubedu;

--
-- Name: assignment_submissions; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.assignment_submissions (
    id integer NOT NULL,
    assignment_id integer NOT NULL,
    user_id text NOT NULL,
    "fileUrl" text,
    "fileName" text,
    "fileSize" integer,
    "submittedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    score integer,
    feedback text,
    "isLate" boolean DEFAULT false NOT NULL,
    status text DEFAULT 'submitted'::text NOT NULL,
    "googleDriveFileId" text,
    "googleDriveLink" text
);


ALTER TABLE public.assignment_submissions OWNER TO hubedu;

--
-- Name: assignment_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.assignment_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assignment_submissions_id_seq OWNER TO hubedu;

--
-- Name: assignment_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.assignment_submissions_id_seq OWNED BY public.assignment_submissions.id;


--
-- Name: assignments; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.assignments (
    id integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    instructions text,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "maxScore" integer DEFAULT 100 NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    difficulty text DEFAULT 'Medium'::text NOT NULL,
    "fileUrl" text,
    "fileSize" integer,
    "allowLateSubmission" boolean DEFAULT false NOT NULL,
    "lateSubmissionPenalty" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    author text NOT NULL,
    study_id integer,
    "googleDriveFolderId" text
);


ALTER TABLE public.assignments OWNER TO hubedu;

--
-- Name: assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assignments_id_seq OWNER TO hubedu;

--
-- Name: assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.assignments_id_seq OWNED BY public.assignments.id;


--
-- Name: chapter_progress; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.chapter_progress (
    id integer NOT NULL,
    user_id text NOT NULL,
    course_id text NOT NULL,
    chapter_id text NOT NULL,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "completedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.chapter_progress OWNER TO hubedu;

--
-- Name: chapter_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.chapter_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chapter_progress_id_seq OWNER TO hubedu;

--
-- Name: chapter_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.chapter_progress_id_seq OWNED BY public.chapter_progress.id;


--
-- Name: chapters; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.chapters (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    content text,
    duration integer,
    category text,
    difficulty text,
    tags text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    type text DEFAULT 'LMS'::text NOT NULL,
    cpu_limit text,
    docker_image text,
    env_vars text,
    expose_port integer,
    machine_enabled boolean DEFAULT false NOT NULL,
    machine_port integer,
    memory_limit text
);


ALTER TABLE public.chapters OWNER TO hubedu;

--
-- Name: completed_flags; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.completed_flags (
    id integer NOT NULL,
    user_id text NOT NULL,
    machine_name text NOT NULL,
    flag_type text NOT NULL,
    category text NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.completed_flags OWNER TO hubedu;

--
-- Name: completed_flags_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.completed_flags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.completed_flags_id_seq OWNER TO hubedu;

--
-- Name: completed_flags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.completed_flags_id_seq OWNED BY public.completed_flags.id;


--
-- Name: course_chapters; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.course_chapters (
    id text NOT NULL,
    "courseId" text NOT NULL,
    "chapterId" text NOT NULL,
    "order" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.course_chapters OWNER TO hubedu;

--
-- Name: course_enrollments; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.course_enrollments (
    id integer NOT NULL,
    course_id text NOT NULL,
    user_id text NOT NULL,
    "enrolledAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    progress double precision DEFAULT 0 NOT NULL,
    "lastAccessedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.course_enrollments OWNER TO hubedu;

--
-- Name: course_enrollments_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.course_enrollments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.course_enrollments_id_seq OWNER TO hubedu;

--
-- Name: course_enrollments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.course_enrollments_id_seq OWNED BY public.course_enrollments.id;


--
-- Name: course_lessons; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.course_lessons (
    id integer NOT NULL,
    course_id text NOT NULL,
    title text NOT NULL,
    description text,
    content text,
    video_url text,
    duration integer,
    order_index integer NOT NULL,
    "isPublished" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.course_lessons OWNER TO hubedu;

--
-- Name: course_lessons_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.course_lessons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.course_lessons_id_seq OWNER TO hubedu;

--
-- Name: course_lessons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.course_lessons_id_seq OWNED BY public.course_lessons.id;


--
-- Name: courses; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.courses (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    thumbnail text,
    category text NOT NULL,
    difficulty text NOT NULL,
    duration integer,
    author text NOT NULL,
    "instructorId" text,
    published boolean DEFAULT false NOT NULL,
    recommended boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.courses OWNER TO hubedu;

--
-- Name: discord_tokens; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.discord_tokens (
    id text NOT NULL,
    token text NOT NULL,
    discord_user_id text NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    used_at timestamp(3) without time zone,
    used_by text,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.discord_tokens OWNER TO hubedu;

--
-- Name: discussion_posts; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.discussion_posts (
    id integer NOT NULL,
    discussion_id integer NOT NULL,
    user_id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "isLocked" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.discussion_posts OWNER TO hubedu;

--
-- Name: discussion_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.discussion_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.discussion_posts_id_seq OWNER TO hubedu;

--
-- Name: discussion_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.discussion_posts_id_seq OWNED BY public.discussion_posts.id;


--
-- Name: discussion_replies; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.discussion_replies (
    id integer NOT NULL,
    post_id integer NOT NULL,
    user_id text NOT NULL,
    content text NOT NULL,
    parent_reply_id integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.discussion_replies OWNER TO hubedu;

--
-- Name: discussion_replies_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.discussion_replies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.discussion_replies_id_seq OWNER TO hubedu;

--
-- Name: discussion_replies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.discussion_replies_id_seq OWNED BY public.discussion_replies.id;


--
-- Name: discussions; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.discussions (
    id integer NOT NULL,
    course_id text,
    title text NOT NULL,
    description text,
    category text DEFAULT 'general'::text NOT NULL,
    "isLocked" boolean DEFAULT false NOT NULL,
    "isPinned" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.discussions OWNER TO hubedu;

--
-- Name: discussions_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.discussions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.discussions_id_seq OWNER TO hubedu;

--
-- Name: discussions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.discussions_id_seq OWNED BY public.discussions.id;


--
-- Name: grades; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.grades (
    id integer NOT NULL,
    user_id text NOT NULL,
    course_id text,
    quiz_id integer,
    assignment_id integer,
    "gradeType" text NOT NULL,
    score double precision NOT NULL,
    "maxScore" double precision NOT NULL,
    percentage double precision NOT NULL,
    grade text,
    feedback text,
    "gradedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    graded_by text
);


ALTER TABLE public.grades OWNER TO hubedu;

--
-- Name: grades_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.grades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.grades_id_seq OWNER TO hubedu;

--
-- Name: grades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.grades_id_seq OWNED BY public.grades.id;


--
-- Name: learning_progress; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.learning_progress (
    id integer NOT NULL,
    user_id text NOT NULL,
    course_id text NOT NULL,
    lesson_id integer NOT NULL,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "watchTime" integer DEFAULT 0 NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.learning_progress OWNER TO hubedu;

--
-- Name: learning_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.learning_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.learning_progress_id_seq OWNER TO hubedu;

--
-- Name: learning_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.learning_progress_id_seq OWNED BY public.learning_progress.id;


--
-- Name: learning_resources; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.learning_resources (
    id integer NOT NULL,
    course_id text,
    title text NOT NULL,
    description text,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_size integer NOT NULL,
    file_type text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    "downloadCount" integer DEFAULT 0 NOT NULL,
    "isPublic" boolean DEFAULT true NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    uploaded_by text NOT NULL
);


ALTER TABLE public.learning_resources OWNER TO hubedu;

--
-- Name: learning_resources_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.learning_resources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.learning_resources_id_seq OWNER TO hubedu;

--
-- Name: learning_resources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.learning_resources_id_seq OWNED BY public.learning_resources.id;


--
-- Name: learning_streaks; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.learning_streaks (
    id integer NOT NULL,
    user_id text NOT NULL,
    date date NOT NULL,
    points integer DEFAULT 10 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.learning_streaks OWNER TO hubedu;

--
-- Name: learning_streaks_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.learning_streaks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.learning_streaks_id_seq OWNER TO hubedu;

--
-- Name: learning_streaks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.learning_streaks_id_seq OWNED BY public.learning_streaks.id;


--
-- Name: machines; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.machines (
    id integer NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    difficulty text NOT NULL,
    "difficultyDistribution" jsonb NOT NULL,
    rating double precision NOT NULL,
    "userOwns" text NOT NULL,
    "systemOwns" integer NOT NULL,
    seasonal boolean NOT NULL,
    icon text,
    os text NOT NULL,
    "releaseDate" timestamp(3) without time zone NOT NULL,
    description text NOT NULL,
    points integer NOT NULL,
    tags text[],
    author text NOT NULL,
    port text NOT NULL,
    expose text NOT NULL,
    "rootFlag" text NOT NULL,
    category text NOT NULL,
    "dockerImage" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "fileSize" integer,
    "fileUrl" text,
    "uploadedAt" timestamp(3) without time zone
);


ALTER TABLE public.machines OWNER TO hubedu;

--
-- Name: machines_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.machines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.machines_id_seq OWNER TO hubedu;

--
-- Name: machines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.machines_id_seq OWNED BY public.machines.id;


--
-- Name: newsletter_subscribers; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.newsletter_subscribers (
    id text NOT NULL,
    email text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.newsletter_subscribers OWNER TO hubedu;

--
-- Name: quiz_answers; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.quiz_answers (
    id integer NOT NULL,
    attempt_id integer NOT NULL,
    question_id integer NOT NULL,
    answer text NOT NULL,
    "isCorrect" boolean DEFAULT false NOT NULL,
    points double precision DEFAULT 0 NOT NULL
);


ALTER TABLE public.quiz_answers OWNER TO hubedu;

--
-- Name: quiz_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.quiz_answers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quiz_answers_id_seq OWNER TO hubedu;

--
-- Name: quiz_answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.quiz_answers_id_seq OWNED BY public.quiz_answers.id;


--
-- Name: quiz_attempts; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.quiz_attempts (
    id integer NOT NULL,
    quiz_id integer NOT NULL,
    user_id text NOT NULL,
    score double precision DEFAULT 0 NOT NULL,
    "isPassed" boolean DEFAULT false NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "timeSpent" integer
);


ALTER TABLE public.quiz_attempts OWNER TO hubedu;

--
-- Name: quiz_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.quiz_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quiz_attempts_id_seq OWNER TO hubedu;

--
-- Name: quiz_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.quiz_attempts_id_seq OWNED BY public.quiz_attempts.id;


--
-- Name: quiz_questions; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.quiz_questions (
    id integer NOT NULL,
    quiz_id integer NOT NULL,
    question text NOT NULL,
    "questionType" text DEFAULT 'multiple_choice'::text NOT NULL,
    options jsonb,
    "correctAnswer" text NOT NULL,
    points integer DEFAULT 1 NOT NULL,
    order_index integer NOT NULL
);


ALTER TABLE public.quiz_questions OWNER TO hubedu;

--
-- Name: quiz_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.quiz_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quiz_questions_id_seq OWNER TO hubedu;

--
-- Name: quiz_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.quiz_questions_id_seq OWNED BY public.quiz_questions.id;


--
-- Name: quizzes; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.quizzes (
    id integer NOT NULL,
    course_id text,
    title text NOT NULL,
    description text,
    "timeLimit" integer,
    "passingScore" integer DEFAULT 70 NOT NULL,
    "maxAttempts" integer DEFAULT 3 NOT NULL,
    "isPublished" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.quizzes OWNER TO hubedu;

--
-- Name: quizzes_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.quizzes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quizzes_id_seq OWNER TO hubedu;

--
-- Name: quizzes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.quizzes_id_seq OWNED BY public.quizzes.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    session_token text NOT NULL,
    user_id text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO hubedu;

--
-- Name: stages; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.stages (
    id text NOT NULL,
    user_id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    "timestamp" text NOT NULL,
    tactic text NOT NULL,
    technique text NOT NULL,
    user_field text,
    asset text NOT NULL,
    iocs text NOT NULL,
    siem_url text,
    stage_order integer NOT NULL,
    session_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.stages OWNER TO hubedu;

--
-- Name: studies; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.studies (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    "maxMembers" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL
);


ALTER TABLE public.studies OWNER TO hubedu;

--
-- Name: studies_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.studies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.studies_id_seq OWNER TO hubedu;

--
-- Name: studies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.studies_id_seq OWNED BY public.studies.id;


--
-- Name: study_members; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.study_members (
    id integer NOT NULL,
    study_id integer NOT NULL,
    user_id text NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.study_members OWNER TO hubedu;

--
-- Name: study_members_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.study_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.study_members_id_seq OWNER TO hubedu;

--
-- Name: study_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.study_members_id_seq OWNED BY public.study_members.id;


--
-- Name: taskprogress; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.taskprogress (
    id integer NOT NULL,
    "trackProgressId" integer NOT NULL,
    "taskIndex" integer NOT NULL,
    "isCorrect" boolean DEFAULT false NOT NULL,
    "answeredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.taskprogress OWNER TO hubedu;

--
-- Name: taskprogress_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.taskprogress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.taskprogress_id_seq OWNER TO hubedu;

--
-- Name: taskprogress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.taskprogress_id_seq OWNED BY public.taskprogress.id;


--
-- Name: track_chapters; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.track_chapters (
    id text NOT NULL,
    "trackId" text NOT NULL,
    "chapterId" text NOT NULL,
    "order" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.track_chapters OWNER TO hubedu;

--
-- Name: track_completions; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.track_completions (
    id text NOT NULL,
    track_id text NOT NULL,
    user_id text NOT NULL,
    completed_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    total_chapters integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.track_completions OWNER TO hubedu;

--
-- Name: track_machines; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.track_machines (
    id text NOT NULL,
    "trackId" text NOT NULL,
    "machineId" integer NOT NULL,
    "pageUrl" text,
    description text,
    "orderIndex" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.track_machines OWNER TO hubedu;

--
-- Name: trackprogress; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.trackprogress (
    id integer NOT NULL,
    "userId" text NOT NULL,
    "trackId" text NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone
);


ALTER TABLE public.trackprogress OWNER TO hubedu;

--
-- Name: trackprogress_id_seq; Type: SEQUENCE; Schema: public; Owner: hubedu
--

CREATE SEQUENCE public.trackprogress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trackprogress_id_seq OWNER TO hubedu;

--
-- Name: trackprogress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hubedu
--

ALTER SEQUENCE public.trackprogress_id_seq OWNED BY public.trackprogress.id;


--
-- Name: tracks; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.tracks (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    content text,
    difficulty text NOT NULL,
    duration text NOT NULL,
    category text NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    "totalTasks" integer DEFAULT 0 NOT NULL,
    tags text[],
    published boolean DEFAULT false NOT NULL,
    "authorId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "attackBoxEnabled" boolean DEFAULT false NOT NULL,
    "cloudIdeEnabled" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.tracks OWNER TO hubedu;

--
-- Name: users; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.users (
    id text NOT NULL,
    name text,
    surname text,
    username text,
    email text,
    email_verified timestamp(3) without time zone,
    email_verification_token text,
    password_hash text,
    reset_password_token text,
    reset_password_token_expiery timestamp(3) without time zone,
    image text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role public."Role" DEFAULT 'USER'::public."Role" NOT NULL,
    "totalPoints" integer DEFAULT 0 NOT NULL,
    bio text,
    password_changed_at timestamp(3) without time zone,
    two_factor_enabled boolean DEFAULT false NOT NULL,
    two_factor_secret text
);


ALTER TABLE public.users OWNER TO hubedu;

--
-- Name: verification_tokens; Type: TABLE; Schema: public; Owner: hubedu
--

CREATE TABLE public.verification_tokens (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.verification_tokens OWNER TO hubedu;

--
-- Name: assignment_submissions id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.assignment_submissions ALTER COLUMN id SET DEFAULT nextval('public.assignment_submissions_id_seq'::regclass);


--
-- Name: assignments id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.assignments ALTER COLUMN id SET DEFAULT nextval('public.assignments_id_seq'::regclass);


--
-- Name: chapter_progress id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.chapter_progress ALTER COLUMN id SET DEFAULT nextval('public.chapter_progress_id_seq'::regclass);


--
-- Name: completed_flags id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.completed_flags ALTER COLUMN id SET DEFAULT nextval('public.completed_flags_id_seq'::regclass);


--
-- Name: course_enrollments id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.course_enrollments ALTER COLUMN id SET DEFAULT nextval('public.course_enrollments_id_seq'::regclass);


--
-- Name: course_lessons id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.course_lessons ALTER COLUMN id SET DEFAULT nextval('public.course_lessons_id_seq'::regclass);


--
-- Name: discussion_posts id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.discussion_posts ALTER COLUMN id SET DEFAULT nextval('public.discussion_posts_id_seq'::regclass);


--
-- Name: discussion_replies id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.discussion_replies ALTER COLUMN id SET DEFAULT nextval('public.discussion_replies_id_seq'::regclass);


--
-- Name: discussions id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.discussions ALTER COLUMN id SET DEFAULT nextval('public.discussions_id_seq'::regclass);


--
-- Name: grades id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.grades ALTER COLUMN id SET DEFAULT nextval('public.grades_id_seq'::regclass);


--
-- Name: learning_progress id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.learning_progress ALTER COLUMN id SET DEFAULT nextval('public.learning_progress_id_seq'::regclass);


--
-- Name: learning_resources id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.learning_resources ALTER COLUMN id SET DEFAULT nextval('public.learning_resources_id_seq'::regclass);


--
-- Name: learning_streaks id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.learning_streaks ALTER COLUMN id SET DEFAULT nextval('public.learning_streaks_id_seq'::regclass);


--
-- Name: machines id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.machines ALTER COLUMN id SET DEFAULT nextval('public.machines_id_seq'::regclass);


--
-- Name: quiz_answers id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.quiz_answers ALTER COLUMN id SET DEFAULT nextval('public.quiz_answers_id_seq'::regclass);


--
-- Name: quiz_attempts id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.quiz_attempts ALTER COLUMN id SET DEFAULT nextval('public.quiz_attempts_id_seq'::regclass);


--
-- Name: quiz_questions id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.quiz_questions ALTER COLUMN id SET DEFAULT nextval('public.quiz_questions_id_seq'::regclass);


--
-- Name: quizzes id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.quizzes ALTER COLUMN id SET DEFAULT nextval('public.quizzes_id_seq'::regclass);


--
-- Name: studies id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.studies ALTER COLUMN id SET DEFAULT nextval('public.studies_id_seq'::regclass);


--
-- Name: study_members id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.study_members ALTER COLUMN id SET DEFAULT nextval('public.study_members_id_seq'::regclass);


--
-- Name: taskprogress id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.taskprogress ALTER COLUMN id SET DEFAULT nextval('public.taskprogress_id_seq'::regclass);


--
-- Name: trackprogress id; Type: DEFAULT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.trackprogress ALTER COLUMN id SET DEFAULT nextval('public.trackprogress_id_seq'::regclass);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
d0880a92-c79f-4b47-9af2-3ff984b3483e	883f5ffb01841b6d8e821162c2bc6deb540f875890b3b9c1e1573a9963020578	2026-01-18 08:04:02.1291+00	20250712170709_add_machine_unique	\N	\N	2026-01-18 08:04:02.02317+00	1
1f5ac8f1-ce69-46d9-ac62-9bfd3cf93d4b	93d67ad4e8a20d4016e6baa14dd1d3c8bfd506826c2d0e9bd9bd591668a31555	2026-01-18 08:04:02.142872+00	20250731164207_add_stage_model	\N	\N	2026-01-18 08:04:02.13055+00	1
690f4ccf-74f5-41ff-9892-2b6c7366e47c	66e09ba0fbbda55fcf37f9afaeda53d5f62abce45c2fbb161dfdc2fd28320262	2026-01-18 08:04:02.389802+00	20251201153251_add_all_models	\N	\N	2026-01-18 08:04:02.144594+00	1
a315abd8-4afe-4956-adb1-63bc4ca69e91	a2e2538a2a9e22120435fadefe66b5fd60ee326fff0ad3bd779b470f03acd15d	2026-01-18 08:04:02.395713+00	20251201181315_add_course_recommended	\N	\N	2026-01-18 08:04:02.391096+00	1
cc81c5f4-fae5-43d9-ab75-108cfe25aa85	41f16b6f10cc9deddf1bbb1bcf20e0e802d6241966d26d4c02ebad0e2a7bd580	2026-01-29 17:51:03.174878+00	20251202175502_add_learning_streak	\N	\N	2026-01-29 17:51:03.131943+00	1
1110b986-d752-4457-80cb-c7dce7903f4f	0d9570f19ddae9211038ea07c35e313f71d12bcdab127c658727599d56f159b0	2026-01-29 17:51:03.830329+00	20260129175103	\N	\N	2026-01-29 17:51:03.811073+00	1
\.


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.accounts (id, user_id, type, provider, provider_account_id, refresh_token, access_token, expires_at, token_type, scope, id_token, session_state) FROM stdin;
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.announcements (id, title, content, is_pinned, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: assignment_submissions; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.assignment_submissions (id, assignment_id, user_id, "fileUrl", "fileName", "fileSize", "submittedAt", score, feedback, "isLate", status, "googleDriveFileId", "googleDriveLink") FROM stdin;
\.


--
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.assignments (id, title, description, instructions, "dueDate", "maxScore", category, difficulty, "fileUrl", "fileSize", "allowLateSubmission", "lateSubmissionPenalty", "isActive", "createdAt", "updatedAt", author, study_id, "googleDriveFolderId") FROM stdin;
\.


--
-- Data for Name: chapter_progress; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.chapter_progress (id, user_id, course_id, chapter_id, "isCompleted", "completedAt") FROM stdin;
\.


--
-- Data for Name: chapters; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.chapters (id, title, description, content, duration, category, difficulty, tags, "createdAt", "updatedAt", type, cpu_limit, docker_image, env_vars, expose_port, machine_enabled, machine_port, memory_limit) FROM stdin;
\.


--
-- Data for Name: completed_flags; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.completed_flags (id, user_id, machine_name, flag_type, category, points, "createdAt") FROM stdin;
\.


--
-- Data for Name: course_chapters; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.course_chapters (id, "courseId", "chapterId", "order", "createdAt") FROM stdin;
\.


--
-- Data for Name: course_enrollments; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.course_enrollments (id, course_id, user_id, "enrolledAt", "completedAt", progress, "lastAccessedAt") FROM stdin;
\.


--
-- Data for Name: course_lessons; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.course_lessons (id, course_id, title, description, content, video_url, duration, order_index, "isPublished", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.courses (id, title, description, thumbnail, category, difficulty, duration, author, "instructorId", published, recommended, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: discord_tokens; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.discord_tokens (id, token, discord_user_id, is_used, used_at, used_by, expires_at, created_at, updated_at) FROM stdin;
cmkjgkvka0000qu8n0557uws0	b8ba24273110a00cb0d82451f7d6ca	662104673674723377	f	\N	\N	2026-01-18 08:22:42.057	2026-01-18 08:12:42.058	2026-01-18 08:12:42.058
\.


--
-- Data for Name: discussion_posts; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.discussion_posts (id, discussion_id, user_id, title, content, "isLocked", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: discussion_replies; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.discussion_replies (id, post_id, user_id, content, parent_reply_id, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: discussions; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.discussions (id, course_id, title, description, category, "isLocked", "isPinned", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: grades; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.grades (id, user_id, course_id, quiz_id, assignment_id, "gradeType", score, "maxScore", percentage, grade, feedback, "gradedAt", graded_by) FROM stdin;
\.


--
-- Data for Name: learning_progress; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.learning_progress (id, user_id, course_id, lesson_id, "isCompleted", "watchTime", "completedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: learning_resources; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.learning_resources (id, course_id, title, description, file_url, file_name, file_size, file_type, category, "downloadCount", "isPublic", "uploadedAt", uploaded_by) FROM stdin;
\.


--
-- Data for Name: learning_streaks; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.learning_streaks (id, user_id, date, points, created_at) FROM stdin;
\.


--
-- Data for Name: machines; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.machines (id, slug, name, difficulty, "difficultyDistribution", rating, "userOwns", "systemOwns", seasonal, icon, os, "releaseDate", description, points, tags, author, port, expose, "rootFlag", category, "dockerImage", "createdAt", "updatedAt", "fileSize", "fileUrl", "uploadedAt") FROM stdin;
\.


--
-- Data for Name: newsletter_subscribers; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.newsletter_subscribers (id, email, created_at) FROM stdin;
\.


--
-- Data for Name: quiz_answers; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.quiz_answers (id, attempt_id, question_id, answer, "isCorrect", points) FROM stdin;
\.


--
-- Data for Name: quiz_attempts; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.quiz_attempts (id, quiz_id, user_id, score, "isPassed", "startedAt", "completedAt", "timeSpent") FROM stdin;
\.


--
-- Data for Name: quiz_questions; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.quiz_questions (id, quiz_id, question, "questionType", options, "correctAnswer", points, order_index) FROM stdin;
\.


--
-- Data for Name: quizzes; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.quizzes (id, course_id, title, description, "timeLimit", "passingScore", "maxAttempts", "isPublished", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.sessions (id, session_token, user_id, expires) FROM stdin;
\.


--
-- Data for Name: stages; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.stages (id, user_id, title, description, "timestamp", tactic, technique, user_field, asset, iocs, siem_url, stage_order, session_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: studies; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.studies (id, name, description, "maxMembers", "isActive", "createdAt", "updatedAt", "createdBy") FROM stdin;
\.


--
-- Data for Name: study_members; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.study_members (id, study_id, user_id, role, "joinedAt") FROM stdin;
\.


--
-- Data for Name: taskprogress; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.taskprogress (id, "trackProgressId", "taskIndex", "isCorrect", "answeredAt") FROM stdin;
\.


--
-- Data for Name: track_chapters; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.track_chapters (id, "trackId", "chapterId", "order", "createdAt") FROM stdin;
\.


--
-- Data for Name: track_completions; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.track_completions (id, track_id, user_id, completed_at, total_chapters, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: track_machines; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.track_machines (id, "trackId", "machineId", "pageUrl", description, "orderIndex", "createdAt") FROM stdin;
\.


--
-- Data for Name: trackprogress; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.trackprogress (id, "userId", "trackId", "startedAt", "completedAt") FROM stdin;
\.


--
-- Data for Name: tracks; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.tracks (id, title, description, content, difficulty, duration, category, progress, points, "totalTasks", tags, published, "authorId", "createdAt", "updatedAt", "attackBoxEnabled", "cloudIdeEnabled") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.users (id, name, surname, username, email, email_verified, email_verification_token, password_hash, reset_password_token, reset_password_token_expiery, image, created_at, role, "totalPoints", bio, password_changed_at, two_factor_enabled, two_factor_secret) FROM stdin;
cmklgzkcg0000t1012qqbazlu	\N	\N	ADMIN_Jiyong	20232231@bu.ac.kr	2026-01-19 17:59:39.712	\N	$2a$10$FLRPDUubq5Kijo/PvclGnudCgwAwQx1t65ZLfMlyRMdpE2UCX5Wme	\N	\N	/uploads/avatars/cmklgzkcg0000t1012qqbazlu-1769852771694.jpg	2026-01-19 17:59:39.713	USER	0	Hello\n	\N	f	\N
\.


--
-- Data for Name: verification_tokens; Type: TABLE DATA; Schema: public; Owner: hubedu
--

COPY public.verification_tokens (identifier, token, expires) FROM stdin;
\.


--
-- Name: assignment_submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.assignment_submissions_id_seq', 1, false);


--
-- Name: assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.assignments_id_seq', 1, false);


--
-- Name: chapter_progress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.chapter_progress_id_seq', 1, false);


--
-- Name: completed_flags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.completed_flags_id_seq', 1, false);


--
-- Name: course_enrollments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.course_enrollments_id_seq', 1, false);


--
-- Name: course_lessons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.course_lessons_id_seq', 1, false);


--
-- Name: discussion_posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.discussion_posts_id_seq', 1, false);


--
-- Name: discussion_replies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.discussion_replies_id_seq', 1, false);


--
-- Name: discussions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.discussions_id_seq', 1, false);


--
-- Name: grades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.grades_id_seq', 1, false);


--
-- Name: learning_progress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.learning_progress_id_seq', 1, false);


--
-- Name: learning_resources_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.learning_resources_id_seq', 1, false);


--
-- Name: learning_streaks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.learning_streaks_id_seq', 1, false);


--
-- Name: machines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.machines_id_seq', 1, false);


--
-- Name: quiz_answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.quiz_answers_id_seq', 1, false);


--
-- Name: quiz_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.quiz_attempts_id_seq', 1, false);


--
-- Name: quiz_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.quiz_questions_id_seq', 1, false);


--
-- Name: quizzes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.quizzes_id_seq', 1, false);


--
-- Name: studies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.studies_id_seq', 1, false);


--
-- Name: study_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.study_members_id_seq', 1, false);


--
-- Name: taskprogress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.taskprogress_id_seq', 1, false);


--
-- Name: trackprogress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hubedu
--

SELECT pg_catalog.setval('public.trackprogress_id_seq', 1, false);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: assignment_submissions assignment_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_pkey PRIMARY KEY (id);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: chapter_progress chapter_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.chapter_progress
    ADD CONSTRAINT chapter_progress_pkey PRIMARY KEY (id);


--
-- Name: chapters chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_pkey PRIMARY KEY (id);


--
-- Name: completed_flags completed_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.completed_flags
    ADD CONSTRAINT completed_flags_pkey PRIMARY KEY (id);


--
-- Name: course_chapters course_chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.course_chapters
    ADD CONSTRAINT course_chapters_pkey PRIMARY KEY (id);


--
-- Name: course_enrollments course_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_pkey PRIMARY KEY (id);


--
-- Name: course_lessons course_lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.course_lessons
    ADD CONSTRAINT course_lessons_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: discord_tokens discord_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.discord_tokens
    ADD CONSTRAINT discord_tokens_pkey PRIMARY KEY (id);


--
-- Name: discussion_posts discussion_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.discussion_posts
    ADD CONSTRAINT discussion_posts_pkey PRIMARY KEY (id);


--
-- Name: discussion_replies discussion_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.discussion_replies
    ADD CONSTRAINT discussion_replies_pkey PRIMARY KEY (id);


--
-- Name: discussions discussions_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_pkey PRIMARY KEY (id);


--
-- Name: grades grades_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_pkey PRIMARY KEY (id);


--
-- Name: learning_progress learning_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.learning_progress
    ADD CONSTRAINT learning_progress_pkey PRIMARY KEY (id);


--
-- Name: learning_resources learning_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.learning_resources
    ADD CONSTRAINT learning_resources_pkey PRIMARY KEY (id);


--
-- Name: learning_streaks learning_streaks_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.learning_streaks
    ADD CONSTRAINT learning_streaks_pkey PRIMARY KEY (id);


--
-- Name: machines machines_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_pkey PRIMARY KEY (id);


--
-- Name: newsletter_subscribers newsletter_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_pkey PRIMARY KEY (id);


--
-- Name: quiz_answers quiz_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.quiz_answers
    ADD CONSTRAINT quiz_answers_pkey PRIMARY KEY (id);


--
-- Name: quiz_attempts quiz_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id);


--
-- Name: quiz_questions quiz_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_pkey PRIMARY KEY (id);


--
-- Name: quizzes quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: stages stages_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.stages
    ADD CONSTRAINT stages_pkey PRIMARY KEY (id);


--
-- Name: studies studies_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.studies
    ADD CONSTRAINT studies_pkey PRIMARY KEY (id);


--
-- Name: study_members study_members_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.study_members
    ADD CONSTRAINT study_members_pkey PRIMARY KEY (id);


--
-- Name: taskprogress taskprogress_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.taskprogress
    ADD CONSTRAINT taskprogress_pkey PRIMARY KEY (id);


--
-- Name: track_chapters track_chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.track_chapters
    ADD CONSTRAINT track_chapters_pkey PRIMARY KEY (id);


--
-- Name: track_completions track_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.track_completions
    ADD CONSTRAINT track_completions_pkey PRIMARY KEY (id);


--
-- Name: track_machines track_machines_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.track_machines
    ADD CONSTRAINT track_machines_pkey PRIMARY KEY (id);


--
-- Name: trackprogress trackprogress_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.trackprogress
    ADD CONSTRAINT trackprogress_pkey PRIMARY KEY (id);


--
-- Name: tracks tracks_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT tracks_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: accounts_provider_provider_account_id_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX accounts_provider_provider_account_id_key ON public.accounts USING btree (provider, provider_account_id);


--
-- Name: assignment_submissions_assignment_id_user_id_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX assignment_submissions_assignment_id_user_id_key ON public.assignment_submissions USING btree (assignment_id, user_id);


--
-- Name: chapter_progress_user_id_course_id_chapter_id_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX chapter_progress_user_id_course_id_chapter_id_key ON public.chapter_progress USING btree (user_id, course_id, chapter_id);


--
-- Name: course_chapters_courseId_chapterId_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX "course_chapters_courseId_chapterId_key" ON public.course_chapters USING btree ("courseId", "chapterId");


--
-- Name: course_chapters_courseId_order_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX "course_chapters_courseId_order_key" ON public.course_chapters USING btree ("courseId", "order");


--
-- Name: course_enrollments_course_id_user_id_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX course_enrollments_course_id_user_id_key ON public.course_enrollments USING btree (course_id, user_id);


--
-- Name: discord_tokens_token_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX discord_tokens_token_key ON public.discord_tokens USING btree (token);


--
-- Name: learning_progress_user_id_course_id_lesson_id_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX learning_progress_user_id_course_id_lesson_id_key ON public.learning_progress USING btree (user_id, course_id, lesson_id);


--
-- Name: learning_streaks_user_id_date_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX learning_streaks_user_id_date_key ON public.learning_streaks USING btree (user_id, date);


--
-- Name: machines_name_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX machines_name_key ON public.machines USING btree (name);


--
-- Name: machines_slug_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX machines_slug_key ON public.machines USING btree (slug);


--
-- Name: newsletter_subscribers_email_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX newsletter_subscribers_email_key ON public.newsletter_subscribers USING btree (email);


--
-- Name: quiz_answers_attempt_id_question_id_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX quiz_answers_attempt_id_question_id_key ON public.quiz_answers USING btree (attempt_id, question_id);


--
-- Name: sessions_session_token_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX sessions_session_token_key ON public.sessions USING btree (session_token);


--
-- Name: studies_name_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX studies_name_key ON public.studies USING btree (name);


--
-- Name: study_members_study_id_user_id_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX study_members_study_id_user_id_key ON public.study_members USING btree (study_id, user_id);


--
-- Name: taskprogress_trackProgressId_taskIndex_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX "taskprogress_trackProgressId_taskIndex_key" ON public.taskprogress USING btree ("trackProgressId", "taskIndex");


--
-- Name: track_chapters_trackId_chapterId_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX "track_chapters_trackId_chapterId_key" ON public.track_chapters USING btree ("trackId", "chapterId");


--
-- Name: track_chapters_trackId_order_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX "track_chapters_trackId_order_key" ON public.track_chapters USING btree ("trackId", "order");


--
-- Name: track_completions_track_id_user_id_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX track_completions_track_id_user_id_key ON public.track_completions USING btree (track_id, user_id);


--
-- Name: track_machines_trackId_machineId_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX "track_machines_trackId_machineId_key" ON public.track_machines USING btree ("trackId", "machineId");


--
-- Name: trackprogress_userId_trackId_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX "trackprogress_userId_trackId_key" ON public.trackprogress USING btree ("userId", "trackId");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_email_verification_token_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX users_email_verification_token_key ON public.users USING btree (email_verification_token);


--
-- Name: users_reset_password_token_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX users_reset_password_token_key ON public.users USING btree (reset_password_token);


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


--
-- Name: verification_tokens_identifier_token_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX verification_tokens_identifier_token_key ON public.verification_tokens USING btree (identifier, token);


--
-- Name: verification_tokens_token_key; Type: INDEX; Schema: public; Owner: hubedu
--

CREATE UNIQUE INDEX verification_tokens_token_key ON public.verification_tokens USING btree (token);


--
-- Name: accounts accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assignment_submissions assignment_submissions_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assignment_submissions assignment_submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assignments assignments_study_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_study_id_fkey FOREIGN KEY (study_id) REFERENCES public.studies(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: chapter_progress chapter_progress_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.chapter_progress
    ADD CONSTRAINT chapter_progress_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chapter_progress chapter_progress_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.chapter_progress
    ADD CONSTRAINT chapter_progress_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chapter_progress chapter_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.chapter_progress
    ADD CONSTRAINT chapter_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: completed_flags completed_flags_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.completed_flags
    ADD CONSTRAINT completed_flags_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: course_chapters course_chapters_chapterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.course_chapters
    ADD CONSTRAINT "course_chapters_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES public.chapters(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: course_chapters course_chapters_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.course_chapters
    ADD CONSTRAINT "course_chapters_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: course_enrollments course_enrollments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: course_enrollments course_enrollments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: course_lessons course_lessons_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.course_lessons
    ADD CONSTRAINT course_lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: courses courses_instructorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT "courses_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: discussion_posts discussion_posts_discussion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.discussion_posts
    ADD CONSTRAINT discussion_posts_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.discussions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: discussion_posts discussion_posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.discussion_posts
    ADD CONSTRAINT discussion_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: discussion_replies discussion_replies_parent_reply_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.discussion_replies
    ADD CONSTRAINT discussion_replies_parent_reply_id_fkey FOREIGN KEY (parent_reply_id) REFERENCES public.discussion_replies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: discussion_replies discussion_replies_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.discussion_replies
    ADD CONSTRAINT discussion_replies_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.discussion_posts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: discussion_replies discussion_replies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.discussion_replies
    ADD CONSTRAINT discussion_replies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: discussions discussions_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: grades grades_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: grades grades_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: grades grades_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: grades grades_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: learning_progress learning_progress_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.learning_progress
    ADD CONSTRAINT learning_progress_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: learning_progress learning_progress_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.learning_progress
    ADD CONSTRAINT learning_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.course_lessons(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: learning_progress learning_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.learning_progress
    ADD CONSTRAINT learning_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: learning_resources learning_resources_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.learning_resources
    ADD CONSTRAINT learning_resources_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: learning_resources learning_resources_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.learning_resources
    ADD CONSTRAINT learning_resources_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: learning_streaks learning_streaks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.learning_streaks
    ADD CONSTRAINT learning_streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: quiz_answers quiz_answers_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.quiz_answers
    ADD CONSTRAINT quiz_answers_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.quiz_attempts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: quiz_answers quiz_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.quiz_answers
    ADD CONSTRAINT quiz_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.quiz_questions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: quiz_attempts quiz_attempts_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: quiz_attempts quiz_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: quiz_questions quiz_questions_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: quizzes quizzes_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stages stages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.stages
    ADD CONSTRAINT stages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: study_members study_members_study_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.study_members
    ADD CONSTRAINT study_members_study_id_fkey FOREIGN KEY (study_id) REFERENCES public.studies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: study_members study_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.study_members
    ADD CONSTRAINT study_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: taskprogress taskprogress_trackProgressId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.taskprogress
    ADD CONSTRAINT "taskprogress_trackProgressId_fkey" FOREIGN KEY ("trackProgressId") REFERENCES public.trackprogress(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: track_chapters track_chapters_chapterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.track_chapters
    ADD CONSTRAINT "track_chapters_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES public.chapters(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: track_chapters track_chapters_trackId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.track_chapters
    ADD CONSTRAINT "track_chapters_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES public.tracks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: track_completions track_completions_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.track_completions
    ADD CONSTRAINT track_completions_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.tracks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: track_machines track_machines_machineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.track_machines
    ADD CONSTRAINT "track_machines_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES public.machines(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: track_machines track_machines_trackId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.track_machines
    ADD CONSTRAINT "track_machines_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES public.tracks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trackprogress trackprogress_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.trackprogress
    ADD CONSTRAINT "trackprogress_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tracks tracks_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hubedu
--

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT "tracks_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: hubedu
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict RWutFiHqlIsEZTEjpEAOQWL83rONj79dBbydVg4DOB2yAoD556rlIN1I7ZDxCRU

--
-- Database "postgres" dump
--

\connect postgres

--
-- PostgreSQL database dump
--

\restrict pK8C1x9FD52RCC9WHoH4dGC5tOHGJseEGblj2pkQBH6scSQID8m2Nttp3bAT6UV

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- PostgreSQL database dump complete
--

\unrestrict pK8C1x9FD52RCC9WHoH4dGC5tOHGJseEGblj2pkQBH6scSQID8m2Nttp3bAT6UV

--
-- PostgreSQL database cluster dump complete
--

