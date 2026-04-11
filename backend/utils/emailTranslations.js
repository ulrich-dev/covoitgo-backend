// ═══════════════════════════════════════════════════════════════
//  CLANDO — Traductions des emails
//  Usage : const e = EMAIL_T[user.language || 'en']
// ═══════════════════════════════════════════════════════════════

const EMAIL_T = {

  fr: {
    greeting:          (name) => `Bonjour ${name},`,
    footer_unsubscribe:'Pour ne plus recevoir ces emails, gérez vos préférences dans votre profil.',
    footer_team:       "L'équipe Clando 🚗",
    view_btn:          'Voir sur Clando →',
    help:              'Besoin d\'aide ? Contactez-nous à support@clando.cm',

    // Vérification email
    verify_subject:    'Vérifiez votre adresse email — Clando',
    verify_title:      'Confirmez votre email',
    verify_body:       'Merci de vous être inscrit sur Clando ! Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et activer votre compte.',
    verify_btn:        'Confirmer mon email',
    verify_expiry:     'Ce lien expire dans 24 heures.',
    verify_ignore:     'Si vous n\'avez pas créé de compte, ignorez cet email.',

    // Réinitialisation mot de passe
    reset_subject:     'Réinitialisation de mot de passe — Clando',
    reset_title:       'Nouveau mot de passe',
    reset_body:        'Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous.',
    reset_btn:         'Réinitialiser mon mot de passe',
    reset_expiry:      'Ce lien expire dans 1 heure.',
    reset_ignore:      'Si vous n\'avez pas fait cette demande, ignorez cet email.',

    // Nouvelle réservation (conducteur)
    booking_req_subject:(from, to) => `Nouvelle réservation : ${from} → ${to}`,
    booking_req_title:  'Nouvelle demande de réservation',
    booking_req_body:   (name) => `${name} souhaite réserver une place sur votre trajet.`,
    booking_req_btn:    'Voir la réservation',
    seats:              (n) => `${n} place${n > 1 ? 's' : ''}`,
    accept_btn:         'Accepter',
    decline_btn:        'Refuser',

    // Réservation confirmée (passager)
    booking_conf_subject:(from, to) => `Réservation confirmée : ${from} → ${to} ✅`,
    booking_conf_title:  'Réservation confirmée !',
    booking_conf_body:   (driver) => `Bonne nouvelle ! ${driver} a accepté votre réservation.`,
    booking_conf_btn:    'Voir les détails',
    contact_driver:      'Contacter le conducteur',
    meeting_point:       'Point de rendez-vous',
    driver_phone:        'Téléphone conducteur',

    // Réservation annulée
    booking_cancel_subject:(from, to) => `Réservation annulée : ${from} → ${to}`,
    booking_cancel_title:  'Réservation annulée',
    booking_cancel_by_driver:  'Le conducteur a annulé votre réservation.',
    booking_cancel_by_passenger:'Le passager a annulé sa réservation.',

    // Nouveau message
    message_subject:    (name, from, to) => `Nouveau message de ${name} — ${from} → ${to}`,
    message_title:      'Nouveau message',
    message_body:       (name) => `${name} vous a envoyé un message :`,
    message_btn:        'Répondre',

    // Rappel départ
    reminder_subject:   (from, to) => `⏰ Rappel : votre trajet ${from} → ${to}`,
    reminder_title:     'Votre trajet approche !',
    reminder_body:      (min) => `Votre trajet démarre dans ${min} minutes.`,
    reminder_15_btn:    'Voir le trajet',
    reminder_contact:   'Contacter le conducteur',

    // Demande d'avis
    review_subject:     (from, to) => `Comment était votre trajet ${from} → ${to} ?`,
    review_title:       'Donnez votre avis',
    review_body:        (driver) => `Votre trajet avec ${driver} est terminé. Partagez votre expérience !`,
    review_btn:         'Laisser un avis',

    // Alerte trajet
    alert_subject_alert:  (from, to) => `🔔 Trajet trouvé : ${from} → ${to}`,
    alert_subject_fav:    (from, to) => `⭐ Nouveau trajet sur votre favori : ${from} → ${to}`,
    alert_title_alert:    'Votre alerte a trouvé un trajet !',
    alert_title_fav:      'Nouveau trajet sur votre itinéraire favori',
    alert_body_alert:     'Un nouveau trajet correspond à votre alerte :',
    alert_body_fav:       'Un conducteur vient de publier un trajet sur votre itinéraire favori :',
    alert_btn:            'Voir le trajet →',
    alert_manage:         'Gérer mes alertes',
    price_per_seat:       '/ place',
    seats_available:      (n) => `${n} place${n > 1 ? 's' : ''} disponible${n > 1 ? 's' : ''}`,

    // Confirmation mutuelle
    confirm_subject:     (from, to) => `Confirmez votre trajet ${from} → ${to}`,
    confirm_title:       'Confirmez votre trajet',
    confirm_body:        'Votre trajet est terminé. Confirmez-le pour valider les paiements.',
    confirm_btn:         'Confirmer le trajet',

    // Compte suspendu
    blocked_subject:     'Votre compte Clando a été suspendu',
    blocked_title:       'Compte suspendu',
    blocked_body:        'Votre compte a été suspendu suite à une violation de nos conditions d\'utilisation.',
    blocked_contact:     'Contacter le support',

    // Support / Contact
    contact_subject:     (cat) => `[Support] ${cat}`,
    contact_received:    'Votre message a bien été reçu',
    contact_body:        'Notre équipe vous répondra dans les plus brefs délais.',
    contact_reply:       'Réponse à votre demande de support',
    contact_reply_body:  'Notre équipe a répondu à votre message :',
    contact_reply_btn:   'Voir ma demande',

    // Labels communs
    from:       'Départ',
    to:         'Arrivée',
    date:       'Date',
    time:       'Heure',
    price:      'Prix',
    vehicle:    'Véhicule',
    duration:   'Durée',
    direct:     'Direct',
    fcfa:       'FCFA',
  },

  en: {
    greeting:          (name) => `Hello ${name},`,
    footer_unsubscribe:'To stop receiving these emails, manage your preferences in your profile.',
    footer_team:       'The Clando Team 🚗',
    view_btn:          'View on Clando →',
    help:              'Need help? Contact us at support@clando.cm',

    verify_subject:    'Verify your email address — Clando',
    verify_title:      'Confirm your email',
    verify_body:       'Thank you for signing up to Clando! Click the button below to confirm your email address and activate your account.',
    verify_btn:        'Confirm my email',
    verify_expiry:     'This link expires in 24 hours.',
    verify_ignore:     'If you didn\'t create an account, you can safely ignore this email.',

    reset_subject:     'Password reset — Clando',
    reset_title:       'Reset your password',
    reset_body:        'You requested a password reset. Click the button below.',
    reset_btn:         'Reset my password',
    reset_expiry:      'This link expires in 1 hour.',
    reset_ignore:      'If you didn\'t request this, you can safely ignore this email.',

    booking_req_subject:(from, to) => `New booking request: ${from} → ${to}`,
    booking_req_title:  'New booking request',
    booking_req_body:   (name) => `${name} wants to book a seat on your ride.`,
    booking_req_btn:    'View booking',
    seats:              (n) => `${n} seat${n > 1 ? 's' : ''}`,
    accept_btn:         'Accept',
    decline_btn:        'Decline',

    booking_conf_subject:(from, to) => `Booking confirmed: ${from} → ${to} ✅`,
    booking_conf_title:  'Booking confirmed!',
    booking_conf_body:   (driver) => `Great news! ${driver} has accepted your booking.`,
    booking_conf_btn:    'View details',
    contact_driver:      'Contact driver',
    meeting_point:       'Meeting point',
    driver_phone:        'Driver phone',

    booking_cancel_subject:(from, to) => `Booking cancelled: ${from} → ${to}`,
    booking_cancel_title:  'Booking cancelled',
    booking_cancel_by_driver:  'The driver cancelled your booking.',
    booking_cancel_by_passenger:'The passenger cancelled their booking.',

    message_subject:    (name, from, to) => `New message from ${name} — ${from} → ${to}`,
    message_title:      'New message',
    message_body:       (name) => `${name} sent you a message:`,
    message_btn:        'Reply',

    reminder_subject:   (from, to) => `⏰ Reminder: your ride ${from} → ${to}`,
    reminder_title:     'Your ride is coming up!',
    reminder_body:      (min) => `Your ride starts in ${min} minutes.`,
    reminder_15_btn:    'View ride',
    reminder_contact:   'Contact driver',

    review_subject:     (from, to) => `How was your ride ${from} → ${to}?`,
    review_title:       'Leave a review',
    review_body:        (driver) => `Your ride with ${driver} is done. Share your experience!`,
    review_btn:         'Leave a review',

    alert_subject_alert:  (from, to) => `🔔 Ride found: ${from} → ${to}`,
    alert_subject_fav:    (from, to) => `⭐ New ride on your favourite route: ${from} → ${to}`,
    alert_title_alert:    'Your alert found a ride!',
    alert_title_fav:      'New ride on your favourite route',
    alert_body_alert:     'A new ride matches your alert:',
    alert_body_fav:       'A driver just posted a ride on your favourite route:',
    alert_btn:            'View ride →',
    alert_manage:         'Manage my alerts',
    price_per_seat:       '/ seat',
    seats_available:      (n) => `${n} seat${n > 1 ? 's' : ''} available`,

    confirm_subject:     (from, to) => `Confirm your ride ${from} → ${to}`,
    confirm_title:       'Confirm your ride',
    confirm_body:        'Your ride is complete. Confirm it to validate payments.',
    confirm_btn:         'Confirm ride',

    blocked_subject:     'Your Clando account has been suspended',
    blocked_title:       'Account suspended',
    blocked_body:        'Your account has been suspended due to a violation of our terms of use.',
    blocked_contact:     'Contact support',

    contact_subject:     (cat) => `[Support] ${cat}`,
    contact_received:    'Your message has been received',
    contact_body:        'Our team will get back to you as soon as possible.',
    contact_reply:       'Reply to your support request',
    contact_reply_body:  'Our team replied to your message:',
    contact_reply_btn:   'View my request',

    from:       'From',
    to:         'To',
    date:       'Date',
    time:       'Time',
    price:      'Price',
    vehicle:    'Vehicle',
    duration:   'Duration',
    direct:     'Direct',
    fcfa:       'FCFA',
  },
}

module.exports = { EMAIL_T }
