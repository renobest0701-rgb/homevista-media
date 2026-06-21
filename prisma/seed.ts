import "dotenv/config";
import { PrismaClient, OrgType, MemberRole, SiteType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"]! });
const prisma = new PrismaClient({ adapter });

const supabaseAdmin = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function upsertAuthUser(email: string, password: string): Promise<string> {
  // Check if user already exists
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === email);
  if (found) return found.id;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`Failed to create auth user ${email}: ${error.message}`);
  return data.user.id;
}

async function main() {
  console.log("Seeding database...");

  // ── Organizations ───────────────────────────────────────────
  const hvOrg = await prisma.organization.upsert({
    where: { id: "org-homevista" },
    update: {},
    create: {
      id: "org-homevista",
      name: "HOMEVISTA株式会社",
      nameEn: "HOMEVISTA Inc.",
      type: OrgType.INTERNAL,
    },
  });

  const shootOrg = await prisma.organization.upsert({
    where: { id: "org-shoot-team-cn" },
    update: {},
    create: {
      id: "org-shoot-team-cn",
      name: "撮影チーム（中国）",
      nameEn: "Shooting Team CN",
      type: OrgType.SHOOTING_TEAM,
    },
  });

  const clientOrg = await prisma.organization.upsert({
    where: { id: "org-client-demo" },
    update: {},
    create: {
      id: "org-client-demo",
      name: "デモデベロッパー株式会社",
      nameEn: "Demo Developer Co.",
      type: OrgType.CLIENT,
    },
  });

  // ── Users (Supabase Auth + DB) ──────────────────────────────
  const PASSWORD = "Password1!";
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  console.log("Creating Supabase Auth users...");
  const adminAuthId = await upsertAuthUser("admin@homevista.jp", PASSWORD);
  const pmAuthId = await upsertAuthUser("pm@homevista.jp", PASSWORD);
  const uploaderAuthId = await upsertAuthUser("uploader@shootteam.cn", PASSWORD);
  const clientAuthId = await upsertAuthUser("client@developer.co.jp", PASSWORD);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@homevista.jp" },
    update: { supabaseId: adminAuthId },
    create: {
      id: "user-admin",
      email: "admin@homevista.jp",
      name: "管理者 太郎",
      nameEn: "Admin Taro",
      passwordHash,
      supabaseId: adminAuthId,
      preferredLanguage: "ja",
    },
  });

  const pmUser = await prisma.user.upsert({
    where: { email: "pm@homevista.jp" },
    update: { supabaseId: pmAuthId },
    create: {
      id: "user-pm",
      email: "pm@homevista.jp",
      name: "プロジェクトマネージャー 花子",
      nameEn: "PM Hanako",
      passwordHash,
      supabaseId: pmAuthId,
      preferredLanguage: "ja",
    },
  });

  const uploaderUser = await prisma.user.upsert({
    where: { email: "uploader@shootteam.cn" },
    update: { supabaseId: uploaderAuthId },
    create: {
      id: "user-uploader",
      email: "uploader@shootteam.cn",
      name: "摄影师 王伟",
      nameEn: "Wang Wei",
      passwordHash,
      supabaseId: uploaderAuthId,
      preferredLanguage: "zh-CN",
    },
  });

  const clientUser = await prisma.user.upsert({
    where: { email: "client@developer.co.jp" },
    update: { supabaseId: clientAuthId },
    create: {
      id: "user-client",
      email: "client@developer.co.jp",
      name: "田中 建設",
      nameEn: "Tanaka Kensetsu",
      passwordHash,
      supabaseId: clientAuthId,
      preferredLanguage: "ja",
    },
  });

  // ── Memberships ─────────────────────────────────────────────
  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: hvOrg.id, userId: adminUser.id } },
    update: {},
    create: { organizationId: hvOrg.id, userId: adminUser.id, role: MemberRole.SUPER_ADMIN },
  });

  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: hvOrg.id, userId: pmUser.id } },
    update: {},
    create: { organizationId: hvOrg.id, userId: pmUser.id, role: MemberRole.PROJECT_MANAGER },
  });

  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: shootOrg.id, userId: uploaderUser.id } },
    update: {},
    create: { organizationId: shootOrg.id, userId: uploaderUser.id, role: MemberRole.UPLOADER },
  });

  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: clientOrg.id, userId: clientUser.id } },
    update: {},
    create: { organizationId: clientOrg.id, userId: clientUser.id, role: MemberRole.CLIENT_ADMIN },
  });

  // ── Master Tags ─────────────────────────────────────────────
  const tagData = [
    // Shoot categories
    { category: "SHOOT_CATEGORY", code: "cat-exterior", labelJa: "物件外観", labelZhCn: "物业外观", labelEn: "Exterior" },
    { category: "SHOOT_CATEGORY", code: "cat-interior", labelJa: "物件内観", labelZhCn: "物业内部", labelEn: "Interior" },
    { category: "SHOOT_CATEGORY", code: "cat-common", labelJa: "共用部", labelZhCn: "公共区域", labelEn: "Common Area" },
    { category: "SHOOT_CATEGORY", code: "cat-model-room", labelJa: "モデルルーム", labelZhCn: "样板间", labelEn: "Model Room" },
    { category: "SHOOT_CATEGORY", code: "cat-view", labelJa: "眺望", labelZhCn: "景观", labelEn: "View" },
    { category: "SHOOT_CATEGORY", code: "cat-street", labelJa: "街並み", labelZhCn: "街景", labelEn: "Streetscape" },
    { category: "SHOOT_CATEGORY", code: "cat-station", labelJa: "駅", labelZhCn: "车站", labelEn: "Station" },
    { category: "SHOOT_CATEGORY", code: "cat-park", labelJa: "公園", labelZhCn: "公园", labelEn: "Park" },
    { category: "SHOOT_CATEGORY", code: "cat-nature", labelJa: "自然", labelZhCn: "自然", labelEn: "Nature" },
    { category: "SHOOT_CATEGORY", code: "cat-sea", labelJa: "海", labelZhCn: "海", labelEn: "Sea" },
    { category: "SHOOT_CATEGORY", code: "cat-mountain", labelJa: "山", labelZhCn: "山", labelEn: "Mountain" },
    { category: "SHOOT_CATEGORY", code: "cat-shopping", labelJa: "商業施設", labelZhCn: "商业设施", labelEn: "Shopping" },
    { category: "SHOOT_CATEGORY", code: "cat-restaurant", labelJa: "飲食店", labelZhCn: "餐厅", labelEn: "Restaurant" },
    { category: "SHOOT_CATEGORY", code: "cat-school", labelJa: "教育施設", labelZhCn: "教育设施", labelEn: "Education" },
    { category: "SHOOT_CATEGORY", code: "cat-hospital", labelJa: "医療施設", labelZhCn: "医疗设施", labelEn: "Medical" },
    { category: "SHOOT_CATEGORY", code: "cat-redevelopment", labelJa: "再開発", labelZhCn: "再开发", labelEn: "Redevelopment" },
    { category: "SHOOT_CATEGORY", code: "cat-people", labelJa: "人物・ライフスタイル", labelZhCn: "人物/生活方式", labelEn: "People & Lifestyle" },
    // Shoot methods (simplified 4 categories — auto-inferred from asset type)
    { category: "SHOOT_METHOD", code: "method-standard", labelJa: "通常撮影", labelZhCn: "常规拍摄", labelEn: "Standard" },
    { category: "SHOOT_METHOD", code: "method-drone", labelJa: "ドローン撮影", labelZhCn: "无人机拍摄", labelEn: "Drone" },
    { category: "SHOOT_METHOD", code: "method-360vr", labelJa: "360度・VR撮影", labelZhCn: "360度/VR拍摄", labelEn: "360° / VR" },
    { category: "SHOOT_METHOD", code: "method-other", labelJa: "その他", labelZhCn: "其他", labelEn: "Other" },
    // Property types
    { category: "PROPERTY_TYPE", code: "prop-condo", labelJa: "マンション", labelZhCn: "公寓", labelEn: "Condominium" },
    { category: "PROPERTY_TYPE", code: "prop-house", labelJa: "戸建て", labelZhCn: "独栋住宅", labelEn: "House" },
    { category: "PROPERTY_TYPE", code: "prop-office", labelJa: "オフィス", labelZhCn: "办公室", labelEn: "Office" },
    { category: "PROPERTY_TYPE", code: "prop-commercial", labelJa: "商業施設", labelZhCn: "商业设施", labelEn: "Commercial" },
    { category: "PROPERTY_TYPE", code: "prop-resort", labelJa: "リゾート", labelZhCn: "度假", labelEn: "Resort" },
  ];

  for (const tag of tagData) {
    await prisma.masterTag.upsert({
      where: { code: tag.code },
      update: {},
      create: tag,
    });
  }

  // ── Usage Policies ───────────────────────────────────────────
  await prisma.usagePolicy.upsert({
    where: { id: "policy-standard" },
    update: {},
    create: {
      id: "policy-standard",
      name: "標準利用ポリシー",
      internalUse: "ALLOWED",
      clientDelivery: "ALLOWED",
      homevistaWeb: "ALLOWED",
      clientWeb: "REQUIRES_APPROVAL",
      propertyLandingPage: "REQUIRES_APPROVAL",
      organicInstagram: "REQUIRES_APPROVAL",
      paidInstagram: "REQUIRES_APPROVAL",
      organicFacebook: "REQUIRES_APPROVAL",
      paidFacebook: "REQUIRES_APPROVAL",
      youtube: "REQUIRES_APPROVAL",
      tiktok: "PROHIBITED",
      line: "REQUIRES_APPROVAL",
      overseasUse: "REQUIRES_APPROVAL",
      editingAllowed: true,
    },
  });

  await prisma.usagePolicy.upsert({
    where: { id: "policy-internal-only" },
    update: {},
    create: {
      id: "policy-internal-only",
      name: "社内限定",
      internalUse: "ALLOWED",
      clientDelivery: "PROHIBITED",
      homevistaWeb: "PROHIBITED",
      clientWeb: "PROHIBITED",
      propertyLandingPage: "PROHIBITED",
      organicInstagram: "PROHIBITED",
      paidInstagram: "PROHIBITED",
      organicFacebook: "PROHIBITED",
      paidFacebook: "PROHIBITED",
      youtube: "PROHIBITED",
      tiktok: "PROHIBITED",
      line: "PROHIBITED",
      overseasUse: "PROHIBITED",
      editingAllowed: false,
    },
  });

  // ── Sites ────────────────────────────────────────────────────
  // Demo site — code and name are configurable; do not hardcode region-specific values
  await prisma.site.upsert({
    where: { code: "DEMO_AREA_SITE" },
    update: {},
    create: {
      code: "DEMO_AREA_SITE",
      name: "デモ エリアサイト",
      description: "開発・動作確認用のサンプルエリアサイト",
      type: SiteType.AREA_SITE,
      defaultLanguage: "ja",
      countryCode: "JP",
    },
  });

  // ── Demo Client & Project ────────────────────────────────────
  const demoClient = await prisma.client.upsert({
    where: { id: "client-demo" },
    update: {},
    create: {
      id: "client-demo",
      organizationId: clientOrg.id,
      name: "デモデベロッパー株式会社",
      nameEn: "Demo Developer Co.",
    },
  });

  const demoProject = await prisma.project.upsert({
    where: { code: "PRJ-DEMO01" },
    update: {},
    create: {
      code: "PRJ-DEMO01",
      clientId: demoClient.id,
      name: "デモマンション タワー棟",
      propertyName: "デモマンション タワー棟",
      propertyType: "prop-condo",
      countryCode: "JP",
      prefectureCode: "okinawa",
      municipalityCode: "naha",
      defaultVisibility: "INTERNAL",
      defaultUsagePolicyId: "policy-standard",
      status: "ACTIVE",
    },
  });

  // Demo location
  const demoLocation = await prisma.location.upsert({
    where: { id: "loc-demo-site" },
    update: {},
    create: {
      id: "loc-demo-site",
      name: "デモマンション 建設地",
      locationType: "PROPERTY",
      countryCode: "JP",
      prefectureCode: "okinawa",
      municipalityCode: "naha",
      address: "沖縄県那覇市デモ1-2-3",
      latitude: 26.2124,
      longitude: 127.6792,
    },
  });

  // Demo shoot
  const demoShoot = await prisma.shoot.upsert({
    where: { id: "shoot-demo-001" },
    update: {},
    create: {
      id: "shoot-demo-001",
      projectId: demoProject.id,
      name: "外観・眺望撮影",
      shootDate: new Date("2025-10-15"),
      teamOrgId: shootOrg.id,
      managerUserId: pmUser.id,
      status: "COMPLETED",
    },
  });

  // ShootLocation
  await prisma.shootLocation.upsert({
    where: { shootId_locationId: { shootId: demoShoot.id, locationId: demoLocation.id } },
    update: {},
    create: {
      shootId: demoShoot.id,
      locationId: demoLocation.id,
      plannedCategory: "cat-exterior",
    },
  });

  console.log("✓ Seed completed");
  console.log("\nTest accounts:");
  console.log("  admin@homevista.jp       / Password1! (SUPER_ADMIN)");
  console.log("  pm@homevista.jp          / Password1! (PROJECT_MANAGER)");
  console.log("  uploader@shootteam.cn   / Password1! (UPLOADER)");
  console.log("  client@developer.co.jp  / Password1! (CLIENT_ADMIN)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
