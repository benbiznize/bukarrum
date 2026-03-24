import { Resend } from "resend";
import { format } from "date-fns";
import { createServiceClient } from "@/utils/supabase/service";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "placeholder");
}
function getFrom() {
  return process.env.RESEND_FROM_EMAIL ?? "bookings@bukarrum.com";
}

function formatDate(iso: string) {
  return format(new Date(iso), "PPPp");
}

// ─── Templates ──────────────────────────────────────────────────────────────

function confirmationHtml({
  clientName, businessName, resourceName, startTime, endTime, totalPrice,
}: {
  clientName: string; businessName: string; resourceName: string;
  startTime: string; endTime: string; totalPrice: number;
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 20px; }
  .card { background: white; border-radius: 8px; max-width: 480px; margin: 0 auto; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,.07); }
  h1 { color: #6d28d9; margin-top: 0; }
  .detail { margin: 8px 0; font-size: 15px; color: #333; }
  .label { color: #888; font-size: 13px; }
  .total { font-size: 18px; font-weight: bold; margin-top: 16px; color: #6d28d9; }
  .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #aaa; }
</style></head>
<body>
<div class="card">
  <h1>Booking Confirmed!</h1>
  <p>Hi ${clientName}, your booking at <strong>${businessName}</strong> is confirmed.</p>
  <div class="detail"><span class="label">Resource</span><br/>${resourceName}</div>
  <div class="detail"><span class="label">Start</span><br/>${formatDate(startTime)}</div>
  <div class="detail"><span class="label">End</span><br/>${formatDate(endTime)}</div>
  <div class="total">Total: $${Number(totalPrice).toLocaleString()} CLP</div>
  <p style="margin-top:16px;font-size:14px;color:#555;">See you there! If you need to cancel or have questions, reply to this email.</p>
  <div class="footer">Powered by Bukarrum</div>
</div>
</body>
</html>`;
}

function businessConfirmationHtml({
  businessName, resourceName, clientName, clientEmail, startTime, endTime, totalPrice,
}: {
  businessName: string; resourceName: string; clientName: string;
  clientEmail: string; startTime: string; endTime: string; totalPrice: number;
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 20px; }
  .card { background: white; border-radius: 8px; max-width: 480px; margin: 0 auto; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,.07); }
  h1 { color: #6d28d9; margin-top: 0; }
  .detail { margin: 8px 0; font-size: 15px; color: #333; }
  .label { color: #888; font-size: 13px; }
  .total { font-size: 18px; font-weight: bold; margin-top: 16px; color: #6d28d9; }
  .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #aaa; }
</style></head>
<body>
<div class="card">
  <h1>Payment Received!</h1>
  <p>A booking at <strong>${businessName}</strong> has been paid and confirmed.</p>
  <div class="detail"><span class="label">Client</span><br/>${clientName} (${clientEmail})</div>
  <div class="detail"><span class="label">Resource</span><br/>${resourceName}</div>
  <div class="detail"><span class="label">Start</span><br/>${formatDate(startTime)}</div>
  <div class="detail"><span class="label">End</span><br/>${formatDate(endTime)}</div>
  <div class="total">Total received: $${Number(totalPrice).toLocaleString()} CLP</div>
  <p style="margin-top:16px;font-size:14px;color:#555;">Log in to your dashboard to view and manage your bookings.</p>
  <div class="footer">Powered by Bukarrum</div>
</div>
</body>
</html>`;
}

function businessNotificationHtml({
  businessName, resourceName, clientName, clientEmail, startTime, endTime, totalPrice,
}: {
  businessName: string; resourceName: string; clientName: string;
  clientEmail: string; startTime: string; endTime: string; totalPrice: number;
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 20px; }
  .card { background: white; border-radius: 8px; max-width: 480px; margin: 0 auto; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,.07); }
  h1 { color: #6d28d9; margin-top: 0; }
  .detail { margin: 8px 0; font-size: 15px; color: #333; }
  .label { color: #888; font-size: 13px; }
  .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #aaa; }
</style></head>
<body>
<div class="card">
  <h1>New Booking Request</h1>
  <p>You have a new booking request at <strong>${businessName}</strong>.</p>
  <div class="detail"><span class="label">Client</span><br/>${clientName} (${clientEmail})</div>
  <div class="detail"><span class="label">Resource</span><br/>${resourceName}</div>
  <div class="detail"><span class="label">Start</span><br/>${formatDate(startTime)}</div>
  <div class="detail"><span class="label">End</span><br/>${formatDate(endTime)}</div>
  <div class="detail"><span class="label">Total</span><br/>$${Number(totalPrice).toLocaleString()} CLP</div>
  <p style="margin-top:16px;font-size:14px;color:#555;">Log in to your dashboard to confirm or cancel this booking.</p>
  <div class="footer">Powered by Bukarrum</div>
</div>
</body>
</html>`;
}

function pendingHtml({
  clientName, businessName, resourceName, startTime, endTime, totalPrice,
}: {
  clientName: string; businessName: string; resourceName: string;
  startTime: string; endTime: string; totalPrice: number;
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 20px; }
  .card { background: white; border-radius: 8px; max-width: 480px; margin: 0 auto; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,.07); }
  h1 { color: #6d28d9; margin-top: 0; }
  .detail { margin: 8px 0; font-size: 15px; color: #333; }
  .label { color: #888; font-size: 13px; }
  .total { font-size: 18px; font-weight: bold; margin-top: 16px; color: #6d28d9; }
  .notice { background: #fef9c3; border-radius: 6px; padding: 12px 16px; margin-top: 16px; font-size: 13px; color: #854d0e; }
  .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #aaa; }
</style></head>
<body>
<div class="card">
  <h1>Booking Request Received</h1>
  <p>Hi ${clientName}, we received your booking request at <strong>${businessName}</strong>.</p>
  <div class="detail"><span class="label">Resource</span><br/>${resourceName}</div>
  <div class="detail"><span class="label">Start</span><br/>${formatDate(startTime)}</div>
  <div class="detail"><span class="label">End</span><br/>${formatDate(endTime)}</div>
  <div class="total">Total: $${Number(totalPrice).toLocaleString()} CLP</div>
  <div class="notice">⏳ Your booking is pending payment confirmation. Complete your payment to secure the slot.</div>
  <div class="footer">Powered by Bukarrum</div>
</div>
</body>
</html>`;
}

function cancellationHtml({
  clientName, businessName, resourceName, startTime, endTime,
}: {
  clientName: string; businessName: string; resourceName: string;
  startTime: string; endTime: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 20px; }
  .card { background: white; border-radius: 8px; max-width: 480px; margin: 0 auto; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,.07); }
  h1 { color: #dc2626; margin-top: 0; }
  .detail { margin: 8px 0; font-size: 15px; color: #333; }
  .label { color: #888; font-size: 13px; }
  .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #aaa; }
</style></head>
<body>
<div class="card">
  <h1>Booking Cancelled</h1>
  <p>Hi ${clientName}, your booking at <strong>${businessName}</strong> has been cancelled.</p>
  <div class="detail"><span class="label">Resource</span><br/>${resourceName}</div>
  <div class="detail"><span class="label">Was scheduled for</span><br/>${formatDate(startTime)} – ${formatDate(endTime)}</div>
  <p style="margin-top:16px;font-size:14px;color:#555;">If you think this is a mistake, please contact the business directly.</p>
  <div class="footer">Powered by Bukarrum</div>
</div>
</body>
</html>`;
}

// ─── Exported helpers ────────────────────────────────────────────────────────

export async function sendBookingConfirmationToClient(params: {
  clientEmail: string;
  clientName: string;
  businessName: string;
  resourceName: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  businessOwnerId?: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const sends = [
    getResend().emails.send({
      from: getFrom(),
      to: params.clientEmail,
      subject: `Booking confirmed — ${params.businessName}`,
      html: confirmationHtml(params),
    }),
  ];

  if (params.businessOwnerId) {
    const supabase = createServiceClient();
    const { data } = await supabase.auth.admin.getUserById(params.businessOwnerId);
    const ownerEmail = data.user?.email;
    if (ownerEmail) {
      sends.push(
        getResend().emails.send({
          from: getFrom(),
          to: ownerEmail,
          subject: `Payment received — ${params.clientName} booked ${params.resourceName}`,
          html: businessConfirmationHtml({
            businessName: params.businessName,
            resourceName: params.resourceName,
            clientName: params.clientName,
            clientEmail: params.clientEmail,
            startTime: params.startTime,
            endTime: params.endTime,
            totalPrice: params.totalPrice,
          }),
        })
      );
    }
  }

  await Promise.all(sends);
}

export async function sendBookingPendingToClient(params: {
  clientEmail: string;
  clientName: string;
  businessName: string;
  resourceName: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
}) {
  if (!process.env.RESEND_API_KEY) return;
  await getResend().emails.send({
    from: getFrom(),
    to: params.clientEmail,
    subject: `Booking request received — ${params.businessName}`,
    html: pendingHtml(params),
  });
}

export async function sendBookingNotificationToBusiness(params: {
  businessOwnerId: string;
  businessName: string;
  resourceName: string;
  clientName: string;
  clientEmail: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const supabase = createServiceClient();
  const { data } = await supabase.auth.admin.getUserById(params.businessOwnerId);
  const ownerEmail = data.user?.email;
  if (!ownerEmail) return;

  await getResend().emails.send({
    from: getFrom(),
    to: ownerEmail,
    subject: `New booking request — ${params.businessName}`,
    html: businessNotificationHtml(params),
  });
}

export async function sendCancellationEmail(params: {
  clientEmail: string;
  clientName: string;
  businessName: string;
  resourceName: string;
  startTime: string;
  endTime: string;
  businessOwnerId?: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const sends = [
    getResend().emails.send({
      from: getFrom(),
      to: params.clientEmail,
      subject: `Booking cancelled — ${params.businessName}`,
      html: cancellationHtml(params),
    }),
  ];

  if (params.businessOwnerId) {
    const supabase = createServiceClient();
    const { data } = await supabase.auth.admin.getUserById(params.businessOwnerId);
    const ownerEmail = data.user?.email;
    if (ownerEmail) {
      sends.push(
        getResend().emails.send({
          from: getFrom(),
          to: ownerEmail,
          subject: `Booking cancelled — ${params.clientName} at ${params.businessName}`,
          html: cancellationHtml(params),
        })
      );
    }
  }

  await Promise.all(sends);
}
