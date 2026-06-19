function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossibile leggere il file"));
    reader.onloadend = () => resolve(String(reader.result).split(",")[1] || "");
    reader.readAsDataURL(blob);
  });
}

export function scegliFileImmagine(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

export async function fileImmagineToBase64(file: File) {
  const base64 = await blobToBase64(file);
  return { base64, mimeType: file.type || "image/jpeg" };
}

type RegistrazioneAttiva = {
  recorder: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
};

let registrazione: RegistrazioneAttiva | null = null;

export async function avviaRegistrazioneVocale(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Registrazione vocale non supportata su questo dispositivo.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();
  registrazione = { recorder, stream, chunks };
}

export function isRegistrazioneVocaleAttiva() {
  return registrazione !== null && registrazione.recorder.state === "recording";
}

export async function fermaRegistrazioneVocale(): Promise<string> {
  if (!registrazione) throw new Error("Nessuna registrazione in corso.");

  const { recorder, stream, chunks } = registrazione;
  registrazione = null;

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      void blobToBase64(blob).then(resolve).catch(reject);
    };
    recorder.onerror = () => {
      stream.getTracks().forEach((t) => t.stop());
      reject(new Error("Errore durante la registrazione."));
    };
    recorder.stop();
  });
}

export function annullaRegistrazioneVocale() {
  if (!registrazione) return;
  registrazione.stream.getTracks().forEach((t) => t.stop());
  if (registrazione.recorder.state !== "inactive") {
    try {
      registrazione.recorder.stop();
    } catch {
      // ignore
    }
  }
  registrazione = null;
}
