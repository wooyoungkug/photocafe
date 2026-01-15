--
-- PostgreSQL database dump
--

\restrict 086V2YcyccRfnWFi8GSfQXLMoF1jUTh3VzMaUnCtT2hAaZfU65M3oMmPVUQa2GX

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


SET default_tablespace = '';

SET default_table_access_method = heap;

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
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "salesCategoryId" text
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
    "postalCode" text,
    address text,
    "addressDetail" text,
    "groupId" text,
    "creditGrade" text DEFAULT 'B'::text NOT NULL,
    "paymentTerms" integer DEFAULT 30 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "creditBlocked" boolean DEFAULT false NOT NULL,
    "creditBlockedAt" timestamp(3) without time zone,
    "creditEnabled" boolean DEFAULT false NOT NULL,
    "creditPaymentDay" integer,
    "creditPeriodDays" integer,
    "lastPaymentDate" timestamp(3) without time zone,
    "memberType" text DEFAULT 'individual'::text NOT NULL,
    "oauthId" text,
    "oauthProvider" text,
    password text,
    "paymentType" text DEFAULT 'order'::text NOT NULL,
    "priceType" text DEFAULT 'standard'::text NOT NULL,
    "shippingType" text DEFAULT 'conditional'::text NOT NULL
);


ALTER TABLE public.clients OWNER TO postgres;

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
    "manufacturerId" text,
    "paperType" text DEFAULT 'sheet'::text NOT NULL,
    "sheetSize" text,
    "sheetWidthMm" numeric(10,2),
    "sheetHeightMm" numeric(10,2),
    "rollWidth" text,
    "rollWidthInch" numeric(10,2),
    "rollLength" text,
    "rollLengthM" numeric(10,2),
    grammage integer,
    "grammageDisplay" text,
    finish text DEFAULT 'matte'::text,
    "finishDisplay" text,
    "colorType" text,
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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "customSheetName" text,
    "supplierId" text,
    "printMethods" text[] DEFAULT ARRAY[]::text[],
    "colorGroup" text,
    "paperGroupId" text
);


ALTER TABLE public.papers OWNER TO postgres;

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
    price numeric(12,2) DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "doubleSidedPrice" numeric(12,2),
    "fourColorDoublePrice" numeric(12,2),
    "fourColorSinglePrice" numeric(12,2),
    "singleSidedPrice" numeric(12,2),
    "sixColorDoublePrice" numeric(12,2),
    "sixColorSinglePrice" numeric(12,2),
    weight numeric(5,2),
    "basePages" integer,
    "basePrice" numeric(12,2),
    "pricePerPage" numeric(12,2),
    "rangePrices" jsonb
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
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "paperIds" text[] DEFAULT ARRAY[]::text[],
    "printMethod" text,
    "basePricePerSqInch" numeric(12,6),
    "baseSpecificationId" text,
    "doubleSidedPrice" numeric(12,2),
    "paperPriceGroupMap" jsonb,
    "priceGroups" jsonb,
    "singleSidedPrice" numeric(12,2),
    "pageRanges" jsonb
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
    "forAlbum" boolean DEFAULT false NOT NULL,
    "forFrame" boolean DEFAULT false NOT NULL,
    "forBooklet" boolean DEFAULT false NOT NULL,
    "squareMeters" numeric(10,2),
    description text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    orientation text DEFAULT 'landscape'::text NOT NULL,
    "pairId" text,
    "forIndigo" boolean DEFAULT false NOT NULL,
    "forInkjet" boolean DEFAULT false NOT NULL,
    nup text,
    "nupSqInch" numeric(10,2)
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
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.branches (id, "branchCode", "branchName", "isHeadquarters", address, phone, "isActive", "createdAt", "updatedAt") FROM stdin;
cmkaiqnuj000wkz5o74elpdb6	HQ	본사	t	\N	\N	t	2026-01-12 02:03:15.644	2026-01-12 02:03:15.644
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, code, name, level, depth, "parentId", "isVisible", "isTopMenu", "loginVisibility", "categoryType", "productionForm", "isOutsourced", "pricingUnit", description, "linkUrl", "htmlContent", "sortOrder", "isActive", "iconUrl", "createdAt", "updatedAt", "salesCategoryId") FROM stdin;
cmk5cqvwy000114micn51e4oe	01000000	디지털출력	large	1	\N	t	t	always	HTML	digital_print	f	\N	\N	\N	\N	0	t	/api/v1/upload/category-icons/3af8a687-4b22-4bf5-8f4e-741ad145a5d5.jpg	2026-01-08 11:16:37.522	2026-01-09 00:14:12.898	\N
cmk64sbpp000314ay2aj5kt4d	01020000	인디고출력	medium	2	cmk5cqvwy000114micn51e4oe	t	f	always	HTML	\N	f	\N	\N	\N	\N	0	t	\N	2026-01-09 00:21:33.902	2026-01-09 00:21:33.902	\N
cmk64q1bv000114aye864h6eq	02000000	디지털앨범	large	1	\N	t	t	always	HTML	\N	f	\N	\N	\N	\N	0	t	/api/v1/upload/category-icons/5fc79bc2-5214-43cb-80cd-1197d18a8537.jpg	2026-01-09 00:19:47.131	2026-01-09 00:21:53.741	\N
cmk64tnq3000714ayr2wp4dsf	02010000	압축앨범	medium	2	cmk64q1bv000114aye864h6eq	t	f	always	HTML	\N	f	\N	\N	\N	\N	0	t	\N	2026-01-09 00:22:36.123	2026-01-09 00:22:36.123	\N
cmk64twl1000914ayr1k0mddl	02020000	화보앨범	medium	2	cmk64q1bv000114aye864h6eq	t	f	always	HTML	\N	f	\N	\N	\N	\N	0	t	\N	2026-01-09 00:22:47.605	2026-01-09 00:22:47.605	\N
cmk64snfn000514ayta937zrr	01030000	잉크젯출력	medium	2	cmk5cqvwy000114micn51e4oe	t	f	always	HTML	\N	f	\N	\N	\N	\N	0	t	\N	2026-01-09 00:21:49.091	2026-01-09 00:42:32.547	\N
cmk6huxe2000512uch5cfhh8j	02010100	고급압축앨범	small	3	cmk64tnq3000714ayr2wp4dsf	t	f	always	POD	\N	f	\N	\N	\N	\N	0	t	\N	2026-01-09 06:27:30.314	2026-01-09 06:27:30.314	\N
cmk6hvgkv000712ucc3zajjsd	02010200	레이플릿 압축앨범	small	3	cmk64tnq3000714ayr2wp4dsf	t	f	always	POD	\N	f	\N	\N	\N	\N	0	t	\N	2026-01-09 06:27:55.183	2026-01-09 06:27:55.183	\N
\.


