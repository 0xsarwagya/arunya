import { prisma } from "@/lib/utils";
import { EventDataSchema } from "@/types/schema";
import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const websiteId = new URL(request.nextUrl).searchParams.get("websiteId");

		if (!websiteId) {
			return NextResponse.json(
				{
					message: "No Website ID Supplied",
				},
				{
					status: 400,
				},
			);
		}

		const data = EventDataSchema.parse(body);

		return Response.json({ data });
	} catch (error) {
		if (error instanceof ZodError) {
			return NextResponse.json(
				{
					message: "Invalid Data Supplied",
				},
				{
					status: 400,
				},
			);
		}
		return NextResponse.json(
			{
				error,
			},
			{
				status: 500,
			},
		);
	}
}
