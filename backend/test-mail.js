require('dotenv').config()
const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: process.env.MAILTRAP_PORT,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  }
})

transporter.sendMail({
  from: 'test@covoitgo.fr',
  to:   'test@example.com',
  subject: 'Test Mailtrap',
  text: 'Si vous voyez ce message, ça marche !'
}, (err, info) => {
  if (err) console.error('❌ Erreur:', err)
  else     console.log('✅ Email envoyé !', info.messageId)
})