--
-- Data for Name: client_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.client_groups (id, "groupCode", "groupName", "branchId", "generalDiscount", "premiumDiscount", "importedDiscount", description, "isActive", "sortOrder", "createdAt", "updatedAt") FROM stdin;
cmkaiqnum000xkz5ow7k25rf9	GRPMKAIQNU6	스튜디오	cmkaiqnuj000wkz5o74elpdb6	100	100	100	\N	t	0	2026-01-12 02:03:15.647	2026-01-12 02:03:15.647
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients (id, "clientCode", "clientName", "businessNumber", representative, phone, mobile, email, "postalCode", address, "addressDetail", "groupId", "creditGrade", "paymentTerms", status, "createdAt", "updatedAt", "creditBlocked", "creditBlockedAt", "creditEnabled", "creditPaymentDay", "creditPeriodDays", "lastPaymentDate", "memberType", "oauthId", "oauthProvider", password, "paymentType", "priceType", "shippingType") FROM stdin;
\.


--
-- Data for Name: custom_options; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_options (id, "productId", name, type, "values", price, "isRequired", "sortOrder") FROM stdin;
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

COPY public.papers (id, code, name, "manufacturerId", "paperType", "sheetSize", "sheetWidthMm", "sheetHeightMm", "rollWidth", "rollWidthInch", "rollLength", "rollLengthM", grammage, "grammageDisplay", finish, "finishDisplay", "colorType", thickness, "basePrice", "unitType", "discountRate", "discountPrice", "stockQuantity", "minStockLevel", description, memo, "sortOrder", "isActive", "createdAt", "updatedAt", "customSheetName", "supplierId", "printMethods", "colorGroup", "paperGroupId") FROM stdin;
cmk6bnlsk0002w4rgwhc1y6dw	PAPERMK6BITID	아티젠	cmk6ay5yb0000ccm4kecgba4o	sheet	국전지	788.00	1091.00	\N	\N	\N	\N	210	210g/m²	matte	\N	\N	\N	202796.00	ream	0.00	\N	0	0			0	t	2026-01-09 03:33:50.996	2026-01-09 03:37:15.399	\N	cmk6b4g8y00006wgjlqaztouz	{indigo,offset}	\N	\N
cmk6bx7xd0006w4rgt2s54dqp	PAPERMK6BW8DI	아트지	cmk6ay5yb0000ccm4kecgba4o	sheet	국전지	788.00	1091.00	\N	\N	\N	\N	180	180g/m²	matte	\N	\N	\N	107127.00	ream	0.00	\N	0	0			0	t	2026-01-09 03:41:19.585	2026-01-09 03:41:42.823	\N	cmk6b4g8y00006wgjlqaztouz	{indigo,offset}	\N	\N
cmk6bw3930004w4rgfz1xi87r	PAPERMK6BUH2E	스노우	cmk6ay5yb0000ccm4kecgba4o	sheet	국전지	788.00	1091.00	\N	\N	\N	\N	250	250g/m²	lustre	\N	\N	\N	148785.00	ream	0.00	\N	0	0			0	t	2026-01-09 03:40:26.871	2026-01-09 03:41:54.816	\N	cmk6b4g8y00006wgjlqaztouz	{indigo,offset}	\N	\N
cmk6c19320008w4rgtgxtmtlc	PAPERMK6BYYKY	아티젠	cmk6ay5yb0000ccm4kecgba4o	sheet	국전지	788.00	1091.00	\N	\N	\N	\N	230	230g/m²	matte	\N	\N	\N	222103.00	ream	0.00	\N	0	0			0	t	2026-01-09 03:44:27.711	2026-01-09 03:46:00.412	\N	cmk6b4g8y00006wgjlqaztouz	{indigo,offset}	\N	\N
cmk6cj27s0001oeub8ot2p5wq	PAPERMK6CHF48	프리미엄메트	cmk69gtdb0004alpyf4o3mjc8	roll	국전지	788.00	1091.00	24"	\N	30m	\N	240	240g/m²	matte	\N	\N	\N	28000.00	ream	0.00	\N	0	0			0	t	2026-01-09 03:58:18.616	2026-01-09 03:58:37.046	\N	cmk6b4g8y00006wgjlqaztouz	{inkjet}	\N	\N
cmk6cl3kp0004oeub4w4fpghp	PAPERMK6CJT5O	싸틴	cmk6ay5yb0000ccm4kecgba4o	roll	국전지	788.00	1091.00	24"	\N	30m	\N	240	240g/m²	satin	\N	\N	\N	38000.00	roll	0.00	\N	0	0			0	t	2026-01-09 03:59:53.689	2026-01-09 04:00:29.466	\N	cmk6ckcsh0002oeubwy8mjfww	{inkjet}	\N	\N
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
cmk5crnw9000514mitnz68inm	11	웨딩	2	cmk5cpwru000014miy7scmjuy	0	t	2026-01-08 11:17:13.785	2026-01-08 11:17:13.785
cmk5cs9w9000614mitbnzr2nm	222	제본	1	\N	1	t	2026-01-08 11:17:42.298	2026-01-08 11:17:42.298
cmk6dka5d000coeubkdhjlz3u	22201	스타제본	2	cmk5cs9w9000614mitbnzr2nm	0	t	2026-01-09 04:27:15.169	2026-01-09 04:27:15.169
cmk6ghduz0004v9w2qbwc5dna	23	코팅	1	\N	2	t	2026-01-09 05:48:58.86	2026-01-09 05:48:58.86
cmk6gihm30009v9w27j6zfq2m	2301	벨벳무광	2	cmk6ghduz0004v9w2qbwc5dna	0	t	2026-01-09 05:49:50.379	2026-01-09 05:49:50.379
cmk6giqxu000bv9w2ffte8xqw	2302	라미네이팅무광	2	cmk6ghduz0004v9w2qbwc5dna	1	t	2026-01-09 05:50:02.466	2026-01-09 05:50:02.466
cmk6gixr6000dv9w2qzwl16k5	2303	라미네이팅유광	2	cmk6ghduz0004v9w2qbwc5dna	2	t	2026-01-09 05:50:11.298	2026-01-09 05:50:11.298
cmk6hojvf000312ucl4e7yq1i	22203	스타제본+용지포함	2	cmk5cs9w9000614mitbnzr2nm	1	t	2026-01-09 06:22:32.859	2026-01-09 06:28:21.134
cmk6dkiwq000eoeubgi0wr15p	22202	압축제본	2	cmk5cs9w9000614mitbnzr2nm	2	t	2026-01-09 04:27:26.523	2026-01-09 06:28:21.134
\.


