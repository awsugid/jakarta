interface Env {
  BILLIONMAIL_API_URL: string;
  BILLIONMAIL_API_KEY: string;
  BILLIONMAIL_SPEAKERS_GROUP_ID: string;
  BILLIONMAIL_VOLUNTEERS_GROUP_ID: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const BILLIONMAIL_API_URL =
    env.BILLIONMAIL_API_URL || "https://mail.awscommunity.id";
  const BILLIONMAIL_API_KEY = env.BILLIONMAIL_API_KEY?.trim();

  // Group IDs from BillionMail dashboard
  // Volunteer: ID 1 | Speaker: ID 2
  const GROUP_IDS: Record<string, number> = {
    speakers: parseInt(env.BILLIONMAIL_SPEAKERS_GROUP_ID || "2", 10),
    volunteers: parseInt(env.BILLIONMAIL_VOLUNTEERS_GROUP_ID || "1", 10),
  };

  if (!BILLIONMAIL_API_KEY) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "BillionMail API key not configured",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await request.json();
    const { email, type } = body as { email: string; type: string };

    if (!email || !type) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email and type are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const normalizedType = type.toLowerCase();
    const groupId = GROUP_IDS[normalizedType];

    if (!groupId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid subscription type: ${type}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    console.log("[subscribe] Request:", { email, type: normalizedType, groupId });
    console.log(
      "[subscribe] Auth token prefix:",
      BILLIONMAIL_API_KEY?.substring(0, 30),
      "| length:",
      BILLIONMAIL_API_KEY?.length,
    );

    const response = await fetch(
      `${BILLIONMAIL_API_URL}/api/contact/group/import`,
      {
        method: "POST",
        headers: {
          authorization: BILLIONMAIL_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          group_ids: [groupId],
          contacts: email,
          import_type: 2,
          default_active: 1,
          status: 1,
        }),
      },
    );

    const data = await response.json() as { success: boolean; msg?: string };
    console.log("[subscribe] BillionMail response:", response.status, data);

    if (data.success) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: data.msg || "Failed to subscribe",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[subscribe] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
