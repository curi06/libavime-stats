# Quinteto Pro · Correo de invitaciones

Sin configurar nada, **las invitaciones ya funcionan**: si el correo no se
puede enviar, el panel muestra un enlace para copiar o mandar por WhatsApp
(Miembros y Plataforma). Esta guía es para que, además, lleguen por correo.

Por qué Gmail: servicios como Resend o SendGrid solo envían a cualquier
persona con un **dominio propio verificado**. Mientras la plataforma use
`libavime.vercel.app`, Gmail es la opción gratuita (≈500 correos al día).

> Recomendado: crear una cuenta de Gmail **solo para la plataforma**
> (p. ej. `quintetopro.rd@gmail.com`). Así las ligas no ven tu correo
> personal y no se mezclan los mensajes.

## 1. Contraseña de aplicación en Google (5 min)

1. Entra a la cuenta de Gmail que enviará los correos.
2. Activa la **verificación en dos pasos**: https://myaccount.google.com/signinoptions/two-step-verification
3. Crea una **contraseña de aplicación**: https://myaccount.google.com/apppasswords
   - Nombre: `Supabase Quinteto Pro` → **Crear**.
   - Copia las 16 letras. Solo se muestran una vez.

## 2. SMTP en Supabase (proyecto de producción, "curi06's Project")

**Authentication → Emails → SMTP Settings → Enable custom SMTP**

| Campo | Valor |
|---|---|
| Sender email | la cuenta de Gmail del paso 1 |
| Sender name | `Quinteto Pro` |
| Host | `smtp.gmail.com` |
| Port | `465` |
| Username | la cuenta de Gmail completa |
| Password | la contraseña de aplicación (16 letras, sin espacios) |

**Save**.

## 3. Límite de envíos

**Authentication → Rate Limits → Rate limit for sending emails**: súbelo a
`30` por hora (con el SMTP por defecto de Supabase es muy bajo).

## 4. Direcciones permitidas (obligatorio, también para el enlace por WhatsApp)

**Authentication → URL Configuration**

- **Site URL**: `https://libavime.vercel.app`
- **Redirect URLs** → agregar: `https://libavime.vercel.app/bienvenida**`

Sin esto, al abrir la invitación Supabase no lleva a la página para crear
la contraseña.

## 5. Texto del correo en español (opcional)

**Authentication → Emails → Templates → Invite user**

- Subject: `Te invitaron a Quinteto Pro 🏀`
- Message body:

```html
<h2>¡Bienvenido a Quinteto Pro!</h2>
<p>Te invitaron a formar parte del equipo de una liga de baloncesto.</p>
<p><a href="{{ .ConfirmationURL }}">Crear mi contraseña</a></p>
<p>Si no esperabas esta invitación, ignora este correo.</p>
```

## Verificación

Desde **/plataforma** o **/[liga]/admin/miembros**, invita a un correo tuyo:
debe llegar el correo (revisa también "Spam") y el enlace debe abrir
`/bienvenida` para crear la contraseña.
