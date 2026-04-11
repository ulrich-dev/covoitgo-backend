import { useLang } from '../context/LangContext'

const CONTENT = {
  fr: {
    title:   'Politique de Confidentialité',
    updated: 'Dernière mise à jour : 1er janvier 2025',
    sections: [
      { title: '1. Responsable du traitement', text: `Clando SAS, société française, est responsable du traitement de vos données personnelles collectées via la Plateforme. Pour toute question relative à la protection de vos données, vous pouvez contacter notre Délégué à la Protection des Données (DPO) à l'adresse : dpo@clando.fr.` },
      { title: '2. Données collectées', text: `Nous collectons les catégories de données suivantes : Données d'identité (nom, prénom, photo de profil), Données de contact (email, numéro de téléphone), Données de trajet (villes, horaires, préférences), Données de paiement (gérées de manière sécurisée par nos prestataires), Données de connexion (adresse IP, logs d'activité), Évaluations et avis laissés par d'autres utilisateurs.` },
      { title: '3. Finalités du traitement', text: `Vos données sont traitées pour : la création et gestion de votre compte, la mise en relation entre conducteurs et passagers, le traitement des paiements, la communication entre utilisateurs, l'amélioration de nos services, la prévention de la fraude, et le respect de nos obligations légales.` },
      { title: '4. Base légale', text: `Le traitement de vos données repose sur : votre consentement (pour les communications marketing), l'exécution du contrat (pour la fourniture de nos services), nos intérêts légitimes (pour l'amélioration de la Plateforme et la prévention de la fraude), et nos obligations légales (pour la comptabilité et la fiscalité).` },
      { title: '5. Partage des données', text: `Vos données peuvent être partagées avec : d'autres utilisateurs de la Plateforme (dans le cadre d'un trajet), nos prestataires de paiement, nos hébergeurs et fournisseurs cloud, les autorités compétentes si requis par la loi. Nous ne vendons jamais vos données personnelles à des tiers.` },
      { title: '6. Conservation des données', text: `Vos données sont conservées pendant toute la durée de votre compte, puis pendant 3 ans après sa suppression pour des raisons légales. Les données de transaction sont conservées 10 ans conformément aux obligations comptables. Les logs de connexion sont conservés 12 mois.` },
      { title: '7. Vos droits (RGPD)', text: `Conformément au RGPD, vous disposez des droits suivants : droit d'accès, droit de rectification, droit à l'effacement ("droit à l'oubli"), droit à la limitation du traitement, droit à la portabilité, droit d'opposition. Pour exercer ces droits, contactez-nous à : privacy@clando.fr. Vous pouvez également introduire une réclamation auprès de la CNIL.` },
      { title: '8. Cookies', text: `Nous utilisons des cookies essentiels au fonctionnement du site, des cookies de performance (analyse d'audience), et des cookies de personnalisation. Vous pouvez gérer vos préférences cookies depuis notre bandeau de cookies ou depuis les paramètres de votre compte.` },
      { title: '9. Sécurité', text: `Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données : chiffrement SSL/TLS, mots de passe hachés, accès restreints, audits réguliers de sécurité, et monitoring continu de nos systèmes.` },
      { title: '10. Modifications', text: `Nous pouvons modifier cette politique à tout moment. En cas de modification substantielle, nous vous informerons par email au moins 30 jours avant l'entrée en vigueur des nouvelles dispositions.` },
    ],
  },
  en: {
    title:   'Privacy Policy',
    updated: 'Last updated: January 1, 2025',
    sections: [
      { title: '1. Data Controller', text: `Clando SAS, a French company, is the controller of your personal data collected through the Platform. For any questions regarding the protection of your data, you may contact our Data Protection Officer (DPO) at: dpo@clando.fr.` },
      { title: '2. Data Collected', text: `We collect the following categories of data: Identity data (name, profile photo), Contact data (email, phone number), Trip data (cities, schedules, preferences), Payment data (securely managed by our providers), Connection data (IP address, activity logs), Ratings and reviews from other users.` },
      { title: '3. Purposes of Processing', text: `Your data is processed for: creating and managing your account, matching drivers and passengers, processing payments, enabling communication between users, improving our services, fraud prevention, and compliance with our legal obligations.` },
      { title: '4. Legal Basis', text: `The processing of your data is based on: your consent (for marketing communications), contract performance (for providing our services), our legitimate interests (for Platform improvement and fraud prevention), and our legal obligations (for accounting and tax purposes).` },
      { title: '5. Data Sharing', text: `Your data may be shared with: other Platform users (in the context of a trip), our payment providers, our hosting and cloud providers, competent authorities if required by law. We never sell your personal data to third parties.` },
      { title: '6. Data Retention', text: `Your data is retained for the duration of your account, then for 3 years after its deletion for legal reasons. Transaction data is retained for 10 years in accordance with accounting obligations. Connection logs are retained for 12 months.` },
      { title: '7. Your Rights (GDPR)', text: `Under the GDPR, you have the following rights: right of access, right of rectification, right to erasure ("right to be forgotten"), right to restriction of processing, right to data portability, right to object. To exercise these rights, contact us at: privacy@clando.fr. You may also lodge a complaint with your national data protection authority.` },
      { title: '8. Cookies', text: `We use essential cookies for site operation, performance cookies (audience analytics), and personalization cookies. You can manage your cookie preferences from our cookie banner or your account settings.` },
      { title: '9. Security', text: `We implement appropriate technical and organizational measures to protect your data: SSL/TLS encryption, hashed passwords, restricted access, regular security audits, and continuous system monitoring.` },
      { title: '10. Changes', text: `We may modify this policy at any time. In the event of a material change, we will notify you by email at least 30 days before the new provisions take effect.` },
    ],
  },
}

export default function Privacy() {
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
        <div style={{ background:'linear-gradient(135deg,#1A1A2E,#3D2C8D,#7C3AED)', padding:'52px 28px 48px' }}>
          <div style={{ maxWidth:800, margin:'0 auto' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.15)', borderRadius:20, padding:'5px 14px', fontSize:12, fontWeight:800, color:'rgba(255,255,255,0.9)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:18 }}>
              🔒 {lang === 'fr' ? 'Confidentialité' : 'Privacy'}
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

          {/* Rights block */}
          <div style={{ marginTop:32, background:'#F3EEFF', border:'1.5px solid rgba(124,58,237,0.2)', borderRadius:16, padding:'24px 28px', display:'flex', gap:16, alignItems:'flex-start' }}>
            <div style={{ fontSize:24, flexShrink:0 }}>🛡️</div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:'#1A1A1A', marginBottom:6 }}>
                {lang === 'fr' ? 'Exercer vos droits' : 'Exercise your rights'}
              </div>
              <p style={{ fontSize:13.5, color:'#555', margin:'0 0 12px', lineHeight:1.7 }}>
                {lang === 'fr'
                  ? 'Pour toute demande relative à vos données personnelles, contactez notre équipe de protection des données.'
                  : 'For any requests regarding your personal data, contact our data protection team.'}
              </p>
              <a href="mailto:privacy@clando.fr" style={{ color:'#7C3AED', fontWeight:700, fontSize:14, textDecoration:'none' }}>
                privacy@clando.fr →
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
