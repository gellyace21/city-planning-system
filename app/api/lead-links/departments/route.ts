import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const departments = await sql`
      SELECT
        id,
        label,
        bg,
        text,
        border,
        accent
      FROM departments
      ORDER BY label ASC
    `;

    return NextResponse.json(
      departments.map((dept) => ({
        id: dept.id,
        label: dept.label,
        color: {
          bg: dept.bg,
          text: dept.text,
          border: dept.border,
          accent: dept.accent,
        },
      })),
    );
  } catch (error) {
    console.error("Failed to fetch departments:", error);

    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { label, color } = body;

    if (!label || !color) {
      return NextResponse.json(
        { error: "Missing label or color" },
        { status: 400 },
      );
    }

    const { bg, text, border, accent } = color;

    const [department] = await sql`
      INSERT INTO departments (
        label,
        bg,
        text,
        border,
        accent
      )
      VALUES (
        ${label},
        ${bg},
        ${text},
        ${border},
        ${accent}
      )
      RETURNING id, label, bg, text, border, accent
    `;

    return NextResponse.json({
      id: department.id,
      label: department.label,
      color: {
        bg: department.bg,
        text: department.text,
        border: department.border,
        accent: department.accent,
      },
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 },
    );
  }
}
