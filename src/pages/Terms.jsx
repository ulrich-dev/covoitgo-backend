import { useLang } from '../context/LangContext'

const CONTENT = {
  fr: {
    title:   "Conditions Générales d'Utilisation",
    updated: 'Dernière mise à jour : 1er janvier 2025',
    sections: [
      {
        title: '1. Objet',
        text: `Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») ont pour objet de définir les modalités et conditions dans lesquelles Covoitgo (ci-après « la Plateforme ») met à la disposition des utilisateurs ses services de mise en relation entre conducteurs et passagers souhaitant effectuer des trajets en covoiturage sur le territoire français et européen.`,
      },
      {
        title: '2. Acceptation des conditions',
        text: `L'utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU. En créant un compte ou en utilisant nos services, vous reconnaissez avoir pris connaissance des présentes conditions et vous vous engagez à les respecter. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser nos services.`,
      },
      {
        title: '3. Inscription et compte utilisateur',
        text: `Pour utiliser les services de Covoitgo, vous devez créer un compte en fournissant des informations exactes et complètes. Vous êtes seul responsable de la confidentialité de vos identifiants de connexion. Vous vous engagez à nous informer immédiatement en cas d'utilisation non autorisée de votre compte. Covoitgo se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU.`,
      },
      {
        title: '4. Services proposés',
        text: `Covoitgo est une plateforme de mise en relation qui permet aux conducteurs de proposer des places disponibles dans leur véhicule et aux passagers de réserver ces places. Covoitgo n'est pas partie prenante au contrat de transport conclu entre le conducteur et les passagers. La Plateforme propose également un système de messagerie sécurisée, un système d'évaluation et d'avis, ainsi qu'un traitement sécurisé des paiements.`,
      },
      {
        title: '5. Obligations des conducteurs',
        text: `Les conducteurs s'engagent à : posséder un permis de conduire valide, être propriétaire ou avoir le droit d'utiliser le véhicule, disposer d'une assurance couvrant les passagers, respecter le code de la route, ne pas effectuer de bénéfice sur les trajets (le covoiturage est un partage de frais), et fournir des informations exactes sur le trajet proposé.`,
      },
      {
        title: '6. Obligations des passagers',
        text: `Les passagers s'engagent à : se présenter à l'heure et au lieu convenus, respecter les règles fixées par le conducteur, payer le prix convenu, traiter le véhicule avec soin, et signaler tout problème via la Plateforme dans les 24 heures suivant le trajet.`,
      },
      {
        title: '7. Prix et paiement',
        text: `Le prix des trajets est fixé librement par les conducteurs dans les limites fixées par la Plateforme. Covoitgo perçoit une commission sur chaque transaction. Les paiements sont traités de manière sécurisée. En cas d'annulation, les politiques de remboursement applicables sont celles affichées au moment de la réservation.`,
      },
      {
        title: '8. Responsabilité',
        text: `Covoitgo agit en qualité d'intermédiaire et ne peut être tenu responsable des dommages résultant du comportement des utilisateurs, des accidents de la route, des retards, annulations ou tout autre incident survenant lors d'un trajet. Chaque utilisateur est responsable de ses propres actions sur la Plateforme.`,
      },
      {
        title: '9. Données personnelles',
        text: `Le traitement de vos données personnelles est régi par notre Politique de Confidentialité disponible sur la Plateforme. En utilisant nos services, vous consentez à la collecte et au traitement de vos données conformément à cette politique et au Règlement Général sur la Protection des Données (RGPD).`,
      },
      {
        title: '10. Modifications des CGU',
        text: `Covoitgo se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification substantielle par email ou notification dans l'application. La poursuite de l'utilisation de la Plateforme après notification vaut acceptation des nouvelles conditions.`,
      },
      {
        title: '11. Droit applicable',
        text: `Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux français seront compétents. Covoitgo encourage les utilisateurs à tenter de résoudre tout litige à l'amiable avant tout recours judiciaire.`,
      },
    ],
  },
  en: {
    title:   'Terms of Service',
    updated: 'Last updated: January 1, 2025',
    sections: [
      {
        title: '1. Purpose',
        text: 'These Terms of Service ("Terms") define the terms and conditions under which Covoitgo ("the Platform") provides its ride-sharing matching services to users wishing to travel together across France and Europe.',
      },
      {
        title: '2. Acceptance of Terms',
        text: 'By using the Platform, you fully accept these Terms. By creating an account or using our services, you acknowledge that you have read and agree to be bound by these Terms. If you do not accept these Terms, you must not use our services.',
      },
      {
        title: '3. Account Registration',
        text: 'To use Covoitgo services, you must create an account by providing accurate and complete information. You are solely responsible for maintaining the confidentiality of your login credentials. You agree to notify us immediately of any unauthorized use of your account. Covoitgo reserves the right to suspend or delete any account that violates these Terms.',
      },
      {
        title: '4. Services Offered',
        text: 'Covoitgo is a matching platform that allows drivers to offer available seats in their vehicle and passengers to book those seats. Covoitgo is not a party to the transport contract between the driver and passengers. The Platform also provides a secure messaging system, a rating and review system, and secure payment processing.',
      },
      {
        title: '5. Driver Obligations',
        text: 'Drivers agree to: hold a valid driving license, own or have the right to use the vehicle, hold insurance covering passengers, comply with traffic laws, not make a profit from trips (carpooling is cost-sharing only), and provide accurate information about the proposed trip.',
      },
      {
        title: '6. Passenger Obligations',
        text: 'Passengers agree to: arrive on time at the agreed location, respect the rules set by the driver, pay the agreed price, treat the vehicle with care, and report any issues via the Platform within 24 hours of the trip.',
      },
      {
        title: '7. Pricing and Payment',
        text: 'Trip prices are set freely by drivers within the limits set by the Platform. Covoitgo charges a commission on each transaction. Payments are processed securely. In the event of cancellation, the applicable refund policies are those displayed at the time of booking.',
      },
      {
        title: '8. Liability',
        text: 'Covoitgo acts as an intermediary and cannot be held liable for damage resulting from user behavior, road accidents, delays, cancellations or any other incident occurring during a trip. Each user is responsible for their own actions on the Platform.',
      },
      {
        title: '9. Personal Data',
        text: 'The processing of your personal data is governed by our Privacy Policy available on the Platform. By using our services, you consent to the collection and processing of your data in accordance with this policy and the General Data Protection Regulation (GDPR).',
      },
      {
        title: '10. Changes to Terms',
        text: 'Covoitgo reserves the right to modify these Terms at any time. Users will be notified of any material changes by email or in-app notification. Continued use of the Platform after notification constitutes acceptance of the new terms.',
      },
      {
        title: '11. Governing Law',
        text: 'These Terms are governed by French law. In the event of a dispute, the French courts shall have jurisdiction. Covoitgo encourages users to attempt to resolve any dispute amicably before any legal action.',
      },
    ],
  },
}

