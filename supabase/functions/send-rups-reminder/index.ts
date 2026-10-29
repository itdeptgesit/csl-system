import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured in Supabase Secrets')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find RUPS-AR tasks where due_date is approaching or overdue, and not completed
    const today = new Date()
    const sevenDaysLater = new Date(today)
    sevenDaysLater.setDate(today.getDate() + 7)

    const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0]

    const { data: tasks, error: fetchError } = await supabase
      .from('csl_rups_ar')
      .select('id, company, status, owner, due_date, reminder_emails')
      .not('due_date', 'is', null)
      .lte('due_date', sevenDaysStr)
      .not('status', 'in', '("Completed","Selesai")')
      .neq('reminder_emails', '')

    if (fetchError) {
      throw new Error('Failed to fetch tasks: ' + fetchError.message)
    }

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No tasks due for reminder', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    let sentCount = 0

    for (const task of tasks) {
      const emails = (task.reminder_emails || '')
        .split(',')
        .map((e: string) => e.trim())
        .filter((e: string) => e.length > 0 && e.includes('@'))

      if (emails.length === 0) continue

      const dueDate = new Date(task.due_date)
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const urgencyLabel = diffDays < 0 
        ? `TERLAMBAT ${Math.abs(diffDays)} HARI`
        : diffDays === 0 || diffDays === 1 
          ? 'HARI INI / BESOK' 
          : `${diffDays} hari lagi`

      for (const email of emails) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'CSL-LINK <no-reply@send.gesit.co.id>',
            to: [email],
            subject: `[CSL-LINK] Pengingat Batas Waktu RUPS-AR: ${task.company} (${urgencyLabel})`,
            html: `
              <!DOCTYPE html>
              <html>
              <head><meta charset="utf-8"></head>
              <body style="margin: 0; padding: 32px 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);">
                  <tr>
                    <td style="padding: 24px 28px; background-color: #0a2540; border-bottom: 2px solid #14375e;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="vertical-align: middle;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="vertical-align: middle; padding-right: 12px;">
                                  <img src="https://yihjfrxdrhkqfnjofvua.supabase.co/storage/v1/object/public/public-assets/logo.png" alt="CSL Logo" width="38" height="38" style="display: block; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);" />
                                </td>
                                <td style="vertical-align: middle;">
                                  <div style="font-size: 19px; font-weight: 800; color: #ffffff; letter-spacing: 0.08em; line-height: 1;">CSL-LINK</div>
                                  <div style="font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 0.14em; text-transform: uppercase; margin-top: 4px;">Corporate Secretary &amp; Legal</div>
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td style="text-align: right; vertical-align: middle;">
                            <span style="display: inline-block; padding: 4px 10px; background-color: rgba(220, 38, 38, 0.15); border: 1px solid rgba(220, 38, 38, 0.35); border-radius: 999px; font-size: 11px; font-weight: 700; color: #f87171; letter-spacing: 0.04em; text-transform: uppercase;">
                              RUPS-AR DEADLINE
                            </span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 28px 24px 28px;">
                      <h1 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1.35;">
                        Pengingat Batas Waktu Kepatuhan RUPS-AR
                      </h1>
                      <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #475569;">
                        Pemberitahuan otomatis kepatuhan hukum untuk agenda RUPS-AR perusahaan berikut:
                      </p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 20px 0; overflow: hidden;">
                        <tr>
                          <td style="padding: 12px 18px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px;">
                              <tr>
                                <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 36%;">Perusahaan</td>
                                <td style="padding: 8px 0; color: #0a2540; font-weight: 700;">${task.company}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #64748b; font-weight: 600; border-top: 1px solid #edf2f7;">PIC / Penanggung Jawab</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 500; border-top: 1px solid #edf2f7;">${task.owner || 'Belum ditugaskan'}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #64748b; font-weight: 600; border-top: 1px solid #edf2f7;">Status</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 500; border-top: 1px solid #edf2f7;">${task.status || '-'}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #64748b; font-weight: 600; border-top: 1px solid #edf2f7;">Batas Waktu (Due Date)</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 600; border-top: 1px solid #edf2f7;">${task.due_date}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #64748b; font-weight: 600; border-top: 1px solid #edf2f7;">Sisa Waktu</td>
                                <td style="padding: 8px 0; color: #dc2626; font-weight: 700; border-top: 1px solid #edf2f7;">${urgencyLabel}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 18px 0 0 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                        Mohon pastikan seluruh dokumentasi dan pelaksanaan RUPS-AR diselesaikan sebelum batas waktu yang ditentukan.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 18px 28px; background-color: #fafbfc; border-top: 1px solid #e2e8f0; text-align: center;">
                      <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #475569; letter-spacing: 0.05em; text-transform: uppercase;">
                        CSL-LINK &bull; Corporate Secretary &amp; Legal
                      </p>
                      <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                        Pemberitahuan resmi sistem internal The Gesit Companies. Mohon tidak membalas email ini secara langsung.
                      </p>
                    </td>
                  </tr>
                </table>
              </body>
              </html>
            `,
          }),
        })

        if (res.ok) {
          sentCount++
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `Sent ${sentCount} reminder(s) for ${tasks.length} task(s)`, sent: sentCount, tasks: tasks.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error('RUPS reminder error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
