const nodemailer = require('nodemailer')
const { EMAIL_T } = require('./emailTranslations')

// ══════════════════════════════════════════════
//  TRANSPORT EMAIL
// ══════════════════════════════════════════════
const createTransport = () => {
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  return nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
    port: parseInt(process.env.MAILTRAP_PORT || '2525'),
    auth: {
      user: process.env.MAILTRAP_USER || 'votre_user_mailtrap',
      pass: process.env.MAILTRAP_PASS || 'votre_pass_mailtrap',
    },
  })
}

const transporter = createTransport()

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const APP_NAME   = 'Covoitgo'
const SENDER     = `${APP_NAME} <noreply@covoitgo.cm>`

// Compatibilité ancienne variable
const FROM_EMAIL = SENDER

// ── Template HTML de base (bilingue) ─────────────────────────
const wrapHtml = (content, lang = 'en') => {
  const e = EMAIL_T[lang] || EMAIL_T['en']
  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f3f0ea;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f0ea;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#1A9E8A,#22C6AD);padding:32px 40px;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">🚗</div>
            <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">${APP_NAME}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #f0ede8;text-align:center;">
            <p style="color:#a09890;font-size:12px;margin:0 0 6px;">
              ${e.footer_unsubscribe}
            </p>
            <p style="color:#a09890;font-size:12px;margin:0;">${e.footer_team}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Helper bouton ─────────────────────────────────────────────
const btn = (url, label, color = '#1A9E8A') =>
  `<div style="text-align:center;margin:28px 0;">
    <a href="${url}" style="background:${color};color:#fff;padding:14px 32px;border-radius:25px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">${label}</a>
  </div>`

// ── Bloc info trajet ──────────────────────────────────────────
const tripBlock = (from, to, departureAt, e) => {
  const date = new Date(departureAt).toLocaleDateString(e === EMAIL_T.fr ? 'fr-FR' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const time = new Date(departureAt).toLocaleTimeString(e === EMAIL_T.fr ? 'fr-FR' : 'en-GB', {
    hour: '2-digit', minute: '2-digit',
  })
  return `
    <div style="background:#f7f5f2;border-radius:12px;padding:18px 20px;margin:20px 0;text-align:center;">
      <div style="font-size:20px;font-weight:800;color:#1c1917;margin-bottom:6px;">${from} → ${to}</div>
      <div style="color:#6b635c;font-size:14px;">${date} · ${time}</div>
    </div>`
}

// ══════════════════════════════════════════════
//  1. EMAIL DE VÉRIFICATION
// ══════════════════════════════════════════════
const sendVerificationEmail = async ({ email, firstName, token, lang = 'en' }) => {
  const e = EMAIL_T[lang] || EMAIL_T['en']
  const verifyUrl = `${CLIENT_URL}/verify-email?token=${token}`

  const html = wrapHtml(`
    <h2 style="color:#1c1917;font-size:22px;font-weight:800;margin:0 0 12px;">
      ${e.greeting(firstName)} 👋
    </h2>
    <p style="color:#6b635c;font-size:15px;line-height:1.7;margin:0 0 28px;">
      ${e.verify_body}
    </p>
    ${btn(verifyUrl, e.verify_btn)}
    <p style="color:#a09890;font-size:12px;text-align:center;margin-top:16px;">
      ${e.verify_expiry}<br>${e.verify_ignore}
    </p>
  `, lang)

  await transporter.sendMail({ from: SENDER, to: email, subject: e.verify_subject, html })
  console.log(`📧  Vérification → ${email} [${lang}]`)
}

// ══════════════════════════════════════════════
//  2. RÉINITIALISATION MOT DE PASSE
// ══════════════════════════════════════════════
const sendPasswordResetEmail = async ({ email, firstName, token, lang = 'en' }) => {
  const e = EMAIL_T[lang] || EMAIL_T['en']
  const resetUrl = `${CLIENT_URL}/reset-password?token=${token}`
  const html = wrapHtml(`
    <h2 style="color:#1c1917;font-size:22px;font-weight:800;margin:0 0 16px;">🔑 ${e.reset_title}</h2>
    <p style="color:#6b635c;font-size:15px;line-height:1.7;margin:0 0 24px;">${e.greeting(firstName)}<br>${e.reset_body}</p>
    ${btn(resetUrl, e.reset_btn, '#FF6B35')}
    <p style="color:#a09890;font-size:12px;text-align:center;">${e.reset_expiry}<br>${e.reset_ignore}</p>
  `, lang)
  await transporter.sendMail({ from: SENDER, to: email, subject: e.reset_subject, html })
  console.log(`📧  Reset pwd → ${email} [${lang}]`)
}

// ══════════════════════════════════════════════
//  3. NOUVELLE RÉSERVATION (conducteur)
// ══════════════════════════════════════════════
const sendBookingRequestEmail = async ({ driverEmail, driverName, passengerName, from, to, departureAt, seats, bookingId, lang = 'en' }) => {
  const e = EMAIL_T[lang] || EMAIL_T['en']
  const link = `${CLIENT_URL}/my-trips`
  const html = wrapHtml(`
    <h2 style="color:#1c1917;font-size:22px;font-weight:800;margin:0 0 16px;">🎫 ${e.booking_req_title}</h2>
    <p style="color:#6b635c;font-size:15px;line-height:1.7;margin:0 0 20px;">
      ${e.greeting(driverName)}<br>${e.booking_req_body(passengerName)} (${e.seats(seats)})
    </p>
    ${tripBlock(from, to, departureAt, e)}
    ${btn(link, e.booking_req_btn)}
  `, lang)
  await transporter.sendMail({ from: SENDER, to: driverEmail, subject: e.booking_req_subject(from, to), html })
  console.log(`📧  Booking request → ${driverEmail} [${lang}]`)
}

// ══════════════════════════════════════════════
//  4. RÉSERVATION CONFIRMÉE (passager)
// ══════════════════════════════════════════════
const sendBookingConfirmedEmail = async ({ passengerEmail, passengerName, driverName, driverPhone, from, to, departureAt, fromAddress, toAddress, lang = 'en' }) => {
  const e = EMAIL_T[lang] || EMAIL_T['en']
  const link = `${CLIENT_URL}/my-trips`
  const html = wrapHtml(`
    <h2 style="color:#1c1917;font-size:22px;font-weight:800;margin:0 0 16px;">✅ ${e.booking_conf_title}</h2>
    <p style="color:#6b635c;font-size:15px;line-height:1.7;margin:0 0 20px;">
      ${e.greeting(passengerName)}<br>${e.booking_conf_body(driverName)}
    </p>
    ${tripBlock(from, to, departureAt, e)}
    <div style="background:#f3f0ea;border-radius:10px;padding:16px 20px;margin:16px 0;font-size:14px;color:#1c1917;">
      ${fromAddress ? `<div><strong>${e.meeting_point} :</strong> ${fromAddress}</div>` : ''}
      ${driverPhone ? `<div style="margin-top:8px;"><strong>${e.driver_phone} :</strong> ${driverPhone}</div>` : ''}
    </div>
    ${btn(link, e.booking_conf_btn)}
  `, lang)
  await transporter.sendMail({ from: SENDER, to: passengerEmail, subject: e.booking_conf_subject(from, to), html })
  console.log(`📧  Booking confirmed → ${passengerEmail} [${lang}]`)
}

// ══════════════════════════════════════════════
//  5. RÉSERVATION ANNULÉE
// ══════════════════════════════════════════════
const sendBookingCancelledEmail = async ({ email, name, from, to, departureAt, cancelledBy, lang = 'en' }) => {
  const e = EMAIL_T[lang] || EMAIL_T['en']
  const body = cancelledBy === 'driver' ? e.booking_cancel_by_driver : e.booking_cancel_by_passenger
  const html = wrapHtml(`
    <h2 style="color:#1c1917;font-size:22px;font-weight:800;margin:0 0 16px;">❌ ${e.booking_cancel_title}</h2>
    <p style="color:#6b635c;font-size:15px;line-height:1.7;margin:0 0 20px;">
      ${e.greeting(name)}<br>${body}
    </p>
    ${tripBlock(from, to, departureAt, e)}
    ${btn(`${CLIENT_URL}/search`, lang === 'fr' ? 'Trouver un autre trajet →' : 'Find another ride →')}
  `, lang)
  await transporter.sendMail({ from: SENDER, to: email, subject: e.booking_cancel_subject(from, to), html })
  console.log(`📧  Booking cancelled → ${email} [${lang}]`)
}

// ══════════════════════════════════════════════
//  6. NOUVEAU MESSAGE
// ══════════════════════════════════════════════
const sendNewMessageEmail = async ({ recipientEmail, recipientName, senderName, messagePreview, from, to, bookingId, lang = 'en' }) => {
  const e = EMAIL_T[lang] || EMAIL_T['en']
  const link = `${CLIENT_URL}/messages?booking=${bookingId}`
  const html = wrapHtml(`
    <h2 style="color:#1c1917;font-size:22px;font-weight:800;margin:0 0 16px;">💬 ${e.message_title}</h2>
    <p style="color:#6b635c;font-size:15px;line-height:1.7;margin:0 0 16px;">
      ${e.greeting(recipientName)}<br>${e.message_body(senderName)}
    </p>
    <div style="background:#f3f0ea;border-left:4px solid #1A9E8A;border-radius:0 10px 10px 0;padding:14px 18px;margin:16px 0;font-style:italic;color:#1c1917;">
      "${messagePreview}"
    </div>
    <div style="color:#a09890;font-size:13px;margin-bottom:20px;">${from} → ${to}</div>
    ${btn(link, e.message_btn)}
  `, lang)
  await transporter.sendMail({ from: SENDER, to: recipientEmail, subject: e.message_subject(senderName, from, to), html })
  console.log(`📧  New message → ${recipientEmail} [${lang}]`)
}

// ══════════════════════════════════════════════
//  7. COMPTE SUSPENDU / RÉACTIVÉ
// ══════════════════════════════════════════════
const sendAccountBlockedEmail = async ({ email, firstName, lang = 'en' }) => {
  const e = EMAIL_T[lang] || EMAIL_T['en']
  const html = wrapHtml(`
    <h2 style="color:#1c1917;font-size:22px;font-weight:800;margin:0 0 16px;">🚫 ${e.blocked_title}</h2>
    <p style="color:#6b635c;font-size:15px;line-height:1.7;margin:0 0 20px;">
      ${e.greeting(firstName)}<br>${e.blocked_body}
    </p>
    ${btn(`${CLIENT_URL}/contact`, e.blocked_contact, '#EF4444')}
  `, lang)
  await transporter.sendMail({ from: SENDER, to: email, subject: e.blocked_subject, html })
  console.log(`📧  Account blocked → ${email} [${lang}]`)
}

const sendAccountReactivatedEmail = async ({ email, firstName, lang = 'en' }) => {
  const e = EMAIL_T[lang] || EMAIL_T['en']
  const msg = lang === 'fr'
    ? `Votre compte a été réactivé. Vous pouvez à nouveau utiliser Covoitgo.`
    : `Your account has been reactivated. You can use Covoitgo again.`
  const html = wrapHtml(`
    <h2 style="color:#1c1917;font-size:22px;font-weight:800;margin:0 0 16px;">✅ ${lang === 'fr' ? 'Compte réactivé' : 'Account reactivated'}</h2>
    <p style="color:#6b635c;font-size:15px;line-height:1.7;margin:0 0 20px;">
      ${e.greeting(firstName)}<br>${msg}
    </p>
    ${btn(`${CLIENT_URL}`, lang === 'fr' ? 'Retour à Covoitgo →' : 'Back to Covoitgo →')}
  `, lang)
  await transporter.sendMail({ from: SENDER, to: email, subject: lang === 'fr' ? 'Votre compte Covoitgo a été réactivé' : 'Your Covoitgo account has been reactivated', html })
  console.log(`📧  Account reactivated → ${email} [${lang}]`)
}

// ══════════════════════════════════════════════
//  8. RAPPEL DE DÉPART
// ══════════════════════════════════════════════
const sendDepartureReminderEmail = async ({ email, name, role, from, to, departAt, minutesLeft, meetPoint, driverPhone, lang = 'en' }) => {
  const e = EMAIL_T[lang] || EMAIL_T['en']
  const link = `${CLIENT_URL}/my-trips`
  const html = wrapHtml(`
    <h2 style="color:#1c1917;font-size:22px;font-weight:800;margin:0 0 16px;">⏰ ${e.reminder_title}</h2>
    <p style="color:#6b635c;font-size:15px;line-height:1.7;margin:0 0 16px;">
      ${e.greeting(name)}<br>${e.reminder_body(minutesLeft)}
    </p>
    ${tripBlock(from, to, departAt, e)}
    ${meetPoint ? `<div style="background:#f3f0ea;border-radius:10px;padding:14px 18px;margin:12px 0;font-size:14px;"><strong>${e.meeting_point} :</strong> ${meetPoint}</div>` : ''}
    ${driverPhone && role !== 'driver' ? `<div style="background:#f3f0ea;border-radius:10px;padding:14px 18px;margin:12px 0;font-size:14px;"><strong>${e.driver_phone} :</strong> ${driverPhone}</div>` : ''}
    ${btn(link, e.reminder_15_btn)}
  `, lang)
  await transporter.sendMail({ from: SENDER, to: email, subject: e.reminder_subject(from, to), html })
  console.log(`📧  Reminder → ${email} [${lang}]`)
}

// ══════════════════════════════════════════════
//  9. DEMANDE D'AVIS
// ══════════════════════════════════════════════
const sendReviewRequestEmail = async ({ email, name, driverName, from, to, bookingId, lang = 'en' }) => {
  const e = EMAIL_T[lang] || EMAIL_T['en']
  const link = `${CLIENT_URL}/profile?review=${bookingId}`
  const html = wrapHtml(`
    <h2 style="color:#1c1917;font-size:22px;font-weight:800;margin:0 0 16px;">⭐ ${e.review_title}</h2>
    <p style="color:#6b635c;font-size:15px;line-height:1.7;margin:0 0 20px;">
      ${e.greeting(name)}<br>${e.review_body(driverName)}
    </p>
    <div style="text-align:center;font-size:36px;margin:16px 0;">⭐⭐⭐⭐⭐</div>
    ${btn(link, e.review_btn)}
  `, lang)
  await transporter.sendMail({ from: SENDER, to: email, subject: e.review_subject(from, to), html })
  console.log(`📧  Review request → ${email} [${lang}]`)
}

// ══════════════════════════════════════════════
//  10. CONFIRMATION MUTUELLE
// ══════════════════════════════════════════════
const sendTripConfirmationRequestEmail = async ({ email, name, role, confirmerName, from, to, bookingId, lang = 'en' }) => {
  const e = EMAIL_T[lang] || EMAIL_T['en']
  const link = `${CLIENT_URL}/my-trips`
  const html = wrapHtml(`
    <h2 style="color:#1c1917;font-size:22px;font-weight:800;margin:0 0 16px;">🤝 ${e.confirm_title}</h2>
    <p style="color:#6b635c;font-size:15px;line-height:1.7;margin:0 0 20px;">
      ${e.greeting(name)}<br>${e.confirm_body}
    </p>
    ${btn(link, e.confirm_btn)}
  `, lang)
  await transporter.sendMail({ from: SENDER, to: email, subject: e.confirm_subject(from, to), html })
  console.log(`📧  Confirm request → ${email} [${lang}]`)
}

const sendTripCompletedEmail = async ({ email, name, role, from, to, bookingId, driverName, lang = 'en' }) => {
  const e = EMAIL_T[lang] || EMAIL_T['en']
  const msg = lang === 'fr' ? 'Votre trajet a été confirmé et marqué comme terminé.' : 'Your ride has been confirmed and marked as completed.'
  const html = wrapHtml(`
    <h2 style="color:#1c1917;font-size:22px;font-weight:800;margin:0 0 16px;">✅ ${lang === 'fr' ? 'Trajet terminé' : 'Ride completed'}</h2>
    <p style="color:#6b635c;font-size:15px;line-height:1.7;margin:0 0 20px;">
      ${e.greeting(name)}<br>${msg}
    </p>
    ${btn(`${CLIENT_URL}/my-trips`, lang === 'fr' ? 'Voir mes trajets →' : 'View my rides →')}
  `, lang)
  await transporter.sendMail({ from: SENDER, to: email, subject: `${from} → ${to} — ${lang === 'fr' ? 'Trajet terminé' : 'Ride completed'}`, html })
  console.log(`📧  Trip completed → ${email} [${lang}]`)
}

const sendTripDisputedEmail = async ({ email, name, disputerName, from, to, reason, bookingId, lang = 'en' }) => {
  const msg = lang === 'fr'
    ? `Un litige a été ouvert par <strong>${disputerName}</strong> pour votre trajet <strong>${from} → ${to}</strong>. Notre équipe va examiner la situation.`
    : `A dispute was opened by <strong>${disputerName}</strong> for your ride <strong>${from} → ${to}</strong>. Our team will review the situation.`
  const html = wrapHtml(`
    <h2 style="color:#1c1917;font-size:22px;font-weight:800;margin:0 0 16px;">⚠️ ${lang === 'fr' ? 'Litige ouvert' : 'Dispute opened'}</h2>
    <p style="color:#6b635c;font-size:15px;line-height:1.7;margin:0 0 20px;">
      ${lang === 'fr' ? `Bonjour ${name},` : `Hello ${name},`}<br>${msg}
    </p>
    ${btn(`${CLIENT_URL}/contact`, lang === 'fr' ? 'Contacter le support →' : 'Contact support →', '#EF4444')}
  `, lang)
  await transporter.sendMail({ from: SENDER, to: email, subject: `${lang === 'fr' ? 'Litige' : 'Dispute'} — ${from} → ${to}`, html })
  console.log(`📧  Trip disputed → ${email} [${lang}]`)
}

// ══════════════════════════════════════════════
//  11. CONTACT / SUPPORT
// ══════════════════════════════════════════════
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@covoitgo.cm'

const CONTACT_SUBJECTS = {
  account:   { fr: 'Problème de compte',       en: 'Account issue' },
  booking:   { fr: 'Problème de réservation',  en: 'Booking issue' },
  payment:   { fr: 'Problème de paiement',     en: 'Payment issue' },
  driver:    { fr: 'Signaler un conducteur',   en: 'Report a driver' },
  passenger: { fr: 'Signaler un passager',     en: 'Report a passenger' },
  other:     { fr: 'Autre',                    en: 'Other' },
}

const sendContactEmail = async ({ name, email, subject, category, message, userId }) => {
  const html = wrapHtml(`
    <h2 style="color:#1c1917;font-size:20px;font-weight:800;margin:0 0 16px;">📩 Nouveau message support</h2>
    <div style="background:#f3f0ea;border-radius:10px;padding:16px 20px;margin-bottom:16px;font-size:14px;">
      <div><strong>De :</strong> ${name} (${email})</div>
      <div><strong>Sujet :</strong> ${subject}</div>
      <div><strong>Catégorie :</strong> ${category}</div>
      ${userId ? `<div><strong>User ID :</strong> ${userId}</div>` : ''}
    </div>
    <div style="background:#fff;border:1px solid #e0ddd8;border-radius:10px;padding:16px 20px;font-size:14px;white-space:pre-wrap;">${message}</div>
    ${btn(`${SUPPORT_EMAIL}`, 'Répondre au client →')}
  `, 'fr')
  await transporter.sendMail({ from: SENDER, to: SUPPORT_EMAIL, replyTo: email, subject: `[Support] ${subject}`, html })
  console.log(`📧  Contact → support [de ${email}]`)
}

const sendAdminReplyEmail = async ({ clientEmail, clientName, adminName, subject, replyBody, originalMessage, contactId, lang = 'en' }) => {
  const e = EMAIL_T[lang] || EMAIL_T['en']
  const html = wrapHtml(`
    <h2 style="color:#1c1917;font-size:20px;font-weight:800;margin:0 0 16px;">📩 ${e.contact_reply}</h2>
    <p style="color:#6b635c;font-size:15px;line-height:1.7;margin:0 0 16px;">
      ${e.greeting(clientName)}<br>${e.contact_reply_body}
    </p>
    <div style="background:#e8f7f4;border-left:4px solid #1A9E8A;border-radius:0 10px 10px 0;padding:14px 18px;margin:16px 0;font-size:14px;white-space:pre-wrap;">${replyBody}</div>
    ${btn(`${CLIENT_URL}/contact`, e.contact_reply_btn)}
  `, lang)
  await transporter.sendMail({ from: SENDER, to: clientEmail, subject: `Re: ${subject}`, html })
  console.log(`📧  Admin reply → ${clientEmail} [${lang}]`)
}

const sendClientReplyNotifEmail = async ({ clientName, clientEmail, subject, replyBody, contactId }) => {
  const html = wrapHtml(`
    <h2 style="color:#1c1917;font-size:20px;font-weight:800;margin:0 0 16px;">💬 Réponse client</h2>
    <p style="color:#6b635c;font-size:15px;line-height:1.7;margin:0 0 16px;">
      <strong>${clientName}</strong> (${clientEmail}) a répondu à son ticket :
    </p>
    <div style="background:#f3f0ea;border-radius:10px;padding:14px 18px;margin:16px 0;font-size:14px;white-space:pre-wrap;">${replyBody}</div>
  `, 'fr')
  await transporter.sendMail({ from: SENDER, to: SUPPORT_EMAIL, replyTo: clientEmail, subject: `Re: ${subject}`, html })
  console.log(`📧  Client reply notif → ${SUPPORT_EMAIL}`)
}

// ══════════════════════════════════════════════
//  12. ALERTE TRAJET / FAVORI
// ══════════════════════════════════════════════
const sendTripAlertEmail = async ({ userEmail, userName, from, to, departureAt, price, seats, tripId, type, lang = 'en' }) => {
  const e = EMAIL_T[lang] || EMAIL_T['en']
  const isAlert = type === 'alert'
  const priceStr = new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB').format(price) + ' FCFA'
  const subject = isAlert ? e.alert_subject_alert(from, to) : e.alert_subject_fav(from, to)
  const title   = isAlert ? e.alert_title_alert : e.alert_title_fav
  const body    = isAlert ? e.alert_body_alert  : e.alert_body_fav
  const html = wrapHtml(`
    <h2 style="color:#1c1917;font-size:22px;font-weight:800;margin:0 0 16px;">
      ${isAlert ? '🔔' : '⭐'} ${title}
    </h2>
    <p style="color:#6b635c;font-size:15px;line-height:1.7;margin:0 0 16px;">
      ${e.greeting(userName)}<br>${body}
    </p>
    ${tripBlock(from, to, departureAt, e)}
    <div style="text-align:center;margin:8px 0 20px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
      <span style="background:#e8f7f4;color:#0f6e56;padding:6px 16px;border-radius:20px;font-weight:700;font-size:14px;">${priceStr} ${e.price_per_seat}</span>
      <span style="background:#f3eeff;color:#5b28c2;padding:6px 16px;border-radius:20px;font-weight:700;font-size:14px;">${e.seats_available(seats)}</span>
    </div>
    ${btn(`${CLIENT_URL}/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, e.alert_btn)}
    <p style="color:#a09890;font-size:12px;text-align:center;margin-top:16px;">
      <a href="${CLIENT_URL}/alerts" style="color:#1A9E8A;">${e.alert_manage}</a>
    </p>
  `, lang)
  await transporter.sendMail({ from: SENDER, to: userEmail, subject, html })
  console.log(`📧  Alert ${type} → ${userEmail} [${lang}]`)
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendBookingRequestEmail,
  sendBookingConfirmedEmail,
  sendBookingCancelledEmail,
  sendNewMessageEmail,
  sendAccountBlockedEmail,
  sendAccountReactivatedEmail,
  sendDepartureReminderEmail,
  sendReviewRequestEmail,
  sendTripConfirmationRequestEmail,
  sendTripCompletedEmail,
  sendTripDisputedEmail,
  sendContactEmail,
  sendAdminReplyEmail,
  sendClientReplyNotifEmail,
  sendTripAlertEmail,
  CONTACT_SUBJECTS,
}
