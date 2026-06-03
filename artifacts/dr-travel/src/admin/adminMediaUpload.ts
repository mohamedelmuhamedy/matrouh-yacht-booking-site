import { apiUrl } from "../lib/api";

export type AdminMediaUploadResult = {
  url: string;
  provider?: string;
  mediaAssetId?: string;
};

export function uploadAdminMedia(
  file: File,
  category: string,
  onProgress?: (percent: number) => void,
): Promise<AdminMediaUploadResult | { error: string }> {
  return new Promise((resolve) => {
    const token = localStorage.getItem("admin_token");
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl("/api/admin/storage/upload"));
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("X-Content-Type", file.type);
    xhr.setRequestHeader("X-File-Name", file.name);
    xhr.setRequestHeader("X-Media-Category", category);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const payload = JSON.parse(xhr.responseText);
          const url = payload.deliveryUrl || payload.publicUrl || payload.url;
          if (!url) {
            resolve({ error: "لم يتم استلام رابط الملف" });
            return;
          }
          resolve({
            url,
            provider: payload.provider,
            mediaAssetId: payload.mediaAssetId,
          });
        } catch {
          resolve({ error: "خطأ في استجابة الخادم" });
        }
        return;
      }
      try {
        resolve({ error: JSON.parse(xhr.responseText)?.error || `فشل الرفع (${xhr.status})` });
      } catch {
        resolve({ error: `فشل الرفع (${xhr.status})` });
      }
    };
    xhr.onerror = () => resolve({ error: "خطأ في الاتصال بالخادم" });
    xhr.send(file);
  });
}
