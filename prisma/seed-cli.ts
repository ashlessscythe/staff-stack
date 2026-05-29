export type SeedOptions = {
  clear: boolean;
  useFaker: boolean;
  /** Number of employee accounts for the Acme tenant (minimum 2). */
  employeeCount: number;
};

const DEFAULT_EMPLOYEE_COUNT = 12;
const MIN_EMPLOYEE_COUNT = 2;
const MAX_EMPLOYEE_COUNT = 500;

export function printSeedHelp(): void {
  console.info(`
StaffStack database seed

Usage:
  npx prisma db seed [-- <flags>]
  npm run db:seed -- <flags>
  tsx prisma/seed.ts <flags>

Flags:
  --clear       Delete all application data before seeding
  --use-faker   Randomize display names (and shift titles) with Faker
  --count <n>   Employee count for the Acme tenant (default ${DEFAULT_EMPLOYEE_COUNT}, max ${MAX_EMPLOYEE_COUNT})
  --help        Show this message

Examples:
  npm run db:seed
  npm run db:seed -- --clear
  npm run db:seed -- --clear --use-faker --count 40
`);
}

export function parseSeedArgs(argv: string[] = process.argv.slice(2)): SeedOptions {
  let clear = false;
  let useFaker = false;
  let employeeCount = DEFAULT_EMPLOYEE_COUNT;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      printSeedHelp();
      process.exit(0);
    }
    if (arg === "--clear") {
      clear = true;
      continue;
    }
    if (arg === "--use-faker") {
      useFaker = true;
      continue;
    }
    if (arg === "--count" || arg.startsWith("--count=")) {
      const raw = arg.includes("=") ? arg.split("=")[1] : argv[++i];
      const n = Number(raw);
      if (!Number.isInteger(n) || n < MIN_EMPLOYEE_COUNT || n > MAX_EMPLOYEE_COUNT) {
        console.error(
          `--count must be an integer between ${MIN_EMPLOYEE_COUNT} and ${MAX_EMPLOYEE_COUNT}`,
        );
        process.exit(1);
      }
      employeeCount = n;
      continue;
    }
    console.error(`Unknown seed flag: ${arg}`);
    printSeedHelp();
    process.exit(1);
  }

  return { clear, useFaker, employeeCount };
}
