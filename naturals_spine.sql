--
-- PostgreSQL database dump
--

\restrict PtFvMFoc8TC6JOCgVIj6fjxFHb2dax5EETxOJ9OecsBFxhCAcdAQk759H7Ki6mF

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

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
-- Name: EstadoOrden; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoOrden" AS ENUM (
    'EN_REVISION',
    'APROBADA',
    'EN_ENVIO',
    'CONCLUIDA',
    'CANCELADA'
);


--
-- Name: EstadoValidacion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoValidacion" AS ENUM (
    'PENDIENTE',
    'APROBADO',
    'RECHAZADO'
);


--
-- Name: Rol; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Rol" AS ENUM (
    'CLIENTE',
    'ADMIN'
);


--
-- Name: TipoDocumento; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TipoDocumento" AS ENUM (
    'RFC',
    'INE',
    'COMPROBANTE_DOMICILIO',
    'FACTURA',
    'REMISION',
    'CONTRATO',
    'COMPROBANTE_PAGO'
);


--
-- Name: TipoOrden; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TipoOrden" AS ENUM (
    'COMPRA',
    'RENTA'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: clientes_institucionales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes_institucionales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    rfc character varying(13) NOT NULL,
    razon_social character varying(255) NOT NULL,
    nombre_contacto character varying(255) NOT NULL,
    telefono character varying(20) NOT NULL,
    direccion_fiscal text NOT NULL,
    estado_validacion public."EstadoValidacion" DEFAULT 'PENDIENTE'::public."EstadoValidacion" NOT NULL,
    motivo_rechazo text,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: documentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid,
    orden_id uuid,
    tipo_documento public."TipoDocumento" NOT NULL,
    nombre_archivo character varying(255) NOT NULL,
    url_gcs character varying(500) NOT NULL,
    mime_type character varying(100) NOT NULL,
    tamano_bytes integer NOT NULL,
    fecha_carga timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    cargado_por uuid NOT NULL
);


--
-- Name: ordenes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ordenes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    tipo_orden public."TipoOrden" NOT NULL,
    descripcion_equipo text NOT NULL,
    estado public."EstadoOrden" DEFAULT 'EN_REVISION'::public."EstadoOrden" NOT NULL,
    bloqueado_para_cliente boolean DEFAULT false NOT NULL,
    notificacion_pendiente boolean DEFAULT false NOT NULL,
    monto_total numeric(12,2),
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_actualizacion timestamp without time zone NOT NULL,
    fecha_requerida timestamp(3) without time zone,
    hora_requerida character varying(5),
    ubicacion text,
    detalles_renta text,
    archivo_detalles_renta character varying(255),
    aclaracion_renta_enviada boolean DEFAULT false NOT NULL,
    alerta_24h_enviada boolean DEFAULT false NOT NULL,
    prioridad_notificada character varying(10) DEFAULT 'BAJA'::character varying NOT NULL,
    responsable_recepcion character varying(255),
    concluida_en timestamp(3) without time zone,
    oculta_cliente boolean DEFAULT false NOT NULL,
    oculta_admin boolean DEFAULT false NOT NULL,
    ultima_alerta_sin_cambio timestamp(3) without time zone
);


--
-- Name: order_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    orden_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    estado_anterior public."EstadoOrden" NOT NULL,
    estado_nuevo public."EstadoOrden" NOT NULL,
    comentario text,
    fecha_cambio timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id uuid NOT NULL,
    token text NOT NULL,
    usuario_id uuid NOT NULL,
    expira_en timestamp(3) without time zone NOT NULL,
    creado_en timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: personal_empresa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_empresa (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    numero_empleado character varying(20) NOT NULL,
    nombre_completo character varying(255) NOT NULL,
    departamento character varying(100)
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    correo_electronico character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    rol public."Rol" NOT NULL,
    activo boolean DEFAULT false NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modo_oscuro boolean
);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
71ea61d8-62e2-4ae5-88d4-15646b1c5a74	ce6970a3318a84eac9e5e723cb56ef9de533ff9e10b1947fd7a7a6608d3a3d71	2026-10-01 04:00:48.18064+00	20260921012903_init_schema	\N	\N	2026-10-01 04:00:48.068725+00	1
9ee59d01-8b92-4e98-970f-ddf7701a50eb	29673be4da00a9df1047620434b392e8e77bfd2b3f0301a4d4f949dc4c2559c4	2026-10-02 05:46:35.936414+00	20261002054635_add_password_reset_tokens	\N	\N	2026-10-02 05:46:35.89633+00	1
ce3ae6c2-f291-4a11-8a38-e6e849a26418	ab335a206bea94b7dff2e121d1286a8f29bf1a52a16982697ae97cc10441b2d8	2026-11-01 08:26:07.869942+00	20261101000000_order_request_details	\N	\N	2026-11-01 08:26:07.783227+00	1
0c9c01ab-cdf7-42af-9d27-feb2bfa9a2fc	da62d93a747d6399cd85c219d974cb58bfe520be316d8893ebb0378ac40a30af	2026-11-03 06:42:08.497534+00	20261103000000_cancelled_orders_retention_dark_mode	\N	\N	2026-11-03 06:42:08.421453+00	1
\.


--
-- Data for Name: clientes_institucionales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clientes_institucionales (id, usuario_id, rfc, razon_social, nombre_contacto, telefono, direccion_fiscal, estado_validacion, motivo_rechazo, creado_en) FROM stdin;
48c3e574-aace-4e68-992a-0a9eda0a5a56	279e6fea-d645-450f-ac71-1d0a59d64550	HAN901120ABC	Hospitales Ángeles S.A. de C.V.	Dra. Patricia Martínez	5512345678	Av. Ejército Nacional 600, CDMX	APROBADO	\N	2026-10-01 04:05:11.084
1d10b4bc-6db8-4772-9fdb-415bfc3621ec	fa08a1fe-ee4e-46b9-9141-44f110fefdb7	ABCD123456U99	John Connor Industries	Xavier Alexander del Prado	+525512345678	Calle 99 #33 Col. Sendero CDMX	RECHAZADO	wkwkwk	2026-10-16 02:19:20.165
d71c87c3-2491-4920-947c-ff7bbdf86066	58ef9c0c-32d2-4066-9e16-dc813b2ed32b	HASA090984A45	Hospital ESCOM	Jeffrey Alexander	+525532576390	Carpinteros 38, El Rosario, Tlalnepantla	APROBADO	\N	2026-10-16 13:21:08.454
abb0c697-11fa-474a-a1f7-412b6bee952b	27cfcc65-68e2-4f84-b47e-5fc9853c6928	AICA123456C23	Xavier Gómez	Carlos López	+525512345678	Calle Bolívares 650 Col. Mendoza, CDMX	APROBADO	\N	2026-10-19 16:16:53.216
15702f75-39d1-42a6-81d0-ff3b10fd82de	3187f15a-d5b6-41bb-97c8-7f4b8da17b57	ABCD123456U34	Javier Gonzáles	Dr. Carlos Pérez	+525512345678	Calle Manzano 60 Col. Porvenir	APROBADO	\N	2026-10-20 02:45:50.989
5fb213d3-ce16-4a9a-b3a4-97cba0d1f005	bf9e0f8d-717b-4d7c-bfe4-f913bd031200	ABCD123456XS2	Carlos 	Fernando	+521234567890	Calle 99 	RECHAZADO	de	2026-10-20 03:09:33.33
660f6392-67ea-4a24-9c88-fa00e062f628	50a7f541-a586-4f81-a516-3d6a350b5f90	ABCD123456B12	Hospital YoYo	Yoyo YOYO	+525512345678	Roma Norte, Roma, Ciudad de México, Cuauhtémoc, Ciudad de México, 06700, México	APROBADO	\N	2026-11-01 09:02:35.193
07436f59-d569-43b2-9224-de1a49f2a2f3	890f9182-a7de-4ef3-ba38-ab1eb32d0d6a	ABCD123456Q12	qqq	ee	+12345678	as	PENDIENTE	\N	2026-11-03 03:25:00.162
7ee82280-c199-442a-9195-153d14427b5f	6b377365-1393-4812-b16d-c683b10afe4e	AAAA123456A12	aa	aa	+521234567	Calle 29, General Ignacio Zaragoza, Ciudad de México, Venustiano Carranza, Ciudad de México, 15000, México	PENDIENTE	\N	2026-11-03 03:33:49.68
\.


