import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const REQUEST_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'])
const REQUEST_MAX_BYTES = 10 * 1024 * 1024

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function createJWT(credentials: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }
  const encode = (obj: any) => base64url(new TextEncoder().encode(JSON.stringify(obj)))
  const signingInput = `${encode(header)}.${encode(payload)}`

  let rawKey = credentials.private_key as string
  if (!rawKey) throw new Error('private_key tidak ditemukan di credentials')
  if (!rawKey.includes('\n') && rawKey.includes('\\n')) rawKey = rawKey.replace(/\\n/g, '\n')

  const base64Key = rawKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '')
    .trim()

  if (!base64Key) throw new Error('Private key kosong')

  const binary = atob(base64Key)
  const keyData = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) keyData[i] = binary.charCodeAt(i)

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput))
  return `${signingInput}.${base64url(new Uint8Array(signature))}`
}

async function getAccessToken(credentials: any): Promise<string> {
  const jwt = await createJWT(credentials)
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  if (!res.ok) throw new Error(`Gagal mendapatkan token: ${await res.text()}`)
  return (await res.json()).access_token
}

// Cari subfolder yang sudah ada — jika belum ada, buat di dalam parentFolderId
async function getOrCreateSubfolder(accessToken: string, parentFolderId: string, name: string): Promise<string> {
  try {
    // Cari subfolder dengan nama yang sama
    const q = encodeURIComponent(`'${parentFolderId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`)
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name)`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    if (searchRes.ok) {
      const { files } = await searchRes.json()
      if (files && files.length > 0) return files[0].id  // sudah ada, pakai yang lama
    }

    // Belum ada → buat subfolder baru di dalam CSL System Dev
    const createRes = await fetch(
      'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id',
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentFolderId] })
      }
    )
    if (createRes.ok) return (await createRes.json()).id
  } catch (e) {
    console.warn('getOrCreateSubfolder error:', e)
  }
  return parentFolderId  // fallback ke root CSL System Dev
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { fileName, fileMimeType, fileBase64, requesterEmail, folderType, requestId } = await req.json()

    if (!fileName || !fileBase64) throw new Error('Missing fileName or fileBase64')

    // Chat attachments are bound to a request and may only be uploaded by its
    // requester or a CSL team member. Legacy non-chat uploads keep their
    // existing authorization path.
    if (folderType === 'request' && requestId) {
      const authorization = req.headers.get('Authorization')
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (!authorization || !supabaseUrl || !serviceRoleKey) throw new Error('Unauthorized request upload')

      const authClient = createClient(supabaseUrl, serviceRoleKey, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false },
      })
      const { data: authData, error: authError } = await authClient.auth.getUser(authorization.replace(/^Bearer\s+/i, ''))
      if (authError || !authData.user?.email) throw new Error('Unauthorized request upload')

      const { data: requestRecord, error: requestError } = await authClient
        .from('csl_requests')
        .select('requester_email')
        .eq('id', requestId)
        .maybeSingle()
      if (requestError || !requestRecord) throw new Error('Request tidak ditemukan')

      const { data: isCslTeam } = await authClient.rpc('is_csl_team')
      const callerEmail = authData.user.email.toLowerCase()
      if (!isCslTeam && requestRecord.requester_email?.toLowerCase() !== callerEmail) {
        throw new Error('Anda tidak berhak mengunggah dokumen ke request ini')
      }
      if (requesterEmail?.toLowerCase() !== requestRecord.requester_email?.toLowerCase()) {
        throw new Error('Email pemohon tidak sesuai dengan request')
      }

      const extension = String(fileName).split('.').pop()?.toLowerCase() || ''
      if (!REQUEST_EXTENSIONS.has(extension)) throw new Error('Tipe file tidak didukung')
    }

    let serviceAccountRaw = Deno.env.get('GDRIVE_SERVICE_ACCOUNT_JSON')
    const rootFolderId = Deno.env.get('GDRIVE_FOLDER_ID') // = CSL System Dev folder

    if (!serviceAccountRaw || !rootFolderId) {
      throw new Error('Konfigurasi Google Drive belum diatur di Supabase Secrets.')
    }

    serviceAccountRaw = serviceAccountRaw
      .replace(/^\uFEFF/, '').replace(/^\u0000+/, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim()

    let credentials: any
    try {
      credentials = JSON.parse(serviceAccountRaw)
      if (typeof credentials === 'string') credentials = JSON.parse(credentials)
    } catch (e: any) {
      throw new Error(`Format GDRIVE_SERVICE_ACCOUNT_JSON tidak valid: ${e.message}`)
    }

    const accessToken = await getAccessToken(credentials)

    // Tentukan subfolder tujuan di dalam CSL System Dev
    // • folderType 'document' → subfolder "CSL Documents"
    // • folderType 'request'  → subfolder "User Requests"
    // • folderType 'e-sign'   → subfolder "E-Sign"
    // • lainnya               → langsung ke root CSL System Dev
    let targetFolderId = rootFolderId
    if (folderType === 'document') {
      targetFolderId = await getOrCreateSubfolder(accessToken, rootFolderId, 'CSL Documents')
    } else if (folderType === 'request') {
      targetFolderId = await getOrCreateSubfolder(accessToken, rootFolderId, 'User Requests')
    } else if (folderType === 'e-sign') {
      targetFolderId = await getOrCreateSubfolder(accessToken, rootFolderId, 'E-Sign')
    }

    // Decode Base64
    const base64Data = fileBase64.replace(/^data:.*,/, '')
    const fileBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
    if (folderType === 'request' && requestId && fileBytes.length > REQUEST_MAX_BYTES) {
      throw new Error('Ukuran file melebihi 10 MB')
    }
    const mimeType = fileMimeType || 'application/octet-stream'

    // Build multipart upload body
    const boundary = '-------314159265358979323846'
    const metadataStr = JSON.stringify({ name: fileName, parents: [targetFolderId] })
    const encoder = new TextEncoder()
    const pre = encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataStr}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`)
    const post = encoder.encode(`\r\n--${boundary}--`)
    const body = new Uint8Array(pre.length + fileBytes.length + post.length)
    body.set(pre, 0)
    body.set(fileBytes, pre.length)
    body.set(post, pre.length + fileBytes.length)

    // Upload ke Google Drive
    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
          'Content-Length': String(body.length),
        },
        body,
      }
    )

    if (!uploadRes.ok) throw new Error(`Google Drive upload failed: ${await uploadRes.text()}`)

    const fileData = await uploadRes.json()

    // Share ke requester (jika ada)
    if (requesterEmail) {
      const permissionRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions?supportsAllDrives=true&sendNotificationEmail=false`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'reader', type: 'user', emailAddress: requesterEmail }),
        }
      )
      if (!permissionRes.ok) {
        throw new Error(`Gagal membagikan file ke pemohon: ${await permissionRes.text()}`)
      }
    }

    return new Response(
      JSON.stringify({ success: true, fileId: fileData.id, gdriveUrl: fileData.webViewLink }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Upload error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
