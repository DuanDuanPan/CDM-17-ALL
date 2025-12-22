'use client';

/**
 * Story 2.7: PBSForm Unit Tests
 * Tests for PBS indicators management and product library linking
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PBSForm } from '@/components/PropertyPanel/PBSForm';
import type { PBSProps, ProductReference } from '@cdm/types';

// Mock ProductSearchDialog
vi.mock('@/components/ProductLibrary', () => ({
    ProductSearchDialog: ({ open, onOpenChange, onSelect }: {
        open: boolean;
        onOpenChange: (open: boolean) => void;
        onSelect: (product: ProductReference) => void;
    }) => open ? (
        <div data-testid="product-search-dialog">
            <button
                data-testid="select-product-btn"
                onClick={() => {
                    onSelect({
                        productId: 'prod_01',
                        productName: 'Test Product',
                        productCode: 'TP-001',
                        category: 'Test',
                    });
                    onOpenChange(false);
                }}
            >
                Select Product
            </button>
            <button data-testid="close-dialog-btn" onClick={() => onOpenChange(false)}>
                Close
            </button>
        </div>
    ) : null,
}));

describe('PBSForm', () => {
    const mockOnUpdate = vi.fn();
    const defaultNodeId = 'test-node-123';

    beforeEach(() => {
        mockOnUpdate.mockClear();
    });

    describe('Basic Fields (Existing)', () => {
        it('renders existing fields (code, version, ownerId) correctly', () => {
            const initialData: PBSProps = {
                code: 'PBS-001',
                version: 'v1.2.0',
                ownerId: 'user-123',
            };

            render(<PBSForm nodeId={defaultNodeId} initialData={initialData} onUpdate={mockOnUpdate} />);

            expect(screen.getByDisplayValue('PBS-001')).toBeTruthy();
            expect(screen.getByDisplayValue('v1.2.0')).toBeTruthy();
            expect(screen.getByDisplayValue('user-123')).toBeTruthy();
        });

        it('calls onUpdate when code field changes', () => {
            render(<PBSForm nodeId={defaultNodeId} onUpdate={mockOnUpdate} />);

            const codeInput = screen.getByPlaceholderText('例如: PBS-001');
            fireEvent.change(codeInput, { target: { value: 'PBS-NEW' } });

            expect(mockOnUpdate).toHaveBeenCalled();
            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.code).toBe('PBS-NEW');
        });
    });

    describe('Indicator Management (Story 2.7)', () => {
        it('displays empty indicator list by default', () => {
            render(<PBSForm nodeId={defaultNodeId} onUpdate={mockOnUpdate} />);

            // Should show "Add Indicator" button but no indicator rows
            expect(screen.getByText('添加指标')).toBeTruthy();
            expect(screen.queryByPlaceholderText('指标名称')).toBeFalsy();
        });

        it('adds a new indicator row when clicking Add Indicator', () => {
            render(<PBSForm nodeId={defaultNodeId} onUpdate={mockOnUpdate} />);

            const addButton = screen.getByText('添加指标');
            fireEvent.click(addButton);

            expect(screen.getByPlaceholderText('指标名称')).toBeTruthy();
            expect(screen.getByPlaceholderText('单位')).toBeTruthy();
            expect(screen.getByPlaceholderText('目标值')).toBeTruthy();
            expect(screen.getByPlaceholderText('实际值')).toBeTruthy();

            // Verify onUpdate was called with new indicator
            expect(mockOnUpdate).toHaveBeenCalled();
            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.indicators).toHaveLength(1);
            expect(lastCall.indicators[0].id).toBeDefined();
        });

        it('adds indicator with preset values from dropdown', () => {
            render(<PBSForm nodeId={defaultNodeId} onUpdate={mockOnUpdate} />);

            // Click "常用指标" to open dropdown
            const presetButton = screen.getByText('常用指标');
            fireEvent.click(presetButton);

            // Select "质量 (Mass)" preset
            const massPreset = screen.getByText('质量 (Mass)');
            fireEvent.click(massPreset);

            // Verify indicator was added with preset values
            expect(mockOnUpdate).toHaveBeenCalled();
            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.indicators).toHaveLength(1);
            expect(lastCall.indicators[0].name).toBe('质量 (Mass)');
            expect(lastCall.indicators[0].unit).toBe('kg');
        });

        it('updates indicator field and calls onUpdate', () => {
            const initialData: PBSProps = {
                code: 'PBS-001',
                indicators: [
                    { id: 'ind-1', name: 'Weight', unit: 'kg', targetValue: '100' },
                ],
            };

            render(<PBSForm nodeId={defaultNodeId} initialData={initialData} onUpdate={mockOnUpdate} />);

            // Find the target value input and change it
            const targetInput = screen.getByDisplayValue('100');
            fireEvent.change(targetInput, { target: { value: '200' } });

            expect(mockOnUpdate).toHaveBeenCalled();
            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.indicators[0].targetValue).toBe('200');
            expect(lastCall.code).toBe('PBS-001'); // Original fields preserved
        });

        it('deletes indicator when clicking delete button', () => {
            const initialData: PBSProps = {
                indicators: [
                    { id: 'ind-1', name: 'Weight', unit: 'kg', targetValue: '100' },
                    { id: 'ind-2', name: 'Power', unit: 'W', targetValue: '50' },
                ],
            };

            render(<PBSForm nodeId={defaultNodeId} initialData={initialData} onUpdate={mockOnUpdate} />);

            // Find and click delete button for first indicator
            const deleteButtons = screen.getAllByTitle('删除指标');
            fireEvent.click(deleteButtons[0]);

            expect(mockOnUpdate).toHaveBeenCalled();
            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.indicators).toHaveLength(1);
            expect(lastCall.indicators[0].id).toBe('ind-2');
        });
    });

    describe('Product Library Link (Story 2.7)', () => {
        it('displays Link Product button when no product is linked', () => {
            render(<PBSForm nodeId={defaultNodeId} onUpdate={mockOnUpdate} />);

            expect(screen.getByText('关联产品库产品')).toBeTruthy();
        });

        it('opens product search dialog when clicking Link Product', () => {
            render(<PBSForm nodeId={defaultNodeId} onUpdate={mockOnUpdate} />);

            const linkButton = screen.getByText('关联产品库产品');
            fireEvent.click(linkButton);

            expect(screen.getByTestId('product-search-dialog')).toBeTruthy();
        });

        it('links product when selecting from dialog', () => {
            render(<PBSForm nodeId={defaultNodeId} onUpdate={mockOnUpdate} />);

            // Open dialog
            const linkButton = screen.getByText('关联产品库产品');
            fireEvent.click(linkButton);

            // Select product
            const selectBtn = screen.getByTestId('select-product-btn');
            fireEvent.click(selectBtn);

            expect(mockOnUpdate).toHaveBeenCalled();
            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.productRef).toBeDefined();
            expect(lastCall.productRef.productCode).toBe('TP-001');
        });

        it('displays linked product info when productRef exists', () => {
            const initialData: PBSProps = {
                productRef: {
                    productId: 'prod_01',
                    productName: 'Satellite Engine X1',
                    productCode: 'ENG-X1',
                    category: 'Propulsion',
                },
            };

            render(<PBSForm nodeId={defaultNodeId} initialData={initialData} onUpdate={mockOnUpdate} />);

            expect(screen.getByText('Satellite Engine X1')).toBeTruthy();
            // Product code appears in both the linked product display and info badge
            expect(screen.getAllByText('ENG-X1').length).toBeGreaterThanOrEqual(1);
            expect(screen.getByText('Propulsion')).toBeTruthy();
        });

        it('unlinks product when clicking unlink button', () => {
            const initialData: PBSProps = {
                productRef: {
                    productId: 'prod_01',
                    productName: 'Satellite Engine X1',
                    productCode: 'ENG-X1',
                    category: 'Propulsion',
                },
            };

            render(<PBSForm nodeId={defaultNodeId} initialData={initialData} onUpdate={mockOnUpdate} />);

            const unlinkButton = screen.getByTitle('取消关联');
            fireEvent.click(unlinkButton);

            expect(mockOnUpdate).toHaveBeenCalled();
            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.productRef).toBeUndefined();
        });
    });

    describe('Info Badge Display', () => {
        it('shows indicator count in info badge', () => {
            const initialData: PBSProps = {
                code: 'PBS-001',
                indicators: [
                    { id: 'ind-1', name: 'Weight', unit: 'kg', targetValue: '100' },
                    { id: 'ind-2', name: 'Power', unit: 'W', targetValue: '50' },
                ],
            };

            render(<PBSForm nodeId={defaultNodeId} initialData={initialData} onUpdate={mockOnUpdate} />);

            expect(screen.getByText('指标数量:')).toBeTruthy();
            expect(screen.getByText('2')).toBeTruthy();
        });
    });
});
