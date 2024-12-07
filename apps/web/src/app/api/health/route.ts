import { NextResponse } from "next/server";
import { EventDataSchema } from "../../../types/schema";

async function handler() {
	return NextResponse.json(
		{
			status: "Healthy",
		},
		{
			status: 200,
		},
	);
}

export { handler as GET, handler as POST };
