
// Utility function to resize and compress images before uploading
export const resizeImage = (file: File, maxWidth: number = 400, maxHeight: number = 400, quality: number = 0.7, outputType: string = 'image/jpeg'): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Clear context to ensure transparency for PNGs
                    ctx.clearRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    // Convert to base64 with specified type (default jpeg)
                    resolve(canvas.toDataURL(outputType, quality));
                } else {
                    reject(new Error('Canvas context not available'));
                }
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

// New: Convert file to Base64 directly without resizing (for high quality bg)
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

export const formatDeadline = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const getCroppedImg = (imageSrc: string, pixelCrop: any, outputFormat: string = 'image/png'): Promise<string> => {
    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    return new Promise(async (resolve, reject) => {
        try {
            const image = await createImage(imageSrc);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                return reject(new Error('No 2d context'));
            }

            canvas.width = pixelCrop.width;
            canvas.height = pixelCrop.height;

            ctx.drawImage(
                image,
                pixelCrop.x,
                pixelCrop.y,
                pixelCrop.width,
                pixelCrop.height,
                0,
                0,
                pixelCrop.width,
                pixelCrop.height
            );

            // Return Base64 directly
            resolve(canvas.toDataURL(outputFormat, 0.9));
        } catch (e) {
            reject(e);
        }
    });
};

// --- Timezone Utilities (Thailand: Asia/Bangkok) ---

export const getThaiDateTimeValue = (isoString?: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    
    // Create date string for input type="datetime-local" based on Thai time
    // We use sv-SE locale because it formats as YYYY-MM-DD HH:mm which is close to ISO
    const thaiTimeStr = d.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' });
    return thaiTimeStr.replace(' ', 'T').slice(0, 16);
};

export const thaiInputToISO = (inputValue: string) => {
    if (!inputValue) return '';
    // Input is YYYY-MM-DDTHH:mm in "Thai time context"
    // We treat this string as if it includes the +07:00 offset
    return `${inputValue}:00+07:00`;
};
