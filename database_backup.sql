--
-- PostgreSQL database dump
--

\restrict kVwACo0keV3I9SVcVGaZmMrfnML612G9k9AuumwjYgviYmJkjgt8njlczQjhRnT

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AccountType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AccountType" AS ENUM (
    'ASSET',
    'LIABILITY',
    'EQUITY',
    'REVENUE',
    'EXPENSE'
);


ALTER TYPE public."AccountType" OWNER TO postgres;

--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TransactionType" AS ENUM (
    'DEBIT',
    'CREDIT'
);


ALTER TYPE public."TransactionType" OWNER TO postgres;

--
-- Name: VoucherType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."VoucherType" AS ENUM (
    'RECEIPT',
    'PAYMENT',
    'TRANSFER'
);


ALTER TYPE public."VoucherType" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    type public."AccountType" NOT NULL,
    "parentId" text,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_accounts (
    id text NOT NULL,
    "accountName" text NOT NULL,
    "bankName" text NOT NULL,
    "accountNumber" text NOT NULL,
    "accountHolder" text,
    balance numeric(14,2) DEFAULT 0 NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.bank_accounts OWNER TO postgres;

--
-- Name: branches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.branches (
    id text NOT NULL,
    "branchCode" text NOT NULL,
    "branchName" text NOT NULL,
    "isHeadquarters" boolean DEFAULT false NOT NULL,
    address text,
    phone text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.branches OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id text NOT NULL,
    code text,
    name text NOT NULL,
    level text NOT NULL,
    depth integer DEFAULT 1 NOT NULL,
    "parentId" text,
    "isVisible" boolean DEFAULT true NOT NULL,
    "isTopMenu" boolean DEFAULT false NOT NULL,
    "loginVisibility" text DEFAULT 'always'::text NOT NULL,
    "categoryType" text DEFAULT 'HTML'::text NOT NULL,
    "productionForm" text,
    "isOutsourced" boolean DEFAULT false NOT NULL,
    "pricingUnit" text,
    description text,
    "linkUrl" text,
    "htmlContent" text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "iconUrl" text,
    "salesCategoryId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: client_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_groups (
    id text NOT NULL,
    "groupCode" text NOT NULL,
    "groupName" text NOT NULL,
    "branchId" text NOT NULL,
    "generalDiscount" integer DEFAULT 100 NOT NULL,
    "premiumDiscount" integer DEFAULT 100 NOT NULL,
    "importedDiscount" integer DEFAULT 100 NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.client_groups OWNER TO postgres;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id text NOT NULL,
    "clientCode" text NOT NULL,
    "clientName" text NOT NULL,
    "businessNumber" text,
    representative text,
    phone text,
    mobile text,
    email text,
    password text,
    "postalCode" text,
    address text,
    "addressDetail" text,
    "groupId" text,
    "memberType" text DEFAULT 'individual'::text NOT NULL,
    "oauthProvider" text,
    "oauthId" text,
    "priceType" text DEFAULT 'standard'::text NOT NULL,
    "paymentType" text DEFAULT 'order'::text NOT NULL,
    "creditEnabled" boolean DEFAULT false NOT NULL,
    "creditPeriodDays" integer,
    "creditPaymentDay" integer,
    "creditBlocked" boolean DEFAULT false NOT NULL,
    "creditBlockedAt" timestamp(3) without time zone,
    "lastPaymentDate" timestamp(3) without time zone,
    "shippingType" text DEFAULT 'conditional'::text NOT NULL,
    "creditGrade" text DEFAULT 'B'::text NOT NULL,
    "paymentTerms" integer DEFAULT 30 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    "businessType" text,
    "businessCategory" text,
    "taxInvoiceEmail" text,
    "taxInvoiceMethod" text,
    "contactPerson" text,
    "contactPhone" text,
    "mainGenre" text,
    "monthlyOrderVolume" text,
    "colorProfile" text,
    "acquisitionChannel" text,
    "preferredSize" text,
    "preferredFinish" text,
    "hasLogo" boolean DEFAULT false NOT NULL,
    "logoPath" text,
    "deliveryNote" text,
    "memberGrade" text DEFAULT 'normal'::text NOT NULL,
    "assignedManager" text,
    "sensitivityScore" integer DEFAULT 3 NOT NULL,
    "recentMemo" text,
    "totalClaims" integer DEFAULT 0 NOT NULL,
    "isBlacklist" boolean DEFAULT false NOT NULL,
    "isWhitelist" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: consultation_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consultation_alerts (
    id text NOT NULL,
    "clientId" text,
    "consultationId" text,
    "alertType" text NOT NULL,
    "alertLevel" text DEFAULT 'warning'::text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    "triggerCondition" jsonb,
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    "readBy" text,
    "isResolved" boolean DEFAULT false NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    "resolvedBy" text,
    resolution text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone
);


ALTER TABLE public.consultation_alerts OWNER TO postgres;

--
-- Name: consultation_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consultation_categories (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "colorCode" text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.consultation_categories OWNER TO postgres;

--
-- Name: consultation_channels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consultation_channels (
    id text NOT NULL,
    "consultationId" text NOT NULL,
    channel text NOT NULL,
    "channelDetail" text,
    direction text DEFAULT 'inbound'::text NOT NULL,
    "callDuration" integer,
    "callRecordUrl" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.consultation_channels OWNER TO postgres;

--
-- Name: consultation_follow_ups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consultation_follow_ups (
    id text NOT NULL,
    "consultationId" text NOT NULL,
    content text NOT NULL,
    "actionType" text NOT NULL,
    "staffId" text NOT NULL,
    "staffName" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.consultation_follow_ups OWNER TO postgres;

--
-- Name: consultation_guides; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consultation_guides (
    id text NOT NULL,
    "categoryId" text,
    "tagCodes" text[] DEFAULT ARRAY[]::text[],
    title text NOT NULL,
    problem text NOT NULL,
    solution text NOT NULL,
    scripts jsonb,
    "relatedGuideIds" text[] DEFAULT ARRAY[]::text[],
    attachments jsonb,
    "usageCount" integer DEFAULT 0 NOT NULL,
    "helpfulCount" integer DEFAULT 0 NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.consultation_guides OWNER TO postgres;

--
-- Name: consultation_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consultation_messages (
    id text NOT NULL,
    "consultationId" text NOT NULL,
    direction text NOT NULL,
    channel text DEFAULT 'kakao'::text NOT NULL,
    content text NOT NULL,
    attachments jsonb,
    "senderName" text,
    "senderType" text,
    "staffId" text,
    "staffName" text,
    "messageAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.consultation_messages OWNER TO postgres;

--
-- Name: consultation_slas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consultation_slas (
    id text NOT NULL,
    name text NOT NULL,
    "categoryId" text,
    priority text,
    "firstResponseTarget" integer DEFAULT 60 NOT NULL,
    "resolutionTarget" integer DEFAULT 1440 NOT NULL,
    "escalationTime" integer,
    "escalateTo" text,
    "warningThreshold" integer DEFAULT 80 NOT NULL,
    "criticalThreshold" integer DEFAULT 100 NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.consultation_slas OWNER TO postgres;

--
-- Name: consultation_stat_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consultation_stat_snapshots (
    id text NOT NULL,
    period text NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    "totalCount" integer DEFAULT 0 NOT NULL,
    "claimCount" integer DEFAULT 0 NOT NULL,
    "inquiryCount" integer DEFAULT 0 NOT NULL,
    "salesCount" integer DEFAULT 0 NOT NULL,
    "resolvedCount" integer DEFAULT 0 NOT NULL,
    "pendingCount" integer DEFAULT 0 NOT NULL,
    "avgFirstResponseTime" numeric(10,2),
    "avgResolutionTime" numeric(10,2),
    "slaComplianceRate" numeric(5,2),
    "avgSatisfactionScore" numeric(3,2),
    "channelStats" jsonb,
    "categoryStats" jsonb,
    "tagStats" jsonb,
    "counselorStats" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.consultation_stat_snapshots OWNER TO postgres;

--
-- Name: consultation_surveys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consultation_surveys (
    id text NOT NULL,
    "consultationId" text NOT NULL,
    "satisfactionScore" integer NOT NULL,
    "responseSpeedScore" integer,
    "resolutionScore" integer,
    "friendlinessScore" integer,
    feedback text,
    "wouldRecommend" boolean,
    "surveyMethod" text DEFAULT 'email'::text NOT NULL,
    "surveyedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.consultation_surveys OWNER TO postgres;

--
-- Name: consultation_tag_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consultation_tag_mappings (
    id text NOT NULL,
    "consultationId" text NOT NULL,
    "tagId" text NOT NULL,
    "isAutoTagged" boolean DEFAULT false NOT NULL,
    confidence numeric(3,2),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.consultation_tag_mappings OWNER TO postgres;

--
-- Name: consultation_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consultation_tags (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "colorCode" text,
    category text DEFAULT 'claim'::text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isAutoTag" boolean DEFAULT false NOT NULL,
    keywords text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.consultation_tags OWNER TO postgres;

--
-- Name: consultations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consultations (
    id text NOT NULL,
    "consultNumber" text NOT NULL,
    "clientId" text NOT NULL,
    "categoryId" text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "orderId" text,
    "orderNumber" text,
    "counselorId" text NOT NULL,
    "counselorName" text NOT NULL,
    "consultedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    "openedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "openedBy" text,
    "inProgressAt" timestamp(3) without time zone,
    "inProgressBy" text,
    "closedAt" timestamp(3) without time zone,
    "closedBy" text,
    resolution text,
    "resolvedAt" timestamp(3) without time zone,
    "resolvedBy" text,
    "followUpDate" timestamp(3) without time zone,
    "followUpNote" text,
    "kakaoScheduled" boolean DEFAULT false NOT NULL,
    "kakaoSendAt" timestamp(3) without time zone,
    "kakaoSentAt" timestamp(3) without time zone,
    "kakaoMessage" text,
    attachments jsonb,
    "internalMemo" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.consultations OWNER TO postgres;

--
-- Name: copper_plate_histories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.copper_plate_histories (
    id text NOT NULL,
    "copperPlateId" text NOT NULL,
    "actionType" text NOT NULL,
    "previousStatus" text,
    "newStatus" text,
    "previousLocation" text,
    "newLocation" text,
    "orderId" text,
    "orderNumber" text,
    description text,
    "actionById" text,
    "actionBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.copper_plate_histories OWNER TO postgres;

--
-- Name: copper_plates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.copper_plates (
    id text NOT NULL,
    "clientId" text NOT NULL,
    "plateName" text NOT NULL,
    "plateCode" text,
    "plateType" text DEFAULT 'copper'::text NOT NULL,
    "foilColor" text NOT NULL,
    "foilColorName" text,
    "foilPosition" text,
    "widthMm" numeric(10,2),
    "heightMm" numeric(10,2),
    "storageLocation" text,
    "imageUrl" text,
    "aiFileUrl" text,
    "designFileUrl" text,
    "appliedAlbumName" text,
    "albumPhotoUrl" text,
    notes text,
    "registeredById" text,
    "registeredBy" text,
    "registeredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status text DEFAULT 'stored'::text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "usageCount" integer DEFAULT 0 NOT NULL,
    "firstUsedAt" timestamp(3) without time zone,
    "lastUsedAt" timestamp(3) without time zone,
    "returnedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.copper_plates OWNER TO postgres;

--
-- Name: custom_options; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_options (
    id text NOT NULL,
    "productId" text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    "values" jsonb,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    "isRequired" boolean DEFAULT false NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.custom_options OWNER TO postgres;

--
-- Name: customer_health_scores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_health_scores (
    id text NOT NULL,
    "clientId" text NOT NULL,
    "claimScore" integer DEFAULT 100 NOT NULL,
    "satisfactionScore" integer DEFAULT 100 NOT NULL,
    "loyaltyScore" integer DEFAULT 100 NOT NULL,
    "communicationScore" integer DEFAULT 100 NOT NULL,
    "totalScore" integer DEFAULT 100 NOT NULL,
    grade text DEFAULT 'A'::text NOT NULL,
    "isAtRisk" boolean DEFAULT false NOT NULL,
    "riskReason" text,
    "lastCalculatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.customer_health_scores OWNER TO postgres;

--
-- Name: delivery_pricings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_pricings (
    id text NOT NULL,
    "deliveryMethod" text NOT NULL,
    name text NOT NULL,
    "baseFee" numeric(10,2) DEFAULT 0 NOT NULL,
    "distanceRanges" jsonb,
    "extraPricePerKm" numeric(10,2),
    "maxBaseDistance" integer,
    "nightSurchargeRate" numeric(5,2),
    "nightStartHour" integer DEFAULT 22,
    "nightEndHour" integer DEFAULT 6,
    "weekendSurchargeRate" numeric(5,2),
    "sizeRanges" jsonb,
    "islandFee" numeric(10,2),
    "freeThreshold" numeric(10,2),
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.delivery_pricings OWNER TO postgres;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- Name: fabric_suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fabric_suppliers (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    phone text,
    mobile text,
    email text,
    fax text,
    "postalCode" text,
    address text,
    "addressDetail" text,
    representative text,
    website text,
    description text,
    memo text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.fabric_suppliers OWNER TO postgres;

--
-- Name: fabrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fabrics (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    category text DEFAULT 'cloth'::text NOT NULL,
    material text DEFAULT 'cotton'::text NOT NULL,
    "colorCode" text,
    "colorName" text,
    "widthCm" numeric(10,2),
    thickness numeric(10,3),
    weight numeric(10,2),
    "supplierId" text,
    "basePrice" numeric(12,2) DEFAULT 0 NOT NULL,
    "unitType" text DEFAULT 'm'::text NOT NULL,
    "discountRate" numeric(5,2) DEFAULT 0 NOT NULL,
    "discountPrice" numeric(12,2),
    "stockQuantity" integer DEFAULT 0 NOT NULL,
    "minStockLevel" integer DEFAULT 0 NOT NULL,
    "forAlbumCover" boolean DEFAULT false NOT NULL,
    "forBoxCover" boolean DEFAULT false NOT NULL,
    "forFrameCover" boolean DEFAULT false NOT NULL,
    "forOther" boolean DEFAULT false NOT NULL,
    "imageUrl" text,
    "thumbnailUrl" text,
    description text,
    memo text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.fabrics OWNER TO postgres;

--
-- Name: group_half_product_prices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_half_product_prices (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "halfProductId" text NOT NULL,
    price numeric(12,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.group_half_product_prices OWNER TO postgres;

--
-- Name: group_product_prices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_product_prices (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "productId" text NOT NULL,
    price numeric(12,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.group_product_prices OWNER TO postgres;

--
-- Name: group_production_setting_prices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_production_setting_prices (
    id text NOT NULL,
    "clientGroupId" text NOT NULL,
    "productionSettingId" text NOT NULL,
    "specificationId" text,
    "minQuantity" integer,
    "maxQuantity" integer,
    weight numeric(5,2),
    price numeric(12,2) DEFAULT 0 NOT NULL,
    "singleSidedPrice" numeric(12,2),
    "doubleSidedPrice" numeric(12,2),
    "fourColorSinglePrice" numeric(12,2),
    "fourColorDoublePrice" numeric(12,2),
    "sixColorSinglePrice" numeric(12,2),
    "sixColorDoublePrice" numeric(12,2),
    "basePages" integer,
    "basePrice" numeric(12,2),
    "pricePerPage" numeric(12,2),
    "rangePrices" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "priceGroupId" text
);


ALTER TABLE public.group_production_setting_prices OWNER TO postgres;

--
-- Name: half_product_options; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.half_product_options (
    id text NOT NULL,
    "halfProductId" text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    "values" jsonb NOT NULL,
    "quantityType" text DEFAULT 'auto'::text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.half_product_options OWNER TO postgres;

--
-- Name: half_product_price_tiers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.half_product_price_tiers (
    id text NOT NULL,
    "halfProductId" text NOT NULL,
    "minQuantity" integer NOT NULL,
    "maxQuantity" integer,
    "discountRate" double precision NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.half_product_price_tiers OWNER TO postgres;

--
-- Name: half_product_specifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.half_product_specifications (
    id text NOT NULL,
    "halfProductId" text NOT NULL,
    name text NOT NULL,
    "widthMm" double precision NOT NULL,
    "heightMm" double precision NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.half_product_specifications OWNER TO postgres;

--
-- Name: half_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.half_products (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "categoryLargeId" text NOT NULL,
    "basePrice" numeric(12,2) NOT NULL,
    "isPriceAdditive" boolean DEFAULT true NOT NULL,
    "memberType" text DEFAULT 'all'::text NOT NULL,
    "requiredFileCount" integer DEFAULT 0 NOT NULL,
    "thumbnailUrl" text,
    "detailImages" text[] DEFAULT ARRAY[]::text[],
    status text DEFAULT 'active'::text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.half_products OWNER TO postgres;

--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.journal_entries (
    id text NOT NULL,
    "journalId" text NOT NULL,
    "accountId" text NOT NULL,
    "transactionType" public."TransactionType" NOT NULL,
    amount numeric(12,2) NOT NULL,
    description text,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.journal_entries OWNER TO postgres;

--
-- Name: journals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.journals (
    id text NOT NULL,
    "voucherNo" text NOT NULL,
    "voucherType" public."VoucherType" NOT NULL,
    "journalDate" timestamp(3) without time zone NOT NULL,
    "clientId" text,
    "clientName" text,
    description text,
    "totalAmount" numeric(12,2) NOT NULL,
    "orderId" text,
    "orderNumber" text,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.journals OWNER TO postgres;

--
-- Name: my_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.my_products (
    id text NOT NULL,
    "clientId" text NOT NULL,
    "productType" text NOT NULL,
    "productId" text NOT NULL,
    "customName" text,
    "customThumbnail" text,
    "registrationType" text NOT NULL,
    "registeredBy" text NOT NULL,
    "defaultOptions" jsonb,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "usageCount" integer DEFAULT 0 NOT NULL,
    "lastUsedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.my_products OWNER TO postgres;

--
-- Name: order_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_files (
    id text NOT NULL,
    "orderItemId" text NOT NULL,
    "fileName" text NOT NULL,
    "fileUrl" text NOT NULL,
    "thumbnailUrl" text,
    "pageRange" text NOT NULL,
    "pageStart" integer NOT NULL,
    "pageEnd" integer NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL,
    "widthInch" double precision NOT NULL,
    "heightInch" double precision NOT NULL,
    dpi integer NOT NULL,
    "fileSize" integer NOT NULL,
    "inspectionStatus" text DEFAULT 'pending'::text NOT NULL,
    "inspectionNote" text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.order_files OWNER TO postgres;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productionNumber" text NOT NULL,
    "productId" text NOT NULL,
    "productName" text NOT NULL,
    size text NOT NULL,
    pages integer NOT NULL,
    "printMethod" text NOT NULL,
    paper text NOT NULL,
    "bindingType" text NOT NULL,
    "coverMaterial" text,
    "foilName" text,
    "foilColor" text,
    "finishingOptions" text[] DEFAULT ARRAY[]::text[],
    quantity integer NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    "totalPrice" numeric(12,2) NOT NULL
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_shippings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_shippings (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "recipientName" text NOT NULL,
    phone text NOT NULL,
    "postalCode" text NOT NULL,
    address text NOT NULL,
    "addressDetail" text,
    "courierCode" text,
    "trackingNumber" text,
    "shippedAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone
);


ALTER TABLE public.order_shippings OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id text NOT NULL,
    "orderNumber" text NOT NULL,
    barcode text NOT NULL,
    "clientId" text NOT NULL,
    "productPrice" numeric(12,2) NOT NULL,
    "shippingFee" numeric(10,2) DEFAULT 0 NOT NULL,
    tax numeric(10,2) DEFAULT 0 NOT NULL,
    "adjustmentAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    "totalAmount" numeric(12,2) NOT NULL,
    "finalAmount" numeric(12,2) NOT NULL,
    "paymentMethod" text DEFAULT 'postpaid'::text NOT NULL,
    "paymentStatus" text DEFAULT 'pending'::text NOT NULL,
    status text DEFAULT 'pending_receipt'::text NOT NULL,
    "currentProcess" text DEFAULT 'receipt_pending'::text NOT NULL,
    "isUrgent" boolean DEFAULT false NOT NULL,
    "requestedDeliveryDate" timestamp(3) without time zone,
    "customerMemo" text,
    "productMemo" text,
    "adminMemo" text,
    "orderedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: paper_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.paper_groups (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    color text NOT NULL,
    "basePrice" numeric(12,2) DEFAULT 0 NOT NULL,
    "unitType" text DEFAULT 'ream'::text NOT NULL,
    description text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.paper_groups OWNER TO postgres;

--
-- Name: paper_manufacturers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.paper_manufacturers (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    country text,
    website text,
    "contactInfo" text,
    description text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.paper_manufacturers OWNER TO postgres;

--
-- Name: paper_prices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.paper_prices (
    id text NOT NULL,
    "paperId" text NOT NULL,
    "priceType" text DEFAULT 'base'::text NOT NULL,
    "groupId" text,
    "minQuantity" integer,
    "maxQuantity" integer,
    price numeric(12,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.paper_prices OWNER TO postgres;

--
-- Name: paper_suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.paper_suppliers (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    phone text,
    mobile text,
    email text,
    fax text,
    "postalCode" text,
    address text,
    "addressDetail" text,
    representative text,
    website text,
    description text,
    memo text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.paper_suppliers OWNER TO postgres;

--
-- Name: papers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.papers (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "paperGroupId" text,
    "manufacturerId" text,
    "supplierId" text,
    "paperType" text DEFAULT 'sheet'::text NOT NULL,
    "sheetSize" text,
    "sheetWidthMm" numeric(10,2),
    "sheetHeightMm" numeric(10,2),
    "customSheetName" text,
    "rollWidth" text,
    "rollWidthInch" numeric(10,2),
    "rollLength" text,
    "rollLengthM" numeric(10,2),
    grammage integer,
    "grammageDisplay" text,
    finish text DEFAULT 'matte'::text,
    "finishDisplay" text,
    "printMethods" text[] DEFAULT ARRAY[]::text[],
    "colorType" text,
    "colorGroup" text,
    thickness numeric(10,3),
    "basePrice" numeric(12,2) DEFAULT 0 NOT NULL,
    "unitType" text DEFAULT 'sheet'::text NOT NULL,
    "discountRate" numeric(5,2) DEFAULT 0 NOT NULL,
    "discountPrice" numeric(12,2),
    "stockQuantity" integer DEFAULT 0 NOT NULL,
    "minStockLevel" integer DEFAULT 0 NOT NULL,
    description text,
    memo text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.papers OWNER TO postgres;

--
-- Name: payable_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payable_payments (
    id text NOT NULL,
    "payableId" text NOT NULL,
    amount numeric(12,2) NOT NULL,
    "paymentDate" timestamp(3) without time zone NOT NULL,
    "paymentMethod" text,
    description text,
    "journalId" text,
    "createdBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.payable_payments OWNER TO postgres;

--
-- Name: payables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payables (
    id text NOT NULL,
    "supplierId" text,
    "supplierName" text NOT NULL,
    "supplierCode" text,
    "journalId" text,
    "originalAmount" numeric(12,2) NOT NULL,
    "paidAmount" numeric(12,2) DEFAULT 0 NOT NULL,
    balance numeric(12,2) NOT NULL,
    "issueDate" timestamp(3) without time zone NOT NULL,
    "dueDate" timestamp(3) without time zone,
    status text DEFAULT 'outstanding'::text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.payables OWNER TO postgres;

--
-- Name: permission_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permission_templates (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    permissions jsonb NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.permission_templates OWNER TO postgres;

--
-- Name: process_histories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.process_histories (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "fromStatus" text,
    "toStatus" text NOT NULL,
    "processType" text NOT NULL,
    note text,
    "processedBy" text NOT NULL,
    "processedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.process_histories OWNER TO postgres;

--
-- Name: product_bindings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_bindings (
    id text NOT NULL,
    "productId" text NOT NULL,
    name text NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.product_bindings OWNER TO postgres;

--
-- Name: product_covers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_covers (
    id text NOT NULL,
    "productId" text NOT NULL,
    name text NOT NULL,
    "materialCode" text,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    "imageUrl" text,
    "isDefault" boolean DEFAULT false NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.product_covers OWNER TO postgres;

--
-- Name: product_finishings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_finishings (
    id text NOT NULL,
    "productId" text NOT NULL,
    name text NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.product_finishings OWNER TO postgres;

--
-- Name: product_foils; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_foils (
    id text NOT NULL,
    "productId" text NOT NULL,
    name text NOT NULL,
    color text,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.product_foils OWNER TO postgres;

--
-- Name: product_half_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_half_products (
    id text NOT NULL,
    "productId" text NOT NULL,
    "halfProductId" text NOT NULL,
    "isRequired" boolean DEFAULT false NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.product_half_products OWNER TO postgres;

--
-- Name: product_papers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_papers (
    id text NOT NULL,
    "productId" text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.product_papers OWNER TO postgres;

--
-- Name: product_specifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_specifications (
    id text NOT NULL,
    "productId" text NOT NULL,
    name text NOT NULL,
    "widthMm" double precision NOT NULL,
    "heightMm" double precision NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.product_specifications OWNER TO postgres;

--
-- Name: production_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.production_groups (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    depth integer DEFAULT 1 NOT NULL,
    "parentId" text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.production_groups OWNER TO postgres;

--
-- Name: production_setting_prices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.production_setting_prices (
    id text NOT NULL,
    "productionSettingId" text NOT NULL,
    "specificationId" text,
    "minQuantity" integer,
    "maxQuantity" integer,
    weight numeric(5,2),
    price numeric(12,2) DEFAULT 0 NOT NULL,
    "singleSidedPrice" numeric(12,2),
    "doubleSidedPrice" numeric(12,2),
    "fourColorSinglePrice" numeric(12,2),
    "fourColorDoublePrice" numeric(12,2),
    "sixColorSinglePrice" numeric(12,2),
    "sixColorDoublePrice" numeric(12,2),
    "basePages" integer,
    "basePrice" numeric(12,2),
    "pricePerPage" numeric(12,2),
    "rangePrices" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.production_setting_prices OWNER TO postgres;

--
-- Name: production_setting_specifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.production_setting_specifications (
    id text NOT NULL,
    "productionSettingId" text NOT NULL,
    "specificationId" text NOT NULL,
    price numeric(12,2),
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.production_setting_specifications OWNER TO postgres;

--
-- Name: production_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.production_settings (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "codeName" text,
    "vendorType" text DEFAULT 'in_house'::text NOT NULL,
    "pricingType" text DEFAULT 'paper_output_spec'::text NOT NULL,
    "settingName" text,
    "sCode" text,
    "settingFee" numeric(12,2) DEFAULT 0 NOT NULL,
    "basePrice" numeric(12,2) DEFAULT 0 NOT NULL,
    "workDays" numeric(5,1) DEFAULT 0 NOT NULL,
    "weightInfo" text,
    "printMethod" text,
    "paperIds" text[] DEFAULT ARRAY[]::text[],
    "specUsageType" text DEFAULT 'all'::text NOT NULL,
    "singleSidedPrice" numeric(12,2),
    "doubleSidedPrice" numeric(12,2),
    "baseSpecificationId" text,
    "basePricePerSqInch" numeric(12,6),
    "priceGroups" jsonb,
    "paperPriceGroupMap" jsonb,
    "pageRanges" jsonb,
    "lengthUnit" text DEFAULT 'cm'::text,
    "lengthPriceRanges" jsonb,
    "areaUnit" text DEFAULT 'mm'::text,
    "areaPriceRanges" jsonb,
    "surchargeType" text DEFAULT 'none'::text,
    "distancePriceRanges" jsonb,
    "extraPricePerKm" numeric(10,2),
    "maxBaseDistance" integer,
    "freeThreshold" numeric(10,2),
    "islandFee" numeric(10,2),
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.production_settings OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id text NOT NULL,
    "productCode" text NOT NULL,
    "productName" text NOT NULL,
    "categoryId" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isNew" boolean DEFAULT false NOT NULL,
    "isBest" boolean DEFAULT false NOT NULL,
    "memberType" text DEFAULT 'all'::text NOT NULL,
    "basePrice" numeric(12,2) NOT NULL,
    "thumbnailUrl" text,
    "detailImages" text[] DEFAULT ARRAY[]::text[],
    description text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: receivable_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.receivable_payments (
    id text NOT NULL,
    "receivableId" text NOT NULL,
    amount numeric(12,2) NOT NULL,
    "paymentDate" timestamp(3) without time zone NOT NULL,
    "paymentMethod" text,
    description text,
    "journalId" text,
    "createdBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.receivable_payments OWNER TO postgres;

--
-- Name: receivables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.receivables (
    id text NOT NULL,
    "clientId" text NOT NULL,
    "clientName" text NOT NULL,
    "clientCode" text,
    "orderId" text,
    "orderNumber" text,
    "journalId" text,
    "originalAmount" numeric(12,2) NOT NULL,
    "paidAmount" numeric(12,2) DEFAULT 0 NOT NULL,
    balance numeric(12,2) NOT NULL,
    "issueDate" timestamp(3) without time zone NOT NULL,
    "dueDate" timestamp(3) without time zone,
    status text DEFAULT 'outstanding'::text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.receivables OWNER TO postgres;

--
-- Name: reception_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reception_schedules (
    id text NOT NULL,
    date date NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    day integer NOT NULL,
    "dayOfWeek" integer NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    "openTime" text,
    "closeTime" text,
    reason text,
    "reasonType" text,
    "isHoliday" boolean DEFAULT false NOT NULL,
    "holidayName" text,
    "modifiedBy" text,
    "modifiedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.reception_schedules OWNER TO postgres;

--
-- Name: regular_holiday_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.regular_holiday_settings (
    id text NOT NULL,
    type text NOT NULL,
    "weeklyDays" integer[] DEFAULT ARRAY[]::integer[],
    "monthlyDays" integer[] DEFAULT ARRAY[]::integer[],
    "yearlyDates" text[] DEFAULT ARRAY[]::text[],
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "effectiveTo" timestamp(3) without time zone,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.regular_holiday_settings OWNER TO postgres;

--
-- Name: sales_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_categories (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    depth integer DEFAULT 1 NOT NULL,
    "parentId" text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.sales_categories OWNER TO postgres;

--
-- Name: sales_category_options; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_category_options (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.sales_category_options OWNER TO postgres;

--
-- Name: schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schedules (
    id text NOT NULL,
    "creatorId" text NOT NULL,
    "creatorName" text NOT NULL,
    "creatorDeptId" text,
    "creatorDeptName" text,
    title text NOT NULL,
    description text,
    location text,
    "startAt" timestamp(3) without time zone NOT NULL,
    "endAt" timestamp(3) without time zone NOT NULL,
    "isAllDay" boolean DEFAULT false NOT NULL,
    "isPersonal" boolean DEFAULT true NOT NULL,
    "isDepartment" boolean DEFAULT false NOT NULL,
    "isCompany" boolean DEFAULT false NOT NULL,
    "sharedDeptIds" text[] DEFAULT ARRAY[]::text[],
    "scheduleType" text DEFAULT 'meeting'::text NOT NULL,
    reminders jsonb,
    "isRecurring" boolean DEFAULT false NOT NULL,
    "recurringRule" text,
    "recurringConfig" jsonb,
    "recurringEnd" timestamp(3) without time zone,
    "parentId" text,
    attendees jsonb,
    color text DEFAULT '#3B82F6'::text,
    tags text[] DEFAULT ARRAY[]::text[],
    "relatedType" text,
    "relatedId" text,
    status text DEFAULT 'confirmed'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.schedules OWNER TO postgres;

--
-- Name: settlements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settlements (
    id text NOT NULL,
    "periodType" text NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    "totalSales" numeric(14,2) DEFAULT 0 NOT NULL,
    "totalPurchases" numeric(14,2) DEFAULT 0 NOT NULL,
    "totalIncome" numeric(14,2) DEFAULT 0 NOT NULL,
    "totalExpense" numeric(14,2) DEFAULT 0 NOT NULL,
    "receivablesBalance" numeric(14,2) DEFAULT 0 NOT NULL,
    "payablesBalance" numeric(14,2) DEFAULT 0 NOT NULL,
    "netProfit" numeric(14,2) DEFAULT 0 NOT NULL,
    "netCashFlow" numeric(14,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    "confirmedBy" text,
    "confirmedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.settlements OWNER TO postgres;

--
-- Name: specification_prices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.specification_prices (
    id text NOT NULL,
    "specificationId" text NOT NULL,
    "priceType" text DEFAULT 'base'::text NOT NULL,
    "groupId" text,
    price numeric(12,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.specification_prices OWNER TO postgres;

--
-- Name: specifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.specifications (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "widthInch" numeric(10,4) NOT NULL,
    "heightInch" numeric(10,4) NOT NULL,
    "widthMm" numeric(10,2) NOT NULL,
    "heightMm" numeric(10,2) NOT NULL,
    orientation text DEFAULT 'landscape'::text NOT NULL,
    "pairId" text,
    "forIndigo" boolean DEFAULT false NOT NULL,
    "forInkjet" boolean DEFAULT false NOT NULL,
    "forAlbum" boolean DEFAULT false NOT NULL,
    "forFrame" boolean DEFAULT false NOT NULL,
    "forBooklet" boolean DEFAULT false NOT NULL,
    "squareMeters" numeric(10,2),
    description text,
    nup text,
    "nupSqInch" numeric(10,2),
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.specifications OWNER TO postgres;

--
-- Name: staff; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff (
    id text NOT NULL,
    "staffId" text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    "branchId" text,
    "departmentId" text,
    "position" text,
    phone text,
    mobile text,
    email text,
    "postalCode" text,
    address text,
    "addressDetail" text,
    "settlementGrade" integer DEFAULT 1 NOT NULL,
    "allowedIps" text[] DEFAULT ARRAY[]::text[],
    "canEditInManagerView" boolean DEFAULT false NOT NULL,
    "canLoginAsManager" boolean DEFAULT false NOT NULL,
    "canChangeDepositStage" boolean DEFAULT false NOT NULL,
    "canChangeReceptionStage" boolean DEFAULT false NOT NULL,
    "canChangeCancelStage" boolean DEFAULT false NOT NULL,
    "canEditMemberInfo" boolean DEFAULT false NOT NULL,
    "canViewSettlement" boolean DEFAULT false NOT NULL,
    "canChangeOrderAmount" boolean DEFAULT false NOT NULL,
    "memberViewScope" text DEFAULT 'own'::text NOT NULL,
    "salesViewScope" text DEFAULT 'own'::text NOT NULL,
    "menuPermissions" jsonb,
    "categoryPermissions" jsonb,
    "processPermissions" jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "lastLoginIp" text,
    "adminMemo" text,
    "joinDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.staff OWNER TO postgres;

--
-- Name: staff_clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff_clients (
    id text NOT NULL,
    "staffId" text NOT NULL,
    "clientId" text NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.staff_clients OWNER TO postgres;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    category text NOT NULL,
    label text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: todos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.todos (
    id text NOT NULL,
    "creatorId" text NOT NULL,
    "creatorName" text NOT NULL,
    "creatorDeptId" text,
    "creatorDeptName" text,
    title text NOT NULL,
    content text,
    priority text DEFAULT 'normal'::text NOT NULL,
    "startDate" timestamp(3) without time zone,
    "dueDate" timestamp(3) without time zone,
    "isAllDay" boolean DEFAULT false NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "completedBy" text,
    "isPersonal" boolean DEFAULT true NOT NULL,
    "isDepartment" boolean DEFAULT false NOT NULL,
    "isCompany" boolean DEFAULT false NOT NULL,
    "sharedDeptIds" text[] DEFAULT ARRAY[]::text[],
    "reminderAt" timestamp(3) without time zone,
    "isReminderSent" boolean DEFAULT false NOT NULL,
    "isRecurring" boolean DEFAULT false NOT NULL,
    "recurringType" text,
    "recurringEnd" timestamp(3) without time zone,
    "relatedType" text,
    "relatedId" text,
    color text DEFAULT '#3B82F6'::text,
    tags text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.todos OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    role text DEFAULT 'staff'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accounts (id, code, name, type, "parentId", description, "isActive", "sortOrder", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: bank_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank_accounts (id, "accountName", "bankName", "accountNumber", "accountHolder", balance, "isDefault", "isActive", description, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.branches (id, "branchCode", "branchName", "isHeadquarters", address, phone, "isActive", "createdAt", "updatedAt") FROM stdin;
cmkaiqnuj000wkz5o74elpdb6	HQ	본사	t	\N	\N	t	2026-01-12 02:03:15.644	2026-01-12 02:03:15.644
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, code, name, level, depth, "parentId", "isVisible", "isTopMenu", "loginVisibility", "categoryType", "productionForm", "isOutsourced", "pricingUnit", description, "linkUrl", "htmlContent", "sortOrder", "isActive", "iconUrl", "salesCategoryId", "createdAt", "updatedAt") FROM stdin;
cmk5cqvwy000114micn51e4oe	01000000	디지털출력	large	1	\N	t	t	always	HTML	digital_print	f	\N	\N	\N	\N	0	t	/api/v1/upload/category-icons/3af8a687-4b22-4bf5-8f4e-741ad145a5d5.jpg	\N	2026-01-08 11:16:37.522	2026-01-09 00:14:12.898
cmk64sbpp000314ay2aj5kt4d	01020000	인디고출력	medium	2	cmk5cqvwy000114micn51e4oe	t	f	always	HTML	\N	f	\N	\N	\N	\N	0	t	\N	\N	2026-01-09 00:21:33.902	2026-01-09 00:21:33.902
cmk64q1bv000114aye864h6eq	02000000	디지털앨범	large	1	\N	t	t	always	HTML	\N	f	\N	\N	\N	\N	0	t	/api/v1/upload/category-icons/5fc79bc2-5214-43cb-80cd-1197d18a8537.jpg	\N	2026-01-09 00:19:47.131	2026-01-09 00:21:53.741
cmk64tnq3000714ayr2wp4dsf	02010000	압축앨범	medium	2	cmk64q1bv000114aye864h6eq	t	f	always	HTML	\N	f	\N	\N	\N	\N	0	t	\N	\N	2026-01-09 00:22:36.123	2026-01-09 00:22:36.123
cmk64twl1000914ayr1k0mddl	02020000	화보앨범	medium	2	cmk64q1bv000114aye864h6eq	t	f	always	HTML	\N	f	\N	\N	\N	\N	0	t	\N	\N	2026-01-09 00:22:47.605	2026-01-09 00:22:47.605
cmk64snfn000514ayta937zrr	01030000	잉크젯출력	medium	2	cmk5cqvwy000114micn51e4oe	t	f	always	HTML	\N	f	\N	\N	\N	\N	0	t	\N	\N	2026-01-09 00:21:49.091	2026-01-09 00:42:32.547
cmk6hvgkv000712ucc3zajjsd	02010200	레이플릿 압축앨범	small	3	cmk64tnq3000714ayr2wp4dsf	t	f	always	POD	\N	f	\N	\N	\N	\N	0	t	\N	\N	2026-01-09 06:27:55.183	2026-01-09 06:27:55.183
cmk6huxe2000512uch5cfhh8j	02010100	고급압축앨범	large	1	\N	t	f	always	POD	\N	f	\N	\N	\N	\N	0	t	\N	\N	2026-01-09 06:27:30.314	2026-01-22 03:58:25.333
\.


--
-- Data for Name: client_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.client_groups (id, "groupCode", "groupName", "branchId", "generalDiscount", "premiumDiscount", "importedDiscount", description, "isActive", "sortOrder", "createdAt", "updatedAt") FROM stdin;
cmko20a3z0025v6kupgm3goza	g002	졸업앨범관련 업체	cmkaiqnuj000wkz5o74elpdb6	100	100	100		t	0	2026-01-21 13:23:37.391	2026-01-21 13:23:37.391
cmkaiqnum000xkz5ow7k25rf9	GRPMKAIQNU6	웨딩스튜디오	cmkaiqnuj000wkz5o74elpdb6	100	100	100		t	0	2026-01-12 02:03:15.647	2026-01-21 13:27:34.796
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients (id, "clientCode", "clientName", "businessNumber", representative, phone, mobile, email, password, "postalCode", address, "addressDetail", "groupId", "memberType", "oauthProvider", "oauthId", "priceType", "paymentType", "creditEnabled", "creditPeriodDays", "creditPaymentDay", "creditBlocked", "creditBlockedAt", "lastPaymentDate", "shippingType", "creditGrade", "paymentTerms", status, "businessType", "businessCategory", "taxInvoiceEmail", "taxInvoiceMethod", "contactPerson", "contactPhone", "mainGenre", "monthlyOrderVolume", "colorProfile", "acquisitionChannel", "preferredSize", "preferredFinish", "hasLogo", "logoPath", "deliveryNote", "memberGrade", "assignedManager", "sensitivityScore", "recentMemo", "totalClaims", "isBlacklist", "isWhitelist", "createdAt", "updatedAt") FROM stdin;
cmkg8vzuf0000at5m0dyaydie	N29645365	네이버사용자	포토미		01023131228	01023131228	wooceo@gmail.com	\N				cmko20a3z0025v6kupgm3goza	individual	naver	SbmqSiAQ2fsIFu969c7YTxyngCoJRAtY6u_G0WM-fo8	standard	order	f	\N	\N	f	\N	\N	conditional	B	30	active	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	normal	\N	3	\N	0	f	f	2026-01-16 02:14:05.367	2026-01-22 05:11:41.087
\.


--
-- Data for Name: consultation_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consultation_alerts (id, "clientId", "consultationId", "alertType", "alertLevel", title, message, "triggerCondition", "isRead", "readAt", "readBy", "isResolved", "resolvedAt", "resolvedBy", resolution, "createdAt", "expiresAt") FROM stdin;
\.


--
-- Data for Name: consultation_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consultation_categories (id, code, name, "colorCode", "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cmknzaj1u00003e2efxjz6rsh	album	앨범크레임	#EF4444	0	t	2026-01-21 12:07:36.689	2026-01-21 12:07:36.689
cmknzar2s00013e2e2kx3cg8v	category	액자크레임	#F97316	1	t	2026-01-21 12:07:47.092	2026-01-21 12:07:47.092
cmknzb07q00023e2euonc8ibb	delivery	배송크레이	#EAB308	2	t	2026-01-21 12:07:58.935	2026-01-21 12:07:58.935
cmko0thwp000iv6kukv1xpo66	consult	신규영업상담	#3B82F6	3	t	2026-01-21 12:50:21.289	2026-01-21 12:50:28.224
cmko0uauf000jv6ku1fl0bveq	product_inquiry	제품설정및 문의	#06B6D4	4	t	2026-01-21 12:50:58.792	2026-01-21 12:50:58.792
\.


--
-- Data for Name: consultation_channels; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consultation_channels (id, "consultationId", channel, "channelDetail", direction, "callDuration", "callRecordUrl", metadata, "createdAt") FROM stdin;
\.


--
-- Data for Name: consultation_follow_ups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consultation_follow_ups (id, "consultationId", content, "actionType", "staffId", "staffName", "createdAt") FROM stdin;
\.


--
-- Data for Name: consultation_guides; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consultation_guides (id, "categoryId", "tagCodes", title, problem, solution, scripts, "relatedGuideIds", attachments, "usageCount", "helpfulCount", "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cmknzci0c00033e2eov40zpmq	cmknzaj1u00003e2efxjz6rsh	{}	앨범 속지순서가 바뀌었어요	페이지 순서 제본순서바뀜	택배 반송처리	\N	{}	\N	0	0	0	t	2026-01-21 12:09:08.653	2026-01-21 12:09:08.653
cmknzfk2g00043e2ek442ywn1	cmknzaj1u00003e2efxjz6rsh	{}	색상이 이상해요	전과 색상이 달라요	1. 모니터 CMS(Color Management System)가 되었는지요?\n2. 앨범 반송처리하여 확인해보겠습니다.	\N	{}	\N	0	0	0	t	2026-01-21 12:11:31.288	2026-01-21 12:11:31.288
\.


--
-- Data for Name: consultation_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consultation_messages (id, "consultationId", direction, channel, content, attachments, "senderName", "senderType", "staffId", "staffName", "messageAt", "isRead", "readAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: consultation_slas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consultation_slas (id, name, "categoryId", priority, "firstResponseTarget", "resolutionTarget", "escalationTime", "escalateTo", "warningThreshold", "criticalThreshold", "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: consultation_stat_snapshots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consultation_stat_snapshots (id, period, "periodStart", "periodEnd", "totalCount", "claimCount", "inquiryCount", "salesCount", "resolvedCount", "pendingCount", "avgFirstResponseTime", "avgResolutionTime", "slaComplianceRate", "avgSatisfactionScore", "channelStats", "categoryStats", "tagStats", "counselorStats", "createdAt") FROM stdin;
\.


--
-- Data for Name: consultation_surveys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consultation_surveys (id, "consultationId", "satisfactionScore", "responseSpeedScore", "resolutionScore", "friendlinessScore", feedback, "wouldRecommend", "surveyMethod", "surveyedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: consultation_tag_mappings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consultation_tag_mappings (id, "consultationId", "tagId", "isAutoTagged", confidence, "createdAt") FROM stdin;
\.


--
-- Data for Name: consultation_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consultation_tags (id, code, name, "colorCode", category, "sortOrder", "isActive", "isAutoTag", keywords, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: consultations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consultations (id, "consultNumber", "clientId", "categoryId", title, content, "orderId", "orderNumber", "counselorId", "counselorName", "consultedAt", status, priority, "openedAt", "openedBy", "inProgressAt", "inProgressBy", "closedAt", "closedBy", resolution, "resolvedAt", "resolvedBy", "followUpDate", "followUpNote", "kakaoScheduled", "kakaoSendAt", "kakaoSentAt", "kakaoMessage", attachments, "internalMemo", "createdAt", "updatedAt") FROM stdin;
cmko0gtl0000hv6ku96zsbi1c	CS-20260121-0001	cmkg8vzuf0000at5m0dyaydie	cmknzaj1u00003e2efxjz6rsh	표지 스크레치	반품요청	\N	\N	admin	관리자	2026-01-21 12:40:29.891	in_progress	normal	2026-01-21 12:40:29.892	\N	2026-01-21 12:52:38.523	상담원	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	반품신청	2026-01-21 12:40:29.892	2026-01-21 12:52:38.524
\.


--
-- Data for Name: copper_plate_histories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.copper_plate_histories (id, "copperPlateId", "actionType", "previousStatus", "newStatus", "previousLocation", "newLocation", "orderId", "orderNumber", description, "actionById", "actionBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: copper_plates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.copper_plates (id, "clientId", "plateName", "plateCode", "plateType", "foilColor", "foilColorName", "foilPosition", "widthMm", "heightMm", "storageLocation", "imageUrl", "aiFileUrl", "designFileUrl", "appliedAlbumName", "albumPhotoUrl", notes, "registeredById", "registeredBy", "registeredAt", status, "sortOrder", "usageCount", "firstUsedAt", "lastUsedAt", "returnedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: custom_options; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_options (id, "productId", name, type, "values", price, "isRequired", "sortOrder") FROM stdin;
\.


--
-- Data for Name: customer_health_scores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer_health_scores (id, "clientId", "claimScore", "satisfactionScore", "loyaltyScore", "communicationScore", "totalScore", grade, "isAtRisk", "riskReason", "lastCalculatedAt", "createdAt", "updatedAt") FROM stdin;
cmko0xdat000lv6ku4ob17g3u	cmkg8vzuf0000at5m0dyaydie	100	100	0	80	76	B	f	\N	2026-01-21 12:53:39.185	2026-01-21 12:53:21.941	2026-01-21 12:53:39.187
\.


--
-- Data for Name: delivery_pricings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_pricings (id, "deliveryMethod", name, "baseFee", "distanceRanges", "extraPricePerKm", "maxBaseDistance", "nightSurchargeRate", "nightStartHour", "nightEndHour", "weekendSurchargeRate", "sizeRanges", "islandFee", "freeThreshold", "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (id, code, name, description, "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cmk6db48j0005oeubb3kxue3t	r8_Ps6JN1BB8NnoAHNcRkLxdksmQj3UC5G06	관리팀		0	t	2026-01-09 04:20:07.604	2026-01-09 04:20:07.604
cmk6ezwnn0002o43xlbb3c9d2	표지팀3782	표지팀	\N	2	t	2026-01-09 05:07:23.796	2026-01-09 05:07:23.796
cmk6f0eli0003o43x4pg3ci2e	출력팀7039	출력팀	\N	3	t	2026-01-09 05:07:47.046	2026-01-09 05:07:47.046
\.


--
-- Data for Name: fabric_suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fabric_suppliers (id, code, name, phone, mobile, email, fax, "postalCode", address, "addressDetail", representative, website, description, memo, "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: fabrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fabrics (id, code, name, category, material, "colorCode", "colorName", "widthCm", thickness, weight, "supplierId", "basePrice", "unitType", "discountRate", "discountPrice", "stockQuantity", "minStockLevel", "forAlbumCover", "forBoxCover", "forFrameCover", "forOther", "imageUrl", "thumbnailUrl", description, memo, "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: group_half_product_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.group_half_product_prices (id, "groupId", "halfProductId", price, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: group_product_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.group_product_prices (id, "groupId", "productId", price, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: group_production_setting_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--

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
\.


--
-- Data for Name: half_product_options; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.half_product_options (id, "halfProductId", name, type, "values", "quantityType", "sortOrder") FROM stdin;
\.


--
-- Data for Name: half_product_price_tiers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.half_product_price_tiers (id, "halfProductId", "minQuantity", "maxQuantity", "discountRate", "sortOrder") FROM stdin;
\.


--
-- Data for Name: half_product_specifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.half_product_specifications (id, "halfProductId", name, "widthMm", "heightMm", price, "isDefault", "sortOrder") FROM stdin;
\.


--
-- Data for Name: half_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.half_products (id, code, name, "categoryLargeId", "basePrice", "isPriceAdditive", "memberType", "requiredFileCount", "thumbnailUrl", "detailImages", status, "sortOrder", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: journal_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.journal_entries (id, "journalId", "accountId", "transactionType", amount, description, "sortOrder") FROM stdin;
\.


--
-- Data for Name: journals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.journals (id, "voucherNo", "voucherType", "journalDate", "clientId", "clientName", description, "totalAmount", "orderId", "orderNumber", "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: my_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.my_products (id, "clientId", "productType", "productId", "customName", "customThumbnail", "registrationType", "registeredBy", "defaultOptions", "sortOrder", "isActive", "usageCount", "lastUsedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: order_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_files (id, "orderItemId", "fileName", "fileUrl", "thumbnailUrl", "pageRange", "pageStart", "pageEnd", width, height, "widthInch", "heightInch", dpi, "fileSize", "inspectionStatus", "inspectionNote", "sortOrder", "uploadedAt") FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, "orderId", "productionNumber", "productId", "productName", size, pages, "printMethod", paper, "bindingType", "coverMaterial", "foilName", "foilColor", "finishingOptions", quantity, "unitPrice", "totalPrice") FROM stdin;
\.


--
-- Data for Name: order_shippings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_shippings (id, "orderId", "recipientName", phone, "postalCode", address, "addressDetail", "courierCode", "trackingNumber", "shippedAt", "deliveredAt") FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, "orderNumber", barcode, "clientId", "productPrice", "shippingFee", tax, "adjustmentAmount", "totalAmount", "finalAmount", "paymentMethod", "paymentStatus", status, "currentProcess", "isUrgent", "requestedDeliveryDate", "customerMemo", "productMemo", "adminMemo", "orderedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: paper_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.paper_groups (id, code, name, color, "basePrice", "unitType", description, "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: paper_manufacturers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.paper_manufacturers (id, code, name, country, website, "contactInfo", description, "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cmk69gtdb0004alpyf4o3mjc8	MFMK69GIDC	대한통상	한국	https://replit.com/@wooceo/Estimate-Master	02-222-2222		0	t	2026-01-09 02:32:34.991	2026-01-09 02:32:34.991
cmk6ay5yb0000ccm4kecgba4o	MFMK6AY0QZ	한솔제지					0	t	2026-01-09 03:14:04.067	2026-01-09 03:14:04.067
\.


--
-- Data for Name: paper_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.paper_prices (id, "paperId", "priceType", "groupId", "minQuantity", "maxQuantity", price, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: paper_suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.paper_suppliers (id, code, name, phone, mobile, email, fax, "postalCode", address, "addressDetail", representative, website, description, memo, "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cmk6b4g8y00006wgjlqaztouz	SPMK6B3XPO	대한통상	01023131228	01023131228	wooceo@gmail.com		463-970	운중동  산운마을 804동 101호		세종대왕				0	t	2026-01-09 03:18:57.346	2026-01-09 03:18:57.346
cmk6ckcsh0002oeubwy8mjfww	SPMK6CK58G	바이텍												0	t	2026-01-09 03:59:18.978	2026-01-09 03:59:18.978
\.


--
-- Data for Name: papers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.papers (id, code, name, "paperGroupId", "manufacturerId", "supplierId", "paperType", "sheetSize", "sheetWidthMm", "sheetHeightMm", "customSheetName", "rollWidth", "rollWidthInch", "rollLength", "rollLengthM", grammage, "grammageDisplay", finish, "finishDisplay", "printMethods", "colorType", "colorGroup", thickness, "basePrice", "unitType", "discountRate", "discountPrice", "stockQuantity", "minStockLevel", description, memo, "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cmk6bnlsk0002w4rgwhc1y6dw	PAPERMK6BITID	아티젠	\N	cmk6ay5yb0000ccm4kecgba4o	cmk6b4g8y00006wgjlqaztouz	sheet	국전지	788.00	1091.00	\N	\N	\N	\N	\N	210	210g/m²	matte	\N	{indigo,offset}	\N	\N	\N	202796.00	ream	0.00	\N	0	0			0	t	2026-01-09 03:33:50.996	2026-01-09 03:37:15.399
cmk6bx7xd0006w4rgt2s54dqp	PAPERMK6BW8DI	아트지	\N	cmk6ay5yb0000ccm4kecgba4o	cmk6b4g8y00006wgjlqaztouz	sheet	국전지	788.00	1091.00	\N	\N	\N	\N	\N	180	180g/m²	matte	\N	{indigo,offset}	\N	\N	\N	107127.00	ream	0.00	\N	0	0			0	t	2026-01-09 03:41:19.585	2026-01-09 03:41:42.823
cmk6bw3930004w4rgfz1xi87r	PAPERMK6BUH2E	스노우	\N	cmk6ay5yb0000ccm4kecgba4o	cmk6b4g8y00006wgjlqaztouz	sheet	국전지	788.00	1091.00	\N	\N	\N	\N	\N	250	250g/m²	lustre	\N	{indigo,offset}	\N	\N	\N	148785.00	ream	0.00	\N	0	0			0	t	2026-01-09 03:40:26.871	2026-01-09 03:41:54.816
cmk6c19320008w4rgtgxtmtlc	PAPERMK6BYYKY	아티젠	\N	cmk6ay5yb0000ccm4kecgba4o	cmk6b4g8y00006wgjlqaztouz	sheet	국전지	788.00	1091.00	\N	\N	\N	\N	\N	230	230g/m²	matte	\N	{indigo,offset}	\N	\N	\N	222103.00	ream	0.00	\N	0	0			0	t	2026-01-09 03:44:27.711	2026-01-09 03:46:00.412
cmk6cl3kp0004oeub4w4fpghp	PAPERMK6CJT5O	싸틴	\N	cmk6ay5yb0000ccm4kecgba4o	cmk6ckcsh0002oeubwy8mjfww	roll	국전지	788.00	1091.00	\N	24"	\N	30m	\N	240	240g/m²	satin	\N	{inkjet}	\N	\N	\N	38000.00	roll	0.00	\N	0	0			0	t	2026-01-09 03:59:53.689	2026-01-09 04:00:29.466
cmk6cj27s0001oeub8ot2p5wq	PAPERMK6CHF48	프리미엄메트	\N	cmk69gtdb0004alpyf4o3mjc8	cmk6b4g8y00006wgjlqaztouz	roll	국전지	788.00	1091.00	\N	24"	\N	30m	\N	240	240g/m²	matte	\N	{inkjet}	\N	\N	\N	28000.00	roll	0.00	\N	0	0			0	t	2026-01-09 03:58:18.616	2026-01-16 04:00:26.867
cmko0b90d000dv6kucf3istj1	PAPERMKO0A5DI	캔버스	\N	cmk69gtdb0004alpyf4o3mjc8	cmk6b4g8y00006wgjlqaztouz	roll	\N	\N	\N	\N	24"	\N	30m	\N	240	240g/m²	matte	\N	{inkjet}	\N	\N	\N	250000.00	roll	0.00	\N	0	0			0	t	2026-01-21 12:36:09.95	2026-01-21 12:36:31.671
cmko0dy6g000fv6kuem61w1s2	PAPERMKO0D0LP	스노우	\N	cmk6ay5yb0000ccm4kecgba4o	cmk6b4g8y00006wgjlqaztouz	sheet	국전지	788.00	1091.00	\N	\N	\N	\N	\N	180	180g/m²	lustre	\N	{indigo,offset}	\N	\N	\N	107127.00	ream	0.00	\N	0	0			0	t	2026-01-21 12:38:15.881	2026-01-21 12:38:49.359
\.


--
-- Data for Name: payable_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payable_payments (id, "payableId", amount, "paymentDate", "paymentMethod", description, "journalId", "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: payables; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payables (id, "supplierId", "supplierName", "supplierCode", "journalId", "originalAmount", "paidAmount", balance, "issueDate", "dueDate", status, description, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: permission_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permission_templates (id, name, description, permissions, "isDefault", "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: process_histories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.process_histories (id, "orderId", "fromStatus", "toStatus", "processType", note, "processedBy", "processedAt") FROM stdin;
\.


--
-- Data for Name: product_bindings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_bindings (id, "productId", name, price, "isDefault", "sortOrder") FROM stdin;
\.


--
-- Data for Name: product_covers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_covers (id, "productId", name, "materialCode", price, "imageUrl", "isDefault", "sortOrder") FROM stdin;
\.


--
-- Data for Name: product_finishings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_finishings (id, "productId", name, price, "isDefault", "sortOrder") FROM stdin;
\.


--
-- Data for Name: product_foils; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_foils (id, "productId", name, color, price, "isDefault", "sortOrder") FROM stdin;
\.


--
-- Data for Name: product_half_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_half_products (id, "productId", "halfProductId", "isRequired", "sortOrder") FROM stdin;
\.


--
-- Data for Name: product_papers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_papers (id, "productId", name, type, price, "isDefault", "sortOrder") FROM stdin;
\.


--
-- Data for Name: product_specifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_specifications (id, "productId", name, "widthMm", "heightMm", price, "isDefault", "sortOrder") FROM stdin;
\.


--
-- Data for Name: production_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production_groups (id, code, name, depth, "parentId", "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cmk5cpwru000014miy7scmjuy	111	출력	1	\N	0	t	2026-01-08 11:15:51.979	2026-01-08 11:15:51.979
cmk6dka5d000coeubkdhjlz3u	22201	스타제본	2	cmk5cs9w9000614mitbnzr2nm	0	t	2026-01-09 04:27:15.169	2026-01-09 04:27:15.169
cmk6hojvf000312ucl4e7yq1i	22203	스타제본+용지포함	2	cmk5cs9w9000614mitbnzr2nm	1	t	2026-01-09 06:22:32.859	2026-01-09 06:28:21.134
cmk5crnw9000514mitnz68inm	11	인디고출력	2	cmk5cpwru000014miy7scmjuy	0	t	2026-01-08 11:17:13.785	2026-01-19 01:16:14.531
cmkkh5l1w00522fducendddo0	111NaN	잉크젯출력	2	cmk5cpwru000014miy7scmjuy	1	t	2026-01-19 01:16:34.387	2026-01-19 01:16:34.387
cmk6gihm30009v9w27j6zfq2m	2301	앨범제작 후가공	2	cmk6ghduz0004v9w2qbwc5dna	0	t	2026-01-09 05:49:50.379	2026-01-19 01:47:27.922
cmk6ghduz0004v9w2qbwc5dna	23	후가공	1	\N	2	t	2026-01-09 05:48:58.86	2026-01-19 01:52:33.248
cmk5cs9w9000614mitbnzr2nm	222	제본	1	\N	1	t	2026-01-08 11:17:42.298	2026-01-19 01:52:33.248
cmkkl5cfm000910u634dg5itg	230101	용지코팅	3	cmk6gihm30009v9w27j6zfq2m	0	t	2026-01-19 03:08:21.683	2026-01-19 03:08:21.683
cmkkvz2dp002o1032eo930jjl	230102	동판구매	3	cmk6gihm30009v9w27j6zfq2m	1	t	2026-01-19 08:11:24.494	2026-01-19 08:11:24.494
cmklulwn600007nn5m8uenxhh	24	기타	1	\N	3	t	2026-01-20 00:20:57.09	2026-01-20 01:02:47.801
cmklvrqx40001dgdw7f98ssrs	2401	배송	2	cmklulwn600007nn5m8uenxhh	0	t	2026-01-20 00:53:29.224	2026-01-20 01:05:13.167
\.


--
-- Data for Name: production_setting_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production_setting_prices (id, "productionSettingId", "specificationId", "minQuantity", "maxQuantity", weight, price, "singleSidedPrice", "doubleSidedPrice", "fourColorSinglePrice", "fourColorDoublePrice", "sixColorSinglePrice", "sixColorDoublePrice", "basePages", "basePrice", "pricePerPage", "rangePrices", "createdAt", "updatedAt") FROM stdin;
cmkp0sj37000itaz0mx8jct5n	cmkgcqgel0001vuyqquqn2f9z	\N	1	\N	1.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	\N	\N	\N	2026-01-22 05:37:22.339	2026-01-22 05:37:22.339
cmkp0sj37000jtaz0fcmnu904	cmkgcqgel0001vuyqquqn2f9z	\N	2	\N	1.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	\N	\N	\N	2026-01-22 05:37:22.339	2026-01-22 05:37:22.339
cmkp0sj37000ktaz04ikaghqj	cmkgcqgel0001vuyqquqn2f9z	\N	4	\N	1.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	\N	\N	\N	2026-01-22 05:37:22.339	2026-01-22 05:37:22.339
cmkp0sj37000ltaz0fb9pa27f	cmkgcqgel0001vuyqquqn2f9z	\N	8	\N	1.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	\N	\N	\N	2026-01-22 05:37:22.339	2026-01-22 05:37:22.339
cmkp1j68e001ytaz0jhonsi1p	cmkafl76r0001kz5orjfsda7c	\N	1	\N	1.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	\N	\N	\N	2026-01-22 05:58:05.391	2026-01-22 05:58:05.391
cmkp1j68e001ztaz06y8h2tpv	cmkafl76r0001kz5orjfsda7c	\N	2	\N	1.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	\N	\N	\N	2026-01-22 05:58:05.391	2026-01-22 05:58:05.391
cmkp1j68e0020taz0yung3wym	cmkafl76r0001kz5orjfsda7c	\N	4	\N	1.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	\N	\N	\N	2026-01-22 05:58:05.391	2026-01-22 05:58:05.391
cmkp1j68e0021taz07bhukykj	cmkafl76r0001kz5orjfsda7c	\N	8	\N	1.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	\N	\N	\N	\N	2026-01-22 05:58:05.391	2026-01-22 05:58:05.391
\.


--
-- Data for Name: production_setting_specifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production_setting_specifications (id, "productionSettingId", "specificationId", price, "sortOrder", "createdAt", "updatedAt") FROM stdin;
cmkp0ttcg000mtaz0j8vuqdk8	cmkkhk9d600542fduuvm9kmec	cmk6fbng100004b63c70xzv5a	\N	0	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg000ntaz0l8p6kgqa	cmkkhk9d600542fduuvm9kmec	cmk6fu8av0005hxtsrjafllf0	\N	1	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg000otaz01qgfcmxe	cmkkhk9d600542fduuvm9kmec	cmk6f3ym20006o43xdewhcbes	\N	2	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg000ptaz0vjvcoqv0	cmkkhk9d600542fduuvm9kmec	cmk6f88vs0009o43x378tye2v	\N	3	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg000qtaz0xhhj6p45	cmkkhk9d600542fduuvm9kmec	cmk6ftqqu0004hxtskccmbx2s	\N	4	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg000rtaz0hmjtw8g2	cmkkhk9d600542fduuvm9kmec	cmk6f6ndh0008o43xcv3mdzu1	\N	5	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg000staz0t4o67rd6	cmkkhk9d600542fduuvm9kmec	cmk6fjyhm000c4b631modt98m	\N	6	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg000ttaz0nl6678ol	cmkkhk9d600542fduuvm9kmec	cmk6fkx5j000e4b639whx3sxx	\N	7	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg000utaz0b266m1kz	cmkkhk9d600542fduuvm9kmec	cmk6fvjvy0006hxtspj3i6nks	\N	8	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg000vtaz06fszbpkj	cmkkhk9d600542fduuvm9kmec	cmkauuj580000620v7qprf1fa	\N	9	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg000wtaz0bk8n9hry	cmkkhk9d600542fduuvm9kmec	cmkavuol30000ft7ltr5dldbf	\N	10	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg000xtaz0sn2ze6t7	cmkkhk9d600542fduuvm9kmec	cmkavvbot0001ft7l6yfnze23	\N	11	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg000ytaz0jy3m7wng	cmkkhk9d600542fduuvm9kmec	cmk6fdf7400084b63698iy8j5	\N	12	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg000ztaz09qhhtr5l	cmkkhk9d600542fduuvm9kmec	cmk6fcj4d00044b63ydvo3m99	\N	13	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg0010taz09s2i9gp4	cmkkhk9d600542fduuvm9kmec	cmk6fd3tf00064b63chde9ajf	\N	14	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg0011taz05n9cx8nk	cmkkhk9d600542fduuvm9kmec	cmk6feqsv000a4b631dxzz34w	\N	15	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg0012taz0b5mcutdw	cmkkhk9d600542fduuvm9kmec	cmk6gcadq0000v9w22gdjvtj0	\N	16	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg0013taz01anlwu0n	cmkkhk9d600542fduuvm9kmec	cmk6gcljh0002v9w2h60pr8xa	\N	17	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg0014taz0hrkcik5y	cmkkhk9d600542fduuvm9kmec	cmk6f27np0004o43xbl1qfr5n	\N	18	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg0015taz0pdym2jqs	cmkkhk9d600542fduuvm9kmec	cmk6fbng600014b63lbz4hbql	\N	19	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg0016taz04ek62qzp	cmkkhk9d600542fduuvm9kmec	cmk6f3ym40007o43x4w1i7igj	\N	20	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg0017taz0yxu5yyvb	cmkkhk9d600542fduuvm9kmec	cmk6f88vu000ao43x13j2f12j	\N	21	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg0018taz043y5vrkc	cmkkhk9d600542fduuvm9kmec	cmk6fjyhq000d4b63ltsp5xkp	\N	22	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg0019taz05uwi9217	cmkkhk9d600542fduuvm9kmec	cmk6fvjw00007hxtsirwx4s8m	\N	23	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg001ataz0arye7w6d	cmkkhk9d600542fduuvm9kmec	cmk6fkx5l000f4b63teec2nro	\N	24	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg001btaz0nrz9zho2	cmkkhk9d600542fduuvm9kmec	cmkauuj5e0001620vtvan1277	\N	25	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg001ctaz065i3glda	cmkkhk9d600542fduuvm9kmec	cmkavvboy0002ft7lsl0ipbee	\N	26	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg001dtaz00s4htnoo	cmkkhk9d600542fduuvm9kmec	cmk6fdf7600094b63ff6454lx	\N	27	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg001etaz0cys9pz6l	cmkkhk9d600542fduuvm9kmec	cmk6fcj4f00054b63m430jdn4	\N	28	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg001ftaz0cf2l0ux5	cmkkhk9d600542fduuvm9kmec	cmk6fd3th00074b63i1ouhou9	\N	29	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg001gtaz0c6umyso1	cmkkhk9d600542fduuvm9kmec	cmk6feqsy000b4b63vxejnfur	\N	30	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg001htaz0rjwjhb4o	cmkkhk9d600542fduuvm9kmec	cmk6gcadu0001v9w2k7ogf6zt	\N	31	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg001itaz0mvyubm14	cmkkhk9d600542fduuvm9kmec	cmk6gcljl0003v9w2qe2j0lo1	\N	32	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg001jtaz0899xaohd	cmkkhk9d600542fduuvm9kmec	cmk6fc2o500024b63vwcm68cp	\N	33	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg001ktaz0aytxy5df	cmkkhk9d600542fduuvm9kmec	cmk6f27nr0005o43xwyhm7een	\N	34	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
cmkp0ttcg001ltaz0y8t42lc3	cmkkhk9d600542fduuvm9kmec	cmk6fc2od00034b63mc8vtlep	\N	35	2026-01-22 05:38:22.288	2026-01-22 05:38:22.288
\.


--
-- Data for Name: production_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production_settings (id, "groupId", "codeName", "vendorType", "pricingType", "settingName", "sCode", "settingFee", "basePrice", "workDays", "weightInfo", "printMethod", "paperIds", "specUsageType", "singleSidedPrice", "doubleSidedPrice", "baseSpecificationId", "basePricePerSqInch", "priceGroups", "paperPriceGroupMap", "pageRanges", "lengthUnit", "lengthPriceRanges", "areaUnit", "areaPriceRanges", "surchargeType", "distancePriceRanges", "extraPricePerKm", "maxBaseDistance", "freeThreshold", "islandFee", "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cmk6h6n41000fv9w2zc6fckd0	cmk6dka5d000coeubkdhjlz3u	22201_001	in_house	nup_page_range	스타제본		0.00	0.00	0.0	30\n40\n50	indigo	{}	all	\N	\N	\N	\N	[{"id": "pg_1768178522776_dihnptpoo", "color": "green", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}]}, {"id": "pg_1768178523052_ezp9yb9tr", "color": "blue", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}]}, {"id": "pg_1768178532061_injjo2woi", "color": "yellow", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}]}]	{}	[30, 40, 50, 60, 70, 80]	cm	\N	mm2	\N	none	\N	\N	\N	\N	\N	0	t	2026-01-09 06:08:37.249	2026-01-19 02:45:55.242
cmkkhsxxs00ba2fdul36si9el	cmkkh5l1w00522fducendddo0	111NaN_002	in_house	paper_output_spec	잉크젯 스냅사진		0.00	0.00	1.0		inkjet	{cmk6cl3kp0004oeub4w4fpghp,cmk6cj27s0001oeub8ot2p5wq}	all	\N	\N		\N	[{"id": "pg_1768786473212_8pfnqfvuo", "color": "green", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}], "specPrices": [{"weight": 1, "specificationId": "cmk6fbng100004b63c70xzv5a", "singleSidedPrice": 468}, {"weight": 1, "specificationId": "cmk6fu8av0005hxtsrjafllf0", "singleSidedPrice": 623}, {"weight": 1, "specificationId": "cmk6f3ym20006o43xdewhcbes", "singleSidedPrice": 779}, {"weight": 1, "specificationId": "cmk6f88vs0009o43x378tye2v", "singleSidedPrice": 942}, {"weight": 1, "specificationId": "cmk6ftqqu0004hxtskccmbx2s", "singleSidedPrice": 974}, {"weight": 1, "specificationId": "cmk6f6ndh0008o43xcv3mdzu1", "singleSidedPrice": 1179}, {"weight": 1, "specificationId": "cmk6fjyhm000c4b631modt98m", "singleSidedPrice": 1500}, {"weight": 1, "specificationId": "cmk6fkx5j000e4b639whx3sxx", "singleSidedPrice": 1607}, {"weight": 1, "specificationId": "cmk6fvjvy0006hxtspj3i6nks", "singleSidedPrice": 1714}, {"weight": 1, "specificationId": "cmkauuj580000620v7qprf1fa", "singleSidedPrice": 1753}, {"weight": 1, "specificationId": "cmkavuol30000ft7ltr5dldbf", "singleSidedPrice": 1909}, {"weight": 1, "specificationId": "cmkavvbot0001ft7l6yfnze23", "singleSidedPrice": 2182}, {"weight": 1, "specificationId": "cmk6fdf7400084b63698iy8j5", "singleSidedPrice": 3117}, {"weight": 1, "specificationId": "cmk6fcj4d00044b63ydvo3m99", "singleSidedPrice": 3740}, {"weight": 1, "specificationId": "cmk6fd3tf00064b63chde9ajf", "singleSidedPrice": 4675}, {"weight": 1, "specificationId": "cmk6feqsv000a4b631dxzz34w", "singleSidedPrice": 5844}, {"weight": 1, "specificationId": "cmk6gcadq0000v9w22gdjvtj0", "singleSidedPrice": 7481}, {"weight": 1, "specificationId": "cmk6gcljh0002v9w2h60pr8xa", "singleSidedPrice": 13714}, {"weight": 1, "specificationId": "cmk6f27np0004o43xbl1qfr5n", "singleSidedPrice": 341}, {"weight": 1, "specificationId": "cmk6fbng600014b63lbz4hbql", "singleSidedPrice": 468}, {"weight": 1, "specificationId": "cmk6f3ym40007o43x4w1i7igj", "singleSidedPrice": 779}, {"weight": 1, "specificationId": "cmk6f88vu000ao43x13j2f12j", "singleSidedPrice": 942}, {"weight": 1, "specificationId": "cmk6fjyhq000d4b63ltsp5xkp", "singleSidedPrice": 1500}, {"weight": 1, "specificationId": "cmk6fvjw00007hxtsirwx4s8m", "singleSidedPrice": 1714}, {"weight": 1, "specificationId": "cmk6fkx5l000f4b63teec2nro", "singleSidedPrice": 1607}, {"weight": 1, "specificationId": "cmkauuj5e0001620vtvan1277", "singleSidedPrice": 1753}, {"weight": 1, "specificationId": "cmkavvboy0002ft7lsl0ipbee", "singleSidedPrice": 2182}, {"weight": 1, "specificationId": "cmk6fdf7600094b63ff6454lx", "singleSidedPrice": 3117}, {"weight": 1, "specificationId": "cmk6fcj4f00054b63m430jdn4", "singleSidedPrice": 3740}, {"weight": 1, "specificationId": "cmk6fd3th00074b63i1ouhou9", "singleSidedPrice": 4675}, {"weight": 1, "specificationId": "cmk6feqsy000b4b63vxejnfur", "singleSidedPrice": 5844}, {"weight": 1, "specificationId": "cmk6gcadu0001v9w2k7ogf6zt", "singleSidedPrice": 7481}, {"weight": 1, "specificationId": "cmk6gcljl0003v9w2qe2j0lo1", "singleSidedPrice": 13714}, {"weight": 1, "specificationId": "cmk6fc2o500024b63vwcm68cp", "singleSidedPrice": 234}, {"weight": 1, "specificationId": "cmk6f27nr0005o43xwyhm7een", "singleSidedPrice": 341}, {"weight": 1, "specificationId": "cmk6fc2od00034b63mc8vtlep", "singleSidedPrice": 234}], "pricingMode": "spec", "inkjetBasePrice": 9.74025974025974, "inkjetBaseSpecId": "cmk6fjyhm000c4b631modt98m"}, {"id": "pg_1768786475001_pjeb1zdss", "color": "blue", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}], "specPrices": [], "pricingMode": "sqinch", "inkjetBasePrice": 5, "inkjetBaseSpecId": ""}]	{"cmk6cj27s0001oeub8ot2p5wq": "pg_1768786475001_pjeb1zdss", "cmk6cl3kp0004oeub4w4fpghp": "pg_1768786473212_8pfnqfvuo"}	null	cm	\N	mm2	\N	none	\N	\N	\N	\N	\N	1	t	2026-01-19 01:34:44.176	2026-01-19 01:41:27.886
cmklw5efx0001iz63pvsa7i8j	cmklvrqx40001dgdw7f98ssrs	2401_001	in_house	delivery_parcel	택배비		0.00	5500.00	0.0		indigo	{}	all	\N	\N	\N	\N	[]	{}	null	cm	null	mm2	null	none	\N	\N	\N	\N	\N	0	t	2026-01-20 01:04:06.237	2026-01-20 06:58:46.056
cmkkvrn1q001y1032yamghstu	cmkkl5cfm000910u634dg5itg	230101_002	in_house	finishing_spec_nup	라미네이팅코팅 유광		0.00	0.00	0.0		\N	{}	indigo	\N	\N	\N	\N	null	null	null	cm	\N	mm2	\N	none	\N	\N	\N	\N	\N	1	t	2026-01-19 08:05:38.03	2026-01-20 00:48:57.902
cmkkl7404000d10u6awja3pml	cmkkl5cfm000910u634dg5itg	230101_001	in_house	finishing_spec_nup	수성무광코팅		0.00	0.00	0.5		indigo	{}	inkjet	\N	\N	\N	\N	[]	{}	null	cm	\N	mm2	\N	none	\N	\N	\N	\N	\N	0	t	2026-01-19 03:09:44.068	2026-01-20 00:49:08.765
cmkgcqgel0001vuyqquqn2f9z	cmk5crnw9000514mitnz68inm	11_002	in_house	paper_output_spec	인디고스냅사진		0.00	0.00	1.0		indigo	{}	all	\N	\N		\N	[{"id": "pg_1768536096664_hxqs8hls0", "color": "green", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 480, "sixColorSinglePrice": 500, "fourColorDoublePrice": 380, "fourColorSinglePrice": 400}, {"up": 2, "weight": 1, "sixColorDoublePrice": 240, "sixColorSinglePrice": 250, "fourColorDoublePrice": 190, "fourColorSinglePrice": 200}, {"up": 4, "weight": 1, "sixColorDoublePrice": 120, "sixColorSinglePrice": 130, "fourColorDoublePrice": 100, "fourColorSinglePrice": 100}, {"up": 8, "weight": 1, "sixColorDoublePrice": 60, "sixColorSinglePrice": 60, "fourColorDoublePrice": 50, "fourColorSinglePrice": 50}], "specPrices": [{"weight": 1, "specificationId": "cmk6fbng100004b63c70xzv5a", "singleSidedPrice": 310}, {"weight": 1, "specificationId": "cmk6fu8av0005hxtsrjafllf0", "singleSidedPrice": 420}, {"weight": 1, "specificationId": "cmk6f3ym20006o43xdewhcbes", "singleSidedPrice": 500}, {"weight": 1, "specificationId": "cmk6f88vs0009o43x378tye2v", "singleSidedPrice": 650}, {"weight": 1, "specificationId": "cmk6ftqqu0004hxtskccmbx2s", "singleSidedPrice": 650}, {"weight": 1, "specificationId": "cmk6f6ndh0008o43xcv3mdzu1", "singleSidedPrice": 800}, {"weight": 1, "specificationId": "cmk6fjyhm000c4b631modt98m", "singleSidedPrice": 1000}, {"weight": 1, "specificationId": "cmk6fkx5j000e4b639whx3sxx", "singleSidedPrice": 1100}, {"weight": 1, "specificationId": "cmk6fvjvy0006hxtspj3i6nks", "singleSidedPrice": 1100}, {"weight": 1, "specificationId": "cmkauuj580000620v7qprf1fa", "singleSidedPrice": 1200}, {"weight": 1, "specificationId": "cmkavuol30000ft7ltr5dldbf", "singleSidedPrice": 1300}, {"weight": 1, "specificationId": "cmkavvbot0001ft7l6yfnze23", "singleSidedPrice": 1500}, {"weight": 1, "specificationId": "cmk6fdf7400084b63698iy8j5", "singleSidedPrice": 2100}, {"weight": 1, "specificationId": "cmk6fcj4d00044b63ydvo3m99", "singleSidedPrice": 2500}, {"weight": 1, "specificationId": "cmk6fd3tf00064b63chde9ajf", "singleSidedPrice": 3100}, {"weight": 1, "specificationId": "cmk6feqsv000a4b631dxzz34w", "singleSidedPrice": 3900}, {"weight": 1, "specificationId": "cmk6gcadq0000v9w22gdjvtj0", "singleSidedPrice": 5000}, {"weight": 1, "specificationId": "cmk6gcljh0002v9w2h60pr8xa", "singleSidedPrice": 9100}, {"weight": 1, "specificationId": "cmk6f27np0004o43xbl1qfr5n", "singleSidedPrice": 230}, {"weight": 1, "specificationId": "cmk6fbng600014b63lbz4hbql", "singleSidedPrice": 310}, {"weight": 1, "specificationId": "cmk6f3ym40007o43x4w1i7igj", "singleSidedPrice": 500}, {"weight": 1, "specificationId": "cmk6f88vu000ao43x13j2f12j", "singleSidedPrice": 650}, {"weight": 1, "specificationId": "cmk6fjyhq000d4b63ltsp5xkp", "singleSidedPrice": 1000}, {"weight": 1, "specificationId": "cmk6fvjw00007hxtsirwx4s8m", "singleSidedPrice": 1100}, {"weight": 1, "specificationId": "cmk6fkx5l000f4b63teec2nro", "singleSidedPrice": 1100}, {"weight": 1, "specificationId": "cmkauuj5e0001620vtvan1277", "singleSidedPrice": 1200}, {"weight": 1, "specificationId": "cmkavvboy0002ft7lsl0ipbee", "singleSidedPrice": 1500}, {"weight": 1, "specificationId": "cmk6fdf7600094b63ff6454lx", "singleSidedPrice": 2100}, {"weight": 1, "specificationId": "cmk6fcj4f00054b63m430jdn4", "singleSidedPrice": 2500}, {"weight": 1, "specificationId": "cmk6fd3th00074b63i1ouhou9", "singleSidedPrice": 3100}, {"weight": 1, "specificationId": "cmk6feqsy000b4b63vxejnfur", "singleSidedPrice": 3900}, {"weight": 1, "specificationId": "cmk6gcadu0001v9w2k7ogf6zt", "singleSidedPrice": 5000}, {"weight": 1, "specificationId": "cmk6gcljl0003v9w2qe2j0lo1", "singleSidedPrice": 9100}, {"weight": 1, "specificationId": "cmk6fc2o500024b63vwcm68cp", "singleSidedPrice": 160}, {"weight": 1, "specificationId": "cmk6f27nr0005o43xwyhm7een", "singleSidedPrice": 230}, {"weight": 1, "specificationId": "cmk6fc2od00034b63mc8vtlep", "singleSidedPrice": 160}], "pricingMode": "spec", "inkjetBasePrice": 6.493506493506493, "inkjetBaseSpecId": "cmk6fjyhm000c4b631modt98m"}, {"id": "pg_1768536123869_f96k5mt6y", "color": "blue", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 450, "sixColorSinglePrice": 480, "fourColorDoublePrice": 350, "fourColorSinglePrice": 380}, {"up": 2, "weight": 1, "sixColorDoublePrice": 230, "sixColorSinglePrice": 240, "fourColorDoublePrice": 180, "fourColorSinglePrice": 190}, {"up": 4, "weight": 1, "sixColorDoublePrice": 110, "sixColorSinglePrice": 120, "fourColorDoublePrice": 90, "fourColorSinglePrice": 100}, {"up": 8, "weight": 1, "sixColorDoublePrice": 60, "sixColorSinglePrice": 60, "fourColorDoublePrice": 40, "fourColorSinglePrice": 50}], "specPrices": [], "pricingMode": "spec", "inkjetBasePrice": 5}]	{"cmk6bw3930004w4rgfz1xi87r": "pg_1768536096664_hxqs8hls0", "cmk6bx7xd0006w4rgt2s54dqp": "pg_1768536123869_f96k5mt6y", "cmk6cj27s0001oeub8ot2p5wq": "pg_1768536123869_f96k5mt6y", "cmk6cl3kp0004oeub4w4fpghp": "pg_1768536096664_hxqs8hls0"}	null	cm	\N	mm2	\N	none	\N	\N	\N	\N	\N	1	t	2026-01-16 04:01:45.356	2026-01-22 05:37:22.335
cmkkhk9d600542fduuvm9kmec	cmkkh5l1w00522fducendddo0	111NaN_001	in_house	paper_output_spec	웨딩베이비		0.00	0.00	1.0		inkjet	{cmk6cl3kp0004oeub4w4fpghp,cmk6cj27s0001oeub8ot2p5wq}	all	\N	\N		\N	[{"id": "pg_1768786011033_7qd25f1mq", "color": "green", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}], "specPrices": [{"weight": 1, "specificationId": "cmk6fbng100004b63c70xzv5a", "singleSidedPrice": 600}, {"weight": 1, "specificationId": "cmk6fu8av0005hxtsrjafllf0", "singleSidedPrice": 850}, {"weight": 1, "specificationId": "cmk6f3ym20006o43xdewhcbes", "singleSidedPrice": 1000}, {"weight": 1, "specificationId": "cmk6f88vs0009o43x378tye2v", "singleSidedPrice": 1300}, {"weight": 1, "specificationId": "cmk6ftqqu0004hxtskccmbx2s", "singleSidedPrice": 1300}, {"weight": 1, "specificationId": "cmk6f6ndh0008o43xcv3mdzu1", "singleSidedPrice": 1600}, {"weight": 1, "specificationId": "cmk6fjyhm000c4b631modt98m", "singleSidedPrice": 2000}, {"weight": 1, "specificationId": "cmk6fkx5j000e4b639whx3sxx", "singleSidedPrice": 2100}, {"weight": 1, "specificationId": "cmk6fvjvy0006hxtspj3i6nks", "singleSidedPrice": 2300}, {"weight": 1, "specificationId": "cmkauuj580000620v7qprf1fa", "singleSidedPrice": 2300}, {"weight": 1, "specificationId": "cmkavuol30000ft7ltr5dldbf", "singleSidedPrice": 2500}, {"weight": 1, "specificationId": "cmkavvbot0001ft7l6yfnze23", "singleSidedPrice": 2900}, {"weight": 1, "specificationId": "cmk6fdf7400084b63698iy8j5", "singleSidedPrice": 4200}, {"weight": 1, "specificationId": "cmk6fcj4d00044b63ydvo3m99", "singleSidedPrice": 5000}, {"weight": 1, "specificationId": "cmk6fd3tf00064b63chde9ajf", "singleSidedPrice": 6200}, {"weight": 1, "specificationId": "cmk6feqsv000a4b631dxzz34w", "singleSidedPrice": 7800}, {"weight": 1, "specificationId": "cmk6gcadq0000v9w22gdjvtj0", "singleSidedPrice": 10000}, {"weight": 1, "specificationId": "cmk6gcljh0002v9w2h60pr8xa", "singleSidedPrice": 18300}, {"weight": 1, "specificationId": "cmk6f27np0004o43xbl1qfr5n", "singleSidedPrice": 460}, {"weight": 1, "specificationId": "cmk6fbng600014b63lbz4hbql", "singleSidedPrice": 600}, {"weight": 1, "specificationId": "cmk6f3ym40007o43x4w1i7igj", "singleSidedPrice": 1000}, {"weight": 1, "specificationId": "cmk6f88vu000ao43x13j2f12j", "singleSidedPrice": 1300}, {"weight": 1, "specificationId": "cmk6fjyhq000d4b63ltsp5xkp", "singleSidedPrice": 2000}, {"weight": 1, "specificationId": "cmk6fvjw00007hxtsirwx4s8m", "singleSidedPrice": 2300}, {"weight": 1, "specificationId": "cmk6fkx5l000f4b63teec2nro", "singleSidedPrice": 2100}, {"weight": 1, "specificationId": "cmkauuj5e0001620vtvan1277", "singleSidedPrice": 2300}, {"weight": 1, "specificationId": "cmkavvboy0002ft7lsl0ipbee", "singleSidedPrice": 2900}, {"weight": 1, "specificationId": "cmk6fdf7600094b63ff6454lx", "singleSidedPrice": 4200}, {"weight": 1, "specificationId": "cmk6fcj4f00054b63m430jdn4", "singleSidedPrice": 5000}, {"weight": 1, "specificationId": "cmk6fd3th00074b63i1ouhou9", "singleSidedPrice": 6200}, {"weight": 1, "specificationId": "cmk6feqsy000b4b63vxejnfur", "singleSidedPrice": 7800}, {"weight": 1, "specificationId": "cmk6gcadu0001v9w2k7ogf6zt", "singleSidedPrice": 10000}, {"weight": 1, "specificationId": "cmk6gcljl0003v9w2qe2j0lo1", "singleSidedPrice": 18300}, {"weight": 1, "specificationId": "cmk6fc2o500024b63vwcm68cp", "singleSidedPrice": 310}, {"weight": 1, "specificationId": "cmk6f27nr0005o43xwyhm7een", "singleSidedPrice": 460}, {"weight": 1, "specificationId": "cmk6fc2od00034b63mc8vtlep", "singleSidedPrice": 310}], "pricingMode": "spec", "inkjetBasePrice": 12.98701298701299, "inkjetBaseSpecId": "cmk6fjyhm000c4b631modt98m"}, {"id": "pg_1768786011553_8h4u0zoem", "color": "blue", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}], "specPrices": [{"weight": 1, "specificationId": "cmk6fbng100004b63c70xzv5a", "singleSidedPrice": 430}, {"weight": 1, "specificationId": "cmk6fu8av0005hxtsrjafllf0", "singleSidedPrice": 600}, {"weight": 1, "specificationId": "cmk6f3ym20006o43xdewhcbes", "singleSidedPrice": 700}, {"weight": 1, "specificationId": "cmk6f88vs0009o43x378tye2v", "singleSidedPrice": 850}, {"weight": 1, "specificationId": "cmk6ftqqu0004hxtskccmbx2s", "singleSidedPrice": 900}, {"weight": 1, "specificationId": "cmk6f6ndh0008o43xcv3mdzu1", "singleSidedPrice": 1100}, {"weight": 1, "specificationId": "cmk6fjyhm000c4b631modt98m", "singleSidedPrice": 1400}, {"weight": 1, "specificationId": "cmk6fkx5j000e4b639whx3sxx", "singleSidedPrice": 1500}, {"weight": 1, "specificationId": "cmk6fvjvy0006hxtspj3i6nks", "singleSidedPrice": 1600}, {"weight": 1, "specificationId": "cmkauuj580000620v7qprf1fa", "singleSidedPrice": 1600}, {"weight": 1, "specificationId": "cmkavuol30000ft7ltr5dldbf", "singleSidedPrice": 1800}, {"weight": 1, "specificationId": "cmkavvbot0001ft7l6yfnze23", "singleSidedPrice": 2000}, {"weight": 1, "specificationId": "cmk6fdf7400084b63698iy8j5", "singleSidedPrice": 2900}, {"weight": 1, "specificationId": "cmk6fcj4d00044b63ydvo3m99", "singleSidedPrice": 3500}, {"weight": 1, "specificationId": "cmk6fd3tf00064b63chde9ajf", "singleSidedPrice": 4300}, {"weight": 1, "specificationId": "cmk6feqsv000a4b631dxzz34w", "singleSidedPrice": 5400}, {"weight": 1, "specificationId": "cmk6gcadq0000v9w22gdjvtj0", "singleSidedPrice": 6900}, {"weight": 1, "specificationId": "cmk6gcljh0002v9w2h60pr8xa", "singleSidedPrice": 12700}, {"weight": 1, "specificationId": "cmk6f27np0004o43xbl1qfr5n", "singleSidedPrice": 320}, {"weight": 1, "specificationId": "cmk6fbng600014b63lbz4hbql", "singleSidedPrice": 430}, {"weight": 1, "specificationId": "cmk6f3ym40007o43x4w1i7igj", "singleSidedPrice": 700}, {"weight": 1, "specificationId": "cmk6f88vu000ao43x13j2f12j", "singleSidedPrice": 850}, {"weight": 1, "specificationId": "cmk6fjyhq000d4b63ltsp5xkp", "singleSidedPrice": 1400}, {"weight": 1, "specificationId": "cmk6fvjw00007hxtsirwx4s8m", "singleSidedPrice": 1600}, {"weight": 1, "specificationId": "cmk6fkx5l000f4b63teec2nro", "singleSidedPrice": 1500}, {"weight": 1, "specificationId": "cmkauuj5e0001620vtvan1277", "singleSidedPrice": 1600}, {"weight": 1, "specificationId": "cmkavvboy0002ft7lsl0ipbee", "singleSidedPrice": 2000}, {"weight": 1, "specificationId": "cmk6fdf7600094b63ff6454lx", "singleSidedPrice": 2900}, {"weight": 1, "specificationId": "cmk6fcj4f00054b63m430jdn4", "singleSidedPrice": 3500}, {"weight": 1, "specificationId": "cmk6fd3th00074b63i1ouhou9", "singleSidedPrice": 4300}, {"weight": 1, "specificationId": "cmk6feqsy000b4b63vxejnfur", "singleSidedPrice": 5400}, {"weight": 1, "specificationId": "cmk6gcadu0001v9w2k7ogf6zt", "singleSidedPrice": 6900}, {"weight": 1, "specificationId": "cmk6gcljl0003v9w2qe2j0lo1", "singleSidedPrice": 12700}, {"weight": 1, "specificationId": "cmk6fc2o500024b63vwcm68cp", "singleSidedPrice": 220}, {"weight": 1, "specificationId": "cmk6f27nr0005o43xwyhm7een", "singleSidedPrice": 320}, {"weight": 1, "specificationId": "cmk6fc2od00034b63mc8vtlep", "singleSidedPrice": 220}], "pricingMode": "sqinch", "inkjetBasePrice": 9, "inkjetBaseSpecId": ""}, {"id": "pg_1768786011964_9cx7ux2sp", "color": "yellow", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}], "specPrices": [{"weight": 1, "specificationId": "cmk6fbng100004b63c70xzv5a", "singleSidedPrice": 430}, {"weight": 1, "specificationId": "cmk6fu8av0005hxtsrjafllf0", "singleSidedPrice": 600}, {"weight": 1, "specificationId": "cmk6f3ym20006o43xdewhcbes", "singleSidedPrice": 700}, {"weight": 1, "specificationId": "cmk6f88vs0009o43x378tye2v", "singleSidedPrice": 850}, {"weight": 1, "specificationId": "cmk6ftqqu0004hxtskccmbx2s", "singleSidedPrice": 900}, {"weight": 1, "specificationId": "cmk6f6ndh0008o43xcv3mdzu1", "singleSidedPrice": 1100}, {"weight": 1, "specificationId": "cmk6fjyhm000c4b631modt98m", "singleSidedPrice": 1400}, {"weight": 1, "specificationId": "cmk6fkx5j000e4b639whx3sxx", "singleSidedPrice": 1500}, {"weight": 1, "specificationId": "cmk6fvjvy0006hxtspj3i6nks", "singleSidedPrice": 1600}, {"weight": 1, "specificationId": "cmkauuj580000620v7qprf1fa", "singleSidedPrice": 1600}, {"weight": 1, "specificationId": "cmkavuol30000ft7ltr5dldbf", "singleSidedPrice": 1800}, {"weight": 1, "specificationId": "cmkavvbot0001ft7l6yfnze23", "singleSidedPrice": 2000}, {"weight": 1, "specificationId": "cmk6fdf7400084b63698iy8j5", "singleSidedPrice": 2900}, {"weight": 1, "specificationId": "cmk6fcj4d00044b63ydvo3m99", "singleSidedPrice": 3500}, {"weight": 1, "specificationId": "cmk6fd3tf00064b63chde9ajf", "singleSidedPrice": 4300}, {"weight": 1, "specificationId": "cmk6feqsv000a4b631dxzz34w", "singleSidedPrice": 5400}, {"weight": 1, "specificationId": "cmk6gcadq0000v9w22gdjvtj0", "singleSidedPrice": 6900}, {"weight": 1, "specificationId": "cmk6gcljh0002v9w2h60pr8xa", "singleSidedPrice": 12700}, {"weight": 1, "specificationId": "cmk6f27np0004o43xbl1qfr5n", "singleSidedPrice": 320}, {"weight": 1, "specificationId": "cmk6fbng600014b63lbz4hbql", "singleSidedPrice": 430}, {"weight": 1, "specificationId": "cmk6f3ym40007o43x4w1i7igj", "singleSidedPrice": 700}, {"weight": 1, "specificationId": "cmk6f88vu000ao43x13j2f12j", "singleSidedPrice": 850}, {"weight": 1, "specificationId": "cmk6fjyhq000d4b63ltsp5xkp", "singleSidedPrice": 1400}, {"weight": 1, "specificationId": "cmk6fvjw00007hxtsirwx4s8m", "singleSidedPrice": 1600}, {"weight": 1, "specificationId": "cmk6fkx5l000f4b63teec2nro", "singleSidedPrice": 1500}, {"weight": 1, "specificationId": "cmkauuj5e0001620vtvan1277", "singleSidedPrice": 1600}, {"weight": 1, "specificationId": "cmkavvboy0002ft7lsl0ipbee", "singleSidedPrice": 2000}, {"weight": 1, "specificationId": "cmk6fdf7600094b63ff6454lx", "singleSidedPrice": 2900}, {"weight": 1, "specificationId": "cmk6fcj4f00054b63m430jdn4", "singleSidedPrice": 3500}, {"weight": 1, "specificationId": "cmk6fd3th00074b63i1ouhou9", "singleSidedPrice": 4300}, {"weight": 1, "specificationId": "cmk6feqsy000b4b63vxejnfur", "singleSidedPrice": 5400}, {"weight": 1, "specificationId": "cmk6gcadu0001v9w2k7ogf6zt", "singleSidedPrice": 6900}, {"weight": 1, "specificationId": "cmk6gcljl0003v9w2qe2j0lo1", "singleSidedPrice": 12700}, {"weight": 1, "specificationId": "cmk6fc2o500024b63vwcm68cp", "singleSidedPrice": 220}, {"weight": 1, "specificationId": "cmk6f27nr0005o43xwyhm7een", "singleSidedPrice": 320}, {"weight": 1, "specificationId": "cmk6fc2od00034b63mc8vtlep", "singleSidedPrice": 220}], "pricingMode": "sqinch", "inkjetBasePrice": 9, "inkjetBaseSpecId": ""}]	{"cmk6cj27s0001oeub8ot2p5wq": "pg_1768786011553_8h4u0zoem", "cmk6cl3kp0004oeub4w4fpghp": "pg_1768786011033_7qd25f1mq"}	null	cm	\N	mm2	\N	none	\N	\N	\N	\N	\N	0	t	2026-01-19 01:27:59.081	2026-01-22 05:38:22.282
cmklw5zmv0007iz63kbhevsc2	cmklvrqx40001dgdw7f98ssrs	2401_002	in_house	delivery_motorcycle	오토바이퀵배달		0.00	0.00	0.0		indigo	{}	all	\N	\N	\N	\N	[]	{}	null	cm	null	mm2	null	night30_weekend20	[{"price": 8000, "maxDistance": 5, "minDistance": 0}, {"price": 13000, "maxDistance": 10, "minDistance": 5}, {"price": 18000, "maxDistance": 15, "minDistance": 10}, {"price": 20000, "maxDistance": 20, "minDistance": 15}]	1000.00	0	50000.00	3000.00	1	t	2026-01-20 01:04:33.704	2026-01-20 06:58:54.778
cmklwg4lx000113ixxok1a64o	cmklvrqx40001dgdw7f98ssrs	2401_005	in_house	delivery_pickup	방문수령		0.00	0.00	0.0		indigo	{}	all	\N	\N	\N	\N	[]	{}	null	cm	null	mm2	null	none	\N	\N	\N	\N	\N	4	t	2026-01-20 01:12:26.709	2026-01-20 01:58:37.182
cmklw66ag000diz63dhe9kkcw	cmklvrqx40001dgdw7f98ssrs	2401_003	in_house	delivery_damas	다마스		0.00	55000.00	0.0		indigo	{}	all	\N	\N	\N	\N	[]	{}	null	cm	null	mm2	null	night30_weekend20	[{"price": 15000, "maxDistance": 5, "minDistance": 0}, {"price": 20000, "maxDistance": 10, "minDistance": 5}, {"price": 25000, "maxDistance": 15, "minDistance": 10}, {"price": 30000, "maxDistance": 20, "minDistance": 15}]	1500.00	0	50000.00	3000.00	2	t	2026-01-20 01:04:42.329	2026-01-20 07:06:48.226
cmklwokoe00012xun3harcjh6	cmkkvz2dp002o1032eo930jjl	230102_002	in_house	finishing_area	연판		0.00	0.00	1.0		\N	{}	all	\N	\N	\N	\N	null	null	null	cm	null	mm	[{"area": 2400, "price": 25000, "maxWidth": 30, "maxHeight": 80}, {"area": 3000, "price": 50000, "maxWidth": 30, "maxHeight": 100}, {"area": 4500, "price": 77000, "maxWidth": 30, "maxHeight": 150}, {"area": 6000, "price": 132000, "maxWidth": 30, "maxHeight": 200}]	none	\N	\N	\N	\N	\N	1	t	2026-01-20 01:19:00.782	2026-01-20 02:04:05.922
cmklw6k9k000jiz63ea5ng1h4	cmklvrqx40001dgdw7f98ssrs	2401_004	in_house	delivery_freight	화물배송		0.00	0.00	0.0		indigo	{}	all	\N	\N	\N	\N	[]	{}	null	cm	null	mm2	null	none	[]	0.00	0	50000.00	3000.00	3	t	2026-01-20 01:05:00.44	2026-01-20 07:07:04.101
cmkc9ptog0001jautjvefxhf6	cmk6hojvf000312ucl4e7yq1i	22203_001	in_house	nup_page_range	스타제본+출력(고급용지)		0.00	0.00	1.0		indigo	{cmk6bx7xd0006w4rgt2s54dqp,cmk6bw3930004w4rgfz1xi87r,cmk6bnlsk0002w4rgwhc1y6dw}	all	\N	\N	\N	\N	[{"id": "pg_1768290703920_9w889gcv5", "color": "green", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}]}, {"id": "pg_1768290748020_r6zoyq7pl", "color": "blue", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}]}]	{"cmk6bnlsk0002w4rgwhc1y6dw": "pg_1768290748020_r6zoyq7pl", "cmk6bw3930004w4rgfz1xi87r": null, "cmk6bx7xd0006w4rgt2s54dqp": "pg_1768290703920_9w889gcv5"}	[30, 40, 50]	cm	\N	mm2	\N	none	\N	\N	\N	\N	\N	0	t	2026-01-13 07:26:12.351	2026-01-21 13:32:30.037
cmkkwnyu80001znpspowsyqks	cmkkvz2dp002o1032eo930jjl	230102_001	in_house	finishing_area	동판		0.00	0.00	2.0		\N	{}	all	\N	\N	\N	\N	null	null	null	cm	[{"price": 1000, "maxLength": 100, "minLength": 0}, {"price": 2000, "maxLength": 200, "minLength": 100}]	mm	[{"area": 2400, "price": 50000, "maxWidth": 30, "maxHeight": 80}, {"area": 3000, "price": 77000, "maxWidth": 30, "maxHeight": 100}, {"area": 4500, "price": 120000, "maxWidth": 30, "maxHeight": 150}, {"area": 6000, "price": 150000, "maxWidth": 30, "maxHeight": 200}]	none	\N	\N	\N	\N	\N	0	t	2026-01-19 08:30:46.305	2026-01-22 05:20:03.948
cmkafl76r0001kz5orjfsda7c	cmk5crnw9000514mitnz68inm	11_001	in_house	paper_output_spec	웨딩베이비		0.00	0.00	1.0		indigo	{}	all	\N	\N		\N	[{"id": "pg_1768178038155_nz57kv6ai", "color": "green", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 1000, "sixColorSinglePrice": 1000, "fourColorDoublePrice": 1000, "fourColorSinglePrice": 1000}, {"up": 2, "weight": 1.2, "sixColorDoublePrice": 600, "sixColorSinglePrice": 600, "fourColorDoublePrice": 600, "fourColorSinglePrice": 600}, {"up": 4, "weight": 1.3, "sixColorDoublePrice": 330, "sixColorSinglePrice": 330, "fourColorDoublePrice": 330, "fourColorSinglePrice": 330}, {"up": 8, "weight": 1.4, "sixColorDoublePrice": 180, "sixColorSinglePrice": 180, "fourColorDoublePrice": 180, "fourColorSinglePrice": 180}], "specPrices": [{"weight": 1, "specificationId": "cmk6fbng100004b63c70xzv5a", "singleSidedPrice": 270}, {"weight": 1, "specificationId": "cmk6fu8av0005hxtsrjafllf0", "singleSidedPrice": 360}, {"weight": 1, "specificationId": "cmk6f3ym20006o43xdewhcbes", "singleSidedPrice": 450}, {"weight": 1, "specificationId": "cmk6f88vs0009o43x378tye2v", "singleSidedPrice": 550}, {"weight": 1, "specificationId": "cmk6ftqqu0004hxtskccmbx2s", "singleSidedPrice": 550}, {"weight": 1, "specificationId": "cmk6f6ndh0008o43xcv3mdzu1", "singleSidedPrice": 700}, {"weight": 1, "specificationId": "cmk6fjyhm000c4b631modt98m", "singleSidedPrice": 850}, {"weight": 1, "specificationId": "cmk6fkx5j000e4b639whx3sxx", "singleSidedPrice": 950}, {"weight": 1, "specificationId": "cmk6fvjvy0006hxtspj3i6nks", "singleSidedPrice": 1000}, {"weight": 1, "specificationId": "cmkauuj580000620v7qprf1fa", "singleSidedPrice": 1000}, {"weight": 1, "specificationId": "cmkavuol30000ft7ltr5dldbf", "singleSidedPrice": 1100}, {"weight": 1, "specificationId": "cmkavvbot0001ft7l6yfnze23", "singleSidedPrice": 1300}, {"weight": 1, "specificationId": "cmk6fdf7400084b63698iy8j5", "singleSidedPrice": 1800}, {"weight": 1, "specificationId": "cmk6fcj4d00044b63ydvo3m99", "singleSidedPrice": 2200}, {"weight": 1, "specificationId": "cmk6fd3tf00064b63chde9ajf", "singleSidedPrice": 2700}, {"weight": 1, "specificationId": "cmk6feqsv000a4b631dxzz34w", "singleSidedPrice": 3400}, {"weight": 1, "specificationId": "cmk6gcadq0000v9w22gdjvtj0", "singleSidedPrice": 4300}, {"weight": 1, "specificationId": "cmk6gcljh0002v9w2h60pr8xa", "singleSidedPrice": 7900}, {"weight": 1, "specificationId": "cmk6f27np0004o43xbl1qfr5n", "singleSidedPrice": 200}, {"weight": 1, "specificationId": "cmk6fbng600014b63lbz4hbql", "singleSidedPrice": 270}, {"weight": 1, "specificationId": "cmk6f3ym40007o43x4w1i7igj", "singleSidedPrice": 450}, {"weight": 1, "specificationId": "cmk6f88vu000ao43x13j2f12j", "singleSidedPrice": 550}, {"weight": 1, "specificationId": "cmk6fjyhq000d4b63ltsp5xkp", "singleSidedPrice": 850}, {"weight": 1, "specificationId": "cmk6fvjw00007hxtsirwx4s8m", "singleSidedPrice": 1000}, {"weight": 1, "specificationId": "cmk6fkx5l000f4b63teec2nro", "singleSidedPrice": 950}, {"weight": 1, "specificationId": "cmkauuj5e0001620vtvan1277", "singleSidedPrice": 1000}, {"weight": 1, "specificationId": "cmkavvboy0002ft7lsl0ipbee", "singleSidedPrice": 1300}, {"weight": 1, "specificationId": "cmk6fdf7600094b63ff6454lx", "singleSidedPrice": 1800}, {"weight": 1, "specificationId": "cmk6fcj4f00054b63m430jdn4", "singleSidedPrice": 2200}, {"weight": 1, "specificationId": "cmk6fd3th00074b63i1ouhou9", "singleSidedPrice": 2700}, {"weight": 1, "specificationId": "cmk6feqsy000b4b63vxejnfur", "singleSidedPrice": 3400}, {"weight": 1, "specificationId": "cmk6gcadu0001v9w2k7ogf6zt", "singleSidedPrice": 4300}, {"weight": 1, "specificationId": "cmk6gcljl0003v9w2qe2j0lo1", "singleSidedPrice": 7900}, {"weight": 1.2, "specificationId": "cmk6fc2o500024b63vwcm68cp", "singleSidedPrice": 160}, {"weight": 1, "specificationId": "cmk6f27nr0005o43xwyhm7een", "singleSidedPrice": 200}, {"weight": 1, "specificationId": "cmk6fc2od00034b63mc8vtlep", "singleSidedPrice": 140}], "pricingMode": "spec", "inkjetBasePrice": 5.625, "inkjetBaseSpecId": "cmk6f3ym20006o43xdewhcbes"}, {"id": "pg_1768178039087_itb887tbc", "color": "blue", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 1000, "sixColorSinglePrice": 1000, "fourColorDoublePrice": 1000, "fourColorSinglePrice": 1000}, {"up": 2, "weight": 1.2, "sixColorDoublePrice": 600, "sixColorSinglePrice": 600, "fourColorDoublePrice": 600, "fourColorSinglePrice": 600}, {"up": 4, "weight": 1.3, "sixColorDoublePrice": 330, "sixColorSinglePrice": 330, "fourColorDoublePrice": 330, "fourColorSinglePrice": 330}, {"up": 8, "weight": 1.4, "sixColorDoublePrice": 180, "sixColorSinglePrice": 180, "fourColorDoublePrice": 180, "fourColorSinglePrice": 180}], "specPrices": [], "pricingMode": "spec", "inkjetBasePrice": 5}]	{"cmk6bnlsk0002w4rgwhc1y6dw": "pg_1768178039087_itb887tbc", "cmk6bw3930004w4rgfz1xi87r": "pg_1768178038155_nz57kv6ai", "cmk6bx7xd0006w4rgt2s54dqp": null, "cmk6c19320008w4rgtgxtmtlc": "pg_1768178039087_itb887tbc", "cmk6cj27s0001oeub8ot2p5wq": "pg_1768178039087_itb887tbc", "cmk6cl3kp0004oeub4w4fpghp": "pg_1768178038155_nz57kv6ai"}	\N	cm	\N	mm2	\N	none	\N	\N	\N	\N	\N	0	t	2026-01-12 00:35:01.922	2026-01-22 05:58:05.387
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, "productCode", "productName", "categoryId", "isActive", "isNew", "isBest", "memberType", "basePrice", "thumbnailUrl", "detailImages", description, "sortOrder", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: receivable_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.receivable_payments (id, "receivableId", amount, "paymentDate", "paymentMethod", description, "journalId", "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: receivables; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.receivables (id, "clientId", "clientName", "clientCode", "orderId", "orderNumber", "journalId", "originalAmount", "paidAmount", balance, "issueDate", "dueDate", status, description, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: reception_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reception_schedules (id, date, year, month, day, "dayOfWeek", status, "openTime", "closeTime", reason, "reasonType", "isHoliday", "holidayName", "modifiedBy", "modifiedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: regular_holiday_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.regular_holiday_settings (id, type, "weeklyDays", "monthlyDays", "yearlyDates", "effectiveFrom", "effectiveTo", name, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: sales_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_categories (id, code, name, depth, "parentId", "sortOrder", "isActive", description, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: sales_category_options; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_category_options (id, code, name, "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schedules (id, "creatorId", "creatorName", "creatorDeptId", "creatorDeptName", title, description, location, "startAt", "endAt", "isAllDay", "isPersonal", "isDepartment", "isCompany", "sharedDeptIds", "scheduleType", reminders, "isRecurring", "recurringRule", "recurringConfig", "recurringEnd", "parentId", attendees, color, tags, "relatedType", "relatedId", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: settlements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settlements (id, "periodType", "periodStart", "periodEnd", "totalSales", "totalPurchases", "totalIncome", "totalExpense", "receivablesBalance", "payablesBalance", "netProfit", "netCashFlow", status, "confirmedBy", "confirmedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: specification_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.specification_prices (id, "specificationId", "priceType", "groupId", price, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: specifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.specifications (id, code, name, "widthInch", "heightInch", "widthMm", "heightMm", orientation, "pairId", "forIndigo", "forInkjet", "forAlbum", "forFrame", "forBooklet", "squareMeters", description, nup, "nupSqInch", "sortOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
cmk6fvjw00007hxtsirwx4s8m	SPEC_MK6FVJVZ12W0D1	11x16	11.0000	16.0000	279.40	406.40	portrait	cmk6fvjvy0006hxtspj3i6nks	t	t	t	t	f	0.11		1+up	176.00	1	t	2026-01-09 05:32:00.24	2026-01-12 07:45:59.768
cmk6fcj4f00054b63m430jdn4	SPEC_MK6FCJ4EF2N8O8	24x16	24.0000	16.0000	609.60	406.40	landscape	cmk6fcj4d00044b63ydvo3m99	f	t	f	t	f	0.25		\N	\N	1	t	2026-01-09 05:17:12.784	2026-01-09 05:33:19.728
cmk6fcj4d00044b63ydvo3m99	SPEC_MK6FCJ4BXJTVMZ	16x24	16.0000	24.0000	406.40	609.60	portrait	cmk6fcj4f00054b63m430jdn4	f	t	f	t	f	0.25		\N	\N	0	t	2026-01-09 05:17:12.781	2026-01-09 05:33:19.73
cmk6fjyhm000c4b631modt98m	SPEC_MK6FJYHLDM7V1D	14x11	14.0000	11.0000	355.60	279.40	landscape	cmk6fjyhq000d4b63ltsp5xkp	t	t	t	t	f	0.10		1up	154.00	0	t	2026-01-09 05:22:59.29	2026-01-12 07:45:29.339
cmk6fbng600014b63lbz4hbql	SPEC_MK6FBNG5WIDIH0	8x6	8.0000	6.0000	203.20	152.40	landscape	cmk6fbng100004b63c70xzv5a	t	t	t	t	f	0.03		4up	48.00	1	t	2026-01-09 05:16:31.734	2026-01-12 07:44:48.313
cmk6fjyhq000d4b63ltsp5xkp	SPEC_MK6FJYHPQ1PHAJ	11x14	11.0000	14.0000	279.40	355.60	portrait	cmk6fjyhm000c4b631modt98m	t	t	t	t	f	0.10		1up	154.00	1	t	2026-01-09 05:22:59.295	2026-01-12 07:45:34.36
cmk6fkx5j000e4b639whx3sxx	SPEC_MK6FKX5HD6YFRE	11x15	11.0000	15.0000	279.40	381.00	portrait	cmk6fkx5l000f4b63teec2nro	t	t	t	t	f	0.11		1+up	165.00	0	t	2026-01-09 05:23:44.214	2026-01-12 07:45:41.942
cmk6fkx5l000f4b63teec2nro	SPEC_MK6FKX5LUBY7RW	15x11	15.0000	11.0000	381.00	279.40	landscape	cmk6fkx5j000e4b639whx3sxx	t	t	t	t	f	0.11		1+up	165.00	1	t	2026-01-09 05:23:44.218	2026-01-12 07:45:47.5
cmk6fc2o500024b63vwcm68cp	SPEC_MK6FC2O4OM6S9X	4x6	4.0000	6.0000	101.60	152.40	portrait	cmk6fc2od00034b63mc8vtlep	t	t	t	t	f	0.02		8up	24.00	2	t	2026-01-09 05:16:51.461	2026-01-12 07:44:23.063
cmk6fvjvy0006hxtspj3i6nks	SPEC_MK6FVJVXP5WNUD	16x11	16.0000	11.0000	406.40	279.40	landscape	cmk6fvjw00007hxtsirwx4s8m	t	t	t	t	f	0.11		1+up	176.00	0	t	2026-01-09 05:32:00.238	2026-01-12 07:45:52.61
cmkavuol30000ft7ltr5dldbf	SPEC_MKAVUOL0J6QT17	14x14	14.0000	14.0000	355.60	355.60	square	\N	f	t	t	t	f	0.13		1++up	196.00	0	t	2026-01-12 08:10:18.231	2026-01-12 08:10:18.231
cmk6fu8av0005hxtsrjafllf0	SPEC_MK6FU8AT4M5TUL	8x8	8.0000	8.0000	203.20	203.20	square	\N	t	t	t	t	f	0.04		2up	64.00	0	t	2026-01-09 05:30:58.566	2026-01-12 07:44:53.769
cmk6f88vu000ao43x13j2f12j	SPEC_MK6F88VUH376T4	A4_가로	11.6929	8.2677	297.00	210.00	landscape	cmk6f88vs0009o43x378tye2v	t	t	t	t	t	0.06		2up	96.67	1	t	2026-01-09 05:13:52.891	2026-01-12 07:32:37.753
cmk6ftqqu0004hxtskccmbx2s	SPEC_MK6FTQQTU54J9M	10x10	10.0000	10.0000	254.00	254.00	square	\N	t	t	t	t	f	0.06		1up	100.00	0	t	2026-01-09 05:30:35.814	2026-01-12 07:40:28.911
cmk6fd3th00074b63i1ouhou9	SPEC_MK6FD3TH5DSNGX	24x20	24.0000	20.0000	609.60	508.00	landscape	cmk6fd3tf00064b63chde9ajf	f	t	f	t	f	0.31		\N	\N	1	t	2026-01-09 05:17:39.606	2026-01-09 05:33:19.747
cmk6fd3tf00064b63chde9ajf	SPEC_MK6FD3TEQ9EDYT	20x24	20.0000	24.0000	508.00	609.60	portrait	cmk6fd3th00074b63i1ouhou9	f	t	f	t	f	0.31		\N	\N	0	t	2026-01-09 05:17:39.603	2026-01-09 05:33:19.748
cmk6fdf7600094b63ff6454lx	SPEC_MK6FDF75KBIE79	20x16	20.0000	16.0000	508.00	406.40	landscape	cmk6fdf7400084b63698iy8j5	f	t	f	t	f	0.21		\N	\N	1	t	2026-01-09 05:17:54.354	2026-01-09 05:33:19.749
cmk6fdf7400084b63698iy8j5	SPEC_MK6FDF7348VQZ2	16x20	16.0000	20.0000	406.40	508.00	portrait	cmk6fdf7600094b63ff6454lx	f	t	f	t	f	0.21		\N	\N	0	t	2026-01-09 05:17:54.352	2026-01-09 05:33:19.751
cmk6feqsy000b4b63vxejnfur	SPEC_MK6FEQSXSZ9UIL	30x20	30.0000	20.0000	762.00	508.00	landscape	cmk6feqsv000a4b631dxzz34w	f	t	f	t	f	0.39		\N	\N	1	t	2026-01-09 05:18:56.05	2026-01-09 05:33:19.752
cmk6feqsv000a4b631dxzz34w	SPEC_MK6FEQSTYH8RNN	20x30	20.0000	30.0000	508.00	762.00	portrait	cmk6feqsy000b4b63vxejnfur	f	t	f	t	f	0.39		\N	\N	0	t	2026-01-09 05:18:56.047	2026-01-09 05:33:19.753
cmkavvboy0002ft7lsl0ipbee	SPEC_MKAVVBOX69ZPKD	16x14	16.0000	14.0000	406.40	355.60	landscape	cmkavvbot0001ft7l6yfnze23	f	t	t	f	f	0.14		1++up	224.00	1	t	2026-01-12 08:10:48.178	2026-01-12 08:10:48.178
cmkavvbot0001ft7l6yfnze23	SPEC_MKAVVBORIUX0R8	14x16	14.0000	16.0000	355.60	406.40	portrait	cmkavvboy0002ft7lsl0ipbee	f	t	t	f	f	0.14		1++up	224.00	0	t	2026-01-12 08:10:48.172	2026-01-12 08:10:48.181
cmk6gcadu0001v9w2k7ogf6zt	SPEC_MK6GCADTMH5YQE	32x24	32.0000	24.0000	812.80	609.60	landscape	cmk6gcadq0000v9w22gdjvtj0	f	t	f	t	f	0.50		\N	\N	1	t	2026-01-09 05:45:01.074	2026-01-09 05:45:01.074
cmk6gcadq0000v9w22gdjvtj0	SPEC_MK6GCADO326N1W	24x32	24.0000	32.0000	609.60	812.80	portrait	cmk6gcadu0001v9w2k7ogf6zt	f	t	f	t	f	0.50		\N	\N	0	t	2026-01-09 05:45:01.07	2026-01-09 05:45:01.077
cmk6gcljl0003v9w2qe2j0lo1	SPEC_MK6GCLJL6WQKQP	44x32	44.0000	32.0000	1117.60	812.80	landscape	cmk6gcljh0002v9w2h60pr8xa	f	t	f	t	f	0.91		\N	\N	1	t	2026-01-09 05:45:15.537	2026-01-09 05:45:15.537
cmk6gcljh0002v9w2h60pr8xa	SPEC_MK6GCLJHF57VJD	32x44	32.0000	44.0000	812.80	1117.60	portrait	cmk6gcljl0003v9w2qe2j0lo1	f	t	f	t	f	0.91		\N	\N	0	t	2026-01-09 05:45:15.534	2026-01-09 05:45:15.542
cmkauuj5e0001620vtvan1277	SPEC_MKAUUJ5DG0FVKR	15x12	15.0000	12.0000	381.00	304.80	landscape	cmkauuj580000620v7qprf1fa	t	t	t	f	f	0.12		1+up	180.00	1	t	2026-01-12 07:42:11.571	2026-01-12 07:42:11.571
cmkauuj580000620v7qprf1fa	SPEC_MKAUUJ4V92NY1W	12x15	12.0000	15.0000	304.80	381.00	portrait	cmkauuj5e0001620vtvan1277	t	t	t	f	f	0.12		1+up	180.00	0	t	2026-01-12 07:42:11.553	2026-01-12 07:42:11.573
cmk6f3ym20006o43xdewhcbes	SPEC_MK6F3YM0BJ67WT	8x10	8.0000	10.0000	203.20	254.00	portrait	cmk6f3ym40007o43x4w1i7igj	t	t	t	t	f	0.05		2up	80.00	0	t	2026-01-09 05:10:32.953	2026-01-12 07:45:00.153
cmk6f3ym40007o43x4w1i7igj	SPEC_MK6F3YM4S5MXSK	10x8	10.0000	8.0000	254.00	203.20	landscape	cmk6f3ym20006o43xdewhcbes	t	t	t	t	f	0.05		2up	80.00	1	t	2026-01-09 05:10:32.957	2026-01-12 07:45:10.019
cmk6fc2od00034b63mc8vtlep	SPEC_MK6FC2OCUJ3BVZ	6x4	6.0000	4.0000	152.40	101.60	landscape	cmk6fc2o500024b63vwcm68cp	t	t	t	t	f	0.02		8up	24.00	3	t	2026-01-09 05:16:51.469	2026-01-12 07:44:27.376
cmk6f27np0004o43xbl1qfr5n	SPEC_MK6F27NNC0LTDT	5x7	5.0000	7.0000	127.00	177.80	portrait	cmk6f27nr0005o43xwyhm7een	t	t	t	t	f	0.02		4up	35.00	1	t	2026-01-09 05:09:11.364	2026-01-12 07:44:33.649
cmk6f88vs0009o43x378tye2v	SPEC_MK6F88VRR1BBT9	A4_세로	8.2677	11.6929	210.00	297.00	portrait	cmk6f88vu000ao43x13j2f12j	t	t	t	t	t	0.06		2up	96.67	0	t	2026-01-09 05:13:52.888	2026-01-12 07:45:16.598
cmk6f6ndh0008o43xcv3mdzu1	SPEC_MK6F6NDGHIGTYA	11x11	11.0000	11.0000	279.40	279.40	square	\N	t	t	t	t	f	0.08		1up	121.00	0	t	2026-01-09 05:12:38.357	2026-01-12 07:45:22.964
cmk6f27nr0005o43xwyhm7een	SPEC_MK6F27NR73M7YI	7x5	7.0000	5.0000	177.80	127.00	landscape	cmk6f27np0004o43xbl1qfr5n	t	t	t	t	f	0.02		4up	35.00	2	t	2026-01-09 05:09:11.368	2026-01-12 07:44:37.955
cmk6fbng100004b63c70xzv5a	SPEC_MK6FBNFZRK6CZQ	6x8	6.0000	8.0000	152.40	203.20	portrait	cmk6fbng600014b63lbz4hbql	t	t	t	t	f	0.03		4up	48.00	0	t	2026-01-09 05:16:31.728	2026-01-12 07:44:43.781
cmko09lk5000bv6kuzlu1kxro	SPEC_MKO09LK4F53K2K	10x13	10.0000	13.0000	254.00	330.20	portrait	cmko09ljq000av6kuaenx18dg	t	t	t	f	f	0.08		1	130.00	1	t	2026-01-21 12:34:52.902	2026-01-21 12:34:52.902
cmko09ljq000av6kuaenx18dg	SPEC_MKO09LJOYZGE2R	13x10	13.0000	10.0000	330.20	254.00	landscape	cmko09lk5000bv6kuzlu1kxro	t	t	t	f	f	0.08		1	130.00	0	t	2026-01-21 12:34:52.886	2026-01-21 12:34:52.91
\.


--
-- Data for Name: staff; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staff (id, "staffId", password, name, "branchId", "departmentId", "position", phone, mobile, email, "postalCode", address, "addressDetail", "settlementGrade", "allowedIps", "canEditInManagerView", "canLoginAsManager", "canChangeDepositStage", "canChangeReceptionStage", "canChangeCancelStage", "canEditMemberInfo", "canViewSettlement", "canChangeOrderAmount", "memberViewScope", "salesViewScope", "menuPermissions", "categoryPermissions", "processPermissions", "isActive", "lastLoginAt", "lastLoginIp", "adminMemo", "joinDate", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: staff_clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staff_clients (id, "staffId", "clientId", "isPrimary", "createdAt") FROM stdin;
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (id, key, value, category, label, "createdAt", "updatedAt") FROM stdin;
cmkagjh2s000okz5o7nh3mf73	printing_indigo_1color_cost	21	printing	인디고 1도 인쇄비	2026-01-12 01:01:41.032	2026-01-12 01:12:12.668
cmklxtuo9000156sbh24up53e	shipping_include_jeju	true	shipping	제주도 포함	2026-01-20 01:51:06.633	2026-01-20 01:51:06.633
cmklxtuo9000356sbrrv3ufp6	shipping_include_islands	true	shipping	섬지역 포함	2026-01-20 01:51:06.633	2026-01-20 01:51:06.633
cmklxtuo9000256sbtmiec5i9	shipping_standard_fee	5500	shipping	일반 택배비	2026-01-20 01:51:06.633	2026-01-20 01:51:06.633
cmklxtuo9000056sbtlal2oy7	shipping_free_threshold	90000	shipping	무료배송 기준금액	2026-01-20 01:51:06.633	2026-01-20 01:51:06.633
cmklxtupz000456sb9tn3skow	shipping_include_mountain	true	shipping	산간지역 포함	2026-01-20 01:51:06.633	2026-01-20 01:51:06.633
cmklxtuq3000556sb7zf47dr7	shipping_island_fee	7500	shipping	도서산간 택배비	2026-01-20 01:51:06.633	2026-01-20 01:51:06.633
cmko1hief0016v6kuxu9clq4w	company_ecommerce_number		company	통신판매번호	2026-01-21 13:09:01.643	2026-01-21 13:09:16.104
cmko1hie70015v6ku8j38bmm9	company_fax		company	팩스	2026-01-21 13:09:01.644	2026-01-21 13:09:16.104
cmko1hido000tv6kusna8rrkt	company_phone		company	대표전화	2026-01-21 13:09:01.643	2026-01-21 13:09:16.104
cmko1hie30012v6kuwa81v5fj	company_business_number	201-86-02186	company	사업자번호	2026-01-21 13:09:01.642	2026-01-21 13:09:16.104
cmko1hie1000yv6kunf99x13q	company_cs_phone		company	고객센터	2026-01-21 13:09:01.644	2026-01-21 13:09:16.105
cmko1hido000sv6kuemwjvaxm	company_ceo	우	company	대표자	2026-01-21 13:09:01.641	2026-01-21 13:09:16.105
cmko1hido000qv6kusuep2na8	company_business_type		company	업태	2026-01-21 13:09:01.64	2026-01-21 13:09:16.104
cmko1hido000uv6kuxqsm0crq	company_email		company	이메일	2026-01-21 13:09:01.643	2026-01-21 13:09:16.104
cmko1hie30013v6kukk3bci57	company_postal_code		company	우편번호	2026-01-21 13:09:01.644	2026-01-21 13:09:16.11
cmko1hie0000xv6kuiwa4qltx	company_address		company	주소	2026-01-21 13:09:01.644	2026-01-21 13:09:16.11
cmko1hidp000vv6kuk0ttv5lc	company_cs_hours		company	운영시간	2026-01-21 13:09:01.644	2026-01-21 13:09:16.11
cmko1hie20011v6ku5wmhyuwi	company_address_detail		company	상세주소	2026-01-21 13:09:01.644	2026-01-21 13:09:16.11
cmko1hie2000zv6ku6c6g32z6	company_domain		company	도메인	2026-01-21 13:09:01.644	2026-01-21 13:09:16.11
cmko1hie20010v6kurihw0yld	company_server_info		company	서버정보	2026-01-21 13:09:01.644	2026-01-21 13:09:16.112
cmko1hie50014v6kunfyr5rps	company_admin_domain		company	관리자도메인	2026-01-21 13:09:01.644	2026-01-21 13:09:16.112
cmko1hido000rv6kuo0evhq0t	company_name	(주)프린팅솔루션즈	company	회사명	2026-01-21 13:09:01.64	2026-01-21 13:09:16.104
cmko1hidq000wv6kur1si3sxt	company_business_category		company	종목	2026-01-21 13:09:01.641	2026-01-21 13:09:16.104
\.


--
-- Data for Name: todos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.todos (id, "creatorId", "creatorName", "creatorDeptId", "creatorDeptName", title, content, priority, "startDate", "dueDate", "isAllDay", status, "completedAt", "completedBy", "isPersonal", "isDepartment", "isCompany", "sharedDeptIds", "reminderAt", "isReminderSent", "isRecurring", "recurringType", "recurringEnd", "relatedType", "relatedId", color, tags, "createdAt", "updatedAt") FROM stdin;
cmkotkv310000mz200i5x40l1	cmk5cpt1z0000ijuehpm9vtid	사용자	\N	\N	이음학교에 졸업앨범 PDF보내기		normal	2026-01-21 15:00:00	2026-01-22 02:15:00	f	completed	2026-01-22 03:48:57.662	\N	t	t	f	{}	\N	f	f	\N	\N	\N	\N	#3B82F6	{}	2026-01-22 02:15:27.326	2026-01-22 03:48:57.664
cmkozcf1l0001taz0kkt26jpi	cmk5cpt1z0000ijuehpm9vtid	사용자	\N	\N	222	222	urgent	2026-01-21 15:00:00	2026-01-22 04:59:00	f	completed	2026-01-22 04:57:13.181	\N	t	f	f	{}	\N	f	f	\N	\N	\N	\N	#3B82F6	{}	2026-01-22 04:56:50.985	2026-01-22 04:57:13.182
cmkq4wo3u00081391qh1ua3s3	cmk5cpt1z0000ijuehpm9vtid	사용자	\N	\N	경기초등학교 시안 보내기		normal	\N	\N	f	completed	2026-01-23 00:24:00.776	\N	t	f	f	{}	\N	f	f	\N	\N	\N	\N	#3B82F6	{}	2026-01-23 00:20:20.106	2026-01-23 00:24:00.778
cmkq4x1tw000913918k9zpbq4	cmk5cpt1z0000ijuehpm9vtid	사용자	\N	\N	경기초등학교 시안 보내기		normal	2026-01-22 15:00:00	2026-01-23 14:59:00	f	completed	2026-01-24 07:41:34.061	\N	t	f	f	{}	\N	f	f	\N	\N	\N	\N	#3B82F6	{}	2026-01-23 00:20:37.892	2026-01-24 07:41:34.063
cmkozby700000taz0eni73zi0	cmk5cpt1z0000ijuehpm9vtid	사용자	\N	\N	222	231	normal	\N	\N	f	completed	2026-01-24 07:41:36.144	\N	t	t	f	{}	\N	f	f	\N	\N	\N	\N	#3B82F6	{}	2026-01-22 04:56:29.148	2026-01-24 07:41:36.145
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password, name, role, "isActive", "createdAt", "updatedAt") FROM stdin;
cmk5cpt1z0000ijuehpm9vtid	admin@printing-erp.com	$2b$10$pkTmO8AUAt19kq5RiMwLa.pDQUOI63yVVAeYd7M45GKa73jqHJrR.	관리자	admin	t	2026-01-08 11:15:47.159	2026-01-08 11:15:47.159
cmk5cpt270001ijue6jqvlvbb	manager@printing-erp.com	$2b$10$pkTmO8AUAt19kq5RiMwLa.pDQUOI63yVVAeYd7M45GKa73jqHJrR.	매니저	manager	t	2026-01-08 11:15:47.168	2026-01-08 11:15:47.168
cmks3rakp00009zk3u0xtn8k8	wooceo@gmail.com	$2b$10$hPgGnfgiPvaSPN51.oZsOOwausjPMvH2dMYkCjhw14Jv7B0orp5oG	관리자	admin	t	2026-01-24 09:23:42.025	2026-01-24 09:23:42.025
\.


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: client_groups client_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_groups
    ADD CONSTRAINT client_groups_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: consultation_alerts consultation_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultation_alerts
    ADD CONSTRAINT consultation_alerts_pkey PRIMARY KEY (id);


--
-- Name: consultation_categories consultation_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultation_categories
    ADD CONSTRAINT consultation_categories_pkey PRIMARY KEY (id);


--
-- Name: consultation_channels consultation_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultation_channels
    ADD CONSTRAINT consultation_channels_pkey PRIMARY KEY (id);


--
-- Name: consultation_follow_ups consultation_follow_ups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultation_follow_ups
    ADD CONSTRAINT consultation_follow_ups_pkey PRIMARY KEY (id);


--
-- Name: consultation_guides consultation_guides_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultation_guides
    ADD CONSTRAINT consultation_guides_pkey PRIMARY KEY (id);


--
-- Name: consultation_messages consultation_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultation_messages
    ADD CONSTRAINT consultation_messages_pkey PRIMARY KEY (id);


--
-- Name: consultation_slas consultation_slas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultation_slas
    ADD CONSTRAINT consultation_slas_pkey PRIMARY KEY (id);


--
-- Name: consultation_stat_snapshots consultation_stat_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultation_stat_snapshots
    ADD CONSTRAINT consultation_stat_snapshots_pkey PRIMARY KEY (id);


--
-- Name: consultation_surveys consultation_surveys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultation_surveys
    ADD CONSTRAINT consultation_surveys_pkey PRIMARY KEY (id);


--
-- Name: consultation_tag_mappings consultation_tag_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultation_tag_mappings
    ADD CONSTRAINT consultation_tag_mappings_pkey PRIMARY KEY (id);


--
-- Name: consultation_tags consultation_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultation_tags
    ADD CONSTRAINT consultation_tags_pkey PRIMARY KEY (id);


--
-- Name: consultations consultations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_pkey PRIMARY KEY (id);


--
-- Name: copper_plate_histories copper_plate_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.copper_plate_histories
    ADD CONSTRAINT copper_plate_histories_pkey PRIMARY KEY (id);


--
-- Name: copper_plates copper_plates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.copper_plates
    ADD CONSTRAINT copper_plates_pkey PRIMARY KEY (id);


--
-- Name: custom_options custom_options_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_options
    ADD CONSTRAINT custom_options_pkey PRIMARY KEY (id);


--
-- Name: customer_health_scores customer_health_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_health_scores
    ADD CONSTRAINT customer_health_scores_pkey PRIMARY KEY (id);


--
-- Name: delivery_pricings delivery_pricings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_pricings
    ADD CONSTRAINT delivery_pricings_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: fabric_suppliers fabric_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fabric_suppliers
    ADD CONSTRAINT fabric_suppliers_pkey PRIMARY KEY (id);


--
-- Name: fabrics fabrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fabrics
    ADD CONSTRAINT fabrics_pkey PRIMARY KEY (id);


--
-- Name: group_half_product_prices group_half_product_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_half_product_prices
    ADD CONSTRAINT group_half_product_prices_pkey PRIMARY KEY (id);


--
-- Name: group_product_prices group_product_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_product_prices
    ADD CONSTRAINT group_product_prices_pkey PRIMARY KEY (id);


--
-- Name: group_production_setting_prices group_production_setting_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_production_setting_prices
    ADD CONSTRAINT group_production_setting_prices_pkey PRIMARY KEY (id);


--
-- Name: half_product_options half_product_options_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.half_product_options
    ADD CONSTRAINT half_product_options_pkey PRIMARY KEY (id);


--
-- Name: half_product_price_tiers half_product_price_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.half_product_price_tiers
    ADD CONSTRAINT half_product_price_tiers_pkey PRIMARY KEY (id);


--
-- Name: half_product_specifications half_product_specifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.half_product_specifications
    ADD CONSTRAINT half_product_specifications_pkey PRIMARY KEY (id);


--
-- Name: half_products half_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.half_products
    ADD CONSTRAINT half_products_pkey PRIMARY KEY (id);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: journals journals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journals
    ADD CONSTRAINT journals_pkey PRIMARY KEY (id);


--
-- Name: my_products my_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.my_products
    ADD CONSTRAINT my_products_pkey PRIMARY KEY (id);


--
-- Name: order_files order_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_files
    ADD CONSTRAINT order_files_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_shippings order_shippings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_shippings
    ADD CONSTRAINT order_shippings_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: paper_groups paper_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paper_groups
    ADD CONSTRAINT paper_groups_pkey PRIMARY KEY (id);


--
-- Name: paper_manufacturers paper_manufacturers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paper_manufacturers
    ADD CONSTRAINT paper_manufacturers_pkey PRIMARY KEY (id);


--
-- Name: paper_prices paper_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paper_prices
    ADD CONSTRAINT paper_prices_pkey PRIMARY KEY (id);


--
-- Name: paper_suppliers paper_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paper_suppliers
    ADD CONSTRAINT paper_suppliers_pkey PRIMARY KEY (id);


--
-- Name: papers papers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.papers
    ADD CONSTRAINT papers_pkey PRIMARY KEY (id);


--
-- Name: payable_payments payable_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payable_payments
    ADD CONSTRAINT payable_payments_pkey PRIMARY KEY (id);


--
-- Name: payables payables_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payables
    ADD CONSTRAINT payables_pkey PRIMARY KEY (id);


--
-- Name: permission_templates permission_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission_templates
    ADD CONSTRAINT permission_templates_pkey PRIMARY KEY (id);


--
-- Name: process_histories process_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.process_histories
    ADD CONSTRAINT process_histories_pkey PRIMARY KEY (id);


--
-- Name: product_bindings product_bindings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_bindings
    ADD CONSTRAINT product_bindings_pkey PRIMARY KEY (id);


--
-- Name: product_covers product_covers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_covers
    ADD CONSTRAINT product_covers_pkey PRIMARY KEY (id);


--
-- Name: product_finishings product_finishings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_finishings
    ADD CONSTRAINT product_finishings_pkey PRIMARY KEY (id);


--
-- Name: product_foils product_foils_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_foils
    ADD CONSTRAINT product_foils_pkey PRIMARY KEY (id);


--
-- Name: product_half_products product_half_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_half_products
    ADD CONSTRAINT product_half_products_pkey PRIMARY KEY (id);


--
-- Name: product_papers product_papers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_papers
    ADD CONSTRAINT product_papers_pkey PRIMARY KEY (id);


--
-- Name: product_specifications product_specifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_specifications
    ADD CONSTRAINT product_specifications_pkey PRIMARY KEY (id);


--
-- Name: production_groups production_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_groups
    ADD CONSTRAINT production_groups_pkey PRIMARY KEY (id);


--
-- Name: production_setting_prices production_setting_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_setting_prices
    ADD CONSTRAINT production_setting_prices_pkey PRIMARY KEY (id);


--
-- Name: production_setting_specifications production_setting_specifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_setting_specifications
    ADD CONSTRAINT production_setting_specifications_pkey PRIMARY KEY (id);


--
-- Name: production_settings production_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_settings
    ADD CONSTRAINT production_settings_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: receivable_payments receivable_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receivable_payments
    ADD CONSTRAINT receivable_payments_pkey PRIMARY KEY (id);


--
-- Name: receivables receivables_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receivables
    ADD CONSTRAINT receivables_pkey PRIMARY KEY (id);


--
-- Name: reception_schedules reception_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reception_schedules
    ADD CONSTRAINT reception_schedules_pkey PRIMARY KEY (id);


--
-- Name: regular_holiday_settings regular_holiday_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regular_holiday_settings
    ADD CONSTRAINT regular_holiday_settings_pkey PRIMARY KEY (id);


--
-- Name: sales_categories sales_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_categories
    ADD CONSTRAINT sales_categories_pkey PRIMARY KEY (id);


--
-- Name: sales_category_options sales_category_options_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_category_options
    ADD CONSTRAINT sales_category_options_pkey PRIMARY KEY (id);


--
-- Name: schedules schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_pkey PRIMARY KEY (id);


--
-- Name: settlements settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_pkey PRIMARY KEY (id);


--
-- Name: specification_prices specification_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specification_prices
    ADD CONSTRAINT specification_prices_pkey PRIMARY KEY (id);


--
-- Name: specifications specifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specifications
    ADD CONSTRAINT specifications_pkey PRIMARY KEY (id);


--
-- Name: staff_clients staff_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_clients
    ADD CONSTRAINT staff_clients_pkey PRIMARY KEY (id);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: todos todos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: accounts_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX accounts_code_key ON public.accounts USING btree (code);


--
-- Name: accounts_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "accounts_isActive_idx" ON public.accounts USING btree ("isActive");


--
-- Name: accounts_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_type_idx ON public.accounts USING btree (type);


--
-- Name: bank_accounts_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "bank_accounts_isActive_idx" ON public.bank_accounts USING btree ("isActive");


--
-- Name: branches_branchCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "branches_branchCode_key" ON public.branches USING btree ("branchCode");


--
-- Name: categories_categoryType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "categories_categoryType_idx" ON public.categories USING btree ("categoryType");


--
-- Name: categories_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX categories_code_key ON public.categories USING btree (code);


--
-- Name: categories_isTopMenu_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "categories_isTopMenu_idx" ON public.categories USING btree ("isTopMenu");


--
-- Name: categories_parentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "categories_parentId_idx" ON public.categories USING btree ("parentId");


--
-- Name: client_groups_branchId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "client_groups_branchId_idx" ON public.client_groups USING btree ("branchId");


--
-- Name: client_groups_groupCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "client_groups_groupCode_key" ON public.client_groups USING btree ("groupCode");


--
-- Name: clients_clientCode_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_clientCode_idx" ON public.clients USING btree ("clientCode");


--
-- Name: clients_clientCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "clients_clientCode_key" ON public.clients USING btree ("clientCode");


--
-- Name: clients_groupId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_groupId_idx" ON public.clients USING btree ("groupId");


--
-- Name: clients_mainGenre_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_mainGenre_idx" ON public.clients USING btree ("mainGenre");


--
-- Name: clients_memberGrade_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_memberGrade_idx" ON public.clients USING btree ("memberGrade");


--
-- Name: clients_memberType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_memberType_idx" ON public.clients USING btree ("memberType");


--
-- Name: clients_oauthProvider_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_oauthProvider_idx" ON public.clients USING btree ("oauthProvider");


--
-- Name: clients_oauthProvider_oauthId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "clients_oauthProvider_oauthId_key" ON public.clients USING btree ("oauthProvider", "oauthId");


--
-- Name: consultation_alerts_alertType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultation_alerts_alertType_idx" ON public.consultation_alerts USING btree ("alertType");


--
-- Name: consultation_alerts_clientId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultation_alerts_clientId_idx" ON public.consultation_alerts USING btree ("clientId");


--
-- Name: consultation_alerts_consultationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultation_alerts_consultationId_idx" ON public.consultation_alerts USING btree ("consultationId");


--
-- Name: consultation_alerts_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultation_alerts_createdAt_idx" ON public.consultation_alerts USING btree ("createdAt");


--
-- Name: consultation_alerts_isRead_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultation_alerts_isRead_idx" ON public.consultation_alerts USING btree ("isRead");


--
-- Name: consultation_alerts_isResolved_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultation_alerts_isResolved_idx" ON public.consultation_alerts USING btree ("isResolved");


--
-- Name: consultation_categories_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX consultation_categories_code_key ON public.consultation_categories USING btree (code);


--
-- Name: consultation_categories_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultation_categories_isActive_idx" ON public.consultation_categories USING btree ("isActive");


--
-- Name: consultation_channels_channel_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX consultation_channels_channel_idx ON public.consultation_channels USING btree (channel);


--
-- Name: consultation_channels_consultationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultation_channels_consultationId_idx" ON public.consultation_channels USING btree ("consultationId");


--
-- Name: consultation_follow_ups_consultationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultation_follow_ups_consultationId_idx" ON public.consultation_follow_ups USING btree ("consultationId");


--
-- Name: consultation_guides_categoryId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultation_guides_categoryId_idx" ON public.consultation_guides USING btree ("categoryId");


--
-- Name: consultation_messages_consultationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultation_messages_consultationId_idx" ON public.consultation_messages USING btree ("consultationId");


--
-- Name: consultation_messages_direction_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX consultation_messages_direction_idx ON public.consultation_messages USING btree (direction);


--
-- Name: consultation_messages_isRead_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultation_messages_isRead_idx" ON public.consultation_messages USING btree ("isRead");


--
-- Name: consultation_stat_snapshots_periodStart_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultation_stat_snapshots_periodStart_idx" ON public.consultation_stat_snapshots USING btree ("periodStart");


--
-- Name: consultation_stat_snapshots_period_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX consultation_stat_snapshots_period_idx ON public.consultation_stat_snapshots USING btree (period);


--
-- Name: consultation_stat_snapshots_period_periodStart_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "consultation_stat_snapshots_period_periodStart_key" ON public.consultation_stat_snapshots USING btree (period, "periodStart");


--
-- Name: consultation_surveys_consultationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultation_surveys_consultationId_idx" ON public.consultation_surveys USING btree ("consultationId");


--
-- Name: consultation_surveys_consultationId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "consultation_surveys_consultationId_key" ON public.consultation_surveys USING btree ("consultationId");


--
-- Name: consultation_surveys_satisfactionScore_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultation_surveys_satisfactionScore_idx" ON public.consultation_surveys USING btree ("satisfactionScore");


--
-- Name: consultation_tag_mappings_consultationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultation_tag_mappings_consultationId_idx" ON public.consultation_tag_mappings USING btree ("consultationId");


--
-- Name: consultation_tag_mappings_consultationId_tagId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "consultation_tag_mappings_consultationId_tagId_key" ON public.consultation_tag_mappings USING btree ("consultationId", "tagId");


--
-- Name: consultation_tag_mappings_tagId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultation_tag_mappings_tagId_idx" ON public.consultation_tag_mappings USING btree ("tagId");


--
-- Name: consultation_tags_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX consultation_tags_category_idx ON public.consultation_tags USING btree (category);


--
-- Name: consultation_tags_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX consultation_tags_code_key ON public.consultation_tags USING btree (code);


--
-- Name: consultation_tags_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultation_tags_isActive_idx" ON public.consultation_tags USING btree ("isActive");


--
-- Name: consultations_categoryId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultations_categoryId_idx" ON public.consultations USING btree ("categoryId");


--
-- Name: consultations_clientId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultations_clientId_idx" ON public.consultations USING btree ("clientId");


--
-- Name: consultations_consultNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "consultations_consultNumber_key" ON public.consultations USING btree ("consultNumber");


--
-- Name: consultations_consultedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultations_consultedAt_idx" ON public.consultations USING btree ("consultedAt");


--
-- Name: consultations_counselorId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultations_counselorId_idx" ON public.consultations USING btree ("counselorId");


--
-- Name: consultations_followUpDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "consultations_followUpDate_idx" ON public.consultations USING btree ("followUpDate");


--
-- Name: consultations_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX consultations_status_idx ON public.consultations USING btree (status);


--
-- Name: copper_plate_histories_actionType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "copper_plate_histories_actionType_idx" ON public.copper_plate_histories USING btree ("actionType");


--
-- Name: copper_plate_histories_copperPlateId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "copper_plate_histories_copperPlateId_idx" ON public.copper_plate_histories USING btree ("copperPlateId");


--
-- Name: copper_plates_clientId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "copper_plates_clientId_idx" ON public.copper_plates USING btree ("clientId");


--
-- Name: copper_plates_plateType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "copper_plates_plateType_idx" ON public.copper_plates USING btree ("plateType");


--
-- Name: copper_plates_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX copper_plates_status_idx ON public.copper_plates USING btree (status);


--
-- Name: custom_options_productId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "custom_options_productId_idx" ON public.custom_options USING btree ("productId");


--
-- Name: customer_health_scores_clientId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "customer_health_scores_clientId_key" ON public.customer_health_scores USING btree ("clientId");


--
-- Name: customer_health_scores_grade_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX customer_health_scores_grade_idx ON public.customer_health_scores USING btree (grade);


--
-- Name: customer_health_scores_isAtRisk_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "customer_health_scores_isAtRisk_idx" ON public.customer_health_scores USING btree ("isAtRisk");


--
-- Name: customer_health_scores_totalScore_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "customer_health_scores_totalScore_idx" ON public.customer_health_scores USING btree ("totalScore");


--
-- Name: delivery_pricings_deliveryMethod_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "delivery_pricings_deliveryMethod_key" ON public.delivery_pricings USING btree ("deliveryMethod");


--
-- Name: departments_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX departments_code_key ON public.departments USING btree (code);


--
-- Name: fabric_suppliers_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX fabric_suppliers_code_key ON public.fabric_suppliers USING btree (code);


--
-- Name: fabric_suppliers_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fabric_suppliers_isActive_idx" ON public.fabric_suppliers USING btree ("isActive");


--
-- Name: fabrics_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fabrics_category_idx ON public.fabrics USING btree (category);


--
-- Name: fabrics_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX fabrics_code_key ON public.fabrics USING btree (code);


--
-- Name: fabrics_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fabrics_isActive_idx" ON public.fabrics USING btree ("isActive");


--
-- Name: fabrics_material_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fabrics_material_idx ON public.fabrics USING btree (material);


--
-- Name: fabrics_supplierId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fabrics_supplierId_idx" ON public.fabrics USING btree ("supplierId");


--
-- Name: group_half_product_prices_groupId_halfProductId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "group_half_product_prices_groupId_halfProductId_key" ON public.group_half_product_prices USING btree ("groupId", "halfProductId");


--
-- Name: group_product_prices_groupId_productId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "group_product_prices_groupId_productId_key" ON public.group_product_prices USING btree ("groupId", "productId");


--
-- Name: group_production_setting_prices_clientGroupId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "group_production_setting_prices_clientGroupId_idx" ON public.group_production_setting_prices USING btree ("clientGroupId");


--
-- Name: group_production_setting_prices_clientGroupId_productionSet_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "group_production_setting_prices_clientGroupId_productionSet_key" ON public.group_production_setting_prices USING btree ("clientGroupId", "productionSettingId", "specificationId", "priceGroupId", "minQuantity");


--
-- Name: group_production_setting_prices_priceGroupId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "group_production_setting_prices_priceGroupId_idx" ON public.group_production_setting_prices USING btree ("priceGroupId");


--
-- Name: group_production_setting_prices_productionSettingId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "group_production_setting_prices_productionSettingId_idx" ON public.group_production_setting_prices USING btree ("productionSettingId");


--
-- Name: half_product_options_halfProductId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "half_product_options_halfProductId_idx" ON public.half_product_options USING btree ("halfProductId");


--
-- Name: half_product_price_tiers_halfProductId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "half_product_price_tiers_halfProductId_idx" ON public.half_product_price_tiers USING btree ("halfProductId");


--
-- Name: half_product_specifications_halfProductId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "half_product_specifications_halfProductId_idx" ON public.half_product_specifications USING btree ("halfProductId");


--
-- Name: half_products_categoryLargeId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "half_products_categoryLargeId_idx" ON public.half_products USING btree ("categoryLargeId");


--
-- Name: half_products_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX half_products_code_key ON public.half_products USING btree (code);


--
-- Name: journal_entries_accountId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "journal_entries_accountId_idx" ON public.journal_entries USING btree ("accountId");


--
-- Name: journal_entries_journalId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "journal_entries_journalId_idx" ON public.journal_entries USING btree ("journalId");


--
-- Name: journals_clientId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "journals_clientId_idx" ON public.journals USING btree ("clientId");


--
-- Name: journals_journalDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "journals_journalDate_idx" ON public.journals USING btree ("journalDate");


--
-- Name: journals_voucherNo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "journals_voucherNo_key" ON public.journals USING btree ("voucherNo");


--
-- Name: journals_voucherType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "journals_voucherType_idx" ON public.journals USING btree ("voucherType");


--
-- Name: my_products_clientId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "my_products_clientId_idx" ON public.my_products USING btree ("clientId");


--
-- Name: my_products_clientId_productType_productId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "my_products_clientId_productType_productId_key" ON public.my_products USING btree ("clientId", "productType", "productId");


--
-- Name: order_files_orderItemId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "order_files_orderItemId_idx" ON public.order_files USING btree ("orderItemId");


--
-- Name: order_items_orderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "order_items_orderId_idx" ON public.order_items USING btree ("orderId");


--
-- Name: order_shippings_orderId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "order_shippings_orderId_key" ON public.order_shippings USING btree ("orderId");


--
-- Name: orders_barcode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX orders_barcode_key ON public.orders USING btree (barcode);


--
-- Name: orders_clientId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "orders_clientId_idx" ON public.orders USING btree ("clientId");


--
-- Name: orders_orderNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "orders_orderNumber_key" ON public.orders USING btree ("orderNumber");


--
-- Name: orders_orderedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "orders_orderedAt_idx" ON public.orders USING btree ("orderedAt");


--
-- Name: orders_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_status_idx ON public.orders USING btree (status);


--
-- Name: paper_groups_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX paper_groups_code_key ON public.paper_groups USING btree (code);


--
-- Name: paper_groups_color_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX paper_groups_color_idx ON public.paper_groups USING btree (color);


--
-- Name: paper_groups_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "paper_groups_isActive_idx" ON public.paper_groups USING btree ("isActive");


--
-- Name: paper_manufacturers_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX paper_manufacturers_code_key ON public.paper_manufacturers USING btree (code);


--
-- Name: paper_manufacturers_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "paper_manufacturers_isActive_idx" ON public.paper_manufacturers USING btree ("isActive");


--
-- Name: paper_prices_paperId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "paper_prices_paperId_idx" ON public.paper_prices USING btree ("paperId");


--
-- Name: paper_prices_priceType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "paper_prices_priceType_idx" ON public.paper_prices USING btree ("priceType");


--
-- Name: paper_suppliers_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX paper_suppliers_code_key ON public.paper_suppliers USING btree (code);


--
-- Name: paper_suppliers_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "paper_suppliers_isActive_idx" ON public.paper_suppliers USING btree ("isActive");


--
-- Name: papers_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX papers_code_key ON public.papers USING btree (code);


--
-- Name: papers_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "papers_isActive_idx" ON public.papers USING btree ("isActive");


--
-- Name: papers_manufacturerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "papers_manufacturerId_idx" ON public.papers USING btree ("manufacturerId");


--
-- Name: papers_paperGroupId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "papers_paperGroupId_idx" ON public.papers USING btree ("paperGroupId");


--
-- Name: papers_paperType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "papers_paperType_idx" ON public.papers USING btree ("paperType");


--
-- Name: papers_supplierId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "papers_supplierId_idx" ON public.papers USING btree ("supplierId");


--
-- Name: payable_payments_payableId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "payable_payments_payableId_idx" ON public.payable_payments USING btree ("payableId");


--
-- Name: payable_payments_paymentDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "payable_payments_paymentDate_idx" ON public.payable_payments USING btree ("paymentDate");


--
-- Name: payables_dueDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "payables_dueDate_idx" ON public.payables USING btree ("dueDate");


--
-- Name: payables_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payables_status_idx ON public.payables USING btree (status);


--
-- Name: payables_supplierId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "payables_supplierId_idx" ON public.payables USING btree ("supplierId");


--
-- Name: permission_templates_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX permission_templates_name_key ON public.permission_templates USING btree (name);


--
-- Name: process_histories_orderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "process_histories_orderId_idx" ON public.process_histories USING btree ("orderId");


--
-- Name: product_bindings_productId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "product_bindings_productId_idx" ON public.product_bindings USING btree ("productId");


--
-- Name: product_covers_productId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "product_covers_productId_idx" ON public.product_covers USING btree ("productId");


--
-- Name: product_finishings_productId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "product_finishings_productId_idx" ON public.product_finishings USING btree ("productId");


--
-- Name: product_foils_productId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "product_foils_productId_idx" ON public.product_foils USING btree ("productId");


--
-- Name: product_half_products_productId_halfProductId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "product_half_products_productId_halfProductId_key" ON public.product_half_products USING btree ("productId", "halfProductId");


--
-- Name: product_papers_productId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "product_papers_productId_idx" ON public.product_papers USING btree ("productId");


--
-- Name: product_specifications_productId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "product_specifications_productId_idx" ON public.product_specifications USING btree ("productId");


--
-- Name: production_groups_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX production_groups_code_key ON public.production_groups USING btree (code);


--
-- Name: production_groups_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "production_groups_isActive_idx" ON public.production_groups USING btree ("isActive");


--
-- Name: production_groups_parentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "production_groups_parentId_idx" ON public.production_groups USING btree ("parentId");


--
-- Name: production_setting_prices_productionSettingId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "production_setting_prices_productionSettingId_idx" ON public.production_setting_prices USING btree ("productionSettingId");


--
-- Name: production_setting_specifications_productionSettingId_speci_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "production_setting_specifications_productionSettingId_speci_key" ON public.production_setting_specifications USING btree ("productionSettingId", "specificationId");


--
-- Name: production_settings_groupId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "production_settings_groupId_idx" ON public.production_settings USING btree ("groupId");


--
-- Name: production_settings_pricingType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "production_settings_pricingType_idx" ON public.production_settings USING btree ("pricingType");


--
-- Name: products_categoryId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "products_categoryId_idx" ON public.products USING btree ("categoryId");


--
-- Name: products_productCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "products_productCode_key" ON public.products USING btree ("productCode");


--
-- Name: receivable_payments_paymentDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "receivable_payments_paymentDate_idx" ON public.receivable_payments USING btree ("paymentDate");


--
-- Name: receivable_payments_receivableId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "receivable_payments_receivableId_idx" ON public.receivable_payments USING btree ("receivableId");


--
-- Name: receivables_clientId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "receivables_clientId_idx" ON public.receivables USING btree ("clientId");


--
-- Name: receivables_dueDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "receivables_dueDate_idx" ON public.receivables USING btree ("dueDate");


--
-- Name: receivables_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX receivables_status_idx ON public.receivables USING btree (status);


--
-- Name: reception_schedules_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reception_schedules_status_idx ON public.reception_schedules USING btree (status);


--
-- Name: reception_schedules_year_month_day_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX reception_schedules_year_month_day_key ON public.reception_schedules USING btree (year, month, day);


--
-- Name: reception_schedules_year_month_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reception_schedules_year_month_idx ON public.reception_schedules USING btree (year, month);


--
-- Name: sales_categories_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX sales_categories_code_key ON public.sales_categories USING btree (code);


--
-- Name: sales_categories_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "sales_categories_isActive_idx" ON public.sales_categories USING btree ("isActive");


--
-- Name: sales_categories_parentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "sales_categories_parentId_idx" ON public.sales_categories USING btree ("parentId");


--
-- Name: sales_category_options_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX sales_category_options_code_key ON public.sales_category_options USING btree (code);


--
-- Name: sales_category_options_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "sales_category_options_isActive_idx" ON public.sales_category_options USING btree ("isActive");


--
-- Name: schedules_creatorDeptId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "schedules_creatorDeptId_idx" ON public.schedules USING btree ("creatorDeptId");


--
-- Name: schedules_creatorId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "schedules_creatorId_idx" ON public.schedules USING btree ("creatorId");


--
-- Name: schedules_endAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "schedules_endAt_idx" ON public.schedules USING btree ("endAt");


--
-- Name: schedules_isCompany_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "schedules_isCompany_idx" ON public.schedules USING btree ("isCompany");


--
-- Name: schedules_isDepartment_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "schedules_isDepartment_idx" ON public.schedules USING btree ("isDepartment");


--
-- Name: schedules_isPersonal_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "schedules_isPersonal_idx" ON public.schedules USING btree ("isPersonal");


--
-- Name: schedules_parentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "schedules_parentId_idx" ON public.schedules USING btree ("parentId");


--
-- Name: schedules_scheduleType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "schedules_scheduleType_idx" ON public.schedules USING btree ("scheduleType");


--
-- Name: schedules_startAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "schedules_startAt_idx" ON public.schedules USING btree ("startAt");


--
-- Name: settlements_periodStart_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "settlements_periodStart_idx" ON public.settlements USING btree ("periodStart");


--
-- Name: settlements_periodType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "settlements_periodType_idx" ON public.settlements USING btree ("periodType");


--
-- Name: settlements_periodType_periodStart_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "settlements_periodType_periodStart_key" ON public.settlements USING btree ("periodType", "periodStart");


--
-- Name: settlements_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX settlements_status_idx ON public.settlements USING btree (status);


--
-- Name: specification_prices_specificationId_priceType_groupId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "specification_prices_specificationId_priceType_groupId_key" ON public.specification_prices USING btree ("specificationId", "priceType", "groupId");


--
-- Name: specifications_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX specifications_code_key ON public.specifications USING btree (code);


--
-- Name: specifications_forAlbum_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "specifications_forAlbum_idx" ON public.specifications USING btree ("forAlbum");


--
-- Name: specifications_forBooklet_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "specifications_forBooklet_idx" ON public.specifications USING btree ("forBooklet");


--
-- Name: specifications_forFrame_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "specifications_forFrame_idx" ON public.specifications USING btree ("forFrame");


--
-- Name: specifications_forIndigo_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "specifications_forIndigo_idx" ON public.specifications USING btree ("forIndigo");


--
-- Name: specifications_forInkjet_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "specifications_forInkjet_idx" ON public.specifications USING btree ("forInkjet");


--
-- Name: specifications_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "specifications_isActive_idx" ON public.specifications USING btree ("isActive");


--
-- Name: specifications_orientation_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX specifications_orientation_idx ON public.specifications USING btree (orientation);


--
-- Name: specifications_pairId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "specifications_pairId_idx" ON public.specifications USING btree ("pairId");


--
-- Name: staff_branchId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "staff_branchId_idx" ON public.staff USING btree ("branchId");


--
-- Name: staff_clients_clientId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "staff_clients_clientId_idx" ON public.staff_clients USING btree ("clientId");


--
-- Name: staff_clients_staffId_clientId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "staff_clients_staffId_clientId_key" ON public.staff_clients USING btree ("staffId", "clientId");


--
-- Name: staff_clients_staffId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "staff_clients_staffId_idx" ON public.staff_clients USING btree ("staffId");


--
-- Name: staff_departmentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "staff_departmentId_idx" ON public.staff USING btree ("departmentId");


--
-- Name: staff_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "staff_isActive_idx" ON public.staff USING btree ("isActive");


--
-- Name: staff_staffId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "staff_staffId_key" ON public.staff USING btree ("staffId");


--
-- Name: system_settings_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX system_settings_category_idx ON public.system_settings USING btree (category);


--
-- Name: system_settings_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX system_settings_key_key ON public.system_settings USING btree (key);


--
-- Name: todos_creatorDeptId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "todos_creatorDeptId_idx" ON public.todos USING btree ("creatorDeptId");


--
-- Name: todos_creatorId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "todos_creatorId_idx" ON public.todos USING btree ("creatorId");


--
-- Name: todos_dueDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "todos_dueDate_idx" ON public.todos USING btree ("dueDate");


--
-- Name: todos_isCompany_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "todos_isCompany_idx" ON public.todos USING btree ("isCompany");


--
-- Name: todos_isDepartment_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "todos_isDepartment_idx" ON public.todos USING btree ("isDepartment");


--
-- Name: todos_isPersonal_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "todos_isPersonal_idx" ON public.todos USING btree ("isPersonal");


--
-- Name: todos_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX todos_status_idx ON public.todos USING btree (status);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: accounts accounts_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: categories categories_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: client_groups client_groups_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_groups
    ADD CONSTRAINT "client_groups_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: clients clients_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT "clients_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public.client_groups(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: consultation_follow_ups consultation_follow_ups_consultationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultation_follow_ups
    ADD CONSTRAINT "consultation_follow_ups_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES public.consultations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: consultation_messages consultation_messages_consultationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultation_messages
    ADD CONSTRAINT "consultation_messages_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES public.consultations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: consultation_tag_mappings consultation_tag_mappings_tagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultation_tag_mappings
    ADD CONSTRAINT "consultation_tag_mappings_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES public.consultation_tags(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: consultations consultations_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT "consultations_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.consultation_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: consultations consultations_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT "consultations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: copper_plate_histories copper_plate_histories_copperPlateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.copper_plate_histories
    ADD CONSTRAINT "copper_plate_histories_copperPlateId_fkey" FOREIGN KEY ("copperPlateId") REFERENCES public.copper_plates(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: copper_plates copper_plates_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.copper_plates
    ADD CONSTRAINT "copper_plates_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: custom_options custom_options_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_options
    ADD CONSTRAINT "custom_options_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_health_scores customer_health_scores_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_health_scores
    ADD CONSTRAINT "customer_health_scores_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: fabrics fabrics_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fabrics
    ADD CONSTRAINT "fabrics_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.fabric_suppliers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: group_half_product_prices group_half_product_prices_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_half_product_prices
    ADD CONSTRAINT "group_half_product_prices_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public.client_groups(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: group_half_product_prices group_half_product_prices_halfProductId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_half_product_prices
    ADD CONSTRAINT "group_half_product_prices_halfProductId_fkey" FOREIGN KEY ("halfProductId") REFERENCES public.half_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: group_product_prices group_product_prices_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_product_prices
    ADD CONSTRAINT "group_product_prices_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public.client_groups(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: group_product_prices group_product_prices_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_product_prices
    ADD CONSTRAINT "group_product_prices_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: group_production_setting_prices group_production_setting_prices_clientGroupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_production_setting_prices
    ADD CONSTRAINT "group_production_setting_prices_clientGroupId_fkey" FOREIGN KEY ("clientGroupId") REFERENCES public.client_groups(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: group_production_setting_prices group_production_setting_prices_productionSettingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_production_setting_prices
    ADD CONSTRAINT "group_production_setting_prices_productionSettingId_fkey" FOREIGN KEY ("productionSettingId") REFERENCES public.production_settings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: half_product_options half_product_options_halfProductId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.half_product_options
    ADD CONSTRAINT "half_product_options_halfProductId_fkey" FOREIGN KEY ("halfProductId") REFERENCES public.half_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: half_product_price_tiers half_product_price_tiers_halfProductId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.half_product_price_tiers
    ADD CONSTRAINT "half_product_price_tiers_halfProductId_fkey" FOREIGN KEY ("halfProductId") REFERENCES public.half_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: half_product_specifications half_product_specifications_halfProductId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.half_product_specifications
    ADD CONSTRAINT "half_product_specifications_halfProductId_fkey" FOREIGN KEY ("halfProductId") REFERENCES public.half_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: half_products half_products_categoryLargeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.half_products
    ADD CONSTRAINT "half_products_categoryLargeId_fkey" FOREIGN KEY ("categoryLargeId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: journal_entries journal_entries_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT "journal_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: journal_entries journal_entries_journalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT "journal_entries_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES public.journals(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: my_products my_products_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.my_products
    ADD CONSTRAINT "my_products_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_files order_files_orderItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_files
    ADD CONSTRAINT "order_files_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES public.order_items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_items order_items_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_shippings order_shippings_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_shippings
    ADD CONSTRAINT "order_shippings_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: orders orders_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: paper_prices paper_prices_paperId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paper_prices
    ADD CONSTRAINT "paper_prices_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES public.papers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: papers papers_manufacturerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.papers
    ADD CONSTRAINT "papers_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES public.paper_manufacturers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: papers papers_paperGroupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.papers
    ADD CONSTRAINT "papers_paperGroupId_fkey" FOREIGN KEY ("paperGroupId") REFERENCES public.paper_groups(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: papers papers_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.papers
    ADD CONSTRAINT "papers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.paper_suppliers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payable_payments payable_payments_payableId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payable_payments
    ADD CONSTRAINT "payable_payments_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES public.payables(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: process_histories process_histories_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.process_histories
    ADD CONSTRAINT "process_histories_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_bindings product_bindings_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_bindings
    ADD CONSTRAINT "product_bindings_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_covers product_covers_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_covers
    ADD CONSTRAINT "product_covers_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_finishings product_finishings_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_finishings
    ADD CONSTRAINT "product_finishings_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_foils product_foils_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_foils
    ADD CONSTRAINT "product_foils_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_half_products product_half_products_halfProductId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_half_products
    ADD CONSTRAINT "product_half_products_halfProductId_fkey" FOREIGN KEY ("halfProductId") REFERENCES public.half_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_half_products product_half_products_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_half_products
    ADD CONSTRAINT "product_half_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_papers product_papers_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_papers
    ADD CONSTRAINT "product_papers_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_specifications product_specifications_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_specifications
    ADD CONSTRAINT "product_specifications_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: production_groups production_groups_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_groups
    ADD CONSTRAINT "production_groups_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.production_groups(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: production_setting_prices production_setting_prices_productionSettingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_setting_prices
    ADD CONSTRAINT "production_setting_prices_productionSettingId_fkey" FOREIGN KEY ("productionSettingId") REFERENCES public.production_settings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: production_setting_specifications production_setting_specifications_productionSettingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_setting_specifications
    ADD CONSTRAINT "production_setting_specifications_productionSettingId_fkey" FOREIGN KEY ("productionSettingId") REFERENCES public.production_settings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: production_setting_specifications production_setting_specifications_specificationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_setting_specifications
    ADD CONSTRAINT "production_setting_specifications_specificationId_fkey" FOREIGN KEY ("specificationId") REFERENCES public.specifications(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: production_settings production_settings_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_settings
    ADD CONSTRAINT "production_settings_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public.production_groups(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: products products_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: receivable_payments receivable_payments_receivableId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receivable_payments
    ADD CONSTRAINT "receivable_payments_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES public.receivables(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sales_categories sales_categories_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_categories
    ADD CONSTRAINT "sales_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.sales_categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: specification_prices specification_prices_specificationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specification_prices
    ADD CONSTRAINT "specification_prices_specificationId_fkey" FOREIGN KEY ("specificationId") REFERENCES public.specifications(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: staff staff_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT "staff_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: staff_clients staff_clients_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_clients
    ADD CONSTRAINT "staff_clients_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: staff_clients staff_clients_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_clients
    ADD CONSTRAINT "staff_clients_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public.staff(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: staff staff_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT "staff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict kVwACo0keV3I9SVcVGaZmMrfnML612G9k9AuumwjYgviYmJkjgt8njlczQjhRnT

