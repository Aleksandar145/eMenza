import { HIGH_TOP_UP_THRESHOLD } from "@/lib/top-up-limits";

/** Prag starosti (u satima) za nerešene žalbe/povratne informacije. */
export const UNRESOLVED_COMPLAINT_AGE_HOURS = 24;

/** Prag iznosa gotovinske dopune koja se smatra sumnjivo velikom. */
export const SUSPICIOUS_TOP_UP_THRESHOLD_RSD = HIGH_TOP_UP_THRESHOLD;

/** Broj dana unapred (uključujući danas) za proveru rasporeda jelovnika. */
export const SCHEDULE_ALERT_LOOKAHEAD_DAYS = 2;
