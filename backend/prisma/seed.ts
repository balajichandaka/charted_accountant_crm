import {
  PrismaClient,
  Role,
  Frequency,
  Priority,
  BillableType,
  TicketStatus,
  SubtaskStatus,
  ActivityType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123";

// The 10 "Category Of Works" from the CA's requirement sheet
const CATEGORIES: { name: string; colorHex: string }[] = [
  { name: "GST", colorHex: "#2563eb" },
  { name: "Income Tax", colorHex: "#16a34a" },
  { name: "MCA Filings", colorHex: "#9333ea" },
  { name: "Other Statutory Works", colorHex: "#0891b2" },
  { name: "PF", colorHex: "#ca8a04" },
  { name: "ESI", colorHex: "#dc2626" },
  { name: "Financial Statements", colorHex: "#0d9488" },
  { name: "Projected Financials", colorHex: "#7c3aed" },
  { name: "Project Report", colorHex: "#ea580c" },
  { name: "One time Task", colorHex: "#64748b" },
];

async function main() {
  const existingCa = await prisma.user.findFirst({ where: { role: Role.CA } });
  if (existingCa) {
    console.log("✓ Database already seeded (CA user exists). Skipping.");
    return;
  }

  console.log("Seeding demo data...");
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  // --- Firm (tenant) that owns all seeded data ---
  // Slug matches NEXT_PUBLIC_DEFAULT_FIRM_SLUG for local dev on plain localhost.
  const firm = await prisma.firm.create({
    data: { name: "Demo CA Firm", slug: process.env.SEED_FIRM_SLUG ?? "demo", brandName: "Demo CA Firm" },
  });
  const firmId = firm.id;

  // Per-firm ticket counter (the app's Prisma extension does this at runtime;
  // the seed assigns numbers directly since it uses the raw client).
  let ticketSeq = 0;

  // --- Users ---
  const ca = await prisma.user.create({
    data: {
      firmId,
      name: "Suresh Kumar (CA)",
      email: "ca@firm.test",
      passwordHash,
      role: Role.CA,
    },
  });
  const priya = await prisma.user.create({
    data: {
      firmId,
      name: "Priya Sharma",
      email: "priya@firm.test",
      passwordHash,
      role: Role.EMPLOYEE,
    },
  });
  const rahul = await prisma.user.create({
    data: {
      firmId,
      name: "Rahul Verma",
      email: "rahul@firm.test",
      passwordHash,
      role: Role.EMPLOYEE,
    },
  });
  const meena = await prisma.user.create({
    data: {
      firmId,
      name: "Meena Iyer (Manager)",
      email: "meena@firm.test",
      passwordHash,
      role: Role.MANAGER,
    },
  });

  // --- Categories ---
  const categories: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const cat = await prisma.category.create({ data: { ...c, firmId } });
    categories[c.name] = cat.id;
  }

  // --- Clients (Sheet-2 fields) ---
  const acme = await prisma.client.create({
    data: {
      firmId,
      name: "Acme Traders Pvt Ltd",
      companyName: "Acme Traders Pvt Ltd",
      gstNumber: "29AABCA1234F1Z5",
      billTo: "Acme Traders Pvt Ltd, Bengaluru",
      shipTo: "Acme Traders Pvt Ltd, Bengaluru",
      rcm: false,
      creditPeriodDays: 30,
      state: "Karnataka",
      fullAddress: "12, MG Road, Bengaluru 560001",
      email: "accounts@acmetraders.test",
      phone: "+91 98800 11223",
    },
  });
  const nova = await prisma.client.create({
    data: {
      firmId,
      name: "Nova Foods LLP",
      companyName: "Nova Foods LLP",
      gstNumber: "27AAGFN5678K1Z2",
      billTo: "Nova Foods LLP, Pune",
      rcm: true,
      creditPeriodDays: 15,
      state: "Maharashtra",
      fullAddress: "44, FC Road, Pune 411004",
      email: "finance@novafoods.test",
      phone: "+91 99220 33445",
    },
  });
  const zenith = await prisma.client.create({
    data: {
      firmId,
      name: "Zenith Textiles",
      companyName: "Zenith Textiles",
      gstNumber: "24AAACZ9012M1Z9",
      rcm: false,
      creditPeriodDays: 45,
      state: "Gujarat",
      fullAddress: "8, Ring Road, Surat 395002",
      email: "owner@zenithtextiles.test",
      phone: "+91 90990 55667",
    },
  });

  // --- Work Templates (Task + ordered Sub-tasks) ---
  const incorporation = await prisma.workTemplate.create({
    data: {
      firmId,
      name: "Company Incorporation",
      categoryId: categories["MCA Filings"],
      documentsRequired:
        "KYC docs, Rental agreement, Electricity bill copies, Photographs",
      defaultFrequency: Frequency.ONE_TIME,
      defaultBillable: BillableType.BILLABLE,
      defaultPriority: Priority.HIGH,
      subtasks: {
        create: [
          { title: "Basic Documentation", order: 0 },
          { title: "Name Reservation", order: 1 },
          { title: "Incorporation Process", order: 2 },
          { title: "Submission - Final", order: 3 },
          { title: "Approval / Remarks", order: 4 },
        ].map((s) => ({ ...s, firmId })),
      },
    },
    include: { subtasks: { orderBy: { order: "asc" } } },
  });

  const gstFiling = await prisma.workTemplate.create({
    data: {
      firmId,
      name: "GST Monthly Filing",
      categoryId: categories["GST"],
      documentsRequired: "Sales register, Purchase register, Bank statement",
      defaultFrequency: Frequency.MONTHLY,
      defaultBillable: BillableType.BILLABLE,
      defaultPriority: Priority.MEDIUM,
      subtasks: {
        create: [
          { title: "Collect invoices", order: 0 },
          { title: "Reconcile GSTR-2B", order: 1 },
          { title: "Prepare GSTR-1", order: 2 },
          { title: "File GSTR-3B", order: 3 },
          { title: "Share acknowledgement", order: 4 },
        ].map((s) => ({ ...s, firmId })),
      },
    },
    include: { subtasks: { orderBy: { order: "asc" } } },
  });

  const itr = await prisma.workTemplate.create({
    data: {
      firmId,
      name: "Income Tax Return",
      categoryId: categories["Income Tax"],
      documentsRequired: "Form 16, Form 26AS, Bank interest certificates",
      defaultFrequency: Frequency.YEARLY,
      defaultBillable: BillableType.BILLABLE,
      defaultPriority: Priority.MEDIUM,
      subtasks: {
        create: [
          { title: "Collect Form 16 / 26AS", order: 0 },
          { title: "Compute total income", order: 1 },
          { title: "Prepare computation sheet", order: 2 },
          { title: "File ITR", order: 3 },
          { title: "Share acknowledgement", order: 4 },
        ].map((s) => ({ ...s, firmId })),
      },
    },
    include: { subtasks: { orderBy: { order: "asc" } } },
  });

  // Helper: create a ticket snapshotting template sub-tasks into a checklist
  type Tmpl = typeof incorporation;
  async function createTicketFromTemplate(opts: {
    template: Tmpl;
    clientId: string;
    assigneeId: string;
    status: TicketStatus;
    doneSubtasks?: number; // first N subtasks marked DONE
    daysFromNowDue?: number;
    completed?: boolean;
    managerId?: string;
    targetHours?: number;
    loggedMinutes?: number; // total time logged by the assignee
  }) {
    const {
      template,
      clientId,
      assigneeId,
      status,
      doneSubtasks = 0,
      daysFromNowDue,
      completed,
      managerId,
      targetHours,
      loggedMinutes,
    } = opts;
    const due =
      daysFromNowDue != null
        ? new Date(Date.now() + daysFromNowDue * 86400000)
        : null;
    return prisma.ticket.create({
      data: {
        firmId,
        ticketNumber: ++ticketSeq,
        title: template.name,
        status,
        priority: template.defaultPriority,
        frequency: template.defaultFrequency,
        documentsRequired: template.documentsRequired,
        billable: template.defaultBillable,
        targetMinutes: targetHours != null ? targetHours * 60 : null,
        clientId,
        categoryId: template.categoryId,
        templateId: template.id,
        assigneeId,
        managerId: managerId ?? null,
        reporterId: ca.id,
        startDate: new Date(Date.now() - 5 * 86400000),
        dueDate: due,
        completedAt: completed ? new Date(Date.now() - 86400000) : null,
        subtasks: {
          create: template.subtasks.map((s, i) => ({
            firmId,
            title: s.title,
            order: s.order,
            status: i < doneSubtasks ? SubtaskStatus.DONE : SubtaskStatus.TODO,
            completedAt: i < doneSubtasks ? new Date() : null,
          })),
        },
        timeEntries: loggedMinutes
          ? {
              create: [
                { firmId, userId: assigneeId, minutes: Math.round(loggedMinutes * 0.6), workDate: new Date(Date.now() - 86400000), description: "Initial work" },
                { firmId, userId: assigneeId, minutes: Math.round(loggedMinutes * 0.4), workDate: new Date(), description: "Follow-up" },
              ],
            }
          : undefined,
        activities: {
          create: { firmId, type: ActivityType.CREATED, actorId: ca.id },
        },
      },
    });
  }

  // --- Sample tickets across statuses ---
  await createTicketFromTemplate({
    template: incorporation,
    clientId: acme.id,
    assigneeId: priya.id,
    managerId: meena.id,
    status: TicketStatus.IN_PROGRESS,
    doneSubtasks: 2,
    daysFromNowDue: 6,
    targetHours: 12,
    loggedMinutes: 320,
  });
  await createTicketFromTemplate({
    template: gstFiling,
    clientId: nova.id,
    assigneeId: rahul.id,
    managerId: meena.id,
    status: TicketStatus.OPEN,
    daysFromNowDue: 3,
    targetHours: 6,
    loggedMinutes: 90,
  });
  await createTicketFromTemplate({
    template: gstFiling,
    clientId: zenith.id,
    assigneeId: priya.id,
    status: TicketStatus.REVIEW,
    doneSubtasks: 4,
    daysFromNowDue: 1,
    targetHours: 6,
    loggedMinutes: 240,
  });
  await createTicketFromTemplate({
    template: itr,
    clientId: acme.id,
    assigneeId: rahul.id,
    managerId: meena.id,
    status: TicketStatus.DONE,
    doneSubtasks: 5,
    completed: true,
    targetHours: 8,
    loggedMinutes: 460,
  });
  await createTicketFromTemplate({
    template: itr,
    clientId: nova.id,
    assigneeId: priya.id,
    status: TicketStatus.DONE,
    doneSubtasks: 5,
    completed: true,
    targetHours: 8,
    loggedMinutes: 410,
  });
  await createTicketFromTemplate({
    template: incorporation,
    clientId: zenith.id,
    assigneeId: rahul.id,
    status: TicketStatus.BLOCKED,
    doneSubtasks: 1,
    daysFromNowDue: 10,
  });

  // --- A recurring schedule: monthly GST filing for Acme ---
  await prisma.recurringSchedule.create({
    data: {
      firmId,
      clientId: acme.id,
      templateId: gstFiling.id,
      assigneeId: rahul.id,
      frequency: Frequency.MONTHLY,
      dayOfMonth: 10,
      dueOffsetDays: 10,
      nextRunAt: new Date(Date.now() + 2 * 86400000),
    },
  });

  // Persist the per-firm ticket counter so app-created tickets continue the sequence.
  await prisma.firm.update({ where: { id: firmId }, data: { ticketSeq } });

  console.log("✓ Seed complete.");
  console.log(`  Login: ca@firm.test / ${DEMO_PASSWORD} (CA)`);
  console.log(`         priya@firm.test / ${DEMO_PASSWORD} (Employee)`);
  console.log(`         rahul@firm.test / ${DEMO_PASSWORD} (Employee)`);
  console.log(`         meena@firm.test / ${DEMO_PASSWORD} (Manager)`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
