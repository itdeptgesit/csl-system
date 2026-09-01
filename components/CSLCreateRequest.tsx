import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Loader2, ChevronDown, Upload,
  CheckCircle2, Info, X, Paperclip
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { UserAccount } from '../types';
import { Button } from '@/components/ui/button';
import { notifyRequestUpdate } from '../utils/cslNotificationUtils';

interface CSLCategory {
  id: number;
  code: string;
  name: string;
  sla_days: number;
}

interface CSLCreateRequestProps {
  currentUser: UserAccount | null;
  onClose?: () => void;
  onSuccess?: () => void;
}


const MOCK_CATEGORIES: CSLCategory[] = [
  { id: 1, code: 'AGR',       name: 'Agreement',          sla_days: 5 },
  { id: 2, code: 'LREV',      name: 'Legal Review',       sla_days: 5 },
  { id: 3, code: 'CORPSECR',  name: 'Corporate Secretary',sla_days: 5 },
  { id: 4, code: 'OSS',       name: 'OSS',                sla_days: 14 },
  { id: 5, code: 'LIC',       name: 'Licensing',          sla_days: 10 },
  { id: 6, code: 'NOTARY',    name: 'Notary',             sla_days: 7 },
  { id: 7, code: 'LEGALOP',   name: 'Legal Opinion',      sla_days: 5 },
  { id: 8, code: 'DOCREQ',    name: 'Document Request',   sla_days: 2 },
  { id: 9, code: 'COMPLIANCE',name: 'Compliance',         sla_days: 5 },
  { id: 10,code: 'OTHER',     name: 'Other',              sla_days: 5 },
];

function generateRequestNumber(): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `REQ-${ym}-${seq}`;
}

