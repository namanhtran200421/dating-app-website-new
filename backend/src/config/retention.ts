const MILLISECONDS_PER_DAY = 86_400_000;
const MAX_RETENTION_DAYS = 3_650;

export type RetentionVariable =
  | "CONTACT_RETENTION_DAYS"
  | "PRE_SIGNUP_RETENTION_DAYS";

export function retentionDays(variable: RetentionVariable): number {
  const rawValue = process.env[variable]?.trim();
  const days = Number(rawValue);

  if (
    !rawValue ||
    !Number.isInteger(days) ||
    days < 1 ||
    days > MAX_RETENTION_DAYS
  ) {
    throw new Error(
      `${variable} must be an integer from 1 to ${MAX_RETENTION_DAYS}.`,
    );
  }

  return days;
}

export function retentionExpiry(
  variable: RetentionVariable,
  startTime = Date.now(),
): Date {
  return new Date(startTime + retentionDays(variable) * MILLISECONDS_PER_DAY);
}

export function validateRetentionConfiguration(): void {
  retentionDays("CONTACT_RETENTION_DAYS");
  retentionDays("PRE_SIGNUP_RETENTION_DAYS");
}
