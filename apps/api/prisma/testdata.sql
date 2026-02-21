--
-- PostgreSQL database dump
--


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
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: -
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public.accounts DISABLE TRIGGER ALL;

COPY public.accounts (id, code, name, type, "parentId", description, "isActive", "sortOrder", "createdAt", "updatedAt", level, "nameEn") FROM stdin;
cmlgp6c2q0000ftjcj4gziwrh	101	현금	ASSET	\N	\N	t	1	2026-02-10 14:29:43.968	2026-02-10 14:33:06.267	1	\N
cmlgp6c4j000bftjc78fgeghd	123	상품	ASSET	\N	\N	t	12	2026-02-10 14:29:44.036	2026-02-10 14:33:06.315	1	\N
cmlgp6c4m000cftjcu0mmju6q	124	저장품	ASSET	\N	\N	t	13	2026-02-10 14:29:44.039	2026-02-10 14:33:06.319	1	\N
cmlgp6c4p000dftjcrh1gbkd0	130	비품	ASSET	\N	\N	t	14	2026-02-10 14:29:44.042	2026-02-10 14:33:06.322	1	\N
cmlgp6c4u000eftjcyyy9mtwk	131	기계장치	ASSET	\N	\N	t	15	2026-02-10 14:29:44.046	2026-02-10 14:33:06.326	1	\N
cmlgp6c4z000fftjc687jdc34	132	차량운반구	ASSET	\N	\N	t	16	2026-02-10 14:29:44.051	2026-02-10 14:33:06.333	1	\N
cmlgp6c53000gftjclyw0mdis	139	감가상각누계액	ASSET	\N	\N	t	17	2026-02-10 14:29:44.055	2026-02-10 14:33:06.336	1	\N
cmlgp6c56000hftjc17zxijy8	201	외상매입금	LIABILITY	\N	\N	t	18	2026-02-10 14:29:44.058	2026-02-10 14:33:06.34	1	\N
cmlgp6c59000iftjc4qmaukg8	202	미지급금	LIABILITY	\N	\N	t	19	2026-02-10 14:29:44.061	2026-02-10 14:33:06.344	1	\N
cmlgp6c5e000jftjclpijstxt	203	선수금	LIABILITY	\N	\N	t	20	2026-02-10 14:29:44.067	2026-02-10 14:33:06.35	1	\N
cmlgp6c5i000kftjc4heo0cza	204	예수금	LIABILITY	\N	\N	t	21	2026-02-10 14:29:44.071	2026-02-10 14:33:06.353	1	\N
cmlgp6c5l000lftjcavra4p72	205	미지급비용	LIABILITY	\N	\N	t	22	2026-02-10 14:29:44.074	2026-02-10 14:33:06.357	1	\N
cmlgp6c5p000mftjctsprkyo0	208	지급어음	LIABILITY	\N	\N	t	23	2026-02-10 14:29:44.077	2026-02-10 14:33:06.36	1	\N
cmlgp6c5v000nftjcurslnl6e	210	단기차입금	LIABILITY	\N	\N	t	24	2026-02-10 14:29:44.083	2026-02-10 14:33:06.366	1	\N
cmlgp6c60000oftjcr0zq4fpr	220	장기차입금	LIABILITY	\N	\N	t	25	2026-02-10 14:29:44.088	2026-02-10 14:33:06.371	1	\N
cmlgp6c63000pftjc97oix4ec	301	자본금	EQUITY	\N	\N	t	26	2026-02-10 14:29:44.091	2026-02-10 14:33:06.375	1	\N
cmlgp6c66000qftjccdt74m72	331	이익잉여금	EQUITY	\N	\N	t	27	2026-02-10 14:29:44.095	2026-02-10 14:33:06.382	1	\N
cmlgp6c6b000rftjciobn9hln	401	상품매출	REVENUE	\N	\N	t	28	2026-02-10 14:29:44.099	2026-02-10 14:33:06.385	1	\N
cmlgp6c6f000sftjclc5ic7kn	402	제품매출	REVENUE	\N	\N	t	29	2026-02-10 14:29:44.103	2026-02-10 14:33:06.389	1	\N
cmlgp6c6i000tftjcixvsj7ok	403	출력매출	REVENUE	\N	\N	t	30	2026-02-10 14:29:44.107	2026-02-10 14:33:06.392	1	\N
cmlgp6c6m000uftjcsie2u2ji	404	용역매출	REVENUE	\N	\N	t	31	2026-02-10 14:29:44.11	2026-02-10 14:33:06.396	1	\N
cmlgp6c6r000vftjc96008nse	409	매출할인	REVENUE	\N	\N	t	32	2026-02-10 14:29:44.115	2026-02-10 14:33:06.401	1	\N
cmlgp6c6v000wftjcfqn1h02y	410	매출환입	REVENUE	\N	\N	t	33	2026-02-10 14:29:44.12	2026-02-10 14:33:06.404	1	\N
cmlgp6c6z000xftjc8asi2sc9	490	잡이익	REVENUE	\N	\N	t	34	2026-02-10 14:29:44.123	2026-02-10 14:33:06.407	1	\N
cmlgp6c73000yftjc2l4a5dnj	501	상품매출원가	EXPENSE	\N	\N	t	35	2026-02-10 14:29:44.127	2026-02-10 14:33:06.411	1	\N
cmlgp6c3a0001ftjc9634ogr1	102	보통예금	ASSET	\N	\N	t	2	2026-02-10 14:29:43.991	2026-02-10 14:33:06.272	1	\N
cmlgp6c3l0003ftjcbwgh3wgh	108	받을어음	ASSET	\N	\N	t	4	2026-02-10 14:29:44.002	2026-02-10 14:33:06.28	1	\N
cmlgp6c3g0002ftjcldmbcl2l	103	정기예금	ASSET	\N	\N	t	3	2026-02-10 14:29:43.996	2026-02-10 14:33:06.275	1	\N
cmlgp6c3p0004ftjcmdhn6ux9	110	외상매출금	ASSET	\N	\N	t	5	2026-02-10 14:29:44.006	2026-02-10 14:33:06.285	1	\N
cmlgp6c3t0005ftjc0nmkqqgk	111	미수금	ASSET	\N	\N	t	6	2026-02-10 14:29:44.009	2026-02-10 14:33:06.289	1	\N
cmlgp6c3z0006ftjcw9n7wvsc	112	선급금	ASSET	\N	\N	t	7	2026-02-10 14:29:44.015	2026-02-10 14:33:06.293	1	\N
cmlgp6c440007ftjclavafs3y	113	선급비용	ASSET	\N	\N	t	8	2026-02-10 14:29:44.02	2026-02-10 14:33:06.298	1	\N
cmlgp6c470008ftjc1fr1twlq	120	원재료	ASSET	\N	\N	t	9	2026-02-10 14:29:44.023	2026-02-10 14:33:06.302	1	\N
cmlgp6c4a0009ftjcljhruycy	121	재공품	ASSET	\N	\N	t	10	2026-02-10 14:29:44.026	2026-02-10 14:33:06.306	1	\N
cmlgp6c4f000aftjc8os82wjs	122	제품	ASSET	\N	\N	t	11	2026-02-10 14:29:44.031	2026-02-10 14:33:06.309	1	\N
cmlgp6c78000zftjc2a0cydwj	510	기초원재료재고	EXPENSE	\N	\N	t	36	2026-02-10 14:29:44.132	2026-02-10 14:33:06.417	1	\N
cmlgp6c7c0010ftjc1ppb2hlv	511	원재료매입	EXPENSE	\N	\N	t	37	2026-02-10 14:29:44.136	2026-02-10 14:33:06.421	1	\N
cmlgp6c7f0011ftjc5ltem8cr	512	기말원재료재고	EXPENSE	\N	\N	t	38	2026-02-10 14:29:44.139	2026-02-10 14:33:06.425	1	\N
cmlgp6c7i0012ftjc3mzk62ms	520	직접노무비	EXPENSE	\N	\N	t	39	2026-02-10 14:29:44.143	2026-02-10 14:33:06.429	1	\N
cmlgp6c7n0013ftjcodwa87x6	530	제조경비	EXPENSE	\N	\N	t	40	2026-02-10 14:29:44.147	2026-02-10 14:33:06.434	1	\N
cmlgp6c7r0014ftjcva4ewrie	540	기초제품재고	EXPENSE	\N	\N	t	41	2026-02-10 14:29:44.151	2026-02-10 14:33:06.438	1	\N
cmlgp6c7u0015ftjcay3c0f9q	541	기말제품재고	EXPENSE	\N	\N	t	42	2026-02-10 14:29:44.154	2026-02-10 14:33:06.441	1	\N
cmlgp6c7x0016ftjce6tdb2za	601	급여	EXPENSE	\N	\N	t	43	2026-02-10 14:29:44.158	2026-02-10 14:33:06.445	1	\N
cmlgp6c810017ftjceaybp6p7	602	퇴직급여	EXPENSE	\N	\N	t	44	2026-02-10 14:29:44.161	2026-02-10 14:33:06.45	1	\N
cmlgp6c850018ftjc0cics3oq	603	복리후생비	EXPENSE	\N	\N	t	45	2026-02-10 14:29:44.166	2026-02-10 14:33:06.454	1	\N
cmlgp6c890019ftjcroq4op0t	604	여비교통비	EXPENSE	\N	\N	t	46	2026-02-10 14:29:44.169	2026-02-10 14:33:06.458	1	\N
cmlgp6c8d001aftjcrrvgbalt	605	접대비	EXPENSE	\N	\N	t	47	2026-02-10 14:29:44.174	2026-02-10 14:33:06.46	1	\N
cmlgp6c8h001bftjcq4pk5kum	606	통신비	EXPENSE	\N	\N	t	48	2026-02-10 14:29:44.178	2026-02-10 14:33:06.465	1	\N
cmlgp6c8m001cftjc852m3dh8	607	수도광열비	EXPENSE	\N	\N	t	49	2026-02-10 14:29:44.182	2026-02-10 14:33:06.468	1	\N
cmlgp6c8q001dftjcaj6pv9ta	608	세금과공과	EXPENSE	\N	\N	t	50	2026-02-10 14:29:44.186	2026-02-10 14:33:06.471	1	\N
cmlgp6c8t001eftjc9g3hhlmv	609	감가상각비	EXPENSE	\N	\N	t	51	2026-02-10 14:29:44.189	2026-02-10 14:33:06.475	1	\N
cmlgp6c8w001fftjcl7j5djze	610	지급임차료	EXPENSE	\N	\N	t	52	2026-02-10 14:29:44.192	2026-02-10 14:33:06.479	1	\N
cmlgp6c90001gftjccvhcn8qq	611	수선비	EXPENSE	\N	\N	t	53	2026-02-10 14:29:44.196	2026-02-10 14:33:06.483	1	\N
cmlgp6c94001hftjcyztjje5b	612	보험료	EXPENSE	\N	\N	t	54	2026-02-10 14:29:44.201	2026-02-10 14:33:06.486	1	\N
cmlgp6c98001iftjcvpa2amqg	613	차량유지비	EXPENSE	\N	\N	t	55	2026-02-10 14:29:44.204	2026-02-10 14:33:06.489	1	\N
cmlgp6c9b001jftjclpz4fmcf	614	운반비	EXPENSE	\N	\N	t	56	2026-02-10 14:29:44.207	2026-02-10 14:33:06.492	1	\N
cmlgp6c9e001kftjc5snd5dgq	615	교육훈련비	EXPENSE	\N	\N	t	57	2026-02-10 14:29:44.21	2026-02-10 14:33:06.495	1	\N
cmlgp6c9n001mftjchmze1d02	617	소모품비	EXPENSE	\N	\N	t	59	2026-02-10 14:29:44.219	2026-02-10 14:33:06.506	1	\N
cmlgp6c9q001nftjcb94wq9jr	618	지급수수료	EXPENSE	\N	\N	t	60	2026-02-10 14:29:44.222	2026-02-10 14:33:06.509	1	\N
cmlgp6c9t001oftjca6klab3u	619	광고선전비	EXPENSE	\N	\N	t	61	2026-02-10 14:29:44.226	2026-02-10 14:33:06.512	1	\N
cmlgp6c9x001pftjcdin737j0	620	대손상각비	EXPENSE	\N	\N	t	62	2026-02-10 14:29:44.23	2026-02-10 14:33:06.517	1	\N
cmlgp6ca2001qftjczvaqu8t7	650	잡손실	EXPENSE	\N	\N	t	63	2026-02-10 14:29:44.234	2026-02-10 14:33:06.52	1	\N
cmlgp6c9j001lftjcoc18y57p	616	디자인외주비	EXPENSE	\N	\N	t	58	2026-02-10 14:29:44.215	2026-02-10 14:33:06.5	1	\N
\.


ALTER TABLE public.accounts ENABLE TRIGGER ALL;

--
-- Data for Name: bank_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.bank_accounts DISABLE TRIGGER ALL;

COPY public.bank_accounts (id, "accountName", "bankName", "accountNumber", "accountHolder", balance, "isDefault", "isActive", description, "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.bank_accounts ENABLE TRIGGER ALL;

--
-- Data for Name: binding_intents; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.binding_intents DISABLE TRIGGER ALL;

COPY public.binding_intents (id, code, name, "jdfBindingType", "jdfBindingSide", "jdfBindingOrder", "edgeGilding", "spineThickness", "coverType", "displayNameKo", "basePrice", "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cml4hdu8000067smt2t5lbesq	BI-SOFT	무선제본	SoftCover	Left	Gathering	\N	Auto	Separate	무선(소프트커버) 제본	0.00	1	t	2026-02-02 01:18:23.041	2026-02-02 01:18:23.041
cml4hdu8200077smt1oe200kj	BI-HARD	양장제본	HardCover	Left	Gathering	\N	Auto	Separate	양장(하드커버) 제본	0.00	2	t	2026-02-02 01:18:23.043	2026-02-02 01:18:23.043
cml4hdu8300087smtkl5ae2qy	BI-SADDLE	중철제본	Saddle	Left	Gathering	\N	Auto	Separate	중철 스테이플 제본	0.00	3	t	2026-02-02 01:18:23.044	2026-02-02 01:18:23.044
cml4hdu8400097smt9lpobfdh	BI-RING	링제본	Ring	Left	Gathering	\N	Auto	Separate	링/스프링 제본	0.00	4	t	2026-02-02 01:18:23.045	2026-02-02 01:18:23.045
cml4hdu85000a7smtumujnooh	BI-WIRE	와이어제본	Wire	Left	Gathering	\N	Auto	Separate	트윈링 와이어 제본	0.00	5	t	2026-02-02 01:18:23.046	2026-02-02 01:18:23.046
cml4hdu86000b7smtul5n8is0	BI-PERFECT	PUR제본	Perfect	Left	Gathering	\N	Auto	Separate	PUR 무선제본	0.00	6	t	2026-02-02 01:18:23.047	2026-02-02 01:18:23.047
\.


ALTER TABLE public.binding_intents ENABLE TRIGGER ALL;

--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.branches DISABLE TRIGGER ALL;

COPY public.branches (id, "branchCode", "branchName", "isHeadquarters", address, phone, "isActive", "createdAt", "updatedAt") FROM stdin;
cmkaiqnuj000wkz5o74elpdb6	HQ	본사	t	\N	\N	t	2026-01-12 02:03:15.644	2026-01-12 02:03:15.644
\.


ALTER TABLE public.branches ENABLE TRIGGER ALL;

--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.categories DISABLE TRIGGER ALL;

COPY public.categories (id, code, name, level, depth, "parentId", "isVisible", "isTopMenu", "loginVisibility", "categoryType", "productionForm", "isOutsourced", "pricingUnit", description, "linkUrl", "htmlContent", "sortOrder", "isActive", "iconUrl", "salesCategoryId", "createdAt", "updatedAt", "nameEn", "nameJa", "nameZh") FROM stdin;
cmk64sbpp000314ay2aj5kt4d	01020000	인디고출력	medium	2	cmk5cqvwy000114micn51e4oe	t	f	always	HTML	\N	f	\N	\N	\N	\N	0	t	\N	\N	2026-01-09 00:21:33.902	2026-01-09 00:21:33.902	Indigo Print	インディゴプリント	靛蓝输出
cmk64tnq3000714ayr2wp4dsf	02010000	압축앨범	medium	2	cmk64q1bv000114aye864h6eq	t	f	always	HTML	\N	f	\N	\N	\N	\N	0	t	\N	\N	2026-01-09 00:22:36.123	2026-01-09 00:22:36.123	Layflat Album	レイフラットアルバム	蝴蝶装相册
cmk64twl1000914ayr1k0mddl	02020000	화보앨범	medium	2	cmk64q1bv000114aye864h6eq	t	f	always	HTML	\N	f	\N	\N	\N	\N	0	t	\N	\N	2026-01-09 00:22:47.605	2026-01-09 00:22:47.605	Photo Album	フォトアルバム	写真相册
cmk64snfn000514ayta937zrr	01030000	잉크젯출력	medium	2	cmk5cqvwy000114micn51e4oe	t	f	always	HTML	\N	f	\N	\N	\N	\N	0	t	\N	\N	2026-01-09 00:21:49.091	2026-01-09 00:42:32.547	Inkjet Print	インクジェットプリント	喷墨输出
cmk5cqvwy000114micn51e4oe	01000000	디지털출력	large	1	\N	t	t	always	HTML	digital_print	f	\N	\N	\N	\N	0	t	/api/v1/upload/category-icons/3af8a687-4b22-4bf5-8f4e-741ad145a5d5.jpg	\N	2026-01-08 11:16:37.522	2026-01-24 13:39:28.001	Digital Print	デジタルプリント	数码输出
cmk6hvgkv000712ucc3zajjsd	02010200	레이플릿 압축앨범	small	3	cmk64tnq3000714ayr2wp4dsf	t	f	always	POD	compressed_album	f	\N	\N	\N	\N	0	t	\N	\N	2026-01-09 06:27:55.183	2026-01-24 13:50:40.756	Layflat Album	レイフラットアルバム	蝴蝶装相册
cmk6huxe2000512uch5cfhh8j	02010100	고급압축앨범	small	3	cmk64tnq3000714ayr2wp4dsf	t	f	always	POD	compressed_album	f	\N	\N	\N	\N	0	t	\N	\N	2026-01-09 06:27:30.314	2026-01-24 13:50:52.149	Premium Layflat Album	プレミアムレイフラットアルバム	高级蝴蝶装相册
cmljcvztl0002io0h1wiwk7sk	03010000	아크릴액자	medium	2	cmljcuke20000io0hnlp492w9	t	f	always	HTML	\N	f	\N	\N	\N	\N	0	t	\N	\N	2026-02-12 11:09:04.665	2026-02-12 11:09:04.665	\N	\N	\N
cmljcwag40004io0he79k33so	03020000	원목액자	medium	2	cmljcuke20000io0hnlp492w9	t	f	always	POD	\N	f	\N	\N	\N	\N	0	t	\N	\N	2026-02-12 11:09:18.436	2026-02-12 11:09:18.436	\N	\N	\N
cmljcuke20000io0hnlp492w9	03000000	액자	large	1	\N	t	t	always	POD	\N	f	\N	\N	\N	\N	2	t	\N	\N	2026-02-12 11:07:58.011	2026-02-12 11:12:12.251	\N	\N	\N
cmk64q1bv000114aye864h6eq	02000000	디지털앨범	large	1	\N	t	t	always	HTML	\N	f	\N	\N	\N	\N	1	t	/api/v1/upload/category-icons/5fc79bc2-5214-43cb-80cd-1197d18a8537.jpg	\N	2026-01-09 00:19:47.131	2026-02-12 11:12:12.251	Digital Album	デジタルアルバム	数码相册
\.


ALTER TABLE public.categories ENABLE TRIGGER ALL;

--
-- Data for Name: client_groups; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.client_groups DISABLE TRIGGER ALL;

COPY public.client_groups (id, "groupCode", "groupName", "branchId", "generalDiscount", "premiumDiscount", "importedDiscount", description, "isActive", "sortOrder", "createdAt", "updatedAt") FROM stdin;
cmko20a3z0025v6kupgm3goza	g002	졸업앨범관련 업체	cmkaiqnuj000wkz5o74elpdb6	100	100	100		t	0	2026-01-21 13:23:37.391	2026-01-21 13:23:37.391
cml5vxvhr0000v7vn5a7f8qlo		일반고객	cmkaiqnuj000wkz5o74elpdb6	100	100	100		t	0	2026-02-03 00:53:38.607	2026-02-03 00:53:38.607
cmkaiqnum000xkz5ow7k25rf9	GRPMKAIQNU6	스튜디오회원	cmkaiqnuj000wkz5o74elpdb6	100	100	100		t	0	2026-01-12 02:03:15.647	2026-02-03 00:53:54.64
cml5wbvo900036mpwqhejpe5g	STUDIO	스튜디오회원	cmkaiqnuj000wkz5o74elpdb6	95	100	100	스튜디오/사업자 고객 그룹 (5% 할인)	t	0	2026-02-03 01:04:32.025	2026-02-03 01:04:32.025
\.


ALTER TABLE public.client_groups ENABLE TRIGGER ALL;

--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.clients DISABLE TRIGGER ALL;

COPY public.clients (id, "clientCode", "clientName", "businessNumber", representative, phone, mobile, email, password, "postalCode", address, "addressDetail", "groupId", "memberType", "oauthProvider", "oauthId", "priceType", "paymentType", "creditEnabled", "creditPeriodDays", "creditPaymentDay", "creditBlocked", "creditBlockedAt", "lastPaymentDate", "shippingType", "creditGrade", "paymentTerms", status, "createdAt", "updatedAt", "acquisitionChannel", "assignedManager", "businessCategory", "businessType", "colorProfile", "contactPerson", "contactPhone", "deliveryNote", "hasLogo", "isBlacklist", "isWhitelist", "logoPath", "mainGenre", "memberGrade", "monthlyOrderVolume", "preferredFinish", "preferredSize", "recentMemo", "sensitivityScore", "taxInvoiceEmail", "taxInvoiceMethod", "totalClaims", "duplicateCheckMonths", "fileRetentionMonths", "adminMemo", "approvalManagerName", "approvalManagerPhone", "freeShippingThreshold", "paymentCondition", "practicalManagerName", "practicalManagerPhone", "pendingAdjustmentAmount", "pendingAdjustmentAt", "pendingAdjustmentReason") FROM stdin;
cmkg8vzuf0000at5m0dyaydie	N29645365	네이버사용자	포토미		01023131228	01023131228	wooceo@gmail.com	\N	13536	경기 성남시 분당구 판교역로10번길 3-1 (백현동)	벽산테크노타운	cmkaiqnum000xkz5ow7k25rf9	individual	naver	SbmqSiAQ2fsIFu969c7YTxyngCoJRAtY6u_G0WM-fo8	standard	order	f	\N	\N	f	\N	\N	conditional	B	30	active	2026-01-16 02:14:05.367	2026-02-14 14:06:09.889	\N	cml63cj8d000610fc52rxd1r8	\N	\N	\N	\N	\N	\N	f	f	f	\N	\N	normal	\N	\N	\N	\N	3	\N	\N	0	\N	3	\N	\N	\N	90000	당월말	\N	\N	0.00	\N	\N
cmlc48lcw00017cvnisoyrvqk	M0002	로앤코코	201-86-02186	신봉섭		010-4400-5402	admin@printing-erp.com	\N	03054	서울 종로구 삼청로 63 (팔판동)	벽산테크노타운	cmkaiqnum000xkz5ow7k25rf9	business	\N	\N	standard	order	f	\N	\N	f	\N	\N	conditional	B	30	active	2026-02-07 09:32:32.673	2026-02-14 14:09:13.69	\N	cmlme6v3g0000gnpnwsi3mxci	\N	\N	\N	\N	\N	\N	f	f	f	\N	\N	normal	\N	\N	\N	\N	3	\N	\N	0	\N	3	\N	\N	\N	90000	당월말	\N	\N	0.00	\N	\N
cml5w4ssp0001v7vnm48qzlwz	M0001	풀로우	3072204670	박성빈	02-9955-4312	010-9032-4633	fullow@naver.com	$2b$10$PeUbERT7O/0Ywc3e2TuA8ehfAX/2R9qq3yxFVT6q.I.WkPlQAb9uO	05544	서울 송파구 올림픽로34길 5-29 (방이동)	801호	cml5wbvo900036mpwqhejpe5g	business	\N	\N	standard	order	f	\N	\N	f	\N	\N	conditional	B	30	active	2026-02-03 00:59:01.705	2026-02-14 14:09:31.42	\N	cmlme6v3g0000gnpnwsi3mxci	\N	\N	\N	\N	\N	\N	f	f	f	\N	\N	normal	\N	\N	\N	\N	3	\N	\N	0	\N	3	\N	\N	\N	90000	당월말	\N	\N	0.00	\N	\N
cmlls3h030000ted7yhh6qmdh	M0003	아마레스튜디오	3072204670	홍길동	010-222-2222	010-9032-4633	photome5478@naver.com	\N	34672	대전 동구 판교2길 7 (판암동)	벽산테크노타운	cmkaiqnum000xkz5ow7k25rf9	business	\N	\N	standard	order	f	\N	\N	f	\N	\N	conditional	B	30	active	2026-02-14 03:50:20.115	2026-02-16 05:43:33.052	\N	cml63cj8d000610fc52rxd1r8	\N	\N	\N	\N	\N	\N	f	f	f	\N	\N	normal	\N	\N	\N	\N	3	\N	\N	0	\N	3	\N	\N	\N	90000	당월말	\N	\N	0.00	\N	\N
\.


ALTER TABLE public.clients ENABLE TRIGGER ALL;

--
-- Data for Name: client_addresses; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.client_addresses DISABLE TRIGGER ALL;

COPY public.client_addresses (id, "clientId", "addressName", "recipientName", phone, "postalCode", address, "addressDetail", "isDefault", "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.client_addresses ENABLE TRIGGER ALL;

--
-- Data for Name: client_album_preferences; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.client_album_preferences DISABLE TRIGGER ALL;

COPY public.client_album_preferences (id, "clientId", "preferredEditStyle", "preferredBinding", "preferredAlbumSizes", "outfitGrouping", "colorGroupEnabled", "preferredFabricId", "preferredCoatingId", "editorNotes", "specialInstructions", "totalOrders", "lastOrderDate", "mostUsedSize", "averagePageCount", "createdAt", "updatedAt") FROM stdin;
cmlgpbtyi007jftjckd791wzt	cml5w4ssp0001v7vnm48qzlwz	spread	RIGHT_START_LEFT_END	\N	\N	f	\N	\N	\N	\N	0	\N	\N	\N	2026-02-10 14:34:00.426	2026-02-14 03:41:31.235
cmlmduam7000k58lbkbe7xy1n	cmkg8vzuf0000at5m0dyaydie	spread	LEFT_START_RIGHT_END	\N	\N	f	\N	\N	\N	\N	0	\N	\N	\N	2026-02-14 13:59:03.486	2026-02-14 23:42:56.159
cmljbcyd1000f9irdxjc4z2ao	cmlc48lcw00017cvnisoyrvqk	spread	LEFT_START_RIGHT_END	\N	\N	f	\N	\N	\N	\N	0	\N	\N	\N	2026-02-12 10:26:16.693	2026-02-17 08:57:24.86
cmllskb0l0070ted7s7p7p8oq	cmlls3h030000ted7yhh6qmdh	spread	LEFT_START_RIGHT_END	\N	\N	f	\N	\N	\N	\N	0	\N	\N	\N	2026-02-14 04:03:25.509	2026-02-21 01:29:25.699
\.


ALTER TABLE public.client_album_preferences ENABLE TRIGGER ALL;

--
-- Data for Name: production_groups; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.production_groups DISABLE TRIGGER ALL;

COPY public.production_groups (id, code, name, depth, "parentId", "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cmk5cpwru000014miy7scmjuy	111	출력	1	\N	0	t	2026-01-08 11:15:51.979	2026-01-08 11:15:51.979
cmk5crnw9000514mitnz68inm	11	인디고출력	2	cmk5cpwru000014miy7scmjuy	0	t	2026-01-08 11:17:13.785	2026-01-19 01:16:14.531
cmkkh5l1w00522fducendddo0	111NaN	잉크젯출력	2	cmk5cpwru000014miy7scmjuy	1	t	2026-01-19 01:16:34.387	2026-01-19 01:16:34.387
cmk5cs9w9000614mitbnzr2nm	222	제본	1	\N	1	t	2026-01-08 11:17:42.298	2026-01-19 01:52:33.248
cmklulwn600007nn5m8uenxhh	24	기타	1	\N	3	t	2026-01-20 00:20:57.09	2026-01-20 01:02:47.801
cmklvrqx40001dgdw7f98ssrs	2401	배송	2	cmklulwn600007nn5m8uenxhh	0	t	2026-01-20 00:53:29.224	2026-01-20 01:05:13.167
cmk6gihm30009v9w27j6zfq2m	2301	코팅	2	cmk6ghduz0004v9w2qbwc5dna	0	t	2026-01-09 05:49:50.379	2026-01-30 02:15:30.326
cml7nvvpb002jejzmzz277jyq	22204	핀화본제본	2	cmk5cs9w9000614mitbnzr2nm	2	t	2026-02-04 06:43:40.992	2026-02-04 06:43:40.992
cmk6dka5d000coeubkdhjlz3u	22201	스타화보제본	2	cmk5cs9w9000614mitbnzr2nm	1	t	2026-01-09 04:27:15.169	2026-02-04 06:43:53.802
cmk6hojvf000312ucl4e7yq1i	22203	압축제본	2	cmk5cs9w9000614mitbnzr2nm	0	t	2026-01-09 06:22:32.859	2026-02-04 06:44:40.815
cml7nug8d002hejzmn66i5nx6	2220101	스타제본 Only	3	cmk6dka5d000coeubkdhjlz3u	0	t	2026-02-04 06:42:34.284	2026-02-04 06:46:25.725
cml7nzupt002lejzm97a5w4br	2220102	스타제본+용지포함	3	cmk6dka5d000coeubkdhjlz3u	1	t	2026-02-04 06:46:46.338	2026-02-04 06:46:46.338
cml7o4ywc002nejzmgzhahepe	2220301	압축제본 Only	3	cmk6hojvf000312ucl4e7yq1i	0	t	2026-02-04 06:50:45.035	2026-02-04 06:50:45.035
cml7o5e61002pejzmzgyk53jd	2220302	압축제본압+용지포함	3	cmk6hojvf000312ucl4e7yq1i	1	t	2026-02-04 06:51:04.825	2026-02-04 06:51:04.825
cmk6ghduz0004v9w2qbwc5dna	23	후가공옵션	1	\N	2	t	2026-01-09 05:48:58.86	2026-02-12 12:05:28.383
cmljexe24001bilhatxlg1neu	2302	간지추가	2	cmk6ghduz0004v9w2qbwc5dna	1	t	2026-02-12 12:06:09.004	2026-02-12 12:06:09.004
cmljexyi9001dilham6uom848	2303	레이져각인	2	cmk6ghduz0004v9w2qbwc5dna	2	t	2026-02-12 12:06:35.506	2026-02-12 12:06:49.492
\.


ALTER TABLE public.production_groups ENABLE TRIGGER ALL;

--
-- Data for Name: production_settings; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.production_settings DISABLE TRIGGER ALL;

COPY public.production_settings (id, "groupId", "codeName", "vendorType", "pricingType", "settingName", "sCode", "settingFee", "basePrice", "workDays", "weightInfo", "printMethod", "paperIds", "specUsageType", "singleSidedPrice", "doubleSidedPrice", "baseSpecificationId", "basePricePerSqInch", "priceGroups", "paperPriceGroupMap", "pageRanges", "lengthUnit", "lengthPriceRanges", "sortOrder", "isActive", "createdAt", "updatedAt", "areaPriceRanges", "areaUnit", "distancePriceRanges", "extraPricePerKm", "freeThreshold", "islandFee", "maxBaseDistance", "surchargeType") FROM stdin;
cmkgcqgel0001vuyqquqn2f9z	cmk5crnw9000514mitnz68inm	11_002	in_house	paper_output_spec	인디고스냅사진		0.00	0.00	1.0		indigo	{}	all	\N	\N		\N	[{"id": "pg_1768536096664_hxqs8hls0", "color": "green", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 480, "sixColorSinglePrice": 500, "fourColorDoublePrice": 380, "fourColorSinglePrice": 400}, {"up": 2, "weight": 1, "sixColorDoublePrice": 240, "sixColorSinglePrice": 250, "fourColorDoublePrice": 190, "fourColorSinglePrice": 200}, {"up": 4, "weight": 1, "sixColorDoublePrice": 120, "sixColorSinglePrice": 130, "fourColorDoublePrice": 100, "fourColorSinglePrice": 100}, {"up": 8, "weight": 1, "sixColorDoublePrice": 60, "sixColorSinglePrice": 60, "fourColorDoublePrice": 50, "fourColorSinglePrice": 50}], "specPrices": [{"weight": 1, "specificationId": "cmk6fbng100004b63c70xzv5a", "singleSidedPrice": 310}, {"weight": 1, "specificationId": "cmk6fu8av0005hxtsrjafllf0", "singleSidedPrice": 420}, {"weight": 1, "specificationId": "cmk6f3ym20006o43xdewhcbes", "singleSidedPrice": 500}, {"weight": 1, "specificationId": "cmk6f88vs0009o43x378tye2v", "singleSidedPrice": 650}, {"weight": 1, "specificationId": "cmk6ftqqu0004hxtskccmbx2s", "singleSidedPrice": 650}, {"weight": 1, "specificationId": "cmk6f6ndh0008o43xcv3mdzu1", "singleSidedPrice": 800}, {"weight": 1, "specificationId": "cmk6fjyhm000c4b631modt98m", "singleSidedPrice": 1000}, {"weight": 1, "specificationId": "cmk6fkx5j000e4b639whx3sxx", "singleSidedPrice": 1100}, {"weight": 1, "specificationId": "cmk6fvjvy0006hxtspj3i6nks", "singleSidedPrice": 1100}, {"weight": 1, "specificationId": "cmkauuj580000620v7qprf1fa", "singleSidedPrice": 1200}, {"weight": 1, "specificationId": "cmkavuol30000ft7ltr5dldbf", "singleSidedPrice": 1300}, {"weight": 1, "specificationId": "cmkavvbot0001ft7l6yfnze23", "singleSidedPrice": 1500}, {"weight": 1, "specificationId": "cmk6fdf7400084b63698iy8j5", "singleSidedPrice": 2100}, {"weight": 1, "specificationId": "cmk6fcj4d00044b63ydvo3m99", "singleSidedPrice": 2500}, {"weight": 1, "specificationId": "cmk6fd3tf00064b63chde9ajf", "singleSidedPrice": 3100}, {"weight": 1, "specificationId": "cmk6feqsv000a4b631dxzz34w", "singleSidedPrice": 3900}, {"weight": 1, "specificationId": "cmk6gcadq0000v9w22gdjvtj0", "singleSidedPrice": 5000}, {"weight": 1, "specificationId": "cmk6gcljh0002v9w2h60pr8xa", "singleSidedPrice": 9100}, {"weight": 1, "specificationId": "cmk6f27np0004o43xbl1qfr5n", "singleSidedPrice": 230}, {"weight": 1, "specificationId": "cmk6fbng600014b63lbz4hbql", "singleSidedPrice": 310}, {"weight": 1, "specificationId": "cmk6f3ym40007o43x4w1i7igj", "singleSidedPrice": 500}, {"weight": 1, "specificationId": "cmk6f88vu000ao43x13j2f12j", "singleSidedPrice": 650}, {"weight": 1, "specificationId": "cmk6fjyhq000d4b63ltsp5xkp", "singleSidedPrice": 1000}, {"weight": 1, "specificationId": "cmk6fvjw00007hxtsirwx4s8m", "singleSidedPrice": 1100}, {"weight": 1, "specificationId": "cmk6fkx5l000f4b63teec2nro", "singleSidedPrice": 1100}, {"weight": 1, "specificationId": "cmkauuj5e0001620vtvan1277", "singleSidedPrice": 1200}, {"weight": 1, "specificationId": "cmkavvboy0002ft7lsl0ipbee", "singleSidedPrice": 1500}, {"weight": 1, "specificationId": "cmk6fdf7600094b63ff6454lx", "singleSidedPrice": 2100}, {"weight": 1, "specificationId": "cmk6fcj4f00054b63m430jdn4", "singleSidedPrice": 2500}, {"weight": 1, "specificationId": "cmk6fd3th00074b63i1ouhou9", "singleSidedPrice": 3100}, {"weight": 1, "specificationId": "cmk6feqsy000b4b63vxejnfur", "singleSidedPrice": 3900}, {"weight": 1, "specificationId": "cmk6gcadu0001v9w2k7ogf6zt", "singleSidedPrice": 5000}, {"weight": 1, "specificationId": "cmk6gcljl0003v9w2qe2j0lo1", "singleSidedPrice": 9100}, {"weight": 1, "specificationId": "cmk6fc2o500024b63vwcm68cp", "singleSidedPrice": 160}, {"weight": 1, "specificationId": "cmk6f27nr0005o43xwyhm7een", "singleSidedPrice": 230}, {"weight": 1, "specificationId": "cmk6fc2od00034b63mc8vtlep", "singleSidedPrice": 160}], "inkjetBasePrice": 6.493506493506493, "inkjetBaseSpecId": "cmk6fjyhm000c4b631modt98m"}, {"id": "pg_1768536123869_f96k5mt6y", "color": "blue", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 450, "sixColorSinglePrice": 480, "fourColorDoublePrice": 350, "fourColorSinglePrice": 380}, {"up": 2, "weight": 1, "sixColorDoublePrice": 230, "sixColorSinglePrice": 240, "fourColorDoublePrice": 180, "fourColorSinglePrice": 190}, {"up": 4, "weight": 1, "sixColorDoublePrice": 110, "sixColorSinglePrice": 120, "fourColorDoublePrice": 90, "fourColorSinglePrice": 100}, {"up": 8, "weight": 1, "sixColorDoublePrice": 60, "sixColorSinglePrice": 60, "fourColorDoublePrice": 40, "fourColorSinglePrice": 50}], "specPrices": [], "inkjetBasePrice": 5}]	{"cmk6bw3930004w4rgfz1xi87r": "pg_1768536096664_hxqs8hls0", "cmk6bx7xd0006w4rgt2s54dqp": "pg_1768536123869_f96k5mt6y", "cmk6cj27s0001oeub8ot2p5wq": "pg_1768536123869_f96k5mt6y", "cmk6cl3kp0004oeub4w4fpghp": "pg_1768536096664_hxqs8hls0"}	null	cm	\N	1	t	2026-01-16 04:01:45.356	2026-01-19 01:34:07.055	\N	mm2	\N	\N	\N	\N	\N	none
cmkkhsxxs00ba2fdul36si9el	cmkkh5l1w00522fducendddo0	111NaN_002	in_house	paper_output_spec	잉크젯 스냅사진		0.00	0.00	1.0		inkjet	{cmk6cl3kp0004oeub4w4fpghp,cmk6cj27s0001oeub8ot2p5wq}	all	\N	\N		\N	[{"id": "pg_1768786473212_8pfnqfvuo", "color": "green", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}], "specPrices": [{"weight": 1, "specificationId": "cmk6fbng100004b63c70xzv5a", "singleSidedPrice": 430}, {"weight": 1, "specificationId": "cmk6fu8av0005hxtsrjafllf0", "singleSidedPrice": 600}, {"weight": 1, "specificationId": "cmk6f3ym20006o43xdewhcbes", "singleSidedPrice": 700}, {"weight": 1, "specificationId": "cmk6f88vs0009o43x378tye2v", "singleSidedPrice": 850}, {"weight": 1, "specificationId": "cmk6ftqqu0004hxtskccmbx2s", "singleSidedPrice": 900}, {"weight": 1, "specificationId": "cmk6f6ndh0008o43xcv3mdzu1", "singleSidedPrice": 1100}, {"weight": 1, "specificationId": "cmk6fjyhm000c4b631modt98m", "singleSidedPrice": 1400}, {"weight": 1, "specificationId": "cmk6fkx5j000e4b639whx3sxx", "singleSidedPrice": 1500}, {"weight": 1, "specificationId": "cmk6fvjvy0006hxtspj3i6nks", "singleSidedPrice": 1600}, {"weight": 1, "specificationId": "cmkauuj580000620v7qprf1fa", "singleSidedPrice": 1600}, {"weight": 1, "specificationId": "cmkavuol30000ft7ltr5dldbf", "singleSidedPrice": 1800}, {"weight": 1, "specificationId": "cmkavvbot0001ft7l6yfnze23", "singleSidedPrice": 2000}, {"weight": 1, "specificationId": "cmk6fdf7400084b63698iy8j5", "singleSidedPrice": 2900}, {"weight": 1, "specificationId": "cmk6fcj4d00044b63ydvo3m99", "singleSidedPrice": 3500}, {"weight": 1, "specificationId": "cmk6fd3tf00064b63chde9ajf", "singleSidedPrice": 4300}, {"weight": 1, "specificationId": "cmk6feqsv000a4b631dxzz34w", "singleSidedPrice": 5400}, {"weight": 1, "specificationId": "cmk6gcadq0000v9w22gdjvtj0", "singleSidedPrice": 6900}, {"weight": 1, "specificationId": "cmk6gcljh0002v9w2h60pr8xa", "singleSidedPrice": 12700}, {"weight": 1, "specificationId": "cmk6f27np0004o43xbl1qfr5n", "singleSidedPrice": 320}, {"weight": 1, "specificationId": "cmk6fbng600014b63lbz4hbql", "singleSidedPrice": 430}, {"weight": 1, "specificationId": "cmk6f3ym40007o43x4w1i7igj", "singleSidedPrice": 700}, {"weight": 1, "specificationId": "cmk6f88vu000ao43x13j2f12j", "singleSidedPrice": 850}, {"weight": 1, "specificationId": "cmk6fjyhq000d4b63ltsp5xkp", "singleSidedPrice": 1400}, {"weight": 1, "specificationId": "cmk6fvjw00007hxtsirwx4s8m", "singleSidedPrice": 1600}, {"weight": 1, "specificationId": "cmk6fkx5l000f4b63teec2nro", "singleSidedPrice": 1500}, {"weight": 1, "specificationId": "cmkauuj5e0001620vtvan1277", "singleSidedPrice": 1600}, {"weight": 1, "specificationId": "cmkavvboy0002ft7lsl0ipbee", "singleSidedPrice": 2000}, {"weight": 1, "specificationId": "cmk6fdf7600094b63ff6454lx", "singleSidedPrice": 2900}, {"weight": 1, "specificationId": "cmk6fcj4f00054b63m430jdn4", "singleSidedPrice": 3500}, {"weight": 1, "specificationId": "cmk6fd3th00074b63i1ouhou9", "singleSidedPrice": 4300}, {"weight": 1, "specificationId": "cmk6feqsy000b4b63vxejnfur", "singleSidedPrice": 5400}, {"weight": 1, "specificationId": "cmk6gcadu0001v9w2k7ogf6zt", "singleSidedPrice": 6900}, {"weight": 1, "specificationId": "cmk6gcljl0003v9w2qe2j0lo1", "singleSidedPrice": 12700}, {"weight": 1, "specificationId": "cmk6fc2o500024b63vwcm68cp", "singleSidedPrice": 220}, {"weight": 1, "specificationId": "cmk6f27nr0005o43xwyhm7een", "singleSidedPrice": 320}, {"weight": 1, "specificationId": "cmk6fc2od00034b63mc8vtlep", "singleSidedPrice": 220}], "pricingMode": "sqinch", "inkjetBasePrice": 9, "inkjetBaseSpecId": "cmk6fjyhm000c4b631modt98m"}, {"id": "pg_1768786475001_pjeb1zdss", "color": "blue", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}], "specPrices": [{"weight": 1, "specificationId": "cmk6fbng100004b63c70xzv5a", "singleSidedPrice": 480}, {"weight": 1, "specificationId": "cmk6fu8av0005hxtsrjafllf0", "singleSidedPrice": 640}, {"weight": 1, "specificationId": "cmk6f3ym20006o43xdewhcbes", "singleSidedPrice": 800}, {"weight": 1, "specificationId": "cmk6f88vs0009o43x378tye2v", "singleSidedPrice": 967}, {"weight": 1, "specificationId": "cmk6ftqqu0004hxtskccmbx2s", "singleSidedPrice": 1000}, {"weight": 1, "specificationId": "cmk6f6ndh0008o43xcv3mdzu1", "singleSidedPrice": 1210}, {"weight": 1, "specificationId": "cmk6fjyhm000c4b631modt98m", "singleSidedPrice": 1540}, {"weight": 1, "specificationId": "cmk6fkx5j000e4b639whx3sxx", "singleSidedPrice": 1650}, {"weight": 1, "specificationId": "cmk6fvjvy0006hxtspj3i6nks", "singleSidedPrice": 1760}, {"weight": 1, "specificationId": "cmkauuj580000620v7qprf1fa", "singleSidedPrice": 1800}, {"weight": 1, "specificationId": "cmkavuol30000ft7ltr5dldbf", "singleSidedPrice": 1960}, {"weight": 1, "specificationId": "cmkavvbot0001ft7l6yfnze23", "singleSidedPrice": 2240}, {"weight": 1, "specificationId": "cmk6fdf7400084b63698iy8j5", "singleSidedPrice": 3200}, {"weight": 1, "specificationId": "cmk6fcj4d00044b63ydvo3m99", "singleSidedPrice": 3840}, {"weight": 1, "specificationId": "cmk6fd3tf00064b63chde9ajf", "singleSidedPrice": 4800}, {"weight": 1, "specificationId": "cmk6feqsv000a4b631dxzz34w", "singleSidedPrice": 6000}, {"weight": 1, "specificationId": "cmk6gcadq0000v9w22gdjvtj0", "singleSidedPrice": 7680}, {"weight": 1, "specificationId": "cmk6gcljh0002v9w2h60pr8xa", "singleSidedPrice": 14080}, {"weight": 1, "specificationId": "cmk6f27np0004o43xbl1qfr5n", "singleSidedPrice": 350}, {"weight": 1, "specificationId": "cmk6fbng600014b63lbz4hbql", "singleSidedPrice": 480}, {"weight": 1, "specificationId": "cmk6f3ym40007o43x4w1i7igj", "singleSidedPrice": 800}, {"weight": 1, "specificationId": "cmk6f88vu000ao43x13j2f12j", "singleSidedPrice": 967}, {"weight": 1, "specificationId": "cmk6fjyhq000d4b63ltsp5xkp", "singleSidedPrice": 1540}, {"weight": 1, "specificationId": "cmk6fvjw00007hxtsirwx4s8m", "singleSidedPrice": 1760}, {"weight": 1, "specificationId": "cmk6fkx5l000f4b63teec2nro", "singleSidedPrice": 1650}, {"weight": 1, "specificationId": "cmkauuj5e0001620vtvan1277", "singleSidedPrice": 1800}, {"weight": 1, "specificationId": "cmkavvboy0002ft7lsl0ipbee", "singleSidedPrice": 2240}, {"weight": 1, "specificationId": "cmk6fdf7600094b63ff6454lx", "singleSidedPrice": 3200}, {"weight": 1, "specificationId": "cmk6fcj4f00054b63m430jdn4", "singleSidedPrice": 3840}, {"weight": 1, "specificationId": "cmk6fd3th00074b63i1ouhou9", "singleSidedPrice": 4800}, {"weight": 1, "specificationId": "cmk6feqsy000b4b63vxejnfur", "singleSidedPrice": 6000}, {"weight": 1, "specificationId": "cmk6gcadu0001v9w2k7ogf6zt", "singleSidedPrice": 7680}, {"weight": 1, "specificationId": "cmk6gcljl0003v9w2qe2j0lo1", "singleSidedPrice": 14080}, {"weight": 1, "specificationId": "cmk6fc2o500024b63vwcm68cp", "singleSidedPrice": 240}, {"weight": 1, "specificationId": "cmk6f27nr0005o43xwyhm7een", "singleSidedPrice": 350}, {"weight": 1, "specificationId": "cmk6fc2od00034b63mc8vtlep", "singleSidedPrice": 240}], "pricingMode": "sqinch", "inkjetBasePrice": 10, "inkjetBaseSpecId": ""}]	{"cmk6cj27s0001oeub8ot2p5wq": "pg_1768786475001_pjeb1zdss", "cmk6cl3kp0004oeub4w4fpghp": "pg_1768786473212_8pfnqfvuo"}	null	cm	\N	1	t	2026-01-19 01:34:44.176	2026-01-24 12:36:04.945	\N	mm2	\N	\N	\N	\N	\N	none
cmkkhk9d600542fduuvm9kmec	cmkkh5l1w00522fducendddo0	111NaN_001	in_house	paper_output_spec	웨딩베이비		0.00	0.00	1.0		inkjet	{cmk6cl3kp0004oeub4w4fpghp,cmk6cj27s0001oeub8ot2p5wq,cmko0b90d000dv6kucf3istj1}	all	\N	\N		\N	[{"id": "pg_1768786011033_7qd25f1mq", "color": "green", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}], "specPrices": [{"weight": 1, "specificationId": "cmk6fbng100004b63c70xzv5a", "singleSidedPrice": 600}, {"weight": 1, "specificationId": "cmk6fu8av0005hxtsrjafllf0", "singleSidedPrice": 850}, {"weight": 1, "specificationId": "cmk6f3ym20006o43xdewhcbes", "singleSidedPrice": 1000}, {"weight": 1, "specificationId": "cmk6f88vs0009o43x378tye2v", "singleSidedPrice": 1300}, {"weight": 1, "specificationId": "cmk6ftqqu0004hxtskccmbx2s", "singleSidedPrice": 1300}, {"weight": 1, "specificationId": "cmk6f6ndh0008o43xcv3mdzu1", "singleSidedPrice": 1600}, {"weight": 1, "specificationId": "cmk6fjyhm000c4b631modt98m", "singleSidedPrice": 2000}, {"weight": 1, "specificationId": "cmk6fkx5j000e4b639whx3sxx", "singleSidedPrice": 2100}, {"weight": 1, "specificationId": "cmk6fvjvy0006hxtspj3i6nks", "singleSidedPrice": 2300}, {"weight": 1, "specificationId": "cmkauuj580000620v7qprf1fa", "singleSidedPrice": 2300}, {"weight": 1, "specificationId": "cmkavuol30000ft7ltr5dldbf", "singleSidedPrice": 2500}, {"weight": 1, "specificationId": "cmkavvbot0001ft7l6yfnze23", "singleSidedPrice": 2900}, {"weight": 1, "specificationId": "cmk6fdf7400084b63698iy8j5", "singleSidedPrice": 4200}, {"weight": 1, "specificationId": "cmk6fcj4d00044b63ydvo3m99", "singleSidedPrice": 5000}, {"weight": 1, "specificationId": "cmk6fd3tf00064b63chde9ajf", "singleSidedPrice": 6200}, {"weight": 1, "specificationId": "cmk6feqsv000a4b631dxzz34w", "singleSidedPrice": 7800}, {"weight": 1, "specificationId": "cmk6gcadq0000v9w22gdjvtj0", "singleSidedPrice": 10000}, {"weight": 1, "specificationId": "cmk6gcljh0002v9w2h60pr8xa", "singleSidedPrice": 18300}, {"weight": 1, "specificationId": "cmk6f27np0004o43xbl1qfr5n", "singleSidedPrice": 460}, {"weight": 1, "specificationId": "cmk6fbng600014b63lbz4hbql", "singleSidedPrice": 600}, {"weight": 1, "specificationId": "cmk6f3ym40007o43x4w1i7igj", "singleSidedPrice": 1000}, {"weight": 1, "specificationId": "cmk6f88vu000ao43x13j2f12j", "singleSidedPrice": 1300}, {"weight": 1, "specificationId": "cmk6fjyhq000d4b63ltsp5xkp", "singleSidedPrice": 2000}, {"weight": 1, "specificationId": "cmk6fvjw00007hxtsirwx4s8m", "singleSidedPrice": 2300}, {"weight": 1, "specificationId": "cmk6fkx5l000f4b63teec2nro", "singleSidedPrice": 2100}, {"weight": 1, "specificationId": "cmkauuj5e0001620vtvan1277", "singleSidedPrice": 2300}, {"weight": 1, "specificationId": "cmkavvboy0002ft7lsl0ipbee", "singleSidedPrice": 2900}, {"weight": 1, "specificationId": "cmk6fdf7600094b63ff6454lx", "singleSidedPrice": 4200}, {"weight": 1, "specificationId": "cmk6fcj4f00054b63m430jdn4", "singleSidedPrice": 5000}, {"weight": 1, "specificationId": "cmk6fd3th00074b63i1ouhou9", "singleSidedPrice": 6200}, {"weight": 1, "specificationId": "cmk6feqsy000b4b63vxejnfur", "singleSidedPrice": 7800}, {"weight": 1, "specificationId": "cmk6gcadu0001v9w2k7ogf6zt", "singleSidedPrice": 10000}, {"weight": 1, "specificationId": "cmk6gcljl0003v9w2qe2j0lo1", "singleSidedPrice": 18300}, {"weight": 1, "specificationId": "cmk6fc2o500024b63vwcm68cp", "singleSidedPrice": 310}, {"weight": 1, "specificationId": "cmk6f27nr0005o43xwyhm7een", "singleSidedPrice": 460}, {"weight": 1, "specificationId": "cmk6fc2od00034b63mc8vtlep", "singleSidedPrice": 310}], "pricingMode": "spec", "inkjetBasePrice": 12.98701298701299, "inkjetBaseSpecId": "cmk6fjyhm000c4b631modt98m"}, {"id": "pg_1768786011553_8h4u0zoem", "color": "blue", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}], "specPrices": [{"weight": 1, "specificationId": "cmk6fbng100004b63c70xzv5a", "singleSidedPrice": 430}, {"weight": 1, "specificationId": "cmk6fu8av0005hxtsrjafllf0", "singleSidedPrice": 600}, {"weight": 1, "specificationId": "cmk6f3ym20006o43xdewhcbes", "singleSidedPrice": 700}, {"weight": 1, "specificationId": "cmk6f88vs0009o43x378tye2v", "singleSidedPrice": 850}, {"weight": 1, "specificationId": "cmk6ftqqu0004hxtskccmbx2s", "singleSidedPrice": 900}, {"weight": 1, "specificationId": "cmk6f6ndh0008o43xcv3mdzu1", "singleSidedPrice": 1100}, {"weight": 1, "specificationId": "cmk6fjyhm000c4b631modt98m", "singleSidedPrice": 1400}, {"weight": 1, "specificationId": "cmk6fkx5j000e4b639whx3sxx", "singleSidedPrice": 1500}, {"weight": 1, "specificationId": "cmk6fvjvy0006hxtspj3i6nks", "singleSidedPrice": 1600}, {"weight": 1, "specificationId": "cmkauuj580000620v7qprf1fa", "singleSidedPrice": 1600}, {"weight": 1, "specificationId": "cmkavuol30000ft7ltr5dldbf", "singleSidedPrice": 1800}, {"weight": 1, "specificationId": "cmkavvbot0001ft7l6yfnze23", "singleSidedPrice": 2000}, {"weight": 1, "specificationId": "cmk6fdf7400084b63698iy8j5", "singleSidedPrice": 2900}, {"weight": 1, "specificationId": "cmk6fcj4d00044b63ydvo3m99", "singleSidedPrice": 3500}, {"weight": 1, "specificationId": "cmk6fd3tf00064b63chde9ajf", "singleSidedPrice": 4300}, {"weight": 1, "specificationId": "cmk6feqsv000a4b631dxzz34w", "singleSidedPrice": 5400}, {"weight": 1, "specificationId": "cmk6gcadq0000v9w22gdjvtj0", "singleSidedPrice": 6900}, {"weight": 1, "specificationId": "cmk6gcljh0002v9w2h60pr8xa", "singleSidedPrice": 12700}, {"weight": 1, "specificationId": "cmk6f27np0004o43xbl1qfr5n", "singleSidedPrice": 320}, {"weight": 1, "specificationId": "cmk6fbng600014b63lbz4hbql", "singleSidedPrice": 430}, {"weight": 1, "specificationId": "cmk6f3ym40007o43x4w1i7igj", "singleSidedPrice": 700}, {"weight": 1, "specificationId": "cmk6f88vu000ao43x13j2f12j", "singleSidedPrice": 850}, {"weight": 1, "specificationId": "cmk6fjyhq000d4b63ltsp5xkp", "singleSidedPrice": 1400}, {"weight": 1, "specificationId": "cmk6fvjw00007hxtsirwx4s8m", "singleSidedPrice": 1600}, {"weight": 1, "specificationId": "cmk6fkx5l000f4b63teec2nro", "singleSidedPrice": 1500}, {"weight": 1, "specificationId": "cmkauuj5e0001620vtvan1277", "singleSidedPrice": 1600}, {"weight": 1, "specificationId": "cmkavvboy0002ft7lsl0ipbee", "singleSidedPrice": 2000}, {"weight": 1, "specificationId": "cmk6fdf7600094b63ff6454lx", "singleSidedPrice": 2900}, {"weight": 1, "specificationId": "cmk6fcj4f00054b63m430jdn4", "singleSidedPrice": 3500}, {"weight": 1, "specificationId": "cmk6fd3th00074b63i1ouhou9", "singleSidedPrice": 4300}, {"weight": 1, "specificationId": "cmk6feqsy000b4b63vxejnfur", "singleSidedPrice": 5400}, {"weight": 1, "specificationId": "cmk6gcadu0001v9w2k7ogf6zt", "singleSidedPrice": 6900}, {"weight": 1, "specificationId": "cmk6gcljl0003v9w2qe2j0lo1", "singleSidedPrice": 12700}, {"weight": 1, "specificationId": "cmk6fc2o500024b63vwcm68cp", "singleSidedPrice": 220}, {"weight": 1, "specificationId": "cmk6f27nr0005o43xwyhm7een", "singleSidedPrice": 320}, {"weight": 1, "specificationId": "cmk6fc2od00034b63mc8vtlep", "singleSidedPrice": 220}], "pricingMode": "sqinch", "inkjetBasePrice": 9, "inkjetBaseSpecId": ""}, {"id": "pg_1768786011964_9cx7ux2sp", "color": "yellow", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}], "specPrices": [{"weight": 1, "specificationId": "cmk6fbng100004b63c70xzv5a", "singleSidedPrice": 480}, {"weight": 1, "specificationId": "cmk6fu8av0005hxtsrjafllf0", "singleSidedPrice": 640}, {"weight": 1, "specificationId": "cmk6f3ym20006o43xdewhcbes", "singleSidedPrice": 800}, {"weight": 1, "specificationId": "cmk6f88vs0009o43x378tye2v", "singleSidedPrice": 967}, {"weight": 1, "specificationId": "cmk6ftqqu0004hxtskccmbx2s", "singleSidedPrice": 1000}, {"weight": 1, "specificationId": "cmk6f6ndh0008o43xcv3mdzu1", "singleSidedPrice": 1210}, {"weight": 1, "specificationId": "cmk6fjyhm000c4b631modt98m", "singleSidedPrice": 1540}, {"weight": 1, "specificationId": "cmk6fkx5j000e4b639whx3sxx", "singleSidedPrice": 1650}, {"weight": 1, "specificationId": "cmk6fvjvy0006hxtspj3i6nks", "singleSidedPrice": 1760}, {"weight": 1, "specificationId": "cmkauuj580000620v7qprf1fa", "singleSidedPrice": 1800}, {"weight": 1, "specificationId": "cmkavuol30000ft7ltr5dldbf", "singleSidedPrice": 1960}, {"weight": 1, "specificationId": "cmkavvbot0001ft7l6yfnze23", "singleSidedPrice": 2240}, {"weight": 1, "specificationId": "cmk6fdf7400084b63698iy8j5", "singleSidedPrice": 3200}, {"weight": 1, "specificationId": "cmk6fcj4d00044b63ydvo3m99", "singleSidedPrice": 3840}, {"weight": 1, "specificationId": "cmk6fd3tf00064b63chde9ajf", "singleSidedPrice": 4800}, {"weight": 1, "specificationId": "cmk6feqsv000a4b631dxzz34w", "singleSidedPrice": 6000}, {"weight": 1, "specificationId": "cmk6gcadq0000v9w22gdjvtj0", "singleSidedPrice": 7680}, {"weight": 1, "specificationId": "cmk6gcljh0002v9w2h60pr8xa", "singleSidedPrice": 14080}, {"weight": 1, "specificationId": "cmk6f27np0004o43xbl1qfr5n", "singleSidedPrice": 350}, {"weight": 1, "specificationId": "cmk6fbng600014b63lbz4hbql", "singleSidedPrice": 480}, {"weight": 1, "specificationId": "cmk6f3ym40007o43x4w1i7igj", "singleSidedPrice": 800}, {"weight": 1, "specificationId": "cmk6f88vu000ao43x13j2f12j", "singleSidedPrice": 967}, {"weight": 1, "specificationId": "cmk6fjyhq000d4b63ltsp5xkp", "singleSidedPrice": 1540}, {"weight": 1, "specificationId": "cmk6fvjw00007hxtsirwx4s8m", "singleSidedPrice": 1760}, {"weight": 1, "specificationId": "cmk6fkx5l000f4b63teec2nro", "singleSidedPrice": 1650}, {"weight": 1, "specificationId": "cmkauuj5e0001620vtvan1277", "singleSidedPrice": 1800}, {"weight": 1, "specificationId": "cmkavvboy0002ft7lsl0ipbee", "singleSidedPrice": 2240}, {"weight": 1, "specificationId": "cmk6fdf7600094b63ff6454lx", "singleSidedPrice": 3200}, {"weight": 1, "specificationId": "cmk6fcj4f00054b63m430jdn4", "singleSidedPrice": 3840}, {"weight": 1, "specificationId": "cmk6fd3th00074b63i1ouhou9", "singleSidedPrice": 4800}, {"weight": 1, "specificationId": "cmk6feqsy000b4b63vxejnfur", "singleSidedPrice": 6000}, {"weight": 1, "specificationId": "cmk6gcadu0001v9w2k7ogf6zt", "singleSidedPrice": 7680}, {"weight": 1, "specificationId": "cmk6gcljl0003v9w2qe2j0lo1", "singleSidedPrice": 14080}, {"weight": 1, "specificationId": "cmk6fc2o500024b63vwcm68cp", "singleSidedPrice": 240}, {"weight": 1, "specificationId": "cmk6f27nr0005o43xwyhm7een", "singleSidedPrice": 350}, {"weight": 1, "specificationId": "cmk6fc2od00034b63mc8vtlep", "singleSidedPrice": 240}], "pricingMode": "sqinch", "inkjetBasePrice": 10, "inkjetBaseSpecId": ""}]	{"cmk6cj27s0001oeub8ot2p5wq": "pg_1768786011553_8h4u0zoem", "cmk6cl3kp0004oeub4w4fpghp": "pg_1768786011033_7qd25f1mq", "cmko0b90d000dv6kucf3istj1": "pg_1768786011964_9cx7ux2sp"}	null	cm	\N	0	t	2026-01-19 01:27:59.081	2026-02-05 07:23:29.145	\N	mm2	\N	\N	\N	\N	\N	none
cml8tboql0001ll8njegn1tsj	cml7o4ywc002nejzmgzhahepe	2220301_001	in_house	nup_page_range	압축제본_웨딩.베이비		0.00	0.00	1.0		album	{}	all	\N	\N	\N	\N	null	null	[10, 20]	cm	null	0	t	2026-02-05 02:03:42.717	2026-02-18 10:50:03.584	null	mm	null	\N	\N	\N	\N	none
cml8tfb2e0027ll8nfsq45jor	cml7nug8d002hejzmn66i5nx6	2220101_001	in_house	nup_page_range	스타제본		0.00	0.00	0.0		indigo	{}	all	\N	\N	\N	\N	null	null	[20, 30, 40, 50]	cm	null	0	t	2026-02-05 02:06:31.622	2026-02-05 02:09:00.277	null	mm	null	\N	\N	\N	\N	none
cmkafl76r0001kz5orjfsda7c	cmk5crnw9000514mitnz68inm	11_001	in_house	paper_output_spec	웨딩베이비		0.00	0.00	1.0		indigo	{}	all	\N	\N		\N	[{"id": "pg_1768178038155_nz57kv6ai", "color": "green", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 1100, "sixColorSinglePrice": 1100, "fourColorDoublePrice": 1000, "fourColorSinglePrice": 1000}, {"up": 2, "weight": 1.2, "sixColorDoublePrice": 660, "sixColorSinglePrice": 660, "fourColorDoublePrice": 600, "fourColorSinglePrice": 600}, {"up": 4, "weight": 1.3, "sixColorDoublePrice": 360, "sixColorSinglePrice": 358, "fourColorDoublePrice": 325, "fourColorSinglePrice": 330}, {"up": 8, "weight": 1.4, "sixColorDoublePrice": 190, "sixColorSinglePrice": 193, "fourColorDoublePrice": 175, "fourColorSinglePrice": 180}], "specPrices": [{"weight": 1, "specificationId": "cmk6fbng100004b63c70xzv5a", "singleSidedPrice": 270}, {"weight": 1, "specificationId": "cmk6fu8av0005hxtsrjafllf0", "singleSidedPrice": 360}, {"weight": 1, "specificationId": "cmk6f3ym20006o43xdewhcbes", "singleSidedPrice": 450}, {"weight": 1, "specificationId": "cmk6f88vs0009o43x378tye2v", "singleSidedPrice": 544}, {"weight": 1, "specificationId": "cmk6ftqqu0004hxtskccmbx2s", "singleSidedPrice": 563}, {"weight": 1, "specificationId": "cmk6f6ndh0008o43xcv3mdzu1", "singleSidedPrice": 681}, {"weight": 1, "specificationId": "cmk6fjyhm000c4b631modt98m", "singleSidedPrice": 866}, {"weight": 1, "specificationId": "cmk6fkx5j000e4b639whx3sxx", "singleSidedPrice": 928}, {"weight": 1, "specificationId": "cmk6fvjvy0006hxtspj3i6nks", "singleSidedPrice": 990}, {"weight": 1, "specificationId": "cmkauuj580000620v7qprf1fa", "singleSidedPrice": 1013}, {"weight": 1, "specificationId": "cmkavuol30000ft7ltr5dldbf", "singleSidedPrice": 1103}, {"weight": 1, "specificationId": "cmkavvbot0001ft7l6yfnze23", "singleSidedPrice": 1260}, {"weight": 1, "specificationId": "cmk6fdf7400084b63698iy8j5", "singleSidedPrice": 1800}, {"weight": 1, "specificationId": "cmk6fcj4d00044b63ydvo3m99", "singleSidedPrice": 2160}, {"weight": 1, "specificationId": "cmk6fd3tf00064b63chde9ajf", "singleSidedPrice": 2700}, {"weight": 1, "specificationId": "cmk6feqsv000a4b631dxzz34w", "singleSidedPrice": 3375}, {"weight": 1, "specificationId": "cmk6gcadq0000v9w22gdjvtj0", "singleSidedPrice": 4320}, {"weight": 1, "specificationId": "cmk6gcljh0002v9w2h60pr8xa", "singleSidedPrice": 7920}, {"weight": 1, "specificationId": "cmk6f27np0004o43xbl1qfr5n", "singleSidedPrice": 197}, {"weight": 1, "specificationId": "cmk6fbng600014b63lbz4hbql", "singleSidedPrice": 270}, {"weight": 1, "specificationId": "cmk6f3ym40007o43x4w1i7igj", "singleSidedPrice": 450}, {"weight": 1, "specificationId": "cmk6f88vu000ao43x13j2f12j", "singleSidedPrice": 544}, {"weight": 1, "specificationId": "cmk6fjyhq000d4b63ltsp5xkp", "singleSidedPrice": 866}, {"weight": 1, "specificationId": "cmk6fvjw00007hxtsirwx4s8m", "singleSidedPrice": 990}, {"weight": 1, "specificationId": "cmk6fkx5l000f4b63teec2nro", "singleSidedPrice": 928}, {"weight": 1, "specificationId": "cmkauuj5e0001620vtvan1277", "singleSidedPrice": 1013}, {"weight": 1, "specificationId": "cmkavvboy0002ft7lsl0ipbee", "singleSidedPrice": 1260}, {"weight": 1, "specificationId": "cmk6fdf7600094b63ff6454lx", "singleSidedPrice": 1800}, {"weight": 1, "specificationId": "cmk6fcj4f00054b63m430jdn4", "singleSidedPrice": 2160}, {"weight": 1, "specificationId": "cmk6fd3th00074b63i1ouhou9", "singleSidedPrice": 2700}, {"weight": 1, "specificationId": "cmk6feqsy000b4b63vxejnfur", "singleSidedPrice": 3375}, {"weight": 1, "specificationId": "cmk6gcadu0001v9w2k7ogf6zt", "singleSidedPrice": 4320}, {"weight": 1, "specificationId": "cmk6gcljl0003v9w2qe2j0lo1", "singleSidedPrice": 7920}, {"weight": 1.2, "specificationId": "cmk6fc2o500024b63vwcm68cp", "singleSidedPrice": 162}, {"weight": 1, "specificationId": "cmk6f27nr0005o43xwyhm7een", "singleSidedPrice": 197}, {"weight": 1, "specificationId": "cmk6fc2od00034b63mc8vtlep", "singleSidedPrice": 135}], "pricingMode": "spec", "inkjetBasePrice": 5.625, "inkjetBaseSpecId": "cmk6f3ym20006o43xdewhcbes"}, {"id": "pg_1768178039087_itb887tbc", "color": "blue", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 1100, "sixColorSinglePrice": 1200, "fourColorDoublePrice": 950, "fourColorSinglePrice": 1000}, {"up": 2, "weight": 1, "sixColorDoublePrice": 550, "sixColorSinglePrice": 600, "fourColorDoublePrice": 480, "fourColorSinglePrice": 500}, {"up": 4, "weight": 1, "sixColorDoublePrice": 280, "sixColorSinglePrice": 300, "fourColorDoublePrice": 240, "fourColorSinglePrice": 250}, {"up": 8, "weight": 1, "sixColorDoublePrice": 140, "sixColorSinglePrice": 150, "fourColorDoublePrice": 120, "fourColorSinglePrice": 130}], "specPrices": [], "pricingMode": "spec", "inkjetBasePrice": 5}, {"id": "pg_1770487983565_9n562dtbw", "color": "yellow", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}]}, {"id": "pg_1770487984072_tim597gf1", "color": "red", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}]}, {"id": "pg_1770487984518_ynaujce98", "color": "purple", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}]}]	{"cmk6bnlsk0002w4rgwhc1y6dw": "pg_1768178039087_itb887tbc", "cmk6bw3930004w4rgfz1xi87r": "pg_1768178038155_nz57kv6ai", "cmk6bx7xd0006w4rgt2s54dqp": null, "cmk6c19320008w4rgtgxtmtlc": "pg_1768178039087_itb887tbc", "cmk6cj27s0001oeub8ot2p5wq": "pg_1768178039087_itb887tbc", "cmk6cl3kp0004oeub4w4fpghp": "pg_1768178038155_nz57kv6ai"}	\N	cm	\N	0	t	2026-01-12 00:35:01.922	2026-02-07 18:13:06.951	\N	mm2	\N	\N	\N	\N	\N	none
cmljhywa6003pkze01nq6cqhd	cmk6gihm30009v9w27j6zfq2m	2301_002	in_house	finishing_spec_nup	수성코팅		0.00	0.00	0.0		\N	{}	all	\N	\N	\N	\N	null	null	null	cm	null	1	t	2026-02-12 13:31:18.126	2026-02-12 13:31:18.126	null	mm	null	\N	\N	\N	\N	none
cmljhzlf6004tkze07rhfz4he	cmljexe24001bilhatxlg1neu	2302_001	in_house	paper_output_spec	첫장트레팔지 추가		0.00	0.00	0.0		indigo	{}	all	\N	\N	\N	\N	[]	{}	null	cm	null	0	t	2026-02-12 13:31:50.706	2026-02-12 13:31:50.706	null	mm	null	\N	\N	\N	\N	none
cmlji2gcw0060kze0bnjfqsdh	cmljexyi9001dilham6uom848	2303_001	in_house	finishing_area	레이져 각인		0.00	0.00	0.0		\N	{}	all	\N	\N	\N	\N	null	null	null	cm	null	0	t	2026-02-12 13:34:04.112	2026-02-12 13:34:04.112	[{"area": 2400, "price": 2000, "maxWidth": 30, "maxHeight": 80}, {"area": 3000, "price": 3000, "maxWidth": 30, "maxHeight": 100}, {"area": 3600, "price": 4000, "maxWidth": 30, "maxHeight": 120}, {"area": 6000, "price": 5000, "maxWidth": 40, "maxHeight": 150}, {"area": 0, "price": 0, "maxWidth": 0, "maxHeight": 0}]	mm	null	\N	\N	\N	\N	none
cmlji08q2004wkze0gss2hwnn	cmljexe24001bilhatxlg1neu	2302_002	in_house	finishing_spec_nup	첫장 한지추가		0.00	0.00	0.0		\N	{}	indigo	\N	\N	\N	\N	null	null	null	cm	null	1	t	2026-02-12 13:32:20.906	2026-02-12 13:34:55.008	null	mm	null	\N	\N	\N	\N	none
cmljhykjc002lkze0179w4gjs	cmk6gihm30009v9w27j6zfq2m	2301_001	in_house	finishing_spec_nup	라미네이팅코팅		0.00	0.00	0.0		\N	{}	indigo	\N	\N	\N	\N	null	null	null	cm	null	0	t	2026-02-12 13:31:02.904	2026-02-12 13:36:10.729	null	mm	null	\N	\N	\N	\N	none
cmlvjl8c4001dm8c11d4f0fim	cmklvrqx40001dgdw7f98ssrs	\N	in_house	delivery_parcel	택배	\N	0.00	5500.00	2.0	\N	\N	{}	all	\N	\N	\N	\N	null	null	null	cm	null	0	t	2026-02-20 23:49:53.908	2026-02-20 23:50:21.288	null	mm	[]	0.00	50000.00	3000.00	0	free_condition
\.


ALTER TABLE public.production_settings ENABLE TRIGGER ALL;

--
-- Data for Name: client_production_setting_prices; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.client_production_setting_prices DISABLE TRIGGER ALL;

COPY public.client_production_setting_prices (id, "clientId", "productionSettingId", "specificationId", "priceGroupId", "minQuantity", "maxQuantity", weight, price, "singleSidedPrice", "doubleSidedPrice", "fourColorSinglePrice", "fourColorDoublePrice", "sixColorSinglePrice", "sixColorDoublePrice", "basePages", "basePrice", "pricePerPage", "rangePrices", "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.client_production_setting_prices ENABLE TRIGGER ALL;

--
-- Data for Name: coatings; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.coatings DISABLE TRIGGER ALL;

COPY public.coatings (id, code, name, type, "basePrice", "pricePerPage", description, memo, "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.coatings ENABLE TRIGGER ALL;

--
-- Data for Name: color_intents; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.color_intents DISABLE TRIGGER ALL;

COPY public.color_intents (id, code, name, "numColorsFront", "numColorsBack", "colorType", "colorantOrder", "coatingFront", "coatingBack", "colorStandard", "printingTechnology", "displayNameKo", "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cml4hdu7s00007smtsokybwzu	CI-4C-1S	4도 단면	4	0	Process	{}	\N	\N	FOGRA39	DigitalPrinting	4도 풀컬러 단면	1	t	2026-02-02 01:18:23.033	2026-02-02 01:18:23.033
cml4hdu7v00017smtuhy0s9e0	CI-4C-2S	4도 양면	4	4	Process	{}	\N	\N	FOGRA39	DigitalPrinting	4도 풀컬러 양면	2	t	2026-02-02 01:18:23.036	2026-02-02 01:18:23.036
cml4hdu7w00027smthjsuozy6	CI-6C-1S	6도 단면	6	0	Process	{}	\N	\N	FOGRA39	DigitalPrinting	6도 컬러 단면	3	t	2026-02-02 01:18:23.037	2026-02-02 01:18:23.037
cml4hdu7x00037smtpjxhk6ey	CI-6C-2S	6도 양면	6	6	Process	{}	\N	\N	FOGRA39	DigitalPrinting	6도 컬러 양면	4	t	2026-02-02 01:18:23.038	2026-02-02 01:18:23.038
cml4hdu7y00047smte5flb6vx	CI-1C-1S	단색 단면	1	0	Process	{}	\N	\N	FOGRA39	DigitalPrinting	흑백 단면	5	t	2026-02-02 01:18:23.039	2026-02-02 01:18:23.039
cml4hdu7z00057smtz7sd8x0g	CI-1C-2S	단색 양면	1	1	Process	{}	\N	\N	FOGRA39	DigitalPrinting	흑백 양면	6	t	2026-02-02 01:18:23.04	2026-02-02 01:18:23.04
\.


ALTER TABLE public.color_intents ENABLE TRIGGER ALL;

--
-- Data for Name: consultation_alerts; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.consultation_alerts DISABLE TRIGGER ALL;

COPY public.consultation_alerts (id, "clientId", "consultationId", "alertType", "alertLevel", title, message, "triggerCondition", "isRead", "readAt", "readBy", "isResolved", "resolvedAt", "resolvedBy", resolution, "createdAt", "expiresAt") FROM stdin;
\.


ALTER TABLE public.consultation_alerts ENABLE TRIGGER ALL;

--
-- Data for Name: consultation_categories; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.consultation_categories DISABLE TRIGGER ALL;

COPY public.consultation_categories (id, code, name, "colorCode", "sortOrder", "isActive", "createdAt", "updatedAt", description) FROM stdin;
cmknzaj1u00003e2efxjz6rsh	album	앨범크레임	#EF4444	0	t	2026-01-21 12:07:36.689	2026-01-21 12:07:36.689	\N
cmknzar2s00013e2e2kx3cg8v	category	액자크레임	#F97316	1	t	2026-01-21 12:07:47.092	2026-01-21 12:07:47.092	\N
cmko0uauf000jv6ku1fl0bveq	product_inquiry	제품설정및 문의	#06B6D4	4	t	2026-01-21 12:50:58.792	2026-01-21 12:50:58.792	\N
cml5wrkqa0004glhlejyru9h4	inquiry	동판제작문의	#3B82F6	5	t	2026-02-03 01:16:44.339	2026-02-03 01:16:44.339	\N
cmko0thwp000iv6kukv1xpo66	consult	견적상담	#3B82F6	3	t	2026-01-21 12:50:21.289	2026-02-03 03:59:23.617	\N
cmknzb07q00023e2euonc8ibb	delivery	배송크레임	#EAB308	2	t	2026-01-21 12:07:58.935	2026-02-03 03:59:31.494	\N
cml637rb20001v44v31ls748k	cover_consult	표지상담	#3B82F6	6	t	2026-02-03 04:17:17.054	2026-02-03 04:17:17.054	\N
\.


ALTER TABLE public.consultation_categories ENABLE TRIGGER ALL;

--
-- Data for Name: consultation_channels; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.consultation_channels DISABLE TRIGGER ALL;

COPY public.consultation_channels (id, "consultationId", channel, "channelDetail", direction, "callDuration", "callRecordUrl", metadata, "createdAt") FROM stdin;
\.


ALTER TABLE public.consultation_channels ENABLE TRIGGER ALL;

--
-- Data for Name: consultations; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.consultations DISABLE TRIGGER ALL;

COPY public.consultations (id, "consultNumber", "clientId", "categoryId", title, content, "orderId", "orderNumber", "counselorId", "counselorName", "consultedAt", status, priority, resolution, "resolvedAt", "resolvedBy", "followUpDate", "followUpNote", "kakaoScheduled", "kakaoSendAt", "kakaoSentAt", "kakaoMessage", attachments, "internalMemo", "createdAt", "updatedAt", "closedAt", "closedBy", "inProgressAt", "inProgressBy", "openedAt", "openedBy") FROM stdin;
cml5xjuqk000312re2biyyqnv	CS-20260203-0001	cml5w4ssp0001v7vnm48qzlwz	cml5wrkqa0004glhlejyru9h4	경기졸업기념 동판제작문의 합니다.	앞에 동판은 레이져각인으로\n쎄네카는 동판으로 \n이번에 원단은 브라운 계통 원단으로 합니다. 	\N	\N	staff-1	상담원	2026-02-03 01:38:43.674	open	high	\N	\N	\N	\N		f	\N	\N	\N	\N	\N	2026-02-03 01:38:43.676	2026-02-03 02:07:39.398	\N	\N	\N	\N	2026-02-03 01:38:43.676	\N
cmko0gtl0000hv6ku96zsbi1c	CS-20260121-0001	cmkg8vzuf0000at5m0dyaydie	cmknzaj1u00003e2efxjz6rsh	표지 스크레치	반품요청	\N	\N	admin	관리자	2026-01-21 12:40:29.891	closed	normal	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	반품신청	2026-01-21 12:40:29.892	2026-02-03 02:23:41.938	\N	\N	2026-01-21 12:52:38.523	상담원	2026-01-21 12:40:29.892	\N
cml0chk3e0005zxl5y05sw31a	CS-20260130-0001	cmkg8vzuf0000at5m0dyaydie	cmknzaj1u00003e2efxjz6rsh	색상이 이상해요	[문제]\n전과 색상이 달라요\n\n[해결방법]\n1. 모니터 CMS(Color Management System)가 되었는지요?\n2. 앨범 반송처리하여 확인해보겠습니다.	\N	\N	staff-1	상담원	2026-01-30 03:50:13.753	closed	urgent	\N	\N	\N	\N	1. 모니터 CMS(Color Management System)가 되었는지요?\n2. 앨범 반송처리하여 확인해보겠습니다.	f	\N	\N	\N	\N	\N	2026-01-30 03:50:13.754	2026-02-03 02:23:56.67	\N	\N	\N	\N	2026-01-30 03:50:13.754	\N
cml63umde0003v44vi8mwgglb	CS-20260203-0002	cml5w4ssp0001v7vnm48qzlwz	cml637rb20001v44v31ls748k	표지원단상담	표지는 습식누박_U3303_ 브라운으로 10x10 압축14p 20부 입니다.\n견적금액은 \n10x10 14p 압축앨범 35,500원+레이져각인 2,000원\n권당 37,500원입니다.\n2월20일까지 받을수 있도록 요청하였음(2월19일까지 배송출발)	\N	\N	cml63cj8d000610fc52rxd1r8	관리자	2026-02-03 04:35:03.744	open	high	\N	\N	\N	2026-02-19 00:00:00	\N	f	\N	\N	\N	\N	\N	2026-02-03 04:35:03.746	2026-02-03 04:35:03.746	\N	\N	\N	\N	2026-02-03 04:35:03.746	\N
cmlc4di2v00047cvnn3j7ajp2	CS-20260207-0001	cmlc48lcw00017cvnisoyrvqk	cmko0thwp000iv6kukv1xpo66	원판앨범 견적문의 합니다	[문제]\n가격을 알고싶어요\n\n[해결방법]\n네  11R기준 10P가 기본이고 22,000원입니다.	\N	\N	cml63cj8d000610fc52rxd1r8	우영국	2026-02-07 09:36:21.702	in_progress	normal	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	표지빼고 12,000원(vat별도)입니다. 표지국내제작은 8,000원정도입니다.	2026-02-07 09:36:21.703	2026-02-07 09:37:08.42	\N	\N	2026-02-07 09:37:08.419	상담원	2026-02-07 09:36:21.703	\N
\.


ALTER TABLE public.consultations ENABLE TRIGGER ALL;

--
-- Data for Name: consultation_follow_ups; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.consultation_follow_ups DISABLE TRIGGER ALL;

COPY public.consultation_follow_ups (id, "consultationId", content, "actionType", "staffId", "staffName", "createdAt") FROM stdin;
cmlc4im5q00067cvn9op9tagy	cmlc4di2v00047cvnn3j7ajp2	방문상담합니다.	visit	staff-1	상담원	2026-02-07 09:40:20.271
\.


ALTER TABLE public.consultation_follow_ups ENABLE TRIGGER ALL;

--
-- Data for Name: consultation_guides; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.consultation_guides DISABLE TRIGGER ALL;

COPY public.consultation_guides (id, "categoryId", "tagCodes", title, problem, solution, scripts, "relatedGuideIds", attachments, "usageCount", "helpfulCount", "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cmknzci0c00033e2eov40zpmq	cmknzaj1u00003e2efxjz6rsh	{}	앨범 속지순서가 바뀌었어요	페이지 순서 제본순서바뀜	택배 반송처리	\N	{}	\N	0	0	0	t	2026-01-21 12:09:08.653	2026-01-21 12:09:08.653
cmknzfk2g00043e2ek442ywn1	cmknzaj1u00003e2efxjz6rsh	{}	색상이 이상해요	전과 색상이 달라요	1. 모니터 CMS(Color Management System)가 되었는지요?\n2. 앨범 반송처리하여 확인해보겠습니다.	\N	{}	\N	0	0	0	t	2026-01-21 12:11:31.288	2026-01-21 12:11:31.288
cml5xd3al000112re5ey95cc4	cml5wrkqa0004glhlejyru9h4	{}	동판제작문의 합니다.	동판제작기간 : 1박2일\n접수파일 : 아도브일러스트 ai파일로 보내주세요. \n동판 각인위치 : 정중앙, 중상, 중하, 우중, 우하\n동판 각인컬러 : 금박,은박, 밤박, 먹박, 화이트박, 홀로그램박\n레이져로 할의향 있는지?\n \n	ai파일이 없으면 jpg파일로도 접수가 가능은 하지만 품질이 떨어질수 있습니다.\n레이져 각인비용 :  2,000원 추가됩니다.\n동판금액 : 가로x세로 시뮬레이션호 금액 고지바랍니다.	\N	{}	\N	1	1	0	t	2026-02-03 01:33:28.119	2026-02-03 03:56:27.527
cmlc4bnzx00027cvnwr0lv3qy	cmko0thwp000iv6kukv1xpo66	{}	원판앨범 견적문의 합니다	가격을 알고싶어요	네  11R기준 10P가 기본이고 22,000원입니다.	\N	{}	\N	0	0	0	t	2026-02-07 09:34:56.061	2026-02-07 09:34:56.061
\.


ALTER TABLE public.consultation_guides ENABLE TRIGGER ALL;

--
-- Data for Name: consultation_messages; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.consultation_messages DISABLE TRIGGER ALL;

COPY public.consultation_messages (id, "consultationId", direction, channel, content, attachments, "senderName", "senderType", "staffId", "staffName", "messageAt", "isRead", "readAt", "createdAt") FROM stdin;
\.


ALTER TABLE public.consultation_messages ENABLE TRIGGER ALL;

--
-- Data for Name: consultation_slas; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.consultation_slas DISABLE TRIGGER ALL;

COPY public.consultation_slas (id, name, "categoryId", priority, "firstResponseTarget", "resolutionTarget", "escalationTime", "escalateTo", "warningThreshold", "criticalThreshold", "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.consultation_slas ENABLE TRIGGER ALL;

--
-- Data for Name: consultation_stat_snapshots; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.consultation_stat_snapshots DISABLE TRIGGER ALL;

COPY public.consultation_stat_snapshots (id, period, "periodStart", "periodEnd", "totalCount", "claimCount", "inquiryCount", "salesCount", "resolvedCount", "pendingCount", "avgFirstResponseTime", "avgResolutionTime", "slaComplianceRate", "avgSatisfactionScore", "channelStats", "categoryStats", "tagStats", "counselorStats", "createdAt") FROM stdin;
\.


ALTER TABLE public.consultation_stat_snapshots ENABLE TRIGGER ALL;

--
-- Data for Name: consultation_surveys; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.consultation_surveys DISABLE TRIGGER ALL;

COPY public.consultation_surveys (id, "consultationId", "satisfactionScore", "responseSpeedScore", "resolutionScore", "friendlinessScore", feedback, "wouldRecommend", "surveyMethod", "surveyedAt", "createdAt") FROM stdin;
\.


ALTER TABLE public.consultation_surveys ENABLE TRIGGER ALL;

--
-- Data for Name: consultation_tags; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.consultation_tags DISABLE TRIGGER ALL;

COPY public.consultation_tags (id, code, name, "colorCode", category, "sortOrder", "isActive", "isAutoTag", keywords, "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.consultation_tags ENABLE TRIGGER ALL;

--
-- Data for Name: consultation_tag_mappings; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.consultation_tag_mappings DISABLE TRIGGER ALL;

COPY public.consultation_tag_mappings (id, "consultationId", "tagId", "isAutoTagged", confidence, "createdAt") FROM stdin;
\.


ALTER TABLE public.consultation_tag_mappings ENABLE TRIGGER ALL;

--
-- Data for Name: copper_plates; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.copper_plates DISABLE TRIGGER ALL;

COPY public.copper_plates (id, "clientId", "plateName", "plateCode", "foilColor", "foilColorName", "widthMm", "heightMm", "storageLocation", "imageUrl", "designFileUrl", notes, "registeredById", "registeredBy", status, "sortOrder", "usageCount", "firstUsedAt", "lastUsedAt", "returnedAt", "createdAt", "updatedAt", "aiFileUrl", "albumPhotoUrl", "appliedAlbumName", "foilPosition", "plateType", "registeredAt") FROM stdin;
cmkyz7fln0001mok2a7yw9njx	cmkg8vzuf0000at5m0dyaydie	SIGNUS		gold_glossy		\N	\N	\N	http://localhost:3001/api/v1/upload/copper-plate/image/451bbe35-e6de-4f83-9906-a9ccbb5790f9.jpg	\N		cmks8xaa70000n53cud7q38bl	관리자	stored	0	0	\N	\N	\N	2026-01-29 04:50:40.187	2026-01-30 03:59:42.822	http://localhost:3001/api/v1/upload/copper-plate/ai/906905c9-6db4-4885-ae8f-a73ec69cb161.ai	http://localhost:3001/api/v1/upload/copper-plate/album/bc9a016a-eb67-4d21-9fab-5163759bca00.jpg	\N	top_center	copper	2026-01-29 00:00:00
cml0cjlnu0007zxl5dmk6zu4i	cmkg8vzuf0000at5m0dyaydie	Scotter		gold_matte		\N	\N	\N	http://localhost:3001/api/v1/api/v1/upload/copper-plate/image/3dcce940-214b-4f15-8002-7de6130036b2.jpg	\N		cmks8xaa70000n53cud7q38bl	관리자	stored	0	0	\N	\N	\N	2026-01-30 03:51:49.098	2026-01-30 04:00:01.782	/upload/copper-plate/ai/90b7e277-0959-4b93-97df-c684986b3d49.ai	http://localhost:3001/api/v1/api/v1/upload/copper-plate/album/7b43216a-f2ba-4056-af36-20404eb1a51e.jpg	\N	top_center	copper	2026-01-30 00:00:00
cml5wlnbj0001glhl6whmp0wn	cml5w4ssp0001v7vnm48qzlwz	경기졸업음악회		silver_matte		\N	\N	\N	/upload/copper-plate/image/73831054-c6b4-441a-9019-6e4be9baf2be.jpg	\N		cmk5cpt1z0000ijuehpm9vtid	관리자	stored	0	0	\N	\N	\N	2026-02-03 01:12:07.759	2026-02-03 01:12:07.759	/upload/copper-plate/ai/16d0d447-6ba5-43ae-b98c-8ec8f93c8957.ai	/upload/copper-plate/album/af46b5c8-2c13-472f-8c7e-bd4cc9ce8603.jpg	\N	right_center	copper	2026-02-03 00:00:00
cml5z4fx200013w9enoi56zjs	cml5w4ssp0001v7vnm48qzlwz	경기초등학교		silver_glossy		\N	\N	\N	/upload/copper-plate/image/e3054715-3163-46a3-9e87-373182152ac7.jpg	\N	유광은박으로 처리요망	cmk5cpt1z0000ijuehpm9vtid	관리자	stored	0	0	\N	\N	\N	2026-02-03 02:22:43.863	2026-02-03 02:59:29.593	/upload/copper-plate/ai/1a491b56-a3c7-4711-9066-9b20c4cf7bb0.ai	/upload/copper-plate/album/7b6123ca-b4c5-46bb-8e6b-a142e575f9cb.jpg	\N		copper	2026-01-21 00:00:00
cmljifre80001108gm118u717	cmlc48lcw00017cvnisoyrvqk	The Korea		gold_matte		\N	\N	\N	\N	\N		cml63cj8d000610fc52rxd1r8	우영국	stored	0	0	\N	\N	\N	2026-02-12 13:44:24.944	2026-02-12 13:44:24.944	\N	\N	\N	top_center	copper	2026-02-12 00:00:00
cmlor0q4q0001ajqs41i5kscl	cmlls3h030000ted7yhh6qmdh	아마레스튜디오		gold_matte		\N	\N	\N	/uploads/copper-plates/images/30e80c34-8d36-4eb3-97d3-67b701dabe65.jpg	\N		cml63cj8d000610fc52rxd1r8	우영국	stored	0	0	\N	\N	\N	2026-02-16 05:43:30.889	2026-02-16 05:43:30.889	/uploads/copper-plates/ai/54a6b9bd-6b38-4002-8785-4c45edcee38b.ai	\N	\N	right_center	copper	2026-02-16 00:00:00
\.


ALTER TABLE public.copper_plates ENABLE TRIGGER ALL;

--
-- Data for Name: copper_plate_histories; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.copper_plate_histories DISABLE TRIGGER ALL;

COPY public.copper_plate_histories (id, "copperPlateId", "actionType", "previousStatus", "newStatus", "previousLocation", "newLocation", "orderId", "orderNumber", description, "actionById", "actionBy", "createdAt") FROM stdin;
cmkyz7flu0003mok2g1yd6qse	cmkyz7fln0001mok2a7yw9njx	registered	\N	stored	\N	\N	\N	\N	동판 "동판" 등록	cmks8xaa70000n53cud7q38bl	관리자	2026-01-29 04:50:40.195
cml0cjlny0009zxl52sqbp5t5	cml0cjlnu0007zxl5dmk6zu4i	registered	\N	stored	\N	\N	\N	\N	동판 "Scotter" 등록	cmks8xaa70000n53cud7q38bl	관리자	2026-01-30 03:51:49.102
cml5wlnbn0003glhl3uf2x04q	cml5wlnbj0001glhl6whmp0wn	registered	\N	stored	\N	\N	\N	\N	동판 "경기졸업음악회" 등록	cmk5cpt1z0000ijuehpm9vtid	관리자	2026-02-03 01:12:07.764
cml5z4fx700033w9et4z50rll	cml5z4fx200013w9enoi56zjs	registered	\N	stored	\N	\N	\N	\N	동판 "경기초등학교" 등록	cmk5cpt1z0000ijuehpm9vtid	관리자	2026-02-03 02:22:43.867
cmljifreg0003108gm5jgljm7	cmljifre80001108gm118u717	registered	\N	stored	\N	\N	\N	\N	동판 "The Korea" 등록	cml63cj8d000610fc52rxd1r8	우영국	2026-02-12 13:44:24.953
cmlor0q530003ajqstf6w0oq1	cmlor0q4q0001ajqs41i5kscl	registered	\N	stored	\N	\N	\N	\N	동판 "아마레스튜디오" 등록	cml63cj8d000610fc52rxd1r8	우영국	2026-02-16 05:43:30.903
\.


ALTER TABLE public.copper_plate_histories ENABLE TRIGGER ALL;

--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.products DISABLE TRIGGER ALL;

COPY public.products (id, "productCode", "productName", "categoryId", "isActive", "isNew", "isBest", "memberType", "basePrice", "thumbnailUrl", "detailImages", description, "sortOrder", "createdAt", "updatedAt", "bindingDirection", "printType", "orderCount", "viewCount", "outputPriceSettings") FROM stdin;
cml4ixxoc0001gpi1byhcm6bf	S760565_복사	스타화보	cmk64twl1000914ayr1k0mddl	t	f	f	all	0.00	/upload/category-icons/5835202e-9400-4670-9885-b1a039f37afd.jpg	{/upload/category-icons/097cbe29-42d1-45f1-9234-44404df36b2b.jpg,/upload/category-icons/871500b2-95e5-43b3-bd95-eba760727614.jpg,/upload/category-icons/b4d2808f-500d-4c16-8700-607ec1feb9c2.jpg,/upload/category-icons/f664be7d-6e8a-4466-8741-8a288f79fb72.jpg}	<h3><strong>완전&nbsp;펼침(Lay-flat)&nbsp;특성</strong></h3><p>책을&nbsp;180도&nbsp;완전히&nbsp;펼쳐도&nbsp;페이지가&nbsp;손상되지&nbsp;않습니다.&nbsp;사진화보나&nbsp;앨범에서&nbsp;사진이&nbsp;가운데&nbsp;접히는&nbsp;부분&nbsp;없이&nbsp;깔끔하게&nbsp;보여야&nbsp;할&nbsp;때&nbsp;큰&nbsp;강점이&nbsp;됩니다.</p><p></p><h2><strong>친환경성</strong></h2><p>솔벤트&nbsp;없이&nbsp;습기와&nbsp;반응하여&nbsp;경화되는&nbsp;방식이라&nbsp;VOC(휘발성&nbsp;유기화합물)&nbsp;발생이&nbsp;적어&nbsp;상대적으로&nbsp;친환경적입니다.</p>	0	2026-02-02 02:02:00.252	2026-02-21 00:28:54.137	customer	double	175	499	[{"id": "1770905899856-4do-pryjpxxbc", "colorType": "4도", "outputMethod": "INDIGO", "selectedUpPrices": [[], [], [], [], [], [], [], [], [], [], []], "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1770905899856-6do-9wesklykj", "colorType": "6도", "outputMethod": "INDIGO", "selectedUpPrices": [[], [], [], [], [], [], [], [], [], [], []], "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}]
cmkse0z6y001p86l2dop9h1kg	S760565	에히오르 압축앨범	cmk64tnq3000714ayr2wp4dsf	t	t	t	all	0.00	/uploads/products/be09a664-7b8e-4ccf-a912-4026dfd228f2.jpg	{/uploads/products/4a089377-1ac9-4efa-85a8-3522b5ec502b.jpg}	<p></p>	0	2026-01-24 14:11:09.992	2026-02-21 01:29:25.65	left	single	11	182	[{"id": "1771428364789-4do-v2nug3ub6", "colorType": "4도", "outputMethod": "INDIGO", "selectedUpPrices": [[], [], [], [], [], [], [], [], [], [], []], "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428364789-6do-j5r3pcbxb", "colorType": "6도", "outputMethod": "INDIGO", "selectedUpPrices": [[], [], [], [], [], [], [], [], [], [], []], "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6fbng100004b63c70xzv5a-72ted7", "outputMethod": "INKJET", "specificationId": "cmk6fbng100004b63c70xzv5a", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6fbng100004b63c70xzv5a", "singleSidedPrice": 270}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6fu8av0005hxtsrjafllf0-zb1m8f", "outputMethod": "INKJET", "specificationId": "cmk6fu8av0005hxtsrjafllf0", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6fu8av0005hxtsrjafllf0", "singleSidedPrice": 360}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6f3ym20006o43xdewhcbes-1vctyt", "outputMethod": "INKJET", "specificationId": "cmk6f3ym20006o43xdewhcbes", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6f3ym20006o43xdewhcbes", "singleSidedPrice": 450}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6f88vs0009o43x378tye2v-gl2w8u", "outputMethod": "INKJET", "specificationId": "cmk6f88vs0009o43x378tye2v", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6f88vs0009o43x378tye2v", "singleSidedPrice": 544}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6ftqqu0004hxtskccmbx2s-vztjro", "outputMethod": "INKJET", "specificationId": "cmk6ftqqu0004hxtskccmbx2s", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6ftqqu0004hxtskccmbx2s", "singleSidedPrice": 563}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6f6ndh0008o43xcv3mdzu1-vmcgnu", "outputMethod": "INKJET", "specificationId": "cmk6f6ndh0008o43xcv3mdzu1", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6f6ndh0008o43xcv3mdzu1", "singleSidedPrice": 681}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6fjyhm000c4b631modt98m-m3ukfu", "outputMethod": "INKJET", "specificationId": "cmk6fjyhm000c4b631modt98m", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6fjyhm000c4b631modt98m", "singleSidedPrice": 866}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6fkx5j000e4b639whx3sxx-1avs9p", "outputMethod": "INKJET", "specificationId": "cmk6fkx5j000e4b639whx3sxx", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6fkx5j000e4b639whx3sxx", "singleSidedPrice": 928}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6fvjvy0006hxtspj3i6nks-lh2cyx", "outputMethod": "INKJET", "specificationId": "cmk6fvjvy0006hxtspj3i6nks", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6fvjvy0006hxtspj3i6nks", "singleSidedPrice": 990}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmkauuj580000620v7qprf1fa-xlk0d7", "outputMethod": "INKJET", "specificationId": "cmkauuj580000620v7qprf1fa", "selectedSpecPrice": {"weight": 1, "specificationId": "cmkauuj580000620v7qprf1fa", "singleSidedPrice": 1013}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmkavuol30000ft7ltr5dldbf-cizzfv", "outputMethod": "INKJET", "specificationId": "cmkavuol30000ft7ltr5dldbf", "selectedSpecPrice": {"weight": 1, "specificationId": "cmkavuol30000ft7ltr5dldbf", "singleSidedPrice": 1103}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmkavvbot0001ft7l6yfnze23-9rild4", "outputMethod": "INKJET", "specificationId": "cmkavvbot0001ft7l6yfnze23", "selectedSpecPrice": {"weight": 1, "specificationId": "cmkavvbot0001ft7l6yfnze23", "singleSidedPrice": 1260}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6fdf7400084b63698iy8j5-e4h0cs", "outputMethod": "INKJET", "specificationId": "cmk6fdf7400084b63698iy8j5", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6fdf7400084b63698iy8j5", "singleSidedPrice": 1800}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6fcj4d00044b63ydvo3m99-qjmssw", "outputMethod": "INKJET", "specificationId": "cmk6fcj4d00044b63ydvo3m99", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6fcj4d00044b63ydvo3m99", "singleSidedPrice": 2160}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6fd3tf00064b63chde9ajf-b3hajj", "outputMethod": "INKJET", "specificationId": "cmk6fd3tf00064b63chde9ajf", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6fd3tf00064b63chde9ajf", "singleSidedPrice": 2700}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6feqsv000a4b631dxzz34w-d3533f", "outputMethod": "INKJET", "specificationId": "cmk6feqsv000a4b631dxzz34w", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6feqsv000a4b631dxzz34w", "singleSidedPrice": 3375}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6gcadq0000v9w22gdjvtj0-njrix7", "outputMethod": "INKJET", "specificationId": "cmk6gcadq0000v9w22gdjvtj0", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6gcadq0000v9w22gdjvtj0", "singleSidedPrice": 4320}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6gcljh0002v9w2h60pr8xa-qciasq", "outputMethod": "INKJET", "specificationId": "cmk6gcljh0002v9w2h60pr8xa", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6gcljh0002v9w2h60pr8xa", "singleSidedPrice": 7920}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6f27np0004o43xbl1qfr5n-xkp3f6", "outputMethod": "INKJET", "specificationId": "cmk6f27np0004o43xbl1qfr5n", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6f27np0004o43xbl1qfr5n", "singleSidedPrice": 197}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6fbng600014b63lbz4hbql-ht6dsj", "outputMethod": "INKJET", "specificationId": "cmk6fbng600014b63lbz4hbql", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6fbng600014b63lbz4hbql", "singleSidedPrice": 270}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6f3ym40007o43x4w1i7igj-ebbjow", "outputMethod": "INKJET", "specificationId": "cmk6f3ym40007o43x4w1i7igj", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6f3ym40007o43x4w1i7igj", "singleSidedPrice": 450}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6f88vu000ao43x13j2f12j-hksb2u", "outputMethod": "INKJET", "specificationId": "cmk6f88vu000ao43x13j2f12j", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6f88vu000ao43x13j2f12j", "singleSidedPrice": 544}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6fjyhq000d4b63ltsp5xkp-b187so", "outputMethod": "INKJET", "specificationId": "cmk6fjyhq000d4b63ltsp5xkp", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6fjyhq000d4b63ltsp5xkp", "singleSidedPrice": 866}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6fvjw00007hxtsirwx4s8m-wx5kkw", "outputMethod": "INKJET", "specificationId": "cmk6fvjw00007hxtsirwx4s8m", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6fvjw00007hxtsirwx4s8m", "singleSidedPrice": 990}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6fkx5l000f4b63teec2nro-o3qv5a", "outputMethod": "INKJET", "specificationId": "cmk6fkx5l000f4b63teec2nro", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6fkx5l000f4b63teec2nro", "singleSidedPrice": 928}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmkauuj5e0001620vtvan1277-den37t", "outputMethod": "INKJET", "specificationId": "cmkauuj5e0001620vtvan1277", "selectedSpecPrice": {"weight": 1, "specificationId": "cmkauuj5e0001620vtvan1277", "singleSidedPrice": 1013}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmkavvboy0002ft7lsl0ipbee-7b4ipu", "outputMethod": "INKJET", "specificationId": "cmkavvboy0002ft7lsl0ipbee", "selectedSpecPrice": {"weight": 1, "specificationId": "cmkavvboy0002ft7lsl0ipbee", "singleSidedPrice": 1260}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6fdf7600094b63ff6454lx-w2jyj6", "outputMethod": "INKJET", "specificationId": "cmk6fdf7600094b63ff6454lx", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6fdf7600094b63ff6454lx", "singleSidedPrice": 1800}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6fcj4f00054b63m430jdn4-yk6ymp", "outputMethod": "INKJET", "specificationId": "cmk6fcj4f00054b63m430jdn4", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6fcj4f00054b63m430jdn4", "singleSidedPrice": 2160}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6fd3th00074b63i1ouhou9-gc9ket", "outputMethod": "INKJET", "specificationId": "cmk6fd3th00074b63i1ouhou9", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6fd3th00074b63i1ouhou9", "singleSidedPrice": 2700}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6feqsy000b4b63vxejnfur-p7voxd", "outputMethod": "INKJET", "specificationId": "cmk6feqsy000b4b63vxejnfur", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6feqsy000b4b63vxejnfur", "singleSidedPrice": 3375}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6gcadu0001v9w2k7ogf6zt-tb5x9r", "outputMethod": "INKJET", "specificationId": "cmk6gcadu0001v9w2k7ogf6zt", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6gcadu0001v9w2k7ogf6zt", "singleSidedPrice": 4320}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6gcljl0003v9w2qe2j0lo1-b5bztq", "outputMethod": "INKJET", "specificationId": "cmk6gcljl0003v9w2qe2j0lo1", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6gcljl0003v9w2qe2j0lo1", "singleSidedPrice": 7920}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6fc2o500024b63vwcm68cp-77ymr3", "outputMethod": "INKJET", "specificationId": "cmk6fc2o500024b63vwcm68cp", "selectedSpecPrice": {"weight": 1.2, "specificationId": "cmk6fc2o500024b63vwcm68cp", "singleSidedPrice": 162}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6f27nr0005o43xwyhm7een-iu7o54", "outputMethod": "INKJET", "specificationId": "cmk6f27nr0005o43xwyhm7een", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6f27nr0005o43xwyhm7een", "singleSidedPrice": 197}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}, {"id": "1771428377989-cmk6fc2od00034b63mc8vtlep-rvgfoe", "outputMethod": "INKJET", "specificationId": "cmk6fc2od00034b63mc8vtlep", "selectedSpecPrice": {"weight": 1, "specificationId": "cmk6fc2od00034b63mc8vtlep", "singleSidedPrice": 135}, "productionSettingId": "cmkafl76r0001kz5orjfsda7c", "productionSettingName": "웨딩베이비"}]
\.


ALTER TABLE public.products ENABLE TRIGGER ALL;

--
-- Data for Name: custom_options; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.custom_options DISABLE TRIGGER ALL;

COPY public.custom_options (id, "productId", name, type, "values", price, "isRequired", "sortOrder") FROM stdin;
\.


ALTER TABLE public.custom_options ENABLE TRIGGER ALL;

--
-- Data for Name: customer_health_scores; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.customer_health_scores DISABLE TRIGGER ALL;

COPY public.customer_health_scores (id, "clientId", "claimScore", "satisfactionScore", "loyaltyScore", "communicationScore", "totalScore", grade, "isAtRisk", "riskReason", "lastCalculatedAt", "createdAt", "updatedAt") FROM stdin;
cmko0xdat000lv6ku4ob17g3u	cmkg8vzuf0000at5m0dyaydie	100	100	0	80	76	B	f	\N	2026-01-21 12:53:39.185	2026-01-21 12:53:21.941	2026-01-21 12:53:39.187
\.


ALTER TABLE public.customer_health_scores ENABLE TRIGGER ALL;

--
-- Data for Name: delivery_pricings; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.delivery_pricings DISABLE TRIGGER ALL;

COPY public.delivery_pricings (id, "deliveryMethod", name, "baseFee", "distanceRanges", "extraPricePerKm", "maxBaseDistance", "nightSurchargeRate", "nightStartHour", "nightEndHour", "weekendSurchargeRate", "sizeRanges", "islandFee", "freeThreshold", "sortOrder", "isActive", "createdAt", "updatedAt", "packagingFee", "shippingFee") FROM stdin;
cmkyul27t0000kjd2207hraj1	parcel	택배	5500.00	null	\N	\N	\N	22	6	\N	null	3000.00	50000.00	1	t	2026-01-29 02:41:17.946	2026-01-29 02:41:17.946	0.00	0.00
cmkyul27v0001kjd2f3tapagk	motorcycle	오토바이(퀵)	0.00	[{"price": 3000, "maxDistance": 5, "minDistance": 0}, {"price": 13000, "maxDistance": 10, "minDistance": 5}, {"price": 18000, "maxDistance": 15, "minDistance": 10}, {"price": 20000, "maxDistance": 20, "minDistance": 15}]	1000.00	20	0.30	22	6	0.20	null	\N	\N	2	t	2026-01-29 02:41:17.948	2026-01-29 02:41:17.948	0.00	0.00
cmkyul27w0002kjd2x3gldcwc	damas	다마스	55000.00	[{"price": 15000, "maxDistance": 5, "minDistance": 0}, {"price": 20000, "maxDistance": 10, "minDistance": 5}, {"price": 25000, "maxDistance": 15, "minDistance": 10}, {"price": 30000, "maxDistance": 20, "minDistance": 15}]	1500.00	20	0.30	22	6	0.20	null	\N	\N	3	t	2026-01-29 02:41:17.949	2026-01-29 02:41:17.949	0.00	0.00
cmkyul27y0003kjd2vcf1rsjf	freight	화물	30000.00	null	\N	\N	0.20	22	6	0.10	[{"name": "소형", "price": 0, "maxVolume": 0.1, "maxWeight": 30}, {"name": "중형", "price": 20000, "maxVolume": 0.5, "maxWeight": 100}, {"name": "대형", "price": 50000, "maxVolume": 1, "maxWeight": 300}, {"name": "특대형", "price": 100000, "maxVolume": null, "maxWeight": null}]	\N	\N	4	t	2026-01-29 02:41:17.95	2026-01-29 02:41:17.95	0.00	0.00
cmkyul27z0004kjd2mfw3f288	pickup	방문수령	0.00	null	\N	\N	\N	22	6	\N	null	\N	\N	5	t	2026-01-29 02:41:17.951	2026-01-29 02:41:17.951	0.00	0.00
\.


ALTER TABLE public.delivery_pricings ENABLE TRIGGER ALL;

--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.departments DISABLE TRIGGER ALL;

COPY public.departments (id, code, name, description, "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cmk6ezwnn0002o43xlbb3c9d2	표지팀3782	표지팀	\N	2	t	2026-01-09 05:07:23.796	2026-01-09 05:07:23.796
cmk6f0eli0003o43x4pg3ci2e	출력팀7039	출력팀	\N	3	t	2026-01-09 05:07:47.046	2026-01-09 05:07:47.046
cml5yx6f90004vvfysvz2f7s1	CS	고객지원팀	\N	5	t	2026-02-03 02:17:04.965	2026-02-03 02:17:04.965
cml5yx6f60001vvfydsrws0tg	SALES	영업팀	\N	2	t	2026-02-03 02:17:04.963	2026-02-03 03:02:54.87
cml5yx6f70002vvfy0usyboig	PROD	제본팀	\N	3	t	2026-02-03 02:17:04.964	2026-02-03 03:03:04.598
cml63cj6x000010fca2ufjfxo	MGMT	관리팀	\N	1	t	2026-02-03 04:20:59.817	2026-02-03 04:20:59.817
cml63cj72000310fc7rlbagha	DESIGN	디자인팀	\N	4	t	2026-02-03 04:20:59.822	2026-02-03 04:20:59.822
\.


ALTER TABLE public.departments ENABLE TRIGGER ALL;

--
-- Data for Name: fabric_suppliers; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.fabric_suppliers DISABLE TRIGGER ALL;

COPY public.fabric_suppliers (id, code, name, phone, mobile, email, fax, "postalCode", address, "addressDetail", representative, website, description, memo, "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.fabric_suppliers ENABLE TRIGGER ALL;

--
-- Data for Name: fabrics; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.fabrics DISABLE TRIGGER ALL;

COPY public.fabrics (id, code, name, category, material, "colorCode", "colorName", "widthCm", thickness, weight, "supplierId", "basePrice", "unitType", "discountRate", "discountPrice", "stockQuantity", "minStockLevel", "forAlbumCover", "forBoxCover", "forFrameCover", "forOther", "imageUrl", "thumbnailUrl", description, memo, "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cmks9efkv000higlum802x548	FABMKS9D77J	파우치 블랙	fabric	pu_leather	#222020	블랙	\N	\N	\N	\N	0.00	m	0.00	\N	0	0	t	f	f	f	\N	\N			0	t	2026-01-24 12:01:39.679	2026-02-16 03:37:08.45
cmlomhj710000y2rkznl6suhw	FABMLOMGJ9S	브라운	fabric	pu_leather	#93694d	브라운	\N	\N	\N	\N	0.00	m	0.00	\N	0	0	t	t	f	f	\N	\N			0	t	2026-02-16 03:36:36.972	2026-02-16 03:37:26.794
\.


ALTER TABLE public.fabrics ENABLE TRIGGER ALL;

--
-- Data for Name: file_specs; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.file_specs DISABLE TRIGGER ALL;

COPY public.file_specs (id, code, name, "mimeType", "resolutionX", "resolutionY", "minResolution", "colorSpace", "colorProfile", compression, "screeningType", "screenLPI", "maxFileSizeMB", "displayNameKo", "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cml4hdu8e000i7smtkzm0w4qf	FS-INDIGO	인디고 출력용	application/pdf	300	300	200	CMYK	\N	None	AM	175	500	인디고 CMYK 300dpi	1	t	2026-02-02 01:18:23.055	2026-02-02 01:18:23.055
cml4hdu8h000j7smt97xycab9	FS-INKJET	잉크젯 출력용	application/pdf	240	240	200	sRGB	\N	None	AM	175	500	잉크젯 sRGB 240dpi	2	t	2026-02-02 01:18:23.057	2026-02-02 01:18:23.057
cml4hdu8i000k7smt9jv8g2ab	FS-INKJET-HD	잉크젯 고해상도	application/pdf	360	360	200	AdobeRGB	\N	None	AM	175	500	잉크젯 AdobeRGB 360dpi	3	t	2026-02-02 01:18:23.058	2026-02-02 01:18:23.058
cml4hdu8i000l7smteuz01bw7	FS-OFFSET	오프셋 인쇄용	application/pdf	350	350	200	CMYK	\N	None	AM	175	500	오프셋 CMYK 350dpi	4	t	2026-02-02 01:18:23.059	2026-02-02 01:18:23.059
\.


ALTER TABLE public.file_specs ENABLE TRIGGER ALL;

--
-- Data for Name: foil_colors; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.foil_colors DISABLE TRIGGER ALL;

COPY public.foil_colors (id, code, name, "colorHex", "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cmkyytrtu0000nody2gixk91l	gold_glossy	금박(유광)	#FFD700	1	t	2026-01-29 04:40:02.851	2026-01-29 04:40:02.851
cmkyytrtw0001nodyom9rj68j	gold_matte	금박(무광)	#DAA520	2	t	2026-01-29 04:40:02.852	2026-01-29 04:40:02.852
cmkyytrtw0002nody0f70zsx8	silver_glossy	은박(유광)	#C0C0C0	3	t	2026-01-29 04:40:02.853	2026-01-29 04:40:02.853
cmkyytrtx0003nodyvd8wejpd	silver_matte	은박(무광)	#A8A8A8	4	t	2026-01-29 04:40:02.853	2026-01-29 04:40:02.853
cmkyytrtx0004nodytlki3o6a	brown	밤박(브라운)	#8B4513	5	t	2026-01-29 04:40:02.854	2026-01-29 04:40:02.854
cmkyytrty0005nodyn9hvmm2y	white	흰색박	#FFFFFF	6	t	2026-01-29 04:40:02.854	2026-01-29 04:40:02.854
cmkyytrty0006nody6k2ktc0n	black	먹박	#000000	7	t	2026-01-29 04:40:02.855	2026-01-29 04:40:02.855
cmkyytrtz0007nody9b35k4sa	hologram	홀로그램박	#E6E6FA	8	t	2026-01-29 04:40:02.855	2026-01-29 04:40:02.855
\.


ALTER TABLE public.foil_colors ENABLE TRIGGER ALL;

--
-- Data for Name: folding_intents; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.folding_intents DISABLE TRIGGER ALL;

COPY public.folding_intents (id, code, name, "jdfFoldCatalog", "foldCount", "foldDirection", "diagramUrl", "displayNameKo", "basePrice", "pricePerFold", "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cml4hdu88000c7smta4usclkz	FI-F2	2단접지	F2-1	1	Parallel	\N	2단 병풍접지	0.00	0.00	1	t	2026-02-02 01:18:23.048	2026-02-02 01:18:23.048
cml4hdu8a000d7smtfwfnioos	FI-F4	4단접지	F4-1	2	Parallel	\N	4단 병풍접지	0.00	0.00	2	t	2026-02-02 01:18:23.051	2026-02-02 01:18:23.051
cml4hdu8b000e7smtjiu4kgae	FI-F6	6단접지	F6-1	3	Parallel	\N	6단 병풍접지	0.00	0.00	3	t	2026-02-02 01:18:23.051	2026-02-02 01:18:23.051
cml4hdu8c000f7smt2mrguoer	FI-Z	Z접지	Z	2	Parallel	\N	Z자 접지	0.00	0.00	4	t	2026-02-02 01:18:23.052	2026-02-02 01:18:23.052
cml4hdu8d000g7smtxrbkkzy0	FI-GATE	대문접지	Gate	2	Parallel	\N	대문(게이트) 접지	0.00	0.00	5	t	2026-02-02 01:18:23.053	2026-02-02 01:18:23.053
cml4hdu8d000h7smtbp3r4dxm	FI-LETTER	편지접지	Letter	2	Parallel	\N	편지 3단접지	0.00	0.00	6	t	2026-02-02 01:18:23.054	2026-02-02 01:18:23.054
\.


ALTER TABLE public.folding_intents ENABLE TRIGGER ALL;

--
-- Data for Name: half_products; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.half_products DISABLE TRIGGER ALL;

COPY public.half_products (id, code, name, "categoryLargeId", "basePrice", "isPriceAdditive", "memberType", "requiredFileCount", "thumbnailUrl", "detailImages", status, "sortOrder", "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.half_products ENABLE TRIGGER ALL;

--
-- Data for Name: group_half_product_prices; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.group_half_product_prices DISABLE TRIGGER ALL;

COPY public.group_half_product_prices (id, "groupId", "halfProductId", price, "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.group_half_product_prices ENABLE TRIGGER ALL;

--
-- Data for Name: group_product_prices; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.group_product_prices DISABLE TRIGGER ALL;

COPY public.group_product_prices (id, "groupId", "productId", price, "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.group_product_prices ENABLE TRIGGER ALL;

--
-- Data for Name: group_production_setting_prices; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.group_production_setting_prices DISABLE TRIGGER ALL;

COPY public.group_production_setting_prices (id, "clientGroupId", "productionSettingId", "specificationId", "minQuantity", "maxQuantity", weight, price, "singleSidedPrice", "doubleSidedPrice", "fourColorSinglePrice", "fourColorDoublePrice", "sixColorSinglePrice", "sixColorDoublePrice", "basePages", "basePrice", "pricePerPage", "rangePrices", "createdAt", "updatedAt", "priceGroupId") FROM stdin;
cmkq5393r000b13913jjw75bs	cmko20a3z0025v6kupgm3goza	cmkgcqgel0001vuyqquqn2f9z	\N	1	\N	\N	0.00	\N	\N	900.00	850.00	1100.00	1000.00	\N	\N	\N	\N	2026-01-23 00:25:27.255	2026-01-23 00:25:45.099	pg_1768536096664_hxqs8hls0
cmkq5393t000d1391r6nejspy	cmko20a3z0025v6kupgm3goza	cmkgcqgel0001vuyqquqn2f9z	\N	2	\N	\N	0.00	\N	\N	450.00	430.00	550.00	500.00	\N	\N	\N	\N	2026-01-23 00:25:27.258	2026-01-23 00:25:45.102	pg_1768536096664_hxqs8hls0
cmkq5393v000f13915f4ig5zb	cmko20a3z0025v6kupgm3goza	cmkgcqgel0001vuyqquqn2f9z	\N	4	\N	\N	0.00	\N	\N	230.00	210.00	280.00	250.00	\N	\N	\N	\N	2026-01-23 00:25:27.259	2026-01-23 00:25:45.103	pg_1768536096664_hxqs8hls0
cmkq5393x000h1391th6mvfpw	cmko20a3z0025v6kupgm3goza	cmkgcqgel0001vuyqquqn2f9z	\N	8	\N	\N	0.00	\N	\N	110.00	110.00	140.00	130.00	\N	\N	\N	\N	2026-01-23 00:25:27.261	2026-01-23 00:25:45.104	pg_1768536096664_hxqs8hls0
cmkq4merq000113910lbinryd	cmko20a3z0025v6kupgm3goza	cmkafl76r0001kz5orjfsda7c	\N	1	\N	\N	0.00	\N	\N	900.00	900.00	900.00	900.00	\N	\N	\N	\N	2026-01-23 00:12:21.446	2026-01-23 00:28:22.873	pg_1768178038155_nz57kv6ai
cmkq4merw00031391beimo8zb	cmko20a3z0025v6kupgm3goza	cmkafl76r0001kz5orjfsda7c	\N	2	\N	\N	0.00	\N	\N	550.00	550.00	550.00	550.00	\N	\N	\N	\N	2026-01-23 00:12:21.452	2026-01-23 00:28:22.875	pg_1768178038155_nz57kv6ai
cmkq4mery00051391zwivid94	cmko20a3z0025v6kupgm3goza	cmkafl76r0001kz5orjfsda7c	\N	4	\N	\N	0.00	\N	\N	300.00	300.00	300.00	300.00	\N	\N	\N	\N	2026-01-23 00:12:21.454	2026-01-23 00:28:22.877	pg_1768178038155_nz57kv6ai
cmkq5393y000j1391bzce7e3z	cmko20a3z0025v6kupgm3goza	cmkgcqgel0001vuyqquqn2f9z	\N	1	\N	\N	0.00	\N	\N	1200.00	1100.00	1100.00	950.00	\N	\N	\N	\N	2026-01-23 00:25:27.262	2026-01-23 00:26:53.506	pg_1768536123869_f96k5mt6y
cmkq5393z000l13917tk5u575	cmko20a3z0025v6kupgm3goza	cmkgcqgel0001vuyqquqn2f9z	\N	2	\N	\N	0.00	\N	\N	600.00	550.00	550.00	475.00	\N	\N	\N	\N	2026-01-23 00:25:27.263	2026-01-23 00:26:53.508	pg_1768536123869_f96k5mt6y
cmkq53940000n13916adm3mz3	cmko20a3z0025v6kupgm3goza	cmkgcqgel0001vuyqquqn2f9z	\N	4	\N	\N	0.00	\N	\N	300.00	280.00	280.00	238.00	\N	\N	\N	\N	2026-01-23 00:25:27.265	2026-01-23 00:26:53.509	pg_1768536123869_f96k5mt6y
cmkp1gj3k001ntaz0t8pbmtkr	cmko20a3z0025v6kupgm3goza	cmkgcqgel0001vuyqquqn2f9z	\N	1	\N	\N	0.00	\N	\N	1000.00	1000.00	1000.00	1000.00	\N	\N	\N	\N	2026-01-22 05:56:02.097	2026-01-22 05:59:03.368	\N
cmkp1gj3n001ptaz0b1x105fi	cmko20a3z0025v6kupgm3goza	cmkgcqgel0001vuyqquqn2f9z	\N	2	\N	\N	0.00	\N	\N	500.00	500.00	500.00	500.00	\N	\N	\N	\N	2026-01-22 05:56:02.099	2026-01-22 05:59:03.37	\N
cmkp1gj3o001rtaz05nid9sl7	cmko20a3z0025v6kupgm3goza	cmkgcqgel0001vuyqquqn2f9z	\N	4	\N	\N	0.00	\N	\N	250.00	250.00	250.00	250.00	\N	\N	\N	\N	2026-01-22 05:56:02.101	2026-01-22 05:59:03.372	\N
cmkp1gj3q001ttaz0skl9e41r	cmko20a3z0025v6kupgm3goza	cmkgcqgel0001vuyqquqn2f9z	\N	8	\N	\N	0.00	\N	\N	125.00	125.00	125.00	125.00	\N	\N	\N	\N	2026-01-22 05:56:02.102	2026-01-22 05:59:03.373	\N
cmkozrlxw0003taz018nasivg	cmko20a3z0025v6kupgm3goza	cmkafl76r0001kz5orjfsda7c	\N	1	\N	\N	0.00	\N	\N	1000.00	1000.00	1000.00	1000.00	\N	\N	\N	\N	2026-01-22 05:08:39.764	2026-01-22 05:59:04.587	\N
cmkozrly00005taz0v0tyb7b6	cmko20a3z0025v6kupgm3goza	cmkafl76r0001kz5orjfsda7c	\N	2	\N	\N	0.00	\N	\N	600.00	600.00	600.00	600.00	\N	\N	\N	\N	2026-01-22 05:08:39.768	2026-01-22 05:59:04.59	\N
cmkozrly20007taz0ljs5qgqf	cmko20a3z0025v6kupgm3goza	cmkafl76r0001kz5orjfsda7c	\N	4	\N	\N	0.00	\N	\N	325.00	325.00	330.00	325.00	\N	\N	\N	\N	2026-01-22 05:08:39.77	2026-01-22 05:59:04.592	\N
cmkozrly30009taz0ga8qlwkb	cmko20a3z0025v6kupgm3goza	cmkafl76r0001kz5orjfsda7c	\N	8	\N	\N	0.00	\N	\N	175.00	175.00	180.00	175.00	\N	\N	\N	\N	2026-01-22 05:08:39.771	2026-01-22 05:59:04.593	\N
cmkq4merz00071391hn2hljjc	cmko20a3z0025v6kupgm3goza	cmkafl76r0001kz5orjfsda7c	\N	8	\N	\N	0.00	\N	\N	160.00	160.00	160.00	160.00	\N	\N	\N	\N	2026-01-23 00:12:21.456	2026-01-23 00:28:22.879	pg_1768178038155_nz57kv6ai
cmkq55ha2000r1391c38s6ldu	cmko20a3z0025v6kupgm3goza	cmkafl76r0001kz5orjfsda7c	\N	1	\N	\N	0.00	\N	\N	900.00	900.00	900.00	900.00	\N	\N	\N	\N	2026-01-23 00:27:11.163	2026-01-23 00:28:22.881	pg_1768178039087_itb887tbc
cmkq55ha4000t1391qbgat3fm	cmko20a3z0025v6kupgm3goza	cmkafl76r0001kz5orjfsda7c	\N	2	\N	\N	0.00	\N	\N	450.00	450.00	450.00	450.00	\N	\N	\N	\N	2026-01-23 00:27:11.164	2026-01-23 00:28:22.882	pg_1768178039087_itb887tbc
cmkq55ha5000v1391byi9nsuq	cmko20a3z0025v6kupgm3goza	cmkafl76r0001kz5orjfsda7c	\N	4	\N	\N	0.00	\N	\N	230.00	230.00	230.00	230.00	\N	\N	\N	\N	2026-01-23 00:27:11.166	2026-01-23 00:28:22.883	pg_1768178039087_itb887tbc
cmkq53941000p1391k98i9m3n	cmko20a3z0025v6kupgm3goza	cmkgcqgel0001vuyqquqn2f9z	\N	8	\N	\N	0.00	\N	\N	150.00	140.00	140.00	119.00	\N	\N	\N	\N	2026-01-23 00:25:27.266	2026-01-23 00:26:53.511	pg_1768536123869_f96k5mt6y
cmkq585ma001d1391n31070of	cmkaiqnum000xkz5ow7k25rf9	cmkafl76r0001kz5orjfsda7c	\N	8	\N	\N	0.00	\N	\N	144.00	144.00	144.00	144.00	\N	\N	\N	\N	2026-01-23 00:29:16.018	2026-01-23 00:29:16.018	pg_1768178039087_itb887tbc
cmkq55ha7000x1391mqtamfz9	cmko20a3z0025v6kupgm3goza	cmkafl76r0001kz5orjfsda7c	\N	8	\N	\N	0.00	\N	\N	110.00	110.00	110.00	110.00	\N	\N	\N	\N	2026-01-23 00:27:11.167	2026-01-23 00:28:22.884	pg_1768178039087_itb887tbc
cmkq585ly000z1391fa51bwjk	cmkaiqnum000xkz5ow7k25rf9	cmkafl76r0001kz5orjfsda7c	\N	1	\N	\N	0.00	\N	\N	800.00	800.00	800.00	800.00	\N	\N	\N	\N	2026-01-23 00:29:16.006	2026-01-23 00:29:16.006	pg_1768178038155_nz57kv6ai
cmkq585m100111391d280jl2w	cmkaiqnum000xkz5ow7k25rf9	cmkafl76r0001kz5orjfsda7c	\N	2	\N	\N	0.00	\N	\N	480.00	480.00	480.00	480.00	\N	\N	\N	\N	2026-01-23 00:29:16.01	2026-01-23 00:29:16.01	pg_1768178038155_nz57kv6ai
cmkq585m3001313915qjvdp22	cmkaiqnum000xkz5ow7k25rf9	cmkafl76r0001kz5orjfsda7c	\N	4	\N	\N	0.00	\N	\N	264.00	264.00	264.00	264.00	\N	\N	\N	\N	2026-01-23 00:29:16.011	2026-01-23 00:29:16.011	pg_1768178038155_nz57kv6ai
cmkq585m4001513913pb38ot2	cmkaiqnum000xkz5ow7k25rf9	cmkafl76r0001kz5orjfsda7c	\N	8	\N	\N	0.00	\N	\N	144.00	144.00	144.00	144.00	\N	\N	\N	\N	2026-01-23 00:29:16.012	2026-01-23 00:29:16.012	pg_1768178038155_nz57kv6ai
cmkq585m50017139132dzq6x2	cmkaiqnum000xkz5ow7k25rf9	cmkafl76r0001kz5orjfsda7c	\N	1	\N	\N	0.00	\N	\N	800.00	800.00	800.00	800.00	\N	\N	\N	\N	2026-01-23 00:29:16.014	2026-01-23 00:29:16.014	pg_1768178039087_itb887tbc
cmkq585m700191391bwir8u0x	cmkaiqnum000xkz5ow7k25rf9	cmkafl76r0001kz5orjfsda7c	\N	2	\N	\N	0.00	\N	\N	480.00	480.00	480.00	480.00	\N	\N	\N	\N	2026-01-23 00:29:16.016	2026-01-23 00:29:16.016	pg_1768178039087_itb887tbc
cmkq585m8001b1391t1o6ut6h	cmkaiqnum000xkz5ow7k25rf9	cmkafl76r0001kz5orjfsda7c	\N	4	\N	\N	0.00	\N	\N	264.00	264.00	264.00	264.00	\N	\N	\N	\N	2026-01-23 00:29:16.017	2026-01-23 00:29:16.017	pg_1768178039087_itb887tbc
cml0j45p300031q4eaads2buy	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fu8av0005hxtsrjafllf0	\N	\N	\N	748.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.879	2026-01-30 06:56:07.415	pg_1768786011033_7qd25f1mq
cml0j45p400051q4eaigsb8j6	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f3ym20006o43xdewhcbes	\N	\N	\N	935.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.881	2026-01-30 06:56:07.417	pg_1768786011033_7qd25f1mq
cml0j45p600071q4er03lsos0	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f88vs0009o43x378tye2v	\N	\N	\N	1130.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.883	2026-01-30 06:56:07.419	pg_1768786011033_7qd25f1mq
cml0j45p800091q4enh3cl7oq	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6ftqqu0004hxtskccmbx2s	\N	\N	\N	1169.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.884	2026-01-30 06:56:07.421	pg_1768786011033_7qd25f1mq
cml0j45pa000b1q4e8gwgdebb	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f6ndh0008o43xcv3mdzu1	\N	\N	\N	1414.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.886	2026-01-30 06:56:07.423	pg_1768786011033_7qd25f1mq
cml0j45pb000d1q4e179lmio9	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fjyhm000c4b631modt98m	\N	\N	\N	1800.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.888	2026-01-30 06:56:07.424	pg_1768786011033_7qd25f1mq
cml0j45pd000f1q4eoepew7lk	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fkx5j000e4b639whx3sxx	\N	\N	\N	1929.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.889	2026-01-30 06:56:07.426	pg_1768786011033_7qd25f1mq
cml0j45pf000h1q4e9dvgnak7	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fvjvy0006hxtspj3i6nks	\N	\N	\N	2057.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.891	2026-01-30 06:56:07.428	pg_1768786011033_7qd25f1mq
cml0j45pg000j1q4ej1sjntp5	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmkauuj580000620v7qprf1fa	\N	\N	\N	2104.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.892	2026-01-30 06:56:07.429	pg_1768786011033_7qd25f1mq
cml0j45pk000n1q4egj0j4jdy	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmkavvbot0001ft7l6yfnze23	\N	\N	\N	2618.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.897	2026-01-30 06:56:07.433	pg_1768786011033_7qd25f1mq
cml0j45pm000p1q4ea67izbpw	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fdf7400084b63698iy8j5	\N	\N	\N	3740.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.898	2026-01-30 06:56:07.435	pg_1768786011033_7qd25f1mq
cml0j45pn000r1q4e1ukfupau	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fcj4d00044b63ydvo3m99	\N	\N	\N	4488.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.899	2026-01-30 06:56:07.436	pg_1768786011033_7qd25f1mq
cml0j45po000t1q4e6kg8ltlr	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fd3tf00064b63chde9ajf	\N	\N	\N	5610.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.9	2026-01-30 06:56:07.438	pg_1768786011033_7qd25f1mq
cml0j45pp000v1q4elugq3ngq	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6feqsv000a4b631dxzz34w	\N	\N	\N	7013.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.901	2026-01-30 06:56:07.439	pg_1768786011033_7qd25f1mq
cml0j45pq000x1q4eserk26lv	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6gcadq0000v9w22gdjvtj0	\N	\N	\N	8977.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.903	2026-01-30 06:56:07.44	pg_1768786011033_7qd25f1mq
cml0j45ps000z1q4eeb9hfdcv	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6gcljh0002v9w2h60pr8xa	\N	\N	\N	16457.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.904	2026-01-30 06:56:07.441	pg_1768786011033_7qd25f1mq
cml0j45pt00111q4e4ztw6nk3	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f27np0004o43xbl1qfr5n	\N	\N	\N	409.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.905	2026-01-30 06:56:07.443	pg_1768786011033_7qd25f1mq
cml0j45pu00131q4eez44ew6r	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fbng600014b63lbz4hbql	\N	\N	\N	561.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.906	2026-01-30 06:56:07.444	pg_1768786011033_7qd25f1mq
cml0j45pv00151q4en5o2nzzk	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f3ym40007o43x4w1i7igj	\N	\N	\N	935.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.907	2026-01-30 06:56:07.445	pg_1768786011033_7qd25f1mq
cml0j45pw00171q4ee9dzxrms	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f88vu000ao43x13j2f12j	\N	\N	\N	1130.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.909	2026-01-30 06:56:07.447	pg_1768786011033_7qd25f1mq
cml0j45px00191q4eislsm6ek	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fjyhq000d4b63ltsp5xkp	\N	\N	\N	1800.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.91	2026-01-30 06:56:07.448	pg_1768786011033_7qd25f1mq
cml0j45py001b1q4eb12scst1	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fvjw00007hxtsirwx4s8m	\N	\N	\N	2057.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.911	2026-01-30 06:56:07.449	pg_1768786011033_7qd25f1mq
cml0j45pz001d1q4ezkkd8vso	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fkx5l000f4b63teec2nro	\N	\N	\N	1929.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.912	2026-01-30 06:56:07.451	pg_1768786011033_7qd25f1mq
cml0j45q1001f1q4ew1pjkiqj	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmkauuj5e0001620vtvan1277	\N	\N	\N	2104.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.913	2026-01-30 06:56:07.452	pg_1768786011033_7qd25f1mq
cml0j45q2001h1q4ebn4gd15t	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmkavvboy0002ft7lsl0ipbee	\N	\N	\N	2618.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.914	2026-01-30 06:56:07.454	pg_1768786011033_7qd25f1mq
cml0j45q3001j1q4ecelqk1nj	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fdf7600094b63ff6454lx	\N	\N	\N	3740.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.915	2026-01-30 06:56:07.455	pg_1768786011033_7qd25f1mq
cml0j45q4001l1q4e3i7ui8ho	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fcj4f00054b63m430jdn4	\N	\N	\N	4488.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.916	2026-01-30 06:56:07.456	pg_1768786011033_7qd25f1mq
cml0j45q5001n1q4ehez1jdw3	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fd3th00074b63i1ouhou9	\N	\N	\N	5610.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.917	2026-01-30 06:56:07.457	pg_1768786011033_7qd25f1mq
cml0j45q6001p1q4e5rkbf5h7	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6feqsy000b4b63vxejnfur	\N	\N	\N	7013.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.919	2026-01-30 06:56:07.459	pg_1768786011033_7qd25f1mq
cml0j45q8001r1q4eb1zmhb4l	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6gcadu0001v9w2k7ogf6zt	\N	\N	\N	8977.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.92	2026-01-30 06:56:07.46	pg_1768786011033_7qd25f1mq
cml0j45q9001t1q4e7c1gvyii	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6gcljl0003v9w2qe2j0lo1	\N	\N	\N	16457.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.921	2026-01-30 06:56:07.461	pg_1768786011033_7qd25f1mq
cml0j45qa001v1q4emfaakyme	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fc2o500024b63vwcm68cp	\N	\N	\N	281.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.922	2026-01-30 06:56:07.462	pg_1768786011033_7qd25f1mq
cml0j45qb001x1q4en7hv3dzs	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f27nr0005o43xwyhm7een	\N	\N	\N	409.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.924	2026-01-30 06:56:07.463	pg_1768786011033_7qd25f1mq
cml0j45qc001z1q4e1n5x7gk3	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fc2od00034b63mc8vtlep	\N	\N	\N	281.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.925	2026-01-30 06:56:07.464	pg_1768786011033_7qd25f1mq
cml0j45qd00211q4ewe9o0tvq	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fbng100004b63c70xzv5a	\N	\N	\N	384.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.926	2026-01-30 06:56:07.466	pg_1768786011553_8h4u0zoem
cml0j45qf00231q4ev989rh00	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fu8av0005hxtsrjafllf0	\N	\N	\N	512.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.927	2026-01-30 06:56:07.467	pg_1768786011553_8h4u0zoem
cml0j45qg00251q4eu3fwnuz2	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f3ym20006o43xdewhcbes	\N	\N	\N	640.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.929	2026-01-30 06:56:07.468	pg_1768786011553_8h4u0zoem
cml0j45qh00271q4ex171fmwb	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f88vs0009o43x378tye2v	\N	\N	\N	773.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.93	2026-01-30 06:56:07.469	pg_1768786011553_8h4u0zoem
cml0j45qi00291q4e135ehr4a	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6ftqqu0004hxtskccmbx2s	\N	\N	\N	800.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.931	2026-01-30 06:56:07.471	pg_1768786011553_8h4u0zoem
cml0j45qj002b1q4ei3gtzfnb	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f6ndh0008o43xcv3mdzu1	\N	\N	\N	968.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.932	2026-01-30 06:56:07.472	pg_1768786011553_8h4u0zoem
cml0j45qk002d1q4eyfv8vkeo	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fjyhm000c4b631modt98m	\N	\N	\N	1232.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.933	2026-01-30 06:56:07.473	pg_1768786011553_8h4u0zoem
cml0j45qm002f1q4e1hqsym3y	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fkx5j000e4b639whx3sxx	\N	\N	\N	1320.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.934	2026-01-30 06:56:07.474	pg_1768786011553_8h4u0zoem
cml0j45qp002j1q4ev6fs5to1	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmkauuj580000620v7qprf1fa	\N	\N	\N	1440.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.937	2026-01-30 06:56:07.477	pg_1768786011553_8h4u0zoem
cml0j45qq002l1q4ey4qp1at6	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmkavuol30000ft7ltr5dldbf	\N	\N	\N	1568.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.938	2026-01-30 06:56:07.478	pg_1768786011553_8h4u0zoem
cml0j45qr002n1q4e2es7zv4o	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmkavvbot0001ft7l6yfnze23	\N	\N	\N	1792.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.939	2026-01-30 06:56:07.479	pg_1768786011553_8h4u0zoem
cml0j45qs002p1q4eacoggqv1	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fdf7400084b63698iy8j5	\N	\N	\N	2560.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.94	2026-01-30 06:56:07.48	pg_1768786011553_8h4u0zoem
cml0j45qt002r1q4e43w7oxmj	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fcj4d00044b63ydvo3m99	\N	\N	\N	3072.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.941	2026-01-30 06:56:07.482	pg_1768786011553_8h4u0zoem
cml0j45qu002t1q4e5sdev8dh	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fd3tf00064b63chde9ajf	\N	\N	\N	3840.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.942	2026-01-30 06:56:07.483	pg_1768786011553_8h4u0zoem
cml0j45qw002x1q4eylnvsg0i	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6gcadq0000v9w22gdjvtj0	\N	\N	\N	6144.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.944	2026-01-30 06:56:07.485	pg_1768786011553_8h4u0zoem
cml0j45qx002z1q4ew1g9x9s2	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6gcljh0002v9w2h60pr8xa	\N	\N	\N	11264.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.945	2026-01-30 06:56:07.487	pg_1768786011553_8h4u0zoem
cml0j45qy00311q4e4g2p5nib	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f27np0004o43xbl1qfr5n	\N	\N	\N	280.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.946	2026-01-30 06:56:07.488	pg_1768786011553_8h4u0zoem
cml0j45qz00331q4e891dd4vn	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fbng600014b63lbz4hbql	\N	\N	\N	384.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.947	2026-01-30 06:56:07.489	pg_1768786011553_8h4u0zoem
cml0j45r000351q4ejfu9pfyw	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f3ym40007o43x4w1i7igj	\N	\N	\N	640.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.948	2026-01-30 06:56:07.49	pg_1768786011553_8h4u0zoem
cml0j45r100371q4emleijeso	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f88vu000ao43x13j2f12j	\N	\N	\N	773.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.949	2026-01-30 06:56:07.492	pg_1768786011553_8h4u0zoem
cml0j45r200391q4e6uplk9uk	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fjyhq000d4b63ltsp5xkp	\N	\N	\N	1232.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.951	2026-01-30 06:56:07.493	pg_1768786011553_8h4u0zoem
cml0j45r3003b1q4ecwmqj5yg	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fvjw00007hxtsirwx4s8m	\N	\N	\N	1408.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.952	2026-01-30 06:56:07.494	pg_1768786011553_8h4u0zoem
cml0j45r5003d1q4eeajkezgg	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fkx5l000f4b63teec2nro	\N	\N	\N	1320.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.953	2026-01-30 06:56:07.496	pg_1768786011553_8h4u0zoem
cml0j45r6003f1q4enkxqufd9	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmkauuj5e0001620vtvan1277	\N	\N	\N	1440.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.954	2026-01-30 06:56:07.497	pg_1768786011553_8h4u0zoem
cml0j45r7003h1q4e6qi26i8h	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmkavvboy0002ft7lsl0ipbee	\N	\N	\N	1792.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.955	2026-01-30 06:56:07.498	pg_1768786011553_8h4u0zoem
cml0j45r8003j1q4ekmr7g34p	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fdf7600094b63ff6454lx	\N	\N	\N	2560.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.956	2026-01-30 06:56:07.5	pg_1768786011553_8h4u0zoem
cml0j45r9003l1q4e8m6mn4ja	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fcj4f00054b63m430jdn4	\N	\N	\N	3072.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.957	2026-01-30 06:56:07.501	pg_1768786011553_8h4u0zoem
cml0j45ra003n1q4ebu5468sy	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fd3th00074b63i1ouhou9	\N	\N	\N	3840.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.959	2026-01-30 06:56:07.502	pg_1768786011553_8h4u0zoem
cml0j45rb003p1q4ezy6venhw	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6feqsy000b4b63vxejnfur	\N	\N	\N	4800.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.96	2026-01-30 06:56:07.503	pg_1768786011553_8h4u0zoem
cml0j45rc003r1q4ep3scxqbc	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6gcadu0001v9w2k7ogf6zt	\N	\N	\N	6144.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.961	2026-01-30 06:56:07.505	pg_1768786011553_8h4u0zoem
cml0j45rd003t1q4eztho3ifv	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6gcljl0003v9w2qe2j0lo1	\N	\N	\N	11264.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.962	2026-01-30 06:56:07.506	pg_1768786011553_8h4u0zoem
cml0j45re003v1q4etu6bu9t7	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fc2o500024b63vwcm68cp	\N	\N	\N	192.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.963	2026-01-30 06:56:07.508	pg_1768786011553_8h4u0zoem
cml0j45rf003x1q4ec06u9uyc	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f27nr0005o43xwyhm7een	\N	\N	\N	280.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.964	2026-01-30 06:56:07.509	pg_1768786011553_8h4u0zoem
cml0j45rg003z1q4egzsdxxt0	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fc2od00034b63mc8vtlep	\N	\N	\N	192.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.965	2026-01-30 06:56:07.51	pg_1768786011553_8h4u0zoem
cml0j45rh00411q4efhlka901	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fbng100004b63c70xzv5a	\N	\N	\N	432.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.966	2026-01-30 06:56:07.512	pg_1768786011964_9cx7ux2sp
cml0j45rj00431q4eqlbkw5ew	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fu8av0005hxtsrjafllf0	\N	\N	\N	576.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.967	2026-01-30 06:56:07.513	pg_1768786011964_9cx7ux2sp
cml0j45rk00451q4err052rus	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f3ym20006o43xdewhcbes	\N	\N	\N	720.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.968	2026-01-30 06:56:07.514	pg_1768786011964_9cx7ux2sp
cml0j45rl00471q4eq6xkn0t2	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f88vs0009o43x378tye2v	\N	\N	\N	870.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.969	2026-01-30 06:56:07.515	pg_1768786011964_9cx7ux2sp
cml0j45rm00491q4exg4zyzva	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6ftqqu0004hxtskccmbx2s	\N	\N	\N	900.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.971	2026-01-30 06:56:07.517	pg_1768786011964_9cx7ux2sp
cml0j45rn004b1q4efhlnmwwe	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f6ndh0008o43xcv3mdzu1	\N	\N	\N	1089.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.972	2026-01-30 06:56:07.518	pg_1768786011964_9cx7ux2sp
cml0j45ro004d1q4empiibnk2	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fjyhm000c4b631modt98m	\N	\N	\N	1386.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.973	2026-01-30 06:56:07.519	pg_1768786011964_9cx7ux2sp
cml0j45rp004f1q4epm9n6vdb	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fkx5j000e4b639whx3sxx	\N	\N	\N	1485.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.974	2026-01-30 06:56:07.521	pg_1768786011964_9cx7ux2sp
cml0j45rq004h1q4e1w2lkiam	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fvjvy0006hxtspj3i6nks	\N	\N	\N	1584.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.975	2026-01-30 06:56:07.522	pg_1768786011964_9cx7ux2sp
cml0j45rr004j1q4elc3r1i1h	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmkauuj580000620v7qprf1fa	\N	\N	\N	1620.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.976	2026-01-30 06:56:07.524	pg_1768786011964_9cx7ux2sp
cml0j45rs004l1q4ewk8cn603	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmkavuol30000ft7ltr5dldbf	\N	\N	\N	1764.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.977	2026-01-30 06:56:07.525	pg_1768786011964_9cx7ux2sp
cml0j45rt004n1q4e3lava5e6	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmkavvbot0001ft7l6yfnze23	\N	\N	\N	2016.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.978	2026-01-30 06:56:07.526	pg_1768786011964_9cx7ux2sp
cml0j45rv004p1q4ebdbaj77u	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fdf7400084b63698iy8j5	\N	\N	\N	2880.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.979	2026-01-30 06:56:07.527	pg_1768786011964_9cx7ux2sp
cml0j45rx004t1q4e0vkueslb	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fd3tf00064b63chde9ajf	\N	\N	\N	4320.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.982	2026-01-30 06:56:07.53	pg_1768786011964_9cx7ux2sp
cml0j45rz004v1q4evkk7nk0e	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6feqsv000a4b631dxzz34w	\N	\N	\N	5400.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.983	2026-01-30 06:56:07.531	pg_1768786011964_9cx7ux2sp
cml0j45s0004x1q4ecz2a3v0p	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6gcadq0000v9w22gdjvtj0	\N	\N	\N	6912.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.984	2026-01-30 06:56:07.532	pg_1768786011964_9cx7ux2sp
cml0j45s1004z1q4ee2wz41at	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6gcljh0002v9w2h60pr8xa	\N	\N	\N	12672.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.985	2026-01-30 06:56:07.533	pg_1768786011964_9cx7ux2sp
cml0j45s200511q4eehsfzckv	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f27np0004o43xbl1qfr5n	\N	\N	\N	315.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.987	2026-01-30 06:56:07.534	pg_1768786011964_9cx7ux2sp
cml0j45s400531q4e1gby6906	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fbng600014b63lbz4hbql	\N	\N	\N	432.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.988	2026-01-30 06:56:07.536	pg_1768786011964_9cx7ux2sp
cml0j45ot00011q4eogw5rypg	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fbng100004b63c70xzv5a	\N	\N	\N	561.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.868	2026-01-30 06:56:07.41	pg_1768786011033_7qd25f1mq
cml0j45pi000l1q4e2eyht7l3	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmkavuol30000ft7ltr5dldbf	\N	\N	\N	2291.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.894	2026-01-30 06:56:07.431	pg_1768786011033_7qd25f1mq
cml0j45qn002h1q4ehz813h63	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fvjvy0006hxtspj3i6nks	\N	\N	\N	1408.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.936	2026-01-30 06:56:07.476	pg_1768786011553_8h4u0zoem
cml0j45qv002v1q4e38ohzidn	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6feqsv000a4b631dxzz34w	\N	\N	\N	4800.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.943	2026-01-30 06:56:07.484	pg_1768786011553_8h4u0zoem
cml0j45rw004r1q4et7mw601z	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fcj4d00044b63ydvo3m99	\N	\N	\N	3456.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.98	2026-01-30 06:56:07.528	pg_1768786011964_9cx7ux2sp
cml0j45s500551q4e2157ei5x	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f3ym40007o43x4w1i7igj	\N	\N	\N	720.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.989	2026-01-30 06:56:07.537	pg_1768786011964_9cx7ux2sp
cml0j45s600571q4e9x32bxui	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f88vu000ao43x13j2f12j	\N	\N	\N	870.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.99	2026-01-30 06:56:07.538	pg_1768786011964_9cx7ux2sp
cml0j45s700591q4en4mvgmq0	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fjyhq000d4b63ltsp5xkp	\N	\N	\N	1386.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.991	2026-01-30 06:56:07.54	pg_1768786011964_9cx7ux2sp
cml0j45s8005b1q4eig4ryyio	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fvjw00007hxtsirwx4s8m	\N	\N	\N	1584.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.992	2026-01-30 06:56:07.541	pg_1768786011964_9cx7ux2sp
cml0j45s9005d1q4ekg6bjkce	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fkx5l000f4b63teec2nro	\N	\N	\N	1485.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.993	2026-01-30 06:56:07.542	pg_1768786011964_9cx7ux2sp
cml0j45sa005f1q4e5ndkp3lr	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmkauuj5e0001620vtvan1277	\N	\N	\N	1620.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.995	2026-01-30 06:56:07.544	pg_1768786011964_9cx7ux2sp
cml0j45sb005h1q4erb68oz2y	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmkavvboy0002ft7lsl0ipbee	\N	\N	\N	2016.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.996	2026-01-30 06:56:07.545	pg_1768786011964_9cx7ux2sp
cml0j45sc005j1q4eaqn87nse	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fdf7600094b63ff6454lx	\N	\N	\N	2880.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.997	2026-01-30 06:56:07.546	pg_1768786011964_9cx7ux2sp
cml0j45sd005l1q4ea3h3tklc	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fcj4f00054b63m430jdn4	\N	\N	\N	3456.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.998	2026-01-30 06:56:07.548	pg_1768786011964_9cx7ux2sp
cml0j45se005n1q4e4duifdxv	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fd3th00074b63i1ouhou9	\N	\N	\N	4320.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:45.999	2026-01-30 06:56:07.549	pg_1768786011964_9cx7ux2sp
cml0j45sf005p1q4exqupvowl	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6feqsy000b4b63vxejnfur	\N	\N	\N	5400.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:46	2026-01-30 06:56:07.551	pg_1768786011964_9cx7ux2sp
cml0j45sg005r1q4el44kzhx0	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6gcadu0001v9w2k7ogf6zt	\N	\N	\N	6912.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:46.001	2026-01-30 06:56:07.552	pg_1768786011964_9cx7ux2sp
cml0j45si005t1q4es75fqpyx	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6gcljl0003v9w2qe2j0lo1	\N	\N	\N	12672.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:46.002	2026-01-30 06:56:07.554	pg_1768786011964_9cx7ux2sp
cml0j45sj005v1q4ejdzklmr0	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fc2o500024b63vwcm68cp	\N	\N	\N	216.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:46.003	2026-01-30 06:56:07.555	pg_1768786011964_9cx7ux2sp
cml0j45sk005x1q4ewtdkh2m5	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6f27nr0005o43xwyhm7een	\N	\N	\N	315.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:46.004	2026-01-30 06:56:07.557	pg_1768786011964_9cx7ux2sp
cml0j45sl005z1q4eto6hyfk3	cmko20a3z0025v6kupgm3goza	cmkkhk9d600542fduuvm9kmec	cmk6fc2od00034b63mc8vtlep	\N	\N	\N	216.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-30 06:55:46.006	2026-01-30 06:56:07.558	pg_1768786011964_9cx7ux2sp
\.


ALTER TABLE public.group_production_setting_prices ENABLE TRIGGER ALL;

--
-- Data for Name: half_product_options; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.half_product_options DISABLE TRIGGER ALL;

COPY public.half_product_options (id, "halfProductId", name, type, "values", "quantityType", "sortOrder") FROM stdin;
\.


ALTER TABLE public.half_product_options ENABLE TRIGGER ALL;

--
-- Data for Name: half_product_price_tiers; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.half_product_price_tiers DISABLE TRIGGER ALL;

COPY public.half_product_price_tiers (id, "halfProductId", "minQuantity", "maxQuantity", "discountRate", "sortOrder") FROM stdin;
\.


ALTER TABLE public.half_product_price_tiers ENABLE TRIGGER ALL;

--
-- Data for Name: half_product_specifications; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.half_product_specifications DISABLE TRIGGER ALL;

COPY public.half_product_specifications (id, "halfProductId", name, "widthMm", "heightMm", price, "isDefault", "sortOrder") FROM stdin;
\.


ALTER TABLE public.half_product_specifications ENABLE TRIGGER ALL;

--
-- Data for Name: journals; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.journals DISABLE TRIGGER ALL;

COPY public.journals (id, "voucherNo", "voucherType", "journalDate", "clientId", "clientName", description, "totalAmount", "orderId", "orderNumber", "createdBy", "createdAt", "updatedAt", "sourceId", "sourceType") FROM stdin;
cmlkutwdg0003o1el32hobgmv	JE-202602-0001	RECEIPT	2026-02-13 12:19:06.147	cmlc48lcw00017cvnisoyrvqk	로앤코코	SL-20260212-003 수금 (bank_transfer)	10000.00	\N	\N	system	2026-02-13 12:19:06.148	2026-02-13 12:19:06.148	cmljbp37i001e9irdwwi4nm5p	RECEIPT
cmllkx21m0003l95pkgzhxys0	JE-202602-0002	RECEIPT	2026-02-14 00:29:23.48	cml5w4ssp0001v7vnm48qzlwz	풀로우	SL-20260213-001 수금 (bank_transfer)	24200.00	\N	\N	system	2026-02-14 00:29:23.481	2026-02-14 00:29:23.481	cmlkv0gsi000ro1elko1a4nn8	RECEIPT
cmllkx23v000al95pliymvn7k	JE-202602-0003	RECEIPT	2026-02-14 00:29:23.562	cml5w4ssp0001v7vnm48qzlwz	풀로우	SL-20260213-002 수금 (bank_transfer)	25800.00	\N	\N	system	2026-02-14 00:29:23.563	2026-02-14 00:29:23.563	cmlkv2pa8001bo1ell8bcp0u4	RECEIPT
cmllli1zn0003hypzete69m5a	JE-202602-0004	RECEIPT	2026-02-14 00:45:43.186	cmlc48lcw00017cvnisoyrvqk	로앤코코	SL-20260212-003 수금 (bank_transfer)	16400.00	\N	\N	system	2026-02-14 00:45:43.187	2026-02-14 00:45:43.187	cmljbp37i001e9irdwwi4nm5p	RECEIPT
cmllmphi90003ufonnrk43ism	JE-202602-0005	RECEIPT	2026-02-14 01:19:29.504	cml5w4ssp0001v7vnm48qzlwz	풀로우	SL-20260213-002 수금 (bank_transfer)	600.00	\N	\N	system	2026-02-14 01:19:29.506	2026-02-14 01:19:29.506	cmlkv2pa8001bo1ell8bcp0u4	RECEIPT
cmllmphl7000aufonn1p9qtv7	JE-202602-0006	RECEIPT	2026-02-14 01:19:29.61	cml5w4ssp0001v7vnm48qzlwz	풀로우	SL-20260213-003 수금 (bank_transfer)	26400.00	\N	\N	system	2026-02-14 01:19:29.612	2026-02-14 01:19:29.612	cmlkv4vw1001xo1elr79d8995	RECEIPT
cmllmphoq000hufonz5sc2toz	JE-202602-0007	RECEIPT	2026-02-14 01:19:29.737	cml5w4ssp0001v7vnm48qzlwz	풀로우	SL-20260214-001 수금 (bank_transfer)	25740.00	\N	\N	system	2026-02-14 01:19:29.739	2026-02-14 01:19:29.739	cmllm3x19000jev19y54uyu04	RECEIPT
cmllmphz8000oufonun2otd1b	JE-202602-0008	RECEIPT	2026-02-14 01:19:30.114	cml5w4ssp0001v7vnm48qzlwz	풀로우	SL-20260214-002 수금 (bank_transfer)	27280.00	\N	\N	system	2026-02-14 01:19:30.116	2026-02-14 01:19:30.116	cmllm3x4q0015ev194ftubqot	RECEIPT
cmllmpi9e000vufonaqgipz5l	JE-202602-0009	RECEIPT	2026-02-14 01:19:30.48	cml5w4ssp0001v7vnm48qzlwz	풀로우	SL-20260214-003 수금 (bank_transfer)	24200.00	\N	\N	system	2026-02-14 01:19:30.482	2026-02-14 01:19:30.482	cmllm3xa3001pev193b28fqg8	RECEIPT
cmllmpihi0012ufonqph13pyn	JE-202602-0010	RECEIPT	2026-02-14 01:19:30.772	cml5w4ssp0001v7vnm48qzlwz	풀로우	SL-20260214-004 수금 (bank_transfer)	24200.00	\N	\N	system	2026-02-14 01:19:30.775	2026-02-14 01:19:30.775	cmllm3xfe0029ev19sbhf7lsl	RECEIPT
cmllmpim50019ufonh10kgb77	JE-202602-0011	RECEIPT	2026-02-14 01:19:30.939	cml5w4ssp0001v7vnm48qzlwz	풀로우	SL-20260214-005 수금 (bank_transfer)	21580.00	\N	\N	system	2026-02-14 01:19:30.941	2026-02-14 01:19:30.941	cmllm3xja002uev19tm2svkah	RECEIPT
cmllsvhee0074ted7s14ejgex	JE-202602-0012	RECEIPT	2026-02-14 04:12:06.995	cmlls3h030000ted7yhh6qmdh	아마레스튜디오	SL-20260214-026 수금 (bank_transfer)	54450.00	\N	\N	system	2026-02-14 04:12:06.997	2026-02-14 04:12:06.997	cmllsk8gz001zted7hfktr3vs	RECEIPT
cmllsvhju007bted7h2tqduaz	JE-202602-0013	RECEIPT	2026-02-14 04:12:07.192	cmlls3h030000ted7yhh6qmdh	아마레스튜디오	SL-20260214-027 수금 (bank_transfer)	97900.00	\N	\N	system	2026-02-14 04:12:07.194	2026-02-14 04:12:07.194	cmllsk8mo0022ted7rufl4xge	RECEIPT
cmllsvhpd007ited7ygj9xbjb	JE-202602-0014	RECEIPT	2026-02-14 04:12:07.39	cmlls3h030000ted7yhh6qmdh	아마레스튜디오	SL-20260214-028 수금 (bank_transfer)	54450.00	\N	\N	system	2026-02-14 04:12:07.393	2026-02-14 04:12:07.393	cmllsk92b0031ted7f1cg0mah	RECEIPT
cmllsviho007pted7dq0a9vs9	JE-202602-0015	RECEIPT	2026-02-14 04:12:08.409	cmlls3h030000ted7yhh6qmdh	아마레스튜디오	SL-20260214-029 수금 (bank_transfer)	43200.00	\N	\N	system	2026-02-14 04:12:08.412	2026-02-14 04:12:08.412	cmllsk9kk0040ted7ub6i0c0o	RECEIPT
cmlvj7zme0017m8c10554yhav	JE-202602-0016	TRANSFER	2026-02-20 23:39:36.083	cmlls3h030000ted7yhh6qmdh	아마레스튜디오	에히오르 압축앨범 - 260314[43]박준상 차나연_20p 좌시우끝 (6×7.5인치)	41800.00	cmlvj7zg2000jm8c1j65fgrpt	260221-007	system	2026-02-20 23:39:36.086	2026-02-20 23:39:36.086	cmlvj7zl00012m8c1fqcclkhx	SALES
cmlvkxxf6000fwbsq0k80q397	JE-202602-0017	TRANSFER	2026-02-21 00:27:45.9	cmlls3h030000ted7yhh6qmdh	아마레스튜디오	TEST_NORMAL	55000.00	cmlvkxxbe0007wbsq572hx6cu	260221-009	system	2026-02-21 00:27:45.907	2026-02-21 00:27:45.907	cmlvkxxd2000cwbsq1kmasn9z	SALES
cmlvkytap000twbsq3zfzsu6k	JE-202602-0018	TRANSFER	2026-02-21 00:28:27.223	cmlls3h030000ted7yhh6qmdh	아마레스튜디오	TEST	55000.00	cmlvkyt9i000mwbsqaffu2xww	260221-010	system	2026-02-21 00:28:27.217	2026-02-21 00:28:27.217	cmlvkyta9000qwbsqi85389ef	SALES
\.


ALTER TABLE public.journals ENABLE TRIGGER ALL;

--
-- Data for Name: journal_entries; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.journal_entries DISABLE TRIGGER ALL;

COPY public.journal_entries (id, "journalId", "accountId", "transactionType", amount, description, "sortOrder") FROM stdin;
cmlkutwdg0005o1elut9a1vqk	cmlkutwdg0003o1el32hobgmv	cmlgp6c3a0001ftjc9634ogr1	DEBIT	10000.00	입금 - 로앤코코 / bank_transfer (우리은행)	0
cmlkutwdg0006o1elxji21eot	cmlkutwdg0003o1el32hobgmv	cmlgp6c3p0004ftjcmdhn6ux9	CREDIT	10000.00	외상매출금 회수 - 로앤코코	1
cmllkx21m0005l95pit94hbre	cmllkx21m0003l95pkgzhxys0	cmlgp6c3a0001ftjc9634ogr1	DEBIT	24200.00	입금 - 풀로우 / bank_transfer (IBK기업은행)	0
cmllkx21m0006l95pq2b31p69	cmllkx21m0003l95pkgzhxys0	cmlgp6c3p0004ftjcmdhn6ux9	CREDIT	24200.00	외상매출금 회수 - 풀로우	1
cmllkx23v000cl95pbrosa3lx	cmllkx23v000al95pliymvn7k	cmlgp6c3a0001ftjc9634ogr1	DEBIT	25800.00	입금 - 풀로우 / bank_transfer (IBK기업은행)	0
cmllkx23v000dl95pc1ivk4b0	cmllkx23v000al95pliymvn7k	cmlgp6c3p0004ftjcmdhn6ux9	CREDIT	25800.00	외상매출금 회수 - 풀로우	1
cmllli1zn0005hypz1vxvj09s	cmllli1zn0003hypzete69m5a	cmlgp6c3a0001ftjc9634ogr1	DEBIT	16400.00	입금 - 로앤코코 / bank_transfer	0
cmllli1zn0006hypzcwuhtn9x	cmllli1zn0003hypzete69m5a	cmlgp6c3p0004ftjcmdhn6ux9	CREDIT	16400.00	외상매출금 회수 - 로앤코코	1
cmllmphia0005ufon6hbjrz8k	cmllmphi90003ufonnrk43ism	cmlgp6c3a0001ftjc9634ogr1	DEBIT	600.00	입금 - 풀로우 / bank_transfer (우리은행)	0
cmllmphia0006ufonn3cspd93	cmllmphi90003ufonnrk43ism	cmlgp6c3p0004ftjcmdhn6ux9	CREDIT	600.00	외상매출금 회수 - 풀로우	1
cmllmphl8000cufon0k8cyshi	cmllmphl7000aufonn1p9qtv7	cmlgp6c3a0001ftjc9634ogr1	DEBIT	26400.00	입금 - 풀로우 / bank_transfer (우리은행)	0
cmllmphl8000dufon3o8m5a6e	cmllmphl7000aufonn1p9qtv7	cmlgp6c3p0004ftjcmdhn6ux9	CREDIT	26400.00	외상매출금 회수 - 풀로우	1
cmllmphor000jufonqfucezgg	cmllmphoq000hufonz5sc2toz	cmlgp6c3a0001ftjc9634ogr1	DEBIT	25740.00	입금 - 풀로우 / bank_transfer (우리은행)	0
cmllmphor000kufon6leadxg0	cmllmphoq000hufonz5sc2toz	cmlgp6c3p0004ftjcmdhn6ux9	CREDIT	25740.00	외상매출금 회수 - 풀로우	1
cmllmphz8000qufono1b90ed3	cmllmphz8000oufonun2otd1b	cmlgp6c3a0001ftjc9634ogr1	DEBIT	27280.00	입금 - 풀로우 / bank_transfer (우리은행)	0
cmllmphz8000rufon8d9n7ok2	cmllmphz8000oufonun2otd1b	cmlgp6c3p0004ftjcmdhn6ux9	CREDIT	27280.00	외상매출금 회수 - 풀로우	1
cmllmpi9e000xufonml2kvmgf	cmllmpi9e000vufonaqgipz5l	cmlgp6c3a0001ftjc9634ogr1	DEBIT	24200.00	입금 - 풀로우 / bank_transfer (우리은행)	0
cmllmpi9e000yufon82xgiex2	cmllmpi9e000vufonaqgipz5l	cmlgp6c3p0004ftjcmdhn6ux9	CREDIT	24200.00	외상매출금 회수 - 풀로우	1
cmllmpihj0014ufonnu23nxun	cmllmpihi0012ufonqph13pyn	cmlgp6c3a0001ftjc9634ogr1	DEBIT	24200.00	입금 - 풀로우 / bank_transfer (우리은행)	0
cmllmpihj0015ufon4fm8lou8	cmllmpihi0012ufonqph13pyn	cmlgp6c3p0004ftjcmdhn6ux9	CREDIT	24200.00	외상매출금 회수 - 풀로우	1
cmllmpim5001bufonkr9vm9io	cmllmpim50019ufonh10kgb77	cmlgp6c3a0001ftjc9634ogr1	DEBIT	21580.00	입금 - 풀로우 / bank_transfer (우리은행)	0
cmllmpim5001cufonbsi385tb	cmllmpim50019ufonh10kgb77	cmlgp6c3p0004ftjcmdhn6ux9	CREDIT	21580.00	외상매출금 회수 - 풀로우	1
cmllsvhee0076ted7h492zrc1	cmllsvhee0074ted7s14ejgex	cmlgp6c3a0001ftjc9634ogr1	DEBIT	54450.00	입금 - 아마레스튜디오 / bank_transfer (IBK기업은행)	0
cmllsvhee0077ted7rwmcnp5q	cmllsvhee0074ted7s14ejgex	cmlgp6c3p0004ftjcmdhn6ux9	CREDIT	54450.00	외상매출금 회수 - 아마레스튜디오	1
cmllsvhju007dted7lngklf55	cmllsvhju007bted7h2tqduaz	cmlgp6c3a0001ftjc9634ogr1	DEBIT	97900.00	입금 - 아마레스튜디오 / bank_transfer (IBK기업은행)	0
cmllsvhju007eted7lxu0tj2j	cmllsvhju007bted7h2tqduaz	cmlgp6c3p0004ftjcmdhn6ux9	CREDIT	97900.00	외상매출금 회수 - 아마레스튜디오	1
cmllsvhpd007kted7xl9msahz	cmllsvhpd007ited7ygj9xbjb	cmlgp6c3a0001ftjc9634ogr1	DEBIT	54450.00	입금 - 아마레스튜디오 / bank_transfer (IBK기업은행)	0
cmllsvhpd007lted7k9f1hkyk	cmllsvhpd007ited7ygj9xbjb	cmlgp6c3p0004ftjcmdhn6ux9	CREDIT	54450.00	외상매출금 회수 - 아마레스튜디오	1
cmllsviho007rted7s79tvn4j	cmllsviho007pted7dq0a9vs9	cmlgp6c3a0001ftjc9634ogr1	DEBIT	43200.00	입금 - 아마레스튜디오 / bank_transfer (IBK기업은행)	0
cmllsviho007sted7vc6c1tmq	cmllsviho007pted7dq0a9vs9	cmlgp6c3p0004ftjcmdhn6ux9	CREDIT	43200.00	외상매출금 회수 - 아마레스튜디오	1
cmlvj7zme0019m8c1j7pyg2h6	cmlvj7zme0017m8c10554yhav	cmlgp6c3p0004ftjcmdhn6ux9	DEBIT	41800.00	외상매출금 - 아마레스튜디오	0
cmlvj7zme001am8c15wdflp0d	cmlvj7zme0017m8c10554yhav	cmlgp6c6f000sftjclc5ic7kn	CREDIT	38000.00	제품매출 - 아마레스튜디오	1
cmlvj7zme001bm8c1ndocf6gw	cmlvj7zme0017m8c10554yhav	cmlgp6c5i000kftjc4heo0cza	CREDIT	3800.00	부가세 예수금 - 아마레스튜디오	2
cmlvkxxf7000hwbsq8o3cljxw	cmlvkxxf6000fwbsq0k80q397	cmlgp6c3p0004ftjcmdhn6ux9	DEBIT	55000.00	외상매출금 - 아마레스튜디오	0
cmlvkxxf7000iwbsqu33hg6ru	cmlvkxxf6000fwbsq0k80q397	cmlgp6c6f000sftjclc5ic7kn	CREDIT	50000.00	제품매출 - 아마레스튜디오	1
cmlvkxxf7000jwbsqotnuhsr5	cmlvkxxf6000fwbsq0k80q397	cmlgp6c5i000kftjc4heo0cza	CREDIT	5000.00	부가세 예수금 - 아마레스튜디오	2
cmlvkytap000vwbsqrlqzppca	cmlvkytap000twbsq3zfzsu6k	cmlgp6c3p0004ftjcmdhn6ux9	DEBIT	55000.00	외상매출금 - 아마레스튜디오	0
cmlvkytap000wwbsqkwoxdvpz	cmlvkytap000twbsq3zfzsu6k	cmlgp6c6f000sftjclc5ic7kn	CREDIT	50000.00	제품매출 - 아마레스튜디오	1
cmlvkytap000xwbsqn23g3q5s	cmlvkytap000twbsq3zfzsu6k	cmlgp6c5i000kftjc4heo0cza	CREDIT	5000.00	부가세 예수금 - 아마레스튜디오	2
\.


ALTER TABLE public.journal_entries ENABLE TRIGGER ALL;

--
-- Data for Name: my_products; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.my_products DISABLE TRIGGER ALL;

COPY public.my_products (id, "clientId", "productId", "sortOrder", "usageCount", "lastUsedAt", "createdAt", "updatedAt", "defaultQuantity", memo, name, options, "thumbnailUrl") FROM stdin;
cml8w1csi0099ll8n31gekt9c	cmkg8vzuf0000at5m0dyaydie	cml4ixxoc0001gpi1byhcm6bf	0	0	\N	2026-02-05 03:19:39.523	2026-02-05 03:19:39.523	1	\N	졸업앨범 5x7	{"paperId": "cml8tq60r008pll8n9yi0ah1d", "bindingId": "cml8tq60r008oll8nw21dv11v", "foilColor": "gold_matte", "paperName": "Snow 180g", "printSide": "double", "bindingName": "스타제본 (구간별 Nup/1p가격)", "finishingIds": [], "foilPosition": "right_center", "copperPlateId": "cml0cjlnu0007zxl5dmk6zu4i", "foilColorName": "금박(무광)", "finishingNames": [], "copperPlateName": "Scotter", "copperPlateType": "owned", "specificationId": "cml8tq60r0080ll8n8sfh4knz", "foilPositionName": "우중", "specificationName": "5x7"}	/upload/category-icons/5835202e-9400-4670-9885-b1a039f37afd.jpg
cmlp967tw0005xuizbbwlcj2m	cml5w4ssp0001v7vnm48qzlwz	cml4ixxoc0001gpi1byhcm6bf	0	1	2026-02-16 14:11:46.993	2026-02-16 14:11:40.196	2026-02-16 14:11:46.995	1	\N	스타화보 021601	{"paperId": "cmlp8k1l6001sd71mbve0b9yz", "bindingId": "cmlp8k1l4001ed71m1sb09srl", "foilColor": "silver_matte", "paperName": "아티젠 210g", "printSide": "double", "bindingName": "스타제본 (구간별 Nup/1p가격)", "finishingIds": [], "foilPosition": "right_center", "copperPlateId": "cml5wlnbj0001glhl6whmp0wn", "foilColorName": "은박(무광)", "finishingNames": [], "copperPlateName": "경기졸업음악회", "copperPlateType": "owned", "specificationId": "cmlp8k1l1000dd71mv7ocr559", "foilPositionName": "우중", "specificationName": "6x4"}	/upload/category-icons/5835202e-9400-4670-9885-b1a039f37afd.jpg
cmlv1d18t0005ux3mwbjxw4f6	cmlls3h030000ted7yhh6qmdh	cmkse0z6y001p86l2dop9h1kg	0	7	2026-02-21 01:13:28.369	2026-02-20 15:19:38.381	2026-02-21 01:13:28.375	1	\N	1212	{"paperId": "cmls6r1y6003n8frqz7zumsqh", "fabricId": "cmlomhj710000y2rkznl6suhw", "bindingId": "cmls6r1y6003h8frqb1r52hev", "foilColor": "gold_glossy", "paperName": "아티젠 210g", "printSide": "single", "fabricName": "브라운", "bindingName": "압축제본_웨딩.베이비 (구간별 Nup/1p가격)", "finishingIds": ["cmls6r1y6003t8frque05wzr6", "cmls6r1y6003v8frqfrjv9nh0"], "foilPosition": "center", "copperPlateId": "cmla56fyf00006isg9u8icbam", "foilColorName": "금박(유광)", "finishingNames": ["첫장 한지추가", "수성코팅"], "copperPlateName": "Portrait", "copperPlateType": "public", "foilPositionName": "정중앙"}	/uploads/products/be09a664-7b8e-4ccf-a912-4026dfd228f2.jpg
\.


ALTER TABLE public.my_products ENABLE TRIGGER ALL;

--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.orders DISABLE TRIGGER ALL;

COPY public.orders (id, "orderNumber", barcode, "clientId", "productPrice", "shippingFee", tax, "adjustmentAmount", "totalAmount", "finalAmount", "paymentMethod", "paymentStatus", status, "currentProcess", "isUrgent", "requestedDeliveryDate", "customerMemo", "productMemo", "adminMemo", "orderedAt", "createdAt", "updatedAt", "isDuplicateOverride") FROM stdin;
cmlvming80002iev2u7dnnr1r	260221-008	MLVMING0L7GJ	cmlls3h030000ted7yhh6qmdh	20400.00	5500.00	2040.00	0.00	27940.00	27940.00	postpaid	pending	pending_receipt	receipt_pending	f	\N	\N	\N	\N	2026-02-21 01:11:52.376	2026-02-21 01:11:52.376	2026-02-21 01:11:52.376	t
cmlvn565y000piev2wzw01ukj	260221-009	MLVN565S3J5J	cmlls3h030000ted7yhh6qmdh	20400.00	5500.00	2040.00	0.00	27940.00	27940.00	postpaid	pending	pending_receipt	receipt_pending	f	\N	\N	\N	\N	2026-02-21 01:29:23.062	2026-02-21 01:29:23.062	2026-02-21 01:29:23.062	t
\.


ALTER TABLE public.orders ENABLE TRIGGER ALL;

--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.order_items DISABLE TRIGGER ALL;

COPY public.order_items (id, "orderId", "productionNumber", "productId", "productName", size, pages, "printMethod", paper, "bindingType", "coverMaterial", "foilName", "foilColor", "finishingOptions", quantity, "unitPrice", "totalPrice", "bindingIntentId", "colorIntentId", "fileSpecId", "foldingIntentId", "jdfBindingSide", "jdfBindingType", "jdfCoatingBack", "jdfCoatingFront", "jdfNumColorsBack", "jdfNumColorsFront", "proofingIntentId", "qualityControlId", "thumbnailUrl", "totalFileSize", "folderName", "bindingDirection", "pageLayout", "fabricName", "originalsDeleted", "pdfGeneratedAt", "pdfPath", "pdfStatus", "foilPosition", "fabricSnapshot") FROM stdin;
cmlvming90003iev2k3wvlq9g	cmlvming80002iev2u7dnnr1r	260221-008-01	cmkse0z6y001p86l2dop9h1kg	에히오르 압축앨범 - 251220[43]주찬양 손세은_22p 좌시우끝	12×15인치	22	인디고앨범	아티젠 210g	압축제본_웨딩.베이비 (구간별 Nup/1p가격)	\N	Portrait	금박(유광)	{}	1	20400.00	20400.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	114977739	251220[43]주찬양 손세은_22p 좌시우끝	LEFT_START_RIGHT_END	spread	브라운	f	\N	\N	\N	정중앙	{"id": "cmlomhj710000y2rkznl6suhw", "name": "브라운"}
cmlvn565z000qiev2i9dz9482	cmlvn565y000piev2wzw01ukj	260221-009-01	cmkse0z6y001p86l2dop9h1kg	에히오르 압축앨범 - 리마인드[43]이광배 송지영_22p 좌시우끝	12×15인치	22	인디고앨범	아티젠 210g	압축제본_웨딩.베이비 (구간별 Nup/1p가격)	\N	Portrait	금박(유광)	{}	1	20400.00	20400.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	122640271	리마인드[43]이광배 송지영_22p 좌시우끝	LEFT_START_RIGHT_END	spread	브라운	f	\N	\N	\N	정중앙	{"id": "cmlomhj710000y2rkznl6suhw", "name": "브라운"}
\.


ALTER TABLE public.order_items ENABLE TRIGGER ALL;

--
-- Data for Name: order_item_shippings; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.order_item_shippings DISABLE TRIGGER ALL;

COPY public.order_item_shippings (id, "orderItemId", "senderType", "senderName", "senderPhone", "senderPostalCode", "senderAddress", "senderAddressDetail", "receiverType", "recipientName", phone, "postalCode", address, "addressDetail", "deliveryMethod", "deliveryFee", "deliveryFeeType", "courierCode", "trackingNumber", "shippedAt", "deliveredAt") FROM stdin;
cmlvminga000fiev2alahs9sh	cmlvming90003iev2k3wvlq9g	company	(주)프린팅솔루션즈	02-6263-7682	13515	성남시 중원구 둔촌대로560	벽산테크노타운 311호	direct_customer	홍준표	010-2313-1228		1111		parcel	5500.00	standard	\N	\N	\N	\N
cmlvn56600012iev2qde19z0a	cmlvn565z000qiev2i9dz9482	company	(주)프린팅솔루션즈	02-6263-7682	13515	성남시 중원구 둔촌대로560	벽산테크노타운 311호	direct_customer	이방원	010-2223-3333		서울 강남구 논현동 161		parcel	5500.00	standard	\N	\N	\N	\N
\.


ALTER TABLE public.order_item_shippings ENABLE TRIGGER ALL;

--
-- Data for Name: order_shippings; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.order_shippings DISABLE TRIGGER ALL;

COPY public.order_shippings (id, "orderId", "recipientName", phone, "postalCode", address, "addressDetail", "courierCode", "trackingNumber", "shippedAt", "deliveredAt") FROM stdin;
cmlvmingb000giev269k3ylc8	cmlvming80002iev2u7dnnr1r	홍준표	010-2313-1228		1111		\N	\N	\N	\N
cmlvn56600013iev28d7k7m2m	cmlvn565y000piev2wzw01ukj	이방원	010-2223-3333		서울 강남구 논현동 161		\N	\N	\N	\N
\.


ALTER TABLE public.order_shippings ENABLE TRIGGER ALL;

--
-- Data for Name: paper_groups; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.paper_groups DISABLE TRIGGER ALL;

COPY public.paper_groups (id, code, name, color, "basePrice", "unitType", description, "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.paper_groups ENABLE TRIGGER ALL;

--
-- Data for Name: paper_manufacturers; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.paper_manufacturers DISABLE TRIGGER ALL;

COPY public.paper_manufacturers (id, code, name, country, website, "contactInfo", description, "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cmk69gtdb0004alpyf4o3mjc8	MFMK69GIDC	대한통상	한국	https://replit.com/@wooceo/Estimate-Master	02-222-2222		0	t	2026-01-09 02:32:34.991	2026-01-09 02:32:34.991
cmk6ay5yb0000ccm4kecgba4o	MFMK6AY0QZ	한솔제지					0	t	2026-01-09 03:14:04.067	2026-01-09 03:14:04.067
\.


ALTER TABLE public.paper_manufacturers ENABLE TRIGGER ALL;

--
-- Data for Name: paper_suppliers; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.paper_suppliers DISABLE TRIGGER ALL;

COPY public.paper_suppliers (id, code, name, phone, mobile, email, fax, "postalCode", address, "addressDetail", representative, website, description, memo, "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cmk6b4g8y00006wgjlqaztouz	SPMK6B3XPO	대한통상	01023131228	01023131228	wooceo@gmail.com		463-970	운중동  산운마을 804동 101호		세종대왕				0	t	2026-01-09 03:18:57.346	2026-01-09 03:18:57.346
cmk6ckcsh0002oeubwy8mjfww	SPMK6CK58G	바이텍												0	t	2026-01-09 03:59:18.978	2026-01-09 03:59:18.978
\.


ALTER TABLE public.paper_suppliers ENABLE TRIGGER ALL;

--
-- Data for Name: papers; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.papers DISABLE TRIGGER ALL;

COPY public.papers (id, code, name, "paperGroupId", "manufacturerId", "supplierId", "paperType", "sheetSize", "sheetWidthMm", "sheetHeightMm", "customSheetName", "rollWidth", "rollWidthInch", "rollLength", "rollLengthM", grammage, "grammageDisplay", finish, "finishDisplay", "printMethods", "colorType", "colorGroup", thickness, "basePrice", "unitType", "discountRate", "discountPrice", "stockQuantity", "minStockLevel", description, memo, "sortOrder", "isActive", "createdAt", "updatedAt", "nUpIndigo", "nUpInkjet", "jdfBackCoating", "jdfFrontCoating", "jdfGrade", "jdfHoleType", "jdfMediaType", "jdfMediaTypeDetails", "jdfOpacity", "jdfPrePrinted", "jdfTexture") FROM stdin;
cmk6bnlsk0002w4rgwhc1y6dw	PAPERMK6BITID	아티젠	\N	cmk6ay5yb0000ccm4kecgba4o	cmk6b4g8y00006wgjlqaztouz	sheet	국전지	788.00	1091.00	\N	\N	\N	\N	\N	210	210g/m²	matte	\N	{indigo,offset}	\N	\N	\N	202796.00	ream	0.00	\N	0	0			0	t	2026-01-09 03:33:50.996	2026-01-09 03:37:15.399	\N	\N	\N	\N	1	\N	Paper	\N	Opaque	f	\N
cmk6bx7xd0006w4rgt2s54dqp	PAPERMK6BW8DI	아트지	\N	cmk6ay5yb0000ccm4kecgba4o	cmk6b4g8y00006wgjlqaztouz	sheet	국전지	788.00	1091.00	\N	\N	\N	\N	\N	180	180g/m²	matte	\N	{indigo,offset}	\N	\N	\N	107127.00	ream	0.00	\N	0	0			0	t	2026-01-09 03:41:19.585	2026-01-09 03:41:42.823	\N	\N	\N	\N	1	\N	Paper	\N	Opaque	f	\N
cmk6bw3930004w4rgfz1xi87r	PAPERMK6BUH2E	스노우	\N	cmk6ay5yb0000ccm4kecgba4o	cmk6b4g8y00006wgjlqaztouz	sheet	국전지	788.00	1091.00	\N	\N	\N	\N	\N	250	250g/m²	lustre	\N	{indigo,offset}	\N	\N	\N	148785.00	ream	0.00	\N	0	0			0	t	2026-01-09 03:40:26.871	2026-01-09 03:41:54.816	\N	\N	\N	\N	1	\N	Paper	\N	Opaque	f	\N
cmk6c19320008w4rgtgxtmtlc	PAPERMK6BYYKY	아티젠	\N	cmk6ay5yb0000ccm4kecgba4o	cmk6b4g8y00006wgjlqaztouz	sheet	국전지	788.00	1091.00	\N	\N	\N	\N	\N	230	230g/m²	matte	\N	{indigo,offset}	\N	\N	\N	222103.00	ream	0.00	\N	0	0			0	t	2026-01-09 03:44:27.711	2026-01-09 03:46:00.412	\N	\N	\N	\N	1	\N	Paper	\N	Opaque	f	\N
cmk6cl3kp0004oeub4w4fpghp	PAPERMK6CJT5O	싸틴	\N	cmk6ay5yb0000ccm4kecgba4o	cmk6ckcsh0002oeubwy8mjfww	roll	국전지	788.00	1091.00	\N	24"	\N	30m	\N	240	240g/m²	satin	\N	{inkjet}	\N	\N	\N	38000.00	roll	0.00	\N	0	0			0	t	2026-01-09 03:59:53.689	2026-01-09 04:00:29.466	\N	\N	\N	\N	1	\N	Paper	\N	Opaque	f	\N
cmk6cj27s0001oeub8ot2p5wq	PAPERMK6CHF48	프리미엄메트	\N	cmk69gtdb0004alpyf4o3mjc8	cmk6b4g8y00006wgjlqaztouz	roll	국전지	788.00	1091.00	\N	24"	\N	30m	\N	240	240g/m²	matte	\N	{inkjet}	\N	\N	\N	28000.00	roll	0.00	\N	0	0			0	t	2026-01-09 03:58:18.616	2026-01-16 04:00:26.867	\N	\N	\N	\N	1	\N	Paper	\N	Opaque	f	\N
cmko0b90d000dv6kucf3istj1	PAPERMKO0A5DI	캔버스	\N	cmk69gtdb0004alpyf4o3mjc8	cmk6b4g8y00006wgjlqaztouz	roll	\N	\N	\N	\N	24"	\N	30m	\N	240	240g/m²	matte	\N	{inkjet}	\N	\N	\N	250000.00	roll	0.00	\N	0	0			0	t	2026-01-21 12:36:09.95	2026-01-21 12:36:31.671	\N	\N	\N	\N	1	\N	Paper	\N	Opaque	f	\N
cmkxo1gbq000812fcd0o1p2fa	PAPERMKXO0LDB	스노우	\N	cmk6ay5yb0000ccm4kecgba4o	\N	sheet	국전지	788.00	1091.00	\N	\N	\N	\N	\N	300	300g/m²	lustre	\N	{indigo,offset}	\N	\N	\N	150000.00	ream	0.00	\N	0	0			0	t	2026-01-28 06:50:19.239	2026-01-28 06:50:19.239	\N	\N	\N	\N	1	\N	Paper	\N	Opaque	f	\N
cmko0dy6g000fv6kuem61w1s2	PAPERMKO0D0LP	스노우	\N	cmk6ay5yb0000ccm4kecgba4o	cmk6b4g8y00006wgjlqaztouz	sheet	국전지	788.00	1091.00	\N	\N	\N	\N	\N	180	180g/m²	lustre	\N	{indigo,offset}	\N	\N	\N	107127.00	ream	0.00	\N	0	0			0	t	2026-01-21 12:38:15.881	2026-02-02 01:50:56.63	\N	\N	\N	\N	3	\N	Paper	\N	Opaque	f	\N
\.


ALTER TABLE public.papers ENABLE TRIGGER ALL;

--
-- Data for Name: paper_prices; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.paper_prices DISABLE TRIGGER ALL;

COPY public.paper_prices (id, "paperId", "priceType", "groupId", "minQuantity", "maxQuantity", price, "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.paper_prices ENABLE TRIGGER ALL;

--
-- Data for Name: payables; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.payables DISABLE TRIGGER ALL;

COPY public.payables (id, "supplierId", "supplierName", "supplierCode", "journalId", "originalAmount", "paidAmount", balance, "issueDate", "dueDate", status, description, "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.payables ENABLE TRIGGER ALL;

--
-- Data for Name: payable_payments; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.payable_payments DISABLE TRIGGER ALL;

COPY public.payable_payments (id, "payableId", amount, "paymentDate", "paymentMethod", description, "journalId", "createdBy", "createdAt") FROM stdin;
\.


ALTER TABLE public.payable_payments ENABLE TRIGGER ALL;

--
-- Data for Name: permission_templates; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.permission_templates DISABLE TRIGGER ALL;

COPY public.permission_templates (id, name, description, permissions, "isDefault", "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.permission_templates ENABLE TRIGGER ALL;

--
-- Data for Name: plate_positions; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.plate_positions DISABLE TRIGGER ALL;

COPY public.plate_positions (id, code, name, "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cmkyytru00008nodyevg2hvh6	center	정중앙	1	t	2026-01-29 04:40:02.857	2026-01-29 04:40:02.857
cmkyytru10009nodyu6zvt9zb	top_center	중상	2	t	2026-01-29 04:40:02.858	2026-01-29 04:40:02.858
cmkyytru2000anodyowjbap8c	bottom_center	중하	3	t	2026-01-29 04:40:02.858	2026-01-29 04:40:02.858
cmkyytru2000bnodyqeswbzs5	right_center	우중	4	t	2026-01-29 04:40:02.859	2026-01-29 04:40:02.859
cmkyytru3000cnodyilcpuebs	right_bottom	우하	5	t	2026-01-29 04:40:02.859	2026-01-29 04:40:02.859
\.


ALTER TABLE public.plate_positions ENABLE TRIGGER ALL;

--
-- Data for Name: process_histories; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.process_histories DISABLE TRIGGER ALL;

COPY public.process_histories (id, "orderId", "fromStatus", "toStatus", "processType", note, "processedBy", "processedAt") FROM stdin;
cmlvmingb000hiev22454hhrx	cmlvming80002iev2u7dnnr1r	\N	pending_receipt	order_created	\N	cmlls3h030000ted7yhh6qmdh	2026-02-21 01:11:52.376
cmlvn56600014iev2b2fpevgr	cmlvn565y000piev2wzw01ukj	\N	pending_receipt	order_created	\N	cmlls3h030000ted7yhh6qmdh	2026-02-21 01:29:23.062
\.


ALTER TABLE public.process_histories ENABLE TRIGGER ALL;

--
-- Data for Name: product_bindings; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.product_bindings DISABLE TRIGGER ALL;

COPY public.product_bindings (id, "productId", name, price, "isDefault", "sortOrder", "pricingType", "productionSettingId") FROM stdin;
cmlrff54g00129morpfszv0uc	cml4ixxoc0001gpi1byhcm6bf	스타제본 (구간별 Nup/1p가격)	0.00	t	0	nup_page_range	cml8tfb2e0027ll8nfsq45jor
cmls6r1y6003h8frqb1r52hev	cmkse0z6y001p86l2dop9h1kg	압축제본_웨딩.베이비 (구간별 Nup/1p가격)	0.00	t	0	nup_page_range	cml8tboql0001ll8njegn1tsj
\.


ALTER TABLE public.product_bindings ENABLE TRIGGER ALL;

--
-- Data for Name: product_covers; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.product_covers DISABLE TRIGGER ALL;

COPY public.product_covers (id, "productId", name, "materialCode", price, "imageUrl", "isDefault", "sortOrder") FROM stdin;
\.


ALTER TABLE public.product_covers ENABLE TRIGGER ALL;

--
-- Data for Name: product_fabrics; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.product_fabrics DISABLE TRIGGER ALL;

COPY public.product_fabrics (id, "productId", "fabricId", "sortOrder") FROM stdin;
cmlrff54i001d9morhtmn9u7x	cml4ixxoc0001gpi1byhcm6bf	cmlomhj710000y2rkznl6suhw	0
cmlrff54i001e9morhgl1ndll	cml4ixxoc0001gpi1byhcm6bf	cmks9efkv000higlum802x548	1
cmls6r1y7003y8frqsl93q19b	cmkse0z6y001p86l2dop9h1kg	cmlomhj710000y2rkznl6suhw	0
cmls6r1y7003z8frq8pil447w	cmkse0z6y001p86l2dop9h1kg	cmks9efkv000higlum802x548	1
\.


ALTER TABLE public.product_fabrics ENABLE TRIGGER ALL;

--
-- Data for Name: product_finishings; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.product_finishings DISABLE TRIGGER ALL;

COPY public.product_finishings (id, "productId", name, price, "isDefault", "sortOrder", "productionGroupId") FROM stdin;
cmls6r1y6003t8frque05wzr6	cmkse0z6y001p86l2dop9h1kg	간지추가	0.00	f	0	cmljexe24001bilhatxlg1neu
cmls6r1y6003u8frqnrkgevcj	cmkse0z6y001p86l2dop9h1kg	첫장 한지추가	0.00	f	1	cmljexe24001bilhatxlg1neu
cmls6r1y6003v8frqfrjv9nh0	cmkse0z6y001p86l2dop9h1kg	코팅	0.00	f	2	cmk6gihm30009v9w27j6zfq2m
cmls6r1y6003w8frqjwa4zeb7	cmkse0z6y001p86l2dop9h1kg	수성코팅	0.00	f	3	cmk6gihm30009v9w27j6zfq2m
cmlrff54h001b9morgnqpx370	cml4ixxoc0001gpi1byhcm6bf	간지추가	0.00	f	0	cmljexe24001bilhatxlg1neu
\.


ALTER TABLE public.product_finishings ENABLE TRIGGER ALL;

--
-- Data for Name: product_foils; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.product_foils DISABLE TRIGGER ALL;

COPY public.product_foils (id, "productId", name, color, price, "isDefault", "sortOrder") FROM stdin;
\.


ALTER TABLE public.product_foils ENABLE TRIGGER ALL;

--
-- Data for Name: product_half_products; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.product_half_products DISABLE TRIGGER ALL;

COPY public.product_half_products (id, "productId", "halfProductId", "isRequired", "sortOrder") FROM stdin;
\.


ALTER TABLE public.product_half_products ENABLE TRIGGER ALL;

--
-- Data for Name: product_papers; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.product_papers DISABLE TRIGGER ALL;

COPY public.product_papers (id, "productId", name, type, price, "isDefault", "sortOrder", grammage, "printMethod", "frontCoating", grade, "isActive", "paperId", "isActive4", "isActive6") FROM stdin;
cmls6r1y6003j8frqcwvwqolj	cmkse0z6y001p86l2dop9h1kg	스노우 180g	normal	0.00	f	0	180	indigo	\N	\N	t	cmko0dy6g000fv6kuem61w1s2	t	t
cmls6r1y6003k8frq5fn831dd	cmkse0z6y001p86l2dop9h1kg	스노우 250g	normal	0.00	f	1	250	indigo	\N	\N	t	cmk6bw3930004w4rgfz1xi87r	t	t
cmls6r1y6003l8frqpbbbgxit	cmkse0z6y001p86l2dop9h1kg	스노우 300g	normal	0.00	f	2	300	indigo	\N	\N	t	cmkxo1gbq000812fcd0o1p2fa	t	t
cmls6r1y6003m8frqptkyl5ja	cmkse0z6y001p86l2dop9h1kg	아트지 180g	normal	0.00	f	3	180	indigo	\N	\N	t	cmk6bx7xd0006w4rgt2s54dqp	t	t
cmls6r1y6003n8frqz7zumsqh	cmkse0z6y001p86l2dop9h1kg	아티젠 210g	normal	0.00	t	4	210	indigo	\N	\N	t	cmk6bnlsk0002w4rgwhc1y6dw	t	t
cmls6r1y6003o8frqft2cgoh0	cmkse0z6y001p86l2dop9h1kg	아티젠 230g	normal	0.00	f	5	230	indigo	\N	\N	t	cmk6c19320008w4rgtgxtmtlc	t	t
cmls6r1y6003p8frqvf3qrbew	cmkse0z6y001p86l2dop9h1kg	싸틴 240g	roll	0.00	f	6	240	inkjet	\N	\N	f	cmk6cl3kp0004oeub4w4fpghp	t	t
cmls6r1y6003q8frqvyt6xosf	cmkse0z6y001p86l2dop9h1kg	캔버스 240g	roll	0.00	f	7	240	inkjet	\N	\N	t	cmko0b90d000dv6kucf3istj1	t	t
cmls6r1y6003r8frqqakoqn1l	cmkse0z6y001p86l2dop9h1kg	프리미엄메트 240g	roll	0.00	f	8	240	inkjet	\N	\N	t	cmk6cj27s0001oeub8ot2p5wq	t	t
cmlrff54h00149mor5dulylak	cml4ixxoc0001gpi1byhcm6bf	스노우 180g	normal	0.00	f	4	180	indigo	\N	\N	t	cmko0dy6g000fv6kuem61w1s2	t	t
cmlrff54h00159mor0mgwvfk9	cml4ixxoc0001gpi1byhcm6bf	스노우 250g	normal	0.00	f	5	250	indigo	\N	\N	t	cmk6bw3930004w4rgfz1xi87r	t	t
cmlrff54h00169mor3u7iv8ki	cml4ixxoc0001gpi1byhcm6bf	스노우 300g	normal	0.00	f	6	300	indigo	\N	\N	t	cmkxo1gbq000812fcd0o1p2fa	t	t
cmlrff54h00179mor4bhn4hf4	cml4ixxoc0001gpi1byhcm6bf	아트지 180g	normal	0.00	f	7	180	indigo	\N	\N	t	cmk6bx7xd0006w4rgt2s54dqp	t	t
cmlrff54h00189morzx911d0x	cml4ixxoc0001gpi1byhcm6bf	아티젠 210g	normal	0.00	f	8	210	indigo	\N	\N	t	cmk6bnlsk0002w4rgwhc1y6dw	t	t
cmlrff54h00199morzmiwn3p7	cml4ixxoc0001gpi1byhcm6bf	아티젠 230g	normal	0.00	t	9	230	indigo	\N	\N	t	cmk6c19320008w4rgtgxtmtlc	t	t
\.


ALTER TABLE public.product_papers ENABLE TRIGGER ALL;

--
-- Data for Name: public_copper_plates; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.public_copper_plates DISABLE TRIGGER ALL;

COPY public.public_copper_plates (id, "plateName", "plateCode", "plateType", "widthMm", "heightMm", "storageLocation", "imageUrl", "aiFileUrl", "designFileUrl", description, "defaultEngravingText", status, "sortOrder", "usageCount", "createdAt", "updatedAt") FROM stdin;
cml4txzf5000ctwyifn4fsxej	With you Always.	PCP0006	copper	80.00	10.00	A동1열 4	\N	\N	\N	\N	With you Always.	active	0	0	2026-02-02 07:09:58.289	2026-02-02 07:39:41.422
cml4tx4hl000btwyi3gz2fnv4	감사합니다.	PCP0005	copper	50.00	10.00	A동1열 3	\N	\N	\N	\N	감사합니다.	active	0	0	2026-02-02 07:09:18.201	2026-02-02 07:39:46.008
cml4twwlb000atwyikg54x5n8	사랑합니다.	PCP0004	copper	50.00	10.00	B동1열 5	\N	\N	\N	\N	사랑합니다.	active	0	0	2026-02-02 07:09:07.967	2026-02-02 07:39:50.572
cml4twnhc0009twyiuumakqvg	좋은 날	PCP0003	copper	50.00	13.00	B동1열 4	\N	\N	\N	\N	좋은 날	active	0	0	2026-02-02 07:08:56.16	2026-02-02 07:40:19.614
cml4tvze10008twyi6pvmd78t	The best Day ever.	PCP0002	copper	80.00	8.00	\N	\N	\N	\N	\N	The best Day ever.	active	0	0	2026-02-02 07:08:24.937	2026-02-06 00:21:32.717
cml4tv3cu0007twyioalq07ra	LOVE Memories.	PCP0001	copper	70.00	38.00	\N	\N	\N	\N	\N	LOVE Memories.	active	0	0	2026-02-02 07:07:43.422	2026-02-06 00:22:10.16
cmla56fyf00006isg9u8icbam	Portrait	PCP0007	copper	80.00	20.00	\N	\N	\N	\N	Portrait	Portrait	active	0	0	2026-02-06 00:23:19.623	2026-02-06 00:23:19.623
\.


ALTER TABLE public.public_copper_plates ENABLE TRIGGER ALL;

--
-- Data for Name: product_public_copper_plates; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.product_public_copper_plates DISABLE TRIGGER ALL;

COPY public.product_public_copper_plates (id, "productId", "publicCopperPlateId", "engravingText", "isDefault", "sortOrder", "createdAt", "updatedAt") FROM stdin;
cml69fhrt0013ytkanwnlz03n	cml4ixxoc0001gpi1byhcm6bf	cml4twnhc0009twyiuumakqvg	좋은 날	f	0	2026-02-03 07:11:15.642	2026-02-06 00:27:35.393
cml69fhrx0015ytka6i9dz0xm	cml4ixxoc0001gpi1byhcm6bf	cml4tvze10008twyi6pvmd78t		f	0	2026-02-03 07:11:15.645	2026-02-06 00:27:35.401
cml69fhs00017ytka12vpxw3i	cml4ixxoc0001gpi1byhcm6bf	cml4tv3cu0007twyioalq07ra		f	0	2026-02-03 07:11:15.648	2026-02-06 00:27:35.404
cml69fhlb000xytkaah2ljts7	cml4ixxoc0001gpi1byhcm6bf	cml4txzf5000ctwyifn4fsxej	With you Always.	f	0	2026-02-03 07:11:15.407	2026-02-06 00:27:35.308
cml69fho3000zytkaq5v0vmvk	cml4ixxoc0001gpi1byhcm6bf	cml4tx4hl000btwyi3gz2fnv4	감사합니다.	f	0	2026-02-03 07:11:15.508	2026-02-06 00:27:35.382
cml69fhrm0011ytkabgkfspgu	cml4ixxoc0001gpi1byhcm6bf	cml4twwlb000atwyikg54x5n8	사랑합니다.	f	0	2026-02-03 07:11:15.634	2026-02-06 00:27:35.388
\.


ALTER TABLE public.product_public_copper_plates ENABLE TRIGGER ALL;

--
-- Data for Name: specifications; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.specifications DISABLE TRIGGER ALL;

COPY public.specifications (id, code, name, "widthInch", "heightInch", "widthMm", "heightMm", orientation, "pairId", "forIndigo", "forInkjet", "forAlbum", "forFrame", "forBooklet", "squareMeters", description, nup, "nupSqInch", "sortOrder", "isActive", "createdAt", "updatedAt", "jdfBleedBottom", "jdfBleedLeft", "jdfBleedRight", "jdfBleedTop", "jdfFinishedHeight", "jdfFinishedWidth", "jdfNumberUpX", "jdfNumberUpY", "jdfPageOrder", "jdfSides", "jdfSpreadType", "jdfTrimHeight", "jdfTrimWidth", "forIndigoAlbum") FROM stdin;
cmk6fvjw00007hxtsirwx4s8m	SPEC_MK6FVJVZ12W0D1	11x16	11.0000	16.0000	279.40	406.40	portrait	cmk6fvjvy0006hxtspj3i6nks	t	t	t	t	f	0.11		1+up	176.00	1	t	2026-01-09 05:32:00.24	2026-01-12 07:45:59.768	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6fcj4f00054b63m430jdn4	SPEC_MK6FCJ4EF2N8O8	24x16	24.0000	16.0000	609.60	406.40	landscape	cmk6fcj4d00044b63ydvo3m99	f	t	f	t	f	0.25		\N	\N	1	t	2026-01-09 05:17:12.784	2026-01-09 05:33:19.728	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6fcj4d00044b63ydvo3m99	SPEC_MK6FCJ4BXJTVMZ	16x24	16.0000	24.0000	406.40	609.60	portrait	cmk6fcj4f00054b63m430jdn4	f	t	f	t	f	0.25		\N	\N	0	t	2026-01-09 05:17:12.781	2026-01-09 05:33:19.73	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6fbng600014b63lbz4hbql	SPEC_MK6FBNG5WIDIH0	8x6	8.0000	6.0000	203.20	152.40	landscape	cmk6fbng100004b63c70xzv5a	t	t	t	t	f	0.03		4up	48.00	1	t	2026-01-09 05:16:31.734	2026-01-12 07:44:48.313	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6fkx5l000f4b63teec2nro	SPEC_MK6FKX5LUBY7RW	15x11	15.0000	11.0000	381.00	279.40	landscape	cmk6fkx5j000e4b639whx3sxx	t	t	t	t	f	0.11		1+up	165.00	1	t	2026-01-09 05:23:44.218	2026-01-12 07:45:47.5	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6fvjvy0006hxtspj3i6nks	SPEC_MK6FVJVXP5WNUD	16x11	16.0000	11.0000	406.40	279.40	landscape	cmk6fvjw00007hxtsirwx4s8m	t	t	t	t	f	0.11		1+up	176.00	0	t	2026-01-09 05:32:00.238	2026-01-12 07:45:52.61	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6fu8av0005hxtsrjafllf0	SPEC_MK6FU8AT4M5TUL	8x8	8.0000	8.0000	203.20	203.20	square	\N	t	t	t	t	f	0.04		2up	64.00	0	t	2026-01-09 05:30:58.566	2026-01-12 07:44:53.769	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6f88vu000ao43x13j2f12j	SPEC_MK6F88VUH376T4	A4_가로	11.6929	8.2677	297.00	210.00	landscape	cmk6f88vs0009o43x378tye2v	t	t	t	t	t	0.06		2up	96.67	1	t	2026-01-09 05:13:52.891	2026-01-12 07:32:37.753	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6ftqqu0004hxtskccmbx2s	SPEC_MK6FTQQTU54J9M	10x10	10.0000	10.0000	254.00	254.00	square	\N	t	t	t	t	f	0.06		1up	100.00	0	t	2026-01-09 05:30:35.814	2026-01-12 07:40:28.911	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6fd3th00074b63i1ouhou9	SPEC_MK6FD3TH5DSNGX	24x20	24.0000	20.0000	609.60	508.00	landscape	cmk6fd3tf00064b63chde9ajf	f	t	f	t	f	0.31		\N	\N	1	t	2026-01-09 05:17:39.606	2026-01-09 05:33:19.747	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6fd3tf00064b63chde9ajf	SPEC_MK6FD3TEQ9EDYT	20x24	20.0000	24.0000	508.00	609.60	portrait	cmk6fd3th00074b63i1ouhou9	f	t	f	t	f	0.31		\N	\N	0	t	2026-01-09 05:17:39.603	2026-01-09 05:33:19.748	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6fdf7600094b63ff6454lx	SPEC_MK6FDF75KBIE79	20x16	20.0000	16.0000	508.00	406.40	landscape	cmk6fdf7400084b63698iy8j5	f	t	f	t	f	0.21		\N	\N	1	t	2026-01-09 05:17:54.354	2026-01-09 05:33:19.749	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6fdf7400084b63698iy8j5	SPEC_MK6FDF7348VQZ2	16x20	16.0000	20.0000	406.40	508.00	portrait	cmk6fdf7600094b63ff6454lx	f	t	f	t	f	0.21		\N	\N	0	t	2026-01-09 05:17:54.352	2026-01-09 05:33:19.751	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6feqsy000b4b63vxejnfur	SPEC_MK6FEQSXSZ9UIL	30x20	30.0000	20.0000	762.00	508.00	landscape	cmk6feqsv000a4b631dxzz34w	f	t	f	t	f	0.39		\N	\N	1	t	2026-01-09 05:18:56.05	2026-01-09 05:33:19.752	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6feqsv000a4b631dxzz34w	SPEC_MK6FEQSTYH8RNN	20x30	20.0000	30.0000	508.00	762.00	portrait	cmk6feqsy000b4b63vxejnfur	f	t	f	t	f	0.39		\N	\N	0	t	2026-01-09 05:18:56.047	2026-01-09 05:33:19.753	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmkavvbot0001ft7l6yfnze23	SPEC_MKAVVBORIUX0R8	14x16	14.0000	16.0000	355.60	406.40	portrait	cmkavvboy0002ft7lsl0ipbee	f	t	t	f	f	0.14		1++up	224.00	0	t	2026-01-12 08:10:48.172	2026-01-12 08:10:48.181	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6gcadu0001v9w2k7ogf6zt	SPEC_MK6GCADTMH5YQE	32x24	32.0000	24.0000	812.80	609.60	landscape	cmk6gcadq0000v9w22gdjvtj0	f	t	f	t	f	0.50		\N	\N	1	t	2026-01-09 05:45:01.074	2026-01-09 05:45:01.074	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6gcadq0000v9w22gdjvtj0	SPEC_MK6GCADO326N1W	24x32	24.0000	32.0000	609.60	812.80	portrait	cmk6gcadu0001v9w2k7ogf6zt	f	t	f	t	f	0.50		\N	\N	0	t	2026-01-09 05:45:01.07	2026-01-09 05:45:01.077	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6gcljl0003v9w2qe2j0lo1	SPEC_MK6GCLJL6WQKQP	44x32	44.0000	32.0000	1117.60	812.80	landscape	cmk6gcljh0002v9w2h60pr8xa	f	t	f	t	f	0.91		\N	\N	1	t	2026-01-09 05:45:15.537	2026-01-09 05:45:15.537	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6gcljh0002v9w2h60pr8xa	SPEC_MK6GCLJHF57VJD	32x44	32.0000	44.0000	812.80	1117.60	portrait	cmk6gcljl0003v9w2qe2j0lo1	f	t	f	t	f	0.91		\N	\N	0	t	2026-01-09 05:45:15.534	2026-01-09 05:45:15.542	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmkauuj580000620v7qprf1fa	SPEC_MKAUUJ4V92NY1W	12x15	12.0000	15.0000	304.80	381.00	portrait	cmkauuj5e0001620vtvan1277	t	t	t	f	f	0.12		1+up	180.00	0	t	2026-01-12 07:42:11.553	2026-01-12 07:42:11.573	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6f3ym20006o43xdewhcbes	SPEC_MK6F3YM0BJ67WT	8x10	8.0000	10.0000	203.20	254.00	portrait	cmk6f3ym40007o43x4w1i7igj	t	t	t	t	f	0.05		2up	80.00	0	t	2026-01-09 05:10:32.953	2026-01-12 07:45:00.153	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6f3ym40007o43x4w1i7igj	SPEC_MK6F3YM4S5MXSK	10x8	10.0000	8.0000	254.00	203.20	landscape	cmk6f3ym20006o43xdewhcbes	t	t	t	t	f	0.05		2up	80.00	1	t	2026-01-09 05:10:32.957	2026-01-12 07:45:10.019	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6f27np0004o43xbl1qfr5n	SPEC_MK6F27NNC0LTDT	5x7	5.0000	7.0000	127.00	177.80	portrait	cmk6f27nr0005o43xwyhm7een	t	t	t	t	f	0.02		4up	35.00	1	t	2026-01-09 05:09:11.364	2026-01-12 07:44:33.649	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6f88vs0009o43x378tye2v	SPEC_MK6F88VRR1BBT9	A4_세로	8.2677	11.6929	210.00	297.00	portrait	cmk6f88vu000ao43x13j2f12j	t	t	t	t	t	0.06		2up	96.67	0	t	2026-01-09 05:13:52.888	2026-01-12 07:45:16.598	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6f6ndh0008o43xcv3mdzu1	SPEC_MK6F6NDGHIGTYA	11x11	11.0000	11.0000	279.40	279.40	square	\N	t	t	t	t	f	0.08		1up	121.00	0	t	2026-01-09 05:12:38.357	2026-01-12 07:45:22.964	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6f27nr0005o43xwyhm7een	SPEC_MK6F27NR73M7YI	7x5	7.0000	5.0000	177.80	127.00	landscape	cmk6f27np0004o43xbl1qfr5n	t	t	t	t	f	0.02		4up	35.00	2	t	2026-01-09 05:09:11.368	2026-01-12 07:44:37.955	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6fbng100004b63c70xzv5a	SPEC_MK6FBNFZRK6CZQ	6x8	6.0000	8.0000	152.40	203.20	portrait	cmk6fbng600014b63lbz4hbql	t	t	t	t	f	0.03		4up	48.00	0	t	2026-01-09 05:16:31.728	2026-01-12 07:44:43.781	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6fjyhq000d4b63ltsp5xkp	SPEC_MK6FJYHPQ1PHAJ	11x14	11.0000	14.0000	279.40	355.60	portrait	cmk6fjyhm000c4b631modt98m	t	t	t	t	f	0.10		1+up	154.00	1	t	2026-01-09 05:22:59.295	2026-01-30 02:53:51.8	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6fc2o500024b63vwcm68cp	SPEC_MK6FC2O4OM6S9X	4x6	4.0000	6.0000	101.60	152.40	portrait	cmk6fc2od00034b63mc8vtlep	t	t	f	t	f	0.02		8up	24.00	3	t	2026-01-09 05:16:51.461	2026-01-27 00:37:27.59	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmko09lk5000bv6kuzlu1kxro	SPEC_MKO09LK4F53K2K	10x13	10.0000	13.0000	254.00	330.20	portrait	cmko09ljq000av6kuaenx18dg	t	t	t	f	f	0.08		1up	130.00	1	t	2026-01-21 12:34:52.902	2026-02-12 13:35:18.961	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmkavvboy0002ft7lsl0ipbee	SPEC_MKAVVBOX69ZPKD	16x14	16.0000	14.0000	406.40	355.60	landscape	cmkavvbot0001ft7l6yfnze23	f	t	t	f	f	0.14		1++up	224.00	1	t	2026-01-12 08:10:48.178	2026-01-30 03:03:46.327	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6fkx5j000e4b639whx3sxx	SPEC_MK6FKX5HD6YFRE	11x15	11.0000	15.0000	279.40	381.00	portrait	cmk6fkx5l000f4b63teec2nro	t	t	t	t	f	0.11		1+up	165.00	0	t	2026-01-09 05:23:44.214	2026-02-06 08:56:35.643	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmkavuol30000ft7ltr5dldbf	SPEC_MKAVUOL0J6QT17	14x14	14.0000	14.0000	355.60	355.60	square	\N	f	t	t	t	f	0.13		1+up	196.00	0	t	2026-01-12 08:10:18.231	2026-01-30 02:54:04.797	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6fc2od00034b63mc8vtlep	SPEC_MK6FC2OCUJ3BVZ	6x4	6.0000	4.0000	152.40	101.60	landscape	cmk6fc2o500024b63vwcm68cp	t	t	f	t	f	0.02		8up	24.00	2	t	2026-01-09 05:16:51.469	2026-02-02 01:58:38.713	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmk6fjyhm000c4b631modt98m	SPEC_MK6FJYHLDM7V1D	14x11	14.0000	11.0000	355.60	279.40	landscape	cmk6fjyhq000d4b63ltsp5xkp	t	t	t	t	f	0.10		1+up	154.00	0	t	2026-01-09 05:22:59.29	2026-01-30 02:53:45.378	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmland10m0001cu7jnb6vyatl	SPEC_MLAND10MG3Z1OC	8.6x11	8.6000	11.0000	218.44	279.40	portrait	cmland10h0000cu7jsz5fegj7	t	t	t	f	f	0.06		2up	94.60	1	t	2026-02-06 08:52:19.943	2026-02-06 08:52:19.943	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmland10h0000cu7jsz5fegj7	SPEC_MLAND10FE09W3M	11x8.6	11.0000	8.6000	279.40	218.44	landscape	cmland10m0001cu7jnb6vyatl	t	t	t	f	f	0.06		2up	94.60	0	t	2026-02-06 08:52:19.937	2026-02-06 08:52:19.944	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmkauuj5e0001620vtvan1277	SPEC_MKAUUJ5DG0FVKR	15x12	15.0000	12.0000	381.00	304.80	landscape	cmkauuj580000620v7qprf1fa	t	t	t	f	f	0.12		1+up	180.00	1	t	2026-01-12 07:42:11.571	2026-02-06 08:56:20.953	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmlano75d0003cu7jqhfnx28g	SPEC_MLANO75C9BVG9S	5.5x7	5.5000	7.0000	139.70	177.80	portrait	cmlano75a0002cu7jcukqxdr3	t	t	t	f	f	0.02		4up	38.50	1	t	2026-02-06 09:01:01.106	2026-02-06 09:01:01.106	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmlano75a0002cu7jcukqxdr3	SPEC_MLANO759N77T7A	7x5.5	7.0000	5.5000	177.80	139.70	landscape	cmlano75d0003cu7jqhfnx28g	t	t	t	f	f	0.02		4up	38.50	0	t	2026-02-06 09:01:01.103	2026-02-06 09:01:01.108	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmlc1iepk00015uyj6d6vgqv4	SPEC_MLC1IEPJ9TETZN	7.5x5.5	7.5000	5.5000	190.50	139.70	landscape	cmlc1ieph00005uyjvsm75p5u	t	t	t	f	f	0.03		4up	41.25	1	t	2026-02-07 08:16:11.768	2026-02-07 08:16:11.768	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmlc1ieph00005uyjvsm75p5u	SPEC_MLC1IEPFDLEUYC	5.5x7.5	5.5000	7.5000	139.70	190.50	portrait	cmlc1iepk00015uyj6d6vgqv4	t	t	t	f	f	0.03		4up	41.25	0	t	2026-02-07 08:16:11.765	2026-02-07 08:16:11.77	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmlc1n6ot00035uyjdkg93ecp	SPEC_MLC1N6OSQXHC1W	8x11	8.0000	11.0000	203.20	279.40	portrait	cmlc1n6oq00025uyjdrjg49nv	t	t	t	f	f	0.06		2up	88.00	1	t	2026-02-07 08:19:54.654	2026-02-07 08:19:54.654	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmlc1n6oq00025uyjdrjg49nv	SPEC_MLC1N6OPBHQYH9	11x8	11.0000	8.0000	279.40	203.20	landscape	cmlc1n6ot00035uyjdkg93ecp	t	t	t	f	f	0.06		2up	88.00	0	t	2026-02-07 08:19:54.65	2026-02-07 08:19:54.655	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmlc1nkms00055uyjtzywxm6a	SPEC_MLC1NKMRV3H87X	8.25x11	8.2500	11.0000	209.55	279.40	portrait	cmlc1nkmq00045uyjmizci262	t	t	t	f	f	0.06		2up	90.75	1	t	2026-02-07 08:20:12.724	2026-02-07 08:20:12.724	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmlc1nkmq00045uyjmizci262	SPEC_MLC1NKMPDBKQ5A	11x8.25	11.0000	8.2500	279.40	209.55	landscape	cmlc1nkms00055uyjtzywxm6a	t	t	t	f	f	0.06		2up	90.75	0	t	2026-02-07 08:20:12.722	2026-02-07 08:20:12.725	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmlca47kl0001u57ppuopynoj	SPEC_MLCA47KKQUHMU3	7.5x6	7.5000	6.0000	190.50	152.40	landscape	cmlca47k40000u57psb1m18kw	t	t	t	f	f	0.03		4up	45.00	1	t	2026-02-07 12:17:05.877	2026-02-07 12:17:05.877	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmlca47k40000u57psb1m18kw	SPEC_MLCA47JZGX1E1E	6x7.5	6.0000	7.5000	152.40	190.50	portrait	cmlca47kl0001u57ppuopynoj	t	t	t	f	f	0.03		4up	45.00	0	t	2026-02-07 12:17:05.859	2026-02-07 12:17:05.881	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmko09ljq000av6kuaenx18dg	SPEC_MKO09LJOYZGE2R	13x10	13.0000	10.0000	330.20	254.00	landscape	cmko09lk5000bv6kuzlu1kxro	t	t	t	f	f	0.08		1up	130.00	0	t	2026-01-21 12:34:52.886	2026-02-12 13:35:10.94	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmlmi10980003i4rndxc89c0p	SPEC_MLMI109623LRPR	12x9	12.0000	9.0000	304.80	228.60	landscape	cmlmi108x0002i4rnfdfb8wgt	t	t	t	f	f	0.07		1up	108.00	1	t	2026-02-14 15:56:15.116	2026-02-14 15:56:15.116	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
cmlmi108x0002i4rnfdfb8wgt	SPEC_MLMI108TLMLH1B	9x12	9.0000	12.0000	228.60	304.80	portrait	cmlmi10980003i4rndxc89c0p	t	t	t	f	f	0.07		1up	108.00	0	t	2026-02-14 15:56:15.105	2026-02-14 15:56:15.12	3.00	3.00	3.00	3.00	\N	\N	1	1	Booklet	TwoSidedHeadToHead	Single	\N	\N	f
\.


ALTER TABLE public.specifications ENABLE TRIGGER ALL;

--
-- Data for Name: product_specifications; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.product_specifications DISABLE TRIGGER ALL;

COPY public.product_specifications (id, "productId", name, "widthMm", "heightMm", price, "isDefault", "sortOrder", "specificationId") FROM stdin;
cmls6r1y500218frq31jq4s2u	cmkse0z6y001p86l2dop9h1kg	6x8	152.4	203.2	0.00	t	0	cmk6fbng100004b63c70xzv5a
cmls6r1y500228frq6lf9xopt	cmkse0z6y001p86l2dop9h1kg	8x6	203.2	152.4	0.00	f	1	cmk6fbng600014b63lbz4hbql
cmls6r1y500238frqi5yfct8p	cmkse0z6y001p86l2dop9h1kg	8x8	203.2	203.2	0.00	f	2	cmk6fu8av0005hxtsrjafllf0
cmls6r1y500248frq97ajte90	cmkse0z6y001p86l2dop9h1kg	8x10	203.2	254	0.00	f	3	cmk6f3ym20006o43xdewhcbes
cmls6r1y500258frqncbczwls	cmkse0z6y001p86l2dop9h1kg	10x8	254	203.2	0.00	f	4	cmk6f3ym40007o43x4w1i7igj
cmls6r1y500268frqk81bi15e	cmkse0z6y001p86l2dop9h1kg	A4_세로	210	297	0.00	f	5	cmk6f88vs0009o43x378tye2v
cmls6r1y500278frqg9j14pul	cmkse0z6y001p86l2dop9h1kg	A4_가로	297	210	0.00	f	6	cmk6f88vu000ao43x13j2f12j
cmls6r1y500288frq598rr828	cmkse0z6y001p86l2dop9h1kg	10x10	254	254	0.00	f	7	cmk6ftqqu0004hxtskccmbx2s
cmls6r1y500298frqfifbv01b	cmkse0z6y001p86l2dop9h1kg	11x11	279.4	279.4	0.00	f	8	cmk6f6ndh0008o43xcv3mdzu1
cmls6r1y5002a8frq8foyycvt	cmkse0z6y001p86l2dop9h1kg	13x10	330.2	254	0.00	f	9	cmko09ljq000av6kuaenx18dg
cmls6r1y5002b8frq5cjmumrf	cmkse0z6y001p86l2dop9h1kg	10x13	254	330.2	0.00	f	10	cmko09lk5000bv6kuzlu1kxro
cmls6r1y5002c8frqoehpf081	cmkse0z6y001p86l2dop9h1kg	14x11	355.6	279.4	0.00	f	11	cmk6fjyhm000c4b631modt98m
cmls6r1y5002d8frqi64bxmxp	cmkse0z6y001p86l2dop9h1kg	11x14	279.4	355.6	0.00	f	12	cmk6fjyhq000d4b63ltsp5xkp
cmls6r1y5002e8frqgxa0z2bn	cmkse0z6y001p86l2dop9h1kg	11x15	279.4	381	0.00	f	13	cmk6fkx5j000e4b639whx3sxx
cmls6r1y5002f8frqtqdazn2u	cmkse0z6y001p86l2dop9h1kg	15x11	381	279.4	0.00	f	14	cmk6fkx5l000f4b63teec2nro
cmls6r1y5002g8frq2ytzzlnv	cmkse0z6y001p86l2dop9h1kg	16x11	406.4	279.4	0.00	f	15	cmk6fvjvy0006hxtspj3i6nks
cmls6r1y5002h8frqr5i7ezbt	cmkse0z6y001p86l2dop9h1kg	11x16	279.4	406.4	0.00	f	16	cmk6fvjw00007hxtsirwx4s8m
cmls6r1y5002i8frq7e08ww95	cmkse0z6y001p86l2dop9h1kg	12x15	304.8	381	0.00	f	17	cmkauuj580000620v7qprf1fa
cmls6r1y5002j8frqpijk6o86	cmkse0z6y001p86l2dop9h1kg	15x12	381	304.8	0.00	f	18	cmkauuj5e0001620vtvan1277
cmls6r1y5002k8frqrk7gr2gs	cmkse0z6y001p86l2dop9h1kg	5x7	127	177.8	0.00	f	19	cmk6f27np0004o43xbl1qfr5n
cmls6r1y5002l8frq0h4pru47	cmkse0z6y001p86l2dop9h1kg	7x5	177.8	127	0.00	f	20	cmk6f27nr0005o43xwyhm7een
cmls6r1y5002m8frqu78r052s	cmkse0z6y001p86l2dop9h1kg	7x5.5	177.8	139.7	0.00	f	21	cmlano75a0002cu7jcukqxdr3
cmls6r1y5002n8frq25hf7ess	cmkse0z6y001p86l2dop9h1kg	5.5x7	139.7	177.8	0.00	f	22	cmlano75d0003cu7jqhfnx28g
cmls6r1y5002o8frqg5c780wj	cmkse0z6y001p86l2dop9h1kg	5.5x7.5	139.7	190.5	0.00	f	23	cmlc1ieph00005uyjvsm75p5u
cmls6r1y5002p8frqlzcyqb8s	cmkse0z6y001p86l2dop9h1kg	7.5x5.5	190.5	139.7	0.00	f	24	cmlc1iepk00015uyj6d6vgqv4
cmls6r1y5002q8frqct67uuih	cmkse0z6y001p86l2dop9h1kg	6x7.5	152.4	190.5	0.00	f	25	cmlca47k40000u57psb1m18kw
cmls6r1y5002r8frqypothzp0	cmkse0z6y001p86l2dop9h1kg	7.5x6	190.5	152.4	0.00	f	26	cmlca47kl0001u57ppuopynoj
cmls6r1y5002s8frqxg04olmm	cmkse0z6y001p86l2dop9h1kg	11x8	279.4	203.2	0.00	f	27	cmlc1n6oq00025uyjdrjg49nv
cmls6r1y5002t8frq6hgad33w	cmkse0z6y001p86l2dop9h1kg	8x11	203.2	279.4	0.00	f	28	cmlc1n6ot00035uyjdkg93ecp
cmls6r1y5002u8frqrx1kb2og	cmkse0z6y001p86l2dop9h1kg	11x8.25	279.4	209.55	0.00	f	29	cmlc1nkmq00045uyjmizci262
cmls6r1y5002v8frqp1t7umdi	cmkse0z6y001p86l2dop9h1kg	8.25x11	209.55	279.4	0.00	f	30	cmlc1nkms00055uyjtzywxm6a
cmls6r1y5002w8frq0gdpalxd	cmkse0z6y001p86l2dop9h1kg	11x8.6	279.4	218.44	0.00	f	31	cmland10h0000cu7jsz5fegj7
cmls6r1y5002x8frqfkk7rmm2	cmkse0z6y001p86l2dop9h1kg	8.6x11	218.44	279.4	0.00	f	32	cmland10m0001cu7jnb6vyatl
cmls6r1y5002y8frq5lka7gez	cmkse0z6y001p86l2dop9h1kg	9x12	228.6	304.8	0.00	f	33	cmlmi108x0002i4rnfdfb8wgt
cmls6r1y5002z8frqznkpb9pc	cmkse0z6y001p86l2dop9h1kg	12x9	304.8	228.6	0.00	f	34	cmlmi10980003i4rndxc89c0p
cmls6r1y500308frqqegb6hv3	cmkse0z6y001p86l2dop9h1kg	14x14	355.6	355.6	0.00	f	35	cmkavuol30000ft7ltr5dldbf
cmls6r1y500318frqng7dkeuf	cmkse0z6y001p86l2dop9h1kg	14x16	355.6	406.4	0.00	f	36	cmkavvbot0001ft7l6yfnze23
cmls6r1y500328frq0xnd1kue	cmkse0z6y001p86l2dop9h1kg	16x14	406.4	355.6	0.00	f	37	cmkavvboy0002ft7lsl0ipbee
cmls6r1y500338frqnd6slf24	cmkse0z6y001p86l2dop9h1kg	6x4	152.4	101.6	0.00	f	38	cmk6fc2od00034b63mc8vtlep
cmls6r1y500348frqz6f9gu3i	cmkse0z6y001p86l2dop9h1kg	4x6	101.6	152.4	0.00	f	39	cmk6fc2o500024b63vwcm68cp
cmls6r1y500358frq5j3d03d1	cmkse0z6y001p86l2dop9h1kg	16x20	406.4	508	0.00	f	40	cmk6fdf7400084b63698iy8j5
cmls6r1y500368frq4z69nn73	cmkse0z6y001p86l2dop9h1kg	16x24	406.4	609.6	0.00	f	41	cmk6fcj4d00044b63ydvo3m99
cmls6r1y500378frqa067sdbk	cmkse0z6y001p86l2dop9h1kg	20x24	508	609.6	0.00	f	42	cmk6fd3tf00064b63chde9ajf
cmls6r1y500388frquwi2lohu	cmkse0z6y001p86l2dop9h1kg	20x30	508	762	0.00	f	43	cmk6feqsv000a4b631dxzz34w
cmls6r1y500398frqi78bwqz3	cmkse0z6y001p86l2dop9h1kg	24x32	609.6	812.8	0.00	f	44	cmk6gcadq0000v9w22gdjvtj0
cmls6r1y5003a8frqs283hsii	cmkse0z6y001p86l2dop9h1kg	32x44	812.8	1117.6	0.00	f	45	cmk6gcljh0002v9w2h60pr8xa
cmls6r1y5003b8frqulmxuawc	cmkse0z6y001p86l2dop9h1kg	20x16	508	406.4	0.00	f	46	cmk6fdf7600094b63ff6454lx
cmls6r1y5003c8frqfzzjrin4	cmkse0z6y001p86l2dop9h1kg	24x16	609.6	406.4	0.00	f	47	cmk6fcj4f00054b63m430jdn4
cmls6r1y5003d8frq5hmfhgde	cmkse0z6y001p86l2dop9h1kg	24x20	609.6	508	0.00	f	48	cmk6fd3th00074b63i1ouhou9
cmls6r1y5003e8frqbm2mx4cj	cmkse0z6y001p86l2dop9h1kg	30x20	762	508	0.00	f	49	cmk6feqsy000b4b63vxejnfur
cmls6r1y6003f8frqs7hue3jk	cmkse0z6y001p86l2dop9h1kg	32x24	812.8	609.6	0.00	f	50	cmk6gcadu0001v9w2k7ogf6zt
cmls6r1y6003g8frq3o8bp1oo	cmkse0z6y001p86l2dop9h1kg	44x32	1117.6	812.8	0.00	f	51	cmk6gcljl0003v9w2qe2j0lo1
cmlrff54e00019mor09vtjlpb	cml4ixxoc0001gpi1byhcm6bf	6x4	152.4	101.6	0.00	t	0	cmk6fc2od00034b63mc8vtlep
cmlrff54e00029mor5bsc21su	cml4ixxoc0001gpi1byhcm6bf	4x6	101.6	152.4	0.00	f	1	cmk6fc2o500024b63vwcm68cp
cmlrff54e00039more33d9osr	cml4ixxoc0001gpi1byhcm6bf	5x7	127	177.8	0.00	f	2	cmk6f27np0004o43xbl1qfr5n
cmlrff54e00049mort7dt7b2p	cml4ixxoc0001gpi1byhcm6bf	7x5	177.8	127	0.00	f	3	cmk6f27nr0005o43xwyhm7een
cmlrff54e00059mor3ntlmctj	cml4ixxoc0001gpi1byhcm6bf	7x5.5	177.8	139.7	0.00	f	4	cmlano75a0002cu7jcukqxdr3
cmlrff54e00069mor48m6twmc	cml4ixxoc0001gpi1byhcm6bf	5.5x7	139.7	177.8	0.00	f	5	cmlano75d0003cu7jqhfnx28g
cmlrff54e00079mor7vuke8t3	cml4ixxoc0001gpi1byhcm6bf	5.5x7.5	139.7	190.5	0.00	f	6	cmlc1ieph00005uyjvsm75p5u
cmlrff54e00089mor1st6di9u	cml4ixxoc0001gpi1byhcm6bf	7.5x5.5	190.5	139.7	0.00	f	7	cmlc1iepk00015uyj6d6vgqv4
cmlrff54e00099mor6g3lqwjm	cml4ixxoc0001gpi1byhcm6bf	6x7.5	152.4	190.5	0.00	f	8	cmlca47k40000u57psb1m18kw
cmlrff54e000a9morqw34pz4m	cml4ixxoc0001gpi1byhcm6bf	7.5x6	190.5	152.4	0.00	f	9	cmlca47kl0001u57ppuopynoj
cmlrff54e000b9morcqqcys66	cml4ixxoc0001gpi1byhcm6bf	6x8	152.4	203.2	0.00	f	10	cmk6fbng100004b63c70xzv5a
cmlrff54e000c9moruiqpksy7	cml4ixxoc0001gpi1byhcm6bf	8x6	203.2	152.4	0.00	f	11	cmk6fbng600014b63lbz4hbql
cmlrff54e000d9mor0qw2nvfj	cml4ixxoc0001gpi1byhcm6bf	8x8	203.2	203.2	0.00	f	12	cmk6fu8av0005hxtsrjafllf0
cmlrff54e000e9mor262j8gsp	cml4ixxoc0001gpi1byhcm6bf	8x10	203.2	254	0.00	f	13	cmk6f3ym20006o43xdewhcbes
cmlrff54e000f9mor6ttnimkk	cml4ixxoc0001gpi1byhcm6bf	10x8	254	203.2	0.00	f	14	cmk6f3ym40007o43x4w1i7igj
cmlrff54f000g9morhrqf6qo2	cml4ixxoc0001gpi1byhcm6bf	11x8	279.4	203.2	0.00	f	15	cmlc1n6oq00025uyjdrjg49nv
cmlrff54f000h9morrni5f4i8	cml4ixxoc0001gpi1byhcm6bf	8x11	203.2	279.4	0.00	f	16	cmlc1n6ot00035uyjdkg93ecp
cmlrff54f000i9morc7660kgj	cml4ixxoc0001gpi1byhcm6bf	11x8.25	279.4	209.55	0.00	f	17	cmlc1nkmq00045uyjmizci262
cmlrff54f000j9morbbn5ym61	cml4ixxoc0001gpi1byhcm6bf	8.25x11	209.55	279.4	0.00	f	18	cmlc1nkms00055uyjtzywxm6a
cmlrff54f000k9morl8inw79y	cml4ixxoc0001gpi1byhcm6bf	11x8.6	279.4	218.44	0.00	f	19	cmland10h0000cu7jsz5fegj7
cmlrff54f000l9morkij87myq	cml4ixxoc0001gpi1byhcm6bf	8.6x11	218.44	279.4	0.00	f	20	cmland10m0001cu7jnb6vyatl
cmlrff54f000m9mordetyf605	cml4ixxoc0001gpi1byhcm6bf	A4_세로	210	297	0.00	f	21	cmk6f88vs0009o43x378tye2v
cmlrff54f000n9mor8h950ij3	cml4ixxoc0001gpi1byhcm6bf	A4_가로	297	210	0.00	f	22	cmk6f88vu000ao43x13j2f12j
cmlrff54f000o9morh0yhnphv	cml4ixxoc0001gpi1byhcm6bf	10x10	254	254	0.00	f	23	cmk6ftqqu0004hxtskccmbx2s
cmlrff54f000p9morw134gzqv	cml4ixxoc0001gpi1byhcm6bf	11x11	279.4	279.4	0.00	f	24	cmk6f6ndh0008o43xcv3mdzu1
cmlrff54f000q9morj259zhs0	cml4ixxoc0001gpi1byhcm6bf	13x10	330.2	254	0.00	f	25	cmko09ljq000av6kuaenx18dg
cmlrff54f000r9morry8jt16g	cml4ixxoc0001gpi1byhcm6bf	10x13	254	330.2	0.00	f	26	cmko09lk5000bv6kuzlu1kxro
cmlrff54f000s9mor7aqbwytk	cml4ixxoc0001gpi1byhcm6bf	14x11	355.6	279.4	0.00	f	27	cmk6fjyhm000c4b631modt98m
cmlrff54f000t9moroos81z42	cml4ixxoc0001gpi1byhcm6bf	11x14	279.4	355.6	0.00	f	28	cmk6fjyhq000d4b63ltsp5xkp
cmlrff54f000u9mor5mry2uvo	cml4ixxoc0001gpi1byhcm6bf	11x15	279.4	381	0.00	f	29	cmk6fkx5j000e4b639whx3sxx
cmlrff54f000v9mortwoh4g24	cml4ixxoc0001gpi1byhcm6bf	15x11	381	279.4	0.00	f	30	cmk6fkx5l000f4b63teec2nro
cmlrff54f000w9mormfdepmuz	cml4ixxoc0001gpi1byhcm6bf	16x11	406.4	279.4	0.00	f	31	cmk6fvjvy0006hxtspj3i6nks
cmlrff54f000x9morow1il5gp	cml4ixxoc0001gpi1byhcm6bf	11x16	279.4	406.4	0.00	f	32	cmk6fvjw00007hxtsirwx4s8m
cmlrff54f000y9mor7qilf98m	cml4ixxoc0001gpi1byhcm6bf	12x15	304.8	381	0.00	f	33	cmkauuj580000620v7qprf1fa
cmlrff54f000z9mor5qvt5re5	cml4ixxoc0001gpi1byhcm6bf	15x12	381	304.8	0.00	f	34	cmkauuj5e0001620vtvan1277
cmlrff54f00109morysexvt5v	cml4ixxoc0001gpi1byhcm6bf	9x12	228.6	304.8	0.00	f	35	cmlmi108x0002i4rnfdfb8wgt
cmlrff54f00119mor5h3fglq7	cml4ixxoc0001gpi1byhcm6bf	12x9	304.8	228.6	0.00	f	36	cmlmi10980003i4rndxc89c0p
\.


ALTER TABLE public.product_specifications ENABLE TRIGGER ALL;

--
-- Data for Name: production_setting_prices; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.production_setting_prices DISABLE TRIGGER ALL;

COPY public.production_setting_prices (id, "productionSettingId", "specificationId", "minQuantity", "maxQuantity", weight, price, "singleSidedPrice", "doubleSidedPrice", "fourColorSinglePrice", "fourColorDoublePrice", "sixColorSinglePrice", "sixColorDoublePrice", "basePages", "basePrice", "pricePerPage", "rangePrices", "createdAt", "updatedAt") FROM stdin;
cmljhzlfc004ukze05nqce3ip	cmljhzlf6004tkze07rhfz4he	\N	1	\N	1.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	\N	\N	\N	2026-02-12 13:31:50.712	2026-02-12 13:31:50.712
cmlji5626006ykze0vmcc9p5h	cmljhykjc002lkze0179w4gjs	cmk6fjyhm000c4b631modt98m	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	2000.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5626006zkze0hes8wokg	cmljhykjc002lkze0179w4gjs	cmk6fkx5j000e4b639whx3sxx	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	2000.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji56260070kze0nh6c4ia3	cmljhykjc002lkze0179w4gjs	cmk6fvjvy0006hxtspj3i6nks	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	2000.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji56260071kze0f5ya43tz	cmljhykjc002lkze0179w4gjs	cmkauuj580000620v7qprf1fa	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	2000.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji56260072kze084izyzwo	cmljhykjc002lkze0179w4gjs	cmk6fjyhq000d4b63ltsp5xkp	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	2000.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji56260073kze08o3kepvg	cmljhykjc002lkze0179w4gjs	cmk6fkx5l000f4b63teec2nro	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	2000.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji56260074kze0xlhkeziy	cmljhykjc002lkze0179w4gjs	cmk6fvjw00007hxtsirwx4s8m	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	2000.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji56260075kze00a8dzxpi	cmljhykjc002lkze0179w4gjs	cmkauuj5e0001620vtvan1277	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	2000.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji56270076kze0fuagd0a1	cmljhykjc002lkze0179w4gjs	cmk6ftqqu0004hxtskccmbx2s	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1500.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji56270077kze02ycxro5j	cmljhykjc002lkze0179w4gjs	cmk6f6ndh0008o43xcv3mdzu1	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1500.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji56270078kze0wlcjfg5k	cmljhykjc002lkze0179w4gjs	cmko09ljq000av6kuaenx18dg	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1500.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji56270079kze0dneusl7u	cmljhykjc002lkze0179w4gjs	cmko09lk5000bv6kuzlu1kxro	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1500.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007akze0xr54svl4	cmljhykjc002lkze0179w4gjs	cmk6fu8av0005hxtsrjafllf0	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007bkze0f2jcw97b	cmljhykjc002lkze0179w4gjs	cmk6f3ym20006o43xdewhcbes	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007ckze0781g3kc6	cmljhykjc002lkze0179w4gjs	cmk6f88vs0009o43x378tye2v	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007dkze0s91y8d0s	cmljhykjc002lkze0179w4gjs	cmlc1n6oq00025uyjdrjg49nv	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007ekze0io6wp3o8	cmljhykjc002lkze0179w4gjs	cmlc1nkmq00045uyjmizci262	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007fkze0g05mjn63	cmljhykjc002lkze0179w4gjs	cmland10h0000cu7jsz5fegj7	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007gkze0rxw548r4	cmljhykjc002lkze0179w4gjs	cmk6f3ym40007o43x4w1i7igj	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007hkze0behp9qfw	cmljhykjc002lkze0179w4gjs	cmk6f88vu000ao43x13j2f12j	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cml8tihrt003all8nei43m63p	cml8tfb2e0027ll8nfsq45jor	cmk6fbng100004b63c70xzv5a	\N	\N	\N	7000.00	\N	\N	\N	\N	\N	\N	20	7000.00	30.00	{"20": 7000, "30": 7300, "40": 7600, "50": 7900}	2026-02-05 02:09:00.281	2026-02-05 02:09:00.281
cml8tihrt003bll8nhrr6sqj6	cml8tfb2e0027ll8nfsq45jor	cmk6f27np0004o43xbl1qfr5n	\N	\N	\N	7000.00	\N	\N	\N	\N	\N	\N	20	7000.00	30.00	{"20": 7000, "30": 7300, "40": 7600, "50": 7900}	2026-02-05 02:09:00.281	2026-02-05 02:09:00.281
cml8tihrt003cll8nadqczzeq	cml8tfb2e0027ll8nfsq45jor	cmk6fbng600014b63lbz4hbql	\N	\N	\N	7000.00	\N	\N	\N	\N	\N	\N	20	7000.00	30.00	{"20": 7000, "30": 7300, "40": 7600, "50": 7900}	2026-02-05 02:09:00.281	2026-02-05 02:09:00.281
cml8tihrt003dll8n2jgs81fd	cml8tfb2e0027ll8nfsq45jor	cmk6f27nr0005o43xwyhm7een	\N	\N	\N	7000.00	\N	\N	\N	\N	\N	\N	20	7000.00	30.00	{"20": 7000, "30": 7300, "40": 7600, "50": 7900}	2026-02-05 02:09:00.281	2026-02-05 02:09:00.281
cml8tihrt003ell8n20lve475	cml8tfb2e0027ll8nfsq45jor	cmk6fu8av0005hxtsrjafllf0	\N	\N	\N	8000.00	\N	\N	\N	\N	\N	\N	20	8000.00	35.00	{"20": 8000, "30": 8350, "40": 8700, "50": 9050}	2026-02-05 02:09:00.281	2026-02-05 02:09:00.281
cml8tihrt003fll8nfthyyv4w	cml8tfb2e0027ll8nfsq45jor	cmk6f3ym20006o43xdewhcbes	\N	\N	\N	8000.00	\N	\N	\N	\N	\N	\N	20	8000.00	35.00	{"20": 8000, "30": 8350, "40": 8700, "50": 9050}	2026-02-05 02:09:00.281	2026-02-05 02:09:00.281
cml8tihrt003gll8newasm1pk	cml8tfb2e0027ll8nfsq45jor	cmk6f88vs0009o43x378tye2v	\N	\N	\N	8000.00	\N	\N	\N	\N	\N	\N	20	8000.00	35.00	{"20": 8000, "30": 8350, "40": 8700, "50": 9050}	2026-02-05 02:09:00.281	2026-02-05 02:09:00.281
cml8tihrt003hll8n7hkoe1v5	cml8tfb2e0027ll8nfsq45jor	cmk6f3ym40007o43x4w1i7igj	\N	\N	\N	8000.00	\N	\N	\N	\N	\N	\N	20	8000.00	35.00	{"20": 8000, "30": 8350, "40": 8700, "50": 9050}	2026-02-05 02:09:00.281	2026-02-05 02:09:00.281
cml8tihrt003ill8n4s8ynovz	cml8tfb2e0027ll8nfsq45jor	cmk6f88vu000ao43x13j2f12j	\N	\N	\N	8000.00	\N	\N	\N	\N	\N	\N	20	8000.00	35.00	{"20": 8000, "30": 8350, "40": 8700, "50": 9050}	2026-02-05 02:09:00.281	2026-02-05 02:09:00.281
cml8tihrt003jll8nk49tppty	cml8tfb2e0027ll8nfsq45jor	cmk6ftqqu0004hxtskccmbx2s	\N	\N	\N	9000.00	\N	\N	\N	\N	\N	\N	20	9000.00	40.00	{"20": 9000, "30": 9400, "40": 9800, "50": 10200}	2026-02-05 02:09:00.281	2026-02-05 02:09:00.281
cml8tihrt003kll8nvbi70ndo	cml8tfb2e0027ll8nfsq45jor	cmk6f6ndh0008o43xcv3mdzu1	\N	\N	\N	9000.00	\N	\N	\N	\N	\N	\N	20	9000.00	40.00	{"20": 9000, "30": 9400, "40": 9800, "50": 10200}	2026-02-05 02:09:00.281	2026-02-05 02:09:00.281
cml8tihrt003lll8ngunmdfkx	cml8tfb2e0027ll8nfsq45jor	cmk6fc2od00034b63mc8vtlep	\N	\N	\N	6000.00	\N	\N	\N	\N	\N	\N	20	6000.00	30.00	{"20": 6000, "30": 6300, "40": 6600, "50": 6900}	2026-02-05 02:09:00.281	2026-02-05 02:09:00.281
cmkp0sj37000itaz0mx8jct5n	cmkgcqgel0001vuyqquqn2f9z	\N	1	\N	1.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	\N	\N	\N	2026-01-22 05:37:22.339	2026-01-22 05:37:22.339
cmkp0sj37000jtaz0fcmnu904	cmkgcqgel0001vuyqquqn2f9z	\N	2	\N	1.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	\N	\N	\N	2026-01-22 05:37:22.339	2026-01-22 05:37:22.339
cmkp0sj37000ktaz04ikaghqj	cmkgcqgel0001vuyqquqn2f9z	\N	4	\N	1.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	\N	\N	\N	2026-01-22 05:37:22.339	2026-01-22 05:37:22.339
cmkp0sj37000ltaz0fb9pa27f	cmkgcqgel0001vuyqquqn2f9z	\N	8	\N	1.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	\N	\N	\N	2026-01-22 05:37:22.339	2026-01-22 05:37:22.339
cmlji5627007ikze00fnwo285	cmljhykjc002lkze0179w4gjs	cmlc1nkms00055uyjtzywxm6a	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007jkze074s8xz26	cmljhykjc002lkze0179w4gjs	cmlc1n6ot00035uyjdkg93ecp	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007kkze0asg8lrpe	cmljhykjc002lkze0179w4gjs	cmland10m0001cu7jnb6vyatl	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007lkze08p5qe5ei	cmljhykjc002lkze0179w4gjs	cmlano75a0002cu7jcukqxdr3	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	800.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cml8tihrt003mll8ntvekmubs	cml8tfb2e0027ll8nfsq45jor	cmk6fc2o500024b63vwcm68cp	\N	\N	\N	6000.00	\N	\N	\N	\N	\N	\N	20	6000.00	30.00	{"20": 6000, "30": 6300, "40": 6600, "50": 6900}	2026-02-05 02:09:00.281	2026-02-05 02:09:00.281
cml8tihrt003nll8nlg2eqxbu	cml8tfb2e0027ll8nfsq45jor	cmk6fjyhm000c4b631modt98m	\N	\N	\N	10000.00	\N	\N	\N	\N	\N	\N	20	10000.00	50.00	{"20": 10000, "30": 10500, "40": 11000, "50": 11500}	2026-02-05 02:09:00.281	2026-02-05 02:09:00.281
cml8tihrt003oll8nas7me28i	cml8tfb2e0027ll8nfsq45jor	cmk6fvjvy0006hxtspj3i6nks	\N	\N	\N	10000.00	\N	\N	\N	\N	\N	\N	20	10000.00	50.00	{"20": 10000, "30": 10500, "40": 11000, "50": 11500}	2026-02-05 02:09:00.281	2026-02-05 02:09:00.281
cml8tihru003pll8nbze5eez8	cml8tfb2e0027ll8nfsq45jor	cmkauuj580000620v7qprf1fa	\N	\N	\N	10000.00	\N	\N	\N	\N	\N	\N	20	10000.00	50.00	{"20": 10000, "30": 10500, "40": 11000, "50": 11500}	2026-02-05 02:09:00.281	2026-02-05 02:09:00.281
cml8tihru003qll8nkpkrzc55	cml8tfb2e0027ll8nfsq45jor	cmk6fjyhq000d4b63ltsp5xkp	\N	\N	\N	10000.00	\N	\N	\N	\N	\N	\N	20	10000.00	50.00	{"20": 10000, "30": 10500, "40": 11000, "50": 11500}	2026-02-05 02:09:00.281	2026-02-05 02:09:00.281
cml8tihru003rll8n9g3zlnzs	cml8tfb2e0027ll8nfsq45jor	cmk6fvjw00007hxtsirwx4s8m	\N	\N	\N	10000.00	\N	\N	\N	\N	\N	\N	20	10000.00	50.00	{"20": 10000, "30": 10500, "40": 11000, "50": 11500}	2026-02-05 02:09:00.281	2026-02-05 02:09:00.281
cml8tihru003sll8nh78xyvfa	cml8tfb2e0027ll8nfsq45jor	cmk6fkx5l000f4b63teec2nro	\N	\N	\N	10000.00	\N	\N	\N	\N	\N	\N	20	10000.00	50.00	{"20": 10000, "30": 10500, "40": 11000, "50": 11500}	2026-02-05 02:09:00.281	2026-02-05 02:09:00.281
cmlji3jmx0061kze0sdr8ttdv	cmlji08q2004wkze0gss2hwnn	cmk6fjyhm000c4b631modt98m	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	2000.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmx0062kze0q71n8jiz	cmlji08q2004wkze0gss2hwnn	cmk6fvjvy0006hxtspj3i6nks	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	2000.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmx0063kze0ajfr0hmg	cmlji08q2004wkze0gss2hwnn	cmk6fkx5j000e4b639whx3sxx	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	2000.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmx0064kze0x6xis2hf	cmlji08q2004wkze0gss2hwnn	cmkauuj580000620v7qprf1fa	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	2000.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmx0065kze04dx8uqma	cmlji08q2004wkze0gss2hwnn	cmk6fjyhq000d4b63ltsp5xkp	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	2000.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmx0066kze0l9zt7v5i	cmlji08q2004wkze0gss2hwnn	cmk6fvjw00007hxtsirwx4s8m	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	2000.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmx0067kze0c9n5qx7r	cmlji08q2004wkze0gss2hwnn	cmk6fkx5l000f4b63teec2nro	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	2000.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmx0068kze0usursj49	cmlji08q2004wkze0gss2hwnn	cmkauuj5e0001620vtvan1277	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	2000.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmx0069kze0r24y0rjc	cmlji08q2004wkze0gss2hwnn	cmk6ftqqu0004hxtskccmbx2s	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1500.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmx006akze06499ilgf	cmlji08q2004wkze0gss2hwnn	cmk6f6ndh0008o43xcv3mdzu1	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1500.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmx006bkze0bhlj7jw7	cmlji08q2004wkze0gss2hwnn	cmk6fu8av0005hxtsrjafllf0	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmx006ckze02cs06fn6	cmlji08q2004wkze0gss2hwnn	cmk6f3ym20006o43xdewhcbes	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmx006dkze0920p51kj	cmlji08q2004wkze0gss2hwnn	cmlc1n6oq00025uyjdrjg49nv	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmx006ekze0twk73m0o	cmlji08q2004wkze0gss2hwnn	cmland10h0000cu7jsz5fegj7	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmx006fkze0t9ioxc32	cmlji08q2004wkze0gss2hwnn	cmlc1nkmq00045uyjmizci262	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmx006gkze05jwizybz	cmlji08q2004wkze0gss2hwnn	cmk6f88vs0009o43x378tye2v	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmy006hkze0y6pu4zs8	cmlji08q2004wkze0gss2hwnn	cmk6f3ym40007o43x4w1i7igj	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmy006ikze0lqkxixv3	cmlji08q2004wkze0gss2hwnn	cmlc1nkms00055uyjtzywxm6a	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmy006jkze0pp9ro7rh	cmlji08q2004wkze0gss2hwnn	cmland10m0001cu7jnb6vyatl	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmy006kkze06m57b1wt	cmlji08q2004wkze0gss2hwnn	cmlc1n6ot00035uyjdkg93ecp	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmy006lkze0qb9jt08e	cmlji08q2004wkze0gss2hwnn	cmk6f88vu000ao43x13j2f12j	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	1000.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmy006mkze0q3vzrd9r	cmlji08q2004wkze0gss2hwnn	cmlano75a0002cu7jcukqxdr3	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	800.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmy006nkze04flmcecb	cmlji08q2004wkze0gss2hwnn	cmlca47k40000u57psb1m18kw	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	800.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmy006okze02pvgu6e0	cmlji08q2004wkze0gss2hwnn	cmk6fbng100004b63c70xzv5a	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	800.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlrwunde006abfzcgnzuj73e	cml8tboql0001ll8njegn1tsj	cmlano75a0002cu7jcukqxdr3	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	500.00	{"20": 5000, "30": 10000, "40": 15000, "50": 20000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwunde006bbfzc7thgqdf1	cml8tboql0001ll8njegn1tsj	cmk6fbng100004b63c70xzv5a	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	500.00	{"20": 5000, "30": 10000, "40": 15000, "50": 20000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwunde006cbfzc99w8ms5e	cml8tboql0001ll8njegn1tsj	cmlca47k40000u57psb1m18kw	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	500.00	{"20": 5000, "30": 10000, "40": 15000, "50": 20000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundf006dbfzc4yhlrh4p	cml8tboql0001ll8njegn1tsj	cmlc1ieph00005uyjvsm75p5u	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	500.00	{"20": 5000, "30": 10000, "40": 15000, "50": 20000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundf006ebfzcscv5vul7	cml8tboql0001ll8njegn1tsj	cmk6f27np0004o43xbl1qfr5n	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	500.00	{"20": 5000, "30": 10000, "40": 15000, "50": 20000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundf006fbfzcip7pdyfy	cml8tboql0001ll8njegn1tsj	cmlano75d0003cu7jqhfnx28g	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	500.00	{"20": 5000, "30": 10000, "40": 15000, "50": 20000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundf006gbfzcdgs71h9k	cml8tboql0001ll8njegn1tsj	cmk6fbng600014b63lbz4hbql	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	500.00	{"20": 5000, "30": 10000, "40": 15000, "50": 20000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundf006hbfzcbnkl3id7	cml8tboql0001ll8njegn1tsj	cmlca47kl0001u57ppuopynoj	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	500.00	{"20": 5000, "30": 10000, "40": 15000, "50": 20000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundf006ibfzcb7j8ncdn	cml8tboql0001ll8njegn1tsj	cmlc1iepk00015uyj6d6vgqv4	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	500.00	{"20": 5000, "30": 10000, "40": 15000, "50": 20000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundf006jbfzc1n4k42at	cml8tboql0001ll8njegn1tsj	cmk6f27nr0005o43xwyhm7een	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	500.00	{"20": 5000, "30": 10000, "40": 15000, "50": 20000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundg006kbfzcyyyks1q4	cml8tboql0001ll8njegn1tsj	cmk6fu8av0005hxtsrjafllf0	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	600.00	{"20": 6000, "30": 12000, "40": 18000, "50": 24000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundg006lbfzcaq9b7non	cml8tboql0001ll8njegn1tsj	cmk6f3ym20006o43xdewhcbes	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	600.00	{"20": 6000, "30": 12000, "40": 18000, "50": 24000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundg006mbfzc8q47wdxp	cml8tboql0001ll8njegn1tsj	cmland10h0000cu7jsz5fegj7	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	600.00	{"20": 6000, "30": 12000, "40": 18000, "50": 24000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlji3jmy006pkze0xnqk3si9	cmlji08q2004wkze0gss2hwnn	cmlc1ieph00005uyjvsm75p5u	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	800.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlrwundg006nbfzcjasha7za	cml8tboql0001ll8njegn1tsj	cmlc1n6oq00025uyjdrjg49nv	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	600.00	{"20": 6000, "30": 12000, "40": 18000, "50": 24000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundg006obfzc01j2fmf5	cml8tboql0001ll8njegn1tsj	cmlc1nkmq00045uyjmizci262	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	600.00	{"20": 6000, "30": 12000, "40": 18000, "50": 24000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundg006pbfzcrsne2p8z	cml8tboql0001ll8njegn1tsj	cmk6f88vs0009o43x378tye2v	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	600.00	{"20": 6000, "30": 12000, "40": 18000, "50": 24000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundh006qbfzc3ghk10sz	cml8tboql0001ll8njegn1tsj	cmk6f3ym40007o43x4w1i7igj	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	600.00	{"20": 6000, "30": 12000, "40": 18000, "50": 24000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundh006rbfzc9tclfc3l	cml8tboql0001ll8njegn1tsj	cmland10m0001cu7jnb6vyatl	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	600.00	{"20": 6000, "30": 12000, "40": 18000, "50": 24000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundh006sbfzczt1vd2xh	cml8tboql0001ll8njegn1tsj	cmlc1n6ot00035uyjdkg93ecp	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	600.00	{"20": 6000, "30": 12000, "40": 18000, "50": 24000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundh006tbfzc68l8w4vr	cml8tboql0001ll8njegn1tsj	cmk6f88vu000ao43x13j2f12j	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	600.00	{"20": 6000, "30": 12000, "40": 18000, "50": 24000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlcmu1w800004bdpafpgsech	cmkafl76r0001kz5orjfsda7c	\N	1	\N	1.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	\N	\N	\N	2026-02-07 18:13:06.968	2026-02-07 18:13:06.968
cmlji3jmy006qkze0ksfdivxd	cmlji08q2004wkze0gss2hwnn	cmlano75d0003cu7jqhfnx28g	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	800.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmy006rkze09cpygi1q	cmlji08q2004wkze0gss2hwnn	cmk6f27np0004o43xbl1qfr5n	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	800.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmy006skze0vxw33k8p	cmlji08q2004wkze0gss2hwnn	cmk6fbng600014b63lbz4hbql	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	800.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmy006tkze0j4awt9xg	cmlji08q2004wkze0gss2hwnn	cmlc1iepk00015uyj6d6vgqv4	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	800.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmy006ukze0dkg06r15	cmlji08q2004wkze0gss2hwnn	cmlca47kl0001u57ppuopynoj	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	800.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmy006vkze00aytafji	cmlji08q2004wkze0gss2hwnn	cmk6f27nr0005o43xwyhm7een	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	800.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmy006wkze0slh47wp3	cmlji08q2004wkze0gss2hwnn	cmk6fc2od00034b63mc8vtlep	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	600.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji3jmy006xkze09rh3nss7	cmlji08q2004wkze0gss2hwnn	cmk6fc2o500024b63vwcm68cp	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	600.00	{}	2026-02-12 13:34:55.017	2026-02-12 13:34:55.017
cmlji5627007mkze0hjy3uzk2	cmljhykjc002lkze0179w4gjs	cmk6fbng100004b63c70xzv5a	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	800.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007nkze0e2s7nqvo	cmljhykjc002lkze0179w4gjs	cmlca47k40000u57psb1m18kw	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	800.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007okze0mfs5m68i	cmljhykjc002lkze0179w4gjs	cmlc1ieph00005uyjvsm75p5u	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	800.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007pkze0fhh54n4y	cmljhykjc002lkze0179w4gjs	cmlano75d0003cu7jqhfnx28g	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	800.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007qkze0pwgl2sns	cmljhykjc002lkze0179w4gjs	cmk6f27np0004o43xbl1qfr5n	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	800.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007rkze00tn2en6y	cmljhykjc002lkze0179w4gjs	cmk6fbng600014b63lbz4hbql	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	800.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007skze0r5tz7b1u	cmljhykjc002lkze0179w4gjs	cmlc1iepk00015uyj6d6vgqv4	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	800.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007tkze0jjhtwyi6	cmljhykjc002lkze0179w4gjs	cmlca47kl0001u57ppuopynoj	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	800.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007ukze0sccmbhwm	cmljhykjc002lkze0179w4gjs	cmk6f27nr0005o43xwyhm7een	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	800.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007vkze0frs5ox1v	cmljhykjc002lkze0179w4gjs	cmk6fc2od00034b63mc8vtlep	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	500.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlji5627007wkze0nsrnobzx	cmljhykjc002lkze0179w4gjs	cmk6fc2o500024b63vwcm68cp	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	1	0.00	500.00	{}	2026-02-12 13:36:10.735	2026-02-12 13:36:10.735
cmlrwundh006ubfzcekjymjnk	cml8tboql0001ll8njegn1tsj	cmlc1nkms00055uyjtzywxm6a	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	600.00	{"20": 6000, "30": 12000, "40": 18000, "50": 24000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundh006vbfzc8y1rvjzl	cml8tboql0001ll8njegn1tsj	cmk6ftqqu0004hxtskccmbx2s	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	800.00	{"20": 8000, "30": 16000, "40": 24000, "50": 32000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundh006wbfzc6w8e9anv	cml8tboql0001ll8njegn1tsj	cmlmi108x0002i4rnfdfb8wgt	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	800.00	{"20": 8000, "30": 16000, "40": 24000, "50": 32000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundh006xbfzcy0jv9wwc	cml8tboql0001ll8njegn1tsj	cmko09ljq000av6kuaenx18dg	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	800.00	{"20": 8000, "30": 16000, "40": 24000, "50": 32000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundi006ybfzcanhlc4xs	cml8tboql0001ll8njegn1tsj	cmk6f6ndh0008o43xcv3mdzu1	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	800.00	{"20": 8000, "30": 16000, "40": 24000, "50": 32000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundi006zbfzcbdi2rkp5	cml8tboql0001ll8njegn1tsj	cmlmi10980003i4rndxc89c0p	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	800.00	{"20": 8000, "30": 16000, "40": 24000, "50": 32000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundi0070bfzcp35hui9r	cml8tboql0001ll8njegn1tsj	cmko09lk5000bv6kuzlu1kxro	\N	\N	\N	0.00	\N	\N	\N	\N	\N	\N	10	0.00	800.00	{"20": 8000, "30": 16000, "40": 24000, "50": 32000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundi0071bfzcjmckz2e0	cml8tboql0001ll8njegn1tsj	cmk6fjyhm000c4b631modt98m	\N	\N	\N	10000.00	\N	\N	\N	\N	\N	\N	10	10000.00	1000.00	{"10": 10000, "20": 20000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundi0072bfzcsfd8y4fd	cml8tboql0001ll8njegn1tsj	cmk6fvjvy0006hxtspj3i6nks	\N	\N	\N	10000.00	\N	\N	\N	\N	\N	\N	10	10000.00	1000.00	{"10": 10000, "20": 20000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundi0073bfzcwfh60a41	cml8tboql0001ll8njegn1tsj	cmk6fkx5j000e4b639whx3sxx	\N	\N	\N	10000.00	\N	\N	\N	\N	\N	\N	10	10000.00	1000.00	{"10": 10000, "20": 20000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundi0074bfzchx4awepj	cml8tboql0001ll8njegn1tsj	cmkauuj580000620v7qprf1fa	\N	\N	\N	10000.00	\N	\N	\N	\N	\N	\N	10	10000.00	1000.00	{"10": 10000, "20": 20000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundi0075bfzcekd5hvp7	cml8tboql0001ll8njegn1tsj	cmkavuol30000ft7ltr5dldbf	\N	\N	\N	10000.00	\N	\N	\N	\N	\N	\N	10	10000.00	1000.00	{"10": 10000, "20": 20000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundj0076bfzcfwrdv4ii	cml8tboql0001ll8njegn1tsj	cmk6fjyhq000d4b63ltsp5xkp	\N	\N	\N	10000.00	\N	\N	\N	\N	\N	\N	10	10000.00	1000.00	{"10": 10000, "20": 20000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundj0077bfzcxudngde7	cml8tboql0001ll8njegn1tsj	cmk6fvjw00007hxtsirwx4s8m	\N	\N	\N	10000.00	\N	\N	\N	\N	\N	\N	10	10000.00	1000.00	{"10": 10000, "20": 20000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundj0078bfzckcv2hpcp	cml8tboql0001ll8njegn1tsj	cmk6fkx5l000f4b63teec2nro	\N	\N	\N	10000.00	\N	\N	\N	\N	\N	\N	10	10000.00	1000.00	{"10": 10000, "20": 20000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundj0079bfzc5rcmf5gf	cml8tboql0001ll8njegn1tsj	cmkauuj5e0001620vtvan1277	\N	\N	\N	10000.00	\N	\N	\N	\N	\N	\N	10	10000.00	1000.00	{"10": 10000, "20": 20000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundj007abfzcpdanlt5e	cml8tboql0001ll8njegn1tsj	cmkavvbot0001ft7l6yfnze23	\N	\N	\N	12000.00	\N	\N	\N	\N	\N	\N	10	12000.00	1200.00	{"10": 12000, "20": 24000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
cmlrwundj007bbfzcuyvcptey	cml8tboql0001ll8njegn1tsj	cmkavvboy0002ft7lsl0ipbee	\N	\N	\N	12000.00	\N	\N	\N	\N	\N	\N	10	12000.00	1200.00	{"10": 12000, "20": 24000}	2026-02-18 10:50:03.601	2026-02-18 10:50:03.601
\.


ALTER TABLE public.production_setting_prices ENABLE TRIGGER ALL;

--
-- Data for Name: production_setting_specifications; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.production_setting_specifications DISABLE TRIGGER ALL;

COPY public.production_setting_specifications (id, "productionSettingId", "specificationId", price, "sortOrder", "createdAt", "updatedAt") FROM stdin;
cmksamp5y003iiglui4kkswkc	cmkkhsxxs00ba2fdul36si9el	cmk6fbng100004b63c70xzv5a	\N	0	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5y003jiglus58rmp34	cmkkhsxxs00ba2fdul36si9el	cmk6fu8av0005hxtsrjafllf0	\N	1	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5y003kiglu7hpo1b37	cmkkhsxxs00ba2fdul36si9el	cmk6f3ym20006o43xdewhcbes	\N	2	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5y003ligluppp274c0	cmkkhsxxs00ba2fdul36si9el	cmk6f88vs0009o43x378tye2v	\N	3	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5y003migluyxriu5sa	cmkkhsxxs00ba2fdul36si9el	cmk6ftqqu0004hxtskccmbx2s	\N	4	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5y003niglu00ra2mz8	cmkkhsxxs00ba2fdul36si9el	cmk6f6ndh0008o43xcv3mdzu1	\N	5	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5y003oigluffohx38k	cmkkhsxxs00ba2fdul36si9el	cmk6fjyhm000c4b631modt98m	\N	6	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5y003pigluvucyefyf	cmkkhsxxs00ba2fdul36si9el	cmk6fkx5j000e4b639whx3sxx	\N	7	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5y003qiglu4yn6w8qh	cmkkhsxxs00ba2fdul36si9el	cmk6fvjvy0006hxtspj3i6nks	\N	8	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5y003rigluqbkv881s	cmkkhsxxs00ba2fdul36si9el	cmkauuj580000620v7qprf1fa	\N	9	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5y003siglu53mwx77p	cmkkhsxxs00ba2fdul36si9el	cmkavuol30000ft7ltr5dldbf	\N	10	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5y003tigluk55f5m6l	cmkkhsxxs00ba2fdul36si9el	cmkavvbot0001ft7l6yfnze23	\N	11	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5y003uigluv56k9dms	cmkkhsxxs00ba2fdul36si9el	cmk6fdf7400084b63698iy8j5	\N	12	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5y003viglu8ufzc4et	cmkkhsxxs00ba2fdul36si9el	cmk6fcj4d00044b63ydvo3m99	\N	13	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z003wigluuqokp3sc	cmkkhsxxs00ba2fdul36si9el	cmk6fd3tf00064b63chde9ajf	\N	14	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z003xiglu66hbno1o	cmkkhsxxs00ba2fdul36si9el	cmk6feqsv000a4b631dxzz34w	\N	15	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z003yiglu2klcd2d7	cmkkhsxxs00ba2fdul36si9el	cmk6gcadq0000v9w22gdjvtj0	\N	16	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z003zigluefm47bia	cmkkhsxxs00ba2fdul36si9el	cmk6gcljh0002v9w2h60pr8xa	\N	17	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z0040igluyomsr211	cmkkhsxxs00ba2fdul36si9el	cmk6f27np0004o43xbl1qfr5n	\N	18	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z0041igluo0qs4fqv	cmkkhsxxs00ba2fdul36si9el	cmk6fbng600014b63lbz4hbql	\N	19	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z0042igluomup8ecm	cmkkhsxxs00ba2fdul36si9el	cmk6f3ym40007o43x4w1i7igj	\N	20	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z0043igluzmu18nhm	cmkkhsxxs00ba2fdul36si9el	cmk6f88vu000ao43x13j2f12j	\N	21	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z0044iglu2nkuwxos	cmkkhsxxs00ba2fdul36si9el	cmk6fjyhq000d4b63ltsp5xkp	\N	22	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z0045iglu9bgfq06e	cmkkhsxxs00ba2fdul36si9el	cmk6fvjw00007hxtsirwx4s8m	\N	23	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z0046igluuqhyf1z7	cmkkhsxxs00ba2fdul36si9el	cmk6fkx5l000f4b63teec2nro	\N	24	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z0047igluy5kgkvxv	cmkkhsxxs00ba2fdul36si9el	cmkauuj5e0001620vtvan1277	\N	25	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z0048iglugpfvhqkr	cmkkhsxxs00ba2fdul36si9el	cmkavvboy0002ft7lsl0ipbee	\N	26	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z0049iglua22hsiux	cmkkhsxxs00ba2fdul36si9el	cmk6fdf7600094b63ff6454lx	\N	27	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z004aigluuozd7f0e	cmkkhsxxs00ba2fdul36si9el	cmk6fcj4f00054b63m430jdn4	\N	28	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z004bigluhqa18uq4	cmkkhsxxs00ba2fdul36si9el	cmk6fd3th00074b63i1ouhou9	\N	29	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z004cigluhjooed5f	cmkkhsxxs00ba2fdul36si9el	cmk6feqsy000b4b63vxejnfur	\N	30	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z004diglui83t0961	cmkkhsxxs00ba2fdul36si9el	cmk6gcadu0001v9w2k7ogf6zt	\N	31	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z004eiglukgao5dw1	cmkkhsxxs00ba2fdul36si9el	cmk6gcljl0003v9w2qe2j0lo1	\N	32	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z004figluk7i6sdiy	cmkkhsxxs00ba2fdul36si9el	cmk6fc2o500024b63vwcm68cp	\N	33	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z004giglu7tcitsm9	cmkkhsxxs00ba2fdul36si9el	cmk6f27nr0005o43xwyhm7een	\N	34	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cmksamp5z004higlujlwr4vxl	cmkkhsxxs00ba2fdul36si9el	cmk6fc2od00034b63mc8vtlep	\N	35	2026-01-24 12:36:04.967	2026-01-24 12:36:04.967
cml8tihrx003tll8nswm3vb3n	cml8tfb2e0027ll8nfsq45jor	cmk6fbng100004b63c70xzv5a	\N	0	2026-02-05 02:09:00.285	2026-02-05 02:09:00.285
cml8tihrx003ull8n4ota7e82	cml8tfb2e0027ll8nfsq45jor	cmk6f27np0004o43xbl1qfr5n	\N	1	2026-02-05 02:09:00.285	2026-02-05 02:09:00.285
cml8tihrx003vll8nynr9930s	cml8tfb2e0027ll8nfsq45jor	cmk6fbng600014b63lbz4hbql	\N	2	2026-02-05 02:09:00.285	2026-02-05 02:09:00.285
cml8tihrx003wll8nifih8y0g	cml8tfb2e0027ll8nfsq45jor	cmk6f27nr0005o43xwyhm7een	\N	3	2026-02-05 02:09:00.285	2026-02-05 02:09:00.285
cml8tihrx003xll8njuvki0z5	cml8tfb2e0027ll8nfsq45jor	cmk6fu8av0005hxtsrjafllf0	\N	4	2026-02-05 02:09:00.285	2026-02-05 02:09:00.285
cml8tihrx003yll8n4z6sbo78	cml8tfb2e0027ll8nfsq45jor	cmk6f3ym20006o43xdewhcbes	\N	5	2026-02-05 02:09:00.285	2026-02-05 02:09:00.285
cml8tihrx003zll8nduvqjb0f	cml8tfb2e0027ll8nfsq45jor	cmk6f88vs0009o43x378tye2v	\N	6	2026-02-05 02:09:00.285	2026-02-05 02:09:00.285
cml8tihrx0040ll8nc70ex17o	cml8tfb2e0027ll8nfsq45jor	cmk6f3ym40007o43x4w1i7igj	\N	7	2026-02-05 02:09:00.285	2026-02-05 02:09:00.285
cml8tihrx0041ll8nr1glgh4e	cml8tfb2e0027ll8nfsq45jor	cmk6f88vu000ao43x13j2f12j	\N	8	2026-02-05 02:09:00.285	2026-02-05 02:09:00.285
cml8tihrx0042ll8nk9qak8qy	cml8tfb2e0027ll8nfsq45jor	cmk6ftqqu0004hxtskccmbx2s	\N	9	2026-02-05 02:09:00.285	2026-02-05 02:09:00.285
cml8tihrx0043ll8no75b0831	cml8tfb2e0027ll8nfsq45jor	cmk6f6ndh0008o43xcv3mdzu1	\N	10	2026-02-05 02:09:00.285	2026-02-05 02:09:00.285
cml8tihrx0044ll8ncqn7mhi8	cml8tfb2e0027ll8nfsq45jor	cmk6fc2od00034b63mc8vtlep	\N	11	2026-02-05 02:09:00.285	2026-02-05 02:09:00.285
cml8tihrx0045ll8naibi1f9d	cml8tfb2e0027ll8nfsq45jor	cmk6fc2o500024b63vwcm68cp	\N	12	2026-02-05 02:09:00.285	2026-02-05 02:09:00.285
cml8tihrx0046ll8njsk33tq5	cml8tfb2e0027ll8nfsq45jor	cmk6fjyhm000c4b631modt98m	\N	13	2026-02-05 02:09:00.285	2026-02-05 02:09:00.285
cml8tihrx0047ll8nero64dhs	cml8tfb2e0027ll8nfsq45jor	cmk6fvjvy0006hxtspj3i6nks	\N	14	2026-02-05 02:09:00.285	2026-02-05 02:09:00.285
cml8tihrx0048ll8nk17dl2ra	cml8tfb2e0027ll8nfsq45jor	cmkauuj580000620v7qprf1fa	\N	15	2026-02-05 02:09:00.285	2026-02-05 02:09:00.285
cml8tihrx0049ll8n9jl5gorw	cml8tfb2e0027ll8nfsq45jor	cmk6fjyhq000d4b63ltsp5xkp	\N	16	2026-02-05 02:09:00.285	2026-02-05 02:09:00.285
cml8tihrx004all8nfkgaxyoi	cml8tfb2e0027ll8nfsq45jor	cmk6fvjw00007hxtsirwx4s8m	\N	17	2026-02-05 02:09:00.285	2026-02-05 02:09:00.285
cml8tihrx004bll8ngslno144	cml8tfb2e0027ll8nfsq45jor	cmk6fkx5l000f4b63teec2nro	\N	18	2026-02-05 02:09:00.285	2026-02-05 02:09:00.285
cml94qx35003022vl8bt7kq3x	cmkkhk9d600542fduuvm9kmec	cmk6fbng100004b63c70xzv5a	\N	0	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003122vlrr5s8zz6	cmkkhk9d600542fduuvm9kmec	cmk6fu8av0005hxtsrjafllf0	\N	1	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003222vljqjj9glf	cmkkhk9d600542fduuvm9kmec	cmk6f3ym20006o43xdewhcbes	\N	2	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003322vl8tl2wbxy	cmkkhk9d600542fduuvm9kmec	cmk6f88vs0009o43x378tye2v	\N	3	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003422vlzfcy5wem	cmkkhk9d600542fduuvm9kmec	cmk6ftqqu0004hxtskccmbx2s	\N	4	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003522vlmhblm28o	cmkkhk9d600542fduuvm9kmec	cmk6f6ndh0008o43xcv3mdzu1	\N	5	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003622vlupuprr4g	cmkkhk9d600542fduuvm9kmec	cmk6fjyhm000c4b631modt98m	\N	6	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003722vll7t6cg1c	cmkkhk9d600542fduuvm9kmec	cmk6fkx5j000e4b639whx3sxx	\N	7	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003822vl168ak7kj	cmkkhk9d600542fduuvm9kmec	cmk6fvjvy0006hxtspj3i6nks	\N	8	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003922vl1xsmpf17	cmkkhk9d600542fduuvm9kmec	cmkauuj580000620v7qprf1fa	\N	9	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003a22vl09h7f5pb	cmkkhk9d600542fduuvm9kmec	cmkavuol30000ft7ltr5dldbf	\N	10	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cmlrwune6007cbfzcodzum19b	cml8tboql0001ll8njegn1tsj	cmlano75a0002cu7jcukqxdr3	\N	0	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune6007dbfzcztwd2vwx	cml8tboql0001ll8njegn1tsj	cmk6fbng100004b63c70xzv5a	\N	1	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune6007ebfzctx4sql2n	cml8tboql0001ll8njegn1tsj	cmlca47k40000u57psb1m18kw	\N	2	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune6007fbfzcmk6o7jkh	cml8tboql0001ll8njegn1tsj	cmlc1ieph00005uyjvsm75p5u	\N	3	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune6007gbfzcfqvx33vx	cml8tboql0001ll8njegn1tsj	cmk6f27np0004o43xbl1qfr5n	\N	4	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune6007hbfzcdk5ot9jr	cml8tboql0001ll8njegn1tsj	cmlano75d0003cu7jqhfnx28g	\N	5	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune6007ibfzc8mhtrnxp	cml8tboql0001ll8njegn1tsj	cmk6fbng600014b63lbz4hbql	\N	6	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune6007jbfzc24ux5hvn	cml8tboql0001ll8njegn1tsj	cmlca47kl0001u57ppuopynoj	\N	7	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune6007kbfzcpjg8z1nt	cml8tboql0001ll8njegn1tsj	cmlc1iepk00015uyj6d6vgqv4	\N	8	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune6007lbfzcgx9c9tkc	cml8tboql0001ll8njegn1tsj	cmk6f27nr0005o43xwyhm7een	\N	9	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune6007mbfzc7ve1whgn	cml8tboql0001ll8njegn1tsj	cmk6fu8av0005hxtsrjafllf0	\N	10	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune6007nbfzcosxijx41	cml8tboql0001ll8njegn1tsj	cmk6f3ym20006o43xdewhcbes	\N	11	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune6007obfzc8t99o9ho	cml8tboql0001ll8njegn1tsj	cmland10h0000cu7jsz5fegj7	\N	12	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune6007pbfzc5ll74mdz	cml8tboql0001ll8njegn1tsj	cmlc1n6oq00025uyjdrjg49nv	\N	13	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune6007qbfzcrn1do8od	cml8tboql0001ll8njegn1tsj	cmlc1nkmq00045uyjmizci262	\N	14	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune6007rbfzc2um239aq	cml8tboql0001ll8njegn1tsj	cmk6f88vs0009o43x378tye2v	\N	15	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune6007sbfzcwe1i12vc	cml8tboql0001ll8njegn1tsj	cmk6f3ym40007o43x4w1i7igj	\N	16	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune6007tbfzcew22kfv6	cml8tboql0001ll8njegn1tsj	cmland10m0001cu7jnb6vyatl	\N	17	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune6007ubfzcc0vswan5	cml8tboql0001ll8njegn1tsj	cmlc1n6ot00035uyjdkg93ecp	\N	18	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cml94qx35003b22vlk8uqkjto	cmkkhk9d600542fduuvm9kmec	cmkavvbot0001ft7l6yfnze23	\N	11	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003c22vlod1du2bl	cmkkhk9d600542fduuvm9kmec	cmk6fdf7400084b63698iy8j5	\N	12	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003d22vlweno4vm3	cmkkhk9d600542fduuvm9kmec	cmk6fcj4d00044b63ydvo3m99	\N	13	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003e22vlfmb3evt1	cmkkhk9d600542fduuvm9kmec	cmk6fd3tf00064b63chde9ajf	\N	14	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003f22vl8896e4b3	cmkkhk9d600542fduuvm9kmec	cmk6feqsv000a4b631dxzz34w	\N	15	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003g22vl9p9gm3vi	cmkkhk9d600542fduuvm9kmec	cmk6gcadq0000v9w22gdjvtj0	\N	16	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003h22vl7t2jz2hl	cmkkhk9d600542fduuvm9kmec	cmk6gcljh0002v9w2h60pr8xa	\N	17	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003i22vl630ffzex	cmkkhk9d600542fduuvm9kmec	cmk6f27np0004o43xbl1qfr5n	\N	18	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003j22vlhd10d01y	cmkkhk9d600542fduuvm9kmec	cmk6fbng600014b63lbz4hbql	\N	19	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003k22vla05pebuc	cmkkhk9d600542fduuvm9kmec	cmk6f3ym40007o43x4w1i7igj	\N	20	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003l22vlvcfz34in	cmkkhk9d600542fduuvm9kmec	cmk6f88vu000ao43x13j2f12j	\N	21	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003m22vldb510z1c	cmkkhk9d600542fduuvm9kmec	cmk6fjyhq000d4b63ltsp5xkp	\N	22	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003n22vldyu3e4nd	cmkkhk9d600542fduuvm9kmec	cmk6fvjw00007hxtsirwx4s8m	\N	23	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003o22vlfjkwukyo	cmkkhk9d600542fduuvm9kmec	cmk6fkx5l000f4b63teec2nro	\N	24	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003p22vlfpt7zrl3	cmkkhk9d600542fduuvm9kmec	cmkauuj5e0001620vtvan1277	\N	25	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003q22vl7beh9g3m	cmkkhk9d600542fduuvm9kmec	cmkavvboy0002ft7lsl0ipbee	\N	26	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003r22vli8cqg4d4	cmkkhk9d600542fduuvm9kmec	cmk6fdf7600094b63ff6454lx	\N	27	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003s22vlmawfmlgj	cmkkhk9d600542fduuvm9kmec	cmk6fcj4f00054b63m430jdn4	\N	28	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003t22vlrz20msf6	cmkkhk9d600542fduuvm9kmec	cmk6fd3th00074b63i1ouhou9	\N	29	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003u22vli2slm54g	cmkkhk9d600542fduuvm9kmec	cmk6feqsy000b4b63vxejnfur	\N	30	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003v22vlh8vqx3rb	cmkkhk9d600542fduuvm9kmec	cmk6gcadu0001v9w2k7ogf6zt	\N	31	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003w22vlxrz9q1fk	cmkkhk9d600542fduuvm9kmec	cmk6gcljl0003v9w2qe2j0lo1	\N	32	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003x22vl4vtfef76	cmkkhk9d600542fduuvm9kmec	cmk6fc2o500024b63vwcm68cp	\N	33	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003y22vld7aakpfq	cmkkhk9d600542fduuvm9kmec	cmk6f27nr0005o43xwyhm7een	\N	34	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cml94qx35003z22vlyb2z3t30	cmkkhk9d600542fduuvm9kmec	cmk6fc2od00034b63mc8vtlep	\N	35	2026-02-05 07:23:29.153	2026-02-05 07:23:29.153
cmlrwune7007vbfzcbrx0pn0i	cml8tboql0001ll8njegn1tsj	cmk6f88vu000ao43x13j2f12j	\N	19	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune7007wbfzcn4g9cv63	cml8tboql0001ll8njegn1tsj	cmlc1nkms00055uyjtzywxm6a	\N	20	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune7007xbfzcjee6lf72	cml8tboql0001ll8njegn1tsj	cmk6ftqqu0004hxtskccmbx2s	\N	21	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune7007ybfzciun5b2uz	cml8tboql0001ll8njegn1tsj	cmlmi108x0002i4rnfdfb8wgt	\N	22	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune7007zbfzc6xroui5e	cml8tboql0001ll8njegn1tsj	cmko09ljq000av6kuaenx18dg	\N	23	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune70080bfzcged6psyk	cml8tboql0001ll8njegn1tsj	cmk6f6ndh0008o43xcv3mdzu1	\N	24	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune70081bfzcw56cw04i	cml8tboql0001ll8njegn1tsj	cmlmi10980003i4rndxc89c0p	\N	25	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune70082bfzckg5mrhkc	cml8tboql0001ll8njegn1tsj	cmko09lk5000bv6kuzlu1kxro	\N	26	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune70083bfzcajeffiyu	cml8tboql0001ll8njegn1tsj	cmk6fjyhm000c4b631modt98m	\N	27	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune70084bfzcm9zmoxkl	cml8tboql0001ll8njegn1tsj	cmk6fvjvy0006hxtspj3i6nks	\N	28	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune70085bfzc4myropth	cml8tboql0001ll8njegn1tsj	cmk6fkx5j000e4b639whx3sxx	\N	29	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune70086bfzc44o0ui6m	cml8tboql0001ll8njegn1tsj	cmkauuj580000620v7qprf1fa	\N	30	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune70087bfzcze1jja1z	cml8tboql0001ll8njegn1tsj	cmkavuol30000ft7ltr5dldbf	\N	31	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune70088bfzcq2n16raw	cml8tboql0001ll8njegn1tsj	cmk6fjyhq000d4b63ltsp5xkp	\N	32	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune70089bfzcex3nvi2y	cml8tboql0001ll8njegn1tsj	cmk6fvjw00007hxtsirwx4s8m	\N	33	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune7008abfzchz19vgaj	cml8tboql0001ll8njegn1tsj	cmk6fkx5l000f4b63teec2nro	\N	34	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune7008bbfzc5tvoclfe	cml8tboql0001ll8njegn1tsj	cmkauuj5e0001620vtvan1277	\N	35	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune7008cbfzc0qgtawap	cml8tboql0001ll8njegn1tsj	cmkavvbot0001ft7l6yfnze23	\N	36	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmlrwune7008dbfzcrnghswwl	cml8tboql0001ll8njegn1tsj	cmkavvboy0002ft7lsl0ipbee	\N	37	2026-02-18 10:50:03.63	2026-02-18 10:50:03.63
cmljhywab003qkze0x0cqimjs	cmljhywa6003pkze01nq6cqhd	cmlano75a0002cu7jcukqxdr3	\N	0	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab003rkze06neag574	cmljhywa6003pkze01nq6cqhd	cmlca47k40000u57psb1m18kw	\N	1	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab003skze0l08aqne4	cmljhywa6003pkze01nq6cqhd	cmk6fbng100004b63c70xzv5a	\N	2	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab003tkze0pguuq0gs	cmljhywa6003pkze01nq6cqhd	cmlc1ieph00005uyjvsm75p5u	\N	3	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab003ukze0raoib3w5	cmljhywa6003pkze01nq6cqhd	cmk6fu8av0005hxtsrjafllf0	\N	4	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab003vkze0uhmyktu8	cmljhywa6003pkze01nq6cqhd	cmk6f3ym20006o43xdewhcbes	\N	5	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab003wkze0jnop0drz	cmljhywa6003pkze01nq6cqhd	cmlc1n6oq00025uyjdrjg49nv	\N	6	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab003xkze0890exi08	cmljhywa6003pkze01nq6cqhd	cmland10h0000cu7jsz5fegj7	\N	7	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab003ykze0o6xesebj	cmljhywa6003pkze01nq6cqhd	cmk6ftqqu0004hxtskccmbx2s	\N	8	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab003zkze084keyymv	cmljhywa6003pkze01nq6cqhd	cmlc1nkmq00045uyjmizci262	\N	9	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab0040kze0z0lpb6gz	cmljhywa6003pkze01nq6cqhd	cmk6f88vs0009o43x378tye2v	\N	10	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab0041kze0biv24zxk	cmljhywa6003pkze01nq6cqhd	cmko09ljq000av6kuaenx18dg	\N	11	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab0042kze0pewzpnrp	cmljhywa6003pkze01nq6cqhd	cmk6f6ndh0008o43xcv3mdzu1	\N	12	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab0043kze07z6yu435	cmljhywa6003pkze01nq6cqhd	cmk6fjyhm000c4b631modt98m	\N	13	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab0044kze0bhej9efq	cmljhywa6003pkze01nq6cqhd	cmk6fvjvy0006hxtspj3i6nks	\N	14	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab0045kze0rvy4q57j	cmljhywa6003pkze01nq6cqhd	cmk6fkx5j000e4b639whx3sxx	\N	15	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab0046kze0prr1pn8o	cmljhywa6003pkze01nq6cqhd	cmkauuj580000620v7qprf1fa	\N	16	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab0047kze0fi4sh7ka	cmljhywa6003pkze01nq6cqhd	cmkavuol30000ft7ltr5dldbf	\N	17	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab0048kze0elf6pm6r	cmljhywa6003pkze01nq6cqhd	cmkavvbot0001ft7l6yfnze23	\N	18	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab0049kze0sq0lrdi4	cmljhywa6003pkze01nq6cqhd	cmlano75d0003cu7jqhfnx28g	\N	19	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab004akze005mex8hc	cmljhywa6003pkze01nq6cqhd	cmk6f27np0004o43xbl1qfr5n	\N	20	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab004bkze0gu4clp6n	cmljhywa6003pkze01nq6cqhd	cmk6fbng600014b63lbz4hbql	\N	21	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab004ckze01jf7gk8c	cmljhywa6003pkze01nq6cqhd	cmlc1iepk00015uyj6d6vgqv4	\N	22	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab004dkze0arw3hsm6	cmljhywa6003pkze01nq6cqhd	cmlca47kl0001u57ppuopynoj	\N	23	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab004ekze0ix1jh77x	cmljhywa6003pkze01nq6cqhd	cmk6f3ym40007o43x4w1i7igj	\N	24	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab004fkze08yinhtd9	cmljhywa6003pkze01nq6cqhd	cmlc1nkms00055uyjtzywxm6a	\N	25	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab004gkze0c4smudmj	cmljhywa6003pkze01nq6cqhd	cmland10m0001cu7jnb6vyatl	\N	26	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab004hkze0bbl1cti5	cmljhywa6003pkze01nq6cqhd	cmlc1n6ot00035uyjdkg93ecp	\N	27	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab004ikze02by6jsos	cmljhywa6003pkze01nq6cqhd	cmk6f88vu000ao43x13j2f12j	\N	28	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab004jkze0pocrnhxn	cmljhywa6003pkze01nq6cqhd	cmko09lk5000bv6kuzlu1kxro	\N	29	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab004kkze0cajju55g	cmljhywa6003pkze01nq6cqhd	cmk6fjyhq000d4b63ltsp5xkp	\N	30	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab004lkze0mk0y1atr	cmljhywa6003pkze01nq6cqhd	cmk6fvjw00007hxtsirwx4s8m	\N	31	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab004mkze0ur2tph1e	cmljhywa6003pkze01nq6cqhd	cmk6fkx5l000f4b63teec2nro	\N	32	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab004nkze01ahskkrp	cmljhywa6003pkze01nq6cqhd	cmkauuj5e0001620vtvan1277	\N	33	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywab004okze01d5ky0tx	cmljhywa6003pkze01nq6cqhd	cmkavvboy0002ft7lsl0ipbee	\N	34	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywac004pkze0cdx6n649	cmljhywa6003pkze01nq6cqhd	cmk6f27nr0005o43xwyhm7een	\N	35	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywac004qkze0wa21e2l7	cmljhywa6003pkze01nq6cqhd	cmk6fc2od00034b63mc8vtlep	\N	36	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
cmljhywac004rkze02cac2ujo	cmljhywa6003pkze01nq6cqhd	cmk6fc2o500024b63vwcm68cp	\N	37	2026-02-12 13:31:18.131	2026-02-12 13:31:18.131
\.


ALTER TABLE public.production_setting_specifications ENABLE TRIGGER ALL;

--
-- Data for Name: proofing_intents; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.proofing_intents DISABLE TRIGGER ALL;

COPY public.proofing_intents (id, code, name, "jdfProofType", "jdfProofQuality", "isColorProof", "isContractProof", "displayNameKo", "basePrice", "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cml4hdu8o000p7smtzz2jrlow	PI-NONE	교정없음	None	Standard	f	f	교정 생략	0.00	1	t	2026-02-02 01:18:23.065	2026-02-02 01:18:23.065
cml4hdu8q000q7smtap7gqwqz	PI-DIGITAL	디지털 교정	Digital	Standard	t	f	디지털 컬러 프루프	0.00	2	t	2026-02-02 01:18:23.067	2026-02-02 01:18:23.067
cml4hdu8r000r7smt0dt8szfl	PI-CONTRACT	계약 교정	Proof	Standard	t	t	계약용 교정쇄	0.00	3	t	2026-02-02 01:18:23.068	2026-02-02 01:18:23.068
\.


ALTER TABLE public.proofing_intents ENABLE TRIGGER ALL;

--
-- Data for Name: purchase_ledgers; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.purchase_ledgers DISABLE TRIGGER ALL;

COPY public.purchase_ledgers (id, "ledgerNumber", "ledgerDate", "confirmDate", "supplierId", "supplierName", "supplierBizNo", "purchaseType", "taxType", "accountCode", "supplyAmount", "vatAmount", "adjustmentAmount", "totalAmount", "paidAmount", "outstandingAmount", "paymentMethod", "paymentStatus", "dueDate", "purchaseStatus", description, "adminMemo", "createdBy", "confirmedBy", "confirmedAt", "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.purchase_ledgers ENABLE TRIGGER ALL;

--
-- Data for Name: purchase_ledger_items; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.purchase_ledger_items DISABLE TRIGGER ALL;

COPY public.purchase_ledger_items (id, "purchaseLedgerId", "itemName", specification, quantity, unit, "unitPrice", "supplyAmount", "vatAmount", "totalAmount", "purchaseType", "accountCode", "sortOrder", remark) FROM stdin;
\.


ALTER TABLE public.purchase_ledger_items ENABLE TRIGGER ALL;

--
-- Data for Name: purchase_payments; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.purchase_payments DISABLE TRIGGER ALL;

COPY public.purchase_payments (id, "purchaseLedgerId", "paymentNumber", "paymentDate", amount, "paymentMethod", "bankName", "accountNumber", "journalId", note, "createdBy", "createdAt", "depositorName", "proofFileUrl") FROM stdin;
\.


ALTER TABLE public.purchase_payments ENABLE TRIGGER ALL;

--
-- Data for Name: quality_controls; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.quality_controls DISABLE TRIGGER ALL;

COPY public.quality_controls (id, code, name, "deltaE", "colorTolerance", "densityCyan", "densityMagenta", "densityYellow", "densityBlack", "dotGainTarget", "trimTolerance", "foldTolerance", "bindingTolerance", "displayNameKo", "checklistItems", "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cml4hdu8j000m7smt6ylt6v2r	QC-STD	표준품질	5.00	Standard	\N	\N	\N	\N	15	1.00	1.00	2.00	표준 품질 기준	\N	1	t	2026-02-02 01:18:23.06	2026-02-02 01:18:23.06
cml4hdu8m000n7smt9773goc8	QC-PREMIUM	프리미엄품질	3.00	Tight	\N	\N	\N	\N	15	0.50	1.00	2.00	프리미엄 품질 기준	\N	2	t	2026-02-02 01:18:23.062	2026-02-02 01:18:23.062
cml4hdu8n000o7smtn6mpwajp	QC-BASIC	기본품질	8.00	Loose	\N	\N	\N	\N	15	2.00	1.00	2.00	기본 품질 기준	\N	3	t	2026-02-02 01:18:23.063	2026-02-02 01:18:23.063
\.


ALTER TABLE public.quality_controls ENABLE TRIGGER ALL;

--
-- Data for Name: receivables; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.receivables DISABLE TRIGGER ALL;

COPY public.receivables (id, "clientId", "clientName", "clientCode", "orderId", "orderNumber", "journalId", "originalAmount", "paidAmount", balance, "issueDate", "dueDate", status, description, "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.receivables ENABLE TRIGGER ALL;

--
-- Data for Name: receivable_payments; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.receivable_payments DISABLE TRIGGER ALL;

COPY public.receivable_payments (id, "receivableId", amount, "paymentDate", "paymentMethod", description, "journalId", "createdBy", "createdAt") FROM stdin;
\.


ALTER TABLE public.receivable_payments ENABLE TRIGGER ALL;

--
-- Data for Name: reception_schedules; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.reception_schedules DISABLE TRIGGER ALL;

COPY public.reception_schedules (id, date, year, month, day, "dayOfWeek", status, "openTime", "closeTime", reason, "reasonType", "isHoliday", "holidayName", "modifiedBy", "modifiedAt", "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.reception_schedules ENABLE TRIGGER ALL;

--
-- Data for Name: regular_holiday_settings; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.regular_holiday_settings DISABLE TRIGGER ALL;

COPY public.regular_holiday_settings (id, type, "weeklyDays", "monthlyDays", "yearlyDates", "effectiveFrom", "effectiveTo", name, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.regular_holiday_settings ENABLE TRIGGER ALL;

--
-- Data for Name: sales_categories; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.sales_categories DISABLE TRIGGER ALL;

COPY public.sales_categories (id, code, name, depth, "parentId", "sortOrder", "isActive", description, "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.sales_categories ENABLE TRIGGER ALL;

--
-- Data for Name: sales_category_options; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.sales_category_options DISABLE TRIGGER ALL;

COPY public.sales_category_options (id, code, name, "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.sales_category_options ENABLE TRIGGER ALL;

--
-- Data for Name: staff; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.staff DISABLE TRIGGER ALL;

COPY public.staff (id, "staffId", password, name, "branchId", "departmentId", "position", phone, mobile, email, "postalCode", address, "addressDetail", "settlementGrade", "allowedIps", "canEditInManagerView", "canLoginAsManager", "canChangeDepositStage", "canChangeReceptionStage", "canChangeCancelStage", "canEditMemberInfo", "canViewSettlement", "canChangeOrderAmount", "memberViewScope", "salesViewScope", "menuPermissions", "categoryPermissions", "processPermissions", "isActive", "lastLoginAt", "lastLoginIp", "adminMemo", "joinDate", "createdAt", "updatedAt", "isCompany", "isDepartment", "isPersonal", "isSuperAdmin") FROM stdin;
cmlme6v3g0000gnpnwsi3mxci	aaabbb	$2b$10$SxO8fn1UvDUKOoHtVqGYLu9zmJsZU5CWeLiPa/UEt2N5OnRburKHe	이순신	cmkaiqnuj000wkz5o74elpdb6	cml5yx6f60001vvfydsrws0tg	이사	010-4191-5679	010-4400-5402	nancha10@naver.com				1	{}	f	f	f	f	f	f	f	f	own	own	{}	{}	null	t	\N	\N		2026-02-14 14:08:49.893	2026-02-14 14:08:49.9	2026-02-14 14:08:49.9	f	t	f	f
cml63cj8d000610fc52rxd1r8	admin	$2b$10$aF3uYgTSNC3iOShsRQYun.yFPs98tDF0OEFpSTBuqzPKid5q5fAHu	우영국	cmkaiqnuj000wkz5o74elpdb6	cml63cj6x000010fca2ufjfxo	대표		010-2313-1228	wooceo@gmail.com				0	{}	t	t	t	t	t	t	t	t	all	all	{"order_list": {"canView": true, "menuCode": "order_list"}, "group_price": {"canView": true, "menuCode": "group_price"}, "tax_invoice": {"canView": true, "menuCode": "tax_invoice"}, "settings_env": {"canView": true, "menuCode": "settings_env"}, "homepage_menu": {"canView": true, "menuCode": "homepage_menu"}, "homepage_popup": {"canView": true, "menuCode": "homepage_popup"}, "standard_price": {"canView": true, "menuCode": "standard_price"}, "cash_management": {"canView": true, "menuCode": "cash_management"}, "deposit_history": {"canView": true, "menuCode": "deposit_history"}, "form_management": {"canView": true, "menuCode": "form_management"}, "homepage_design": {"canView": true, "menuCode": "homepage_design"}, "spec_management": {"canView": true, "menuCode": "spec_management"}, "order_management": {"canView": true, "menuCode": "order_management"}, "paper_management": {"canView": true, "menuCode": "paper_management"}, "personal_payment": {"canView": true, "menuCode": "personal_payment"}, "price_management": {"canView": true, "menuCode": "price_management"}, "sales_statistics": {"canView": true, "menuCode": "sales_statistics"}, "staff_management": {"canView": true, "menuCode": "staff_management"}, "daily_transaction": {"canView": true, "menuCode": "daily_transaction"}, "notice_management": {"canView": true, "menuCode": "notice_management"}, "admin_modification": {"canView": true, "menuCode": "admin_modification"}, "deposit_management": {"canView": true, "menuCode": "deposit_management"}, "production_summary": {"canView": true, "menuCode": "production_summary"}, "setting_management": {"canView": true, "menuCode": "setting_management"}, "statistics_display": {"canView": true, "menuCode": "statistics_display"}, "homepage_management": {"canView": true, "menuCode": "homepage_management"}, "monthly_transaction": {"canView": true, "menuCode": "monthly_transaction"}, "production_schedule": {"canView": true, "menuCode": "production_schedule"}, "transaction_history": {"canView": true, "menuCode": "transaction_history"}, "customer_transaction": {"canView": true, "menuCode": "customer_transaction"}, "equipment_management": {"canView": true, "menuCode": "equipment_management"}, "product_registration": {"canView": true, "menuCode": "product_registration"}, "warehouse_management": {"canView": true, "menuCode": "warehouse_management"}, "watermark_management": {"canView": true, "menuCode": "watermark_management"}, "connection_management": {"canView": true, "menuCode": "connection_management"}, "half_product_category": {"canView": true, "menuCode": "half_product_category"}, "production_management": {"canView": true, "menuCode": "production_management"}, "test_order_management": {"canView": true, "menuCode": "test_order_management"}, "cover_input_management": {"canView": true, "menuCode": "cover_input_management"}, "pod_product_management": {"canView": true, "menuCode": "pod_product_management"}, "transaction_management": {"canView": true, "menuCode": "transaction_management"}, "half_product_registration": {"canView": true, "menuCode": "half_product_registration"}, "production_output_summary": {"canView": true, "menuCode": "production_output_summary"}}	{"album": true, "frame": true, "goods": true, "output": true, "booklet": true}	\N	t	2026-02-21 02:47:54.281	127.0.0.1		2026-02-03 04:20:59.869	2026-02-03 04:20:59.869	2026-02-21 02:47:54.283	f	f	t	f
\.


ALTER TABLE public.staff ENABLE TRIGGER ALL;

--
-- Data for Name: sales_ledgers; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.sales_ledgers DISABLE TRIGGER ALL;

COPY public.sales_ledgers (id, "ledgerNumber", "ledgerDate", "salesDate", "clientId", "clientName", "clientBizNo", "orderId", "orderNumber", "salesType", "taxType", "supplyAmount", "vatAmount", "shippingFee", "adjustmentAmount", "totalAmount", "receivedAmount", "outstandingAmount", "paymentMethod", "paymentStatus", "dueDate", "salesStatus", description, "adminMemo", "createdBy", "confirmedBy", "confirmedAt", "createdAt", "updatedAt", "staffId") FROM stdin;
cmlvmipi2000liev20801qvns	SL-20260221-001	2026-02-21 01:11:55.033	\N	cmlls3h030000ted7yhh6qmdh	아마레스튜디오	3072204670	cmlvming80002iev2u7dnnr1r	260221-008	ALBUM	TAXABLE	20400.00	2040.00	5500.00	0.00	27940.00	0.00	27940.00	postpaid	unpaid	\N	REGISTERED	에히오르 압축앨범 - 251220[43]주찬양 손세은_22p 좌시우끝	\N	cmlls3h030000ted7yhh6qmdh	\N	\N	2026-02-21 01:11:55.034	2026-02-21 01:11:55.034	cml63cj8d000610fc52rxd1r8
cmlvn58hl0018iev22huxig6v	SL-20260221-002	2026-02-21 01:29:26.071	\N	cmlls3h030000ted7yhh6qmdh	아마레스튜디오	3072204670	cmlvn565y000piev2wzw01ukj	260221-009	ALBUM	TAXABLE	20400.00	2040.00	5500.00	0.00	27940.00	0.00	27940.00	postpaid	unpaid	\N	REGISTERED	에히오르 압축앨범 - 리마인드[43]이광배 송지영_22p 좌시우끝	\N	cmlls3h030000ted7yhh6qmdh	\N	\N	2026-02-21 01:29:26.073	2026-02-21 01:29:26.073	cml63cj8d000610fc52rxd1r8
\.


ALTER TABLE public.sales_ledgers ENABLE TRIGGER ALL;

--
-- Data for Name: sales_ledger_items; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.sales_ledger_items DISABLE TRIGGER ALL;

COPY public.sales_ledger_items (id, "salesLedgerId", "orderItemId", "itemName", specification, quantity, "unitPrice", "supplyAmount", "vatAmount", "totalAmount", "salesType", "productId", "sortOrder", remark) FROM stdin;
cmlvmipi2000miev2v9iyfgye	cmlvmipi2000liev20801qvns	cmlvming90003iev2k3wvlq9g	에히오르 압축앨범 - 251220[43]주찬양 손세은_22p 좌시우끝	12×15인치	1	20400.00	20400.00	2040.00	22440.00	ALBUM	cmkse0z6y001p86l2dop9h1kg	0	\N
cmlvn58hl0019iev2w3rt51nx	cmlvn58hl0018iev22huxig6v	cmlvn565z000qiev2i9dz9482	에히오르 압축앨범 - 리마인드[43]이광배 송지영_22p 좌시우끝	12×15인치	1	20400.00	20400.00	2040.00	22440.00	ALBUM	cmkse0z6y001p86l2dop9h1kg	0	\N
\.


ALTER TABLE public.sales_ledger_items ENABLE TRIGGER ALL;

--
-- Data for Name: sales_receipts; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.sales_receipts DISABLE TRIGGER ALL;

COPY public.sales_receipts (id, "salesLedgerId", "receiptNumber", "receiptDate", amount, "paymentMethod", "bankName", "depositorName", "journalId", note, "createdBy", "createdAt", "accountNumber", "proofFileUrl") FROM stdin;
\.


ALTER TABLE public.sales_receipts ENABLE TRIGGER ALL;

--
-- Data for Name: schedules; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.schedules DISABLE TRIGGER ALL;

COPY public.schedules (id, "creatorId", "creatorName", "creatorDeptId", "creatorDeptName", title, description, location, "startAt", "endAt", "isAllDay", "isPersonal", "isDepartment", "isCompany", "sharedDeptIds", "scheduleType", reminders, "isRecurring", "recurringRule", "recurringEnd", "parentId", attendees, color, tags, "relatedType", "relatedId", status, "createdAt", "updatedAt", "recurringConfig") FROM stdin;
cmkyzb8qy00011nit35859evo	cmks8xaa70000n53cud7q38bl	사용자	\N	\N	베베리움 안양점 미팅		안양	2026-01-30 09:30:00	2026-01-28 16:00:00	f	t	f	f	{}	meeting	null	f	\N	\N	\N	null	#3B82F6	{}	\N	\N	confirmed	2026-01-29 04:53:37.93	2026-01-29 04:53:37.93	null
cmkyzc91700021nitf4ny9oyg	cmks8xaa70000n53cud7q38bl	사용자	\N	\N	베베리움 안양점 미팅		안양	2026-01-29 15:00:00	2026-01-29 21:00:00	f	t	f	f	{}	meeting	null	f	\N	\N	\N	null	#3B82F6	{}	\N	\N	confirmed	2026-01-29 04:54:24.955	2026-01-29 04:54:24.955	null
cml5yng20000412reeqzhtrdy	cmk5cpt1z0000ijuehpm9vtid	사용자	\N	\N	플로우 원고마감 확인 금일 2/3	레이져파일 만들어야함		2026-02-02 15:00:00	2026-02-02 16:00:00	f	t	f	f	{}	meeting	null	f	\N	\N	\N	null	#3B82F6	{}	\N	\N	confirmed	2026-02-03 02:09:30.888	2026-02-03 02:09:30.888	null
cml4kt3mf0000wvlw12yq51wt	cmks8xaa70000n53cud7q38bl	사용자	\N	\N	이너프졸업 출고마감	12일졸업 120권정도 스타앨범		2026-02-10 08:00:00	2026-02-09 16:00:00	f	t	t	t	{}	meeting	null	f	\N	\N	\N	null	#3B82F6	{}	\N	\N	confirmed	2026-02-02 02:54:13.911	2026-02-03 03:38:16.363	null
cml5wz1ql000012re89p64xjc	cmk5cpt1z0000ijuehpm9vtid	사용자	\N	\N	거창군졸업앨범17부 출고마감	24일 졸업식		2026-02-19 15:00:00	2026-02-19 16:00:00	f	t	t	t	{}	meeting	null	f	\N	\N	\N	null	#3B82F6	{}	\N	\N	confirmed	2026-02-03 01:22:32.973	2026-02-03 03:38:20.303	null
cml4kuez40001wvlwmy23xzhn	cmks8xaa70000n53cud7q38bl	사용자	\N	\N	플로우 출고마감	10x10_14p 20부		2026-02-19 15:00:00	2026-02-19 16:00:00	f	t	t	t	{}	meeting	null	f	\N	\N	\N	null	#ff0f1b	{}	\N	\N	confirmed	2026-02-02 02:55:15.28	2026-02-03 03:38:52.434	null
\.


ALTER TABLE public.schedules ENABLE TRIGGER ALL;

--
-- Data for Name: settlements; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.settlements DISABLE TRIGGER ALL;

COPY public.settlements (id, "periodType", "periodStart", "periodEnd", "totalSales", "totalPurchases", "totalIncome", "totalExpense", "receivablesBalance", "payablesBalance", "netProfit", "netCashFlow", status, "confirmedBy", "confirmedAt", "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.settlements ENABLE TRIGGER ALL;

--
-- Data for Name: specification_prices; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.specification_prices DISABLE TRIGGER ALL;

COPY public.specification_prices (id, "specificationId", "priceType", "groupId", price, "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.specification_prices ENABLE TRIGGER ALL;

--
-- Data for Name: staff_clients; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.staff_clients DISABLE TRIGGER ALL;

COPY public.staff_clients (id, "staffId", "clientId", "isPrimary", "createdAt") FROM stdin;
cmllmmkpy0001iowxnn9po88t	cml63cj8d000610fc52rxd1r8	cmkg8vzuf0000at5m0dyaydie	t	2026-02-14 01:17:13.702
cmllmmkq90003iowxvz7d32mg	cml63cj8d000610fc52rxd1r8	cmlc48lcw00017cvnisoyrvqk	t	2026-02-14 01:17:13.713
cmllmmkqf0005iowxn6cr4fvn	cml63cj8d000610fc52rxd1r8	cml5w4ssp0001v7vnm48qzlwz	t	2026-02-14 01:17:13.719
cmllt35zn0001y7peumv6nkgu	cml63cj8d000610fc52rxd1r8	cmlls3h030000ted7yhh6qmdh	t	2026-02-14 04:18:05.459
\.


ALTER TABLE public.staff_clients ENABLE TRIGGER ALL;

--
-- Data for Name: standard_sizes; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.standard_sizes DISABLE TRIGGER ALL;

COPY public.standard_sizes (id, name, "widthInch", "heightInch", ratio, "ratioLabel", "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.standard_sizes ENABLE TRIGGER ALL;

--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.system_settings DISABLE TRIGGER ALL;

COPY public.system_settings (id, key, value, category, label, "createdAt", "updatedAt") FROM stdin;
cmkagjh2s000okz5o7nh3mf73	printing_indigo_1color_cost	21	printing	인디고 1도 인쇄비	2026-01-12 01:01:41.032	2026-01-12 01:12:12.668
cmklxtuo9000156sbh24up53e	shipping_include_jeju	true	shipping	제주도 포함	2026-01-20 01:51:06.633	2026-01-20 01:51:06.633
cmklxtuo9000356sbrrv3ufp6	shipping_include_islands	true	shipping	섬지역 포함	2026-01-20 01:51:06.633	2026-01-20 01:51:06.633
cmklxtuo9000256sbtmiec5i9	shipping_standard_fee	5500	shipping	일반 택배비	2026-01-20 01:51:06.633	2026-01-20 01:51:06.633
cmklxtuo9000056sbtlal2oy7	shipping_free_threshold	90000	shipping	무료배송 기준금액	2026-01-20 01:51:06.633	2026-01-20 01:51:06.633
cmklxtupz000456sb9tn3skow	shipping_include_mountain	true	shipping	산간지역 포함	2026-01-20 01:51:06.633	2026-01-20 01:51:06.633
cmklxtuq3000556sb7zf47dr7	shipping_island_fee	7500	shipping	도서산간 택배비	2026-01-20 01:51:06.633	2026-01-20 01:51:06.633
cmko1hido000qv6kusuep2na8	company_business_type	제조업 서비스	company	업태	2026-01-21 13:09:01.64	2026-01-28 02:22:30.12
cmko1hidq000wv6kur1si3sxt	company_business_category	인쇄 사진	company	종목	2026-01-21 13:09:01.641	2026-01-28 02:22:30.12
cmko1hido000rv6kuo0evhq0t	company_name	(주)프린팅솔루션즈	company	회사명	2026-01-21 13:09:01.64	2026-01-28 02:22:30.12
cmko1hie50014v6kunfyr5rps	company_admin_domain		company	관리자도메인	2026-01-21 13:09:01.644	2026-01-28 02:22:30.121
cmko1hief0016v6kuxu9clq4w	company_ecommerce_number	성남시 031-729-2805	company	통신판매번호	2026-01-21 13:09:01.643	2026-01-28 02:22:30.12
cmko1hie20011v6ku5wmhyuwi	company_address_detail	벽산테크노타운 311호	company	상세주소	2026-01-21 13:09:01.644	2026-01-28 02:22:30.121
cmko1hidp000vv6kuk0ttv5lc	company_cs_hours	평일 09~18:00(접심시간 12:00~13:00)	company	운영시간	2026-01-21 13:09:01.644	2026-01-28 02:22:30.121
cmko1hie30013v6kukk3bci57	company_postal_code	13515	company	우편번호	2026-01-21 13:09:01.644	2026-01-28 02:22:30.12
cmko1hido000sv6kuemwjvaxm	company_ceo	우영국	company	대표자	2026-01-21 13:09:01.641	2026-01-28 02:22:30.12
cmko1hie2000zv6ku6c6g32z6	company_domain		company	도메인	2026-01-21 13:09:01.644	2026-01-28 02:22:30.121
cmko1hie0000xv6kuiwa4qltx	company_address	성남시 중원구 둔촌대로560	company	주소	2026-01-21 13:09:01.644	2026-01-28 02:22:30.121
cmko1hie70015v6ku8j38bmm9	company_fax	02-6263-7683	company	팩스	2026-01-21 13:09:01.644	2026-01-28 02:22:30.12
cmko1hido000uv6kuxqsm0crq	company_email	photome5478@naver.com	company	이메일	2026-01-21 13:09:01.643	2026-01-28 02:22:30.12
cmko1hido000tv6kusna8rrkt	company_phone	02-6263-7682	company	대표전화	2026-01-21 13:09:01.643	2026-01-28 02:22:30.12
cmko1hie20010v6kurihw0yld	company_server_info		company	서버정보	2026-01-21 13:09:01.644	2026-01-28 02:22:30.121
cmko1hie30012v6kuwa81v5fj	company_business_number	201-86-02186	company	사업자번호	2026-01-21 13:09:01.642	2026-01-28 02:22:30.12
cmko1hie1000yv6kunf99x13q	company_cs_phone	1800-7682	company	고객센터	2026-01-21 13:09:01.644	2026-01-28 02:22:30.12
cmkyolejd00008b9upx13d8ek	process_enabled_stages	["reception_waiting","payment_waiting","reception_complete","print_waiting","printing","print_complete","binding_waiting","binding","binding_complete","shipping_waiting","shipping","delivered","transaction_complete","reception_hold","file_inspection"]	process	활성화된 공정단계	2026-01-28 23:53:36.217	2026-02-14 02:25:40.702
cmlmctcqc000qiqzt2x5760hr	server_backup_path	X:\\volume1\\backup\\printing114	server	백업 경로	2026-02-14 13:30:19.348	2026-02-21 02:46:17.294
cmlmctcou000niqztg8ffhic4	server_upload_base_path	X:\\volume1\\docker\\printing114\\uploads	server	업로드 기본경로	2026-02-14 13:30:19.348	2026-02-21 02:46:17.294
cmlmctc9f000miqzt6s285q01	server_order_storage_path		server	주문파일 저장경로	2026-02-14 13:30:19.348	2026-02-21 02:46:17.294
cmlmctcq0000oiqzt9r68w2xe	server_nas_ip		server	NAS IP	2026-02-14 13:30:19.348	2026-02-21 02:46:17.294
cmlmctcq9000piqztkgf2n6f7	server_nas_port	5003	server	NAS 포트	2026-02-14 13:30:19.348	2026-02-21 02:46:17.294
\.


ALTER TABLE public.system_settings ENABLE TRIGGER ALL;

--
-- Data for Name: todos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.todos DISABLE TRIGGER ALL;

COPY public.todos (id, "creatorId", "creatorName", "creatorDeptId", "creatorDeptName", title, content, priority, "startDate", "dueDate", "isAllDay", status, "completedAt", "completedBy", "isPersonal", "isDepartment", "isCompany", "sharedDeptIds", "reminderAt", "isReminderSent", "isRecurring", "recurringType", "recurringEnd", "relatedType", "relatedId", color, tags, "createdAt", "updatedAt") FROM stdin;
cmkyz9qtt00001nitj6ik1n7c	cmks8xaa70000n53cud7q38bl	사용자	\N	\N	아베끄동판 접수		normal	2026-01-28 15:00:00	2026-01-29 14:59:00	f	pending	\N	\N	t	f	f	{}	\N	f	f	\N	\N	\N	\N	#3B82F6	{}	2026-01-29 04:52:28.049	2026-01-29 04:52:28.049
cml7r93t80000802tofys908n	cml63cj8d000610fc52rxd1r8	사용자	\N	\N	현지에서 원목액자 가져올것		normal	\N	\N	f	pending	\N	\N	t	f	f	{}	\N	f	f	\N	\N	\N	\N	#3B82F6	{}	2026-02-04 08:17:56.876	2026-02-04 08:17:56.876
cml7r9yyp0001802tr6nx8saz	cml63cj8d000610fc52rxd1r8	사용자	\N	\N	플로우 액자가격표 보낼것		normal	\N	\N	f	pending	\N	\N	t	f	f	{}	\N	f	f	\N	\N	\N	\N	#3B82F6	{}	2026-02-04 08:18:37.249	2026-02-04 08:18:37.249
cml5yokmo000612reb3ix14j4	cmk5cpt1z0000ijuehpm9vtid	사용자	\N	\N	플로우 원고 레이져파일 만들어야함		normal	2026-02-02 15:00:00	2026-02-03 14:59:00	f	completed	2026-02-04 08:33:40.599	\N	t	f	f	{}	\N	f	f	\N	\N	\N	\N	#3B82F6	{}	2026-02-03 02:10:23.472	2026-02-04 08:33:40.6
cmlam3kvi001a6isgbpmf7ocs	cmkg8vzuf0000at5m0dyaydie	사용자	\N	\N	샘플표지제작		normal	\N	2026-02-28 08:16:00	f	pending	\N	\N	t	t	f	{}	\N	f	f	\N	\N	\N	\N	#3B82F6	{}	2026-02-06 08:16:59.502	2026-02-06 08:16:59.502
cmlc43saz00007cvnphg2xql5	cml5w4ssp0001v7vnm48qzlwz	사용자	\N	\N	로엔코코 신봉섭대표	본식제작업체 010-4400-5402	normal	\N	\N	f	pending	\N	\N	t	f	f	{}	\N	f	f	\N	\N	\N	\N	#3B82F6	{}	2026-02-07 09:28:48.395	2026-02-07 09:28:48.395
\.


ALTER TABLE public.todos ENABLE TRIGGER ALL;

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.users DISABLE TRIGGER ALL;

COPY public.users (id, email, password, name, role, "isActive", "createdAt", "updatedAt") FROM stdin;
cmk5cpt1z0000ijuehpm9vtid	admin@printing-erp.com	$2b$10$pkTmO8AUAt19kq5RiMwLa.pDQUOI63yVVAeYd7M45GKa73jqHJrR.	관리자	admin	t	2026-01-08 11:15:47.159	2026-01-08 11:15:47.159
cmk5cpt270001ijue6jqvlvbb	manager@printing-erp.com	$2b$10$pkTmO8AUAt19kq5RiMwLa.pDQUOI63yVVAeYd7M45GKa73jqHJrR.	매니저	manager	t	2026-01-08 11:15:47.168	2026-01-08 11:15:47.168
cmks8xaa70000n53cud7q38bl	wooceo@gmail.com	$2b$10$/pfhQamo74TteRgbwxhuau4MraSOhEfnEU80ABmKgZBCnpaJWlolu	관리자	admin	t	2026-01-24 11:48:19.663	2026-01-24 11:48:19.663
\.


ALTER TABLE public.users ENABLE TRIGGER ALL;

--
-- PostgreSQL database dump complete
--