--
-- Data for Name: production_setting_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production_setting_prices (id, "productionSettingId", "specificationId", "minQuantity", "maxQuantity", price, "createdAt", "updatedAt", "doubleSidedPrice", "fourColorDoublePrice", "fourColorSinglePrice", "singleSidedPrice", "sixColorDoublePrice", "sixColorSinglePrice", weight, "basePages", "basePrice", "pricePerPage", "rangePrices") FROM stdin;
cmkcbm8lq00107gfe799ac4fm	cmkc9ptog0001jautjvefxhf6	cmk6fbng100004b63c70xzv5a	\N	\N	12000.00	2026-01-13 08:19:24.303	2026-01-13 08:19:24.303	\N	\N	\N	\N	\N	\N	\N	30	12000.00	0.00	{"30": 12000, "40": 12000, "50": 12000, "60": 12000}
cmkcbm8lr00117gfekt0dhc41	cmkc9ptog0001jautjvefxhf6	cmk6fkx5j000e4b639whx3sxx	\N	\N	20000.00	2026-01-13 08:19:24.303	2026-01-13 08:19:24.303	\N	\N	\N	\N	\N	\N	\N	30	20000.00	0.00	{"30": 20000, "40": 20000, "50": 20000, "60": 20000}
cmkcbm8lr00127gfe5m2mhmnx	cmkc9ptog0001jautjvefxhf6	cmk6ftqqu0004hxtskccmbx2s	\N	\N	18000.00	2026-01-13 08:19:24.303	2026-01-13 08:19:24.303	\N	\N	\N	\N	\N	\N	\N	30	18000.00	0.00	{"30": 18000, "40": 18000, "50": 18000, "60": 18000}
cmkcbm8lr00137gfeu08irldb	cmkc9ptog0001jautjvefxhf6	cmk6fu8av0005hxtsrjafllf0	\N	\N	15000.00	2026-01-13 08:19:24.303	2026-01-13 08:19:24.303	\N	\N	\N	\N	\N	\N	\N	30	15000.00	0.00	{"30": 15000, "40": 15000, "50": 15000, "60": 15000}
cmkajh34f001ekz5oajenyj0r	cmkafnozt0007kz5oghfcw2a8	\N	1	\N	0.00	2026-01-12 02:23:48.496	2026-01-12 02:23:48.496	0.00	0.00	0.00	0.00	0.00	0.00	1.00	\N	\N	\N	\N
cmkajh34f001fkz5ow0wcnnc1	cmkafnozt0007kz5oghfcw2a8	\N	2	\N	0.00	2026-01-12 02:23:48.496	2026-01-12 02:23:48.496	0.00	0.00	0.00	0.00	0.00	0.00	1.00	\N	\N	\N	\N
cmkajh34f001gkz5ols4sjm3e	cmkafnozt0007kz5oghfcw2a8	\N	4	\N	0.00	2026-01-12 02:23:48.496	2026-01-12 02:23:48.496	0.00	0.00	0.00	0.00	0.00	0.00	1.00	\N	\N	\N	\N
cmkajh34f001hkz5oc8y65g2p	cmkafnozt0007kz5oghfcw2a8	\N	8	\N	0.00	2026-01-12 02:23:48.496	2026-01-12 02:23:48.496	0.00	0.00	0.00	0.00	0.00	0.00	1.00	\N	\N	\N	\N
cmkc0sjio0000m8ko6n6uat2l	cmkafl76r0001kz5orjfsda7c	\N	1	\N	0.00	2026-01-13 03:16:22.608	2026-01-13 03:16:22.608	0.00	0.00	0.00	0.00	0.00	0.00	1.00	\N	\N	\N	\N
cmkc0sjio0001m8kofbvggo4p	cmkafl76r0001kz5orjfsda7c	\N	2	\N	0.00	2026-01-13 03:16:22.608	2026-01-13 03:16:22.608	0.00	0.00	0.00	0.00	0.00	0.00	1.00	\N	\N	\N	\N
cmkc0sjio0002m8ko7gbhx7t6	cmkafl76r0001kz5orjfsda7c	\N	4	\N	0.00	2026-01-13 03:16:22.608	2026-01-13 03:16:22.608	0.00	0.00	0.00	0.00	0.00	0.00	1.00	\N	\N	\N	\N
cmkc0sjio0003m8koh32ukjes	cmkafl76r0001kz5orjfsda7c	\N	8	\N	0.00	2026-01-13 03:16:22.608	2026-01-13 03:16:22.608	0.00	0.00	0.00	0.00	0.00	0.00	1.00	\N	\N	\N	\N
cmkcaox1j000k7gfes0uoqxtl	cmk6h6n41000fv9w2zc6fckd0	cmk6fbng100004b63c70xzv5a	\N	\N	10000.00	2026-01-13 07:53:29.671	2026-01-13 07:53:29.671	\N	\N	\N	\N	\N	\N	\N	20	10000.00	0.00	{"20": 10000, "30": 10000, "40": 10000, "50": 10000, "60": 10000}
cmkcaox1j000l7gfe0i5nhh9t	cmk6h6n41000fv9w2zc6fckd0	cmk6fkx5j000e4b639whx3sxx	\N	\N	20000.00	2026-01-13 07:53:29.671	2026-01-13 07:53:29.671	\N	\N	\N	\N	\N	\N	\N	20	20000.00	0.00	{"20": 20000, "30": 20000, "40": 20000, "50": 20000, "60": 20000}
cmkcaox1j000m7gfe0k2wcv77	cmk6h6n41000fv9w2zc6fckd0	cmk6ftqqu0004hxtskccmbx2s	\N	\N	15000.00	2026-01-13 07:53:29.671	2026-01-13 07:53:29.671	\N	\N	\N	\N	\N	\N	\N	20	15000.00	0.00	{"20": 15000, "30": 15000, "40": 15000, "50": 15000, "60": 15000}
cmkcaox1j000n7gfee30h4r9f	cmk6h6n41000fv9w2zc6fckd0	cmk6fu8av0005hxtsrjafllf0	\N	\N	12000.00	2026-01-13 07:53:29.671	2026-01-13 07:53:29.671	\N	\N	\N	\N	\N	\N	\N	20	12000.00	0.00	{"20": 12000, "30": 12000, "40": 12000, "50": 12000, "60": 12000}
\.


