import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface StockTransactionRequest {
  product_id: string;
  type: "IN" | "OUT" | "ADJUST";
  quantity: number;
  reference_number?: string;
  reason_code?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid user");
    }

    const body: StockTransactionRequest = await req.json();

    const { product_id, type, quantity, reference_number, reason_code } = body;

    if (!product_id || !type || quantity === undefined) {
      throw new Error("Missing required fields");
    }

    // 1. Get user's organization (Enforce multi-tenant boundary)
    const { data: userRole, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (roleError || !userRole) {
      throw new Error("User has no assigned organization or access denied");
    }

    // 2. Process stock movement using the atomic RPC function
    // This ensures that the product belongs to the user's organization
    // and that the update is atomic.
    const { data: rpcResult, error: rpcError } = await supabaseClient.rpc(
      "process_stock_movement",
      {
        p_product_id: product_id,
        p_org_id: userRole.organization_id,
        p_user_id: user.id,
        p_type: type,
        p_quantity: type === "OUT" ? -Math.abs(quantity) : Math.abs(quantity),
        p_reference_number: reference_number || null,
        p_reason_code: reason_code || "EDGE_FUNCTION",
      }
    );

    if (rpcError) {
      throw new Error(`Stock processing failed: ${rpcError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: rpcResult,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
