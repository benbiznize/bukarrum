import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import {
  sendUpgradeRequestToAdmin,
  sendUpgradeConfirmationToOwner,
} from "@/lib/email";
import { PLAN_DISPLAY } from "@/utils/plans";

export async function POST(req: NextRequest) {
  try {
    const { businessId, targetPlan } = await req.json();

    if (!businessId || !targetPlan) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!PLAN_DISPLAY[targetPlan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: business } = await supabase
      .from("businesses")
      .select("name, plan_id, owner_id")
      .eq("id", businessId)
      .single();

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 },
      );
    }

    await supabase.from("upgrade_requests").insert({
      business_id: businessId,
      current_plan: business.plan_id,
      target_plan: targetPlan,
      status: "pending",
    });

    const { data: ownerData } = await supabase.auth.admin.getUserById(
      business.owner_id,
    );
    const ownerEmail = ownerData.user?.email;

    if (!ownerEmail) {
      await sendUpgradeRequestToAdmin({
        businessName: business.name,
        ownerEmail: `owner-id:${business.owner_id}`,
        currentPlan: business.plan_id,
        targetPlan,
      });
      return NextResponse.json({ ok: true, ownerNotificationSent: false });
    }

    await Promise.all([
      sendUpgradeRequestToAdmin({
        businessName: business.name,
        ownerEmail,
        currentPlan: business.plan_id,
        targetPlan,
      }),
      sendUpgradeConfirmationToOwner({
        ownerEmail,
        businessName: business.name,
        targetPlan,
      }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
