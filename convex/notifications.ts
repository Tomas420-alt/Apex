"use node";

import { internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Country code mapping for E.164 phone number formatting
const COUNTRY_DIAL_CODES: Record<string, string> = {
  "United States": "+1",
  "Canada": "+1",
  "United Kingdom": "+44",
  "Ireland": "+353",
  "Australia": "+61",
  "Germany": "+49",
  "France": "+33",
  "Italy": "+39",
  "Spain": "+34",
  "Netherlands": "+31",
  "Belgium": "+32",
  "Japan": "+81",
  "India": "+91",
  "Brazil": "+55",
  "South Africa": "+27",
  "New Zealand": "+64",
  "Portugal": "+351",
  "Sweden": "+46",
  "Norway": "+47",
  "Denmark": "+45",
  "Finland": "+358",
  "Austria": "+43",
  "Switzerland": "+41",
  "Poland": "+48",
  "Mexico": "+52",
  "Argentina": "+54",
  "Thailand": "+66",
  "Philippines": "+63",
  "Indonesia": "+62",
  "Malaysia": "+60",
};

// Convert a local phone number to E.164 format using the user's country
function toE164(phone: string, country?: string): string {
  // Already in E.164 format
  if (phone.startsWith("+")) return phone.replace(/[^\d+]/g, "");

  const digits = phone.replace(/\D/g, "");
  if (!country) return `+${digits}`;

  const dialCode = COUNTRY_DIAL_CODES[country];
  if (!dialCode) return `+${digits}`;

  // Strip leading zero (common in local formats like 089... → 89...)
  const localNumber = digits.startsWith("0") ? digits.slice(1) : digits;
  return `${dialCode}${localNumber}`;
}

// Send an SMS via the Twilio REST API
export const sendSMS = internalAction({
  args: {
    to: v.string(),
    body: v.string(),
  },
  handler: async (_ctx, args) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error(
        "Missing Twilio environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER"
      );
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = btoa(`${accountSid}:${authToken}`);

    const bodyParams = new URLSearchParams({
      To: args.to,
      From: fromNumber,
      Body: args.body,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyParams.toString(),
    });

    const data = await response.json() as { sid?: string; status?: string; message?: string; code?: number };

    if (!response.ok) {
      throw new Error(
        `Twilio API error ${response.status}: ${data.message ?? JSON.stringify(data)}`
      );
    }

    return { sid: data.sid as string, status: data.status as string };
  },
});

// Send an email via the Resend API
export const sendEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    text: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error("Missing environment variable: RESEND_API_KEY");
    }

    const payload: Record<string, string | undefined> = {
      from: "ApexTune <onboarding@resend.dev>",
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    };

    // Remove undefined fields so Resend doesn't reject the request
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined)
    );

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cleanPayload),
    });

    const data = await response.json() as { id?: string; message?: string };

    if (!response.ok) {
      throw new Error(
        `Resend API error ${response.status}: ${data.message ?? JSON.stringify(data)}`
      );
    }

    return { id: data.id as string };
  },
});

// High-level reminder dispatcher: routes to the correct channel
export const sendReminder = internalAction({
  args: {
    taskId: v.id("maintenanceTasks"),
    userId: v.string(),
    channel: v.string(),
    taskName: v.string(),
    bikeName: v.string(),
  },
  handler: async (ctx, args) => {
    const { taskId, userId, channel, taskName, bikeName } = args;

    if (channel === "sms") {
      // Fetch user record to get the phone number
      const user = await ctx.runQuery(internal.reminders.getUserByClerkId, { clerkId: userId });

      if (!user || !user.phone) {
        await ctx.runMutation(internal.reminders.updateStatus, {
          taskId,
          userId,
          status: "failed",
        });
        throw new Error(`User ${userId} has no phone number on file for SMS reminder`);
      }

      const smsBody = `Apex Reminder: "${taskName}" is due soon for your ${bikeName}. Time to order parts! Open the app to view details.`;
      const e164Phone = toE164(user.phone, user.country ?? undefined);

      const result = await ctx.runAction(internal.notifications.sendSMS, {
        to: e164Phone,
        body: smsBody,
      });

      await ctx.runMutation(internal.reminders.updateStatus, {
        taskId,
        userId,
        status: "sent",
        messageSid: result.sid,
      });
    } else if (channel === "email") {
      // Fetch user record to get the email address
      const user = await ctx.runQuery(internal.reminders.getUserByClerkId, { clerkId: userId });

      if (!user || !user.email) {
        await ctx.runMutation(internal.reminders.updateStatus, {
          taskId,
          userId,
          status: "failed",
        });
        throw new Error(`User ${userId} has no email address on file for email reminder`);
      }

      const subject = `Apex: "${taskName}" is due in 1 week — order parts now`;
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0D0D12; color: #FFFFFF; padding: 32px; border-radius: 16px;">
          <h2 style="color: #00E599; margin-bottom: 16px;">Maintenance Reminder</h2>
          <p>Hi there,</p>
          <p>
            Your maintenance task <strong>${taskName}</strong> is due in about 1 week for your
            <strong>${bikeName}</strong>.
          </p>
          <p style="color: #00E599; font-weight: 600;">Now is the perfect time to order parts so they arrive before the job is due.</p>
          <p>Open Apex to view the parts list and get started.</p>
          <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;" />
          <p style="color: #8E8EA0; font-size: 12px;">
            You are receiving this email because you enabled email reminders in Apex.
          </p>
        </div>
      `;
      const text = `Apex Reminder: "${taskName}" is due in about 1 week for your ${bikeName}. Time to order parts! Open the app to view the parts list.`;

      const result = await ctx.runAction(internal.notifications.sendEmail, {
        to: user.email,
        subject,
        html,
        text,
      });

      await ctx.runMutation(internal.reminders.updateStatus, {
        taskId,
        userId,
        status: "sent",
        emailId: result.id,
      });
    } else if (channel === "push") {
      // Push notification placeholder — integrate with Expo Push Notifications when ready
      console.log(
        `[sendReminder] Push notification placeholder for task "${taskName}" (bike: ${bikeName}, user: ${userId})`
      );

      await ctx.runMutation(internal.reminders.updateStatus, {
        taskId,
        userId,
        status: "sent",
      });
    } else {
      throw new Error(`Unknown notification channel: ${channel}`);
    }
  },
});

// Public action: send a test notification to the authenticated user
export const sendTest = action({
  args: {
    channel: v.union(v.literal("sms"), v.literal("email")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(internal.reminders.getUserByClerkId, {
      clerkId: identity.subject,
    });

    if (!user) throw new Error("User not found");

    if (args.channel === "sms") {
      if (!user.phone) throw new Error("No phone number on file");
      const e164Phone = toE164(user.phone, user.country ?? undefined);
      await ctx.runAction(internal.notifications.sendSMS, {
        to: e164Phone,
        body: "Apex test: SMS notifications are working! You'll get reminders when maintenance is due.",
      });
      return { success: true, channel: "sms" };
    } else {
      if (!user.email) throw new Error("No email address on file");
      await ctx.runAction(internal.notifications.sendEmail, {
        to: user.email,
        subject: "Apex: Test Notification",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1F2937;">Test Notification</h2>
            <p>Email notifications are working! You'll get reminders when maintenance is due for your bikes.</p>
            <p style="color: #9CA3AF; font-size: 12px;">This is a test email from Apex.</p>
          </div>
        `,
        text: "Apex test: Email notifications are working! You'll get reminders when maintenance is due.",
      });
      return { success: true, channel: "email" };
    }
  },
});