export default function Terms() {
  const { lang } = useLang()
  const c = CONTENT[lang]

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        .legal-wrap { animation: fadeUp .5s ease both; }
        .legal-section { padding:20px 0; border-bottom:1px solid rgba(0,0,0,0.07); }
        .legal-section:last-child { border-bottom:none; }
      `}</style>

      <div style={{ minHeight:'calc(100vh - 72px)', background:'#fafafa', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>

        {/* Hero band */}
        <div style={{ background:'linear-gradient(135deg,#0B6B5E,#1A9E8A)', padding:'52px 28px 48px' }}>
          <div style={{ maxWidth:800, margin:'0 auto' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.15)', borderRadius:20, padding:'5px 14px', fontSize:12, fontWeight:800, color:'rgba(255,255,255,0.9)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:18 }}>
              📄 {lang === 'fr' ? 'Légal' : 'Legal'}
            </div>
            <h1 style={{ fontSize:'clamp(26px,4vw,44px)', fontWeight:900, color:'#fff', letterSpacing:'-0.04em', margin:'0 0 10px' }}>
              {c.title}
            </h1>
            <p style={{ color:'rgba(255,255,255,0.65)', fontSize:14, margin:0 }}>{c.updated}</p>
          </div>
        </div>

        {/* Content */}
        <div className="legal-wrap" style={{ maxWidth:800, margin:'0 auto', padding:'48px 28px 80px' }}>
          <div style={{ background:'#fff', borderRadius:20, border:'1.5px solid rgba(0,0,0,0.07)', padding:'36px 40px', boxShadow:'0 4px 20px rgba(0,0,0,0.05)' }}>
            {c.sections.map((s, i) => (
              <div key={i} className="legal-section">
                <h2 style={{ fontSize:17, fontWeight:800, color:'#1A1A1A', marginBottom:10, letterSpacing:'-0.02em' }}>{s.title}</h2>
                <p style={{ fontSize:14.5, color:'#555', lineHeight:1.85, margin:0 }}>{s.text}</p>
              </div>
            ))}
          </div>

          {/* Contact block */}
          <div style={{ marginTop:32, background:'#E8F7F4', border:'1.5px solid rgba(26,158,138,0.2)', borderRadius:16, padding:'24px 28px', display:'flex', gap:16, alignItems:'flex-start' }}>
            <div style={{ fontSize:24, flexShrink:0 }}>💬</div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:'#1A1A1A', marginBottom:6 }}>
                {lang === 'fr' ? 'Des questions ?' : 'Questions?'}
              </div>
              <p style={{ fontSize:13.5, color:'#555', margin:'0 0 12px', lineHeight:1.7 }}>
                {lang === 'fr'
                  ? 'Notre équipe juridique est disponible pour répondre à toutes vos questions concernant nos conditions d\'utilisation.'
                  : 'Our legal team is available to answer any questions you may have about our terms of service.'}
              </p>
              <a href="mailto:legal@covoitgo.fr" style={{ color:'#1A9E8A', fontWeight:700, fontSize:14, textDecoration:'none' }}>
                legal@covoitgo.fr →
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
