/**
 * Story 2.7: Mock Product Library Module
 * Provides mock product data for PBS node product linking
 */
import { Module } from '@nestjs/common';
import { ProductLibraryController } from './product-library.controller';

@Module({
    controllers: [ProductLibraryController],
    providers: [],
    exports: [],
})
export class ProductLibraryModule { }