--
-- Data for Name: documentos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documentos (id, cliente_id, orden_id, tipo_documento, nombre_archivo, url_gcs, mime_type, tamano_bytes, fecha_carga, cargado_por) FROM stdin;
a9b7c794-bc9f-4084-b0c2-f223b64a8cdc	\N	998f45a8-1124-4472-9644-1af0f4efb7de	REMISION	Mockups.pdf	local/1790948565353_81w25dk8_Mockups.pdf	application/pdf	733235	2026-10-02 13:42:45.365	1371fd73-b20d-4a53-a21c-4feb42ee8d53
baf27ce7-9fe0-46eb-a7f8-0570d48574d1	48c3e574-aace-4e68-992a-0a9eda0a5a56	998f45a8-1124-4472-9644-1af0f4efb7de	COMPROBANTE_PAGO	HorarioAlumno_2021630098.pdf	local/1790948759689_hy6jm778_HorarioAlumno_2021630098.pdf	application/pdf	377360	2026-10-02 13:45:59.699	279e6fea-d645-450f-ac71-1d0a59d64550
ea542da8-b02e-4d77-abb1-be4fe50a5282	1d10b4bc-6db8-4772-9fdb-415bfc3621ec	\N	RFC	HorarioAlumno_2021630098.pdf	local/1792117160171_e4db3374ad_HorarioAlumno_2021630098.pdf	application/pdf	377360	2026-10-16 02:19:20.179	fa08a1fe-ee4e-46b9-9141-44f110fefdb7
acff5bbb-36c6-447c-978d-f17e80d8e2b3	1d10b4bc-6db8-4772-9fdb-415bfc3621ec	\N	INE	CronogramaTT2_2026-B019.pdf	local/1792117160191_2e5edcbf1a_CronogramaTT2_2026-B019.pdf	application/pdf	1069230	2026-10-16 02:19:20.199	fa08a1fe-ee4e-46b9-9141-44f110fefdb7
a2a67712-0973-4f3a-bfbe-e885745e1972	1d10b4bc-6db8-4772-9fdb-415bfc3621ec	\N	COMPROBANTE_DOMICILIO	Mockups.pdf	local/1792117160197_ce58415e28_Mockups.pdf	application/pdf	733235	2026-10-16 02:19:20.205	fa08a1fe-ee4e-46b9-9141-44f110fefdb7
cabb16c2-2c82-4efa-aa79-6909712dfb86	d71c87c3-2491-4920-947c-ff7bbdf86066	\N	RFC	HorarioAlumno_2021630098.pdf	local/1792156868466_97cbbb19bf_HorarioAlumno_2021630098.pdf	application/pdf	377360	2026-10-16 13:21:08.475	58ef9c0c-32d2-4066-9e16-dc813b2ed32b
4039dbda-01da-416e-96f9-62ae12804099	d71c87c3-2491-4920-947c-ff7bbdf86066	\N	INE	CronogramaTT2_2026-B019.pdf	local/1792156868483_b92fc45d35_CronogramaTT2_2026-B019.pdf	application/pdf	1069230	2026-10-16 13:21:08.491	58ef9c0c-32d2-4066-9e16-dc813b2ed32b
186770df-2f13-4227-92d0-79226e812cd6	d71c87c3-2491-4920-947c-ff7bbdf86066	\N	COMPROBANTE_DOMICILIO	Mockups.pdf	local/1792156868496_edfef3dcc8_Mockups.pdf	application/pdf	733235	2026-10-16 13:21:08.502	58ef9c0c-32d2-4066-9e16-dc813b2ed32b
f724f8f1-675f-4ae0-a59f-4aeae4736806	abb0c697-11fa-474a-a1f7-412b6bee952b	\N	RFC	HorarioAlumno_2021630098.pdf	local/1792426613240_72083faa52_HorarioAlumno_2021630098.pdf	application/pdf	377360	2026-10-19 16:16:53.269	27cfcc65-68e2-4f84-b47e-5fc9853c6928
2c67f575-ccb1-4870-a252-b0c5c4ab77ce	abb0c697-11fa-474a-a1f7-412b6bee952b	\N	INE	Mockups.pdf	local/1792426613268_0ddfc8ab34_Mockups.pdf	application/pdf	733235	2026-10-19 16:16:53.29	27cfcc65-68e2-4f84-b47e-5fc9853c6928
06f1390d-4df9-48e4-8270-7f16da6d8a4d	abb0c697-11fa-474a-a1f7-412b6bee952b	\N	COMPROBANTE_DOMICILIO	CronogramaTT2_2026-B019.pdf	local/1792426613286_bb684edf4e_CronogramaTT2_2026-B019.pdf	application/pdf	1069230	2026-10-19 16:16:53.31	27cfcc65-68e2-4f84-b47e-5fc9853c6928
94792d02-e705-46a0-bc27-6f552b31f121	\N	3de81c07-304f-43c6-b627-0b4fd0c0f058	REMISION	Mockups.pdf	local/1792427324535_jcd0vgse_Mockups.pdf	application/pdf	733235	2026-10-19 16:28:44.568	1371fd73-b20d-4a53-a21c-4feb42ee8d53
ed646e4a-06e0-442f-a925-be5e6b0dfdad	48c3e574-aace-4e68-992a-0a9eda0a5a56	3de81c07-304f-43c6-b627-0b4fd0c0f058	COMPROBANTE_PAGO	HorarioAlumno_2021630098.pdf	local/1792427444902_7nuijuu1_HorarioAlumno_2021630098.pdf	application/pdf	377360	2026-10-19 16:30:44.913	279e6fea-d645-450f-ac71-1d0a59d64550
b38073ee-321f-415f-bfd8-a61f6d664fca	\N	3de81c07-304f-43c6-b627-0b4fd0c0f058	FACTURA	Mockups.pdf	local/1792428248330_ho836tox_Mockups.pdf	application/pdf	733235	2026-10-19 16:44:08.35	1371fd73-b20d-4a53-a21c-4feb42ee8d53
833befb4-6051-4654-b767-53e6f129ca01	15702f75-39d1-42a6-81d0-ff3b10fd82de	\N	RFC	Mockups.pdf	local/1792464351004_b23859abf4_Mockups.pdf	application/pdf	733235	2026-10-20 02:45:51.008	3187f15a-d5b6-41bb-97c8-7f4b8da17b57
8d0b7ff1-aa99-4c1c-94bc-e2d51a2a068a	15702f75-39d1-42a6-81d0-ff3b10fd82de	\N	INE	Mockups.pdf	local/1792464351018_e2d5892004_Mockups.pdf	application/pdf	733235	2026-10-20 02:45:51.022	3187f15a-d5b6-41bb-97c8-7f4b8da17b57
761667ee-3384-40e7-b90a-aa3edf8a17e2	15702f75-39d1-42a6-81d0-ff3b10fd82de	\N	COMPROBANTE_DOMICILIO	HorarioAlumno_2021630098.pdf	local/1792464351023_e169e3d29a_HorarioAlumno_2021630098.pdf	application/pdf	377360	2026-10-20 02:45:51.027	3187f15a-d5b6-41bb-97c8-7f4b8da17b57
7bb826fc-351f-404a-a2b9-92131ff320a7	5fb213d3-ce16-4a9a-b3a4-97cba0d1f005	\N	RFC	Mockups.pdf	local/1792465773339_b851781180_Mockups.pdf	application/pdf	733235	2026-10-20 03:09:33.347	bf9e0f8d-717b-4d7c-bfe4-f913bd031200
e692224b-e4f8-48f7-ade2-309c10e237ec	5fb213d3-ce16-4a9a-b3a4-97cba0d1f005	\N	INE	CronogramaTT2_2026-B019.pdf	local/1792465773351_f78edb1a3c_CronogramaTT2_2026-B019.pdf	application/pdf	1069230	2026-10-20 03:09:33.354	bf9e0f8d-717b-4d7c-bfe4-f913bd031200
8254f869-79c4-42d9-9584-aa83bb834709	5fb213d3-ce16-4a9a-b3a4-97cba0d1f005	\N	COMPROBANTE_DOMICILIO	HorarioAlumno_2021630098.pdf	local/1792465773357_5634d7b77c_HorarioAlumno_2021630098.pdf	application/pdf	377360	2026-10-20 03:09:33.359	bf9e0f8d-717b-4d7c-bfe4-f913bd031200
669b3f21-4e8d-44a7-8ab7-0c7ffaaa3311	\N	5c9aaee9-fe90-4aea-97b9-1daa13b72a57	REMISION	HorarioAlumno_2021630098.pdf	local/1793235727075_gsutu3hp_HorarioAlumno_2021630098.pdf	application/pdf	377360	2026-10-29 01:02:07.094	1371fd73-b20d-4a53-a21c-4feb42ee8d53
28042d4e-f8ea-4873-a714-19dd3fbc2643	48c3e574-aace-4e68-992a-0a9eda0a5a56	5c9aaee9-fe90-4aea-97b9-1daa13b72a57	COMPROBANTE_PAGO	Mockups.pdf	local/1793236272747_8ywt60aw_Mockups.pdf	application/pdf	733235	2026-10-29 01:11:12.761	279e6fea-d645-450f-ac71-1d0a59d64550
c6734861-911b-4221-a3fd-8aad44dca933	\N	5c9aaee9-fe90-4aea-97b9-1daa13b72a57	FACTURA	Mockups.pdf	local/1793236872418_pyrg08zl_Mockups.pdf	application/pdf	733235	2026-10-29 01:21:12.436	1371fd73-b20d-4a53-a21c-4feb42ee8d53
8c57554f-798c-4a76-9aba-24807dcf5b09	\N	86616c5c-4658-448f-a494-363112317846	REMISION	Mockups.pdf	local/1793513707596_lh7qx47h_Mockups.pdf	application/pdf	733235	2026-11-01 06:15:07.609	1371fd73-b20d-4a53-a21c-4feb42ee8d53
998b40cd-447f-4e9c-ae3d-f90b7272086a	48c3e574-aace-4e68-992a-0a9eda0a5a56	86616c5c-4658-448f-a494-363112317846	COMPROBANTE_PAGO	Solicitud_Empleo_Castelec.pdf	local/1793513874428_cznqo2ph_Solicitud_Empleo_Castelec.pdf	application/pdf	382478	2026-11-01 06:17:54.438	279e6fea-d645-450f-ac71-1d0a59d64550
4ed00b05-5485-411b-8718-e5c76e20c0e1	\N	82b9ceb7-e5af-43d7-b58e-88addd469d44	REMISION	Mockups.pdf	local/1793522097790_84s3a9cw_Mockups.pdf	application/pdf	733235	2026-11-01 08:34:57.903	1371fd73-b20d-4a53-a21c-4feb42ee8d53
57f67627-61b7-4123-b44f-34788c69e79e	48c3e574-aace-4e68-992a-0a9eda0a5a56	82b9ceb7-e5af-43d7-b58e-88addd469d44	COMPROBANTE_PAGO	Mockups.pdf	local/1793522245186_k99jv94e_Mockups.pdf	application/pdf	733235	2026-11-01 08:37:25.205	279e6fea-d645-450f-ac71-1d0a59d64550
732daaf8-f554-4bba-bc26-cf1edd741cdc	\N	682a0c7b-5cfa-49e0-a4cf-4ec6c7fce050	REMISION	HorarioAlumno_2021630098.pdf	local/1793522553064_ojsrkfse_HorarioAlumno_2021630098.pdf	application/pdf	377360	2026-11-01 08:42:33.082	1371fd73-b20d-4a53-a21c-4feb42ee8d53
32aa505e-9894-4575-b982-cbc5d7250ac0	\N	78e71fa7-62c9-4b65-b839-7ea855e7bbab	REMISION	Mockups.pdf	local/1793522572560_2tgbcvfb_Mockups.pdf	application/pdf	733235	2026-11-01 08:42:52.575	1371fd73-b20d-4a53-a21c-4feb42ee8d53
6f369c66-9048-4b0d-a615-1a123a5e75f3	48c3e574-aace-4e68-992a-0a9eda0a5a56	682a0c7b-5cfa-49e0-a4cf-4ec6c7fce050	COMPROBANTE_PAGO	Solicitud_Empleo_Castelec.pdf	local/1793522592792_sygt5kow_Solicitud_Empleo_Castelec.pdf	application/pdf	382478	2026-11-01 08:43:12.807	279e6fea-d645-450f-ac71-1d0a59d64550
6ef41194-302e-4372-9fea-869c0c2ade23	48c3e574-aace-4e68-992a-0a9eda0a5a56	78e71fa7-62c9-4b65-b839-7ea855e7bbab	COMPROBANTE_PAGO	HorarioAlumno_2021630098.pdf	local/1793522605858_0c96p7e1_HorarioAlumno_2021630098.pdf	application/pdf	377360	2026-11-01 08:43:25.876	279e6fea-d645-450f-ac71-1d0a59d64550
e504bcde-5d90-4474-bad1-bfb89c1a4bc1	660f6392-67ea-4a24-9c88-fa00e062f628	\N	RFC	Mockups.pdf	local/1793523755192_16d1296e9b_Mockups.pdf	application/pdf	733235	2026-11-01 09:02:35.207	50a7f541-a586-4f81-a516-3d6a350b5f90
0b63d0d1-d0c6-4e28-a88d-abcf7f15b871	660f6392-67ea-4a24-9c88-fa00e062f628	\N	INE	HorarioAlumno_2021630098.pdf	local/1793523755206_e8eb642f0a_HorarioAlumno_2021630098.pdf	application/pdf	377360	2026-11-01 09:02:35.218	50a7f541-a586-4f81-a516-3d6a350b5f90
3839fe73-c059-48ae-b1d5-714fba92fc69	660f6392-67ea-4a24-9c88-fa00e062f628	\N	COMPROBANTE_DOMICILIO	Solicitud_Empleo_Castelec.pdf	local/1793523755213_cf76fcd65e_Solicitud_Empleo_Castelec.pdf	application/pdf	382478	2026-11-01 09:02:35.226	50a7f541-a586-4f81-a516-3d6a350b5f90
7da0cd4d-236b-47be-897f-d0db227dca2b	660f6392-67ea-4a24-9c88-fa00e062f628	4a3a3e2d-e745-4fff-b9b1-c1f9e10fe847	CONTRATO	Solicitud_Empleo_Castelec.pdf	local/1793524009618_kp2xnbd2_Solicitud_Empleo_Castelec.pdf	application/pdf	382478	2026-11-01 09:06:49.638	50a7f541-a586-4f81-a516-3d6a350b5f90
05b1c76a-60a4-4747-8a2c-f87b6b7889ed	\N	fec851d4-5c99-4acc-ba3c-7dc024b585d5	REMISION	Mockups.pdf	local/1793582564420_k0c82k8h_Mockups.pdf	application/pdf	733235	2026-11-02 01:22:44.463	1371fd73-b20d-4a53-a21c-4feb42ee8d53
ea39a51f-210e-4fc2-bcd5-0314f3b06453	48c3e574-aace-4e68-992a-0a9eda0a5a56	fec851d4-5c99-4acc-ba3c-7dc024b585d5	COMPROBANTE_PAGO	Mockups.pdf	local/1793582670417_atga7ime_Mockups.pdf	application/pdf	733235	2026-11-02 01:24:30.437	279e6fea-d645-450f-ac71-1d0a59d64550
af417c83-dac8-4399-aac8-e80327958ec4	\N	fec851d4-5c99-4acc-ba3c-7dc024b585d5	FACTURA	Mockups.pdf	local/1793583065774_hfd4jrdf_Mockups.pdf	application/pdf	733235	2026-11-02 01:31:05.794	1371fd73-b20d-4a53-a21c-4feb42ee8d53
dd42fa8e-36cf-4393-9def-47f7b7bca570	48c3e574-aace-4e68-992a-0a9eda0a5a56	ccebcbd8-3dbd-48b4-8f1d-d8a4561c096e	CONTRATO	Mockups.pdf	local/1793584662238_3kzz6etx_Mockups.pdf	application/pdf	733235	2026-11-02 01:57:42.248	279e6fea-d645-450f-ac71-1d0a59d64550
66a4291f-ed0e-45e7-bcb6-12795855f077	\N	ccebcbd8-3dbd-48b4-8f1d-d8a4561c096e	REMISION	Mockups.pdf	local/1793584950487_2x7xn648_Mockups.pdf	application/pdf	733235	2026-11-02 02:02:30.516	1371fd73-b20d-4a53-a21c-4feb42ee8d53
76726c28-8033-4c8f-98b7-d18eba10a79f	48c3e574-aace-4e68-992a-0a9eda0a5a56	ccebcbd8-3dbd-48b4-8f1d-d8a4561c096e	COMPROBANTE_PAGO	Mockups.pdf	local/1793585059715_rqfl479v_Mockups.pdf	application/pdf	733235	2026-11-02 02:04:19.734	279e6fea-d645-450f-ac71-1d0a59d64550
5dc237b8-d2ef-4b5f-8f62-b514dd664742	\N	5485f1eb-3dc0-4910-8605-ccc3733a5b18	REMISION	Mockups.pdf	local/1793675521821_1zx5hnxl_Mockups.pdf	application/pdf	733235	2026-11-03 03:12:01.842	1371fd73-b20d-4a53-a21c-4feb42ee8d53
4eaadc01-f6af-42ef-8a63-c52d75e6008c	48c3e574-aace-4e68-992a-0a9eda0a5a56	5485f1eb-3dc0-4910-8605-ccc3733a5b18	COMPROBANTE_PAGO	Mockups.pdf	local/1793675710500_jz5m9mz9_Mockups.pdf	application/pdf	733235	2026-11-03 03:15:10.516	279e6fea-d645-450f-ac71-1d0a59d64550
94e12d33-2a56-4962-b380-40cd334eef07	07436f59-d569-43b2-9224-de1a49f2a2f3	\N	RFC	Mockups.pdf	local/1793676300167_1cbac9c154_Mockups.pdf	application/pdf	733235	2026-11-03 03:25:00.173	890f9182-a7de-4ef3-ba38-ab1eb32d0d6a
08e52e3a-13fd-489f-a6d2-3fb4c2b5197f	07436f59-d569-43b2-9224-de1a49f2a2f3	\N	INE	Mockups.pdf	local/1793676300178_0fd968520c_Mockups.pdf	application/pdf	733235	2026-11-03 03:25:00.183	890f9182-a7de-4ef3-ba38-ab1eb32d0d6a
081fcf88-e252-4cd1-8839-c3a1cb9fb4f6	07436f59-d569-43b2-9224-de1a49f2a2f3	\N	COMPROBANTE_DOMICILIO	Mockups.pdf	local/1793676300185_03b38825b3_Mockups.pdf	application/pdf	733235	2026-11-03 03:25:00.192	890f9182-a7de-4ef3-ba38-ab1eb32d0d6a
7f609628-83e0-42c3-a479-20ca09ea9480	7ee82280-c199-442a-9195-153d14427b5f	\N	RFC	Mockups.pdf	local/1793676829685_19956c1b45_Mockups.pdf	application/pdf	733235	2026-11-03 03:33:49.693	6b377365-1393-4812-b16d-c683b10afe4e
cc2163f6-4fac-4750-bec1-4f466b285f6c	7ee82280-c199-442a-9195-153d14427b5f	\N	INE	Mockups.pdf	local/1793676829697_8e5757a748_Mockups.pdf	application/pdf	733235	2026-11-03 03:33:49.706	6b377365-1393-4812-b16d-c683b10afe4e
48b0ea4f-fa6a-4c61-823f-7d4affe2162d	7ee82280-c199-442a-9195-153d14427b5f	\N	COMPROBANTE_DOMICILIO	Mockups.pdf	local/1793676829709_fb15cf3df0_Mockups.pdf	application/pdf	733235	2026-11-03 03:33:49.714	6b377365-1393-4812-b16d-c683b10afe4e
236d1442-aa96-4581-9123-8a98b7d9facb	\N	f725993b-eb5f-454d-b381-28be3ad2abf0	REMISION	Mockups.pdf	local/1793689857983_zzfch0ml_Mockups.pdf	application/pdf	733235	2026-11-03 07:10:57.997	1371fd73-b20d-4a53-a21c-4feb42ee8d53
e5bc1e76-3952-46ed-a995-6127991b34f9	48c3e574-aace-4e68-992a-0a9eda0a5a56	f725993b-eb5f-454d-b381-28be3ad2abf0	COMPROBANTE_PAGO	Mockups.pdf	local/1793689892389_uhisuf9l_Mockups.pdf	application/pdf	733235	2026-11-03 07:11:32.403	279e6fea-d645-450f-ac71-1d0a59d64550
\.


