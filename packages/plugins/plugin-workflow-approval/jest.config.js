module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.spec.json' }],
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@cdm/types$': '<rootDir>/../../../types/src',
    '^@cdm/database$': '<rootDir>/../../../database/src',
    '^@cdm/plugin-mindmap-core/server$': '<rootDir>/../../plugin-mindmap-core/src/server',
  },
};
