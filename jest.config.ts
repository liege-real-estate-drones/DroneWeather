module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1', // Adjust if your path aliases are different
    },
    testPathIgnorePatterns: [
      "<rootDir>/.next/", 
      "<rootDir>/node_modules/"
    ],
  };
  