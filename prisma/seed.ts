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

  const clientOrg2 = await prisma.organization.upsert({
    where: { id: "org-client-tokyo" },
    update: {},
    create: {
      id: "org-client-tokyo",
      name: "東京不動産株式会社",
      nameEn: "Tokyo Real Estate Co.",
      type: OrgType.CLIENT,
    },
  });

  // ── Users ──────────────────────────────────────────────────
  const PASSWORD = "Password1!";
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  console.log("Creating Supabase Auth users...");
  const adminAuthId    = await upsertAuthUser("admin@homevista.jp", PASSWORD);
  const pmAuthId       = await upsertAuthUser("pm@homevista.jp", PASSWORD);
  const assetAdminAuthId = await upsertAuthUser("assetadmin@homevista.jp", PASSWORD);
  const salesAuthId    = await upsertAuthUser("sales@homevista.jp", PASSWORD);
  const uploaderAuthId = await upsertAuthUser("uploader@shootteam.cn", PASSWORD);
  const clientAuthId   = await upsertAuthUser("client@developer.co.jp", PASSWORD);
  const clientUserAuthId = await upsertAuthUser("user@developer.co.jp", PASSWORD);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@homevista.jp" },
    update: { supabaseId: adminAuthId },
    create: { id: "user-admin", email: "admin@homevista.jp", name: "管理者 太郎", nameEn: "Admin Taro", passwordHash, supabaseId: adminAuthId, preferredLanguage: "ja" },
  });

  const pmUser = await prisma.user.upsert({
    where: { email: "pm@homevista.jp" },
    update: { supabaseId: pmAuthId },
    create: { id: "user-pm", email: "pm@homevista.jp", name: "PM 花子", nameEn: "PM Hanako", passwordHash, supabaseId: pmAuthId, preferredLanguage: "ja" },
  });

  const assetAdminUser = await prisma.user.upsert({
    where: { email: "assetadmin@homevista.jp" },
    update: { supabaseId: assetAdminAuthId },
    create: { id: "user-asset-admin", email: "assetadmin@homevista.jp", name: "素材管理 次郎", nameEn: "Asset Admin Jiro", passwordHash, supabaseId: assetAdminAuthId, preferredLanguage: "ja" },
  });

  const salesUser = await prisma.user.upsert({
    where: { email: "sales@homevista.jp" },
    update: { supabaseId: salesAuthId },
    create: { id: "user-sales", email: "sales@homevista.jp", name: "営業 三郎", nameEn: "Sales Saburo", passwordHash, supabaseId: salesAuthId, preferredLanguage: "ja" },
  });

  const uploaderUser = await prisma.user.upsert({
    where: { email: "uploader@shootteam.cn" },
    update: { supabaseId: uploaderAuthId },
    create: { id: "user-uploader", email: "uploader@shootteam.cn", name: "摄影师 王伟", nameEn: "Wang Wei", passwordHash, supabaseId: uploaderAuthId, preferredLanguage: "zh-CN" },
  });

  const clientUser = await prisma.user.upsert({
    where: { email: "client@developer.co.jp" },
    update: { supabaseId: clientAuthId },
    create: { id: "user-client", email: "client@developer.co.jp", name: "田中 建設", nameEn: "Tanaka Kensetsu", passwordHash, supabaseId: clientAuthId, preferredLanguage: "ja" },
  });

  const clientUserSub = await prisma.user.upsert({
    where: { email: "user@developer.co.jp" },
    update: { supabaseId: clientUserAuthId },
    create: { id: "user-client-sub", email: "user@developer.co.jp", name: "鈴木 担当", nameEn: "Suzuki Tanto", passwordHash, supabaseId: clientUserAuthId, preferredLanguage: "ja" },
  });

  // ── Memberships ─────────────────────────────────────────────
  const membershipData = [
    { orgId: hvOrg.id,      userId: adminUser.id,      role: MemberRole.SUPER_ADMIN },
    { orgId: hvOrg.id,      userId: pmUser.id,         role: MemberRole.PROJECT_MANAGER },
    { orgId: hvOrg.id,      userId: assetAdminUser.id, role: MemberRole.ASSET_ADMIN },
    { orgId: hvOrg.id,      userId: salesUser.id,      role: MemberRole.SALES },
    { orgId: shootOrg.id,   userId: uploaderUser.id,   role: MemberRole.UPLOADER },
    { orgId: clientOrg.id,  userId: clientUser.id,     role: MemberRole.CLIENT_ADMIN },
    { orgId: clientOrg.id,  userId: clientUserSub.id,  role: MemberRole.CLIENT_USER },
  ];

  for (const m of membershipData) {
    await prisma.membership.upsert({
      where: { organizationId_userId: { organizationId: m.orgId, userId: m.userId } },
      update: {},
      create: { organizationId: m.orgId, userId: m.userId, role: m.role },
    });
  }

  // ── Master Tags ─────────────────────────────────────────────
  const tagData = [
    // Shoot categories
    { category: "SHOOT_CATEGORY", code: "cat-exterior",      labelJa: "物件外観",           labelZhCn: "物业外观",   labelEn: "Exterior" },
    { category: "SHOOT_CATEGORY", code: "cat-interior",      labelJa: "物件内観",           labelZhCn: "物业内部",   labelEn: "Interior" },
    { category: "SHOOT_CATEGORY", code: "cat-common",        labelJa: "共用部",             labelZhCn: "公共区域",   labelEn: "Common Area" },
    { category: "SHOOT_CATEGORY", code: "cat-model-room",    labelJa: "モデルルーム",        labelZhCn: "样板间",     labelEn: "Model Room" },
    { category: "SHOOT_CATEGORY", code: "cat-view",          labelJa: "眺望",               labelZhCn: "景观",       labelEn: "View" },
    { category: "SHOOT_CATEGORY", code: "cat-street",        labelJa: "街並み",             labelZhCn: "街景",       labelEn: "Streetscape" },
    { category: "SHOOT_CATEGORY", code: "cat-station",       labelJa: "駅",                 labelZhCn: "车站",       labelEn: "Station" },
    { category: "SHOOT_CATEGORY", code: "cat-park",          labelJa: "公園",               labelZhCn: "公园",       labelEn: "Park" },
    { category: "SHOOT_CATEGORY", code: "cat-nature",        labelJa: "自然",               labelZhCn: "自然",       labelEn: "Nature" },
    { category: "SHOOT_CATEGORY", code: "cat-sea",           labelJa: "海",                 labelZhCn: "海",         labelEn: "Sea" },
    { category: "SHOOT_CATEGORY", code: "cat-mountain",      labelJa: "山",                 labelZhCn: "山",         labelEn: "Mountain" },
    { category: "SHOOT_CATEGORY", code: "cat-shopping",      labelJa: "商業施設",            labelZhCn: "商业设施",   labelEn: "Shopping" },
    { category: "SHOOT_CATEGORY", code: "cat-restaurant",    labelJa: "飲食店",             labelZhCn: "餐厅",       labelEn: "Restaurant" },
    { category: "SHOOT_CATEGORY", code: "cat-school",        labelJa: "教育施設",            labelZhCn: "教育设施",   labelEn: "Education" },
    { category: "SHOOT_CATEGORY", code: "cat-hospital",      labelJa: "医療施設",            labelZhCn: "医疗设施",   labelEn: "Medical" },
    { category: "SHOOT_CATEGORY", code: "cat-redevelopment", labelJa: "再開発",             labelZhCn: "再开发",     labelEn: "Redevelopment" },
    { category: "SHOOT_CATEGORY", code: "cat-people",        labelJa: "人物・ライフスタイル", labelZhCn: "人物/生活方式", labelEn: "People & Lifestyle" },
    // Shoot methods
    { category: "SHOOT_METHOD", code: "method-standard", labelJa: "通常撮影",      labelZhCn: "常规拍摄",   labelEn: "Standard" },
    { category: "SHOOT_METHOD", code: "method-drone",    labelJa: "ドローン撮影",   labelZhCn: "无人机拍摄", labelEn: "Drone" },
    { category: "SHOOT_METHOD", code: "method-360vr",    labelJa: "360度・VR撮影", labelZhCn: "360度/VR拍摄", labelEn: "360° / VR" },
    { category: "SHOOT_METHOD", code: "method-other",    labelJa: "その他",         labelZhCn: "其他",       labelEn: "Other" },
    // Property types
    { category: "PROPERTY_TYPE", code: "prop-condo",      labelJa: "マンション",   labelZhCn: "公寓",     labelEn: "Condominium" },
    { category: "PROPERTY_TYPE", code: "prop-house",      labelJa: "戸建て",       labelZhCn: "独栋住宅", labelEn: "House" },
    { category: "PROPERTY_TYPE", code: "prop-office",     labelJa: "オフィス",     labelZhCn: "办公室",   labelEn: "Office" },
    { category: "PROPERTY_TYPE", code: "prop-commercial", labelJa: "商業施設",     labelZhCn: "商业设施", labelEn: "Commercial" },
    { category: "PROPERTY_TYPE", code: "prop-resort",     labelJa: "リゾート",     labelZhCn: "度假",     labelEn: "Resort" },
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

  // ── Clients ──────────────────────────────────────────────────
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

  const tokyoClient = await prisma.client.upsert({
    where: { id: "client-tokyo" },
    update: {},
    create: {
      id: "client-tokyo",
      organizationId: clientOrg2.id,
      name: "東京不動産株式会社",
      nameEn: "Tokyo Real Estate Co.",
    },
  });

  // ── Projects ─────────────────────────────────────────────────
  const projectTower = await prisma.project.upsert({
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

  const projectGarden = await prisma.project.upsert({
    where: { code: "PRJ-DEMO02" },
    update: {},
    create: {
      code: "PRJ-DEMO02",
      clientId: demoClient.id,
      name: "デモマンション ガーデン棟",
      propertyName: "デモマンション ガーデン棟",
      propertyType: "prop-condo",
      countryCode: "JP",
      prefectureCode: "tokyo",
      municipalityCode: "shinjuku",
      defaultVisibility: "INTERNAL",
      defaultUsagePolicyId: "policy-standard",
      status: "ACTIVE",
    },
  });

  const projectTokyo = await prisma.project.upsert({
    where: { code: "PRJ-TKY01" },
    update: {},
    create: {
      code: "PRJ-TKY01",
      clientId: tokyoClient.id,
      name: "東京タワービュー レジデンス",
      propertyName: "東京タワービュー レジデンス",
      propertyType: "prop-condo",
      countryCode: "JP",
      prefectureCode: "tokyo",
      municipalityCode: "minato",
      defaultVisibility: "INTERNAL",
      defaultUsagePolicyId: "policy-standard",
      status: "ACTIVE",
    },
  });

  // ── Locations ────────────────────────────────────────────────
  const locDemoSite = await prisma.location.upsert({
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

  const locNahaStation = await prisma.location.upsert({
    where: { id: "loc-naha-station" },
    update: {},
    create: {
      id: "loc-naha-station",
      name: "那覇市内 周辺エリア",
      locationType: "STATION",
      countryCode: "JP",
      prefectureCode: "okinawa",
      municipalityCode: "naha",
    },
  });

  const locTokyoSite = await prisma.location.upsert({
    where: { id: "loc-tokyo-site" },
    update: {},
    create: {
      id: "loc-tokyo-site",
      name: "港区 物件地",
      locationType: "PROPERTY",
      countryCode: "JP",
      prefectureCode: "tokyo",
      municipalityCode: "minato",
      address: "東京都港区デモ5-6-7",
      latitude: 35.6586,
      longitude: 139.7454,
    },
  });

  // ── Shoots ───────────────────────────────────────────────────
  const shootExterior = await prisma.shoot.upsert({
    where: { id: "shoot-demo-001" },
    update: {},
    create: {
      id: "shoot-demo-001",
      projectId: projectTower.id,
      name: "外観・眺望撮影",
      shootDate: new Date("2025-10-15"),
      teamOrgId: shootOrg.id,
      managerUserId: pmUser.id,
      status: "COMPLETED",
    },
  });

  const shootDrone = await prisma.shoot.upsert({
    where: { id: "shoot-demo-002" },
    update: {},
    create: {
      id: "shoot-demo-002",
      projectId: projectTower.id,
      name: "ドローン空撮",
      shootDate: new Date("2025-10-20"),
      teamOrgId: shootOrg.id,
      managerUserId: pmUser.id,
      status: "COMPLETED",
    },
  });

  const shootInterior = await prisma.shoot.upsert({
    where: { id: "shoot-demo-003" },
    update: {},
    create: {
      id: "shoot-demo-003",
      projectId: projectGarden.id,
      name: "内観撮影",
      shootDate: new Date("2025-11-05"),
      teamOrgId: shootOrg.id,
      managerUserId: pmUser.id,
      status: "IN_PROGRESS",
    },
  });

  const shootTokyo = await prisma.shoot.upsert({
    where: { id: "shoot-tky-001" },
    update: {},
    create: {
      id: "shoot-tky-001",
      projectId: projectTokyo.id,
      name: "外観・周辺環境撮影",
      shootDate: new Date("2025-12-01"),
      teamOrgId: shootOrg.id,
      managerUserId: pmUser.id,
      status: "PLANNED",
    },
  });

  // ── ShootLocations ───────────────────────────────────────────
  await prisma.shootLocation.upsert({
    where: { shootId_locationId: { shootId: shootExterior.id, locationId: locDemoSite.id } },
    update: {},
    create: { shootId: shootExterior.id, locationId: locDemoSite.id, plannedCategory: "cat-exterior" },
  });
  await prisma.shootLocation.upsert({
    where: { shootId_locationId: { shootId: shootExterior.id, locationId: locNahaStation.id } },
    update: {},
    create: { shootId: shootExterior.id, locationId: locNahaStation.id, plannedCategory: "cat-street", displayOrder: 1 },
  });
  await prisma.shootLocation.upsert({
    where: { shootId_locationId: { shootId: shootDrone.id, locationId: locDemoSite.id } },
    update: {},
    create: { shootId: shootDrone.id, locationId: locDemoSite.id, plannedCategory: "cat-view" },
  });
  await prisma.shootLocation.upsert({
    where: { shootId_locationId: { shootId: shootTokyo.id, locationId: locTokyoSite.id } },
    update: {},
    create: { shootId: shootTokyo.id, locationId: locTokyoSite.id, plannedCategory: "cat-exterior" },
  });

  // ── Demo Assets ──────────────────────────────────────────────
  // Fetch tag IDs for asset tagging
  const tagExterior = await prisma.masterTag.findUnique({ where: { code: "cat-exterior" } });
  const tagDrone    = await prisma.masterTag.findUnique({ where: { code: "method-drone" } });
  const tagView     = await prisma.masterTag.findUnique({ where: { code: "cat-view" } });
  const tagInterior = await prisma.masterTag.findUnique({ where: { code: "cat-interior" } });

  const assetDefs = [
    // Shoot 1 — Exterior (APPROVED)
    {
      id: "asset-demo-001", assetCode: "HV-2025-001", shootId: shootExterior.id,
      projectId: projectTower.id, clientId: demoClient.id,
      assetType: "IMAGE" as const, productionStatus: "FINAL_DELIVERY" as const,
      title: "タワー棟 北側外観",
      reviewStatus: "APPROVED" as const, rightsStatus: "VALID" as const,
      primarySeason: "AUTUMN" as const, primaryTimeOfDay: "MORNING" as const,
      weather: "SUNNY" as const, visibility: "CLIENT_ONLY" as const,
      tags: [tagExterior?.id].filter(Boolean) as string[],
    },
    {
      id: "asset-demo-002", assetCode: "HV-2025-002", shootId: shootExterior.id,
      projectId: projectTower.id, clientId: demoClient.id,
      assetType: "IMAGE" as const, productionStatus: "FINAL_DELIVERY" as const,
      title: "タワー棟 エントランス",
      reviewStatus: "APPROVED" as const, rightsStatus: "VALID" as const,
      primarySeason: "AUTUMN" as const, primaryTimeOfDay: "AFTERNOON" as const,
      weather: "SUNNY" as const, visibility: "CLIENT_ONLY" as const,
      tags: [tagExterior?.id].filter(Boolean) as string[],
    },
    // Shoot 2 — Drone (PENDING / IN_REVIEW)
    {
      id: "asset-demo-003", assetCode: "HV-2025-003", shootId: shootDrone.id,
      projectId: projectTower.id, clientId: demoClient.id,
      assetType: "DRONE_VIDEO" as const, productionStatus: "EDITING" as const,
      title: "空撮動画 南東方向",
      reviewStatus: "IN_REVIEW" as const, rightsStatus: "PENDING" as const,
      primarySeason: "AUTUMN" as const, primaryTimeOfDay: "MIDDAY" as const,
      weather: "SUNNY" as const, visibility: "INTERNAL" as const,
      tags: [tagDrone?.id, tagView?.id].filter(Boolean) as string[],
    },
    {
      id: "asset-demo-004", assetCode: "HV-2025-004", shootId: shootDrone.id,
      projectId: projectTower.id, clientId: demoClient.id,
      assetType: "DRONE_IMAGE" as const, productionStatus: "SELECTED_ORIGINAL" as const,
      title: "空撮静止画 真上",
      reviewStatus: "PENDING" as const, rightsStatus: "PENDING" as const,
      primarySeason: "AUTUMN" as const, primaryTimeOfDay: "MIDDAY" as const,
      weather: "CLOUDY" as const, visibility: "INTERNAL" as const,
      tags: [tagDrone?.id].filter(Boolean) as string[],
    },
    // NEEDS_INFO status — for testing filter
    {
      id: "asset-demo-005", assetCode: "HV-2025-005", shootId: shootDrone.id,
      projectId: projectTower.id, clientId: demoClient.id,
      assetType: "DRONE_IMAGE" as const, productionStatus: "ORIGINAL" as const,
      title: "空撮 夕景（追加情報要確認）",
      reviewStatus: "NEEDS_INFO" as const, rightsStatus: "PENDING" as const,
      primarySeason: "AUTUMN" as const, primaryTimeOfDay: "DUSK" as const,
      weather: "SUNNY" as const, visibility: "INTERNAL" as const,
      tags: [tagDrone?.id, tagView?.id].filter(Boolean) as string[],
    },
    // Shoot 3 — Interior (REJECTED)
    {
      id: "asset-demo-006", assetCode: "HV-2025-006", shootId: shootInterior.id,
      projectId: projectGarden.id, clientId: demoClient.id,
      assetType: "IMAGE" as const, productionStatus: "CLIENT_REVIEW" as const,
      title: "リビング 南向き",
      reviewStatus: "REJECTED" as const, rightsStatus: "PENDING" as const,
      primarySeason: "WINTER" as const, primaryTimeOfDay: "AFTERNOON" as const,
      weather: "SUNNY" as const, visibility: "INTERNAL" as const,
      tags: [tagInterior?.id].filter(Boolean) as string[],
    },
    {
      id: "asset-demo-007", assetCode: "HV-2025-007", shootId: shootInterior.id,
      projectId: projectGarden.id, clientId: demoClient.id,
      assetType: "IMAGE" as const, productionStatus: "ORIGINAL" as const,
      title: "キッチン 全景",
      reviewStatus: "PENDING" as const, rightsStatus: "PENDING" as const,
      primarySeason: "WINTER" as const, primaryTimeOfDay: "AFTERNOON" as const,
      weather: "CLOUDY" as const, visibility: "INTERNAL" as const,
      tags: [tagInterior?.id].filter(Boolean) as string[],
    },
    // Video asset
    {
      id: "asset-demo-008", assetCode: "HV-2025-008", shootId: shootExterior.id,
      projectId: projectTower.id, clientId: demoClient.id,
      assetType: "VIDEO" as const, productionStatus: "WEB_DELIVERY" as const,
      title: "プロモーション動画 30秒",
      reviewStatus: "APPROVED" as const, rightsStatus: "VALID" as const,
      primarySeason: "AUTUMN" as const, primaryTimeOfDay: "MORNING" as const,
      weather: "SUNNY" as const, visibility: "PUBLIC" as const,
      tags: [tagExterior?.id].filter(Boolean) as string[],
    },
  ];

  for (const a of assetDefs) {
    const { tags, ...assetFields } = a;
    await prisma.asset.upsert({
      where: { id: a.id },
      update: {},
      create: assetFields,
    });

    // Upsert approved tags
    for (const tagId of tags) {
      await prisma.assetTag.upsert({
        where: { assetId_tagId: { assetId: a.id, tagId } },
        update: {},
        create: {
          assetId: a.id,
          tagId,
          source: "MANUAL",
          status: "APPROVED",
        },
      });
    }
  }

  // ── Demo Delivery Package ─────────────────────────────────────
  const deliveryPkg = await prisma.deliveryPackage.upsert({
    where: { id: "pkg-demo-001" },
    update: {},
    create: {
      id: "pkg-demo-001",
      clientId: demoClient.id,
      projectId: projectTower.id,
      title: "タワー棟 承認済み素材セット",
      status: "DRAFT",
      createdBy: pmUser.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  for (const [i, assetId] of ["asset-demo-001", "asset-demo-002", "asset-demo-008"].entries()) {
    await prisma.deliveryPackageAsset.upsert({
      where: { deliveryPackageId_assetId: { deliveryPackageId: deliveryPkg.id, assetId } },
      update: {},
      create: {
        deliveryPackageId: deliveryPkg.id,
        assetId,
        allowPreview: true,
        allowDownload: true,
        downloadVariant: "CLIENT_DELIVERY",
        displayOrder: i,
      },
    });
  }

  // ── Audit Log samples ─────────────────────────────────────────
  const auditSamples = [
    { userId: pmUser.id, organizationId: hvOrg.id, entityType: "Project", entityId: projectTower.id, action: "PROJECT_CREATED" },
    { userId: uploaderUser.id, organizationId: shootOrg.id, entityType: "Asset", entityId: "asset-demo-001", action: "ASSET_UPLOADED" },
    { userId: assetAdminUser.id, organizationId: hvOrg.id, entityType: "Asset", entityId: "asset-demo-001", action: "ASSET_APPROVED" },
    { userId: assetAdminUser.id, organizationId: hvOrg.id, entityType: "Asset", entityId: "asset-demo-006", action: "ASSET_REJECTED" },
    { userId: pmUser.id, organizationId: hvOrg.id, entityType: "DeliveryPackage", entityId: deliveryPkg.id, action: "DELIVERY_CREATED" },
  ];

  for (const log of auditSamples) {
    // Skip if any audit log for this entity+action exists (idempotent-ish)
    const exists = await prisma.auditLog.findFirst({
      where: { entityId: log.entityId, action: log.action },
    });
    if (!exists) {
      await prisma.auditLog.create({ data: log });
    }
  }

  console.log("✓ Seed completed");
  console.log("\nTest accounts (Password: Password1!):");
  console.log("  admin@homevista.jp          SUPER_ADMIN     — 全データアクセス可");
  console.log("  pm@homevista.jp             PROJECT_MANAGER — プロジェクト・撮影管理");
  console.log("  assetadmin@homevista.jp     ASSET_ADMIN     — 素材承認・管理");
  console.log("  sales@homevista.jp          SALES           — 閲覧・納品確認");
  console.log("  uploader@shootteam.cn       UPLOADER        — アップロード専用");
  console.log("  client@developer.co.jp      CLIENT_ADMIN    — クライアント管理者");
  console.log("  user@developer.co.jp        CLIENT_USER     — クライアント閲覧者");
  console.log("\nDemo data:");
  console.log("  Organizations: 4 (HOMEVISTA / 撮影チームCN / デモデベロッパー / 東京不動産)");
  console.log("  Projects: 3 (タワー棟・ガーデン棟・東京)");
  console.log("  Shoots:   4 (外観・ドローン・内観・東京)");
  console.log("  Assets:   8 (APPROVED×3 / IN_REVIEW×1 / PENDING×2 / NEEDS_INFO×1 / REJECTED×1)");
  console.log("  Delivery: 1 package (3 assets)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
