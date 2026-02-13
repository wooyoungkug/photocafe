
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ProductService } from '../src/modules/product/services/product.service';
import { UpdateProductDto } from '../src/modules/product/dto/product.dto';
import { PrismaService } from '../src/common/prisma/prisma.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const productService = app.get(ProductService);
    const prisma = app.get(PrismaService);

    try {
        console.log('Finding a product to update...');
        const product = await prisma.product.findFirst();
        if (!product) {
            console.log('No product found.');
            return;
        }
        console.log(`Found product: ${product.id}`);

        // Mock Payload based on page.tsx
        const updateDto: UpdateProductDto = {
            productName: 'Test Product Update',
            // Ensure other fields are present as per page.tsx logic
            specifications: [],
            bindings: [],
            papers: [],
            covers: [],
            foils: [],
            finishings: [],
            outputPriceSettings: [
                {
                    id: 'test-id',
                    productionSettingId: 'test-setting-id',
                    outputMethod: 'INDIGO', // Valid ENUM
                    // ... minimal fields
                } as any
            ]
        };

        console.log('Attempting update with payload:', JSON.stringify(updateDto, null, 2));

        const result = await productService.update(product.id, updateDto);
        console.log('Update successful:', result);

    } catch (error) {
        console.error('Update failed:', error);
    } finally {
        await app.close();
    }
}

bootstrap();
