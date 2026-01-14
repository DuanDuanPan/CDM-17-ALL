/**
 * Story 9.9: DualSearch -> NodeSearch Tests
 * Task 7.5: Update DualSearch tests to node-search only
 */

import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, renderHook } from '@testing-library/react';
import { DualSearch, NodeSearch, escapeRegex, useDualSearch } from '@/features/data-library/components/node-tree/NodeSearch';

describe('NodeSearch (simplified DualSearch)', () => {
    it('renders node search input and helper text', () => {
        const { getByTestId, getByText } = render(
            <NodeSearch query="" onQueryChange={() => { }} />
        );

        expect(getByTestId('node-search')).toBeTruthy();
        expect(getByTestId('node-search-input')).toBeTruthy();
        expect(getByText('在 PBS 和任务节点中搜索')).toBeTruthy();
    });

    it('calls onQueryChange when typing', () => {
        const onQueryChange = vi.fn();
        const { getByTestId } = render(<NodeSearch query="" onQueryChange={onQueryChange} />);

        fireEvent.change(getByTestId('node-search-input'), { target: { value: 'PBS' } });

        expect(onQueryChange).toHaveBeenCalledWith('PBS');
    });

    it('shows clear button and clears query', () => {
        const onQueryChange = vi.fn();
        const { getByLabelText } = render(<NodeSearch query="test" onQueryChange={onQueryChange} />);

        fireEvent.click(getByLabelText('清空搜索'));
        expect(onQueryChange).toHaveBeenCalledWith('');
    });

    it('DualSearch is an alias of NodeSearch', () => {
        const onQueryChange = vi.fn();
        const { getByTestId } = render(<DualSearch query="" onQueryChange={onQueryChange} />);

        expect(getByTestId('node-search')).toBeTruthy();
    });
});

describe('escapeRegex', () => {
    it('escapes special regex chars', () => {
        expect(escapeRegex('a+b*c?^$')).toBe('a\\+b\\*c\\?\\^\\$');
        expect(escapeRegex('[test](x)')).toBe('\\[test\\]\\(x\\)');
        expect(escapeRegex('foo|bar')).toBe('foo\\|bar');
    });
});

describe('useDualSearch', () => {
    it('returns escapedQuery for safe regex usage', () => {
        const { result } = renderHook(() => useDualSearch());

        act(() => {
            result.current.setQuery('a+b');
        });

        expect(result.current.query).toBe('a+b');
        expect(result.current.escapedQuery).toBe('a\\+b');
    });

    it('clears query via clear()', () => {
        const { result } = renderHook(() => useDualSearch());

        act(() => {
            result.current.setQuery('x');
        });
        expect(result.current.query).toBe('x');

        act(() => {
            result.current.clear();
        });
        expect(result.current.query).toBe('');
    });
});
