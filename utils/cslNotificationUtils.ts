import { supabase } from '../lib/supabaseClient';

function escapeHtml(str: string): string {
    return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export type NotificationType = 'Info' | 'Warning' | 'Success' | 'Alert';

/**
 * Creates an in-app notification in the `notifications` table.
 */
export async function createInAppNotification(
    userId: string | null,
    title: string,
    message: string,
    type: NotificationType = 'Info',
    link?: string,
    userEmail?: string
) {
    try {
        const payload: any = {
            title,
            message,
            type,
            is_read: false,
            link
        };
        
        if (userId) payload.user_id = userId;

        const { error } = await supabase.from('notifications').insert([payload]);
        if (error) {
            console.error('Failed to create in-app notification:', error.message);
        }
    } catch (err) {
        console.error('Error in createInAppNotification:', err);
    }
}

export interface CSLNotificationConfig {
    emailMasterEnabled: boolean;
    emailNewRequestEnabled: boolean;
    emailStatusChangeEnabled: boolean;
    emailAssignMentionEnabled: boolean;
    emailApprovalsEnabled: boolean;
    cslInboxEmail: string;
}

let cachedSettings: CSLNotificationConfig | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30000; // 30-second in-memory cache

/**
 * Retrieves the active notification settings from localStorage and csl_system_settings table.
 */
export async function getCSLNotificationSettings(forceRefresh = false): Promise<CSLNotificationConfig> {
    const now = Date.now();
    if (!forceRefresh && cachedSettings && (now - lastFetchTime < CACHE_TTL_MS)) {
        return cachedSettings;
    }

    const config: CSLNotificationConfig = {
        emailMasterEnabled: true,
        emailNewRequestEnabled: true,
        emailStatusChangeEnabled: true,
        emailAssignMentionEnabled: true,
        emailApprovalsEnabled: true,
        cslInboxEmail: 'corporatesecretary@gesit.co.id'
    };

    // 1. Read from localStorage for immediate local responsiveness
    if (typeof window !== 'undefined') {
        const localMaster = localStorage.getItem('csl_notif_email_master');
        if (localMaster !== null) config.emailMasterEnabled = localMaster !== 'false';

        const localNewReq = localStorage.getItem('csl_notif_email_new_request');
        if (localNewReq !== null) config.emailNewRequestEnabled = localNewReq !== 'false';

        const localStatus = localStorage.getItem('csl_notif_email_status_change');
        if (localStatus !== null) config.emailStatusChangeEnabled = localStatus !== 'false';

        const localAssign = localStorage.getItem('csl_notif_email_assign_mention');
        if (localAssign !== null) config.emailAssignMentionEnabled = localAssign !== 'false';

        const localApprovals = localStorage.getItem('csl_notif_email_approvals');
        if (localApprovals !== null) config.emailApprovalsEnabled = localApprovals !== 'false';

        const localInbox = localStorage.getItem('csl_notif_csl_inbox_email');
        if (localInbox) config.cslInboxEmail = localInbox;
    }

    // 2. Sync from database table csl_system_settings
    try {
        const { data, error } = await supabase
            .from('csl_system_settings')
            .select('setting_key, setting_value')
            .in('setting_key', [
                'csl_notif_email_master',
                'csl_notif_email_new_request',
                'csl_notif_email_status_change',
                'csl_notif_email_assign_mention',
                'csl_notif_email_approvals',
                'csl_notif_csl_inbox_email'
            ]);

        if (!error && data) {
            data.forEach((row: { setting_key: string; setting_value: string }) => {
                if (row.setting_key === 'csl_notif_email_master') {
                    config.emailMasterEnabled = row.setting_value !== 'false';
                    localStorage.setItem('csl_notif_email_master', String(config.emailMasterEnabled));
                } else if (row.setting_key === 'csl_notif_email_new_request') {
                    config.emailNewRequestEnabled = row.setting_value !== 'false';
                    localStorage.setItem('csl_notif_email_new_request', String(config.emailNewRequestEnabled));
                } else if (row.setting_key === 'csl_notif_email_status_change') {
                    config.emailStatusChangeEnabled = row.setting_value !== 'false';
                    localStorage.setItem('csl_notif_email_status_change', String(config.emailStatusChangeEnabled));
                } else if (row.setting_key === 'csl_notif_email_assign_mention') {
                    config.emailAssignMentionEnabled = row.setting_value !== 'false';
                    localStorage.setItem('csl_notif_email_assign_mention', String(config.emailAssignMentionEnabled));
                } else if (row.setting_key === 'csl_notif_email_approvals') {
                    config.emailApprovalsEnabled = row.setting_value !== 'false';
                    localStorage.setItem('csl_notif_email_approvals', String(config.emailApprovalsEnabled));
                } else if (row.setting_key === 'csl_notif_csl_inbox_email' && row.setting_value) {
                    config.cslInboxEmail = row.setting_value;
                    localStorage.setItem('csl_notif_csl_inbox_email', config.cslInboxEmail);
                }
            });
        }
    } catch (err) {
        console.warn('csl_system_settings sync skipped, using local cache:', err);
    }

    cachedSettings = config;
    lastFetchTime = now;
    return config;
}

/**
 * Persists notification settings to localStorage and csl_system_settings table in Supabase.
 */
export async function saveCSLNotificationSettings(config: Partial<CSLNotificationConfig>): Promise<boolean> {
    if (typeof window !== 'undefined') {
        if (config.emailMasterEnabled !== undefined) {
            localStorage.setItem('csl_notif_email_master', String(config.emailMasterEnabled));
        }
        if (config.emailNewRequestEnabled !== undefined) {
            localStorage.setItem('csl_notif_email_new_request', String(config.emailNewRequestEnabled));
        }
        if (config.emailStatusChangeEnabled !== undefined) {
            localStorage.setItem('csl_notif_email_status_change', String(config.emailStatusChangeEnabled));
        }
        if (config.emailAssignMentionEnabled !== undefined) {
            localStorage.setItem('csl_notif_email_assign_mention', String(config.emailAssignMentionEnabled));
        }
        if (config.emailApprovalsEnabled !== undefined) {
            localStorage.setItem('csl_notif_email_approvals', String(config.emailApprovalsEnabled));
        }
        if (config.cslInboxEmail !== undefined) {
            localStorage.setItem('csl_notif_csl_inbox_email', config.cslInboxEmail);
        }
    }

    // Invalidate local in-memory cache
    cachedSettings = null;

    try {
        const rowsToUpsert: { setting_key: string; setting_value: string }[] = [];
        if (config.emailMasterEnabled !== undefined) {
            rowsToUpsert.push({ setting_key: 'csl_notif_email_master', setting_value: String(config.emailMasterEnabled) });
        }
        if (config.emailNewRequestEnabled !== undefined) {
            rowsToUpsert.push({ setting_key: 'csl_notif_email_new_request', setting_value: String(config.emailNewRequestEnabled) });
        }
        if (config.emailStatusChangeEnabled !== undefined) {
            rowsToUpsert.push({ setting_key: 'csl_notif_email_status_change', setting_value: String(config.emailStatusChangeEnabled) });
        }
        if (config.emailAssignMentionEnabled !== undefined) {
            rowsToUpsert.push({ setting_key: 'csl_notif_email_assign_mention', setting_value: String(config.emailAssignMentionEnabled) });
        }
        if (config.emailApprovalsEnabled !== undefined) {
            rowsToUpsert.push({ setting_key: 'csl_notif_email_approvals', setting_value: String(config.emailApprovalsEnabled) });
        }
        if (config.cslInboxEmail !== undefined) {
            rowsToUpsert.push({ setting_key: 'csl_notif_csl_inbox_email', setting_value: config.cslInboxEmail });
        }

        if (rowsToUpsert.length > 0) {
            await supabase.from('csl_system_settings').upsert(rowsToUpsert, { onConflict: 'setting_key' });
        }
        return true;
    } catch (err) {
        console.warn('Note: csl_system_settings upsert error, saved in localStorage:', err);
        return true;
    }
}

export type EmailNotificationCategory = 'NEW_REQUEST' | 'STATUS_CHANGE' | 'ASSIGN_MENTION' | 'APPROVAL' | 'GENERAL';

export interface CslEmailTemplateOptions {
    badge?: string;
    badgeColor?: string;
    title: string;
    recipientName?: string;
    introParagraph?: string;
    detailsTable?: { label: string; value: string; isHighlight?: boolean }[];
    calloutBox?: { title?: string; content: string; borderAccent?: string };
    attachments?: { name: string; url: string }[];
    actionButton?: { label: string; url: string };
    closingParagraph?: string;
}

/**
 * Builds an ultra-clean, executive corporate email template adhering strictly to CSL-LINK branding.
 * Avoids generic AI aesthetic, cheesy emojis, and tacky gradient banners.
 */
export function buildCslEmailTemplate(options: CslEmailTemplateOptions): string {
    const logoUrl = 'https://yihjfrxdrhkqfnjofvua.supabase.co/storage/v1/object/public/public-assets/logo.png';
    const badgeText = options.badge || 'NOTIFIKASI';
    const badgeBg = options.badgeColor ? `${options.badgeColor}22` : 'rgba(255, 255, 255, 0.12)';
    const badgeBorder = options.badgeColor ? `${options.badgeColor}55` : 'rgba(255, 255, 255, 0.22)';
    const badgeTextColor = options.badgeColor ? '#ffffff' : '#e2e8f0';

    let tableHtml = '';
    if (options.detailsTable && options.detailsTable.length > 0) {
        tableHtml = `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 20px 0; overflow: hidden;">
            <tr>
                <td style="padding: 12px 18px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px;">
                        ${options.detailsTable.map((row, idx) => `
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 36%; vertical-align: top; ${idx > 0 ? 'border-top: 1px solid #edf2f7;' : ''}">
                                ${escapeHtml(row.label)}
                            </td>
                            <td style="padding: 8px 0; color: ${row.isHighlight ? '#0a2540' : '#1e293b'}; font-weight: ${row.isHighlight ? '700' : '500'}; vertical-align: top; ${idx > 0 ? 'border-top: 1px solid #edf2f7;' : ''}">
                                ${row.value}
                            </td>
                        </tr>
                        `).join('')}
                    </table>
                </td>
            </tr>
        </table>
        `;
    }

    let calloutHtml = '';
    if (options.calloutBox && options.calloutBox.content) {
        const accent = options.calloutBox.borderAccent || '#0a2540';
        calloutHtml = `
        <div style="margin: 20px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid ${accent}; border-radius: 0 10px 10px 0; padding: 14px 18px;">
            ${options.calloutBox.title ? `<div style="font-size: 11px; font-weight: 700; color: #475569; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px;">${escapeHtml(options.calloutBox.title)}</div>` : ''}
            <div style="font-size: 13px; line-height: 1.6; color: #1e293b;">
                ${options.calloutBox.content}
            </div>
        </div>
        `;
    }

    let attachmentsHtml = '';
    if (options.attachments && options.attachments.length > 0) {
        attachmentsHtml = `
        <div style="margin: 20px 0;">
            <div style="font-size: 11px; font-weight: 700; color: #475569; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 8px;">
                Lampiran Dokumen (${options.attachments.length})
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 12px;">
                ${options.attachments.map(att => `
                <tr>
                    <td style="padding: 6px 0; font-size: 13px;">
                        <span style="display: inline-block; padding: 2px 7px; background-color: #e2e8f0; color: #334155; border-radius: 4px; font-size: 10px; font-weight: 700; margin-right: 8px;">FILE</span>
                        <a href="${escapeHtml(att.url)}" target="_blank" rel="noopener noreferrer" style="color: #0a2540; font-weight: 600; text-decoration: underline;">
                            ${escapeHtml(att.name)}
                        </a>
                    </td>
                </tr>
                `).join('')}
            </table>
        </div>
        `;
    }

    let actionButtonHtml = '';
    if (options.actionButton && options.actionButton.url) {
        actionButtonHtml = `
        <div style="margin: 28px 0 16px 0; text-align: left;">
            <a href="${escapeHtml(options.actionButton.url)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0a2540; color: #ffffff; font-size: 13px; font-weight: 700; letter-spacing: 0.02em; padding: 12px 24px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(10, 37, 64, 0.15);">
                ${escapeHtml(options.actionButton.label)} &rarr;
            </a>
        </div>
        `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(options.title)}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);">
    <!-- Header Brand Banner -->
    <tr>
      <td style="padding: 24px 28px; background-color: #0a2540; border-bottom: 2px solid #14375e;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align: middle;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align: middle; padding-right: 12px;">
                    <img src="${logoUrl}" alt="CSL Logo" width="38" height="38" style="display: block; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);" onerror="this.style.display='none'" />
                  </td>
                  <td style="vertical-align: middle;">
                    <div style="font-size: 19px; font-weight: 800; color: #ffffff; letter-spacing: 0.08em; line-height: 1;">CSL-LINK</div>
                    <div style="font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 0.14em; text-transform: uppercase; margin-top: 4px;">Corporate Secretary &amp; Legal</div>
                  </td>
                </tr>
              </table>
            </td>
            <td style="text-align: right; vertical-align: middle;">
              <span style="display: inline-block; padding: 4px 10px; background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; border-radius: 999px; font-size: 11px; font-weight: 700; color: ${badgeTextColor}; letter-spacing: 0.04em; text-transform: uppercase;">
                ${escapeHtml(badgeText)}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Content Area -->
    <tr>
      <td style="padding: 30px 28px 24px 28px;">
        <h1 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1.35;">
          ${escapeHtml(options.title)}
        </h1>
        
        ${options.recipientName ? `<p style="margin: 0 0 12px 0; font-size: 14px; color: #334155;">Halo <strong>${escapeHtml(options.recipientName)}</strong>,</p>` : ''}
        
        ${options.introParagraph ? `<div style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #475569;">${options.introParagraph}</div>` : ''}

        ${tableHtml}

        ${calloutHtml}

        ${attachmentsHtml}

        ${actionButtonHtml}

        ${options.closingParagraph ? `<p style="margin: 18px 0 0 0; font-size: 12px; line-height: 1.5; color: #64748b;">${options.closingParagraph}</p>` : ''}
      </td>
    </tr>

    <!-- Official Corporate Footer -->
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
    `.trim();
}

/**
 * Sends an email notification using the Supabase send-email Edge Function (Resend API).
 * Checks global and category-specific notification settings before sending.
 */
export async function sendEmailNotification(
    to: string,
    subject: string,
    body: string,
    isHtml: boolean = false,
    category: EmailNotificationCategory = 'GENERAL'
): Promise<{ success: boolean; skipped?: boolean; reason?: string }> {
    try {
        const settings = await getCSLNotificationSettings();

        // 1. Master switch check
        if (!settings.emailMasterEnabled) {
            console.log(`🔕 [Email Skipped] Master email notification is turned OFF. Skipped "${subject}" to ${to}`);
            return { success: true, skipped: true, reason: 'Pengiriman email global sedang dinonaktifkan di Pengaturan' };
        }

        // 2. Specific category switches
        if (category === 'NEW_REQUEST' && !settings.emailNewRequestEnabled) {
            console.log(`🔕 [Email Skipped] Notifikasi permohonan baru dinonaktifkan. Skipped "${subject}" to ${to}`);
            return { success: true, skipped: true, reason: 'Notifikasi permohonan baru dinonaktifkan di Pengaturan' };
        }

        if (category === 'STATUS_CHANGE' && !settings.emailStatusChangeEnabled) {
            console.log(`🔕 [Email Skipped] Notifikasi update status dinonaktifkan. Skipped "${subject}" to ${to}`);
            return { success: true, skipped: true, reason: 'Notifikasi update status permohonan dinonaktifkan di Pengaturan' };
        }

        if (category === 'ASSIGN_MENTION' && !settings.emailAssignMentionEnabled) {
            console.log(`🔕 [Email Skipped] Notifikasi penugasan & mention dinonaktifkan. Skipped "${subject}" to ${to}`);
            return { success: true, skipped: true, reason: 'Notifikasi penugasan & mention dinonaktifkan di Pengaturan' };
        }

        if (category === 'APPROVAL' && !settings.emailApprovalsEnabled) {
            console.log(`🔕 [Email Skipped] Notifikasi approval biaya/invoice dinonaktifkan. Skipped "${subject}" to ${to}`);
            return { success: true, skipped: true, reason: 'Notifikasi persetujuan (approval) dinonaktifkan di Pengaturan' };
        }

        console.log(`\n📧 Sending email to: ${to} (Category: ${category})`);

        // If body is plain text, automatically wrap it in our clean CSL-LINK email template
        let emailHtmlBody = body;
        if (!isHtml) {
            const cleanTitle = subject.replace(/^\[.*?\]\s*/, '');
            emailHtmlBody = buildCslEmailTemplate({
                title: cleanTitle,
                badge: category === 'APPROVAL' ? 'APPROVAL' : 'NOTIFIKASI',
                badgeColor: category === 'APPROVAL' ? '#d97706' : '#0a2540',
                introParagraph: escapeHtml(body).replace(/\n/g, '<br/>')
            });
        }

        const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
                to,
                subject,
                body: emailHtmlBody
            }
        });
        
        if (error) {
            console.error('Failed to send email:', error.message);
            return { success: false, reason: error.message };
        } else if (!data?.success) {
            console.error('Email edge function returned error:', data?.error);
            return { success: false, reason: data?.error };
        } else {
            console.log('✅ Email sent successfully!');
            return { success: true };
        }
    } catch (err: any) {
        console.error('Error invoking send-email function:', err);
        return { success: false, reason: err?.message || 'Gagal mengirim email' };
    }
}

/**
 * High-level orchestration function to notify relevant parties about request updates.
 */
export async function notifyRequestUpdate(
    request: any, // The CSL Request object
    eventType: 'SUBMITTED' | 'ASSIGNED' | 'STATUS_CHANGED' | 'COMPLETED' | 'RESPONDED' | 'USER_RESPONDED',
    additionalInfo?: string,
    attachments?: { name: string; url: string }[]
) {
    const requestLink = `/csl-all-requests?id=${request.id}`;

    // Helper to resolve user_id by email if ID is not directly present on request
    const resolveUserId = async (id?: string | null, email?: string | null): Promise<string | null> => {
        if (id && id !== 'null' && id !== 'undefined') return String(id);
        if (!email) return null;
        try {
            const { data } = await supabase.from('user_accounts').select('id').ilike('email', email.trim()).maybeSingle();
            return data?.id ? String(data.id) : null;
        } catch {
            return null;
        }
    };

    const requesterUserId = await resolveUserId(request.requester_id, request.requester_email);
    const assignedPicUserId = await resolveUserId(request.assigned_pic_id, request.assigned_pic_email);

    switch (eventType) {
        case 'SUBMITTED':
            // Notify CSL Staff / Admins (In-App broadcast with user_id = null)
            await createInAppNotification(
                null,
                'Permintaan Baru Diajukan',
                `Permintaan ${request.request_number} (${request.category_name || request.department || 'CSL'}) diajukan oleh ${request.requester_name || 'User'}.`,
                'Info',
                requestLink
            );
            
            const newRequestHtml = buildCslEmailTemplate({
                badge: 'PERMOHONAN BARU',
                badgeColor: '#0a2540',
                title: 'Permintaan Tiket Baru Diajukan',
                recipientName: 'Tim Corporate Secretary & Legal',
                introParagraph: 'Terdapat pengajuan tiket permohonan baru dari pemohon yang memerlukan peninjauan dan penugasan PIC:',
                detailsTable: [
                    { label: 'No. Tiket', value: `<span style="font-family: monospace; font-weight: 700;">${escapeHtml(request.request_number)}</span>`, isHighlight: true },
                    { label: 'Pemohon', value: `${escapeHtml(request.requester_name || 'User')} <span style="color: #64748b; font-weight: normal;">(${escapeHtml(request.requester_email || '-')})</span>` },
                    { label: 'Perusahaan / Dept', value: `${escapeHtml(request.company || 'PT GESIT')} &bull; ${escapeHtml(request.department || '-')}` },
                    { label: 'Kategori', value: escapeHtml(request.category_name || '-') },
                    { label: 'Deskripsi', value: escapeHtml(request.description || '-') }
                ],
                closingParagraph: 'Silakan masuk ke platform CSL-LINK untuk menugaskan PIC atau menindaklanjuti permohonan ini.'
            });

            // Kirim notifikasi email ke group Tim Corporate Secretary & Legal jika diaktifkan
            const currentSettings = await getCSLNotificationSettings();
            const targetCslEmail = currentSettings.cslInboxEmail || 'corporatesecretary@gesit.co.id';
            await sendEmailNotification(
                targetCslEmail,
                `[CSL-LINK] Permintaan Baru Diajukan: ${request.request_number} - ${request.requester_name || 'User'}`,
                newRequestHtml,
                true, // isHtml
                'NEW_REQUEST'
            );
            break;
            
        case 'USER_RESPONDED':
            // Notify Assigned PIC, or all CSL staff if unassigned
            const hasAtt = attachments && attachments.length > 0;
            const userMsg = hasAtt
                ? `Pemohon (${request.requester_name}) mengirim pesan & ${attachments.length} lampiran pada ${request.request_number}.`
                : `Pemohon (${request.requester_name}) mengirim tanggapan pada ${request.request_number}.`;
            const notifTitle = hasAtt ? 'Pesan & Lampiran Baru dari Pemohon' : 'Pesan Baru dari Pemohon';
            if (assignedPicUserId) {
                await createInAppNotification(
                    assignedPicUserId,
                    notifTitle,
                    userMsg,
                    'Info',
                    requestLink
                );
            } else {
                await createInAppNotification(
                    null,
                    notifTitle,
                    userMsg,
                    'Info',
                    requestLink
                );
            }
            break;
            
        case 'ASSIGNED':
            if (assignedPicUserId) {
                await createInAppNotification(
                    assignedPicUserId,
                    'Penugasan Permintaan Baru',
                    `Anda ditugaskan menangani permintaan ${request.request_number} (${request.requester_name}).`,
                    'Info',
                    requestLink
                );
            }
            break;

        case 'STATUS_CHANGED':
        case 'COMPLETED':
        case 'RESPONDED':
            // Notify Requester
            if (requesterUserId) {
                const title = eventType === 'COMPLETED' ? 'Permintaan Selesai' : 
                              eventType === 'RESPONDED' ? 'Respons Baru dari CSL' : 'Status Permintaan Diperbarui';
                const statusClean = (request.status || '').replace(/_/g, ' ');
                const message = `Permintaan ${request.request_number} Anda berstatus [${statusClean}]. ${additionalInfo ? '\nCatatan: ' + additionalInfo.substring(0, 100) : ''}`;
                
                await createInAppNotification(
                    requesterUserId,
                    title,
                    message,
                    eventType === 'COMPLETED' ? 'Success' : 'Info',
                    requestLink
                );
            }
            
            const getStatusBadgeColor = (status: string) => {
                switch(status) {
                    case 'COMPLETED': return '#059669'; // emerald
                    case 'REJECTED': return '#dc2626'; // red
                    case 'IN_REVIEW': return '#7c3aed'; // violet
                    case 'PROCESSING': return '#0284c7'; // sky
                    default: return '#0a2540';
                }
            };
            
            const statusDisplay = (request.status || '').replace(/_/g, ' ');
            const emailTitle = eventType === 'COMPLETED' ? 'Permintaan Anda Telah Selesai' : 
                               eventType === 'RESPONDED' ? 'Tanggapan Baru dari Tim CSL' : 'Pembaruan Status Permintaan';

            const statusHtmlBody = buildCslEmailTemplate({
                badge: statusDisplay,
                badgeColor: getStatusBadgeColor(request.status),
                title: emailTitle,
                recipientName: request.requester_name,
                introParagraph: 'Pemberitahuan terkini mengenai status permohonan layanan hukum & corporate secretary Anda:',
                detailsTable: [
                    { label: 'No. Tiket', value: `<span style="font-family: monospace; font-weight: 700;">${escapeHtml(request.request_number)}</span>`, isHighlight: true },
                    { label: 'Kategori', value: escapeHtml(request.category_name || '-') },
                    { label: 'Status Terkini', value: `<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px; background-color: #f1f5f9; color: #0a2540; border: 1px solid #cbd5e1;">${escapeHtml(statusDisplay)}</span>` }
                ],
                calloutBox: additionalInfo ? {
                    title: 'Catatan / Pesan',
                    content: escapeHtml(additionalInfo).replace(/\n/g, '<br/>'),
                    borderAccent: getStatusBadgeColor(request.status)
                } : undefined,
                attachments: attachments && attachments.length > 0 ? attachments : undefined,
                closingParagraph: 'Anda dapat melihat rincian lengkap atau memberikan tanggapan dengan masuk ke sistem CSL-LINK.'
            });

            await sendEmailNotification(
                request.requester_email,
                `[CSL-LINK] Pembaruan Permintaan ${request.request_number}: ${statusDisplay}`,
                statusHtmlBody,
                true, // isHtml
                'STATUS_CHANGE'
            );
            break;
    }
}