export const CSLCreateRequest: React.FC<CSLCreateRequestProps> = ({ currentUser, onClose, onSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedNumber, setSubmittedNumber] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const [masterDepartments, setMasterDepartments] = useState<string[]>([]);
  const [masterCompanies, setMasterCompanies] = useState<string[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(true);

  useEffect(() => {
    const fetchMasterData = async () => {
      setIsLoadingMaster(true);
      try {
        const [deptRes, compRes] = await Promise.all([
          supabase.from('departments').select('name').order('name'),
          supabase.from('companies').select('name').order('name')
        ]);
        
        if (deptRes.data) {
          setMasterDepartments(deptRes.data.map(d => d.name));
        }
        if (compRes.data) {
          setMasterCompanies(compRes.data.map(c => c.name));
        }
      } catch (err) {
        console.error("Error fetching master data:", err);
      } finally {
        setIsLoadingMaster(false);
      }
    };
    fetchMasterData();
  }, []);

  const [form, setForm] = useState({
    department: currentUser?.department || '',
    company: currentUser?.company || '',
    description: '',
    tujuan: '',
    required_date: '',
  });

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    setAttachedFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      return [...prev, ...Array.from(files).filter(f => !existing.has(f.name))];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim() || !form.tujuan.trim() || !form.required_date) return;
    setIsSubmitting(true);

    const requestNumber = generateRequestNumber();
    const slaTargetDays = 5;
    const slaDueDate = new Date(Date.now() + slaTargetDays * 24 * 60 * 60 * 1000).toISOString();

    const payload = {
      request_number: requestNumber,
      requester_id: String(currentUser?.id || ''),
      requester_email: currentUser?.email || '',
      requester_name: currentUser?.fullName || '',
      department: form.department,
      company: form.company,
      priority: 'Medium',
      status: 'SUBMITTED',
      description: form.description,
      tujuan: form.tujuan,
      progress: 0,
      required_date: form.required_date || null,
      sla_target_days: slaTargetDays,
      sla_due_date: slaDueDate,
    };

    const { data: insertData, error } = await supabase.from('csl_requests').insert([payload]).select('id').single();
    if (error) {
      console.error('DB insert error:', error.message);
      alert(`Gagal mengirim: ${error.message}`);
      setIsSubmitting(false);
      return;
    }

    // Insert initial activity log
    if (insertData?.id) {
      await supabase.from('csl_request_logs').insert([{
        request_id: insertData.id,
        status: 'SUBMITTED',
        actor_name: currentUser?.fullName || currentUser?.email || 'Pemohon',
        actor_id: currentUser?.id ? String(currentUser.id) : null,
        note: 'Permintaan diajukan oleh pemohon',
        has_files: attachedFiles.length > 0,
      }]);

      // Notify CSL Staff about new request submission
      await notifyRequestUpdate({
        id: insertData.id,
        request_number: requestNumber,
        requester_id: currentUser?.id ? String(currentUser.id) : null,
        requester_email: currentUser?.email || '',
        requester_name: currentUser?.fullName || currentUser?.email || 'Pemohon',
        department: form.department,
        company: form.company,
        category_name: form.department || 'Permintaan Legal',
        status: 'SUBMITTED'
      }, 'SUBMITTED');
    }

    // Upload files to Google Drive if any
    if (attachedFiles.length > 0 && insertData?.id) {
      for (const file of attachedFiles) {
        try {
          // Convert file to base64
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
          });
          
          reader.readAsDataURL(file);
          const base64Data = await base64Promise;

          // Call upload-to-gdrive Edge Function
          const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-gdrive', {
            body: {
              fileName: `[Lampiran] ${file.name}`,
              fileMimeType: file.type || 'application/octet-stream',
              fileBase64: base64Data,
              requesterEmail: currentUser?.email,
              folderType: 'request'
            }
          });

          if (uploadError) {
             console.error('Failed to upload to GDrive:', uploadError);
          } else if (uploadData?.success && uploadData.gdriveUrl) {
             // Insert into csl_request_documents — pakai kolom yang sama dengan CSLRequestManager
             await supabase.from('csl_request_documents').insert([{
                 request_id: insertData.id,
                 doc_name: file.name,
                 doc_type: 'Lampiran Pemohon',
                 gdrive_url: uploadData.gdriveUrl,
                 gdrive_file_id: uploadData.fileId || null,
                 uploaded_by_id: currentUser?.id ? String(currentUser.id) : null,
                 uploaded_by_name: currentUser?.fullName || currentUser?.email || 'Pemohon',
                 is_visible_to_requester: true,
             }]);
          }
        } catch (e) {
          console.error('Error processing file:', file.name, e);
        }
      }
    }

    setSubmittedNumber(requestNumber);
    setSubmitted(true);
    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center animate-in fade-in duration-500 font-sans">
        <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shadow-lg">
          <CheckCircle2 size={42} className="text-[#C9A84C]" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] mb-2">Permintaan Terkirim!</p>
          <h2 className="text-3xl font-black text-foreground font-mono">{submittedNumber}</h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-sm leading-relaxed">
            Permintaan kamu telah diterima. Tim CSL akan segera menghubungi kamu melalui email.
          </p>
        </div>
        <div className="flex gap-3 mt-8">
          <Button variant="outline" className="rounded-lg font-bold text-sm h-10 px-5" onClick={() => {
            if (onSuccess) onSuccess();
            if (onClose) onClose();
          }}>
            Tutup & Lihat Data
          </Button>
          <Button className="rounded-lg font-bold text-sm h-10 px-5 bg-slate-800 dark:bg-slate-200 dark:text-slate-900 hover:opacity-90" onClick={() => {
            setSubmitted(false);
            setForm({ ...form, description: '', tujuan: '', required_date: '' });
            setAttachedFiles([]);
          }}>
            Buat Permintaan Lain
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in duration-500 font-sans pb-4">
      {/* Modal Header Title is usually handled by parent Dialog, but we keep a small description if needed */}
      <div className="mb-5">
        <p className="text-sm text-muted-foreground mt-0.5">
          Isi formulir berikut untuk mengajukan permintaan ke tim Legal &amp; Corporate Secretary
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">

          {/* SECTION 1 — Identitas */}
          <div className="bg-white dark:bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 bg-slate-700 dark:bg-slate-500">1</div>
              <h2 className="text-sm font-extrabold text-foreground">Identitas Pemohon</h2>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Nama Pemohon</label>
                <input readOnly value={currentUser?.fullName || '—'}
                  className="w-full h-9 px-3 text-sm font-medium bg-muted/40 border border-border rounded-lg text-foreground cursor-default focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Email</label>
                <input readOnly value={currentUser?.email || '—'}
                  className="w-full h-9 px-3 text-sm font-medium bg-muted/40 border border-border rounded-lg text-muted-foreground cursor-default focus:outline-none truncate" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Departemen <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select required value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    className="w-full h-9 pl-3 pr-8 text-sm font-medium bg-white dark:bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none text-foreground">
                    <option value="">— Pilih Departemen —</option>
                    {isLoadingMaster ? (
                      <option disabled>Loading...</option>
                    ) : (
                      masterDepartments.map(d => <option key={d} value={d}>{d}</option>)
                    )}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Perusahaan <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select required value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    className="w-full h-9 pl-3 pr-8 text-sm font-medium bg-white dark:bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none text-foreground">
                    <option value="">— Pilih Perusahaan —</option>
                    {isLoadingMaster ? (
                      <option disabled>Loading...</option>
                    ) : (
                      masterCompanies.map(c => <option key={c} value={c}>{c}</option>)
                    )}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2 — Detail */}
          <div className="bg-white dark:bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 bg-slate-700 dark:bg-slate-500">2</div>
              <h2 className="text-sm font-extrabold text-foreground">Detail Permintaan</h2>
            </div>
            <div className="p-5 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Deskripsi Permintaan Data / Draft <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Contoh: Surat Kuasa, CTC ID, Legalitas Dokumen PT xxx, Perubahan Anggaran Dasar, Perjanjian Kerjasama, dll.
                </p>
                <div className="relative">
                  <textarea required maxLength={1000} rows={4}
                    placeholder="Jelaskan dokumen atau draft yang dibutuhkan secara spesifik"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm bg-white dark:bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-foreground placeholder:text-muted-foreground/40 resize-none leading-relaxed pb-6"
                  />
                  <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/50 pointer-events-none">
                    {form.description.length} / 1000
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Tujuan Permintaan Data / Draft <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Contoh: Untuk keperluan pengajuan izin usaha ke BKPM, untuk presentasi ke investor, untuk akuisisi aset properti, dll.
                </p>
                <div className="relative">
                  <textarea required maxLength={1000} rows={4}
                    placeholder="Jelaskan untuk kebutuhan apa dokumen ini diperlukan"
                    value={form.tujuan}
                    onChange={e => setForm(f => ({ ...f, tujuan: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm bg-white dark:bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-foreground placeholder:text-muted-foreground/40 resize-none leading-relaxed pb-6"
                  />
                  <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/50 pointer-events-none">
                    {form.tujuan.length} / 1000
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Permintaan Dibutuhkan Pada Tanggal <span className="text-red-500">*</span>
                </label>
                <input type="date" required
                  min={new Date().toISOString().split('T')[0]}
                  value={form.required_date}
                  onChange={e => setForm(f => ({ ...f, required_date: e.target.value }))}
                  className="w-full h-9 px-3 text-sm font-medium bg-white dark:bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-foreground"
                />
                <p className="text-[11px] text-muted-foreground">Tanggal paling lambat dokumen harus sudah siap diterima</p>
              </div>
            </div>
          </div>

          {/* SECTION 3 — Lampiran */}
          <div className="bg-white dark:bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 bg-slate-700 dark:bg-slate-500">3</div>
                <h2 className="text-sm font-extrabold text-foreground">Lampiran Dokumen</h2>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground">
                  Upload List Permintaan{' '}
                  <span className="font-normal text-muted-foreground">(Opsional)</span>
                </label>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Screenshot WhatsApp, email, template dokumen, dll.
                </p>
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  isDragging ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' : 'border-border hover:border-blue-300 hover:bg-muted/20'
                }`}
              >
                <Upload size={22} className="text-blue-500" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Klik untuk pilih file</p>
                <p className="text-[11px] text-muted-foreground">atau seret dan lepas file di sini</p>
                <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
                  className="hidden" onChange={e => addFiles(e.target.files)} />
              </div>
              <p className="text-[10px] text-muted-foreground">JPG, PNG, PDF, DOCX, XLSX — maks. 10MB per file</p>
              {attachedFiles.length > 0 && (
                <div className="space-y-1.5">
                  {attachedFiles.map(file => (
                    <div key={file.name} className="flex items-center justify-between bg-muted/40 border border-border/60 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip size={12} className="text-blue-500 shrink-0" />
                        <span className="text-xs font-semibold text-foreground truncate">{file.name}</span>
                      </div>
                      <button type="button"
                        onClick={e => { e.stopPropagation(); setAttachedFiles(prev => prev.filter(f => f.name !== file.name)); }}
                        className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors shrink-0 ml-1">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-xl px-4 py-3">
            <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
              Tim CSL akan menghubungi Anda melalui email setelah permintaan diproses.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onClose?.()}
              className="flex-1 h-11 rounded-xl font-semibold text-sm border-border">
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}
              className="flex-1 h-11 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300 text-white shadow-md">
              {isSubmitting
                ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Mengirim...</>
                : <><Send className="mr-1.5 h-4 w-4" /> Kirim Permintaan</>}
            </Button>
          </div>

        </div>
      </form>
    </div>
  );
};