--
-- Data for Name: production_setting_specifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production_setting_specifications (id, "productionSettingId", "specificationId", price, "sortOrder", "createdAt", "updatedAt") FROM stdin;
cmkcaox1o000o7gfe0azsz7pt	cmk6h6n41000fv9w2zc6fckd0	cmk6fbng100004b63c70xzv5a	\N	0	2026-01-13 07:53:29.676	2026-01-13 07:53:29.676
cmkcaox1o000p7gfero3ewos8	cmk6h6n41000fv9w2zc6fckd0	cmk6fu8av0005hxtsrjafllf0	\N	1	2026-01-13 07:53:29.676	2026-01-13 07:53:29.676
cmkcaox1o000q7gfe4at35h7v	cmk6h6n41000fv9w2zc6fckd0	cmk6ftqqu0004hxtskccmbx2s	\N	2	2026-01-13 07:53:29.676	2026-01-13 07:53:29.676
cmkcaox1o000r7gfek85xqdar	cmk6h6n41000fv9w2zc6fckd0	cmk6fkx5j000e4b639whx3sxx	\N	3	2026-01-13 07:53:29.676	2026-01-13 07:53:29.676
cmkcbm8lw00147gfemqsb8z09	cmkc9ptog0001jautjvefxhf6	cmk6fkx5j000e4b639whx3sxx	\N	0	2026-01-13 08:19:24.308	2026-01-13 08:19:24.308
cmkcbm8lw00157gfefkrwwyxq	cmkc9ptog0001jautjvefxhf6	cmk6ftqqu0004hxtskccmbx2s	\N	1	2026-01-13 08:19:24.308	2026-01-13 08:19:24.308
cmkcbm8lw00167gfeys1hioq2	cmkc9ptog0001jautjvefxhf6	cmk6fu8av0005hxtsrjafllf0	\N	2	2026-01-13 08:19:24.308	2026-01-13 08:19:24.308
cmkcbm8lw00177gfeb7rxswwb	cmkc9ptog0001jautjvefxhf6	cmk6fbng100004b63c70xzv5a	\N	3	2026-01-13 08:19:24.308	2026-01-13 08:19:24.308
cmkao2l2b001wi2hv8htjhsa5	cmkao14zv0001i2hvqyl7h6xc	cmk6f27np0004o43xbl1qfr5n	\N	0	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b001xi2hv1am6bls7	cmkao14zv0001i2hvqyl7h6xc	cmk6fc2o500024b63vwcm68cp	\N	1	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b001yi2hvrf3ku0n7	cmkao14zv0001i2hvqyl7h6xc	cmk6fbng100004b63c70xzv5a	\N	2	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b001zi2hvhpguvfo4	cmkao14zv0001i2hvqyl7h6xc	cmk6fu8av0005hxtsrjafllf0	\N	3	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b0020i2hv94ktxve8	cmkao14zv0001i2hvqyl7h6xc	cmk6f3ym20006o43xdewhcbes	\N	4	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b0021i2hveu75gd3u	cmkao14zv0001i2hvqyl7h6xc	cmk6ftqqu0004hxtskccmbx2s	\N	5	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b0022i2hvt1xzv2no	cmkao14zv0001i2hvqyl7h6xc	cmk6f88vs0009o43x378tye2v	\N	6	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b0023i2hvxdqaov0p	cmkao14zv0001i2hvqyl7h6xc	cmk6f6ndh0008o43xcv3mdzu1	\N	7	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b0024i2hvupycy5xm	cmkao14zv0001i2hvqyl7h6xc	cmk6fjyhm000c4b631modt98m	\N	8	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b0025i2hvthudh25s	cmkao14zv0001i2hvqyl7h6xc	cmk6fkx5j000e4b639whx3sxx	\N	9	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b0026i2hvibf17q24	cmkao14zv0001i2hvqyl7h6xc	cmk6fvjvy0006hxtspj3i6nks	\N	10	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b0027i2hvtumczgmc	cmkao14zv0001i2hvqyl7h6xc	cmk6fdf7400084b63698iy8j5	\N	11	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b0028i2hvomcrwmgc	cmkao14zv0001i2hvqyl7h6xc	cmk6fcj4d00044b63ydvo3m99	\N	12	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b0029i2hvec7ixsrx	cmkao14zv0001i2hvqyl7h6xc	cmk6fd3tf00064b63chde9ajf	\N	13	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b002ai2hvv59sl7yj	cmkao14zv0001i2hvqyl7h6xc	cmk6feqsv000a4b631dxzz34w	\N	14	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b002bi2hvpqagiznr	cmkao14zv0001i2hvqyl7h6xc	cmk6gcadq0000v9w22gdjvtj0	\N	15	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b002ci2hvc0qth9my	cmkao14zv0001i2hvqyl7h6xc	cmk6gcljh0002v9w2h60pr8xa	\N	16	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b002di2hva2ohfmko	cmkao14zv0001i2hvqyl7h6xc	cmk6f27nr0005o43xwyhm7een	\N	17	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b002ei2hvwi8bzlre	cmkao14zv0001i2hvqyl7h6xc	cmk6fc2od00034b63mc8vtlep	\N	18	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b002fi2hv6ljvknrx	cmkao14zv0001i2hvqyl7h6xc	cmk6fbng600014b63lbz4hbql	\N	19	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b002gi2hvtm7htsur	cmkao14zv0001i2hvqyl7h6xc	cmk6f3ym40007o43x4w1i7igj	\N	20	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b002hi2hvran90vie	cmkao14zv0001i2hvqyl7h6xc	cmk6f88vu000ao43x13j2f12j	\N	21	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b002ii2hv2cc4ud07	cmkao14zv0001i2hvqyl7h6xc	cmk6fjyhq000d4b63ltsp5xkp	\N	22	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b002ji2hv5ew7bd0a	cmkao14zv0001i2hvqyl7h6xc	cmk6fvjw00007hxtsirwx4s8m	\N	23	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b002ki2hvp2b9j9f3	cmkao14zv0001i2hvqyl7h6xc	cmk6fkx5l000f4b63teec2nro	\N	24	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b002li2hvo27u69ac	cmkao14zv0001i2hvqyl7h6xc	cmk6fdf7600094b63ff6454lx	\N	25	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b002mi2hv3cr3ezf5	cmkao14zv0001i2hvqyl7h6xc	cmk6fcj4f00054b63m430jdn4	\N	26	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b002ni2hvi8fxm7xw	cmkao14zv0001i2hvqyl7h6xc	cmk6fd3th00074b63i1ouhou9	\N	27	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b002oi2hvsj04wn13	cmkao14zv0001i2hvqyl7h6xc	cmk6feqsy000b4b63vxejnfur	\N	28	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b002pi2hvwpa17jxm	cmkao14zv0001i2hvqyl7h6xc	cmk6gcadu0001v9w2k7ogf6zt	\N	29	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
cmkao2l2b002qi2hv5o2fk2jy	cmkao14zv0001i2hvqyl7h6xc	cmk6gcljl0003v9w2qe2j0lo1	\N	30	2026-01-12 04:32:29.987	2026-01-12 04:32:29.987
\.


