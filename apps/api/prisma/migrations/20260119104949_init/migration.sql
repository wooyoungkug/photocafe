-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branchId" TEXT,
    "departmentId" TEXT,
    "position" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "postalCode" TEXT,
    "address" TEXT,
    "addressDetail" TEXT,
    "settlementGrade" INTEGER NOT NULL DEFAULT 1,
    "allowedIps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "canEditInManagerView" BOOLEAN NOT NULL DEFAULT false,
    "canLoginAsManager" BOOLEAN NOT NULL DEFAULT false,
    "canChangeDepositStage" BOOLEAN NOT NULL DEFAULT false,
    "canChangeReceptionStage" BOOLEAN NOT NULL DEFAULT false,
    "canChangeCancelStage" BOOLEAN NOT NULL DEFAULT false,
    "canEditMemberInfo" BOOLEAN NOT NULL DEFAULT false,
    "canViewSettlement" BOOLEAN NOT NULL DEFAULT false,
    "canChangeOrderAmount" BOOLEAN NOT NULL DEFAULT false,
    "memberViewScope" TEXT NOT NULL DEFAULT 'own',
    "salesViewScope" TEXT NOT NULL DEFAULT 'own',
    "menuPermissions" JSONB,
    "categoryPermissions" JSONB,
    "processPermissions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "adminMemo" TEXT,
    "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_clients" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "isHeadquarters" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_groups" (
    "id" TEXT NOT NULL,
    "groupCode" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "generalDiscount" INTEGER NOT NULL DEFAULT 100,
    "premiumDiscount" INTEGER NOT NULL DEFAULT 100,
    "importedDiscount" INTEGER NOT NULL DEFAULT 100,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "clientCode" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "businessNumber" TEXT,
    "representative" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "password" TEXT,
    "postalCode" TEXT,
    "address" TEXT,
    "addressDetail" TEXT,
    "groupId" TEXT,
    "memberType" TEXT NOT NULL DEFAULT 'individual',
    "oauthProvider" TEXT,
    "oauthId" TEXT,
    "priceType" TEXT NOT NULL DEFAULT 'standard',
    "paymentType" TEXT NOT NULL DEFAULT 'order',
    "creditEnabled" BOOLEAN NOT NULL DEFAULT false,
    "creditPeriodDays" INTEGER,
    "creditPaymentDay" INTEGER,
    "creditBlocked" BOOLEAN NOT NULL DEFAULT false,
    "creditBlockedAt" TIMESTAMP(3),
    "lastPaymentDate" TIMESTAMP(3),
    "shippingType" TEXT NOT NULL DEFAULT 'conditional',
    "creditGrade" TEXT NOT NULL DEFAULT 'B',
    "paymentTerms" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specifications" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "widthInch" DECIMAL(10,4) NOT NULL,
    "heightInch" DECIMAL(10,4) NOT NULL,
    "widthMm" DECIMAL(10,2) NOT NULL,
    "heightMm" DECIMAL(10,2) NOT NULL,
    "orientation" TEXT NOT NULL DEFAULT 'landscape',
    "pairId" TEXT,
    "forIndigo" BOOLEAN NOT NULL DEFAULT false,
    "forInkjet" BOOLEAN NOT NULL DEFAULT false,
    "forAlbum" BOOLEAN NOT NULL DEFAULT false,
    "forFrame" BOOLEAN NOT NULL DEFAULT false,
    "forBooklet" BOOLEAN NOT NULL DEFAULT false,
    "squareMeters" DECIMAL(10,2),
    "description" TEXT,
    "nup" TEXT,
    "nupSqInch" DECIMAL(10,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specification_prices" (
    "id" TEXT NOT NULL,
    "specificationId" TEXT NOT NULL,
    "priceType" TEXT NOT NULL DEFAULT 'base',
    "groupId" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specification_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_category_options" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_category_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 1,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 1,
    "parentId" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isTopMenu" BOOLEAN NOT NULL DEFAULT false,
    "loginVisibility" TEXT NOT NULL DEFAULT 'always',
    "categoryType" TEXT NOT NULL DEFAULT 'HTML',
    "productionForm" TEXT,
    "isOutsourced" BOOLEAN NOT NULL DEFAULT false,
    "pricingUnit" TEXT,
    "description" TEXT,
    "linkUrl" TEXT,
    "htmlContent" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "iconUrl" TEXT,
    "salesCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "isBest" BOOLEAN NOT NULL DEFAULT false,
    "memberType" TEXT NOT NULL DEFAULT 'all',
    "basePrice" DECIMAL(12,2) NOT NULL,
    "thumbnailUrl" TEXT,
    "detailImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_specifications" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "widthMm" DOUBLE PRECISION NOT NULL,
    "heightMm" DOUBLE PRECISION NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_bindings" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_papers" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_covers" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "materialCode" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_covers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_foils" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_foils_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_finishings" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_finishings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_options" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "values" JSONB,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "custom_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_half_products" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "halfProductId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_half_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "half_products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryLargeId" TEXT NOT NULL,
    "basePrice" DECIMAL(12,2) NOT NULL,
    "isPriceAdditive" BOOLEAN NOT NULL DEFAULT true,
    "memberType" TEXT NOT NULL DEFAULT 'all',
    "requiredFileCount" INTEGER NOT NULL DEFAULT 0,
    "thumbnailUrl" TEXT,
    "detailImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "half_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "half_product_specifications" (
    "id" TEXT NOT NULL,
    "halfProductId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "widthMm" DOUBLE PRECISION NOT NULL,
    "heightMm" DOUBLE PRECISION NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "half_product_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "half_product_price_tiers" (
    "id" TEXT NOT NULL,
    "halfProductId" TEXT NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "maxQuantity" INTEGER,
    "discountRate" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "half_product_price_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "half_product_options" (
    "id" TEXT NOT NULL,
    "halfProductId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "quantityType" TEXT NOT NULL DEFAULT 'auto',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "half_product_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_half_product_prices" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "halfProductId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_half_product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_product_prices" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "my_products" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customName" TEXT,
    "customThumbnail" TEXT,
    "registrationType" TEXT NOT NULL,
    "registeredBy" TEXT NOT NULL,
    "defaultOptions" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "my_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "productPrice" DECIMAL(12,2) NOT NULL,
    "shippingFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "adjustmentAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "finalAmount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'postpaid',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "status" TEXT NOT NULL DEFAULT 'pending_receipt',
    "currentProcess" TEXT NOT NULL DEFAULT 'receipt_pending',
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "requestedDeliveryDate" TIMESTAMP(3),
    "customerMemo" TEXT,
    "productMemo" TEXT,
    "adminMemo" TEXT,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_shippings" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "addressDetail" TEXT,
    "courierCode" TEXT,
    "trackingNumber" TEXT,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "order_shippings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productionNumber" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "pages" INTEGER NOT NULL,
    "printMethod" TEXT NOT NULL,
    "paper" TEXT NOT NULL,
    "bindingType" TEXT NOT NULL,
    "coverMaterial" TEXT,
    "foilName" TEXT,
    "foilColor" TEXT,
    "finishingOptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_files" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "pageRange" TEXT NOT NULL,
    "pageStart" INTEGER NOT NULL,
    "pageEnd" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "widthInch" DOUBLE PRECISION NOT NULL,
    "heightInch" DOUBLE PRECISION NOT NULL,
    "dpi" INTEGER NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "inspectionStatus" TEXT NOT NULL DEFAULT 'pending',
    "inspectionNote" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_histories" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "processType" TEXT NOT NULL,
    "note" TEXT,
    "processedBy" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "process_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reception_schedules" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "openTime" TEXT,
    "closeTime" TEXT,
    "reason" TEXT,
    "reasonType" TEXT,
    "isHoliday" BOOLEAN NOT NULL DEFAULT false,
    "holidayName" TEXT,
    "modifiedBy" TEXT,
    "modifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reception_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regular_holiday_settings" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "weeklyDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "monthlyDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "yearlyDates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regular_holiday_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_groups" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "basePrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unitType" TEXT NOT NULL DEFAULT 'ream',
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paper_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_suppliers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "fax" TEXT,
    "postalCode" TEXT,
    "address" TEXT,
    "addressDetail" TEXT,
    "representative" TEXT,
    "website" TEXT,
    "description" TEXT,
    "memo" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paper_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_manufacturers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "website" TEXT,
    "contactInfo" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paper_manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "papers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "paperGroupId" TEXT,
    "manufacturerId" TEXT,
    "supplierId" TEXT,
    "paperType" TEXT NOT NULL DEFAULT 'sheet',
    "sheetSize" TEXT,
    "sheetWidthMm" DECIMAL(10,2),
    "sheetHeightMm" DECIMAL(10,2),
    "customSheetName" TEXT,
    "rollWidth" TEXT,
    "rollWidthInch" DECIMAL(10,2),
    "rollLength" TEXT,
    "rollLengthM" DECIMAL(10,2),
    "grammage" INTEGER,
    "grammageDisplay" TEXT,
    "finish" TEXT DEFAULT 'matte',
    "finishDisplay" TEXT,
    "printMethods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "colorType" TEXT,
    "colorGroup" TEXT,
    "thickness" DECIMAL(10,3),
    "basePrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unitType" TEXT NOT NULL DEFAULT 'sheet',
    "discountRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discountPrice" DECIMAL(12,2),
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "minStockLevel" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "memo" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_prices" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "priceType" TEXT NOT NULL DEFAULT 'base',
    "groupId" TEXT,
    "minQuantity" INTEGER,
    "maxQuantity" INTEGER,
    "price" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paper_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_groups" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 1,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_settings" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "codeName" TEXT,
    "vendorType" TEXT NOT NULL DEFAULT 'in_house',
    "pricingType" TEXT NOT NULL DEFAULT 'paper_output_spec',
    "settingName" TEXT,
    "sCode" TEXT,
    "settingFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "basePrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "workDays" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "weightInfo" TEXT,
    "printMethod" TEXT,
    "paperIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specUsageType" TEXT NOT NULL DEFAULT 'all',
    "singleSidedPrice" DECIMAL(12,2),
    "doubleSidedPrice" DECIMAL(12,2),
    "baseSpecificationId" TEXT,
    "basePricePerSqInch" DECIMAL(12,6),
    "priceGroups" JSONB,
    "paperPriceGroupMap" JSONB,
    "pageRanges" JSONB,
    "lengthUnit" TEXT DEFAULT 'cm',
    "lengthPriceRanges" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_setting_specifications" (
    "id" TEXT NOT NULL,
    "productionSettingId" TEXT NOT NULL,
    "specificationId" TEXT NOT NULL,
    "price" DECIMAL(12,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_setting_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_setting_prices" (
    "id" TEXT NOT NULL,
    "productionSettingId" TEXT NOT NULL,
    "specificationId" TEXT,
    "minQuantity" INTEGER,
    "maxQuantity" INTEGER,
    "weight" DECIMAL(5,2),
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "singleSidedPrice" DECIMAL(12,2),
    "doubleSidedPrice" DECIMAL(12,2),
    "fourColorSinglePrice" DECIMAL(12,2),
    "fourColorDoublePrice" DECIMAL(12,2),
    "sixColorSinglePrice" DECIMAL(12,2),
    "sixColorDoublePrice" DECIMAL(12,2),
    "basePages" INTEGER,
    "basePrice" DECIMAL(12,2),
    "pricePerPage" DECIMAL(12,2),
    "rangePrices" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_setting_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "system_settings_category_idx" ON "system_settings"("category");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "staff_staffId_key" ON "staff"("staffId");

-- CreateIndex
CREATE INDEX "staff_branchId_idx" ON "staff"("branchId");

-- CreateIndex
CREATE INDEX "staff_departmentId_idx" ON "staff"("departmentId");

-- CreateIndex
CREATE INDEX "staff_isActive_idx" ON "staff"("isActive");

-- CreateIndex
CREATE INDEX "staff_clients_staffId_idx" ON "staff_clients"("staffId");

-- CreateIndex
CREATE INDEX "staff_clients_clientId_idx" ON "staff_clients"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_clients_staffId_clientId_key" ON "staff_clients"("staffId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "permission_templates_name_key" ON "permission_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "branches_branchCode_key" ON "branches"("branchCode");

-- CreateIndex
CREATE UNIQUE INDEX "client_groups_groupCode_key" ON "client_groups"("groupCode");

-- CreateIndex
CREATE INDEX "client_groups_branchId_idx" ON "client_groups"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_clientCode_key" ON "clients"("clientCode");

-- CreateIndex
CREATE INDEX "clients_groupId_idx" ON "clients"("groupId");

-- CreateIndex
CREATE INDEX "clients_clientCode_idx" ON "clients"("clientCode");

-- CreateIndex
CREATE INDEX "clients_memberType_idx" ON "clients"("memberType");

-- CreateIndex
CREATE INDEX "clients_oauthProvider_idx" ON "clients"("oauthProvider");

-- CreateIndex
CREATE UNIQUE INDEX "clients_oauthProvider_oauthId_key" ON "clients"("oauthProvider", "oauthId");

-- CreateIndex
CREATE UNIQUE INDEX "specifications_code_key" ON "specifications"("code");

-- CreateIndex
CREATE INDEX "specifications_isActive_idx" ON "specifications"("isActive");

-- CreateIndex
CREATE INDEX "specifications_forIndigo_idx" ON "specifications"("forIndigo");

-- CreateIndex
CREATE INDEX "specifications_forInkjet_idx" ON "specifications"("forInkjet");

-- CreateIndex
CREATE INDEX "specifications_forAlbum_idx" ON "specifications"("forAlbum");

-- CreateIndex
CREATE INDEX "specifications_forFrame_idx" ON "specifications"("forFrame");

-- CreateIndex
CREATE INDEX "specifications_forBooklet_idx" ON "specifications"("forBooklet");

-- CreateIndex
CREATE INDEX "specifications_orientation_idx" ON "specifications"("orientation");

-- CreateIndex
CREATE INDEX "specifications_pairId_idx" ON "specifications"("pairId");

-- CreateIndex
CREATE UNIQUE INDEX "specification_prices_specificationId_priceType_groupId_key" ON "specification_prices"("specificationId", "priceType", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_category_options_code_key" ON "sales_category_options"("code");

-- CreateIndex
CREATE INDEX "sales_category_options_isActive_idx" ON "sales_category_options"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "sales_categories_code_key" ON "sales_categories"("code");

-- CreateIndex
CREATE INDEX "sales_categories_parentId_idx" ON "sales_categories"("parentId");

-- CreateIndex
CREATE INDEX "sales_categories_isActive_idx" ON "sales_categories"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "categories_code_key" ON "categories"("code");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE INDEX "categories_categoryType_idx" ON "categories"("categoryType");

-- CreateIndex
CREATE INDEX "categories_isTopMenu_idx" ON "categories"("isTopMenu");

-- CreateIndex
CREATE UNIQUE INDEX "products_productCode_key" ON "products"("productCode");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "product_specifications_productId_idx" ON "product_specifications"("productId");

-- CreateIndex
CREATE INDEX "product_bindings_productId_idx" ON "product_bindings"("productId");

-- CreateIndex
CREATE INDEX "product_papers_productId_idx" ON "product_papers"("productId");

-- CreateIndex
CREATE INDEX "product_covers_productId_idx" ON "product_covers"("productId");

-- CreateIndex
CREATE INDEX "product_foils_productId_idx" ON "product_foils"("productId");

-- CreateIndex
CREATE INDEX "product_finishings_productId_idx" ON "product_finishings"("productId");

-- CreateIndex
CREATE INDEX "custom_options_productId_idx" ON "custom_options"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_half_products_productId_halfProductId_key" ON "product_half_products"("productId", "halfProductId");

-- CreateIndex
CREATE UNIQUE INDEX "half_products_code_key" ON "half_products"("code");

-- CreateIndex
CREATE INDEX "half_products_categoryLargeId_idx" ON "half_products"("categoryLargeId");

-- CreateIndex
CREATE INDEX "half_product_specifications_halfProductId_idx" ON "half_product_specifications"("halfProductId");

-- CreateIndex
CREATE INDEX "half_product_price_tiers_halfProductId_idx" ON "half_product_price_tiers"("halfProductId");

-- CreateIndex
CREATE INDEX "half_product_options_halfProductId_idx" ON "half_product_options"("halfProductId");

-- CreateIndex
CREATE UNIQUE INDEX "group_half_product_prices_groupId_halfProductId_key" ON "group_half_product_prices"("groupId", "halfProductId");

-- CreateIndex
CREATE UNIQUE INDEX "group_product_prices_groupId_productId_key" ON "group_product_prices"("groupId", "productId");

-- CreateIndex
CREATE INDEX "my_products_clientId_idx" ON "my_products"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "my_products_clientId_productType_productId_key" ON "my_products"("clientId", "productType", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "orders_barcode_key" ON "orders"("barcode");

-- CreateIndex
CREATE INDEX "orders_clientId_idx" ON "orders"("clientId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_orderedAt_idx" ON "orders"("orderedAt");

-- CreateIndex
CREATE UNIQUE INDEX "order_shippings_orderId_key" ON "order_shippings"("orderId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_files_orderItemId_idx" ON "order_files"("orderItemId");

-- CreateIndex
CREATE INDEX "process_histories_orderId_idx" ON "process_histories"("orderId");

-- CreateIndex
CREATE INDEX "reception_schedules_year_month_idx" ON "reception_schedules"("year", "month");

-- CreateIndex
CREATE INDEX "reception_schedules_status_idx" ON "reception_schedules"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reception_schedules_year_month_day_key" ON "reception_schedules"("year", "month", "day");

-- CreateIndex
CREATE UNIQUE INDEX "paper_groups_code_key" ON "paper_groups"("code");

-- CreateIndex
CREATE INDEX "paper_groups_isActive_idx" ON "paper_groups"("isActive");

-- CreateIndex
CREATE INDEX "paper_groups_color_idx" ON "paper_groups"("color");

-- CreateIndex
CREATE UNIQUE INDEX "paper_suppliers_code_key" ON "paper_suppliers"("code");

-- CreateIndex
CREATE INDEX "paper_suppliers_isActive_idx" ON "paper_suppliers"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "paper_manufacturers_code_key" ON "paper_manufacturers"("code");

-- CreateIndex
CREATE INDEX "paper_manufacturers_isActive_idx" ON "paper_manufacturers"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "papers_code_key" ON "papers"("code");

-- CreateIndex
CREATE INDEX "papers_paperGroupId_idx" ON "papers"("paperGroupId");

-- CreateIndex
CREATE INDEX "papers_manufacturerId_idx" ON "papers"("manufacturerId");

-- CreateIndex
CREATE INDEX "papers_supplierId_idx" ON "papers"("supplierId");

-- CreateIndex
CREATE INDEX "papers_paperType_idx" ON "papers"("paperType");

-- CreateIndex
CREATE INDEX "papers_isActive_idx" ON "papers"("isActive");

-- CreateIndex
CREATE INDEX "paper_prices_paperId_idx" ON "paper_prices"("paperId");

-- CreateIndex
CREATE INDEX "paper_prices_priceType_idx" ON "paper_prices"("priceType");

-- CreateIndex
CREATE UNIQUE INDEX "production_groups_code_key" ON "production_groups"("code");

-- CreateIndex
CREATE INDEX "production_groups_parentId_idx" ON "production_groups"("parentId");

-- CreateIndex
CREATE INDEX "production_groups_isActive_idx" ON "production_groups"("isActive");

-- CreateIndex
CREATE INDEX "production_settings_groupId_idx" ON "production_settings"("groupId");

-- CreateIndex
CREATE INDEX "production_settings_pricingType_idx" ON "production_settings"("pricingType");

-- CreateIndex
CREATE UNIQUE INDEX "production_setting_specifications_productionSettingId_speci_key" ON "production_setting_specifications"("productionSettingId", "specificationId");

-- CreateIndex
CREATE INDEX "production_setting_prices_productionSettingId_idx" ON "production_setting_prices"("productionSettingId");

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_clients" ADD CONSTRAINT "staff_clients_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_clients" ADD CONSTRAINT "staff_clients_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_groups" ADD CONSTRAINT "client_groups_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "client_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specification_prices" ADD CONSTRAINT "specification_prices_specificationId_fkey" FOREIGN KEY ("specificationId") REFERENCES "specifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_categories" ADD CONSTRAINT "sales_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "sales_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bindings" ADD CONSTRAINT "product_bindings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_papers" ADD CONSTRAINT "product_papers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_covers" ADD CONSTRAINT "product_covers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_foils" ADD CONSTRAINT "product_foils_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_finishings" ADD CONSTRAINT "product_finishings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_options" ADD CONSTRAINT "custom_options_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_half_products" ADD CONSTRAINT "product_half_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_half_products" ADD CONSTRAINT "product_half_products_halfProductId_fkey" FOREIGN KEY ("halfProductId") REFERENCES "half_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "half_products" ADD CONSTRAINT "half_products_categoryLargeId_fkey" FOREIGN KEY ("categoryLargeId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "half_product_specifications" ADD CONSTRAINT "half_product_specifications_halfProductId_fkey" FOREIGN KEY ("halfProductId") REFERENCES "half_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "half_product_price_tiers" ADD CONSTRAINT "half_product_price_tiers_halfProductId_fkey" FOREIGN KEY ("halfProductId") REFERENCES "half_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "half_product_options" ADD CONSTRAINT "half_product_options_halfProductId_fkey" FOREIGN KEY ("halfProductId") REFERENCES "half_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_half_product_prices" ADD CONSTRAINT "group_half_product_prices_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "client_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_half_product_prices" ADD CONSTRAINT "group_half_product_prices_halfProductId_fkey" FOREIGN KEY ("halfProductId") REFERENCES "half_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_product_prices" ADD CONSTRAINT "group_product_prices_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "client_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_product_prices" ADD CONSTRAINT "group_product_prices_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "my_products" ADD CONSTRAINT "my_products_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_shippings" ADD CONSTRAINT "order_shippings_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_files" ADD CONSTRAINT "order_files_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_histories" ADD CONSTRAINT "process_histories_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papers" ADD CONSTRAINT "papers_paperGroupId_fkey" FOREIGN KEY ("paperGroupId") REFERENCES "paper_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papers" ADD CONSTRAINT "papers_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "paper_manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papers" ADD CONSTRAINT "papers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "paper_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_prices" ADD CONSTRAINT "paper_prices_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_groups" ADD CONSTRAINT "production_groups_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "production_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_settings" ADD CONSTRAINT "production_settings_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "production_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_setting_specifications" ADD CONSTRAINT "production_setting_specifications_productionSettingId_fkey" FOREIGN KEY ("productionSettingId") REFERENCES "production_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_setting_specifications" ADD CONSTRAINT "production_setting_specifications_specificationId_fkey" FOREIGN KEY ("specificationId") REFERENCES "specifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_setting_prices" ADD CONSTRAINT "production_setting_prices_productionSettingId_fkey" FOREIGN KEY ("productionSettingId") REFERENCES "production_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
