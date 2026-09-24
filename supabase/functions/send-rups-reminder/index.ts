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

    // Find RUPS-AR tasks where due_date is within the next 7 days and not completed
    const today = new Date()
    const sevenDaysLater = new Date(today)
    sevenDaysLater.setDate(today.getDate() + 7)

    const todayStr = today.toISOString().split('T')[0]
    const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0]

    const { data: tasks, error: fetchError } = await supabase
      .from('csl_rups_ar')
      .select('id, company, status, owner, due_date, reminder_emails')
      .not('due_date', 'is', null)
      .lte('due_date', sevenDaysStr)
      .gte('due_date', todayStr)
      .neq('status', 'Completed')
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
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const urgencyLabel = daysUntilDue <= 1 ? 'HARI INI' : `${daysUntilDue} hari lagi`

      for (const email of emails) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'CSL-System <no-reply@send.gesit.co.id>',
            to: [email],
            subject: `[RUPS-AR REMINDER] ${task.company} — Due ${urgencyLabel}`,
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #4f46e5;">RUPS-AR Due Date Reminder</h2>
                <p>Dear Team,</p>
                <p>This is an automated reminder for the following RUPS-AR task:</p>
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                  <p style="margin: 0;"><strong>Company:</strong> ${task.company}</p>
                  <p style="margin: 0;"><strong>Owner:</strong> ${task.owner || 'Not assigned'}</p>
                  <p style="margin: 0;"><strong>Status:</strong> ${task.status || 'N/A'}</p>
                  <p style="margin: 0;"><strong>Due Date:</strong> ${task.due_date}</p>
                  <p style="margin: 0;"><strong>Days Remaining:</strong> ${urgencyLabel}</p>
                </div>
                <p>Please ensure the task is completed before the due date.</p>
                <br />
                <p>Best Regards,</p>
                <p><strong>CSL System</strong></p>
              </div>
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
