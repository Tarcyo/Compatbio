/** @type {import("jest").Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/integration/**/*.int.test.ts"],
  globalSetup: "<rootDir>/test/integration/globalSetup.cjs",
  globalTeardown: "<rootDir>/test/integration/globalTeardown.cjs",
  setupFiles: ["<rootDir>/test/integration/jest.setup.cjs"],
  clearMocks: true,
};
