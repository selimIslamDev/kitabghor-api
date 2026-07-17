import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface OrderConfirmationData {
  toEmail: string;
  customerName: string;
  orderId: string;
  items: { productName: string; quantity: number; price: number }[];
  finalAmount: number;
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    district: string;
  };
}

export const sendOrderConfirmationEmail = async (data: OrderConfirmationData) => {
  try {
    const itemsHtml = data.items
      .map(
        (item) => `
        <tr>
          <td style="padding:8px 0; border-bottom:1px solid #e5e7eb;">${item.productName}</td>
          <td style="padding:8px 0; border-bottom:1px solid #e5e7eb; text-align:center;">x${item.quantity}</td>
          <td style="padding:8px 0; border-bottom:1px solid #e5e7eb; text-align:right;">৳${item.price}</td>
        </tr>`
      )
      .join("");

    await resend.emails.send({
      from: "KitabGhor <onboarding@resend.dev>",
      to: data.toEmail,
      subject: `আপনার অর্ডার নিশ্চিত হয়েছে — #${data.orderId.slice(-8).toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:24px;">
          <div style="background:#2563eb; padding:24px; border-radius:12px 12px 0 0; text-align:center;">
            <h1 style="color:#fff; margin:0; font-size:22px;">KitabGhor 📚</h1>
          </div>
          <div style="background:#f9fafb; padding:24px; border-radius:0 0 12px 12px;">
            <h2 style="color:#111827; font-size:18px;">ধন্যবাদ, ${data.customerName}!</h2>
            <p style="color:#4b5563; font-size:14px;">
              আপনার payment সফলভাবে সম্পন্ন হয়েছে এবং অর্ডার কনফার্ম করা হয়েছে।
            </p>

            <div style="background:#fff; border-radius:8px; padding:16px; margin:16px 0;">
              <p style="margin:0 0 8px; font-size:13px; color:#6b7280;">অর্ডার আইডি</p>
              <p style="margin:0; font-weight:bold; color:#2563eb;">#${data.orderId.slice(-8).toUpperCase()}</p>
            </div>

            <table style="width:100%; border-collapse:collapse; margin:16px 0;">
              <thead>
                <tr>
                  <th style="text-align:left; padding-bottom:8px; border-bottom:2px solid #e5e7eb; font-size:13px; color:#6b7280;">পণ্য</th>
                  <th style="text-align:center; padding-bottom:8px; border-bottom:2px solid #e5e7eb; font-size:13px; color:#6b7280;">পরিমাণ</th>
                  <th style="text-align:right; padding-bottom:8px; border-bottom:2px solid #e5e7eb; font-size:13px; color:#6b7280;">মূল্য</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>

            <div style="text-align:right; margin:16px 0; font-size:16px; font-weight:bold; color:#111827;">
              মোট: ৳${data.finalAmount}
            </div>

            <div style="background:#fff; border-radius:8px; padding:16px; margin:16px 0;">
              <p style="margin:0 0 8px; font-size:13px; color:#6b7280;">ডেলিভারি ঠিকানা</p>
              <p style="margin:0; font-size:14px; color:#111827;">${data.shippingAddress.fullName}</p>
              <p style="margin:0; font-size:14px; color:#4b5563;">${data.shippingAddress.phone}</p>
              <p style="margin:0; font-size:14px; color:#4b5563;">
                ${data.shippingAddress.address}, ${data.shippingAddress.city}, ${data.shippingAddress.district}
              </p>
            </div>

            <p style="color:#9ca3af; font-size:12px; text-align:center; margin-top:24px;">
              KitabGhor থেকে কেনাকাটার জন্য ধন্যবাদ 💙
            </p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error("Order confirmation email send error:", error);
  }
};