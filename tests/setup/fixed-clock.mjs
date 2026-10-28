// Preloaded into the test build (node --import) by tests/setup/build.ts.
// Moves the clock to TEST_BUILD_NOW so the build decides which events are
// upcoming or past against a known instant rather than the wall clock.
const target = Date.parse(process.env.TEST_BUILD_NOW ?? "");

if (!Number.isNaN(target)) {
  const RealDate = Date;
  const offset = target - RealDate.now();

  class ShiftedDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        super(RealDate.now() + offset);
      } else {
        super(...args);
      }
    }

    static now() {
      return RealDate.now() + offset;
    }
  }

  globalThis.Date = ShiftedDate;
}
