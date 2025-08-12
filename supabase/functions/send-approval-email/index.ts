import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ApprovalEmailRequest {
  email: string;
  name: string;
  status: 'approved' | 'rejected';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, status }: ApprovalEmailRequest = await req.json();

    const subject = status === 'approved' 
      ? "Account Approved - Welcome!" 
      : "Account Registration Update";

    const html = status === 'approved'
      ? `
        <h1>Welcome ${name}!</h1>
        <p>Your account has been approved and you can now access the Collection Management System.</p>
        <p>You can log in at: ${Deno.env.get("SITE_URL") || "your-app-url"}</p>
        <p>Best regards,<br>The Collection Management Team</p>
      `
      : `
        <h1>Account Registration Update</h1>
        <p>Dear ${name},</p>
        <p>Thank you for your interest. Unfortunately, your account registration was not approved at this time.</p>
        <p>If you have questions, please contact our support team.</p>
        <p>Best regards,<br>The Collection Management Team</p>
      `;

    const emailResponse = await resend.emails.send({
      from: "Collection Management <onboarding@resend.dev>",
      to: [email],
      subject,
      html,
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending approval email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);