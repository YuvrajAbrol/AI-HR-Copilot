// ---------------------------------------------------------------------------
// Mock data for the AI HR Copilot MVP.
//
// Everything the UI renders originates here. When wiring the real Azure SQL /
// App Service backend, you should NOT need to touch the components: instead
// replace the resolvers in `src/services/api.js` with real `fetch` calls that
// return objects with the same shapes shown below.
// ---------------------------------------------------------------------------

export const currentUser = {
  id: "emp-001",
  name: "Alex Morgan",
  title: "Senior Product Designer",
  department: "Design",
  email: "alex.morgan@contoso.com",
  avatarInitials: "AM",
  managerName: "Priya Nair",
};

export const leaveBalances = [
  { type: "Vacation", used: 8, total: 20, color: "brand" },
  { type: "Sick", used: 2, total: 6, color: "rose" },
  { type: "Personal", used: 1, total: 4, color: "amber" },
];

export const leaveRequests = [
  {
    id: "lr-1041",
    type: "Vacation",
    startDate: "2026-08-10",
    endDate: "2026-08-14",
    days: 5,
    status: "Approved",
    reason: "Family trip",
  },
  {
    id: "lr-1039",
    type: "Sick",
    startDate: "2026-06-02",
    endDate: "2026-06-02",
    days: 1,
    status: "Approved",
    reason: "Flu",
  },
  {
    id: "lr-1035",
    type: "Personal",
    startDate: "2026-05-19",
    endDate: "2026-05-19",
    days: 1,
    status: "Approved",
    reason: "Appointment",
  },
  {
    id: "lr-1030",
    type: "Vacation",
    startDate: "2026-09-01",
    endDate: "2026-09-03",
    days: 3,
    status: "Pending",
    reason: "Long weekend",
  },
];

export const benefits = {
  health: {
    plan: "Contoso PPO Plus",
    provider: "BlueShield National",
    memberId: "BSN-88-402214",
    tier: "Employee + Spouse",
    deductible: "$1,200 / year",
    outOfPocketMax: "$4,500 / year",
    premiumPerMonth: "$182.50",
    coverage: [
      { label: "Primary care visit", value: "$25 copay" },
      { label: "Specialist visit", value: "$45 copay" },
      { label: "Emergency room", value: "$300 copay" },
      { label: "Prescription (generic)", value: "$10 copay" },
    ],
  },
  dental: {
    plan: "DeltaCare Premier",
    provider: "Delta Dental",
    memberId: "DD-55-119083",
    tier: "Employee + Spouse",
    premiumPerMonth: "$28.00",
    coverage: [
      { label: "Preventive (cleanings)", value: "100% covered" },
      { label: "Basic (fillings)", value: "80% covered" },
      { label: "Major (crowns)", value: "50% covered" },
      { label: "Annual maximum", value: "$2,000" },
    ],
  },
  vision: {
    plan: "VSP Choice",
    provider: "Vision Service Plan",
    memberId: "VSP-21-770158",
    tier: "Employee + Spouse",
    premiumPerMonth: "$9.00",
    coverage: [
      { label: "Eye exam", value: "$10 copay" },
      { label: "Frames allowance", value: "$150 / 24 mo" },
      { label: "Contact lenses", value: "$130 allowance" },
    ],
  },
};

export const paystubs = [
  {
    id: "ps-2026-07",
    period: "Jul 1 – Jul 15, 2026",
    payDate: "2026-07-16",
    gross: 4583.33,
    net: 3218.4,
    taxes: 1041.55,
    deductions: 323.38,
  },
  {
    id: "ps-2026-06b",
    period: "Jun 16 – Jun 30, 2026",
    payDate: "2026-07-01",
    gross: 4583.33,
    net: 3218.4,
    taxes: 1041.55,
    deductions: 323.38,
  },
  {
    id: "ps-2026-06a",
    period: "Jun 1 – Jun 15, 2026",
    payDate: "2026-06-16",
    gross: 4583.33,
    net: 3218.4,
    taxes: 1041.55,
    deductions: 323.38,
  },
  {
    id: "ps-2026-05b",
    period: "May 16 – May 31, 2026",
    payDate: "2026-06-01",
    gross: 4583.33,
    net: 3105.12,
    taxes: 1041.55,
    deductions: 436.66,
  },
];

export const nextPayday = {
  date: "2026-08-01",
  amount: 3218.4,
};

