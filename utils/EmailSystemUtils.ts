import { buildCslEmailTemplate } from './cslNotificationUtils';

export interface TicketEmailData {
    ticketId: string;
    requesterName: string;
    requesterEmail: string;
    department: string;
    subject: string;
    priority: string;
    category: string;
    description: string;
}

export const sendTicketNotificationEmail = async (data: TicketEmailData) => {
    const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
        console.error('Email Notification: VITE_RESEND_API_KEY is not set');
        return;
    }

    try {
        const html = buildCslEmailTemplate({
            badge: data.priority ? data.priority.toUpperCase() : 'TIKET',
            badgeColor: data.priority === 'High' ? '#dc2626' : '#0a2540',
            title: `Permintaan Tiket: ${data.subject}`,
            recipientName: 'Tim Support',
            introParagraph: 'Terdapat pengajuan tiket baru yang membutuhkan perhatian Anda:',
            detailsTable: [
                { label: 'No. Tiket', value: `<span style="font-family: monospace; font-weight: 700;">${data.ticketId}</span>`, isHighlight: true },
                { label: 'Pengirim', value: `${data.requesterName} (${data.requesterEmail})` },
                { label: 'Departemen', value: data.department || '-' },
                { label: 'Kategori', value: data.category || '-' },
                { label: 'Prioritas', value: data.priority || 'Normal' }
            ],
            calloutBox: {
                title: 'Deskripsi / Masalah',
                content: data.description,
                borderAccent: data.priority === 'High' ? '#dc2626' : '#0a2540'
            },
            closingParagraph: 'Silakan masuk ke platform CSL-LINK untuk menindaklanjuti tiket ini.'
        });

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'CSL-LINK <no-reply@send.gesit.co.id>',
                to: ['it.operation@gesit.co.id'],
                subject: `[CSL-LINK] ${data.priority.toUpperCase()} - ${data.subject}`,
                html
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(JSON.stringify(error));
        }

        console.log('Email Notification: Sent successfully to IT Operation');
    } catch (err) {
        console.error('Email Notification: Failed to send', err);
    }
};

export const sendPasswordResetNotificationEmail = async (email: string) => {
    const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
        console.error('Email Notification: VITE_RESEND_API_KEY is not set');
        return;
    }

    try {
        const html = buildCslEmailTemplate({
            badge: 'KEAMANAN AKUN',
            badgeColor: '#0a2540',
            title: 'Permintaan Reset Kata Sandi Akun',
            recipientName: email,
            introParagraph: `Kami menerima permintaan untuk mengatur ulang kata sandi akun <strong>${email}</strong> pada platform <strong>CSL-LINK</strong> (Corporate Secretary & Legal).`,
            calloutBox: {
                title: 'Informasi Keamanan',
                content: 'Tautan reset kata sandi resmi sedang diproses dan dikirim melalui sistem autentikasi kami. Silakan periksa kotak masuk (inbox) atau folder Spam untuk instruksi lebih lanjut.<br/><br/><strong>Peringatan Keamanan:</strong> Jika Anda tidak merasa mengajukan permintaan ini, segera laporkan ke administrator keamanan TI.',
                borderAccent: '#0a2540'
            },
            closingParagraph: 'Pesan otomatis ini dikeluarkan untuk melindungi keamanan akses akun Anda di The Gesit Companies.'
        });

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'CSL-LINK <no-reply@send.gesit.co.id>',
                to: [email, 'it.operation@gesit.co.id'],
                subject: `[CSL-LINK] Permintaan Reset Password: ${email}`,
                html
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(JSON.stringify(error));
        }

        console.log('Password Reset Notification: Sent successfully');
    } catch (err) {
        console.error('Password Reset Notification: Failed to send', err);
    }
};
