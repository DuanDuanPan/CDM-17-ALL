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
];
