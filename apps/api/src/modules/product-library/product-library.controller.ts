/**
 * Story 2.7: Mock Product Library Controller
 * Provides mock product data for PBS node product linking
 * 
 * Note: This is a mock implementation. Real product library integration will be added later.
 */
import { Controller, Get, Query } from '@nestjs/common';

// Story 2.7: Mock Product Data Types
interface MockProduct {
    id: string;
    name: string;
    code: string;
    category: string;
}

// Mock product data (hardcoded for MVP)
const MOCK_PRODUCTS: MockProduct[] = [
    { id: 'prod_01', name: 'Satellite Engine X1', code: 'ENG-X1', category: 'Propulsion' },
    { id: 'prod_02', name: 'Solar Panel Type-A', code: 'SP-A', category: 'Power' },
    { id: 'prod_03', name: 'High-Gain Antenna', code: 'ANT-HG', category: 'Communication' },
    { id: 'prod_04', name: 'Star Tracker V3', code: 'AOCS-ST3', category: 'Attitude Control' },
    { id: 'prod_05', name: 'Lithium-Ion Battery Pack', code: 'BAT-LI-50', category: 'Power' },
    { id: 'prod_06', name: 'Reaction Wheel Assembly', code: 'RWA-100', category: 'Attitude Control' },
    { id: 'prod_07', name: 'Thermal Control Unit', code: 'TCU-40', category: 'Thermal' },
    { id: 'prod_08', name: 'Command & Data Handler', code: 'CDH-200', category: 'Avionics' },
    { id: 'prod_09', name: 'Propellant Tank T50', code: 'TANK-50', category: 'Propulsion' },
    { id: 'prod_10', name: 'GPS Receiver Module', code: 'GPS-L1L2', category: 'Navigation' },
];

@Controller('product-library')
export class ProductLibraryController {
    /**
     * GET /api/product-library
     * Returns list of mock products, optionally filtered by search query
     *
     * @param q - Optional search query (filters by name, code, or category)
     * @returns Array of matching products
     */
    @Get()
    searchProducts(@Query('q') q?: string): MockProduct[] {
        if (!q || q.trim() === '') {
            return MOCK_PRODUCTS;
        }

        const query = q.toLowerCase().trim();

        return MOCK_PRODUCTS.filter(
            (product) =>
                product.name.toLowerCase().includes(query) ||
                product.code.toLowerCase().includes(query) ||
                product.category.toLowerCase().includes(query)
        );
    }
}
