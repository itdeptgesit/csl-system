import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function debugUploadWithFolder() {
  console.log('=== Testing upload WITH folderType=document ===');
  
  const testBase64 = 'data:text/plain;base64,VGVzdCBmb2xkZXIgcm91dGluZw==';
  
  const { data } = await supabase.functions.invoke('upload-to-gdrive', {
    body: {
      fileName: `CHECK_FOLDER_${Date.now()}.txt`,
      fileMimeType: 'text/plain',
      fileBase64: testBase64,
      folderType: 'document'
    }
  });

  console.log('Result:', JSON.stringify(data, null, 2));
  
  if (data?.success) {
    console.log('\n✅ File berhasil diupload!');
    console.log('🔗 Direct link:', data.gdriveUrl);
    console.log('\n⚠️  Jika file tidak muncul di CSL System Dev, berarti GDRIVE_FOLDER_ID belum di-set di Supabase Secrets.');
    console.log('File mungkin ada di storage Google Service Account yang tidak terlihat dari Drive biasa.');
  } else {
    console.log('\n❌ Upload gagal:', data?.error);
  }
}

debugUploadWithFolder();