--
-- Data for Name: production_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production_settings (id, "groupId", "codeName", "vendorType", "pricingType", "settingName", "sCode", "settingFee", "basePrice", "workDays", "weightInfo", "sortOrder", "isActive", "createdAt", "updatedAt", "paperIds", "printMethod", "basePricePerSqInch", "baseSpecificationId", "doubleSidedPrice", "paperPriceGroupMap", "priceGroups", "singleSidedPrice", "pageRanges") FROM stdin;
cmkafnozt0007kz5oghfcw2a8	cmk5crnw9000514mitnz68inm	11_002	in_house	paper_output_spec	스냅사진		0.00	0.00	1.0		2	t	2026-01-12 00:36:58.313	2026-01-12 04:31:43.542	{cmk6bw3930004w4rgfz1xi87r,cmk6bx7xd0006w4rgt2s54dqp}	indigo	\N	\N	\N	{"cmk6bw3930004w4rgfz1xi87r": "pg_1768178132641_u34u6koy5", "cmk6bx7xd0006w4rgt2s54dqp": "pg_1768178132641_u34u6koy5"}	[{"id": "pg_1768178132641_u34u6koy5", "color": "green", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 1000, "sixColorSinglePrice": 1200, "fourColorDoublePrice": 800, "fourColorSinglePrice": 1000}, {"up": 2, "weight": 1, "sixColorDoublePrice": 500, "sixColorSinglePrice": 600, "fourColorDoublePrice": 400, "fourColorSinglePrice": 500}, {"up": 4, "weight": 1, "sixColorDoublePrice": 250, "sixColorSinglePrice": 300, "fourColorDoublePrice": 200, "fourColorSinglePrice": 250}, {"up": 8, "weight": 1, "sixColorDoublePrice": 125, "sixColorSinglePrice": 150, "fourColorDoublePrice": 100, "fourColorSinglePrice": 125}]}]	\N	\N
cmkao14zv0001i2hvqyl7h6xc	cmk5crnw9000514mitnz68inm	11_003	in_house	paper_output_spec	웨딩베이비		0.00	0.00	0.0		1	t	2026-01-12 04:31:22.506	2026-01-12 04:32:29.983	{cmk6cl3kp0004oeub4w4fpghp}	inkjet	\N		\N	{}	[{"id": "pg_1768192268736_vd2k4hccw", "color": "green", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}], "specPrices": [{"weight": 1, "specificationId": "cmk6fjyhq000d4b63ltsp5xkp", "singleSidedPrice": 2000}], "inkjetBasePrice": 12.98701298701299, "inkjetBaseSpecId": "cmk6fjyhq000d4b63ltsp5xkp"}]	\N	\N
cmkafl76r0001kz5orjfsda7c	cmk5crnw9000514mitnz68inm	11_001	in_house	paper_output_spec	웨딩베이비		0.00	0.00	1.0		0	t	2026-01-12 00:35:01.922	2026-01-13 03:16:22.595	{cmk6bw3930004w4rgfz1xi87r,cmk6bx7xd0006w4rgt2s54dqp,cmk6bnlsk0002w4rgwhc1y6dw,cmk6c19320008w4rgtgxtmtlc}	indigo	\N	\N	\N	{"cmk6bnlsk0002w4rgwhc1y6dw": "pg_1768178039087_itb887tbc", "cmk6bw3930004w4rgfz1xi87r": "pg_1768178038155_nz57kv6ai", "cmk6bx7xd0006w4rgt2s54dqp": null, "cmk6c19320008w4rgtgxtmtlc": "pg_1768178039087_itb887tbc"}	[{"id": "pg_1768178038155_nz57kv6ai", "color": "green", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 1100, "sixColorSinglePrice": 1100, "fourColorDoublePrice": 1000, "fourColorSinglePrice": 1000}, {"up": 2, "weight": 1.2, "sixColorDoublePrice": 660, "sixColorSinglePrice": 660, "fourColorDoublePrice": 600, "fourColorSinglePrice": 600}, {"up": 4, "weight": 1.3, "sixColorDoublePrice": 360, "sixColorSinglePrice": 358, "fourColorDoublePrice": 325, "fourColorSinglePrice": 330}, {"up": 8, "weight": 1.4, "sixColorDoublePrice": 190, "sixColorSinglePrice": 193, "fourColorDoublePrice": 175, "fourColorSinglePrice": 180}], "specPrices": []}, {"id": "pg_1768178039087_itb887tbc", "color": "blue", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 1100, "sixColorSinglePrice": 1200, "fourColorDoublePrice": 950, "fourColorSinglePrice": 1000}, {"up": 2, "weight": 1, "sixColorDoublePrice": 550, "sixColorSinglePrice": 600, "fourColorDoublePrice": 480, "fourColorSinglePrice": 500}, {"up": 4, "weight": 1, "sixColorDoublePrice": 280, "sixColorSinglePrice": 300, "fourColorDoublePrice": 240, "fourColorSinglePrice": 250}, {"up": 8, "weight": 1, "sixColorDoublePrice": 140, "sixColorSinglePrice": 150, "fourColorDoublePrice": 120, "fourColorSinglePrice": 130}], "specPrices": []}]	\N	\N
cmkc9ptog0001jautjvefxhf6	cmk6hojvf000312ucl4e7yq1i	22203_001	in_house	nup_page_range	제본+출력(고급용지)		0.00	0.00	1.0		0	t	2026-01-13 07:26:12.351	2026-01-13 08:19:24.299	{cmk6bx7xd0006w4rgt2s54dqp,cmk6bw3930004w4rgfz1xi87r,cmk6bnlsk0002w4rgwhc1y6dw}	indigo	\N	\N	\N	{"cmk6bnlsk0002w4rgwhc1y6dw": "pg_1768290748020_r6zoyq7pl", "cmk6bw3930004w4rgfz1xi87r": null, "cmk6bx7xd0006w4rgt2s54dqp": "pg_1768290703920_9w889gcv5"}	[{"id": "pg_1768290703920_9w889gcv5", "color": "green", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}]}, {"id": "pg_1768290748020_r6zoyq7pl", "color": "blue", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}]}]	\N	[30, 40, 50, 60]
cmk6h6n41000fv9w2zc6fckd0	cmk6dka5d000coeubkdhjlz3u	22201_001	in_house	nup_page_range	스타제본		0.00	0.00	0.0	30\n40\n50	0	t	2026-01-09 06:08:37.249	2026-01-13 07:53:29.667	{}	indigo	\N	\N	\N	{}	[{"id": "pg_1768178522776_dihnptpoo", "color": "green", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}]}, {"id": "pg_1768178523052_ezp9yb9tr", "color": "blue", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}]}, {"id": "pg_1768178532061_injjo2woi", "color": "yellow", "upPrices": [{"up": 1, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 2, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 4, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}, {"up": 8, "weight": 1, "sixColorDoublePrice": 0, "sixColorSinglePrice": 0, "fourColorDoublePrice": 0, "fourColorSinglePrice": 0}]}]	\N	[20, 30, 40, 50, 60]
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, "productCode", "productName", "categoryId", "isActive", "isNew", "isBest", "memberType", "basePrice", "thumbnailUrl", "detailImages", description, "sortOrder", "createdAt", "updatedAt") FROM stdin;
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
-- Data for Name: specification_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.specification_prices (id, "specificationId", "priceType", "groupId", price, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: specifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.specifications (id, code, name, "widthInch", "heightInch", "widthMm", "heightMm", "forAlbum", "forFrame", "forBooklet", "squareMeters", description, "sortOrder", "isActive", "createdAt", "updatedAt", orientation, "pairId", "forIndigo", "forInkjet", nup, "nupSqInch") FROM stdin;
cmk6fvjw00007hxtsirwx4s8m	SPEC_MK6FVJVZ12W0D1	11x16	11.0000	16.0000	279.40	406.40	t	t	f	0.11		1	t	2026-01-09 05:32:00.24	2026-01-12 07:45:59.768	portrait	cmk6fvjvy0006hxtspj3i6nks	t	t	1+up	176.00
cmk6fcj4f00054b63m430jdn4	SPEC_MK6FCJ4EF2N8O8	24x16	24.0000	16.0000	609.60	406.40	f	t	f	0.25		1	t	2026-01-09 05:17:12.784	2026-01-09 05:33:19.728	landscape	cmk6fcj4d00044b63ydvo3m99	f	t	\N	\N
cmk6fcj4d00044b63ydvo3m99	SPEC_MK6FCJ4BXJTVMZ	16x24	16.0000	24.0000	406.40	609.60	f	t	f	0.25		0	t	2026-01-09 05:17:12.781	2026-01-09 05:33:19.73	portrait	cmk6fcj4f00054b63m430jdn4	f	t	\N	\N
cmk6fjyhm000c4b631modt98m	SPEC_MK6FJYHLDM7V1D	14x11	14.0000	11.0000	355.60	279.40	t	t	f	0.10		0	t	2026-01-09 05:22:59.29	2026-01-12 07:45:29.339	landscape	cmk6fjyhq000d4b63ltsp5xkp	t	t	1up	154.00
cmk6fbng600014b63lbz4hbql	SPEC_MK6FBNG5WIDIH0	8x6	8.0000	6.0000	203.20	152.40	t	t	f	0.03		1	t	2026-01-09 05:16:31.734	2026-01-12 07:44:48.313	landscape	cmk6fbng100004b63c70xzv5a	t	t	4up	48.00
cmk6fjyhq000d4b63ltsp5xkp	SPEC_MK6FJYHPQ1PHAJ	11x14	11.0000	14.0000	279.40	355.60	t	t	f	0.10		1	t	2026-01-09 05:22:59.295	2026-01-12 07:45:34.36	portrait	cmk6fjyhm000c4b631modt98m	t	t	1up	154.00
cmk6fkx5j000e4b639whx3sxx	SPEC_MK6FKX5HD6YFRE	11x15	11.0000	15.0000	279.40	381.00	t	t	f	0.11		0	t	2026-01-09 05:23:44.214	2026-01-12 07:45:41.942	portrait	cmk6fkx5l000f4b63teec2nro	t	t	1+up	165.00
cmk6fkx5l000f4b63teec2nro	SPEC_MK6FKX5LUBY7RW	15x11	15.0000	11.0000	381.00	279.40	t	t	f	0.11		1	t	2026-01-09 05:23:44.218	2026-01-12 07:45:47.5	landscape	cmk6fkx5j000e4b639whx3sxx	t	t	1+up	165.00
cmk6fc2o500024b63vwcm68cp	SPEC_MK6FC2O4OM6S9X	4x6	4.0000	6.0000	101.60	152.40	t	t	f	0.02		2	t	2026-01-09 05:16:51.461	2026-01-12 07:44:23.063	portrait	cmk6fc2od00034b63mc8vtlep	t	t	8up	24.00
cmk6fvjvy0006hxtspj3i6nks	SPEC_MK6FVJVXP5WNUD	16x11	16.0000	11.0000	406.40	279.40	t	t	f	0.11		0	t	2026-01-09 05:32:00.238	2026-01-12 07:45:52.61	landscape	cmk6fvjw00007hxtsirwx4s8m	t	t	1+up	176.00
cmkavuol30000ft7ltr5dldbf	SPEC_MKAVUOL0J6QT17	14x14	14.0000	14.0000	355.60	355.60	t	t	f	0.13		0	t	2026-01-12 08:10:18.231	2026-01-12 08:10:18.231	square	\N	f	t	1++up	196.00
cmk6fu8av0005hxtsrjafllf0	SPEC_MK6FU8AT4M5TUL	8x8	8.0000	8.0000	203.20	203.20	t	t	f	0.04		0	t	2026-01-09 05:30:58.566	2026-01-12 07:44:53.769	square	\N	t	t	2up	64.00
cmk6f88vu000ao43x13j2f12j	SPEC_MK6F88VUH376T4	A4_가로	11.6929	8.2677	297.00	210.00	t	t	t	0.06		1	t	2026-01-09 05:13:52.891	2026-01-12 07:32:37.753	landscape	cmk6f88vs0009o43x378tye2v	t	t	2up	96.67
cmk6ftqqu0004hxtskccmbx2s	SPEC_MK6FTQQTU54J9M	10x10	10.0000	10.0000	254.00	254.00	t	t	f	0.06		0	t	2026-01-09 05:30:35.814	2026-01-12 07:40:28.911	square	\N	t	t	1up	100.00
cmk6fd3th00074b63i1ouhou9	SPEC_MK6FD3TH5DSNGX	24x20	24.0000	20.0000	609.60	508.00	f	t	f	0.31		1	t	2026-01-09 05:17:39.606	2026-01-09 05:33:19.747	landscape	cmk6fd3tf00064b63chde9ajf	f	t	\N	\N
cmk6fd3tf00064b63chde9ajf	SPEC_MK6FD3TEQ9EDYT	20x24	20.0000	24.0000	508.00	609.60	f	t	f	0.31		0	t	2026-01-09 05:17:39.603	2026-01-09 05:33:19.748	portrait	cmk6fd3th00074b63i1ouhou9	f	t	\N	\N
cmk6fdf7600094b63ff6454lx	SPEC_MK6FDF75KBIE79	20x16	20.0000	16.0000	508.00	406.40	f	t	f	0.21		1	t	2026-01-09 05:17:54.354	2026-01-09 05:33:19.749	landscape	cmk6fdf7400084b63698iy8j5	f	t	\N	\N
cmk6fdf7400084b63698iy8j5	SPEC_MK6FDF7348VQZ2	16x20	16.0000	20.0000	406.40	508.00	f	t	f	0.21		0	t	2026-01-09 05:17:54.352	2026-01-09 05:33:19.751	portrait	cmk6fdf7600094b63ff6454lx	f	t	\N	\N
cmk6feqsy000b4b63vxejnfur	SPEC_MK6FEQSXSZ9UIL	30x20	30.0000	20.0000	762.00	508.00	f	t	f	0.39		1	t	2026-01-09 05:18:56.05	2026-01-09 05:33:19.752	landscape	cmk6feqsv000a4b631dxzz34w	f	t	\N	\N
cmk6feqsv000a4b631dxzz34w	SPEC_MK6FEQSTYH8RNN	20x30	20.0000	30.0000	508.00	762.00	f	t	f	0.39		0	t	2026-01-09 05:18:56.047	2026-01-09 05:33:19.753	portrait	cmk6feqsy000b4b63vxejnfur	f	t	\N	\N
cmkavvboy0002ft7lsl0ipbee	SPEC_MKAVVBOX69ZPKD	16x14	16.0000	14.0000	406.40	355.60	t	f	f	0.14		1	t	2026-01-12 08:10:48.178	2026-01-12 08:10:48.178	landscape	cmkavvbot0001ft7l6yfnze23	f	t	1++up	224.00
cmkavvbot0001ft7l6yfnze23	SPEC_MKAVVBORIUX0R8	14x16	14.0000	16.0000	355.60	406.40	t	f	f	0.14		0	t	2026-01-12 08:10:48.172	2026-01-12 08:10:48.181	portrait	cmkavvboy0002ft7lsl0ipbee	f	t	1++up	224.00
cmk6gcadu0001v9w2k7ogf6zt	SPEC_MK6GCADTMH5YQE	32x24	32.0000	24.0000	812.80	609.60	f	t	f	0.50		1	t	2026-01-09 05:45:01.074	2026-01-09 05:45:01.074	landscape	cmk6gcadq0000v9w22gdjvtj0	f	t	\N	\N
cmk6gcadq0000v9w22gdjvtj0	SPEC_MK6GCADO326N1W	24x32	24.0000	32.0000	609.60	812.80	f	t	f	0.50		0	t	2026-01-09 05:45:01.07	2026-01-09 05:45:01.077	portrait	cmk6gcadu0001v9w2k7ogf6zt	f	t	\N	\N
cmk6gcljl0003v9w2qe2j0lo1	SPEC_MK6GCLJL6WQKQP	44x32	44.0000	32.0000	1117.60	812.80	f	t	f	0.91		1	t	2026-01-09 05:45:15.537	2026-01-09 05:45:15.537	landscape	cmk6gcljh0002v9w2h60pr8xa	f	t	\N	\N
cmk6gcljh0002v9w2h60pr8xa	SPEC_MK6GCLJHF57VJD	32x44	32.0000	44.0000	812.80	1117.60	f	t	f	0.91		0	t	2026-01-09 05:45:15.534	2026-01-09 05:45:15.542	portrait	cmk6gcljl0003v9w2qe2j0lo1	f	t	\N	\N
cmkauuj5e0001620vtvan1277	SPEC_MKAUUJ5DG0FVKR	15x12	15.0000	12.0000	381.00	304.80	t	f	f	0.12		1	t	2026-01-12 07:42:11.571	2026-01-12 07:42:11.571	landscape	cmkauuj580000620v7qprf1fa	t	t	1+up	180.00
cmkauuj580000620v7qprf1fa	SPEC_MKAUUJ4V92NY1W	12x15	12.0000	15.0000	304.80	381.00	t	f	f	0.12		0	t	2026-01-12 07:42:11.553	2026-01-12 07:42:11.573	portrait	cmkauuj5e0001620vtvan1277	t	t	1+up	180.00
cmk6f3ym20006o43xdewhcbes	SPEC_MK6F3YM0BJ67WT	8x10	8.0000	10.0000	203.20	254.00	t	t	f	0.05		0	t	2026-01-09 05:10:32.953	2026-01-12 07:45:00.153	portrait	cmk6f3ym40007o43x4w1i7igj	t	t	2up	80.00
cmk6f3ym40007o43x4w1i7igj	SPEC_MK6F3YM4S5MXSK	10x8	10.0000	8.0000	254.00	203.20	t	t	f	0.05		1	t	2026-01-09 05:10:32.957	2026-01-12 07:45:10.019	landscape	cmk6f3ym20006o43xdewhcbes	t	t	2up	80.00
cmk6fc2od00034b63mc8vtlep	SPEC_MK6FC2OCUJ3BVZ	6x4	6.0000	4.0000	152.40	101.60	t	t	f	0.02		3	t	2026-01-09 05:16:51.469	2026-01-12 07:44:27.376	landscape	cmk6fc2o500024b63vwcm68cp	t	t	8up	24.00
cmk6f27np0004o43xbl1qfr5n	SPEC_MK6F27NNC0LTDT	5x7	5.0000	7.0000	127.00	177.80	t	t	f	0.02		1	t	2026-01-09 05:09:11.364	2026-01-12 07:44:33.649	portrait	cmk6f27nr0005o43xwyhm7een	t	t	4up	35.00
cmk6f88vs0009o43x378tye2v	SPEC_MK6F88VRR1BBT9	A4_세로	8.2677	11.6929	210.00	297.00	t	t	t	0.06		0	t	2026-01-09 05:13:52.888	2026-01-12 07:45:16.598	portrait	cmk6f88vu000ao43x13j2f12j	t	t	2up	96.67
cmk6f6ndh0008o43xcv3mdzu1	SPEC_MK6F6NDGHIGTYA	11x11	11.0000	11.0000	279.40	279.40	t	t	f	0.08		0	t	2026-01-09 05:12:38.357	2026-01-12 07:45:22.964	square	\N	t	t	1up	121.00
cmk6f27nr0005o43xwyhm7een	SPEC_MK6F27NR73M7YI	7x5	7.0000	5.0000	177.80	127.00	t	t	f	0.02		2	t	2026-01-09 05:09:11.368	2026-01-12 07:44:37.955	landscape	cmk6f27np0004o43xbl1qfr5n	t	t	4up	35.00
cmk6fbng100004b63c70xzv5a	SPEC_MK6FBNFZRK6CZQ	6x8	6.0000	8.0000	152.40	203.20	t	t	f	0.03		0	t	2026-01-09 05:16:31.728	2026-01-12 07:44:43.781	portrait	cmk6fbng600014b63lbz4hbql	t	t	4up	48.00
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
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password, name, role, "isActive", "createdAt", "updatedAt") FROM stdin;
cmk5cpt1z0000ijuehpm9vtid	admin@printing-erp.com	$2b$10$pkTmO8AUAt19kq5RiMwLa.pDQUOI63yVVAeYd7M45GKa73jqHJrR.	관리자	admin	t	2026-01-08 11:15:47.159	2026-01-08 11:15:47.159
cmk5cpt270001ijue6jqvlvbb	manager@printing-erp.com	$2b$10$pkTmO8AUAt19kq5RiMwLa.pDQUOI63yVVAeYd7M45GKa73jqHJrR.	매니저	manager	t	2026-01-08 11:15:47.168	2026-01-08 11:15:47.168
\.


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
-- Name: custom_options custom_options_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_options
    ADD CONSTRAINT custom_options_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


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
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


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
-- Name: custom_options_productId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "custom_options_productId_idx" ON public.custom_options USING btree ("productId");


--
-- Name: departments_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX departments_code_key ON public.departments USING btree (code);


--
-- Name: group_half_product_prices_groupId_halfProductId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "group_half_product_prices_groupId_halfProductId_key" ON public.group_half_product_prices USING btree ("groupId", "halfProductId");


--
-- Name: group_product_prices_groupId_productId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "group_product_prices_groupId_productId_key" ON public.group_product_prices USING btree ("groupId", "productId");


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
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


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
-- Name: custom_options custom_options_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_options
    ADD CONSTRAINT "custom_options_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


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

\unrestrict 086V2YcyccRfnWFi8GSfQXLMoF1jUTh3VzMaUnCtT2hAaZfU65M3oMmPVUQa2GX

