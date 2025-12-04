export const encodeBase64 = async (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const decodeBase64 = async (base64: string, fileName: string) => {
  return await new Promise<File>((resolve, reject) => {
    try {
      const arr = base64.split(',');
      const mime = arr[0]!.match(/:(.*?);/)![1];
      const bstr = atob(arr[1]!);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      const file = new File([u8arr], fileName, { type: mime });
      resolve(file);
    } catch (error) {
      reject(error);
    }
  });
};

export const getRawTextFromBase64 = (file64Encoded: string) => {
  const rawBase64Data = file64Encoded.replace(/^data:.+;base64,/, '');
  const buffer = Buffer.from(rawBase64Data, 'base64');
  return buffer.toString();
};
