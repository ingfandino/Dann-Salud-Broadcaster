// jest.config.js

module.exports = {
    testEnvironment: "node",
    testTimeout: 30000,
    verbose: true,
    setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
};