--
-- Data for Name: ordenes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ordenes (id, cliente_id, tipo_orden, descripcion_equipo, estado, bloqueado_para_cliente, notificacion_pendiente, monto_total, fecha_creacion, fecha_actualizacion, fecha_requerida, hora_requerida, ubicacion, detalles_renta, archivo_detalles_renta, aclaracion_renta_enviada, alerta_24h_enviada, prioridad_notificada, responsable_recepcion, concluida_en, oculta_cliente, oculta_admin, ultima_alerta_sin_cambio) FROM stdin;
f725993b-eb5f-454d-b381-28be3ad2abf0	48c3e574-aace-4e68-992a-0a9eda0a5a56	RENTA	YoYo SSS++	CONCLUIDA	t	t	\N	2026-11-03 07:10:31.153	2026-11-03 07:12:47.414	2026-11-07 18:00:00	01:10	Colones, 5, Camino Rojo, Rinconada de las Monedas 4ta Sección, Ciudad de México, Coyoacán, Ciudad Universitaria, Ciudad de México, 04700, México	\N	\N	f	f	MEDIA	Eo	2026-11-03 07:12:47.411	f	f	\N
86616c5c-4658-448f-a494-363112317846	48c3e574-aace-4e68-992a-0a9eda0a5a56	RENTA	Equipo solicitado: Testo | Fecha requerida: 2026-11-12 | Médico cirujano: Testo | Ubicación/quirófano: Testowkwk	EN_ENVIO	t	t	\N	2026-11-01 06:14:26.926	2026-11-03 03:12:07.563	\N	\N	\N	\N	\N	f	t	BAJA	\N	\N	f	f	\N
1688a7ee-8cd1-43b6-a398-644435d29a36	48c3e574-aace-4e68-992a-0a9eda0a5a56	COMPRA	Equipo solicitado: sss | Fecha requerida: 2026-10-08 | Ubicación/quirófano: cscs	EN_ENVIO	f	t	\N	2026-10-01 05:32:59.807	2026-11-03 07:00:26.502	\N	\N	\N	\N	\N	f	t	BAJA	\N	\N	f	f	2026-11-03 07:00:26.501
3de81c07-304f-43c6-b627-0b4fd0c0f058	48c3e574-aace-4e68-992a-0a9eda0a5a56	COMPRA	Equipo solicitado: Mesa para columna | Fecha requerida: 2026-10-30 | Médico cirujano: Aáron Ávila Cigarroa Aarón | Ubicación/quirófano: Calle 21 Col. Las Águilas	EN_ENVIO	t	t	\N	2026-10-19 16:22:01.423	2026-11-03 07:00:28.349	\N	\N	\N	\N	\N	f	t	BAJA	\N	\N	f	f	2026-11-03 07:00:28.348
e42e42c5-5537-4257-b424-601e1763dbd7	660f6392-67ea-4a24-9c88-fa00e062f628	COMPRA	XS\nMédico cirujano: xx	CONCLUIDA	f	t	\N	2023-11-01 09:23:05.087	2023-11-03 07:00:47.781	2023-11-04 18:00:00	07:25	aad	\N	\N	f	f	BAJA	\N	2026-11-01 09:23:59.595	f	f	\N
82b9ceb7-e5af-43d7-b58e-88addd469d44	48c3e574-aace-4e68-992a-0a9eda0a5a56	COMPRA	ssssssss	EN_ENVIO	t	t	\N	2026-11-01 08:31:56.189	2026-11-03 03:12:12.271	2026-11-09 18:00:00	22:32	Hospital, Calle Heberto Castillo, Colonia Villa Centroamericana y del Caribe, Ciudad de México, Tláhuac, Ciudad de México, 13278, México	\N	\N	f	t	MEDIA	\N	\N	f	f	\N
998f45a8-1124-4472-9644-1af0f4efb7de	48c3e574-aace-4e68-992a-0a9eda0a5a56	RENTA	Equipo solicitado: Mesa quirúrgica | Fecha requerida: 2026-10-15 | Ubicación/quirófano: Calle 1 Col. Porvenir	CONCLUIDA	t	t	\N	2022-10-02 13:41:13.834	2026-11-03 07:05:09.466	\N	\N	\N	\N	\N	f	f	BAJA	\N	2026-10-02 13:49:34.491	f	f	\N
682a0c7b-5cfa-49e0-a4cf-4ec6c7fce050	48c3e574-aace-4e68-992a-0a9eda0a5a56	RENTA	Wkekek\nMédico cirujano: John	CONCLUIDA	t	t	\N	2026-11-01 08:40:55.681	2026-11-01 08:45:54.182	2026-11-06 18:00:00	02:43	Estadio Cuauhtémoc, Calz. Ignacio Zaragoza 666, Parque Industrial, Calzada Ignacio Zaragoza, Fraccionamiento Maravillas, Puebla de Zaragoza, Municipio de Puebla, Puebla, 72220, México	eoeoeo	\N	t	f	MEDIA	\N	2026-11-01 08:45:54.182	f	f	\N
4a3a3e2d-e745-4fff-b9b1-c1f9e10fe847	660f6392-67ea-4a24-9c88-fa00e062f628	RENTA	Mesa YoYo Plus++\nMédico cirujano: Mini YoYo OP	CONCLUIDA	f	t	\N	2026-11-01 09:06:46.47	2026-11-01 09:08:17.888	2026-11-04 18:00:00	19:07	Oceanía, Avenida Río Consulado, Pensador Mexicano, Ciudad de México, Venustiano Carranza, Ciudad de México, 15510, México	\N	\N	f	f	BAJA	\N	2026-11-01 09:08:17.888	f	f	\N
78e71fa7-62c9-4b65-b839-7ea855e7bbab	48c3e574-aace-4e68-992a-0a9eda0a5a56	RENTA	NOOOO\nMédico cirujano: Xd	APROBADA	t	t	\N	2026-11-01 08:41:44.319	2026-11-03 03:12:06.025	2026-11-03 18:00:00	02:41	D'Gusta Pizza, Avenida Insurgentes, Tecomán, Colima, 28134, México	\N	\N	f	t	ALTA	\N	\N	f	f	\N
5c9aaee9-fe90-4aea-97b9-1daa13b72a57	48c3e574-aace-4e68-992a-0a9eda0a5a56	COMPRA	Equipo solicitado: Mesa de Cirugía | Médico cirujano: Aaron Avila | Ubicación/quirófano: ESCOM	CONCLUIDA	t	t	\N	2026-10-29 00:58:41.057	2026-10-29 01:22:09.103	\N	\N	\N	\N	\N	f	f	BAJA	\N	2026-10-29 01:22:09.103	f	f	\N
fec851d4-5c99-4acc-ba3c-7dc024b585d5	48c3e574-aace-4e68-992a-0a9eda0a5a56	RENTA	Mesa YoYo	CONCLUIDA	t	t	\N	2026-11-02 01:19:06.389	2026-11-02 01:31:07.833	2026-11-05 18:00:00	01:23	Hospital, Calle Heberto Castillo, Colonia Villa Centroamericana y del Caribe, Ciudad de México, Tláhuac, Ciudad de México, 13278, México	Mesa con defecto, costo de impuesto sinko peso	\N	t	f	MEDIA	\N	2026-11-02 01:31:07.833	f	f	\N
5485f1eb-3dc0-4910-8605-ccc3733a5b18	48c3e574-aace-4e68-992a-0a9eda0a5a56	RENTA	Mesa 123	CONCLUIDA	t	t	\N	2026-11-03 03:10:55.623	2026-11-03 03:17:09.65	2026-11-12 18:00:00	21:10	Caribe, Tizimín, Yucatán, México	wk	\N	t	f	BAJA	\N	2026-11-03 03:17:09.65	f	f	\N
ccebcbd8-3dbd-48b4-8f1d-d8a4561c096e	48c3e574-aace-4e68-992a-0a9eda0a5a56	COMPRA	Azzaro 9999999++++ SSSS XXX\nMédico cirujano: Sr. Velasquito De Parrales	CONCLUIDA	t	t	\N	2026-11-02 01:57:39.34	2026-11-03 03:17:41.514	2026-11-02 18:00:00	19:54	Churubusco, Salina Cruz, Oaxaca, 70690, México	\N	\N	f	f	ALTA	\N	2026-11-03 03:17:41.514	f	f	\N
\.


