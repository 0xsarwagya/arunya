import type { z } from "zod";
import type { EventDataSchema } from "./schema";

export type TrackerEventData = z.infer<typeof EventDataSchema>;
