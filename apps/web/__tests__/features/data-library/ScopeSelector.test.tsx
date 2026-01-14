/**
 * Story 9.9: ScopeSelector Component Tests
 * Task 7.2: Tests for search scope selector dropdown
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ScopeSelector } from '@/features/data-library/components/asset-filter/ScopeSelector';
import { SCOPE_OPTIONS, type SearchScope } from '@/features/data-library/components/asset-filter/types';

describe('ScopeSelector', () => {
    const defaultProps = {
        value: 'current-node' as SearchScope,
        onChange: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('rendering', () => {
        it('renders with current-node as default', () => {
            const { getByTestId } = render(<ScopeSelector {...defaultProps} />);

            expect(getByTestId('scope-selector')).toBeTruthy();
            expect(getByTestId('scope-selector-trigger').textContent).toContain('当前节点');
        });

        it('renders with all option selected', () => {
            const { getByTestId } = render(<ScopeSelector {...defaultProps} value="all" />);

            expect(getByTestId('scope-selector-trigger').textContent).toContain('全部资产');
        });

        it('renders with unlinked option selected', () => {
            const { getByTestId } = render(<ScopeSelector {...defaultProps} value="unlinked" />);

            expect(getByTestId('scope-selector-trigger').textContent).toContain('未关联资产');
        });

        it('renders disabled state', () => {
            const { getByTestId } = render(<ScopeSelector {...defaultProps} disabled />);

            expect(getByTestId('scope-selector-trigger').hasAttribute('disabled')).toBe(true);
        });
    });

    describe('dropdown interactions', () => {
        it('opens dropdown on click', () => {
            const { getByTestId } = render(<ScopeSelector {...defaultProps} />);

            const trigger = getByTestId('scope-selector-trigger');
            fireEvent.click(trigger);

            expect(getByTestId('scope-selector-dropdown')).toBeTruthy();
            expect(getByTestId('scope-option-current-node')).toBeTruthy();
            expect(getByTestId('scope-option-all')).toBeTruthy();
            expect(getByTestId('scope-option-unlinked')).toBeTruthy();
        });

        it('closes dropdown when clicking option', () => {
            const { getByTestId, queryByTestId } = render(<ScopeSelector {...defaultProps} />);

            fireEvent.click(getByTestId('scope-selector-trigger'));
            expect(getByTestId('scope-selector-dropdown')).toBeTruthy();

            fireEvent.click(getByTestId('scope-option-all'));
            expect(queryByTestId('scope-selector-dropdown')).toBeNull();
        });

        it('toggles dropdown on repeated trigger clicks', () => {
            const { getByTestId, queryByTestId } = render(<ScopeSelector {...defaultProps} />);

            const trigger = getByTestId('scope-selector-trigger');

            // Open
            fireEvent.click(trigger);
            expect(getByTestId('scope-selector-dropdown')).toBeTruthy();

            // Close
            fireEvent.click(trigger);
            expect(queryByTestId('scope-selector-dropdown')).toBeNull();
        });
    });

    describe('onChange callback', () => {
        it('calls onChange with "all" when selecting all option', () => {
            const onChange = vi.fn();
            const { getByTestId } = render(<ScopeSelector {...defaultProps} onChange={onChange} />);

            fireEvent.click(getByTestId('scope-selector-trigger'));
            fireEvent.click(getByTestId('scope-option-all'));

            expect(onChange).toHaveBeenCalledWith('all');
        });

        it('calls onChange with "unlinked" when selecting unlinked option', () => {
            const onChange = vi.fn();
            const { getByTestId } = render(<ScopeSelector {...defaultProps} onChange={onChange} />);

            fireEvent.click(getByTestId('scope-selector-trigger'));
            fireEvent.click(getByTestId('scope-option-unlinked'));

            expect(onChange).toHaveBeenCalledWith('unlinked');
        });

        it('calls onChange with "current-node" when selecting current-node option', () => {
            const onChange = vi.fn();
            const { getByTestId } = render(<ScopeSelector {...defaultProps} value="all" onChange={onChange} />);

            fireEvent.click(getByTestId('scope-selector-trigger'));
            fireEvent.click(getByTestId('scope-option-current-node'));

            expect(onChange).toHaveBeenCalledWith('current-node');
        });
    });

    describe('accessibility', () => {
        it('has correct aria attributes on trigger', () => {
            const { getByTestId } = render(<ScopeSelector {...defaultProps} />);

            const trigger = getByTestId('scope-selector-trigger');
            expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
            expect(trigger.getAttribute('aria-expanded')).toBe('false');
        });

        it('updates aria-expanded when dropdown opens', () => {
            const { getByTestId } = render(<ScopeSelector {...defaultProps} />);

            const trigger = getByTestId('scope-selector-trigger');
            fireEvent.click(trigger);

            expect(trigger.getAttribute('aria-expanded')).toBe('true');
        });

        it('has role="listbox" on dropdown', () => {
            const { getByTestId, getByRole } = render(<ScopeSelector {...defaultProps} />);

            fireEvent.click(getByTestId('scope-selector-trigger'));
            expect(getByRole('listbox')).toBeTruthy();
        });

        it('has role="option" on each option', () => {
            const { getByTestId, getAllByRole } = render(<ScopeSelector {...defaultProps} />);

            fireEvent.click(getByTestId('scope-selector-trigger'));

            const options = getAllByRole('option');
            expect(options.length).toBe(3);
        });

        it('marks selected option with aria-selected', () => {
            const { getByTestId } = render(<ScopeSelector {...defaultProps} value="all" />);

            fireEvent.click(getByTestId('scope-selector-trigger'));

            expect(getByTestId('scope-option-all').getAttribute('aria-selected')).toBe('true');
            expect(getByTestId('scope-option-current-node').getAttribute('aria-selected')).toBe('false');
        });
    });

    describe('option details', () => {
        it('shows description for each option', () => {
            const { getByTestId, getByText } = render(<ScopeSelector {...defaultProps} />);

            fireEvent.click(getByTestId('scope-selector-trigger'));

            SCOPE_OPTIONS.forEach((option) => {
                expect(getByText(option.description)).toBeTruthy();
            });
        });

        it('shows check icon for selected option', () => {
            const { getByTestId } = render(<ScopeSelector {...defaultProps} value="current-node" />);

            fireEvent.click(getByTestId('scope-selector-trigger'));

            // The selected option should have a specific styling
            const selectedOption = getByTestId('scope-option-current-node');
            expect(selectedOption.className).toContain('bg-blue-50');
        });
    });
});
