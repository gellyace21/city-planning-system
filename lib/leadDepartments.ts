export type LeadDepartmentTheme = {
  key: string;
  label: string;
  color: {
    bg: string;
    text: string;
    border: string;
    accent: string;
  };
};

const GENERAL_DEPARTMENT: LeadDepartmentTheme = {
  key: "general",
  label: "General",
  color: {
    bg: "#f1f5f9",
    text: "#475569",
    border: "#e2e8f0",
    accent: "#64748b",
  },
};

export const LEAD_DEPARTMENTS: LeadDepartmentTheme[] = [
  {
    key: "city-planning-and-development-office",
    label: "City Planning and Development Office",
    color: {
      bg: "#e0f2fe",
      text: "#0369a1",
      border: "#bae6fd",
      accent: "#0ea5e9",
    },
  },
  {
    key: "city-engineering-office",
    label: "City Engineering Office",
    color: {
      bg: "#ccfbf1",
      text: "#0f766e",
      border: "#99f6e4",
      accent: "#14b8a6",
    },
  },
  {
    key: "city-health-office",
    label: "City Health Office",
    color: {
      bg: "#fee2e2",
      text: "#b91c1c",
      border: "#fecaca",
      accent: "#ef4444",
    },
  },
  {
    key: "city-social-welfare-and-development-office",
    label: "City Social Welfare and Development Office",
    color: {
      bg: "#ede9fe",
      text: "#6d28d9",
      border: "#ddd6fe",
      accent: "#8b5cf6",
    },
  },
  {
    key: "city-budget-office",
    label: "City Budget Office",
    color: {
      bg: "#ffedd5",
      text: "#c2410c",
      border: "#fed7aa",
      accent: "#f97316",
    },
  },
  {
    key: "city-accounting-office",
    label: "City Accounting Office",
    color: {
      bg: "#dcfce7",
      text: "#166534",
      border: "#bbf7d0",
      accent: "#22c55e",
    },
  },
  {
    key: "city-treasurers-office",
    label: "City Treasurer's Office",
    color: {
      bg: "#fef3c7",
      text: "#b45309",
      border: "#fde68a",
      accent: "#f59e0b",
    },
  },
  {
    key: "city-assessors-office",
    label: "City Assessor's Office",
    color: {
      bg: "#f3f4f6",
      text: "#4b5563",
      border: "#e5e7eb",
      accent: "#9ca3af",
    },
  },
  {
    key: "city-environment-and-natural-resources-office",
    label: "City Environment and Natural Resources Office",
    color: {
      bg: "#ecfccb",
      text: "#3f6212",
      border: "#d9f99d",
      accent: "#84cc16",
    },
  },
  {
    key: "city-disaster-risk-reduction-and-management-office",
    label: "City Disaster Risk Reduction and Management Office",
    color: {
      bg: "#ffe4e6",
      text: "#be123c",
      border: "#fecdd3",
      accent: "#f43f5e",
    },
  },
  {
    key: "city-agriculture-office",
    label: "City Agriculture Office",
    color: {
      bg: "#f0fdf4",
      text: "#15803d",
      border: "#dcfce7",
      accent: "#22c55e",
    },
  },
  {
    key: "business-permits-and-licensing-office",
    label: "Business Permits and Licensing Office",
    color: {
      bg: "#e0f2fe",
      text: "#0c4a6e",
      border: "#bae6fd",
      accent: "#38bdf8",
    },
  },
  GENERAL_DEPARTMENT,
];

const normalize = (value?: string): string =>
  String(value ?? "").trim().toLowerCase();

export const getDepartmentTheme = (
  department?: string,
): LeadDepartmentTheme => {
  const normalized = normalize(department);
  const match = LEAD_DEPARTMENTS.find(
    (entry) =>
      normalize(entry.label) === normalized || normalize(entry.key) === normalized,
  );
  return match ?? GENERAL_DEPARTMENT;
};

export const getDepartmentLabel = (department?: string): string =>
  getDepartmentTheme(department).label;

export const departmentOptions = LEAD_DEPARTMENTS.map(
  (entry) => entry.label,
);