--
-- Data for Name: order_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_logs (id, orden_id, usuario_id, estado_anterior, estado_nuevo, comentario, fecha_cambio) FROM stdin;
73c8e234-56de-450f-b6ce-8ebab92fc813	1688a7ee-8cd1-43b6-a398-644435d29a36	279e6fea-d645-450f-ac71-1d0a59d64550	EN_REVISION	EN_REVISION	Apertura inicial de orden médica	2026-10-01 05:32:59.821
871bb326-9def-497a-8663-8658c0c95356	1688a7ee-8cd1-43b6-a398-644435d29a36	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	APROBADA	Actualización de estado por administración	2026-10-01 05:33:42.235
edf39c90-de93-4eec-8d0f-ed35be087ae1	1688a7ee-8cd1-43b6-a398-644435d29a36	1371fd73-b20d-4a53-a21c-4feb42ee8d53	APROBADA	EN_ENVIO	Actualización de estado por administración	2026-10-01 05:34:59.549
dae7ba9c-9372-4d41-a55f-69598a95a1a4	998f45a8-1124-4472-9644-1af0f4efb7de	279e6fea-d645-450f-ac71-1d0a59d64550	EN_REVISION	EN_REVISION	Apertura inicial de orden médica	2026-10-02 13:41:13.92
9ee81674-1d3d-4392-ab28-618fc5f7adef	998f45a8-1124-4472-9644-1af0f4efb7de	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	APROBADA	Actualización de estado por administración	2026-10-02 13:43:20.319
d592c444-9828-497b-ba67-cfab23094665	998f45a8-1124-4472-9644-1af0f4efb7de	1371fd73-b20d-4a53-a21c-4feb42ee8d53	APROBADA	EN_ENVIO	Aceptada, se enviará posteriormente	2026-10-02 13:47:03.068
cf1206e0-18fd-4f89-8980-e93e151f485f	3de81c07-304f-43c6-b627-0b4fd0c0f058	279e6fea-d645-450f-ac71-1d0a59d64550	EN_REVISION	EN_REVISION	Apertura inicial de orden médica	2026-10-19 16:22:01.431
23fa8ed8-e5a8-4dab-8a73-979685d6af20	3de81c07-304f-43c6-b627-0b4fd0c0f058	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	APROBADA	Actualización de estado por administración	2026-10-19 16:28:49.347
50328f64-48a5-46ab-8e49-b55b62924b5f	3de81c07-304f-43c6-b627-0b4fd0c0f058	1371fd73-b20d-4a53-a21c-4feb42ee8d53	APROBADA	EN_ENVIO	Actualización de estado por administración	2026-10-19 16:31:17.261
2aed68e4-dbb8-4ce6-83cd-5293d5d5d031	5c9aaee9-fe90-4aea-97b9-1daa13b72a57	279e6fea-d645-450f-ac71-1d0a59d64550	EN_REVISION	EN_REVISION	Apertura inicial de orden médica	2026-10-29 00:58:41.071
3f96f515-56d1-4d12-92b9-7c1076615705	5c9aaee9-fe90-4aea-97b9-1daa13b72a57	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	APROBADA	Actualización de estado por administración	2026-10-29 01:04:07.669
9d29b340-36f2-416e-9567-6a899bc1e075	5c9aaee9-fe90-4aea-97b9-1daa13b72a57	1371fd73-b20d-4a53-a21c-4feb42ee8d53	APROBADA	EN_ENVIO	Actualización de estado por administración	2026-10-29 01:12:40.997
4a00c25c-8237-4141-8cf8-0b48f7392bd6	5c9aaee9-fe90-4aea-97b9-1daa13b72a57	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_ENVIO	CONCLUIDA	Se finalizo la venta	2026-10-29 01:22:09.109
ae7a23ce-f9f2-41d7-9958-ff51d916c5f0	86616c5c-4658-448f-a494-363112317846	279e6fea-d645-450f-ac71-1d0a59d64550	EN_REVISION	EN_REVISION	Apertura inicial de orden médica	2026-11-01 06:14:26.949
223d540b-c55a-4389-a88d-c168dbd8ce02	86616c5c-4658-448f-a494-363112317846	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	APROBADA	Actualización de estado por administración	2026-11-01 06:15:15.13
1e2cc9b9-54db-4276-a840-a49e5ff82358	86616c5c-4658-448f-a494-363112317846	1371fd73-b20d-4a53-a21c-4feb42ee8d53	APROBADA	EN_ENVIO	Actualización de estado por administración	2026-11-01 06:21:08.886
6d19b09c-eb8c-4333-bac0-3aba16fb19f7	82b9ceb7-e5af-43d7-b58e-88addd469d44	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	EN_REVISION	Se adjuntó el documento Mockups.pdf.	2026-11-01 08:34:57.927
d8b2f86a-0663-4d4e-87a1-b3e935e0b6b5	82b9ceb7-e5af-43d7-b58e-88addd469d44	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	APROBADA	Actualización de estado por administración	2026-11-01 08:35:21.146
8a5c6290-7cbd-452b-8918-7b18be863f02	82b9ceb7-e5af-43d7-b58e-88addd469d44	279e6fea-d645-450f-ac71-1d0a59d64550	APROBADA	APROBADA	Se adjuntó el documento Mockups.pdf.	2026-11-01 08:37:25.224
29565eb6-97b9-4492-afdc-a8f3f2976abf	82b9ceb7-e5af-43d7-b58e-88addd469d44	1371fd73-b20d-4a53-a21c-4feb42ee8d53	APROBADA	EN_ENVIO	Actualización de estado por administración	2026-11-01 08:39:15.505
7e5e467f-435a-491f-9f33-6673b8f18822	682a0c7b-5cfa-49e0-a4cf-4ec6c7fce050	279e6fea-d645-450f-ac71-1d0a59d64550	EN_REVISION	EN_REVISION	Apertura inicial de orden médica	2026-11-01 08:40:55.689
25b04142-602c-4c85-b5a3-02e734f1024d	78e71fa7-62c9-4b65-b839-7ea855e7bbab	279e6fea-d645-450f-ac71-1d0a59d64550	EN_REVISION	EN_REVISION	Apertura inicial de orden médica	2026-11-01 08:41:44.325
a688a6e0-3325-4abd-aae5-e0e8b7d00f51	682a0c7b-5cfa-49e0-a4cf-4ec6c7fce050	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	EN_REVISION	Se adjuntó el documento HorarioAlumno_2021630098.pdf.	2026-11-01 08:42:33.095
7a42f03e-7887-4eb4-83be-f81a3c5a0ea6	682a0c7b-5cfa-49e0-a4cf-4ec6c7fce050	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	APROBADA	Actualización de estado por administración	2026-11-01 08:42:36.049
a855c746-ba57-47cb-81ba-4b28bf3a447c	78e71fa7-62c9-4b65-b839-7ea855e7bbab	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	EN_REVISION	Se adjuntó el documento Mockups.pdf.	2026-11-01 08:42:52.583
94c2a73e-7e71-4161-80ef-1ec9c2fe7a91	78e71fa7-62c9-4b65-b839-7ea855e7bbab	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	APROBADA	Actualización de estado por administración	2026-11-01 08:42:54.56
962cabb8-86d4-4cd5-94a9-b6959af63bba	682a0c7b-5cfa-49e0-a4cf-4ec6c7fce050	279e6fea-d645-450f-ac71-1d0a59d64550	APROBADA	APROBADA	Se adjuntó el documento Solicitud_Empleo_Castelec.pdf.	2026-11-01 08:43:12.833
979cd103-6a18-475f-8e62-098b95e5281e	682a0c7b-5cfa-49e0-a4cf-4ec6c7fce050	1371fd73-b20d-4a53-a21c-4feb42ee8d53	APROBADA	EN_ENVIO	Actualización de estado por administración	2026-11-01 08:44:01.721
f0e49a28-cd5a-42fe-b07a-db8fc1dba92f	682a0c7b-5cfa-49e0-a4cf-4ec6c7fce050	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_ENVIO	CONCLUIDA	dffff	2026-11-01 08:45:54.187
6215d9ee-2a91-43e5-b670-f050756fb353	e42e42c5-5537-4257-b424-601e1763dbd7	50a7f541-a586-4f81-a516-3d6a350b5f90	EN_REVISION	EN_REVISION	Apertura inicial de orden médica	2026-11-01 09:23:05.109
4770ab6d-e02e-43b2-a116-97e26b96b9f1	fec851d4-5c99-4acc-ba3c-7dc024b585d5	279e6fea-d645-450f-ac71-1d0a59d64550	EN_REVISION	EN_REVISION	Apertura inicial de orden médica	2026-11-02 01:19:06.434
ee320fff-fd08-4f2e-ae93-eb98453b2913	4a3a3e2d-e745-4fff-b9b1-c1f9e10fe847	50a7f541-a586-4f81-a516-3d6a350b5f90	EN_REVISION	EN_REVISION	Apertura inicial de orden médica	2026-11-01 09:06:46.479
7d2fa63e-022a-46cb-839f-670f12b3d095	4a3a3e2d-e745-4fff-b9b1-c1f9e10fe847	50a7f541-a586-4f81-a516-3d6a350b5f90	EN_REVISION	EN_REVISION	Se adjuntó el documento Solicitud_Empleo_Castelec.pdf.	2026-11-01 09:06:49.652
ec847773-7410-44cf-a9f3-518f3d43261e	4a3a3e2d-e745-4fff-b9b1-c1f9e10fe847	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	CONCLUIDA	NO cumples wkwk	2026-11-01 09:08:17.893
3b6479a7-4e46-4462-a5b0-6da6f275ff35	fec851d4-5c99-4acc-ba3c-7dc024b585d5	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	EN_REVISION	Se adjuntó el documento Mockups.pdf.	2026-11-02 01:22:44.497
15a81c25-89cf-41c2-be8e-8a254050d5fc	fec851d4-5c99-4acc-ba3c-7dc024b585d5	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	APROBADA	Actualización de estado por administración	2026-11-02 01:22:47.695
2f02de6c-e143-4f8a-8c56-7051422ec9a2	fec851d4-5c99-4acc-ba3c-7dc024b585d5	279e6fea-d645-450f-ac71-1d0a59d64550	APROBADA	APROBADA	Se adjuntó el documento Mockups.pdf.	2026-11-02 01:24:30.488
99ce57ee-fb8a-46e5-bcbe-d7337d80ed72	fec851d4-5c99-4acc-ba3c-7dc024b585d5	1371fd73-b20d-4a53-a21c-4feb42ee8d53	APROBADA	EN_ENVIO	Actualización de estado por administración	2026-11-02 01:28:54.811
515230de-234d-461d-b2dd-037a61966fc2	fec851d4-5c99-4acc-ba3c-7dc024b585d5	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_ENVIO	EN_ENVIO	Se adjuntó el documento Mockups.pdf.	2026-11-02 01:31:05.812
63bba367-3758-4c54-90cb-66bfde1a4193	fec851d4-5c99-4acc-ba3c-7dc024b585d5	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_ENVIO	CONCLUIDA	Ok	2026-11-02 01:31:07.836
a3dd653a-b183-4a3f-99e2-43a120098837	ccebcbd8-3dbd-48b4-8f1d-d8a4561c096e	279e6fea-d645-450f-ac71-1d0a59d64550	EN_REVISION	EN_REVISION	Apertura inicial de orden médica	2026-11-02 01:57:39.356
530fd91d-3fcf-45fb-b791-44a8c0677f84	ccebcbd8-3dbd-48b4-8f1d-d8a4561c096e	279e6fea-d645-450f-ac71-1d0a59d64550	EN_REVISION	EN_REVISION	Se adjuntó el documento Mockups.pdf.	2026-11-02 01:57:42.262
e49ed246-4696-4a66-9cf9-ff82ed5357ea	ccebcbd8-3dbd-48b4-8f1d-d8a4561c096e	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	EN_REVISION	Se adjuntó el documento Mockups.pdf.	2026-11-02 02:02:30.536
6bf29fe7-078a-47d7-a5d2-27b1e064628b	ccebcbd8-3dbd-48b4-8f1d-d8a4561c096e	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	APROBADA	Actualización de estado por administración	2026-11-02 02:02:38.342
15684828-4ce3-4bbf-b886-427b1db68c58	ccebcbd8-3dbd-48b4-8f1d-d8a4561c096e	279e6fea-d645-450f-ac71-1d0a59d64550	APROBADA	APROBADA	Se adjuntó el documento Mockups.pdf.	2026-11-02 02:04:19.761
626df915-a560-449b-ade2-e69001a78456	ccebcbd8-3dbd-48b4-8f1d-d8a4561c096e	1371fd73-b20d-4a53-a21c-4feb42ee8d53	APROBADA	EN_ENVIO	Actualización de estado por administración	2026-11-02 02:13:20.669
646e3896-c2ff-4db6-b7ef-42881bb5aa59	5485f1eb-3dc0-4910-8605-ccc3733a5b18	279e6fea-d645-450f-ac71-1d0a59d64550	EN_REVISION	EN_REVISION	Apertura inicial de orden médica	2026-11-03 03:10:55.64
a64435de-b700-4915-8521-78ae9cb98432	5485f1eb-3dc0-4910-8605-ccc3733a5b18	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	EN_REVISION	Se adjuntó el documento Mockups.pdf.	2026-11-03 03:12:01.859
1e9d41ea-4836-41df-9324-53b9f668a279	5485f1eb-3dc0-4910-8605-ccc3733a5b18	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	APROBADA	Actualización de estado por administración	2026-11-03 03:12:04.627
7d22f202-d29d-4203-ad30-e61a0da6f3d1	5485f1eb-3dc0-4910-8605-ccc3733a5b18	279e6fea-d645-450f-ac71-1d0a59d64550	APROBADA	APROBADA	Se adjuntó el documento Mockups.pdf.	2026-11-03 03:15:10.533
67dbf882-6aa2-4483-bdf3-1083fd0534bf	5485f1eb-3dc0-4910-8605-ccc3733a5b18	7189fe9c-09f3-4f98-818c-790363ec5be4	APROBADA	EN_ENVIO	Actualización de estado por administración	2026-11-03 03:15:59.541
4fd7a827-6dff-4ac9-8906-96a73a507c33	5485f1eb-3dc0-4910-8605-ccc3733a5b18	7189fe9c-09f3-4f98-818c-790363ec5be4	EN_ENVIO	CONCLUIDA	oka	2026-11-03 03:17:09.654
3bf5dc06-3a63-467d-bd1c-974636f520c6	ccebcbd8-3dbd-48b4-8f1d-d8a4561c096e	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_ENVIO	CONCLUIDA	oja	2026-11-03 03:17:41.52
b225c334-dedc-4d4b-8391-cdd59cb712ac	e42e42c5-5537-4257-b424-601e1763dbd7	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	CONCLUIDA	tu	2023-11-01 09:23:59.609
961ece95-98dd-4e33-843c-c422b443a61a	f725993b-eb5f-454d-b381-28be3ad2abf0	279e6fea-d645-450f-ac71-1d0a59d64550	EN_REVISION	EN_REVISION	Apertura inicial de orden médica	2026-11-03 07:10:31.157
aa6dec65-d0bd-4029-a297-8d83469fa84a	f725993b-eb5f-454d-b381-28be3ad2abf0	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	EN_REVISION	Se adjuntó remision.	2026-11-03 07:10:58.004
8e2a16ea-4bcb-4714-8d62-e2526f2b5ab0	f725993b-eb5f-454d-b381-28be3ad2abf0	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_REVISION	APROBADA	Actualización de estado por administración	2026-11-03 07:11:00.603
43516bb6-e6e8-44c0-b014-fe0ff658a44b	f725993b-eb5f-454d-b381-28be3ad2abf0	279e6fea-d645-450f-ac71-1d0a59d64550	APROBADA	APROBADA	Se adjuntó comprobante de pago.	2026-11-03 07:11:32.412
1dd5ff3c-eb85-4f35-ab7b-4b531a30e148	f725993b-eb5f-454d-b381-28be3ad2abf0	1371fd73-b20d-4a53-a21c-4feb42ee8d53	APROBADA	EN_ENVIO	Actualización de estado por administración	2026-11-03 07:12:07.532
6477aeed-8a65-469c-954c-1a5f317268d2	f725993b-eb5f-454d-b381-28be3ad2abf0	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EN_ENVIO	CONCLUIDA	Oka	2026-11-03 07:12:47.418
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_tokens (id, token, usuario_id, expira_en, creado_en) FROM stdin;
56e4ba6e-c4d7-450d-829e-39a18e9bef97	98b4c258944cd6c8e6e3ab96ac5beb6cce4b245a21f246272312056f496e2a68	58ef9c0c-32d2-4066-9e16-dc813b2ed32b	2026-10-29 01:49:43.98	2026-10-29 00:49:43.985
\.