export const trainingCourses = [
  {
    id: "tr-101",
    title: "Compliance 101",
    category: "Compliance",
    duration: "45 min",
    status: "Pending",
    dueDate: "2026-08-15",
    description: "Annual required compliance and code-of-conduct refresher.",
    progress: 0,
  },
  {
    id: "tr-102",
    title: "Security Awareness Training",
    category: "Security",
    duration: "1 hr",
    status: "In Progress",
    dueDate: "2026-08-30",
    description: "Phishing, passwords, and data handling best practices.",
    progress: 40,
  },
  {
    id: "tr-103",
    title: "Inclusive Leadership",
    category: "Leadership",
    duration: "1.5 hr",
    status: "Completed",
    dueDate: "2026-05-01",
    description: "Building and leading diverse, high-trust teams.",
    progress: 100,
  },
  {
    id: "tr-104",
    title: "Design Systems Fundamentals",
    category: "Career",
    duration: "2 hr",
    status: "Completed",
    dueDate: "2026-04-10",
    description: "Component libraries, tokens, and scalable UI patterns.",
    progress: 100,
  },
  {
    id: "tr-105",
    title: "Effective Feedback",
    category: "Career",
    duration: "40 min",
    status: "Not Started",
    dueDate: "2026-09-20",
    description: "Give and receive feedback that drives growth.",
    progress: 0,
  },
  {
    id: "tr-106",
    title: "Data Privacy & GDPR",
    category: "Compliance",
    duration: "1 hr",
    status: "Not Started",
    dueDate: "2026-10-01",
    description: "Handling personal data across regions and regulations.",
    progress: 0,
  },
];

export const employees = [
  {
    id: "emp-001",
    name: "Alex Morgan",
    title: "Senior Product Designer",
    department: "Design",
    email: "alex.morgan@contoso.com",
    location: "Seattle, WA",
    initials: "AM",
  },
  {
    id: "emp-002",
    name: "Priya Nair",
    title: "Design Manager",
    department: "Design",
    email: "priya.nair@contoso.com",
    location: "Seattle, WA",
    initials: "PN",
  },
  {
    id: "emp-003",
    name: "Marcus Lee",
    title: "Staff Software Engineer",
    department: "Engineering",
    email: "marcus.lee@contoso.com",
    location: "Austin, TX",
    initials: "ML",
  },
  {
    id: "emp-004",
    name: "Sofia Alvarez",
    title: "Engineering Manager",
    department: "Engineering",
    email: "sofia.alvarez@contoso.com",
    location: "Remote",
    initials: "SA",
  },
  {
    id: "emp-005",
    name: "David Chen",
    title: "Product Manager",
    department: "Product",
    email: "david.chen@contoso.com",
    location: "New York, NY",
    initials: "DC",
  },
  {
    id: "emp-006",
    name: "Fatima Khan",
    title: "People Operations Lead",
    department: "Human Resources",
    email: "fatima.khan@contoso.com",
    location: "Seattle, WA",
    initials: "FK",
  },
  {
    id: "emp-007",
    name: "Tom Becker",
    title: "Payroll Specialist",
    department: "Finance",
    email: "tom.becker@contoso.com",
    location: "Chicago, IL",
    initials: "TB",
  },
  {
    id: "emp-008",
    name: "Grace Okafor",
    title: "Recruiter",
    department: "Human Resources",
    email: "grace.okafor@contoso.com",
    location: "Remote",
    initials: "GO",
  },
  {
    id: "emp-009",
    name: "Liam O'Brien",
    title: "Frontend Engineer",
    department: "Engineering",
    email: "liam.obrien@contoso.com",
    location: "Austin, TX",
    initials: "LO",
  },
  {
    id: "emp-010",
    name: "Nina Petrova",
    title: "Data Analyst",
    department: "Product",
    email: "nina.petrova@contoso.com",
    location: "Remote",
    initials: "NP",
  },
];

// Knowledge snippets the mock "RAG" tool retrieves from. In production this is
// replaced by Azure AI Search over your policy documents.
export const policyDocuments = [
  {
    id: "pol-sick",
    topic: "sick leave",
    title: "Sick Leave Policy",
    snippet:
      "Employees accrue 6 sick days per year. A doctor's note is required for absences of more than 3 consecutive days.",
  },
  {
    id: "pol-vacation",
    topic: "vacation",
    title: "Vacation Policy",
    snippet:
      "Full-time employees receive 20 vacation days annually. Requests should be submitted at least 2 weeks in advance and are subject to manager approval.",
  },
  {
    id: "pol-benefits",
    topic: "benefits",
    title: "Benefits Enrollment",
    snippet:
      "Open enrollment runs each November. Qualifying life events allow mid-year changes within 30 days of the event.",
  },
  {
    id: "pol-payroll",
    topic: "payroll",
    title: "Payroll Schedule",
    snippet:
      "Pay is issued semi-monthly on the 1st and 16th. Direct deposit changes take one full cycle to take effect.",
  },
];
