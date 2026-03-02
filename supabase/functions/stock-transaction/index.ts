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

    const { data: product, error: productError } = await supabaseClient
      .from("products")
      .select("*")
      .eq("product_id", product_id)
      .single();

    if (productError || !product) {
      throw new Error("Product not found");
    }

    const actualQuantity = type === "OUT" ? -Math.abs(quantity) : Math.abs(quantity);
    const newStock = product.current_stock + actualQuantity;

    const { error: updateError } = await supabaseClient
      .from("products")
      .update({
        current_stock: newStock,
        version: product.version + 1,
      })
      .eq("product_id", product_id)
      .eq("version", product.version);

    if (updateError) {
      throw new Error("Failed to update stock (concurrent modification)");
    }

    const { error: transactionError } = await supabaseClient
      .from("transactions")
      .insert({
        product_id,
        user_id: user.id,
        type,
        quantity: actualQuantity,
        reference_number: reference_number || null,
        reason_code: reason_code || null,
      });

    if (transactionError) {
      await supabaseClient
        .from("products")
        .update({
          current_stock: product.current_stock,
          version: product.version,
        })
        .eq("product_id", product_id);

      throw new Error("Failed to create transaction");
    }

    await supabaseClient.from("activity_log").insert({
      user_id: user.id,
      action: `STOCK_${type}`,
      payload: {
        product_id,
        sku: product.sku,
        old_stock: product.current_stock,
        new_stock: newStock,
        quantity: actualQuantity,
        reference_number,
        reason_code,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          old_stock: product.current_stock,
          new_stock: newStock,
          quantity: actualQuantity,
        },
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
