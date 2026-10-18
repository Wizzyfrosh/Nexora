export function verificationEmail(code: string) {
  if (!/^[0-9]{6}$/.test(code)) throw new Error('Invalid verification code');
  return {
    subject: 'Your Nexora verification code',
    text: `Welcome to Nexora\n\nYour verification code: ${code}\n\nEnter this code on the Nexora verification screen while signed in. It expires 10 minutes after it was requested. Only the latest code works.\n\nNever share this code. Nexora will never ask for it by phone or chat. If you did not request this, ignore this email.`,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verify your Nexora email</title></head>
<body style="margin:0;background:#f6f3fb;font-family:Arial,Helvetica,sans-serif;color:#241b36">
<div style="display:none;max-height:0;overflow:hidden">Your six-digit code is ready. Complete your Nexora account verification.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e9e1f3;border-radius:24px;overflow:hidden">
<tr><td style="padding:30px 32px;background:#5425a3;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-1px">nexora<span style="color:#f6c45c">.</span></td></tr>
<tr><td style="padding:36px 32px 16px"><p style="margin:0 0 12px;color:#7445b7;font-size:11px;font-weight:700;letter-spacing:2px">ONE SMALL STEP. YOUR NEXT CHAPTER.</p>
<h1 style="margin:0 0 16px;font-size:28px;line-height:1.25">Make it officially yours.</h1><p style="margin:0;color:#665d75;font-size:16px;line-height:1.7">Confirm your email address to continue building your business with Nexora. Enter the code below on your verification screen.</p></td></tr>
<tr><td style="padding:12px 32px 24px"><div style="padding:25px 12px;background:#f3edfc;border:1px solid #e2d5f5;border-radius:16px;text-align:center"><p style="margin:0 0 12px;font-size:11px;letter-spacing:2px;color:#6e548c">YOUR VERIFICATION CODE</p><p style="margin:0;font-family:Consolas,monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#5425a3">${code}</p></div>
<p style="text-align:center;color:#766a86;font-size:13px;line-height:1.6">Expires 10 minutes after your request.<br>Requested another code? Use the newest one.</p></td></tr>
<tr><td style="padding:0 32px 32px"><p style="margin:0;padding-top:20px;border-top:1px solid #eee8f5;font-size:13px;line-height:1.7;color:#766a86">Keep this code private. Nexora will never ask for it by phone or chat. If you didn’t request this email, you can safely ignore it.</p></td></tr></table>
<p style="margin:24px 0 0;color:#8a8097;font-size:12px">Nexora · A little website. A bigger business.</p></td></tr></table></body></html>`,
  };
}