--
-- Data for Name: personal_empresa; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.personal_empresa (id, usuario_id, numero_empleado, nombre_completo, departamento) FROM stdin;
b0aaeee9-def5-4bae-bb58-2d920d483520	1371fd73-b20d-4a53-a21c-4feb42ee8d53	EMP-001	Ing. Administrador General	Operaciones Clínicas
c056383e-1686-4f5b-83b3-c8fce942b467	7189fe9c-09f3-4f98-818c-790363ec5be4	EMP-002	John Connor R	Administración
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id, correo_electronico, password_hash, rol, activo, creado_en, modo_oscuro) FROM stdin;
fa08a1fe-ee4e-46b9-9141-44f110fefdb7	eo@eo.com	$2b$10$MDxw/8VFlp3KlqV229ypheLYHeXcsIPiL9ECHzphKwZhV2OjEKfi2	CLIENTE	f	2026-10-16 02:19:20.149	\N
58ef9c0c-32d2-4066-9e16-dc813b2ed32b	alcalarangeljeffrey@gmail.com	$2b$10$IerYV2/fpav4s8OA/8L2v.4EcfB21MaY2M13qC4USiquqVLai0JAq	CLIENTE	t	2026-10-16 13:21:08.433	\N
27cfcc65-68e2-4f84-b47e-5fc9853c6928	cliente@naturals.com	$2b$10$Ya2S0A1md99pxGhht4ebiOhadPZo9m4szR3hsrnHt5F5AKeBE9ONO	CLIENTE	t	2026-10-19 16:16:53.159	\N
3187f15a-d5b6-41bb-97c8-7f4b8da17b57	cliente@prueba.com	$2b$10$dQ5W3d/pVLucLzheBfgwSOUJrI.Y2B6yCaTHjW/5O.rcgC7WV0/O2	CLIENTE	t	2026-10-20 02:45:50.97	\N
bf9e0f8d-717b-4d7c-bfe4-f913bd031200	abcd@dominio.com	$2b$10$lSLK/6sWIGMDCw5R.MIM6ehC/hZYYCQznKjM/6ZJN3LO8CbRgx44a	CLIENTE	f	2026-10-20 03:09:33.321	\N
279e6fea-d645-450f-ac71-1d0a59d64550	contacto@hospitalangeles.com	$2b$10$t8uJxHO6Q.1CW9VKojOKZ.N6Na4G9ltUi4ME.5fKdj7AZIftP2eDy	CLIENTE	t	2026-10-01 04:05:11.084	t
50a7f541-a586-4f81-a516-3d6a350b5f90	caaron.aaroncigarroa@gmail.com	$2b$10$CpLSfODMwpUAAkNWr5FYduXUCgtECu//GPA/CjEOW16xkWjNrml8a	CLIENTE	t	2026-11-01 09:02:35.187	\N
7189fe9c-09f3-4f98-818c-790363ec5be4	aaron.axel1997@gmail.com	$2b$12$.6lyYG6MO/zgvbhKjLdykeQm.ED27cTM3iNhAqx5EwDmdX2X8Jn7a	ADMIN	t	2026-11-03 03:08:05.648	\N
890f9182-a7de-4ef3-ba38-ab1eb32d0d6a	ee@ee.com	$2b$10$se70ogVpwPjyOYfdqqElwep9o5f2e1H5KBn7BG/484rv44lslvBta	CLIENTE	f	2026-11-03 03:25:00.157	\N
6b377365-1393-4812-b16d-c683b10afe4e	aa@aa.com	$2b$10$ZWvTklM80JihrXSMcrHo..rFVnzHGyZ62ewom8AH9hX6ahLbJNAx2	CLIENTE	f	2026-11-03 03:33:49.673	\N
1371fd73-b20d-4a53-a21c-4feb42ee8d53	admin@naturalsspine.com	$2b$10$t8uJxHO6Q.1CW9VKojOKZ.N6Na4G9ltUi4ME.5fKdj7AZIftP2eDy	ADMIN	t	2026-10-01 04:05:11.046	f
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: clientes_institucionales clientes_institucionales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes_institucionales
    ADD CONSTRAINT clientes_institucionales_pkey PRIMARY KEY (id);


