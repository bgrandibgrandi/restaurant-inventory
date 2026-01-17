require('@testing-library/jest-dom');

// Fail on any skipped tests in CI
if (process.env.CI) {
  global.it.skip = () => {
    throw new Error('Skipped tests are not allowed in CI. Remove .skip or fix the test.');
  };

  global.test.skip = () => {
    throw new Error('Skipped tests are not allowed in CI. Remove .skip or fix the test.');
  };

  global.describe.skip = () => {
    throw new Error('Skipped describe blocks are not allowed in CI. Remove .skip or fix the tests.');
  };
}
