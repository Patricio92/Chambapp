export async function readPhotos(files) {
  const list = Array.from(files);
  if (list.length > 5) throw Error("Selecciona hasta 5 fotografías.");
  return Promise.all(
    list.map(async (file) => {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 8 * 1024 * 1024
      )
        throw Error("Usa fotos JPG, PNG o WebP de hasta 8 MB.");
      let bitmap;
      try {
        bitmap = await createImageBitmap(file);
      } catch {
        throw Error(
          "No pudimos leer esta fotografía. Prueba otro archivo JPG, PNG o WebP.",
        );
      }
      try {
        const ratio = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
        canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
        const context = canvas.getContext("2d");
        context.fillStyle = "white";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL("image/jpeg", 0.75);
        if (dataURL.length > 900000)
          throw Error("La foto es demasiado grande. Prueba una más pequeña.");
        return {
          id: crypto.randomUUID(),
          name: file.name,
          dataURL,
          at: Date.now(),
        };
      } finally {
        bitmap.close();
      }
    }),
  );
}