--
-- Name: documentos documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_pkey PRIMARY KEY (id);


--
-- Name: ordenes ordenes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_pkey PRIMARY KEY (id);


--
-- Name: order_logs order_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_logs
    ADD CONSTRAINT order_logs_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: personal_empresa personal_empresa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_empresa
    ADD CONSTRAINT personal_empresa_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: clientes_institucionales_rfc_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clientes_institucionales_rfc_key ON public.clientes_institucionales USING btree (rfc);


--
-- Name: clientes_institucionales_usuario_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clientes_institucionales_usuario_id_key ON public.clientes_institucionales USING btree (usuario_id);


--
-- Name: password_reset_tokens_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX password_reset_tokens_token_key ON public.password_reset_tokens USING btree (token);


--
-- Name: personal_empresa_numero_empleado_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX personal_empresa_numero_empleado_key ON public.personal_empresa USING btree (numero_empleado);


--
-- Name: personal_empresa_usuario_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX personal_empresa_usuario_id_key ON public.personal_empresa USING btree (usuario_id);


--
-- Name: usuarios_correo_electronico_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX usuarios_correo_electronico_key ON public.usuarios USING btree (correo_electronico);


--
-- Name: clientes_institucionales clientes_institucionales_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes_institucionales
    ADD CONSTRAINT clientes_institucionales_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: documentos documentos_cargado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_cargado_por_fkey FOREIGN KEY (cargado_por) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: documentos documentos_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes_institucionales(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: documentos documentos_orden_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ordenes ordenes_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes_institucionales(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: order_logs order_logs_orden_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_logs
    ADD CONSTRAINT order_logs_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_logs order_logs_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_logs
    ADD CONSTRAINT order_logs_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: password_reset_tokens password_reset_tokens_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: personal_empresa personal_empresa_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_empresa
    ADD CONSTRAINT personal_empresa_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict PtFvMFoc8TC6JOCgVIj6fjxFHb2dax5EETxOJ9OecsBFxhCAcdAQk759H7Ki6mF

