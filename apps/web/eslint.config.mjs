import baseConfig from '@cdm/config/eslint';

export default [
    ...baseConfig,
    {
        ignores: [
            '.next/**',
            'node_modules/**',
            'playwright-report/**',
            'test-results/**',
        ],
    },
    // Story 7.2: Hook-First Pattern Enforcement
    // Prevents direct fetch() calls in components - must use custom hooks
    {
        files: ['components/**/*.tsx', 'components/**/*.ts'],
        rules: {
            'no-restricted-syntax': [
                'warn', // Initial: warn level; change to 'error' after all violations fixed
                {
                    selector: 'CallExpression[callee.name="fetch"]',
                    message: '❌ 禁止在组件中直接调用 fetch()。请使用 Custom Hooks (如 useApproval, useTaskDispatch) 或 @/lib/api 服务层。[Source: project-context.md:85, architecture.md:650]',
                },
                {
                    selector: 'MemberExpression[object.name="window"][property.name="fetch"]',
                    message: '❌ 禁止在组件中直接调用 window.fetch()。请使用 Custom Hooks 或服务层。',
                },
            ],
        },
    },
];
