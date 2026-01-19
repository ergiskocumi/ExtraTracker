/**
 * 📄 FILE VALIDATION - Utility per validare tipi di file
 */

// ============================================
// TYPES
// ============================================

export interface FileValidationResult {
    isValid: boolean;
    error?: string;
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Valida se un file corrisponde ai tipi MIME e alle estensioni accettate
 */
export const validateFileType = (
    file: File,
    acceptedTypes: string[],
    acceptedExtensions: string[]
): FileValidationResult => {
    // Check MIME type
    const isValidType = acceptedTypes.includes(file.type);
    
    // Check extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = acceptedExtensions.some(ext => 
        fileName.endsWith(ext.toLowerCase())
    );
    
    if (!isValidType && !hasValidExtension) {
        return {
            isValid: false,
            error: `Tipo di file non supportato. Tipi accettati: ${acceptedExtensions.join(', ')}`,
        };
    }
    
    return { isValid: true };
};

/**
 * Valida la dimensione del file
 */
export const validateFileSize = (
    file: File,
    maxSizeMB: number = 50
): FileValidationResult => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
        return {
            isValid: false,
            error: `File troppo grande. Dimensione massima: ${maxSizeMB}MB`,
        };
    }
    
    return { isValid: true };
};

/**
 * Valida un file completo (tipo + dimensione)
 */
export const validateFile = (
    file: File,
    acceptedTypes: string[],
    acceptedExtensions: string[],
    maxSizeMB?: number
): FileValidationResult => {
    // Validate type
    const typeValidation = validateFileType(file, acceptedTypes, acceptedExtensions);
    if (!typeValidation.isValid) {
        return typeValidation;
    }
    
    // Validate size if specified
    if (maxSizeMB !== undefined) {
        const sizeValidation = validateFileSize(file, maxSizeMB);
        if (!sizeValidation.isValid) {
            return sizeValidation;
        }
    }
    
    return { isValid: true };
};