/**
 * Notifies a staff member when a new routine activity is assigned to them by Admin.
 */
export async function notifyRoutineAssigned(routineTitle: string, assignedPicName: string, dueDay: number) {
    try {
        let staffUserId: string | null = null;
        if (assignedPicName) {
            const { data } = await supabase
                .from('user_accounts')
                .select('id')
                .or(`full_name.ilike.%${assignedPicName}%,email.ilike.%${assignedPicName}%`)
                .maybeSingle();
            if (data?.id) staffUserId = String(data.id);
        }

        const link = `/routine`;
        const title = `Tugas Rutin Baru Ditugaskan`;
        const message = `Anda ditugaskan oleh Admin untuk menangani aktivitas rutin: "${routineTitle}" (Jatuh tempo setiap tanggal ${dueDay}). Mohon segera ditindaklanjuti.`;

        if (staffUserId) {
            await createInAppNotification(staffUserId, title, message, 'Info', link);
        } else {
            await createInAppNotification(null, title, message, 'Info', link);
        }
    } catch (err) {
        console.error('Error notifying routine assigned:', err);
    }
}

/**
 * Notifies a user when they are mentioned in a request comment.
 */
export async function notifyUserMentioned(
    request: any,
    mentionerName: string,
    taggedUserId: string,
    taggedUserEmail: string,
    taggedUserName: string,
    commentText: string
) {
    const requestLink = `/csl-all-requests?id=${request.id}`;
    
    // In-app notification
    await createInAppNotification(
        taggedUserId,
        'Anda di-mention',
        `${mentionerName} menyebut Anda di catatan internal pada request ${request.request_number}.`,
        'Info',
        requestLink
    );
    
    // Email notification
    const htmlBody = buildCslEmailTemplate({
        badge: 'CATATAN INTERNAL',
        badgeColor: '#7c3aed',
        title: 'Anda Disebut dalam Catatan Internal',
        recipientName: taggedUserName,
        introParagraph: `<strong>${escapeHtml(mentionerName)}</strong> menyebut Anda pada catatan internal permintaan <strong>${escapeHtml(request.request_number)}</strong>:`,
        detailsTable: [
            { label: 'No. Permintaan', value: `<span style="font-family: monospace; font-weight: 700;">${escapeHtml(request.request_number)}</span>`, isHighlight: true },
            { label: 'Disebut Oleh', value: escapeHtml(mentionerName) },
            { label: 'Kategori', value: escapeHtml(request.category_name || '-') }
        ],
        calloutBox: {
            title: 'Isi Catatan Internal',
            content: escapeHtml(commentText).replace(/\n/g, '<br/>'),
            borderAccent: '#7c3aed'
        },
        closingParagraph: 'Silakan masuk ke sistem CSL-LINK untuk membaca konteks lengkap atau memberikan tanggapan.'
    });

    await sendEmailNotification(
        taggedUserEmail,
        `[CSL-LINK] Anda Disebut oleh ${mentionerName} (${request.request_number})`,
        htmlBody,
        true, // isHtml
        'ASSIGN_MENTION'
    );
}

