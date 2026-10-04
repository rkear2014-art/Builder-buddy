export function invoiceMessage(input: { customerName: string; businessName: string; url: string }): string {
  const customer = input.customerName.trim() || "there";
  return `Hello ${customer},\n\nHere is your invoice from ${input.businessName}:\n${input.url}\n\nThe bank details are on the invoice if you are paying by transfer.`;
}

export function reviewMessage(input: { customerName: string; businessName: string; url: string }): string {
  const customer = input.customerName.trim() || "there";
  return `Hello ${customer},\n\nThank you for choosing ${input.businessName}. If you were happy with the work, a short review would mean a lot:\n${input.url}`;
}

export function quoteMessage(input: { customerName: string; businessName: string; url: string }): string {
  const customer = input.customerName.trim() || "there";
  return `Hello ${customer},\n\nHere is your quotation from ${input.businessName}:\n${input.url}\n\nPlease read it, and sign on that page if you would like us to go ahead.`;
}

/** UK numbers become country code digits for wa.me. Anything else is left blank. */
export function whatsAppDigits(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `44${digits.slice(1)}`;
  if (digits.length < 10 || digits.length > 15) return "";
  return digits;
}

export function whatsAppHref(phone: string, message: string): string {
  const digits = whatsAppDigits(phone);
  const text = encodeURIComponent(message);
  return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function smsHref(phone: string, message: string): string {
  const digits = whatsAppDigits(phone);
  const body = encodeURIComponent(message);
  return digits ? `sms:+${digits}?body=${body}` : `sms:?body=${body}`;
}

export function mailtoHref(email: string, subject: string, message: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}
